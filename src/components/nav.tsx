import { Camera, MenuIcon, Pause, Play, RedoDot, RouteOff, Sparkles, Trash } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Menu } from '@/components/menu';
import { Range } from '@/components/range';
import { Rules } from '@/components/rules';
import { Command, type Controls as ControlsType, controlDefaults, useControls } from '@/hooks/controls';
import { objectIsEqual, omit } from '@/lib/utils';

export function Nav() {
  const { setControls, controls, commandsRef } = useControls();
  const [menuOpen, setMenuOpen] = useState(false);

  // states
  const handleSpawnEnabledChange = useCallback((value: boolean) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, enabled: value } })), [setControls]);

  const handleScaleChange = useCallback((value: number) => setControls((prev) => ({ ...prev, scale: value, paused: false })), [setControls]);

  const handleSpawnRadiusChange = useCallback((value: number) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, radius: value }, paused: false })), [setControls]);

  const handleSpawnChanceChange = useCallback((value: number) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, chance: value }, paused: false })), [setControls]);

  const handleSpeedChange = useCallback((value: number) => setControls((prev) => ({ ...prev, speed: value, paused: false })), [setControls]);

  const handleRulesChange = useCallback((rules: ControlsType['rules']) => setControls((prev) => ({ ...prev, rules })), [setControls]);

  const handlePausedClick = useCallback(() => setControls((prev) => ({ ...prev, paused: !prev.paused })), [setControls]);

  const handleResetClick = useCallback(() => setControls((prev) => ({ ...prev, ...controlDefaults })), [setControls]);

  const handleMenuClick = useCallback(() => setMenuOpen((prev) => !prev), []);

  // commands (and also states)

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleClearClick = useCallback(() => {
    commandsRef.current.emit(Command.Clear);
    setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleFillClick = useCallback(() => {
    commandsRef.current.emit(Command.Fill);
    setControls((prev) => ({ ...prev, paused: false }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleSaveClick = useCallback(() => commandsRef.current.emit(Command.Save), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleStepClick = useCallback(() => {
    commandsRef.current.emit(Command.Step);
    setControls((prev) => ({ ...prev, paused: true }));
  }, []);

  return (
    <>
      <div className='flex flex-wrap gap-4 items-center justify-center w-full p-4'>
        <Button onClick={handleMenuClick} title='Menu' className={`me-auto ${menuOpen ? 'bg-accent' : ''}`}>
          <MenuIcon />
        </Button>
        <Button onClick={handlePausedClick} title={controls.paused ? 'Paused' : 'Running'} className={controls.paused ? undefined : 'bg-accent'}>
          {controls.paused ? <Pause /> : <Play />}
        </Button>
        <Button onClick={handleStepClick} title='Single step'>
          <RedoDot />
        </Button>
        <Button onClick={handleClearClick} title='Clear simulation'>
          <Trash />
        </Button>
        <Button onClick={handleFillClick} title='Randomise'>
          <Sparkles />
        </Button>
        <Button
          type='reset'
          onClick={handleResetClick}
          // disabled={JSON.stringify(omit(controlDefaults, ['paused'])) === JSON.stringify(omit(controls, ['paused']))}
          disabled={objectIsEqual(omit(controlDefaults, ['paused']), omit(controls, ['paused']))}
          title='Reset controls'
        >
          <RouteOff />
        </Button>
        <Button title='Save image' onClick={handleSaveClick}>
          <Camera />
        </Button>
      </div>
      <Menu open={menuOpen} setOpen={setMenuOpen}>
        <div className='flex flex-wrap gap-4 p-4 justify-center items-center'>
          <Range label='Speed' title='Steps per frame' min={1} max={10} step={1} decimals={0} unit='x' value={controls.speed} onValueChange={handleSpeedChange} />
          <Range label='Scale' title='Simulation scale' min={0.1} max={1} unit='x' value={controls.scale} onValueChange={handleScaleChange} />
          <div className='control-group'>
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
            <Range label='Radius' title='Spawn radius' min={3} max={15} step={1} decimals={0} unit='px' value={controls.spawn.radius} onValueChange={handleSpawnRadiusChange} />
          </div>
          <Rules onValueChange={handleRulesChange} values={controls.rules} />
        </div>
      </Menu>
    </>
  );
}
