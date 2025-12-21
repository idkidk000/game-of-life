import { Nav } from '@/components/nav';
import { Renderer2dGeometry } from '@/components/renderer/2d-geometry';
import { Renderer2DPixel } from '@/components/renderer/2d-pixel';
import { RendererTwoJs } from '@/components/renderer/webgl2-twojs';
import { Renderer, useControls } from '@/hooks/controls';

export default function Page() {
  const { controls } = useControls();
  return (
    <div className='flex flex-col size-full items-center justify-center'>
      <Nav />
      {controls.renderer === Renderer.Canvas2DGeometry ?
        <Renderer2dGeometry />
      : controls.renderer === Renderer.TwoJs ?
        <RendererTwoJs />
      : controls.renderer === Renderer.Canvas2DPixel ?
        <Renderer2DPixel />
      : null}
    </div>
  );
}
