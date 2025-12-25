import convert from 'color-convert';
import { useEffect, useRef } from 'react';
import REGL from 'regl';
import { Canvas } from '@/components/canvas';
import { useControls } from '@/hooks/controls';
import { useSimulation } from '@/hooks/simulation';
import { useTheme } from '@/hooks/theme';
import { SlidingWindow } from '@/lib/sliding-window';

interface DynamicProps {
  gridSize: [x: number, y: number];
  instances: number;
}

/** TODO:
 *  - bloom. but the regl docs assume that you already know how to use webgl. which i do not.
 *  - save image. canvasRef.current.toBlob() doesn't work for webgl
 */
export function RendererRegl() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { controlsRef } = useControls();
  const { simulationRef, stepTimesRef } = useSimulation();
  const { themeDarkRef, themeRef } = useTheme();
  const labelsRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useEffect(() => {
    if (!canvasRef.current) return;
    const frameTimes = new SlidingWindow<number>(100);
    // https://github.com/regl-project/regl/blob/gh-pages/API.md
    // https://github.com/regl-project/regl/tree/gh-pages/example
    // `angle_instanced_arrays` is for instancing. `EXT_disjoint_timer_query` is for profiling during dev https://github.com/regl-project/regl/blob/main/API.md#profiling but it doesn't work
    const regl = REGL({ canvas: canvasRef.current, extensions: ['angle_instanced_arrays'] });

    let simSize = simulationRef.current.size;
    // usage: 'dynamic' is for write many, though all values work so this is probably a compiler hint
    const colourBuffer = regl.buffer({ type: 'uint8', usage: 'dynamic', length: simSize * 3 });
    const positionBuffer = regl.buffer({ type: 'uint16', usage: 'dynamic', length: simSize * 2 });
    let colourArray = new Uint8Array(simSize * 3);
    let positionArray = new Uint16Array(simSize * 2);

    // `regl` is a generic but doesn't infer types. with no type args, the returned function's param is typed as Partial<{}> | Partial<{}>[]
    const draw = regl<Record<string, unknown>, Record<string, unknown>, DynamicProps>({
      // data types: https://wikis.khronos.org/opengl/Data_Type_(GLSL) but anything other than vecx seems to be a syntax error and won't compile. maybe because this is webgl1 and not 2? vecx are f32[] so i suppose the u8s and u16s are being cast by or before getting to the shaders? which i suppose is fine as long as long as they're being transferred around as u8 / u16
      vert: `
        #pragma vscode_glsllint_stage : vert
        precision mediump float;
        attribute vec2 verts;
        // only attributes support instanced data
        attribute vec3 colour;
        attribute vec2 position;
        // uniforms are per-call
        uniform vec2 gridSize;
        // varying is for passing data from vertex to fragment shader
        varying vec3 vColour;
        void main() {
          vec2 scale = 2.0 / gridSize;
          // coord space is -1 to 1
          vec2 cell = vec2(-1.0, -1.0) + verts * scale + position * scale;
          // gl y is inverted to the canvas and sim
          gl_Position = vec4(cell.x, -cell.y, 0, 1);
          // attributes have to be passed as varyings to the fragment shader
          vColour = colour;
        }`,
      frag: `
        #pragma vscode_glsllint_stage : frag
        precision mediump float;
        varying vec3 vColour;
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
      // TODO: disable this
      profile: true,
    });

    // per-frame callback
    regl.frame(({ tick, time }) => {
      frameTimes.push(time);
      if (!controlsRef.current.paused) stepTimesRef.current.push(simulationRef.current.step(controlsRef.current.speed));

      // recreate buffers on sim size change
      if (simulationRef.current.size !== simSize) {
        console.debug('resizing regl buffers from', simSize, 'to', simulationRef.current.size);
        simSize = simulationRef.current.size;
        colourBuffer({ type: 'uint8', usage: 'dynamic', length: simSize * 3 });
        positionBuffer({ type: 'uint16', usage: 'dynamic', length: simSize * 2 });
        colourArray = new Uint8Array(simSize * 3);
        positionArray = new Uint16Array(simSize * 2);
      }

      // fill the typed arrays with sim data
      let i = 0;
      for (const [x, y, age, neighbours] of simulationRef.current.values()) {
        const [r, g, b] = convert.hsl.rgb(age + themeRef.current.hue, (100 / 3) * Math.min(3, neighbours), themeDarkRef.current ? 70 : 30);
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

      // render
      regl.clear({ color: themeDarkRef.current ? [0, 0, 0, 1] : [1, 1, 1, 1], depth: 1 });
      // `instances` here is mapped to `instances` on the regl command and tells it how many entries to render from the buffers, so we don't need to worry about clearing old data
      draw({ instances: i, gridSize: [simulationRef.current.width, simulationRef.current.height] });

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
      // FIXME: this is not very clever. render to a 2d canvas every n frames and push to regl as a texture
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
      <div className='fixed bottom-0 left-0 right-0 p-4 m-1 bg-background/70'>
        <div className='grid grid-cols-[repeat(auto-fit,minmax(8ch,1fr))] gap-4 text-4xl font-medium text-center max-w-6xl mx-auto' ref={labelsRef}>
          <span className='text-label-1' />
          <span className='text-label-2' />
          <span className='text-label-3' />
          <span className='text-label-4' />
        </div>
      </div>
    </>
  );
}
