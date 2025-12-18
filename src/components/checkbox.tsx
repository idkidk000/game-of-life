import { type ChangeEvent, useCallback, useId } from 'react';

export function Checkbox({ label, value, onValueChange, title }: { label: string; value: boolean; onValueChange: (value: boolean) => unknown; title: string }) {
  const id = useId();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.checked), [onValueChange]);

  return (
    <span className='input-group' title={title}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type='checkbox' onChange={handleChange} checked={value} />
    </span>
  );
}
