import { type ChangeEvent, useCallback, useId } from 'react';
import { Button } from '@/components/button';
import { Dice } from '@/generated/icons';
import type { SimRule, SimRules } from '@/lib/simulation';

const cells = Array.from({ length: 9 }, (_, i) => i);

function randomise(): SimRule {
  const count = 1 + Math.round(Math.random() * 2);
  const set = new Set<number>();
  while (set.size < count) set.add(1 + Math.round(Math.random() * 7));
  return [...set].toSorted() as SimRule;
}

function Cell({ number, value, onValueChange }: { number: number; value: SimRule; onValueChange: (value: SimRule) => unknown }) {
  const id = useId();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onValueChange(event.target.checked ? ([...value, number] as SimRule) : value.filter((item) => item !== number)),
    [onValueChange, number, value]
  );

  return (
    <span className='flex gap-2 items-center'>
      <label htmlFor={id}>{number}</label>
      <input id={id} type='checkbox' onChange={handleChange} checked={value.includes(number as SimRule[number])} />
    </span>
  );
}

function Rule({ label, value, onValueChange, title }: { label: string; value: SimRule; onValueChange: (value: SimRule) => unknown; title: string }) {
  const id = useId();

  return (
    <section className='input-group' title={title}>
      <label htmlFor={id}>{label}</label>
      <span id={id} className='grid grid-rows-2 grid-cols-5 *:first:row-span-2 gap-x-4 gap-y-2'>
        {cells.map((cell) => (
          <Cell number={cell} onValueChange={onValueChange} value={value} key={cell} />
        ))}
      </span>
    </section>
  );
}

export function Rules({ values, onValueChange }: { values: SimRules; onValueChange: (value: SimRules) => unknown }) {
  const handleBornChange = useCallback((born: SimRule) => onValueChange({ ...values, born }), [onValueChange, values]);

  const handleSurviveChange = useCallback((survive: SimRule) => onValueChange({ ...values, survive }), [onValueChange, values]);

  const handleRandomiseClick = useCallback(() => {
    onValueChange({ born: randomise(), survive: randomise() });
  }, [onValueChange]);

  return (
    <div className='control-group'>
      <Rule label='Born' onValueChange={handleBornChange} title='Cell is born when this many live neighbours' value={values.born} />
      <Rule label='Survive' onValueChange={handleSurviveChange} title='Cell survives when this many live neighbours' value={values.survive} />
      <span>{`B${values.born.toSorted().join('')}/S${values.survive.toSorted().join('')}`}</span>
      <Button title='Randomise' onClick={handleRandomiseClick} label='Rand'>
        <Dice />
      </Button>
    </div>
  );
}
