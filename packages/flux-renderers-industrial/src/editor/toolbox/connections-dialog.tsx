import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Badge } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';

export interface EditorConnectionsDialogProps {
  runtime: EditorEngineRuntime;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** [G5-R3-视角3-01] meta.disabled 门禁（preview / disabled 态断开按钮 inert）。 */
  disabled?: boolean;
}

/**
 * 连接管理弹层（plan 521 / U1，design-toolbox.md §13.1）。
 *
 * 列表消费 `runtime.listConnections()`（复用 listAllConnections 纯函数，含 dangling 标记）；
 * 逐条断开消费 `runtime.disconnectConnection(junctionId, connectionId)`（经 writeConnection mutator
 * 写回——入 undo 栈 operationKind='connection-update'，可撤销）。断开后 notifySession bump 触发
 * 父级重渲染 → 本组件随渲染重新读取列表（幂等：connectionId 已不存在返回 false，列表不变）。
 * preview 态断开按钮 disabled（写通道 preview 门控，R5）。
 */
export function EditorConnectionsDialog(props: EditorConnectionsDialogProps) {
  const { runtime, open, onOpenChange } = props;
  const { t } = useFluxTranslation();

  if (!open) return null;
  const connections = runtime.listConnections();
  const writeBlocked = props.disabled || runtime.session.mode === 'preview';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="nop-scada-editor-toolbox-connections"
        data-slot="scada-editor-toolbox-connections"
      >
        <DialogHeader>
          <DialogTitle>{t('industrial.scada.editor.connections.title')}</DialogTitle>
          <DialogDescription>{t('industrial.scada.editor.connections.description')}</DialogDescription>
        </DialogHeader>
        {connections.length === 0 ? (
          <div className="text-xs opacity-60 py-2" data-testid="toolbox-connections-empty">
            {t('industrial.scada.editor.connections.empty')}
          </div>
        ) : (
          <ul className="flex flex-col gap-1 max-h-72 overflow-auto m-0 p-0 list-none">
            {connections.map(({ junctionId, connection, dangling }) => (
              <li
                key={`${junctionId}:${connection.id}`}
                className="nop-scada-editor-connection-row flex items-center gap-2 text-xs py-1"
                data-slot="scada-editor-connection-row"
                data-dangling={dangling ? 'true' : 'false'}
                data-testid="toolbox-connection-row"
              >
                <span className="font-mono opacity-80">{junctionId}</span>
                <span className="font-mono opacity-60">{connection.id}</span>
                <span className="opacity-60">→</span>
                <span className="font-mono opacity-80">{connection.target || '-'}</span>
                {dangling ? (
                  <Badge variant="destructive" className="text-[10px]">
                    {t('industrial.scada.editor.connections.dangling')}
                  </Badge>
                ) : null}
                <span className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={writeBlocked}
                  data-testid="toolbox-connection-disconnect"
                  className={cn('h-6 px-2 text-xs')}
                  onClick={() => {
                    runtime.disconnectConnection(junctionId, connection.id);
                  }}
                >
                  {t('industrial.scada.editor.connections.disconnect')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} data-testid="toolbox-connections-close">
            {t('industrial.scada.editor.connections.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
