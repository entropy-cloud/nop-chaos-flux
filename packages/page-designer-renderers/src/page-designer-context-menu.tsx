/**
 * 右键上下文菜单（plan 527 Phase 2）：固定定位（client 坐标）、viewport 防溢出
 * 钳制、Escape/外部点击关闭、方向键项间移动。items 由宿主按目标（节点/空白）
 * 与 mode 过滤后传入。壳行为（钳制/外点关闭/Escape 捕获/roving）自 CX-16
 * plan 596 起由 ui `useContextMenuShell` 共享（组件保留自有壳/item map/样式/
 * i18n/testids）。
 */

import { useContextMenuShell } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

export interface PageDesignerContextMenuState {
  x: number;
  y: number;
  /** 右键命中的节点 sid；null = 画布空白。 */
  nodeId: string | null;
}

export type PageDesignerContextMenuAction = 'paste' | 'duplicate' | 'delete';

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
          onSelect: () => {
            props.onAction('paste', props.menu.nodeId);
          },
        },
        {
          key: 'duplicate',
          label: t('flux.pageDesigner.duplicateNode'),
          testid: 'page-designer-context-duplicate',
          onSelect: () => {
            props.onAction('duplicate', props.menu.nodeId);
          },
        },
        {
          key: 'delete',
          label: t('flux.pageDesigner.deleteNode'),
          destructive: true,
          testid: 'page-designer-context-delete',
          onSelect: () => {
            props.onAction('delete', props.menu.nodeId);
          },
        },
      ]
    : [
        {
          key: 'paste',
          label: t('flux.pageDesigner.pasteHere'),
          disabled: !props.hasClipboard,
          testid: 'page-designer-context-paste',
          onSelect: () => {
            props.onAction('paste', props.menu.nodeId);
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
