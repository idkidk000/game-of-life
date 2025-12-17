import { Controls } from '@/components/controls';
import { Simulation } from '@/components/simulation';
import { ControlsProvider } from '@/hooks/controls';

export default function Page() {
  return (
    <ControlsProvider>
      <div className='flex flex-col w-full h-full items-center justify-center'>
        <Controls />
        <Simulation />
      </div>
    </ControlsProvider>
  );
}
