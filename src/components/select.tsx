import { type ChangeEvent, type MouseEvent, useCallback, useId, useRef } from 'react';

export function Select<Value extends string | number>({
  onValueChange,
  options,
  value,
  type,
  title,
  label,
}: {
  options: { key: Value; label: string }[];
  value: Value;
  onValueChange: (value: Value) => unknown;
  type: Value extends string ? 'string' : Value extends number ? 'number' : never;
  title: string;
  label: string;
}) {
  const id = useId();
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      switch (type) {
        case 'string':
          return onValueChange(event.target.value as Value);
        case 'number':
          return onValueChange(Number(event.target.value) as Value);
        default:
          throw new Error(`unhandled type ${type}`);
      }
    },
    [type, onValueChange]
  );

  const handleSpanClick = useCallback((event: MouseEvent<HTMLSpanElement>) => {
    if (!selectRef.current?.contains(event.target as Node)) selectRef.current?.showPicker();
  }, []);

  // mozilla pls https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::picker
  return (
    <span className='input-group' title={title} onClick={handleSpanClick}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={handleChange} ref={selectRef}>
        {options.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </span>
  );
}
