import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EventEmitter } from '@/lib/event-emitter';
import { defaultGameRules, defaultSpawnConfig, type GameRules, type SpawnConfig } from '@/lib/game-of-life';

export interface Controls {
  paused: boolean;
  speed: number;
  scale: number;
  spawn: SpawnConfig & { enabled: boolean };
  rules: GameRules;
}

export const controlDefaults: Controls = {
  paused: false,
  speed: 1,
  scale: 0.5,
  spawn: { ...defaultSpawnConfig, enabled: defaultSpawnConfig.chance > 0 },
  rules: defaultGameRules,
};

export enum Command {
  Step,
  Clear,
  Fill,
  Save,
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
