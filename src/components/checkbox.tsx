import { type ChangeEvent, useCallback } from 'react';

export function Checkbox({ title, value, onValueChange }: { title: string; value: boolean; onValueChange: (value: boolean) => unknown }) {
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.checked), [onValueChange]);

  return (
    <span className='input-group'>
      <label>{title}</label>
      <input type='checkbox' onChange={handleChange} checked={value}></input>
    </span>
  );
}
