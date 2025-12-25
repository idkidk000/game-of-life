import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';

export function Button({
  children,
  type = 'button',
  label,
  title,
  ...props
}: {
  children: ReactNode;
  title?: string;
  onClick?: () => unknown;
  disabled?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  className?: string;
  label: string;
  ref?: RefObject<HTMLButtonElement>;
}) {
  return (
    <button type={type} title={title ?? label} {...props}>
      {children}
      <span>{label}</span>
    </button>
  );
}
