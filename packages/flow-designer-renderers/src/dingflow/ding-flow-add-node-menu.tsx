import React from 'react';
import { Button } from '@nop-chaos/ui';

export interface DingFlowMenuItem {
  type: string;
  color: string;
  icon: React.ReactNode;
  label: string;
}

interface DingFlowAddNodeMenuProps {
  screenX: number;
  screenY: number;
  items: DingFlowMenuItem[];
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function DingFlowAddNodeMenu({
  screenX,
  screenY,
  items,
  onSelect,
  onClose,
}: DingFlowAddNodeMenuProps) {
  const firstButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-[100]" aria-hidden="true" onClick={onClose} />
      <div
        className="fixed z-[101] flex gap-4 rounded-lg border border-border bg-popover px-5 py-3 shadow-lg"
        style={{ left: screenX - 100, top: screenY - 110 }}
        role="menu"
        aria-label="Add node"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      >
        {items.map((item, index) => (
          <Button
            key={item.type}
            ref={index === 0 ? firstButtonRef : undefined}
            type="button"
            variant="ghost"
            className="h-auto flex-col gap-1 px-0 py-0"
            role="menuitem"
            aria-label={item.label}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.type);
            }}
          >
            <div
              className="flex items-center justify-center rounded-full text-white"
              style={{ width: 50, height: 50, backgroundColor: item.color }}
            >
              {item.icon}
            </div>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </Button>
        ))}
      </div>
    </>
  );
}
