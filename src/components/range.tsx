import { type ChangeEvent, useCallback, useId } from 'react';

export function Range({
  title,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.1,
  labelDecimals = 1,
}: {
  title: string;
  value: number;
  onValueChange: (value: number) => unknown;
  min?: number;
  max?: number;
  step?: number;
  labelDecimals?: number;
}) {
  const id = useId();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.valueAsNumber), [onValueChange]);

  return (
    <span className='input-group'>
      <label htmlFor={id}>{title}</label>
      <input id={id} type='range' min={min} max={max} step={step} onChange={handleChange} value={value}></input>
      <pre>{value.toFixed(labelDecimals)}x</pre>
    </span>
  );
}
