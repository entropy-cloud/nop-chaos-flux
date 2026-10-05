/**
 * 右键上下文菜单（plan 527 Phase 2）：固定定位（client 坐标）、viewport 防溢出
 * 钳制、Escape/外部点击关闭、方向键项间移动。items 由宿主按目标（节点/空白）
 * 与 mode 过滤后传入。
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { t } from '@nop-chaos/flux-i18n';

export interface PageDesignerContextMenuState {
  x: number;
  y: number;
  /** 右键命中的节点 sid；null = 画布空白。 */
  nodeId: string | null;
}

export type PageDesignerContextMenuAction = 'paste' | 'duplicate' | 'delete';

const VIEWPORT_MARGIN = 8;

export function PageDesignerContextMenu(props: {
  menu: PageDesignerContextMenuState;
  hasClipboard: boolean;
  onAction(action: PageDesignerContextMenuAction, nodeId: string | null): void;
  onClose(): void;
}) {
  // items 在组件内构建：onSelect 只调用 props.onAction（宿主回调），避免把
  // 闭包数组在宿主渲染期构建并传递（React Compiler refs 规则约束）。
  const items = props.menu.nodeId
    ? [
        {
          key: 'paste',
          label: t('flux.pageDesigner.pasteHere'),
          disabled: !props.hasClipboard,
          testid: 'page-designer-context-paste',
          action: 'paste' as const,
        },
        {
          key: 'duplicate',
          label: t('flux.pageDesigner.duplicateNode'),
          testid: 'page-designer-context-duplicate',
          action: 'duplicate' as const,
        },
        {
          key: 'delete',
          label: t('flux.pageDesigner.deleteNode'),
          destructive: true,
          testid: 'page-designer-context-delete',
          action: 'delete' as const,
        },
      ]
    : [
        {
          key: 'paste',
          label: t('flux.pageDesigner.pasteHere'),
          disabled: !props.hasClipboard,
          testid: 'page-designer-context-paste',
          action: 'paste' as const,
        },
      ];
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
    el.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(props.menu.x, window.innerWidth - rect.width - VIEWPORT_MARGIN))}px`;
    el.style.top = `${Math.max(VIEWPORT_MARGIN, Math.min(props.menu.y, window.innerHeight - rect.height - VIEWPORT_MARGIN))}px`;
    const first = el.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
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

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('flux.pageDesigner.contextMenuLabel')}
      data-testid="page-designer-context-menu"
      data-context-node={props.menu.nodeId ?? undefined}
      className="fixed z-50 min-w-[168px] rounded-lg border border-border bg-popover/95 p-1 shadow-lg backdrop-blur"
      style={{ left: props.menu.x, top: props.menu.y }}
      onKeyDown={handleMenuKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          data-testid={item.testid}
          disabled={item.disabled}
          className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
            item.destructive
              ? 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10'
              : 'text-foreground'
          }`}
          onClick={() => {
            props.onAction(item.action, props.menu.nodeId);
            props.onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
