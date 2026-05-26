import React from 'react';
import { DropdownMenu, DropdownMenuItem, DropdownMenuPortal, DropdownMenuPopup, DropdownMenuPositioner, cn } from '@nop-chaos/ui';

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
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function DingFlowAddNodeMenu({
  screenX,
  screenY,
  items,
  onSelect,
  onClose,
  returnFocusRef,
}: DingFlowAddNodeMenuProps) {
  const firstItemRef = React.useRef<HTMLDivElement | null>(null);
  const focusTimeoutRef = React.useRef<number | null>(null);
  const anchor = React.useMemo(
    () => ({
      getBoundingClientRect: () =>
        DOMRect.fromRect({
          x: screenX,
          y: screenY,
          width: 0,
          height: 0,
        }),
    }),
    [screenX, screenY],
  );

  React.useEffect(() => {
    focusTimeoutRef.current = window.setTimeout(() => {
      firstItemRef.current?.focus();
    }, 0);

    return () => {
      if (focusTimeoutRef.current !== null) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  function closeMenu() {
    onClose();
    window.setTimeout(() => {
      returnFocusRef?.current?.focus();
    }, 0);
  }

  return (
    <DropdownMenu
      modal={false}
      open
      orientation="horizontal"
      onOpenChange={(open) => {
        if (!open) {
          closeMenu();
        }
      }}
    >
      <DropdownMenuPortal>
        <DropdownMenuPositioner
          anchor={anchor}
          positionMethod="fixed"
          side="top"
          sideOffset={110}
          align="center"
          alignOffset={100}
          collisionAvoidance={{ side: 'none', align: 'none', fallbackAxisSide: 'none' }}
        >
          <DropdownMenuPopup
            aria-label="Add node"
            finalFocus={returnFocusRef}
            className="z-[101] flex gap-4 rounded-lg border border-border bg-popover px-5 py-3 shadow-lg outline-none"
          >
            {items.map((item) => (
              <DropdownMenuItem
                key={item.type}
                ref={item === items[0] ? firstItemRef : undefined}
                closeOnClick={false}
                aria-label={item.label}
                className={cn(
                  'flex cursor-default flex-col items-center gap-1 rounded-md px-0 py-0 outline-none select-none',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                )}
                onClick={() => {
                  onSelect(item.type);
                  closeMenu();
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full text-white"
                  style={{ width: 50, height: 50, backgroundColor: item.color }}
                >
                  {item.icon}
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuPopup>
        </DropdownMenuPositioner>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
