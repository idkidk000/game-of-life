import convert from 'color-convert';
import { useEffect, useRef } from 'react';
import REGL from 'regl';
import { Canvas } from '@/components/canvas';
import { useRenderControls } from '@/hooks/render-controls';
import { useSimControls } from '@/hooks/sim-controls';
import { useSimulation } from '@/hooks/simulation';
import { useTheme } from '@/hooks/theme';
import { SlidingWindow } from '@/lib/sliding-window';

interface DynamicProps {
  gridSize: [x: number, y: number];
  canvasSize: [x: number, y: number];
  instances: number;
  framebuffer: REGL.Framebuffer2D | null;
  background: [r: number, g: number, b: number, a: number];
  blur0: REGL.Texture2D;
  blur1: REGL.Texture2D;
  blur2: REGL.Texture2D;
  colourMix: number;
  blur0Mix: number;
  blur1Mix: number;
  blur2Mix: number;
  radius: number;
  step: number;
  showBackground: boolean;
  falloff: number;
  wrap: boolean;
}

// https://github.com/regl-project/regl/blob/gh-pages/API.md
// https://github.com/regl-project/regl/tree/gh-pages/example
// https://github.com/rreusser/bloom-effect-example/
// https://wikis.khronos.org/opengl/Data_Type_(GLSL) (but webgl1 is based on opengl es 2, which is very old, so a lot of these docs don't apply)
export function Renderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { controlsRef: simControlsRef } = useSimControls();
  const { simulationRef, stepTimesRef } = useSimulation();
  const { themeDarkRef, themeRef } = useTheme();
  const labelsRef = useRef<HTMLDivElement>(null);
  const { controlsRef: renderControlsRef } = useRenderControls();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useEffect(() => {
    if (!canvasRef.current) return;
    const frameTimes = new SlidingWindow<number>(100);
    // { preserveDrawingBuffer: true } is required to make canvas.toBlob() work
    const gl = canvasRef.current.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;
    // `angle_instanced_arrays` is for instancing. `EXT_disjoint_timer_query` is for profiling during dev https://github.com/regl-project/regl/blob/main/API.md#profiling but it doesn't work at least in firefox
    const regl = REGL({ gl, extensions: ['angle_instanced_arrays'] });

    let simSize = simulationRef.current.size;
    // usage: 'dynamic' is for write many, though all values work so this is probably a compiler hint
    const colourBuffer = regl.buffer({ type: 'uint8', usage: 'dynamic', length: simSize * 3 });
    const positionBuffer = regl.buffer({ type: 'uint16', usage: 'dynamic', length: simSize * 2 });
    let colourArray = new Uint8Array(simSize * 3);
    let positionArray = new Uint16Array(simSize * 2);
    let prevSteps = -1;

    // `draw` renders to `drawFramebuffer` which is backed by `drawTexture`
    const drawTexture = regl.texture({
      width: simulationRef.current.width,
      height: simulationRef.current.height,
      format: 'rgba',
    });
    const drawFramebuffer = regl.framebuffer({ color: drawTexture, stencil: false });

    // blurs for the last 3 frames
    let blurs = Array.from({ length: 3 }, () => {
      if (!canvasRef.current) throw new Error('stop');
      const texture = regl.texture({
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        format: 'rgba',
      });
      return {
        texture,
        framefuffer: regl.framebuffer({ color: texture, stencil: false }),
      };
    });

    // `regl` is a generic but doesn't infer types. with no type args, the returned function's param is typed as Partial<{}> | Partial<{}>[]
    const draw = regl<Record<string, unknown>, Record<string, unknown>, DynamicProps>({
      // called per vertex
      vert: `
        #pragma vscode_glsllint_stage : vert
        precision mediump float;
        // only attributes support instanced data
        attribute vec2 verts;
        attribute lowp vec3 colour;
        attribute vec2 position;
        // uniforms are per-call
        uniform vec2 gridSize;
        // varying is for passing data from vertex to fragment shader
        varying lowp vec3 vColour;
        void main() {
          vec2 scale = 2.0 / gridSize;
          // coord space is -1 to 1
          vec2 cell = vec2(-1.0, -1.0) + verts * scale + position * scale;
          // gl y is inverted to the canvas and sim
          gl_Position = vec4(cell.x, -cell.y, 0, 1);
          // attributes have to be passed as varyings to the fragment shader
          vColour = colour;
        }`,
      // called per pixel
      frag: `
        #pragma vscode_glsllint_stage : frag
        precision lowp float;
        varying lowp vec3 vColour;
        void main() {
          // from the vertex shader
          gl_FragColor = vec4(vColour / 255.0, 1.0);
        }`,
      attributes: {
        verts: [
          // a quad. this is used for the base instance
          [0, 0],
          [1, 0],
          [0, 1],
          [0, 1],
          [1, 0],
          [1, 1],
        ],
        colour: {
          buffer: colourBuffer,
          // one stepping of vec3 (determined from the shader i suppose) per instance
          divisor: 1,
        },
        position: {
          buffer: positionBuffer,
          divisor: 1,
        },
      },
      // vert count
      count: 6,
      // per-call values
      uniforms: {
        gridSize: regl.prop<DynamicProps, 'gridSize'>('gridSize'),
      },
      instances: regl.prop<DynamicProps, 'instances'>('instances'),
      // where we write the image. null = canvas
      framebuffer: regl.prop<DynamicProps, 'framebuffer'>('framebuffer'),
    });

    const additiveBlur = regl<Record<string, unknown>, Record<string, unknown>, DynamicProps>({
      // renders a quad which fills the whole screen and passes uv coords to the frag shader for texture lookup
      vert: `
        #pragma vscode_glsllint_stage : vert
        precision mediump float;
        varying vec2 uv;
        attribute vec2 verts;

        void main() {
          uv = verts * 0.5 + 0.5;
          gl_Position = vec4(verts, 0, 1);
        }
      `,
      // run per pixel
      frag: `
        #pragma vscode_glsllint_stage : frag
        precision lowp float;

        uniform lowp sampler2D texture;
        uniform vec2 canvasSize;
        uniform float radius;
        uniform float step;
        uniform float falloff;
        uniform bool wrap;

        varying vec2 uv;

        const float maxBounds = 16.0;

        float modOne(float value) {
          if (!wrap) return value;
          if (value > 1.0) return value - 1.0;
          if (value < 0.0) return value + 1.0;
          return value;
        }

        void main() {
          float maxR2 = pow(radius, 2.0);
          vec2 pixel = vec2(1, 1) / canvasSize * step;
          vec4 blur = vec4(0, 0, 0, 0);

          // loop over neighbours, exclude by r2, accumulate their colour multiplied by falloff into blur
          // the for loop initialialiser and limit must be constants so this is quite horrendous
          for (float x = -maxBounds; x <= maxBounds; x++) {
            if (x < -radius || x > radius) continue;
            for (float y = -maxBounds; y <= maxBounds; y++) {
              if (y < -radius || y > radius) continue;
              float r2 = pow(x, 2.0) + pow(y, 2.0);
              if (r2 >= maxR2) continue;
              vec2 unbounded = uv + (vec2(x, y) * pixel);
              // apparently there is no mod operator
              vec2 wrapped = vec2(modOne(unbounded.x), modOne(unbounded.y));
              vec4 pointColour = texture2D(texture, wrapped);
              blur += pointColour * pow((maxR2 - r2) / maxR2, falloff) * 0.05;
            }
          }

          gl_FragColor = clamp(blur, 0.0, 1.0);
        }
      `,
      uniforms: {
        texture: drawTexture,
        canvasSize: regl.prop<DynamicProps, 'canvasSize'>('canvasSize'),
        radius: regl.prop<DynamicProps, 'radius'>('radius'),
        step: regl.prop<DynamicProps, 'step'>('step'),
        falloff: regl.prop<DynamicProps, 'falloff'>('falloff'),
        wrap: regl.prop<DynamicProps, 'wrap'>('wrap'),
      },
      attributes: {
        verts: [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ],
      },
      count: 6,
      // where we write the image. null = canvas
      framebuffer: regl.prop<DynamicProps, 'framebuffer'>('framebuffer'),
    });

    const composite = regl<Record<string, unknown>, Record<string, unknown>, DynamicProps>({
      // renders a quad which fills the whole screen and passes uv coords to the frag shader for texture lookup
      vert: `
        #pragma vscode_glsllint_stage : vert
        precision mediump float;
        varying vec2 uv;
        attribute vec2 verts;

        void main() {
          uv = verts * 0.5 + 0.5;
          gl_Position = vec4(verts, 0, 1);
        }
      `,
      // run per pixel
      frag: `
        #pragma vscode_glsllint_stage : frag
        precision lowp float;

        uniform lowp sampler2D texture;
        uniform lowp sampler2D blur0;
        uniform lowp sampler2D blur1;
        uniform lowp sampler2D blur2;
        uniform vec4 background;
        uniform float colourMix;
        uniform float blur0Mix;
        uniform float blur1Mix;
        uniform float blur2Mix;
        uniform bool showBackground;

        varying vec2 uv;

        // pow doesn't work with ints
        const float radius = 6.0;
        float maxR2 = pow(radius, 2.0);

        void main() {
          vec4 colourPoint = texture2D(texture, uv);
          vec4 blur0Point = texture2D(blur0, uv);
          vec4 blur1Point = texture2D(blur1, uv);
          vec4 blur2Point = texture2D(blur2, uv);

          vec4 mixed = clamp(
            colourPoint * colourMix +\
            blur0Point * blur0Mix +\
            blur1Point * blur1Mix +\
            blur2Point * blur2Mix \
          , 0.0, 1.0);

          // add in background and remove opacity
          if (showBackground) gl_FragColor = vec4(mixed.rgb + background.rgb * (1.0 - mixed.a), 1);
          else gl_FragColor = mixed;
        }
      `,
      uniforms: {
        texture: drawTexture,
        background: regl.prop<DynamicProps, 'background'>('background'),
        blur0: regl.prop<DynamicProps, 'blur0'>('blur0'),
        blur1: regl.prop<DynamicProps, 'blur1'>('blur1'),
        blur2: regl.prop<DynamicProps, 'blur2'>('blur2'),
        colourMix: regl.prop<DynamicProps, 'colourMix'>('colourMix'),
        blur0Mix: regl.prop<DynamicProps, 'blur0Mix'>('blur0Mix'),
        blur1Mix: regl.prop<DynamicProps, 'blur1Mix'>('blur1Mix'),
        blur2Mix: regl.prop<DynamicProps, 'blur2Mix'>('blur2Mix'),
        showBackground: regl.prop<DynamicProps, 'showBackground'>('showBackground'),
      },
      attributes: {
        verts: [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ],
      },
      count: 6,
    });

    // per-frame callback
    regl.frame(({ tick, time }) => {
      frameTimes.push(time);
      if (!canvasRef.current) return;
      if (!simControlsRef.current.paused) stepTimesRef.current.push(simulationRef.current.step(simControlsRef.current.speed));
      if (simulationRef.current.steps !== prevSteps) prevSteps = simulationRef.current.steps;
      let needsRender = simulationRef.current.dirty;

      // recreate / resize buffers on sim size change
      if (simulationRef.current.size !== simSize) {
        console.debug('resizing regl buffers from', simSize, 'to', simulationRef.current.size);
        simSize = simulationRef.current.size;
        colourBuffer({ type: 'uint8', usage: 'dynamic', length: simSize * 3 });
        positionBuffer({ type: 'uint16', usage: 'dynamic', length: simSize * 2 });
        colourArray = new Uint8Array(simSize * 3);
        positionArray = new Uint16Array(simSize * 2);
        drawTexture.resize(simulationRef.current.width, simulationRef.current.height);
        drawFramebuffer.resize(simulationRef.current.width, simulationRef.current.height);
        for (const blur of blurs) {
          blur.texture.resize(canvasRef.current.width, canvasRef.current.height);
          blur.framefuffer.resize(canvasRef.current.width, canvasRef.current.height);
        }
        needsRender = true;
      }

      if (needsRender) {
        // fill the typed arrays with sim data
        let i = 0;
        for (const [x, y, age, neighbours] of simulationRef.current.values()) {
          const [r, g, b] = convert.hsl.rgb(
            age + themeRef.current.hue,
            renderControlsRef.current.bloom ? 100 : (100 / 3) * Math.min(3, neighbours),
            themeDarkRef.current ? 70 : 30
          );
          colourArray[i * 3 + 0] = r;
          colourArray[i * 3 + 1] = g;
          colourArray[i * 3 + 2] = b;
          positionArray[i * 2 + 0] = x;
          positionArray[i * 2 + 1] = y;
          ++i;
        }

        // copy the updated part of the typed arrays to the regl buffers
        colourBuffer.subdata(colourArray.subarray(0, (i + 1) * 3));
        positionBuffer.subdata(positionArray.subarray(0, (i + 1) * 2));

        if (renderControlsRef.current.bloom) {
          // render
          // clear framebuffer to transparent black to avoid interfering with colour mixing
          regl.clear({ color: [0, 0, 0, 0], depth: 1, framebuffer: drawFramebuffer });
          // draw to framebuffer
          draw({ instances: i, gridSize: [simulationRef.current.width, simulationRef.current.height], framebuffer: drawFramebuffer });

          // clear blurs[0].framebuffer. the colour is overwritten but not clearing it gives no output
          regl.clear({ color: [0, 0, 0, 0], depth: 1, framebuffer: blurs[0].framefuffer });
          // render blur to blurs[0]
          additiveBlur({
            canvasSize: [canvasRef.current.width, canvasRef.current.height],
            framebuffer: blurs[0].framefuffer,
            radius: renderControlsRef.current.blurRadius,
            step: renderControlsRef.current.blurStep,
            falloff: renderControlsRef.current.blurFalloff,
            wrap: simControlsRef.current.wrap,
          });

          // clear the canvas
          regl.clear({ color: [0, 0, 0, 0], depth: 1 });
          // composite the colour pass, the blur passes, and the background to the canvas
          composite({
            background: themeDarkRef.current ? [0, 0, 0, 1] : [1, 1, 1, 1],
            blur0: blurs[0].texture,
            blur1: blurs[1].texture,
            blur2: blurs[2].texture,
            colourMix: renderControlsRef.current.colourMix / 100,
            blur0Mix: renderControlsRef.current.blur0Mix / 100,
            blur1Mix: renderControlsRef.current.blur1Mix / 100,
            blur2Mix: renderControlsRef.current.blur2Mix / 100,
            showBackground: renderControlsRef.current.background,
          });

          // rotate blurs
          blurs = [blurs[blurs.length - 1], ...blurs.slice(0, -1)];
        } else {
          // framebuffer: null === canvas
          regl.clear({ color: themeDarkRef.current ? [0, 0, 0, 1] : [1, 1, 1, 1], depth: 1 });
          // instances tells the shader how many instances to render from the buffers. which gets around the problem of them potentially containing old data beyond where we've written in this pass
          draw({ instances: i, gridSize: [simulationRef.current.width, simulationRef.current.height], framebuffer: null });
        }
      }

      // labels and debug
      if (tick % 10 > 0) return;
      const stepTime = stepTimesRef.current.items().reduce((acc, item) => acc + item, 0) / stepTimesRef.current.size;
      const frameRate = (1 / ((frameTimes.at(-1) ?? 0) - (frameTimes.at(0) ?? 0))) * (frameTimes.size - 1);
      const { alive, steps } = simulationRef.current;
      if (tick % 1000 === 0) {
        const reglStats = regl.stats;
        const drawStats = draw.stats;
        console.debug({
          tick,
          stepTime,
          frameRate,
          alive,
          steps,
          reglStats,
          drawStats,
          colourArrayLength: colourArray.length,
          positionArrayLength: positionArray.length,
        });
      }

      if (!labelsRef.current) return;
      (labelsRef.current.children[0] as HTMLSpanElement).innerText = `Step ${steps.toLocaleString()}`;
      (labelsRef.current.children[1] as HTMLSpanElement).innerText = `${Number.isNaN(stepTime) ? '- ' : stepTime.toFixed(1)} ms`;
      (labelsRef.current.children[2] as HTMLSpanElement).innerText = `${frameRate.toFixed(1)} fps`;
      (labelsRef.current.children[3] as HTMLSpanElement).innerText = `${alive.toLocaleString()} alive`;
    });

    return () => regl.destroy();
  }, []);

  return (
    <>
      <Canvas ref={canvasRef} />
      <div className='fixed bottom-0 left-0 right-0 p-4 m-1 bg-background/70 pointer-events-none select-none'>
        <div className='grid grid-cols-[repeat(auto-fit,minmax(10ch,1fr))] gap-4 text-4xl font-medium text-center max-w-6xl mx-auto' ref={labelsRef}>
          <span className='text-label-1' />
          <span className='text-label-2' />
          <span className='text-label-3' />
          <span className='text-label-4' />
        </div>
      </div>
    </>
  );
}
