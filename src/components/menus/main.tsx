import { useCallback } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Menu, MenuContent, MenuTrigger } from '@/components/menu';
import { Range } from '@/components/range';
import { Rules } from '@/components/rules';
import { Select } from '@/components/select';
import { LightbulbOn, Menu as MenuIcon, Monitor, Moon, SunAlt, Undo } from '@/generated/icons';
import { type Controls as ControlsType, controlDefaults, Renderer, useControls } from '@/hooks/controls';
import { type ThemeColour, ThemePreference, themeColours, useTheme } from '@/hooks/theme';
import { objectIsEqual, omit } from '@/lib/utils';

export function MainMenu() {
  const { setControls, controls } = useControls();
  const { theme, setTheme } = useTheme();

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

  const handleResetClick = useCallback(() => setControls(() => ({ ...controlDefaults })), [setControls]);

  // biome-ignore format: do not
  const handleThemePreferenceClick = useCallback(() => setTheme(({preference,...prev}) => ({
    ...prev,
    preference: preference === ThemePreference.Auto ? ThemePreference.Dark : preference === ThemePreference.Dark ? ThemePreference.Light : ThemePreference.Auto
  })), [setTheme]);

  const handleRendererChange = useCallback((renderer: number) => setControls((prev) => ({ ...prev, renderer })), [setControls]);

  const handleThemeColourChange = useCallback((colour: ThemeColour) => setTheme((prev) => ({ ...prev, colour })), [setTheme]);

  const handleHueChange = useCallback((hue: number) => setTheme((prev) => ({ ...prev, hue })), [setTheme]);

  return (
    <Menu>
      <MenuTrigger>
        <Button title='Menu' label='Menu'>
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
            label='Renderer'
            onValueChange={handleRendererChange}
            options={Object.entries(Renderer)
              .map(([key, label]) => ({ key: Number(key), label: String(label) }))
              .filter(({ key }) => !Number.isNaN(key))}
            title='Type of canvas renderer to use'
            type='number'
            value={controls.renderer}
          />
          <Button
            onClick={handleBloomClick}
            title='Bloom filter'
            className={controls.bloom && controls.renderer === Renderer.Canvas2d ? 'bg-accent' : ''}
            label='Bloom'
            disabled={controls.renderer !== Renderer.Canvas2d}
          >
            <LightbulbOn />
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
          <Select
            label='Colour'
            onValueChange={handleThemeColourChange}
            options={themeColours.map((colour) => ({ key: colour, label: `${colour[0].toLocaleUpperCase()}${colour.slice(1)}` }))}
            title='Select theme colour'
            type='string'
            value={theme.colour}
          />
          <Button
            onClick={handleThemePreferenceClick}
            title={theme.preference === ThemePreference.Dark ? 'Dark' : theme.preference === ThemePreference.Light ? 'Light' : 'System'}
            label='Theme'
          >
            {theme.preference === ThemePreference.Dark ? <Moon /> : theme.preference === ThemePreference.Light ? <SunAlt /> : <Monitor />}
          </Button>
          <Range min={0} max={359} step={0} decimals={0} label='Hue' title='Hue offset' value={theme.hue} unit='°' onValueChange={handleHueChange} />
        </div>
      </MenuContent>
    </Menu>
  );
}
