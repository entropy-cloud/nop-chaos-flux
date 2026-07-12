import { cn } from '../../lib/utils.js';

function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<'div'> & { ratio: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      style={
        {
          '--ratio': ratio,
        } as React.CSSProperties
      }
      className={cn('nop-aspect-ratio ','relative aspect-(--ratio)', className)}
      {...props}
    />
  );
}

export { AspectRatio };
