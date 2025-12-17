import { type ChangeEvent, useCallback, useId } from 'react';

export function Checkbox({ title, value, onValueChange }: { title: string; value: boolean; onValueChange: (value: boolean) => unknown }) {
  const id = useId();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.checked), [onValueChange]);

  return (
    <span className='input-group'>
      <label htmlFor={id}>{title}</label>
      <input id={id} type='checkbox' onChange={handleChange} checked={value} />
    </span>
  );
}
