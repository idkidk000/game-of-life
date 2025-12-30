import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { Menu, MenuClose, MenuContent, MenuTrigger } from '@/components/menu';
import { Modal, ModalContent, ModalTrigger, useModal } from '@/components/modal';
import { ToolTip } from '@/components/tooltip';
import { CardText, DragAndDrop } from '@/generated/icons';
import { useSimControls } from '@/hooks/sim-controls';
import { useTool } from '@/hooks/tools';
import { SimObject } from '@/lib/sim-object';
import { pointsToPath } from '@/lib/utils';

function SimObjectViewer<T extends string | null>({
  name,
  id,
  width,
  height,
  path,
  onClick,
}: {
  name?: string;
  id: T;
  width: number;
  height: number;
  path: string;
  onClick?: (id: T) => unknown;
}) {
  const { activeTool } = useTool();

  const handleClick = useCallback(() => onClick?.(id), [id, onClick]);

  const rotation =
    activeTool.id === id && 'rotation' in activeTool
      ? activeTool.rotation === 0
        ? 'rotate-0'
        : activeTool.rotation === 1
          ? 'rotate-90'
          : activeTool.rotation === 2
            ? 'rotate-180'
            : activeTool.rotation === 3
              ? 'rotate-270'
              : ''
      : '';

  return (
    <ToolTip title={name ?? 'Unknown'}>
      <span
        className={`flex flex-col gap-4 items-center justify-center p-4 border-3 max-w-40 overflow-hidden transition-[border-color] duration-200 ${activeTool.id === id ? 'border-accent' : 'border-transparent hover:border-accent/50 active:border-accent'}`}
        onClick={handleClick}
      >
        <svg
          aria-hidden={true}
          fill='currentColor'
          stroke='currentColor'
          strokeLinecap='square'
          strokeWidth='1'
          viewBox={`-0.5 -0.5 ${width} ${height}`}
          className={`h-12 max-w-full ${rotation}`}
        >
          <path d={path} />
        </svg>
        <div className='flex flex-col items-center justify-center max-w-full'>
          <h3 className='max-w-full truncate text-sm'>{name ?? 'Unknown'}</h3>
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

const importPath = pointsToPath(importPoints);

function ImportModalContent() {
  const { setClosed, state } = useModal();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { addSimObject, setActiveTool: setActiveSimObject } = useTool();

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate
  useEffect(() => {
    if (!textAreaRef.current) return;
    textAreaRef.current.value = '';
    setError(null);
  }, [state]);

  const handleClick = useCallback(() => {
    if (!textAreaRef.current) return;
    try {
      const item = new SimObject(textAreaRef.current.value).toJSON();
      addSimObject(item);
      setActiveSimObject({ ...item, rotation: 0 });
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
        <h2>Import RLE data:</h2>
        <ToolTip title='Paste RLE data, e.g. from https://conwaylife.com/'>
          <textarea className='w-full lg:max-w-md border-3 border-accent' rows={10} cols={75} ref={textAreaRef} />
        </ToolTip>
        <span className={error ? 'text-red-500' : 'hidden'}>{error}</span>
        <Button label='OK' title='Import' onClick={handleClick}>
          <CardText />
        </Button>
      </div>
    </ModalContent>
  );
}

export function ToolsMenu() {
  const { setActiveTool, activeToolRef, simObjects } = useTool();
  const { controls } = useSimControls();

  // biome-ignore format: do not
  const handleObjectClick = useCallback((id: string) => {
    const object = simObjects[simObjects.findIndex((item) => item.id === id)];
    if (object.id === activeToolRef.current.id && 'rotation' in activeToolRef.current)
      setActiveTool({ ...object, rotation: (activeToolRef.current.rotation + 1) % 4 });
    else setActiveTool({...object,rotation:0})
  }, [ simObjects]);

  const handleNoiseClick = useCallback(() => setActiveTool({ id: 'noise' }), []);
  const handleEraseClick = useCallback(() => setActiveTool({ id: 'erase' }), []);

  const randomPath = useMemo(() => pointsToPath(makeRandomPoints(controls.spawn.radius)), [controls.spawn.radius]);

  return (
    <Menu>
      <MenuTrigger>
        <Button title='Tools menu' label='Tool'>
          <DragAndDrop />
        </Button>
      </MenuTrigger>
      <MenuContent width='full'>
        <div className='flex flex-wrap gap-4 p-4 justify-center items-center'>
          {simObjects.map((simObject) => (
            <SimObjectViewer key={simObject.id} {...simObject} onClick={handleObjectClick} />
          ))}
          <MenuClose>
            <SimObjectViewer
              height={controls.spawn.radius * 2}
              id={'noise'}
              path={randomPath}
              width={controls.spawn.radius * 2}
              name='Noise'
              onClick={handleNoiseClick}
            />
          </MenuClose>
          <MenuClose>
            <SimObjectViewer
              height={controls.spawn.radius * 2}
              id={'erase'}
              path=''
              width={controls.spawn.radius * 2}
              name='Erase'
              onClick={handleEraseClick}
            />
          </MenuClose>
          <Modal>
            <ModalTrigger>
              <SimObjectViewer height={7} id={null} path={importPath} width={7} name='Import RLE' />
            </ModalTrigger>
            <ImportModalContent />
          </Modal>
        </div>
      </MenuContent>
    </Menu>
  );
}
