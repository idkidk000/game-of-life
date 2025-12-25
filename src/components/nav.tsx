import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Menu, MenuClickToClose, MenuContent, MenuTrigger } from '@/components/menu';
import { ObjectViewer } from '@/components/object-viewer';
import { Range } from '@/components/range';
import { Rules } from '@/components/rules';
import { Select } from '@/components/select';
import {
  AddBox,
  Bug,
  Camera,
  Cut,
  LightbulbOn,
  Menu as MenuIcon,
  Monitor,
  Moon,
  Next,
  Pause,
  Play,
  SunAlt,
  Trash,
  Undo,
  UserMinus,
  UserPlus,
  ViewportNarrow,
  ViewportWide,
  Zap,
} from '@/generated/icons';
import { Command, type Controls as ControlsType, controlDefaults, Renderer, useControls } from '@/hooks/controls';
import { useSimObject } from '@/hooks/sim-object';
import { useSimulation } from '@/hooks/simulation';
import { type ThemeColour, ThemePreference, themeColours, useTheme } from '@/hooks/theme';
import { SimPrune } from '@/lib/simulation';
import { objectIsEqual, omit } from '@/lib/utils';

export function Nav() {
  const { setControls, controls, controlsRef, commandsRef } = useControls();
  const { themePreference, setThemePreference, themeColour, setThemeColour } = useTheme();
  const { simulationRef, stepTimesRef } = useSimulation();
  const [fullScreen, setFullScreen] = useState(!!document.fullscreenElement);
  const { simObjects } = useSimObject();

  // states
  const handleBloomClick = useCallback(() => setControls((prev) => ({ ...prev, bloom: !prev.bloom })), [setControls]);

  const handleSpawnEnabledChange = useCallback((enabled: boolean) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, enabled } })), [setControls]);

  const handleScaleChange = useCallback((scale: number) => setControls((prev) => ({ ...prev, scale, paused: false })), [setControls]);

  // biome-ignore format: do not
  const handleSpawnRadiusChange = useCallback(
    (radius: number) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, radius }, paused: false })),
  [setControls] );

  // biome-ignore format: do not
  const handleSpawnChanceChange = useCallback(
    (chance: number) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, chance }, paused: false })),
  [setControls]);

  const handleSpeedChange = useCallback((speed: number) => setControls((prev) => ({ ...prev, speed, paused: false })), [setControls]);

  const handleRulesChange = useCallback((rules: ControlsType['rules']) => setControls((prev) => ({ ...prev, rules })), [setControls]);

  const handlePausedClick = useCallback(() => setControls((prev) => ({ ...prev, paused: !prev.paused })), [setControls]);

  const handleResetClick = useCallback(() => setControls(() => ({ ...controlDefaults })), [setControls]);

  // biome-ignore format: do not
  const handleThemeClick = useCallback(
    () => setThemePreference((prev) =>
      prev === ThemePreference.Auto ? ThemePreference.Dark : prev === ThemePreference.Dark ? ThemePreference.Light : ThemePreference.Auto
  ), [setThemePreference]);

  const handleRendererChange = useCallback((renderer: number) => setControls((prev) => ({ ...prev, renderer })), [setControls]);

  const handleThemeColourChange = useCallback((colour: ThemeColour) => setThemeColour(colour), [setThemeColour]);

  // commands (and also states)

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleClearClick = useCallback(() => {
    simulationRef.current.clear();
    if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handlePruneYoungestClick = useCallback(() => {
    simulationRef.current.prune(SimPrune.Youngest);
    if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handlePruneOldestClick = useCallback(() => {
    simulationRef.current.prune(SimPrune.Oldest);
    if (controlsRef.current.paused) setControls((prev) => ({ ...prev, paused: false }));
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleDumpClick = useCallback(() => {
    console.debug(...simulationRef.current.values().map(([x, y, age, neighbours]) => ({ x, y, age, neighbours })));
    console.debug(simulationRef.current.inspect());
  }, []);

  const handleFullScreenClick = useCallback(() => {
    // these both return promises but fullscreen can be exited outside of pressing the button so state is updated in a document event listener
    if (document.fullscreenElement) document.exitFullscreen();
    else document.body.requestFullscreen().catch((err) => console.error('error requesting full screen', err));
  }, []);

  useEffect(() => {
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
      ['b', handleBloomClick],
      ['d', handleDumpClick],
      ['f', handleFullScreenClick],
      ['o', handlePruneOldestClick],
      ['s', () => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, enabled: !prev.spawn.enabled } }))],
      ['x', handleClearClick],
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

    // biome-ignore format: do not
    document.addEventListener('wheel', (event) => {
      if (event.deltaY < 0) setControls((prev) => ({ ...prev, scale: Math.min(1.0, prev.scale + 0.1) }));
      if (event.deltaY > 0) setControls((prev) => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.1) }));
    }, { signal: controller.signal });

    return () => controller.abort();
  }, [
    handleBloomClick,
    handleClearClick,
    handleDumpClick,
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
      <Menu>
        <MenuTrigger title='Menu' label='Menu'>
          <MenuIcon />
        </MenuTrigger>
        <MenuContent>
          <div className='flex flex-wrap gap-4 p-4 justify-center items-center'>
            <Range
              label='Speed'
              title='Steps per frame'
              min={1}
              max={10}
              step={1}
              decimals={0}
              unit='x'
              value={controls.speed}
              onValueChange={handleSpeedChange}
            />
            <Range label='Scale' title='Simulation scale' min={0.1} max={1} unit='x' value={controls.scale} onValueChange={handleScaleChange} />
            <section className='control-group'>
              <Checkbox label='Spawn' title='Spawn random cells' value={controls.spawn.enabled} onValueChange={handleSpawnEnabledChange} />
              <Range
                label='Chance'
                title='Spawn chance'
                min={0}
                max={10}
                step={0.1}
                decimals={1}
                unit='%'
                value={controls.spawn.chance}
                onValueChange={handleSpawnChanceChange}
                disabled={!controls.spawn.enabled}
              />
              <Range
                label='Radius'
                title='Spawn radius'
                min={3}
                max={15}
                step={1}
                decimals={0}
                unit='px'
                value={controls.spawn.radius}
                onValueChange={handleSpawnRadiusChange}
              />
            </section>
            <Rules onValueChange={handleRulesChange} values={controls.rules} />
            <Select
              label='Colour'
              onValueChange={handleThemeColourChange}
              options={themeColours.map((colour) => ({ key: colour, label: `${colour[0].toLocaleUpperCase()}${colour.slice(1)}` }))}
              title='Select theme colour'
              type='string'
              value={themeColour}
            />
            <Button
              onClick={handleThemeClick}
              title={themePreference === ThemePreference.Dark ? 'Dark' : themePreference === ThemePreference.Light ? 'Light' : 'System'}
              label='Theme'
            >
              {themePreference === ThemePreference.Dark ? <Moon /> : themePreference === ThemePreference.Light ? <SunAlt /> : <Monitor />}
            </Button>
            <Select
              label='Renderer'
              onValueChange={handleRendererChange}
              options={Object.entries(Renderer)
                .map(([key, label]) => ({ key: Number(key), label: String(label) }))
                .filter(({ key }) => !Number.isNaN(key))}
              title='Type of canvas renderer to use'
              type='number'
              value={controls.renderer}
            />
            <Button onClick={handleBloomClick} title='Bloom filter' className={controls.bloom ? 'bg-accent' : ''} label='Bloom'>
              <LightbulbOn />
            </Button>
            <Button onClick={handleDumpClick} title='Dump to console' label='Dump'>
              <Bug />
            </Button>
            <Button
              type='reset'
              onClick={handleResetClick}
              disabled={objectIsEqual(omit(controlDefaults, ['paused']), omit(controls, ['paused']))}
              title='Reset controls'
              label='Reset'
            >
              <Undo />
            </Button>
          </div>
        </MenuContent>
      </Menu>
      <Button
        onClick={handlePausedClick}
        title={controls.paused ? 'Paused' : 'Running'}
        className={controls.paused ? 'animate-pulse' : 'bg-accent'}
        label='Play'
      >
        {controls.paused ? <Pause /> : <Play />}
      </Button>
      <Button onClick={handleStepClick} title='Single step' label='Step'>
        <Next />
      </Button>
      <Button onClick={handleClearClick} title='Clear simulation' label='Clear'>
        <Trash />
      </Button>
      <Button onClick={handleSeedClick} title='Randomise cells' label='Seed'>
        <Zap />
      </Button>
      <Menu clickToClose={MenuClickToClose.Both}>
        <MenuTrigger title='Prune by age' label='Prune'>
          <Cut />
        </MenuTrigger>
        <MenuContent width='auto'>
          <div className='flex flex-row gap-4 p-4 justify-center items-center'>
            <Button title='Prune youngest' onClick={handlePruneYoungestClick} label='Young'>
              <UserMinus />
            </Button>
            <Button title='Prune oldest' onClick={handlePruneOldestClick} label='Old'>
              <UserPlus />
            </Button>
          </div>
        </MenuContent>
      </Menu>
      <Menu clickToClose={MenuClickToClose.Both}>
        <MenuTrigger title='Add object' label='Add'>
          <AddBox />
        </MenuTrigger>
        <MenuContent width='full'>
          <div className='flex flex-wrap gap-4 p-4 justify-center items-center'>
            {simObjects.map((simObject) => (
              <ObjectViewer key={simObject.id} object={simObject} />
            ))}
            <ObjectViewer object={null} />
          </div>
        </MenuContent>
      </Menu>
      <Button title={fullScreen ? 'Minimise' : 'Full screen'} onClick={handleFullScreenClick} className={fullScreen ? 'bg-accent' : undefined} label='Full'>
        {fullScreen ? <ViewportNarrow /> : <ViewportWide />}
      </Button>
      <Button title='Save image' onClick={handleSaveClick} label='Save'>
        <Camera />
      </Button>
    </nav>
  );
}
