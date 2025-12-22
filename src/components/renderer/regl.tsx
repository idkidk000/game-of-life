/**
 * @noprettier STOP INVENTING STUPID PLACES TO PUT A SEMICOLON PLEASE
 */

import convert from 'color-convert';
import { useEffect, useRef } from 'react';
import REGL from 'regl';
import { Canvas } from '@/components/canvas';
import { useControls } from '@/hooks/controls';
import { useSimulation } from '@/hooks/simulation';
import { useTheme } from '@/hooks/theme';
import { SlidingWindow } from '@/lib/sliding-window';

/** TODO:
 *  - optimise a lot
 *  - bloom
 *  - stats as text labels. maybe render in a 2d canvas and add as textures?? or maybe even dom elements wouldn't be too bad idk
 */
export function RendererRegl() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { controlsRef } = useControls();
  const { simulationRef, stepTimesRef } = useSimulation();
  const { themeDarkRef } = useTheme();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useEffect(() => {
    if (!canvasRef.current) return;
    const frameTimes = new SlidingWindow<number>(100);
    const regl = REGL({ canvas: canvasRef.current, extensions: ['angle_instanced_arrays'] });
    //FIXME: these either need to be dynamically sized or recreated/resized on sim size change
    const colourBuffer = regl.buffer({ type: 'uint8', usage: 'dynamic', length: simulationRef.current.size * 3 });
    const offsetBuffer = regl.buffer({ type: 'uint16', usage: 'dynamic', length: simulationRef.current.size * 2 });
    //FIXME: this is a generic but i don't understand how it's meant to work
    const draw = regl({
      frag: `
        precision mediump float;
        varying vec3 vColour;
        void main() {
          gl_FragColor = vec4(vColour / 255.0, 1.0);
        }`,
      //FIXME: maffs
      vert: `
        precision mediump float;
        attribute vec2 position;
        attribute vec3 colour;
        attribute vec2 offset;
        uniform vec2 gridSize;
        varying vec3 vColour;
        void main() {
          gl_Position = vec4(position.x / gridSize.x + offset.x * 2.0 / gridSize.x - 1.0, -(position.y / gridSize.y + offset.y * 2.0 / gridSize.y - 1.0), 0, 1);
          vColour = colour;
        }`,
      attributes: {
        position: [
          // a quad. this is used for the base instance
          [-1, -1],
          [1, -1],
          [-1, 1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ],
        colour: {
          buffer: colourBuffer,
          // one stepping of vec3 (determined from the shader) per instance. not sure how other values would be useful
          divisor: 1,
        },
        offset: {
          buffer: offsetBuffer,
          divisor: 1,
        },
      },
      uniforms: {
        gridSize: regl.prop('gridSize' as never),
      },
      count: 6,
      instances: regl.prop('instances' as never),
    });

    regl.frame(({ tick, time }) => {
      frameTimes.push(time);
      if (!controlsRef.current.paused) stepTimesRef.current.push(simulationRef.current.step(controlsRef.current.speed));

      const { alive, steps } = simulationRef.current.stats();

      // FIXME: don't recreate these every frame
      const colourArray = new Uint8Array(alive * 3);
      const offsetArray = new Uint16Array(alive * 2);
      let i = 0;
      for (const [x, y, age, neighbours] of simulationRef.current.values()) {
        const [r, g, b] = convert.hsl.rgb(age, (100 / 3) * Math.min(3, neighbours), themeDarkRef.current ? 70 : 30);
        colourArray[i * 3 + 0] = r;
        colourArray[i * 3 + 1] = g;
        colourArray[i * 3 + 2] = b;
        offsetArray[i * 2 + 0] = x;
        offsetArray[i * 2 + 1] = y;
        ++i;
      }

      // FIXME: cxan i just write to the buffers directly??
      colourBuffer.subdata(colourArray);
      offsetBuffer.subdata(offsetArray);

      regl.clear({
        color: themeDarkRef.current ? [0, 0, 0, 1] : [1, 1, 1, 1],
        depth: 1,
      });
      draw({ instances: alive, gridSize: [simulationRef.current.width,simulationRef.current.height] });

      if (tick < 10 || tick % 1000 === 0) {
        const stepTime = stepTimesRef.current.items().reduce((acc, item) => acc + item, 0) / stepTimesRef.current.size;
        const frameRate = (1 / ((frameTimes.at(-1) ?? 0) - (frameTimes.at(0) ?? 0))) * (frameTimes.size - 1);

        console.debug({ tick, stepTime, frameRate, alive, steps }, colourArray.length, offsetArray.length);
      }
    });

    return ()=>regl.destroy()
  }, []);

  return <Canvas canvasRef={canvasRef} />;
}
