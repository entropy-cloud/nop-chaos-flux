import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '../../lib/utils.js';

function Separator({ className, orientation = 'horizontal', ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        // [G6-R5-视角6-01] explicit bidirectional rules (Base UI emits
        // data-orientation, not a bare data-horizontal attribute).
        'nop-separator ',
        'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
