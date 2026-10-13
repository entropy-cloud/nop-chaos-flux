import * as React from 'react';
import { CopyIcon, ScissorsIcon, ClipboardPasteIcon, Trash2Icon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button.js';
import { cn } from '../../lib/utils.js';

interface ClipboardControlsProps {
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
}

function ClipboardControls({
  onCopy,
  onCut,
  onPaste,
  onClear,
  disabled,
  className,
}: ClipboardControlsProps) {
  // plan 587 WA-ui-002 (m2): the four hand-copied conditional blocks collapse
  // into one data-driven list; a block renders exactly when its handler is
  // defined, byte-identical to the previous per-block JSX.
  const actions: Array<{ label: string; Icon: LucideIcon; handler: (() => void) | undefined }> = [
    { label: 'Copy', Icon: CopyIcon, handler: onCopy },
    { label: 'Cut', Icon: ScissorsIcon, handler: onCut },
    { label: 'Paste', Icon: ClipboardPasteIcon, handler: onPaste },
    { label: 'Clear', Icon: Trash2Icon, handler: onClear },
  ];

  return (
    <div className={cn('flex items-center', className)}>
      {actions.map(({ label, Icon, handler }) =>
        handler !== undefined ? (
          <Button
            key={label}
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            aria-label={label}
            onClick={handler}
          >
            <Icon />
          </Button>
        ) : null,
      )}
    </div>
  );
}

export { ClipboardControls, type ClipboardControlsProps };
