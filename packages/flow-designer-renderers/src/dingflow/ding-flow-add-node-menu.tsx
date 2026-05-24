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
  const firstButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const nextIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));
    setActiveIndex(nextIndex);
  }, [activeIndex, items.length]);

  function focusItem(nextIndex: number) {
    const normalizedIndex = ((nextIndex % items.length) + items.length) % items.length;
    setActiveIndex(normalizedIndex);
    itemRefs.current[normalizedIndex]?.focus();
  }

  function closeMenu() {
    onClose();
    returnFocusRef?.current?.focus();
  }

  return (
    <>
      <div className="fixed inset-0 z-[100]" aria-hidden="true" onClick={closeMenu} />
      <div
        className="fixed z-[101] flex gap-4 rounded-lg border border-border bg-popover px-5 py-3 shadow-lg"
        style={{ left: screenX - 100, top: screenY - 110 }}
        role="menu"
        aria-label="Add node"
        onKeyDown={(event) => {
          if (items.length > 0 && event.key === 'ArrowRight') {
            event.preventDefault();
            focusItem(activeIndex + 1);
            return;
          }

          if (items.length > 0 && event.key === 'ArrowLeft') {
            event.preventDefault();
            focusItem(activeIndex - 1);
            return;
          }

          if (items.length > 0 && event.key === 'Home') {
            event.preventDefault();
            focusItem(0);
            return;
          }

          if (items.length > 0 && event.key === 'End') {
            event.preventDefault();
            focusItem(items.length - 1);
            return;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
          }
        }}
      >
        {items.map((item, index) => (
          <Button
            key={item.type}
            ref={(node) => {
              itemRefs.current[index] = node;
              if (index === 0) {
                firstButtonRef.current = node;
              }
            }}
            type="button"
            variant="ghost"
            className="h-auto flex-col gap-1 px-0 py-0"
            role="menuitem"
            aria-label={item.label}
            tabIndex={index === activeIndex ? 0 : -1}
            onFocus={() => setActiveIndex(index)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.type);
              returnFocusRef?.current?.focus();
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
