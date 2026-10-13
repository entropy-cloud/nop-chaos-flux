import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button.js';
import { cn } from '../../lib/utils.js';

interface IconToggleItem<K extends string> {
  key: K;
  Icon: LucideIcon;
  label: string;
}

interface IconToggleControlsProps<K extends string> {
  items: ReadonlyArray<IconToggleItem<K>>;
  onToggle: (key: K) => void;
  getActive?: (key: K) => boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Package-private data-driven primitive behind the toolbar toggle twins
 * (AlignmentControls / TextFormatControls — plan 587 WA-ui-002). Deliberately
 * NOT exported from the toolbar index or the package root: the four toolbar
 * controls have zero consumers outside this directory, so the primitive stays
 * internal (ask-first gate not triggered, plan 587 m1).
 */
function IconToggleControls<K extends string>({
  items,
  onToggle,
  getActive,
  disabled,
  className,
}: IconToggleControlsProps<K>) {
  return (
    <div className={cn('flex items-center', className)}>
      {items.map(({ key, Icon, label }) => {
        const active = getActive?.(key) ?? false;
        return (
          <Button
            key={key}
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            // plan 587 m3: this handwritten pressed treatment is kept verbatim.
            // The ghost variant table already carries `aria-pressed:bg-muted`
            // with higher specificity — suspicion that it shadows this class is
            // unobservable in happy-dom (CSS cascade); swapping to the variant
            // table needs real-browser evidence (registered follow-up).
            className={cn(active && 'bg-accent text-accent-foreground')}
            onClick={() => onToggle(key)}
          >
            <Icon />
          </Button>
        );
      })}
    </div>
  );
}

export { IconToggleControls };

