import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Menu, MenuClose, MenuContent, MenuTrigger } from '@/components/menu';
import { Modal, ModalContent, ModalTrigger, useModal } from '@/components/modal';
import { ToolTip } from '@/components/tooltip';
import { AddBox, CardText } from '@/generated/icons';
import { useControls } from '@/hooks/controls';
import { useSimObject } from '@/hooks/sim-object';
import { SimObject } from '@/lib/sim-object';

function SimObjectViewer<T extends string | null | undefined>({
  name,
  id,
  width,
  height,
  points,
  onClick,
}: {
  name?: string;
  id: T;
  width: number;
  height: number;
  points: [x: number, y: number][];
  onClick?: (id: T) => unknown;
}) {
  const { activeSimObject } = useSimObject();

  const handleClick = useCallback(() => onClick?.(id), [id, onClick]);

  return (
    <ToolTip title={name ?? 'Unknown'}>
      <span
        className={`flex flex-col gap-4 items-center justify-center p-4 border-3 max-w-40 overflow-hidden ${(activeSimObject && activeSimObject.id === id) || (!activeSimObject && activeSimObject === id) ? 'border-accent' : 'border-transparent hover:border-accent/50 active:border-accent'}`}
        onClick={handleClick}
      >
        <svg
          aria-hidden={true}
          fill='currentColor'
          stroke='currentColor'
          strokeLinecap='square'
          strokeWidth='0'
          viewBox={`0 0 ${width} ${height}`}
          className='h-12 max-w-full'
        >
          {points.map(([x, y]) => (
            <rect key={`${x},${y}`} x={x} y={y} width='1' height='1' />
          ))}
        </svg>
        <div className='flex flex-col items-center justify-center max-w-full'>
          <span className='max-w-full truncate text-sm'>{name ?? 'Unknown'}</span>
          <span className='text-xs'>{width || height ? `${width} x ${height}` : ''}</span>
        </div>
      </span>
    </ToolTip>
  );
}

function makeRandomPoints(radius: number) {
  const r2 = radius ** 2;
  const points: [x: number, y: number][] = [];
  for (let x = -radius; x <= radius; ++x)
    for (let y = -radius; y <= radius; ++y) {
      const d2 = x ** 2 + y ** 2;
      if (d2 > r2) continue;
      if (Math.random() > 0.8) points.push([x + radius, y + radius]);
    }
  return points;
}

// biome-ignore format: do not
const importPoints: [x: number, y: number][] = [
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [3, 6]
];

function ImportModalContent() {
  const { setClosed, state } = useModal();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { addSimObject, setActiveSimObject } = useSimObject();

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate
  useEffect(() => {
    if (!textAreaRef.current) return;
    textAreaRef.current.value = '';
    setError(null);
  }, [state]);

  const handleClick = useCallback(() => {
    if (!textAreaRef.current) return;
    try {
      const item = new SimObject(textAreaRef.current.value);
      addSimObject(item);
      setActiveSimObject(item);
      textAreaRef.current.value = '';
      setError(null);
      setClosed();
    } catch (err) {
      setError(String(err));
    }
  }, [setClosed, addSimObject, setActiveSimObject]);

  return (
    <ModalContent>
      <div className='flex flex-col gap-4 p-4 items-center'>
        <span>Import RLE data:</span>
        <textarea className='w-full lg:max-w-md border-3 border-accent' rows={10} cols={75} ref={textAreaRef} />
        <span className={error ? 'text-red-500' : 'hidden'}>{error}</span>
        <Button label='OK' title='Import' onClick={handleClick}>
          <CardText />
        </Button>
      </div>
    </ModalContent>
  );
}

export function SimObjectMenu() {
  const { setActiveSimObject, simObjects } = useSimObject();
  const { controls } = useControls();

  // biome-ignore format: do not
  const handleObjectClick = useCallback((id: string) =>
    setActiveSimObject(simObjects[simObjects.findIndex((item) => item.id === id)]),
  [setActiveSimObject, simObjects]);

  const handleNoiseClick = useCallback(() => setActiveSimObject(null), [setActiveSimObject]);

  const randomPoints = useMemo(() => makeRandomPoints(controls.spawn.radius), [controls.spawn.radius]);

  return (
    <Menu>
      <MenuTrigger>
        <Button title='Add object' label='Add'>
          <AddBox />
        </Button>
      </MenuTrigger>
      <MenuContent width='full'>
        <div className='flex flex-wrap gap-4 p-4 justify-center items-center'>
          {simObjects.map((simObject) => (
            <MenuClose key={simObject.id}>
              <SimObjectViewer {...simObject} onClick={handleObjectClick} />
            </MenuClose>
          ))}
          <MenuClose>
            <SimObjectViewer
              height={controls.spawn.radius * 2}
              id={null}
              points={randomPoints}
              width={controls.spawn.radius * 2}
              name='Noise'
              onClick={handleNoiseClick}
            />
          </MenuClose>
          <Modal>
            <ModalTrigger>
              <SimObjectViewer height={7} id={undefined} points={importPoints} width={7} name='Import RLE' />
            </ModalTrigger>
            <ImportModalContent />
          </Modal>
        </div>
      </MenuContent>
    </Menu>
  );
}
