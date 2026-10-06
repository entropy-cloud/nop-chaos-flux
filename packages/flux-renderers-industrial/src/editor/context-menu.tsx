/**
 * 右键上下文菜单（plan 532 S3 Phase 1）：`page-designer-context-menu`（527）同款移植——
 * 固定定位（client 坐标）、viewport 防溢出钳制、Escape/外部点击关闭、方向键项间移动 + Enter 触发。
 * items 由组件内构建（React Compiler refs 规则约束），宿主按目标（图元/空白）传入态别。
 * 挂载点须为 canvas 键盘层容器（data-slot=scada-editor-canvas div）的兄弟（scada-editor-canvas-wrap 内），
 * 规避容器 onKeyDown nudge 对菜单方向键导航的冒泡污染（组件内部 window capture 已 stopPropagation Escape）。
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';

export interface ScadaEditorContextMenuState {
  x: number;
  y: number;
  /** 右键命中的图元 id；null = 画布空白。 */
  nodeId: string | null;
}

export type ScadaEditorContextMenuAction =
  | 'duplicate'
  | 'delete'
  | 'toTop'
  | 'moveUp'
  | 'moveDown'
  | 'toBottom'
  | 'paste'
  | 'selectAll'
  | 'fitCanvas';

const VIEWPORT_MARGIN = 8;

export function ScadaEditorContextMenu(props: {
  menu: ScadaEditorContextMenuState;
  hasClipboard: boolean;
  hasSymbols: boolean;
  onAction(action: ScadaEditorContextMenuAction, nodeId: string | null): void;
  onClose(): void;
}) {
  const { t } = useFluxTranslation();
  // items 在组件内构建：onSelect 只调用 props.onAction（宿主回调），避免把
  // 闭包数组在宿主渲染期构建并传递（React Compiler refs 规则约束，527 同款）。
  const items = props.menu.nodeId
    ? [
        {
          key: 'duplicate',
          label: t('industrial.scada.editor.menu.duplicate'),
          testid: 'scada-editor-context-duplicate',
          disabled: false,
          destructive: false,
          action: 'duplicate' as const,
        },
        {
          key: 'delete',
          label: t('industrial.scada.editor.menu.delete'),
          testid: 'scada-editor-context-delete',
          disabled: false,
          destructive: true,
          action: 'delete' as const,
        },
        {
          key: 'toTop',
          label: t('industrial.scada.editor.menu.toTop'),
          testid: 'scada-editor-context-totop',
          disabled: false,
          destructive: false,
          action: 'toTop' as const,
        },
        {
          key: 'moveUp',
          label: t('industrial.scada.editor.menu.moveUp'),
          testid: 'scada-editor-context-moveup',
          disabled: false,
          destructive: false,
          action: 'moveUp' as const,
        },
        {
          key: 'moveDown',
          label: t('industrial.scada.editor.menu.moveDown'),
          testid: 'scada-editor-context-movedown',
          disabled: false,
          destructive: false,
          action: 'moveDown' as const,
        },
        {
          key: 'toBottom',
          label: t('industrial.scada.editor.menu.toBottom'),
          testid: 'scada-editor-context-tobottom',
          disabled: false,
          destructive: false,
          action: 'toBottom' as const,
        },
        {
          key: 'paste',
          label: t('industrial.scada.editor.menu.paste'),
          testid: 'scada-editor-context-paste',
          disabled: !props.hasClipboard,
          destructive: false,
          action: 'paste' as const,
        },
      ]
    : [
        {
          key: 'paste',
          label: t('industrial.scada.editor.menu.paste'),
          testid: 'scada-editor-context-paste',
          disabled: !props.hasClipboard,
          destructive: false,
          action: 'paste' as const,
        },
        {
          key: 'selectAll',
          label: t('industrial.scada.editor.menu.selectAll'),
          testid: 'scada-editor-context-selectall',
          disabled: !props.hasSymbols,
          destructive: false,
          action: 'selectAll' as const,
        },
        {
          key: 'fitCanvas',
          label: t('industrial.scada.editor.menu.fitCanvas'),
          testid: 'scada-editor-context-fitcanvas',
          disabled: false,
          destructive: false,
          action: 'fitCanvas' as const,
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
      aria-label={t('industrial.scada.editor.menu.label')}
      data-testid="scada-editor-context-menu"
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
