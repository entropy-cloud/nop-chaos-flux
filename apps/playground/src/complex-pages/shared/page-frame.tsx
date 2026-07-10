import type { ReactNode } from 'react';
import { Card, cn } from '@nop-chaos/ui';

interface PageFrameProps {
  children: ReactNode;
  className?: string;
  testid?: string;
}

/** Card container that wraps a schema-rendered complex page. */
export function PageFrame({ children, className, testid }: PageFrameProps) {
  return (
    <Card data-testid={testid} className={cn('p-4', className)}>
      {children}
    </Card>
  );
}
