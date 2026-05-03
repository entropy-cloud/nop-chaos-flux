import React from 'react';
import { Button } from '@nop-chaos/ui';
import type { ButtonProps } from '@nop-chaos/ui';

export function WrappedFieldAction(props: ButtonProps) {
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    props.onClick?.(e);
  };

  return (
    <Button
      type="button"
      {...props}
      onClick={handleClick}
    />
  );
}
