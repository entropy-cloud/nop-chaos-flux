import type { CSSProperties, ReactNode } from 'react';
import { Button, cn } from '@nop-chaos/ui';

export function DisclosureTrigger(props: {
  expanded: boolean;
  controlsId: string;
  onToggle(): void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { expanded, controlsId, onToggle, className, style, children } = props;

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn('ndbg-entry-trigger active:translate-y-0', className)}
      aria-expanded={expanded}
      aria-controls={controlsId}
      onClick={onToggle}
      style={style}
    >
      {children}
    </Button>
  );
}
