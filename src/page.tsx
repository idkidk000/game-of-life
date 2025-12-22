import { Nav } from '@/components/nav';
import { Renderer2dGeometry } from '@/components/renderer/2d-geometry';
import { RendererRegl } from '@/components/renderer/regl';
import { Renderer, useControls } from '@/hooks/controls';

export default function Page() {
  const { controls } = useControls();
  return (
    <div className='flex flex-col size-full items-center justify-center'>
      <Nav />
      {controls.renderer === Renderer.Canvas2dGeometry ?
        <Renderer2dGeometry />
      : controls.renderer === Renderer.Regl ?
        <RendererRegl />
      : null}
    </div>
  );
}
