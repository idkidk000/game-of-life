import { Nav } from '@/components/nav';
import { Renderer } from '@/components/renderer';
import { ControlsProvider } from '@/hooks/controls';

export default function Page() {
  return (
    <ControlsProvider>
      <div className='flex flex-col size-full items-center justify-center'>
        <Nav />
        <Renderer />
      </div>
    </ControlsProvider>
  );
}
