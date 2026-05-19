import React from 'react';
import { Button } from '@nop-chaos/ui';

type WrappedFieldActionProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onPress?: (
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
  ) => void;
};

export function WrappedFieldAction(props: WrappedFieldActionProps) {
  const {
    className,
    variant = 'default',
    size = 'default',
    disabled,
    onClick,
    onPress,
    onKeyDown,
    children,
    ...rest
  } = props;

  const invokePrimaryAction = (
    e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    onPress?.(e);

    if ('button' in e) {
      onClick?.(e);
      return;
    }

    if (onClick) {
      onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    invokePrimaryAction(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);

    if (e.defaultPrevented || disabled) {
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      invokePrimaryAction(e);
    }
  };

  return (
    <Button
      {...rest}
      type={rest.type ?? 'button'}
      disabled={disabled}
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-slot="button"
    >
      {children}
    </Button>
  );
}
