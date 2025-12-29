import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface Controls {
  blurRadius: number;
  blurStep: number;
  /** percent */
  colourMix: number;
  /** percent */
  blur0Mix: number;
  /** percent */
  blur1Mix: number;
  /** percent */
  blur2Mix: number;
  background: boolean;
  /** temporal additive blur actually but that's a bit verbose */
  bloom: boolean;
  blurFalloff: number;
}

export const defaultControls: Controls = {
  blurRadius: 5,
  blurStep: 2,
  colourMix: 75,
  blur0Mix: 70,
  blur1Mix: 100,
  blur2Mix: 50,
  background: true,
  bloom: true,
  blurFalloff: 3,
};

interface Context {
  controls: Controls;
  setControls: Dispatch<SetStateAction<Controls>>;
  controlsRef: RefObject<Controls>;
}

const Context = createContext<Context | null>(null);

function readLocalStorage(): Controls | null {
  const value = localStorage.getItem('render');
  if (!value) return null;
  return JSON.parse(value) as Controls;
}

function writeLocalStorage(value: Controls) {
  localStorage.setItem('render', JSON.stringify(value));
}

export function RenderControlsProvider({ children }: { children: ReactNode }) {
  const [controls, setControls] = useState<Controls>({ ...defaultControls, ...readLocalStorage() });
  const controlsRef = useRef<Controls>(controls);

  useEffect(() => {
    controlsRef.current = controls;
    writeLocalStorage(controls);
  }, [controls]);

  const value: Context = useMemo(() => ({ controls, setControls, controlsRef }), [controls]);

  return <Context value={value}>{children}</Context>;
}

export function useRenderControls() {
  const context = useContext(Context);
  if (context === null) throw new Error('useRenderControls must be used undernath a RenderControlsProvider');
  return context;
}
