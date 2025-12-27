import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';
import { ToolTip } from '@/components/tooltip';

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
    <ToolTip title={title ?? label}>
      <button type={type} {...props}>
        {children}
        <span>{label}</span>
      </button>
    </ToolTip>
  );
}
