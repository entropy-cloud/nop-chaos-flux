import { cn } from '../../lib/utils.js';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('nop-skeleton ','animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
