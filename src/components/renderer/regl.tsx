import { useEffect, useRef } from 'react';
import REGL from 'regl';
import { Canvas } from '@/components/canvas';
import { useSimulation } from '@/hooks/simulation';
import { useTheme } from '@/hooks/theme';

/** TODO:
 *  - pixel sizes (position attribute of vertex shader) need to be based on current sim geometry. passing in the full coords of each triangle vertex in `draw` could work but seems inefficient
 *  - re-add `color-convert` package and make nice colours
 *  - don't recreate shaders on every frame (unless that's normal)
 *  - compositing
 */
export function RendererRegl() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { themeDarkRef } = useTheme();
  const { simulationRef } = useSimulation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref objects
  useEffect(() => {
    if (!canvasRef.current) return;
    const regl = REGL({ canvas: canvasRef.current, pixelRatio: 1 });
    const draw = regl({
      // Shaders in regl are just strings.  You can use glslify or whatever you want
      // to define them.  No need to manually create shader objects.
      frag: `
    precision mediump float;
    uniform vec4 colour;
    void main() {
      gl_FragColor = colour;
    }`,

      vert: `
    precision mediump float;
    attribute vec2 position;
    uniform vec2 offset;
    void main() {
      gl_Position = vec4(position.x + offset.x, position.y + offset.y, 0, 1);
    }`,

      attributes: {
        // it seems like we have to draw triangles and the coordinate ranges are -1 to 1 x and y
        position: [
          [-0.01, -0.01],
          [0.01, -0.01],
          [-0.01, 0.01],

          [0.01, 0.01],
          [-0.01, 0.01],
          [0.01, -0.01],
        ],
      },

      uniforms: {
        // static colour
        // colour: [1, 0, 0, 1],
        // dynamic
        // an attempt was made to type dynamic props but it doesn't work at all
        colour: regl.prop('colour' as never),
        offset: regl.prop('offset' as never),
      },

      // This tells regl the number of vertices to draw in this command
      count: 6,
    });

    // regl.frame() wraps requestAnimationFrame and also handles viewport changes
    regl.frame(({ tick }) => {
      simulationRef.current.step();

      const drawParams = simulationRef.current
        .values()
        .map(([x, y, neighbours, age]) => ({
          colour: [neighbours / 8, age / 255, 1, 1],
          offset: [(x / simulationRef.current.width) * 2 - 1, (y / simulationRef.current.height) * 2 - 1],
        }))
        .toArray();

      regl.clear({
        //TODO: both produce black
        color: themeDarkRef ? [0, 0, 0, 1] : [1, 1, 1, 1],
        depth: 1,
      });

      draw(drawParams);
      if (tick % 1000 === 0) console.debug({ tick }, drawParams);
    });
  }, []);

  return <Canvas canvasRef={canvasRef} />;
}
