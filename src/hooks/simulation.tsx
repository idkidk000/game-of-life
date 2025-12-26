import { createContext, type ReactNode, type RefObject, useContext, useEffect, useMemo, useRef } from 'react';
import { useControls } from '@/hooks/controls';
import { type SimRules, Simulation } from '@/lib/simulation';
import { SlidingWindow } from '@/lib/sliding-window';

interface Context {
  simulationRef: RefObject<Simulation>;
  stepTimesRef: RefObject<SlidingWindow<number>>;
}

const Context = createContext<Context | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { controls } = useControls();
  const simulationRef = useRef(new Simulation(10, 10, controls.rules, controls.spawn, controls.wrap));
  const stepTimesRef = useRef(new SlidingWindow<number>(100));

  const contextValue: Context = useMemo(() => ({ simulationRef, stepTimesRef }), []);

  // spawn
  useEffect(() => {
    simulationRef.current.spawn = { ...controls.spawn, chance: controls.spawn.enabled ? controls.spawn.chance : 0 };
  }, [controls.spawn]);

  // rules
  useEffect(() => {
    simulationRef.current.rules = controls.rules as SimRules;
  }, [controls.rules]);

  useEffect(() => {
    simulationRef.current.wrap = controls.wrap;
  }, [controls.wrap]);

  return <Context value={contextValue}>{children}</Context>;
}

export function useSimulation() {
  const context = useContext(Context);
  if (context === null) throw new Error('useSimulation must be used underneath a SimulationProvider');
  return context;
}
