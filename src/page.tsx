import { Nav } from '@/components/nav';
import { Renderer2dGeometry } from '@/components/renderer/2d-geometry';
import { Renderer2dPixel } from '@/components/renderer/2d-pixel';
import { RendererRegl } from '@/components/renderer/regl';
import { RendererReglScatter2d } from '@/components/renderer/regl-scatter2d';
import { RendererTwoJs } from '@/components/renderer/twojs';
import { Renderer, useControls } from '@/hooks/controls';

export default function Page() {
  const { controls } = useControls();
  return (
    <div className='flex flex-col size-full items-center justify-center'>
      <Nav />
      {controls.renderer === Renderer.Canvas2dGeometry ?
        <Renderer2dGeometry />
      : controls.renderer === Renderer.TwoJs ?
        <RendererTwoJs />
      : controls.renderer === Renderer.Canvas2dPixel ?
        <Renderer2dPixel />
      : controls.renderer === Renderer.ReglScatter2d ?
        <RendererReglScatter2d />
      : controls.renderer === Renderer.Regl ?
        <RendererRegl />
      : null}
    </div>
  );
}
