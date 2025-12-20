import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';

export function Button({
  children,
  type = 'button',
  className = '',
  label,
  ...props
}: {
  children: ReactNode;
  title: string;
  onClick: () => unknown;
  disabled?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  className?: string;
  label?: string;
  ref?: RefObject<HTMLButtonElement>;
}) {
  return (
    <button type={type} className={`flex flex-row gap-2 ${className}`} {...props}>
      {label ?
        <span className='hidden lg:inline'>{label}</span>
      : null}
      {children}
    </button>
  );
}
