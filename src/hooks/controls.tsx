import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EventEmitter } from '@/lib/event-emitter';
import { defaultSimRules, defaultSimSpawn, type SimRules, type SimSpawn } from '@/lib/simulation';

export enum Renderer {
  Canvas2d,
  Regl,
}
export interface Controls {
  bloom: boolean;
  paused: boolean;
  rules: SimRules;
  scale: number;
  spawn: SimSpawn & { enabled: boolean };
  speed: number;
  renderer: Renderer;
}

export const controlDefaults: Controls = {
  bloom: false,
  paused: false,
  rules: defaultSimRules,
  scale: 0.1,
  spawn: { ...defaultSimSpawn, enabled: defaultSimSpawn.chance > 0 },
  speed: 1,
  renderer: Renderer.Regl,
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

function getStoredValue(): Controls | null {
  const value = localStorage.getItem('controls');
  if (!value) return null;
  return JSON.parse(value) as Controls;
}

export function ControlsProvider({ children }: { readonly children: ReactNode }) {
  const [controls, setControls] = useState<Controls>(getStoredValue() ?? controlDefaults);
  const controlsRef = useRef<Controls>(controls);
  const commandsRef = useRef(new EventEmitter<Command>());

  useEffect(() => {
    controlsRef.current = controls;
    localStorage.setItem('controls', JSON.stringify(controls));
  }, [controls]);

  const contextValue: Context = useMemo(() => ({ controls, setControls, controlsRef, commandsRef }), [controls]);

  return <Context value={contextValue}>{children}</Context>;
}

export function useControls() {
  const context = useContext(Context);
  if (context === null) throw new Error('useControls must be used underneath a ControlsProvider');
  return context;
}
