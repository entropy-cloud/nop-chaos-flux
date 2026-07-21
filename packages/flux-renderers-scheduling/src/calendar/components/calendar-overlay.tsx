import React, { useRef } from 'react';
import { useFocusTrap } from '../hooks/use-focus-trap.js';

interface CalendarOverlayProps {
  children: React.ReactNode;
  onEscape: () => void;
  onClick: () => void;
  ariaLabel: string;
}

export function CalendarOverlay({ children, onEscape, onClick, ariaLabel }: CalendarOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef, true);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="nop-calendar-overlay"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onEscape();
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
