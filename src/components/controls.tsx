import { Camera, Dices, Pause, Play, RouteOff, StepForward, Trash } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Range } from '@/components/range';
import { controlDefaults, useControls } from '@/hooks/controls';

export function Controls() {
  const { setControls, controls, commandsRef } = useControls();

  // events
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleClearClick = useCallback(() => commandsRef.current.emit('Clear'), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleFillClick = useCallback(() => commandsRef.current.emit('Fill'), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleSaveClick = useCallback(() => commandsRef.current.emit('Save'), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref object
  const handleStepClick = useCallback(() => commandsRef.current.emit('Step'), []);

  // state
  const handlePausedClick = useCallback(() => setControls((prev) => ({ ...prev, paused: !prev.paused })), [setControls]);

  const handleRandomChange = useCallback((value: boolean) => setControls((prev) => ({ ...prev, random: value })), [setControls]);

  const handleResetClick = useCallback(() => setControls((prev) => ({ ...prev, ...controlDefaults })), [setControls]);

  const handleScaleChange = useCallback((value: number) => setControls((prev) => ({ ...prev, scale: value, paused: false })), [setControls]);

  const handleSpeedChange = useCallback((value: number) => setControls((prev) => ({ ...prev, speed: value, paused: false })), [setControls]);

  return (
    <div className='flex flex-wrap gap-4 m-4 items-center'>
      <Button onClick={handlePausedClick} title={controls.paused ? 'Paused' : 'Running'}>
        {controls.paused ? <Pause /> : <Play />}
      </Button>
      <Button onClick={handleStepClick} title='Single step'>
        <StepForward />
      </Button>
      <Range label='Speed' title='Steps per frame' min={1} max={10} step={1} decimals={0} unit='x' value={controls.speed} onValueChange={handleSpeedChange} />
      <Range label='Scale' title='Simulation scale' min={0.1} max={1} unit='x' value={controls.scale} onValueChange={handleScaleChange} />
      <Checkbox label='Random' title='Spawn random cells' value={controls.random} onValueChange={handleRandomChange} />
      <Button onClick={handleClearClick} title='Clear simulation'>
        <Trash />
      </Button>
      <Button onClick={handleFillClick} title='Randomise'>
        <Dices />
      </Button>
      <Button type='reset' onClick={handleResetClick} disabled={JSON.stringify(controlDefaults) === JSON.stringify(controls)} title='Reset controls'>
        <RouteOff />
      </Button>
      <Button title='Save image' onClick={handleSaveClick}>
        {' '}
        <Camera />{' '}
      </Button>
    </div>
  );
}
