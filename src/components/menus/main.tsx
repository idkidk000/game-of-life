import { homepage } from '@root/package.json';
import { useCallback } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Menu, MenuContent, MenuTrigger } from '@/components/menu';
import { Range } from '@/components/range';
import { Rules } from '@/components/rules';
import { Github2, Menu as MenuIcon, Undo } from '@/generated/icons';
import { type Controls as ControlsType, controlDefaults, useSimControls } from '@/hooks/sim-controls';
import { objectIsEqual, omit } from '@/lib/utils';
export function MainMenu() {
  const { setControls, controls } = useSimControls();

  const handleSpawnEnabledChange = useCallback((enabled: boolean) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, enabled } })), []);
  const handleScaleChange = useCallback((scale: number) => setControls((prev) => ({ ...prev, scale })), []);
  const handleSpawnRadiusChange = useCallback((radius: number) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, radius } })), []);
  const handleSpawnChanceChange = useCallback((chance: number) => setControls((prev) => ({ ...prev, spawn: { ...prev.spawn, chance } })), []);
  const handleSpeedChange = useCallback((speed: number) => setControls((prev) => ({ ...prev, speed })), []);
  const handleRulesChange = useCallback((rules: ControlsType['rules']) => setControls((prev) => ({ ...prev, rules })), []);
  const handleResetClick = useCallback(() => setControls(() => ({ ...controlDefaults })), []);
  const handleWrapChange = useCallback((wrap: boolean) => setControls((prev) => ({ ...prev, wrap })), []);

  return (
    <Menu>
      <MenuTrigger>
        <Button title='Main menu' label='Menu'>
          <MenuIcon />
        </Button>
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
          <Checkbox label='Wrap' title='Wrap coordinates at edges' value={controls.wrap} onValueChange={handleWrapChange} />
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
          <Button
            type='reset'
            onClick={handleResetClick}
            disabled={objectIsEqual(omit(controlDefaults, ['paused']), omit(controls, ['paused']))}
            title='Reset controls'
            label='Reset'
          >
            <Undo />
          </Button>

          <a className='button text-xs' href={homepage} target='_blank'>
            <Github2 />
            GitHub
          </a>
        </div>
      </MenuContent>
    </Menu>
  );
}
