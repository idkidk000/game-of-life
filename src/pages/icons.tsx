import type { JSX, SVGProps } from 'react';
import * as AllIcons from '@/generated/icons';

export default function Icons() {
  return (
    <div className='text-xs grid grid-cols-[repeat(auto-fill,minmax(20ch,1fr))] gap-4 max-w-full overflow-x-hidden p-4'>
      {Object.keys(AllIcons).map((name) => {
        const Component = (AllIcons as Record<string, (props: SVGProps<SVGSVGElement>) => JSX.Element>)[name];
        return (
          <div key={name} className='break-all flex flex-col items-center'>
            <Component className='size-12' />
            {name}
          </div>
        );
      })}
    </div>
  );
}
