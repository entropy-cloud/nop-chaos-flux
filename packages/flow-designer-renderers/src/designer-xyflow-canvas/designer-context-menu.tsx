import { t } from '@nop-chaos/flux-i18n';
import { cn, useContextMenuShell } from '@nop-chaos/ui';
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
  disabled?: boolean;
  destructive?: boolean;
  testid?: string;
  onSelect(): void;
}

/** plan 526 Phase 4：画布右键上下文菜单（节点/空白两态）——viewport 防溢出钳制 +
 * Escape/外部点击关闭 + 方向键在项间移动。固定定位（client 坐标），样式复用
 * fd-edge-actions 浮卡令牌面。壳行为自 CX-16 plan 596 起由 ui
 * `useContextMenuShell` 共享（组件保留自有壳/item map/样式/i18n/testids）；
 * 本面 items 均为启用项（readOnly 按 filtered 而非 disabled），统一
 * `:not([disabled])` 选择器对其恒等（plan 596 G3 恒等钉在案）。 */
export function DesignerContextMenu(props: {
  menu: DesignerContextMenuState;
  items: DesignerContextMenuItem[];
  onClose(): void;
}) {
  const { menuRef, handleMenuKeyDown } = useContextMenuShell({
    position: { x: props.menu.x, y: props.menu.y },
    onClose: props.onClose,
  });

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
          disabled={item.disabled}
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
