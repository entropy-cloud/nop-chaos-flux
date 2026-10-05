import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import { DesignerIcon } from '../designer-icon.js';

export interface DesignerContextMenuState {
  x: number;
  y: number;
  nodeId?: string;
}

export interface DesignerContextMenuItem {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  testid?: string;
  onSelect(): void;
}

const VIEWPORT_MARGIN = 8;

/** plan 526 Phase 4：画布右键上下文菜单（节点/空白两态）——viewport 防溢出钳制 +
 * Escape/外部点击关闭 + 方向键在项间移动。固定定位（client 坐标），样式复用
 * fd-edge-actions 浮卡令牌面。 */
export function DesignerContextMenu(props: {
  menu: DesignerContextMenuState;
  items: DesignerContextMenuItem[];
  onClose(): void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(props.onClose);
  useEffect(() => {
    onCloseRef.current = props.onClose;
  }, [props.onClose]);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const clampedX = Math.max(
      VIEWPORT_MARGIN,
      Math.min(props.menu.x, window.innerWidth - rect.width - VIEWPORT_MARGIN),
    );
    const clampedY = Math.max(
      VIEWPORT_MARGIN,
      Math.min(props.menu.y, window.innerHeight - rect.height - VIEWPORT_MARGIN),
    );
    el.style.left = `${clampedX}px`;
    el.style.top = `${clampedY}px`;
    el.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    // 依赖 menu 坐标：每次打开位置不同都需要重新钳制
  }, [props.menu.x, props.menu.y]);

  useEffect(() => {
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
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
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

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('flux.flowDesigner.contextMenuLabel')}
      data-testid="designer-context-menu"
      data-context-node={props.menu.nodeId ?? undefined}
      className="fd-edge-actions fixed z-50 min-w-[176px] rounded-[10px] border border-border p-1 shadow-lg"
      style={{ left: props.menu.x, top: props.menu.y }}
      onKeyDown={handleMenuKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {props.items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          data-testid={item.testid}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
            item.destructive && 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10',
          )}
          onClick={() => {
            item.onSelect();
            props.onClose();
          }}
        >
          {item.icon && <DesignerIcon icon={item.icon} size={14} />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
