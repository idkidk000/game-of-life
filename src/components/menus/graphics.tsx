import { useCallback } from 'react';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Menu, MenuContent, MenuTrigger } from '@/components/menu';
import { Range } from '@/components/range';
import { Select } from '@/components/select';
import { Sliders, Undo } from '@/generated/icons';
import { defaultControls, useRenderControls } from '@/hooks/render-controls';
import { defaultTheme, type ThemeColour, ThemePreference, themeColours, useTheme } from '@/hooks/theme';
import { enumValues, type Obj, objectIsEqual } from '@/lib/utils';

export function GraphicsMenu() {
  const { controls, setControls } = useRenderControls();
  const { theme, setTheme } = useTheme();

  // sim controls provider
  const handleBloomChange = useCallback((bloom: boolean) => setControls((prev) => ({ ...prev, bloom })), [setControls]);
  const handleRadiusChange = useCallback((blurRadius: number) => setControls((prev) => ({ ...prev, blurRadius })), [setControls]);
  const handleStepChange = useCallback((blurStep: number) => setControls((prev) => ({ ...prev, blurStep })), [setControls]);
  const handleColourChange = useCallback((colourMix: number) => setControls((prev) => ({ ...prev, colourMix })), [setControls]);
  const handleBlur0Change = useCallback((blur0Mix: number) => setControls((prev) => ({ ...prev, blur0Mix })), [setControls]);
  const handleBlur1Change = useCallback((blur1Mix: number) => setControls((prev) => ({ ...prev, blur1Mix })), [setControls]);
  const handleBlur2Change = useCallback((blur2Mix: number) => setControls((prev) => ({ ...prev, blur2Mix })), [setControls]);
  const handleBackgroundChange = useCallback((background: boolean) => setControls((prev) => ({ ...prev, background })), [setControls]);
  const handleRenderResetClick = useCallback(() => setControls(defaultControls), [setControls]);

  // theme provider
  const handleThemeColourChange = useCallback((colour: ThemeColour) => setTheme((prev) => ({ ...prev, colour })), [setTheme]);
  const handleHueChange = useCallback((hue: number) => setTheme((prev) => ({ ...prev, hue })), [setTheme]);
  const handleThemePreferenceChange = useCallback((preference: ThemePreference) => setTheme((prev) => ({ ...prev, preference })), [setTheme]);
  const handleThemeResetClick = useCallback(() => setTheme(defaultTheme), [setTheme]);

  return (
    <Menu>
      <MenuTrigger>
        <Button title='Graphics settings' label='GFX'>
          <Sliders />
        </Button>
      </MenuTrigger>
      <MenuContent>
        <div className='flex flex-wrap gap-4 p-4'>
          <div className='control-group w-full'>
            <Checkbox label='Bloom' title='Bloom effect' onValueChange={handleBloomChange} value={controls.bloom} />
            <Range
              label='Radius'
              title='Blur radius'
              onValueChange={handleRadiusChange}
              value={controls.blurRadius}
              decimals={0}
              min={0}
              max={16}
              step={1}
              unit='x'
              disabled={!controls.bloom}
            />
            <Range
              label='Step'
              title='Blur step'
              onValueChange={handleStepChange}
              value={controls.blurStep}
              decimals={0}
              min={1}
              max={64}
              step={1}
              unit='px'
              disabled={!controls.bloom}
            />
            <Range
              label='Colour'
              title='Colour mix'
              onValueChange={handleColourChange}
              value={controls.colourMix}
              decimals={0}
              min={0}
              max={100}
              step={1}
              unit='%'
              disabled={!controls.bloom}
            />
            <Range
              label='Blur0'
              title='Blur0 mix'
              onValueChange={handleBlur0Change}
              value={controls.blur0Mix}
              decimals={0}
              min={0}
              max={100}
              step={1}
              unit='%'
              disabled={!controls.bloom}
            />
            <Range
              label='Blur1'
              title='Blur1 mix'
              onValueChange={handleBlur1Change}
              value={controls.blur1Mix}
              decimals={0}
              min={0}
              max={100}
              step={1}
              unit='%'
              disabled={!controls.bloom}
            />
            <Range
              label='Blur2'
              title='Blur2 mix'
              onValueChange={handleBlur2Change}
              value={controls.blur2Mix}
              decimals={0}
              min={0}
              max={100}
              step={1}
              unit='%'
              disabled={!controls.bloom}
            />
            <Checkbox
              label='Background'
              title='Render opaque background'
              onValueChange={handleBackgroundChange}
              value={controls.background}
              disabled={!controls.bloom}
            />
            <Button
              type='reset'
              onClick={handleRenderResetClick}
              disabled={objectIsEqual(defaultControls as unknown as Obj, controls as unknown as Obj)}
              title='Reset controls'
              label='Reset'
            >
              <Undo />
            </Button>
          </div>
          <div className='control-group w-full'>
            <Select
              label='Colour'
              onValueChange={handleThemeColourChange}
              options={themeColours.map((colour) => ({ key: colour, label: `${colour[0].toLocaleUpperCase()}${colour.slice(1)}` }))}
              title='Select theme colour'
              type='string'
              value={theme.colour}
            />
            <Select
              label='Scheme'
              title='Colour scheme preference'
              value={theme.preference}
              onValueChange={handleThemePreferenceChange}
              type='number'
              options={enumValues(ThemePreference).map(([label, key]) => ({ key, label }))}
            ></Select>
            <Range min={0} max={359} step={0} decimals={0} label='Hue' title='Hue offset' value={theme.hue} unit='°' onValueChange={handleHueChange} />
            <Button
              type='reset'
              onClick={handleThemeResetClick}
              disabled={objectIsEqual(defaultTheme as unknown as Obj, theme as unknown as Obj)}
              title='Reset controls'
              label='Reset'
            >
              <Undo />
            </Button>
          </div>
        </div>
      </MenuContent>
    </Menu>
  );
}
