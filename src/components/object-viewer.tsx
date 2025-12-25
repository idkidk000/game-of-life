import { useCallback } from 'react';
import { useSimObject } from '@/hooks/sim-object';
import type { SimObjectLike } from '@/lib/sim-object';

// FIXME: creating elems for each rect seems not very clever. maybe use a canvas?
export function ObjectViewer({ object }: { object: SimObjectLike | null }) {
  const { setActiveSimObject, activeSimObject } = useSimObject();

  const handleClick = useCallback(() => setActiveSimObject(object), [object, setActiveSimObject]);

  const name = object ? (object?.name ?? 'Unknown') : 'None';

  return (
    <span
      className={`flex flex-col gap-4 items-center justify-center p-4 border-3 max-w-40 overflow-hidden ${activeSimObject?.id === object?.id ? 'border-accent' : 'border-transparent hover:border-accent/50 active:border-accent'}`}
      onClick={handleClick}
      title={name}
    >
      {object ? (
        <svg
          fill='currentColor'
          stroke='currentColor'
          strokeLinecap='square'
          strokeWidth='1'
          viewBox={`0 0 ${object.width} ${object.height}`}
          className='h-12 max-w-full'
        >
          <title>{`${name} preview`}</title>
          {object.points.map(([x, y]) => (
            <rect key={`${x},${y}`} x={x} y={y} width='1' height='1' />
          ))}
        </svg>
      ) : (
        <svg viewBox='0 0 1 1' className='h-12' />
      )}
      <div className='flex flex-col items-center justify-center max-w-full'>
        <span className='max-w-full truncate'>{name}</span>
        <span>{object ? `${object.width} x ${object.height}` : ''}</span>
      </div>
    </span>
  );
}
