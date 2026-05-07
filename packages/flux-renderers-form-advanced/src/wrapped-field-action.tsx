import React from 'react';

type WrappedFieldActionProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'onClick'> & {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLSpanElement>) => void;
  onPress?: (event: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>) => void;
};

function joinClassNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

function getWrappedFieldActionClasses(
  variant: NonNullable<WrappedFieldActionProps['variant']>,
  size: NonNullable<WrappedFieldActionProps['size']>,
  className?: string,
  disabled?: boolean,
) {
  const baseClass =
    'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border font-medium transition-all outline-none select-none';
  const variantClass =
    variant === 'secondary'
      ? 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'
      : variant === 'outline'
        ? 'border-border bg-background hover:bg-muted hover:text-foreground'
        : variant === 'ghost'
          ? 'border-transparent hover:bg-muted hover:text-foreground'
          : variant === 'destructive'
            ? 'border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20'
            : variant === 'link'
              ? 'border-transparent text-primary underline-offset-4 hover:underline'
              : 'border-transparent bg-primary text-primary-foreground';
  const sizeClass =
    size === 'xs'
      ? 'h-6 px-2 text-xs'
      : size === 'sm'
        ? 'h-7 px-2.5 text-[0.8rem]'
        : size === 'lg'
          ? 'h-9 px-2.5 text-sm'
          : size === 'icon' || size === 'icon-xs' || size === 'icon-sm' || size === 'icon-lg'
            ? 'size-8'
            : 'h-8 px-2.5 text-sm';

  return joinClassNames(
    baseClass,
    variantClass,
    sizeClass,
    disabled && 'pointer-events-none opacity-50',
    className,
  );
}

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
    e: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>,
  ) => {
    onPress?.(e);

    if ('button' in e) {
      onClick?.(e);
      return;
    }

    if (onClick) {
      onClick(e as unknown as React.MouseEvent<HTMLSpanElement>);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    invokePrimaryAction(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
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
    <span
      {...rest}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled ? 'true' : undefined}
      className={getWrappedFieldActionClasses(variant, size, className, disabled)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-slot="button"
    >
      {children}
    </span>
  );
}
