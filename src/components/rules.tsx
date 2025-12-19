import { type ChangeEvent, useCallback, useId } from 'react';
import type { Controls } from '@/hooks/controls';

const cells = Array.from({ length: 9 }, (_, i) => i);

function Cell({ number, value, onValueChange }: { number: number; value: Controls['rules']['born']; onValueChange: (value: Controls['rules']['born']) => unknown }) {
  const id = useId();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.checked ? ([...value, number] as Controls['rules']['born']) : value.filter((item) => item !== number)),
    [onValueChange, number, value],
  );

  return (
    <span className='flex gap-2 items-center'>
      <label>{number}</label>
      <input id={id} type='checkbox' onChange={handleChange} checked={value.includes(number as Controls['rules']['born'][number])} />
    </span>
  );
}

function Rule({
  label,
  value,
  onValueChange,
  title,
}: {
  label: string;
  value: Controls['rules']['born'];
  onValueChange: (value: Controls['rules']['born']) => unknown;
  title: string;
}) {
  const id = useId();

  return (
    <span className='input-group' title={title}>
      <label htmlFor={id}>{label}</label>
      <span id={id} className='grid grid-rows-2 grid-cols-5 *:first:row-span-2 gap-x-4 gap-y-2'>
        {cells.map((cell) => (
          <Cell number={cell} onValueChange={onValueChange} value={value} key={cell} />
        ))}
      </span>
    </span>
  );
}

export function Rules({ values, onValueChange }: { values: Controls['rules']; onValueChange: (value: Controls['rules']) => unknown }) {
  const handleBornChange = useCallback((born: Controls['rules']['born']) => onValueChange({ ...values, born }), [onValueChange, values]);

  const handleSurviveChange = useCallback((survive: Controls['rules']['survive']) => onValueChange({ ...values, survive }), [onValueChange, values]);

  return (
    <div className='control-group'>
      <Rule label='Born' onValueChange={handleBornChange} title='Cell is born when this many live neighbours' value={values.born} />
      <Rule label='Survive' onValueChange={handleSurviveChange} title='Cell survives when this many live neighbours' value={values.survive} />
      <pre>{`B${values.born.toSorted().join('')}/S${values.survive.toSorted().join('')}`}</pre>
    </div>
  );
}
