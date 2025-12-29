import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EventEmitter } from '@/lib/event-emitter';
import { defaultSimRules, defaultSimSpawn, type SimRules, type SimSpawn } from '@/lib/simulation';
import { omit } from '@/lib/utils';

export interface Controls {
  paused: boolean;
  rules: SimRules;
  scale: number;
  spawn: SimSpawn & { enabled: boolean };
  speed: number;
  wrap: boolean;
}

export const controlDefaults: Controls = {
  paused: false,
  rules: defaultSimRules,
  scale: 0.3,
  spawn: { ...defaultSimSpawn, enabled: defaultSimSpawn.chance > 0 },
  speed: 1,
  wrap: true,
};

export enum Command {
  /** this needs to remain as a command for now since saving the image requires a ref to the canvas */
  Save,
}

interface Context {
  controls: Controls;
  setControls: Dispatch<SetStateAction<Controls>>;
  controlsRef: RefObject<Controls>;
  commandsRef: RefObject<EventEmitter<Command>>;
}

const Context = createContext<Context | null>(null);

function readLocalStorage() {
  const value = localStorage.getItem('controls');
  if (!value) return null;
  return omit(JSON.parse(value) as Controls, ['paused']);
}

function writeLocalStorage(value: Controls) {
  localStorage.setItem('controls', JSON.stringify(value));
}

export function SimControlsProvider({ children }: { readonly children: ReactNode }) {
  const [controls, setControls] = useState<Controls>({ ...controlDefaults, ...readLocalStorage() });
  const controlsRef = useRef<Controls>(controls);
  const commandsRef = useRef(new EventEmitter<Command>());

  useEffect(() => {
    controlsRef.current = controls;
    writeLocalStorage(controls);
  }, [controls]);

  const contextValue: Context = useMemo(() => ({ controls, setControls, controlsRef, commandsRef }), [controls]);

  return <Context value={contextValue}>{children}</Context>;
}

export function useSimControls() {
  const context = useContext(Context);
  if (context === null) throw new Error('useSimControls must be used underneath a SimControlsProvider');
  return context;
}
