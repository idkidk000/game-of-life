import { Axe, Baby, Bug, Camera, Computer, Flame, MenuIcon, Moon, Pause, PersonStanding, Play, RedoDot, RouteOff, Sparkles, Sun, Trash } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Menu, MenuClickToClose, MenuContent, MenuTrigger } from '@/components/menu';
import { Range } from '@/components/range';
import { Rules } from '@/components/rules';
import { Command, type Controls as ControlsType, controlDefaults, useControls } from '@/hooks/controls';
import { ThemePreference, useTheme } from '@/hooks/theme';
import { objectIsEqual, omit } from '@/lib/utils';

export function Nav() {
  const { setControls, controls, commandsRef } = useControls();
  const { themePreference, setThemePreference } = useTheme();

  // states
  const handleBloomClick = useCallback(() => setControls((prev) => ({ ...prev, bloom: !prev.bloom })), [setControls]);

  const handleSpawnEnabledChange = useCallback((enabled: boolean) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, enabled } })), [setControls]);

  const handleScaleChange = useCallback((scale: number) => setControls((prev) => ({ ...prev, scale, paused: false })), [setControls]);

  const handleSpawnRadiusChange = useCallback(
    (radius: number) =>
      setControls((prev) => ({
        ...prev,
        spawn: { ...prev.spawn, radius },
        paused: false,
      })),
    [setControls]
  );

  const handleSpawnChanceChange = useCallback(
    (chance: number) =>
      setControls((prev) => ({
        ...prev,
        spawn: { ...prev.spawn, chance },
        paused: false,
      })),
    [setControls]
  );

  const handleSpeedChange = useCallback((speed: number) => setControls((prev) => ({ ...prev, speed, paused: false })), [setControls]);

  const handleRulesChange = useCallback((rules: ControlsType['rules']) => setControls((prev) => ({ ...prev, rules })), [setControls]);

  const handlePausedClick = useCallback(() => setControls((prev) => ({ ...prev, paused: !prev.paused })), [setControls]);

  const handleResetClick = useCallback(() => setControls(() => ({ ...controlDefaults })), [setControls]);

  const handleThemeClick = useCallback(
    () =>
      setThemePreference((prev) =>
        prev === ThemePreference.Auto ? ThemePreference.Dark
        : prev === ThemePreference.Dark ? ThemePreference.Light
        : ThemePreference.Auto
      ),
    [setThemePreference]
  );

  // commands (and also states)

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleClearClick = useCallback(() => {
    commandsRef.current.emit(Command.Clear);
    setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handlePruneYoungestClick = useCallback(() => {
    commandsRef.current.emit(Command.PruneYoungest);
    setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handlePruneOldestClick = useCallback(() => {
    commandsRef.current.emit(Command.PruneOldest);
    setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleSaveClick = useCallback(() => commandsRef.current.emit(Command.Save), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleSeedClick = useCallback(() => {
    commandsRef.current.emit(Command.Seed);
    setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleStepClick = useCallback(() => {
    commandsRef.current.emit(Command.Step);
    setControls((prev) => ({ ...prev, paused: true }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleDumpClick = useCallback(() => commandsRef.current.emit(Command.Dump), []);

  return (
    <nav className='flex flex-wrap gap-4 items-center justify-center w-full p-4'>
      <Menu>
        <MenuTrigger title='Menu'>
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
          </div>
        </MenuContent>
      </Menu>
      <Button onClick={handlePausedClick} title={controls.paused ? 'Paused' : 'Running'} className={controls.paused ? undefined : 'bg-accent'}>
        {controls.paused ?
          <Pause />
        : <Play />}
      </Button>
      <Button onClick={handleStepClick} title='Single step'>
        <RedoDot />
      </Button>
      <Button onClick={handleClearClick} title='Clear'>
        <Trash />
      </Button>
      <Button onClick={handleSeedClick} title='Seed'>
        <Sparkles />
      </Button>
      <Menu clickToClose={MenuClickToClose.Both}>
        <MenuTrigger title='Prune'>
          <Axe />
        </MenuTrigger>
        <MenuContent width='auto'>
          <div className='flex flex-row gap-4 p-4'>
            <Button title='Youngest' onClick={handlePruneYoungestClick}>
              <Baby />
            </Button>
            <Button title='Oldest' onClick={handlePruneOldestClick}>
              <PersonStanding />
            </Button>
          </div>
        </MenuContent>
      </Menu>
      <Button onClick={handleDumpClick} title='Dump to console'>
        <Bug />
      </Button>
      <Button
        type='reset'
        onClick={handleResetClick}
        disabled={objectIsEqual(omit(controlDefaults, ['paused']), omit(controls, ['paused']))}
        title='Reset controls'
      >
        <RouteOff />
      </Button>
      <Button onClick={handleBloomClick} title='Bloom filter' className={controls.bloom ? 'bg-accent' : ''}>
        <Flame />
      </Button>
      <Button
        onClick={handleThemeClick}
        title={
          themePreference === ThemePreference.Dark ? 'Dark'
          : themePreference === ThemePreference.Light ?
            'Light'
          : 'System'
        }
      >
        {themePreference === ThemePreference.Dark ?
          <Moon />
        : themePreference === ThemePreference.Light ?
          <Sun />
        : <Computer />}
      </Button>
      <Button title='Save image' onClick={handleSaveClick}>
        <Camera />
      </Button>
    </nav>
  );
}
