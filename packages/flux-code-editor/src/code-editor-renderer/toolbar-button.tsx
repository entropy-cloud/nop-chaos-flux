import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@nop-chaos/ui';

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLSpanElement> & {
  variant?: 'ghost';
  size?: 'icon-xs' | 'xs';
  'aria-label'?: string;
  children: ReactNode;
  onPress?: (event: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>) => void;
};

const sizeClasses: Record<string, string> = {
  'icon-xs': 'inline-flex items-center justify-center size-6 rounded-md',
  xs: 'inline-flex items-center justify-center gap-1 h-6 px-2 rounded-md text-xs',
};

export function ToolbarButton({
  variant: _variant,
  size = 'icon-xs',
  className,
  onClick,
  onPress,
  onKeyDown,
  children,
  ...rest
}: ToolbarButtonProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        'cursor-pointer select-none text-muted-foreground hover:text-foreground hover:bg-accent',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        'transition-colors',
        sizeClasses[size] ?? sizeClasses['icon-xs'],
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        onPress?.(event);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress?.(e);
        }
        onKeyDown?.(e);
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
