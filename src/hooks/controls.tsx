import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface Controls {
  paused: boolean;
  speed: number;
  scale: number;
  random: boolean;
  radius: number;
}

export const controlDefaults: Controls = {
  paused: false,
  speed: 1,
  scale: 0.5,
  random: true,
  radius: 15,
};

type Command = 'Step' | 'Clear' | 'Fill' | 'Save';

type Callback = () => void;

class CommandEmitter {
  #callbacks = new Map<Command, Set<Callback>>();
  emit(command: Command) {
    for (const callback of this.#callbacks.get(command) ?? []) callback();
  }
  subscribe(command: Command, callback: Callback) {
    if (!this.#callbacks.has(command)) this.#callbacks.set(command, new Set());
    this.#callbacks.get(command)?.add(callback);
    // useEffect destructor
    return () => void this.#callbacks.get(command)?.delete(callback);
  }
}

interface Context {
  controls: Controls;
  setControls: Dispatch<SetStateAction<Controls>>;
  controlsRef: RefObject<Controls>;
  commandsRef: RefObject<CommandEmitter>;
}

const Context = createContext<Context | null>(null);

export function ControlsProvider({ children }: { readonly children: ReactNode }) {
  const [controls, setControls] = useState<Controls>(controlDefaults);
  const controlsRef = useRef<Controls>(controls);
  const commandsRef = useRef(new CommandEmitter());

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
