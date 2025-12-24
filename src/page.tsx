import { Nav } from '@/components/nav';
import { Renderer2d } from '@/components/renderer/2d';
import { RendererRegl } from '@/components/renderer/regl';
import { Renderer, useControls } from '@/hooks/controls';

export default function Page() {
  const { controls } = useControls();
  return (
    <div className='flex flex-col size-full items-center justify-center'>
      <Nav />
      {controls.renderer === Renderer.Canvas2d ? <Renderer2d /> : controls.renderer === Renderer.Regl ? <RendererRegl /> : null}
    </div>
  );
}
