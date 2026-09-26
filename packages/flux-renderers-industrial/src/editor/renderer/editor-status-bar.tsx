import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { EditorEngineRuntime } from './hooks/use-editor-engine.js';

export interface EditorStatusBarProps {
  runtime: EditorEngineRuntime;
  /** 当前选区（reactive，从 canvas state 传入）。 */
  selection: string[];
  className?: string;
}

/**
 * 内置 statusBar（plan 521 / U4，design-architecture.md §4.1 + design-undo-redo.md §4.5）。
 *
 * 展示 viewport（x/y/scale）/ mode / selection 摘要 + undo/redo 深度。数据面：
 * `engine.getViewport()` + session（mode/selection/undoStack）均已在 runtime；
 * viewport 为渲染时快照（随 session/selection 重渲染刷新——视口平移不派发 session 事件，
 * MVP 不引入 viewport 订阅通道）；undo/redo 边界提示语义与 design-undo-redo.md §4.5 同源。
 */
export function EditorStatusBar(props: EditorStatusBarProps) {
  const { runtime, selection } = props;
  const { t } = useFluxTranslation();
  const viewport = runtime.engine.getViewport();
  const mode = runtime.session.mode;
  const undoDepth = runtime.session.undoStack.undoStackDepth;
  const redoDepth = runtime.session.undoStack.redoStackDepth;

  return (
    <div
      data-slot="scada-editor-status-bar"
      className={cn('nop-scada-editor-status-bar flex items-center gap-3 text-xs opacity-70 px-2 py-0.5', props.className)}
    >
      <span data-testid="editor-status-mode">
        {t('industrial.scada.editor.status.mode')}: {mode}
      </span>
      <span data-testid="editor-status-viewport">
        {t('industrial.scada.editor.status.viewport')} {viewport.x.toFixed(0)},{viewport.y.toFixed(0)} @{viewport.scale.toFixed(2)}x
      </span>
      <span data-testid="editor-status-selection">
        {t('industrial.scada.editor.status.selection')}: {selection.length}
      </span>
      <span data-testid="editor-status-undo-redo" data-undo-depth={undoDepth} data-redo-depth={redoDepth}>
        {t('industrial.scada.editor.status.history')}: {undoDepth}/{redoDepth}
      </span>
    </div>
  );
}
