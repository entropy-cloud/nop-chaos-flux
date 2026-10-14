import * as React from 'react';

/**
 * Shared shell for free-position (clientX/Y) context menus: viewport clamping,
 * outside pointerdown close, Escape close, and roving arrow-key focus.
 *
 * CX-16 (plan 596): absorbed verbatim from the three designer context-menu
 * twins (page-designer-context-menu / designer-context-menu / scada editor
 * context-menu). The item selector `[role="menuitem"]:not([disabled])` is
 * intentionally hardcoded here — unification must be structural, not
 * parameterizable (a selector parameter would preserve the drift vector).
 * Consumers keep their own `<div role="menu">` shell, item model, styling,
 * i18n, and testids; they only take `menuRef` + `handleMenuKeyDown`.
 *
 * Not a replacement for Base UI menu primitives (ContextMenu/DropdownMenu):
 * those anchor to a trigger interaction, while this shell positions freely
 * at client coordinates and shields Escape via window capture.
 */

const VIEWPORT_MARGIN = 8;

export function useContextMenuShell(options: {
  position: { x: number; y: number };
  onClose(): void;
}): {
  menuRef: React.RefObject<HTMLDivElement | null>;
  handleMenuKeyDown(event: React.KeyboardEvent): void;
} {
  const { position, onClose } = options;
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    el.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(position.x, window.innerWidth - rect.width - VIEWPORT_MARGIN))}px`;
    el.style.top = `${Math.max(VIEWPORT_MARGIN, Math.min(position.y, window.innerHeight - rect.height - VIEWPORT_MARGIN))}px`;
    const first = el.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
  }, [position.x, position.y]);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onCloseRef.current();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
    if (items.length === 0) {
      return;
    }
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown'
        ? items[(index + 1) % items.length]
        : items[(index - 1 + items.length) % items.length];
    next?.focus();
  };

  return { menuRef, handleMenuKeyDown };
}
