import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Menu, MenuClose, MenuContent, MenuTrigger } from '@/components/menu';
import { MainMenu } from '@/components/menus/main';
import { SimObjectMenu } from '@/components/menus/sim-object';
import { Camera, Cut, Next, Pause, Play, Trash, UserMinus, UserPlus, ViewportNarrow, ViewportWide, Zap } from '@/generated/icons';
import { Command, useControls } from '@/hooks/controls';
import { useSimulation } from '@/hooks/simulation';
import { SimPrune } from '@/lib/simulation';

export function Nav() {
  const { setControls, controls, controlsRef, commandsRef } = useControls();
  const { simulationRef, stepTimesRef } = useSimulation();
  const [fullScreen, setFullScreen] = useState(!!document.fullscreenElement);

  const handlePausedClick = useCallback(() => setControls((prev) => ({ ...prev, paused: !prev.paused })), [setControls]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleClearClick = useCallback(() => {
    simulationRef.current.clear();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handlePruneYoungestClick = useCallback(() => {
    simulationRef.current.prune(SimPrune.Youngest);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handlePruneOldestClick = useCallback(() => {
    simulationRef.current.prune(SimPrune.Oldest);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleSaveClick = useCallback(() => commandsRef.current.emit(Command.Save), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleSeedClick = useCallback(() => {
    simulationRef.current.seed();
    if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleStepClick = useCallback(() => {
    stepTimesRef.current.push(simulationRef.current.step());
    if (!controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: true }));
  }, []);

  const handleFullScreenClick = useCallback(() => {
    // these both return promises but fullscreen can be exited outside of pressing the button so state is updated in a document event listener
    if (document.fullscreenElement) document.exitFullscreen();
    else document.body.requestFullscreen().catch((err) => console.error('error requesting full screen', err));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  useEffect(() => {
    // biome-ignore format: do not
    const shortcuts = new Map<string, () => unknown>([
      ['enter', handlePausedClick],
      ['-', () => setControls((prev) => ({ ...prev, speed: Math.max(prev.speed - 1, 1) }))],
      ['.', handleStepClick],
      ['*', handleSeedClick],
      ['+', () => setControls((prev) => ({ ...prev, speed: Math.min(prev.speed + 1, 10) }))],
      ['0', () => setControls((prev) => ({ ...prev, scale: 1 }))],
      ['1', () => setControls((prev) => ({ ...prev, scale: 0.1 }))],
      ['2', () => setControls((prev) => ({ ...prev, scale: 0.2 }))],
      ['3', () => setControls((prev) => ({ ...prev, scale: 0.3 }))],
      ['4', () => setControls((prev) => ({ ...prev, scale: 0.4 }))],
      ['5', () => setControls((prev) => ({ ...prev, scale: 0.5 }))],
      ['6', () => setControls((prev) => ({ ...prev, scale: 0.6 }))],
      ['7', () => setControls((prev) => ({ ...prev, scale: 0.7 }))],
      ['8', () => setControls((prev) => ({ ...prev, scale: 0.8 }))],
      ['9', () => setControls((prev) => ({ ...prev, scale: 0.9 }))],
      ['b', () => setControls((prev) => ({ ...prev, bloom: !prev.bloom }))],
      ['c', handleClearClick],
      ['d', () => {
        console.debug(...simulationRef.current.values().map(([x, y, age, neighbours]) => ({ x, y, age, neighbours })));
        console.debug(simulationRef.current.inspect());
      },],
      ['f', handleFullScreenClick],
      ['o', handlePruneOldestClick],
      ['s', () => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, enabled: !prev.spawn.enabled } }))],
      ['y', handlePruneYoungestClick],
    ]);

    const controller = new AbortController();

    // biome-ignore format: do not
    document.addEventListener('keydown', (event) => {
      const shortcut = shortcuts.get(event.key.toLocaleLowerCase());
      if (!shortcut) return;
      event.stopPropagation();
      event.preventDefault();
      console.debug('shortcut', event.key, shortcut);
      shortcut();
    }, { signal: controller.signal });

    document.addEventListener('fullscreenchange', () => setFullScreen(!!document.fullscreenElement), { signal: controller.signal });

    return () => controller.abort();
  }, [
    handleClearClick,
    handlePausedClick,
    handleSeedClick,
    handleStepClick,
    setControls,
    handleFullScreenClick,
    handlePruneOldestClick,
    handlePruneYoungestClick,
  ]);

  return (
    <nav className='flex flex-wrap gap-4 items-center justify-center w-full p-4'>
      <MainMenu />
      <Button
        onClick={handlePausedClick}
        title={controls.paused ? 'Paused' : 'Running'}
        className={controls.paused ? 'animate-pulse' : 'bg-accent'}
        label='Run'
      >
        {controls.paused ? <Pause /> : <Play />}
      </Button>
      <Button onClick={handleStepClick} title='Single step' label='Step'>
        <Next />
      </Button>
      <Button onClick={handleClearClick} title='Clear simulation' label='Del'>
        <Trash />
      </Button>
      <Button onClick={handleSeedClick} title='Randomise cells' label='Seed'>
        <Zap />
      </Button>
      <Menu>
        <MenuTrigger>
          <Button title='Prune by age' label='Cut'>
            <Cut />
          </Button>
        </MenuTrigger>
        <MenuContent width='auto'>
          <div className='flex flex-row gap-4 p-4 justify-center items-center'>
            <MenuClose>
              <Button title='Prune youngest' onClick={handlePruneYoungestClick} label='Young'>
                <UserMinus />
              </Button>
            </MenuClose>
            <MenuClose>
              <Button title='Prune oldest' onClick={handlePruneOldestClick} label='Old'>
                <UserPlus />
              </Button>
            </MenuClose>
          </div>
        </MenuContent>
      </Menu>
      <SimObjectMenu />
      <Button title={fullScreen ? 'Minimise' : 'Full screen'} onClick={handleFullScreenClick} className={fullScreen ? 'bg-accent' : undefined} label='Full'>
        {fullScreen ? <ViewportNarrow /> : <ViewportWide />}
      </Button>
      <Button title='Save image' onClick={handleSaveClick} label='Save'>
        <Camera />
      </Button>
    </nav>
  );
}
