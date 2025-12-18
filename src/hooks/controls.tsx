import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface Controls {
  paused: boolean;
  speed: number;
  scale: number;
  random: boolean;
  radius: number;
  // FIXME: idk the correct way to emit events through a context
  step: number;
  reset: number;
  fill: number;
}

interface Context {
  controls: Controls;
  setControls: Dispatch<SetStateAction<Controls>>;
  controlsRef: RefObject<Controls>;
}

const defaults: Controls = {
  paused: false,
  speed: 1,
  scale: 0.5,
  random: true,
  step: 0,
  reset: 0,
  fill: 0,
  radius: 3,
};

const Context = createContext<Context | null>(null);

export function ControlsProvider({ children }: { readonly children: ReactNode }) {
  const [controls, setControls] = useState<Controls>(defaults);
  const controlsRef = useRef<Controls>(controls);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const contextValue: Context = useMemo(() => ({ controls, setControls, controlsRef }), [controls]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export function useControls() {
  const context = useContext(Context);
  if (context === null) throw new Error('useNav must be used underneath a SimStateProvider');
  return context;
}
