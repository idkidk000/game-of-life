import { type ChangeEvent, useCallback, useId } from 'react';
import { ToolTip } from '@/hooks/tooltip';

export function Checkbox({ label, value, onValueChange, title }: { label: string; value: boolean; onValueChange: (value: boolean) => unknown; title: string }) {
  const id = useId();

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.checked), [onValueChange]);

  return (
    <ToolTip title={title}>
      <span className='input-group'>
        <label htmlFor={id}>{label}</label>
        <input id={id} type='checkbox' onChange={handleChange} checked={value} />
      </span>
    </ToolTip>
  );
}
