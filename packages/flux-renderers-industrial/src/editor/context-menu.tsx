/**
 * 右键上下文菜单（plan 532 S3 Phase 1）：`page-designer-context-menu`（527）同款移植——
 * 固定定位（client 坐标）、viewport 防溢出钳制、Escape/外部点击关闭、方向键项间移动 + Enter 触发。
 * items 由组件内构建（React Compiler refs 规则约束），宿主按目标（图元/空白）传入态别。
 * 挂载点须为 canvas 键盘层容器（data-slot=scada-editor-canvas div）的兄弟（scada-editor-canvas-wrap 内），
 * 规避容器 onKeyDown nudge 对菜单方向键导航的冒泡污染（壳的 window capture 已 stopPropagation Escape）。
 * 壳行为自 CX-16 plan 596 起由 ui `useContextMenuShell` 共享（组件保留自有壳/item map/
 * 样式/i18n/testids）。
 */

import { useContextMenuShell } from '@nop-chaos/ui';
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
          onSelect: () => {
            props.onAction('duplicate', props.menu.nodeId);
          },
        },
        {
          key: 'delete',
          label: t('industrial.scada.editor.menu.delete'),
          testid: 'scada-editor-context-delete',
          disabled: false,
          destructive: true,
          onSelect: () => {
            props.onAction('delete', props.menu.nodeId);
          },
        },
        {
          key: 'toTop',
          label: t('industrial.scada.editor.menu.toTop'),
          testid: 'scada-editor-context-totop',
          disabled: false,
          destructive: false,
          onSelect: () => {
            props.onAction('toTop', props.menu.nodeId);
          },
        },
        {
          key: 'moveUp',
          label: t('industrial.scada.editor.menu.moveUp'),
          testid: 'scada-editor-context-moveup',
          disabled: false,
          destructive: false,
          onSelect: () => {
            props.onAction('moveUp', props.menu.nodeId);
          },
        },
        {
          key: 'moveDown',
          label: t('industrial.scada.editor.menu.moveDown'),
          testid: 'scada-editor-context-movedown',
          disabled: false,
          destructive: false,
          onSelect: () => {
            props.onAction('moveDown', props.menu.nodeId);
          },
        },
        {
          key: 'toBottom',
          label: t('industrial.scada.editor.menu.toBottom'),
          testid: 'scada-editor-context-tobottom',
          disabled: false,
          destructive: false,
          onSelect: () => {
            props.onAction('toBottom', props.menu.nodeId);
          },
        },
        {
          key: 'paste',
          label: t('industrial.scada.editor.menu.paste'),
          testid: 'scada-editor-context-paste',
          disabled: !props.hasClipboard,
          destructive: false,
          onSelect: () => {
            props.onAction('paste', props.menu.nodeId);
          },
        },
      ]
    : [
        {
          key: 'paste',
          label: t('industrial.scada.editor.menu.paste'),
          testid: 'scada-editor-context-paste',
          disabled: !props.hasClipboard,
          destructive: false,
          onSelect: () => {
            props.onAction('paste', props.menu.nodeId);
          },
        },
        {
          key: 'selectAll',
          label: t('industrial.scada.editor.menu.selectAll'),
          testid: 'scada-editor-context-selectall',
          disabled: !props.hasSymbols,
          destructive: false,
          onSelect: () => {
            props.onAction('selectAll', props.menu.nodeId);
          },
        },
        {
          key: 'fitCanvas',
          label: t('industrial.scada.editor.menu.fitCanvas'),
          testid: 'scada-editor-context-fitcanvas',
          disabled: false,
          destructive: false,
          onSelect: () => {
            props.onAction('fitCanvas', props.menu.nodeId);
          },
        },
      ];
  const { menuRef, handleMenuKeyDown } = useContextMenuShell({
    position: { x: props.menu.x, y: props.menu.y },
    onClose: props.onClose,
  });

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
            item.onSelect();
            props.onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
