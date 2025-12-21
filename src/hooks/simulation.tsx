import { createContext, type ReactNode, type RefObject, useContext, useEffect, useMemo, useRef } from 'react';
import { Command, useControls } from '@/hooks/controls';
import { SimPrune, type SimRules, Simulation } from '@/lib/simulation';
import { SlidingWindow } from '@/lib/sliding-window';

interface Context {
  simulationRef: RefObject<Simulation>;
  stepTimesRef: RefObject<SlidingWindow<number>>;
}

const Context = createContext<Context | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { controls, commandsRef } = useControls();
  const simulationRef = useRef(new Simulation(10, 10, controls.rules, controls.spawn));
  const stepTimesRef = useRef(new SlidingWindow<number>(100));

  const contextValue: Context = useMemo(() => ({ simulationRef, stepTimesRef }), []);

  //spawn
  useEffect(() => {
    simulationRef.current.updateSpawn({
      ...controls.spawn,
      chance: controls.spawn.enabled ? controls.spawn.chance : 0,
    });
  }, [controls.spawn]);

  // rules
  useEffect(() => {
    simulationRef.current.updateRules(controls.rules as SimRules);
  }, [controls.rules]);

  // command handlers
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    const destructors = [
      commandsRef.current.subscribe(Command.Clear, () => simulationRef.current.clear()),
      commandsRef.current.subscribe(Command.Dump, () => {
        if (!simulationRef.current) return;
        console.debug(...simulationRef.current.values().map(([x, y, age, neighbours]) => ({ x, y, age, neighbours })));
        console.debug(simulationRef.current.inspect());
      }),
      commandsRef.current.subscribe(Command.PruneOldest, () => simulationRef.current.prune(SimPrune.Oldest)),
      commandsRef.current.subscribe(Command.PruneYoungest, () => simulationRef.current.prune(SimPrune.Youngest)),
      commandsRef.current.subscribe(Command.Seed, () => simulationRef.current.seed()),
      commandsRef.current.subscribe(Command.Step, () => {
        stepTimesRef.current.push(simulationRef.current.step());
      }),
    ];
    return () => destructors.forEach((destructor) => void destructor());
  }, []);

  return <Context value={contextValue}>{children}</Context>;
}

export function useSimulation() {
  const context = useContext(Context);
  if (context === null) throw new Error('useSimulation must be used underneath a SimulationProvider');
  return context;
}
