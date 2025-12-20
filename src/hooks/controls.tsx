import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EventEmitter } from '@/lib/event-emitter';
import { defaultSimRules, defaultSimSpawn, type SimRules, type SimSpawn } from '@/lib/simulation';

export interface Controls {
  bloom: boolean;
  paused: boolean;
  rules: SimRules;
  scale: number;
  spawn: SimSpawn & { enabled: boolean };
  speed: number;
}

export const controlDefaults: Controls = {
  bloom: true,
  paused: false,
  rules: defaultSimRules,
  scale: 0.3,
  spawn: { ...defaultSimSpawn, enabled: defaultSimSpawn.chance > 0 },
  speed: 1,
};

export enum Command {
  Clear,
  PruneYoungest,
  PruneOldest,
  Save,
  Seed,
  Step,
  Dump,
}

interface Context {
  controls: Controls;
  setControls: Dispatch<SetStateAction<Controls>>;
  controlsRef: RefObject<Controls>;
  commandsRef: RefObject<EventEmitter<Command>>;
}

const Context = createContext<Context | null>(null);

export function ControlsProvider({ children }: { readonly children: ReactNode }) {
  const [controls, setControls] = useState<Controls>(controlDefaults);
  const controlsRef = useRef<Controls>(controls);
  const commandsRef = useRef(new EventEmitter<Command>());

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const contextValue: Context = useMemo(() => ({ controls, setControls, controlsRef, commandsRef }), [controls]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export function useControls() {
  const context = useContext(Context);
  if (context === null) throw new Error('useControls must be used underneath a ControlsProvider');
  return context;
}
