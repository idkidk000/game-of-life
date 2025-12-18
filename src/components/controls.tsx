import { useCallback } from 'react';
import { Checkbox } from '@/components/checkbox';
import { Range } from '@/components/range';
import { useControls } from '@/hooks/controls';

export function Controls() {
  const { setControls, controls } = useControls();

  const handlePausedClick = useCallback(() => setControls((prev) => ({ ...prev, paused: !prev.paused })), [setControls]);

  const handleStepClick = useCallback(() => setControls((prev) => ({ ...prev, step: Math.random() })), [setControls]);

  const handleSpeedChange = useCallback((value: number) => setControls((prev) => ({ ...prev, speed: value })), [setControls]);

  const handleScaleChange = useCallback((value: number) => setControls((prev) => ({ ...prev, scale: value })), [setControls]);

  const handleRadiusChange = useCallback((value: number) => setControls((prev) => ({ ...prev, radius: value })), [setControls]);

  const handleRandomChange = useCallback((value: boolean) => setControls((prev) => ({ ...prev, random: value })), [setControls]);

  const handleResetClick = useCallback(() => setControls((prev) => ({ ...prev, reset: Math.random() })), [setControls]);

  const handleFillClick = useCallback(() => setControls((prev) => ({ ...prev, fill: Math.random() })), [setControls]);

  return (
    <div className='flex flex-wrap gap-4 m-4 items-center'>
      <button type='button' onClick={handlePausedClick} className='min-w-[calc(7ch+3em)]'>
        {controls.paused ? 'Paused' : 'Running'}
      </button>
      <Range title='Speed' min={1} max={10} step={1} decimals={0} unit='x' value={controls.speed} onValueChange={handleSpeedChange} />
      <Range title='Scale' min={0.1} max={1} unit='x' value={controls.scale} onValueChange={handleScaleChange} />
      <Range title='Radius' min={3} max={15} step={1} decimals={0} unit='px' value={controls.radius} onValueChange={handleRadiusChange} />
      <Checkbox title='Random' value={controls.random} onValueChange={handleRandomChange} />
      <button type='button' disabled={!controls.paused} onClick={handleStepClick}>
        Step
      </button>
      <button type='button' onClick={handleResetClick}>
        Reset
      </button>
      <button type='button' onClick={handleFillClick}>
        Fill
      </button>
    </div>
  );
}
