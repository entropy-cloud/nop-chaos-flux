import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { Button, cn } from '@nop-chaos/ui';

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost';
  size?: 'icon-xs' | 'xs';
  'aria-label'?: string;
  children: ReactNode;
  onPress?: (event: MouseEvent<HTMLButtonElement>) => void;
};

const sizeClasses: Record<string, string> = {
  'icon-xs': 'rounded-md',
  xs: 'gap-1 text-xs',
};

export function ToolbarButton({
  variant = 'ghost',
  size = 'icon-xs',
  className,
  onClick,
  onPress,
  children,
  ...rest
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      nativeButton={false}
      render={<span />}
      variant={variant}
      size={size}
      className={cn(
        'text-muted-foreground',
        sizeClasses[size] ?? sizeClasses['icon-xs'],
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        onPress?.(event);
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
