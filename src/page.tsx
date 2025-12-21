import { Nav } from '@/components/nav';
import { Renderer2d } from '@/components/renderer/2d';
import { RendererWebGl2 } from '@/components/renderer/webgl2';
import { CanvasProvider } from '@/hooks/canvas';
import { Renderer, useControls } from '@/hooks/controls';

export default function Page() {
  const { controls } = useControls();
  return (
    <div className='flex flex-col size-full items-center justify-center'>
      <Nav />
      <CanvasProvider>
        {controls.renderer === Renderer.Canvas2D ?
          <Renderer2d />
        : controls.renderer === Renderer.CanvasWebGl2 ?
          <RendererWebGl2 />
        : null}
      </CanvasProvider>
    </div>
  );
}
