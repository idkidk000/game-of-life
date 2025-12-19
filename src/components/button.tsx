import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  children,
  type = 'button',
  title,
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
}) {
  return (
    <button type={type} title={title} className={`flex flex-row gap-2 ${className}`} {...props}>
      {label ? <span className='hidden lg:inline'>{label}</span> : null}
      {children}
    </button>
  );
}
