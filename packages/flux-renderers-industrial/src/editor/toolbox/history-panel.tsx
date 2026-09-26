import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Badge } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';

export interface EditorHistoryPanelProps {
  runtime: EditorEngineRuntime;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 撤销历史面板（plan 521 / U2，design-undo-redo.md §13）。
 *
 * **只读观察面（truncate 裁定）**：展示 undo/redo 栈 entry 元数据（序号/operationKind/timestamp，
 * 经 `UndoStack.listUndoEntries()` / `listRedoEntries()` 只读投影），不提供「点击回跳」的
 * truncate-to-index 语义（栈语义变更归 L5.8 深化档）。操作行进仍经既有 Undo/Redo 按钮。
 * undo/redo 后 notifySession bump 触发父级重渲染 → 列表随之刷新。
 */
export function EditorHistoryPanel(props: EditorHistoryPanelProps) {
  const { runtime, open, onOpenChange } = props;
  const { t } = useFluxTranslation();

  if (!open) return null;
  const undoEntries = [...runtime.session.undoStack.listUndoEntries()].reverse();
  const redoEntries = [...runtime.session.undoStack.listRedoEntries()].reverse();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return String(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nop-scada-editor-toolbox-history" data-slot="scada-editor-toolbox-history">
        <DialogHeader>
          <DialogTitle>{t('industrial.scada.editor.history.title')}</DialogTitle>
          <DialogDescription>{t('industrial.scada.editor.history.description')}</DialogDescription>
        </DialogHeader>
        <div>
          <span className="nop-scada-editor-group-label">
            {t('industrial.scada.editor.history.undoStack')} ({undoEntries.length})
          </span>
          {undoEntries.length === 0 ? (
            <div className="text-xs opacity-60 py-1" data-testid="toolbox-history-empty">
              {t('industrial.scada.editor.history.empty')}
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5 max-h-56 overflow-auto m-0 p-0 list-none">
              {undoEntries.map((entry) => (
                <li
                  key={`${entry.index}:${entry.timestamp}`}
                  className="nop-scada-editor-history-row flex items-center gap-2 text-xs py-0.5"
                  data-slot="scada-editor-history-row"
                  data-operation-kind={entry.operationKind}
                  data-testid="toolbox-history-row"
                >
                  <span className="font-mono opacity-60 w-8 text-right">{entry.index}</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">{entry.operationKind}</Badge>
                  <span className="opacity-60 font-mono">{formatTime(entry.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {redoEntries.length > 0 ? (
          <div>
            <span className="nop-scada-editor-group-label">
              {t('industrial.scada.editor.history.redoStack')} ({redoEntries.length})
            </span>
            <ul className="flex flex-col gap-0.5 max-h-32 overflow-auto m-0 p-0 list-none">
              {redoEntries.map((entry) => (
                <li
                  key={`redo-${entry.index}:${entry.timestamp}`}
                  className="nop-scada-editor-history-row flex items-center gap-2 text-xs py-0.5 opacity-70"
                  data-slot="scada-editor-history-row"
                  data-operation-kind={entry.operationKind}
                  data-redo="true"
                  data-testid="toolbox-history-row"
                >
                  <span className="font-mono opacity-60 w-8 text-right">{entry.index}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{entry.operationKind}</Badge>
                  <span className="opacity-60 font-mono">{formatTime(entry.timestamp)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} data-testid="toolbox-history-close">
            {t('industrial.scada.editor.history.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
