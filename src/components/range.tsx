import { type ChangeEvent, useCallback, useId } from 'react';

export function Range({
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.1,
  decimals = 1,
  unit = '',
  title,
}: {
  label: string;
  value: number;
  onValueChange: (value: number) => unknown;
  title: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  unit?: string;
}) {
  const id = useId();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.valueAsNumber), [onValueChange]);

  return (
    <span className='input-group' title={title}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type='range' min={min} max={max} step={step} onChange={handleChange} value={value} />
      <pre>{`${value.toFixed(decimals)}${unit}`}</pre>
    </span>
  );
}
