import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  children,
  type = 'button',
  ...props
}: {
  children: ReactNode;
  title: string;
  onClick: () => unknown;
  disabled?: boolean;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}) {
  return (
    <button type={type} {...props}>
      {children}
    </button>
  );
}
