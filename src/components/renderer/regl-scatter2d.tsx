import { useEffect, useRef } from 'react';
import REGL from 'regl';
// @ts-expect-error untyped chaos
import createScatter from 'regl-scatter2d';
import { Canvas } from '@/components/canvas';

/* https://github.com/gl-vis/regl-scatter2d
  this expects geometry to be set up once and then left alone so this is very unlikely to work
*/
export function RendererReglScatter2d() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const regl = REGL({ extensions: 'oes_element_index_uint', canvas: canvasRef.current });
    const scatter = createScatter(regl);
    scatter({
      positions: Array.from({ length: 10 }, () => Math.round(Math.random() * 100)),
      color: 'rgba(0, 100, 200, .75)',
    });
  }, []);

  return <Canvas canvasRef={canvasRef} />;
}
