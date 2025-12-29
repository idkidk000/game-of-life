import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';
import defaultSimObjects from '@/generated/sim-objects.json';
import { SimObject, type SimObjectLike } from '@/lib/sim-object';

interface Context {
  simObjects: SimObjectLike[];
  addSimObject: (object: SimObjectLike) => unknown;
  removeSimObject: (id: string) => unknown;
  activeSimObject: SimObjectLike | null;
  setActiveSimObject: Dispatch<SetStateAction<SimObjectLike | null>>;
  activeSimObjectRef: RefObject<SimObjectLike | null>;
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

export function SimObjectProvider({ children }: { children: ReactNode }) {
  const [activeSimObject, setActiveSimObject] = useState<Context['activeSimObject']>(null);
  const activeSimObjectRef = useRef<Context['activeSimObject']>(null);
  const [simObjects, setSimObjects] = useState<SimObjectLike[]>(readLocalStorage() ?? [...(defaultSimObjects as SimObjectLike[])]);

  useEffect(() => {
    activeSimObjectRef.current = activeSimObject;
  }, [activeSimObject]);

  // biome-ignore format: do not
  const contextValue: Context = useMemo(() => ({
    activeSimObject,
    activeSimObjectRef,
    setActiveSimObject,
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
  }), [activeSimObject, simObjects]);

  return <Context value={contextValue}>{children}</Context>;
}

export function useSimObject() {
  const context = useContext(Context);
  if (context === null) throw new Error('useSimObject must be used underneath a SimObjectProvider');
  return context;
}
