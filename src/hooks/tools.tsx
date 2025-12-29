import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';
import defaultSimObjects from '@/generated/sim-objects.json';
import { SimObject, type SimObjectLike } from '@/lib/sim-object';

export type Tool = (SimObjectLike & { rotation: number }) | { id: 'noise' } | { id: 'erase' };
interface Context {
  simObjects: SimObjectLike[];
  addSimObject: (object: SimObjectLike) => void;
  removeSimObject: (id: string) => void;
  activeTool: Tool;
  setActiveTool: Dispatch<SetStateAction<Tool>>;
  activeToolRef: RefObject<Tool>;
}

const Context = createContext<Context | null>(null);

function readLocalStorage(): SimObjectLike[] | null {
  const value = localStorage.getItem('simObjects');
  if (!value) return null;
  return JSON.parse(value) as SimObjectLike[];
}

function writeLocalStorage(objects: SimObjectLike[]) {
  localStorage.setItem('simObjects', JSON.stringify(objects.map((object) => (object instanceof SimObject ? object.toJSON() : object))));
}

export function ToolProvider({ children }: { children: ReactNode }) {
  const [activeTool, setActiveTool] = useState<Context['activeTool']>({ id: 'noise' });
  const activeToolRef = useRef<Context['activeTool']>(activeTool);
  const [simObjects, setSimObjects] = useState<SimObjectLike[]>(readLocalStorage() ?? [...(defaultSimObjects as SimObjectLike[])]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // biome-ignore format: do not
  const contextValue: Context = useMemo(() => ({
    activeTool,
    activeToolRef,
    setActiveTool,
    simObjects,
    addSimObject(object) {
      const json = object instanceof SimObject ? object.toJSON() : object;
      // with such a small number of items, a map would be less efficient
      const existing = simObjects.find((item) => item.id === json.id);
      if (existing) throw new Error(`duplicate of ${existing.name ?? existing.comment ?? existing.id}`);
      setSimObjects((prev) => {
        const next = [...prev, json];
        writeLocalStorage(next);
        return next;
      });
    },
    removeSimObject(id) {
      setSimObjects((prev) => {
        const next = prev.filter((obj) => obj.id !== id);
        writeLocalStorage(next);
        return next;
      });
    },
  }), [activeTool, simObjects]);

  return <Context value={contextValue}>{children}</Context>;
}

export function useTool() {
  const context = useContext(Context);
  if (context === null) throw new Error('useTool must be used underneath a ToolProvider');
  return context;
}
