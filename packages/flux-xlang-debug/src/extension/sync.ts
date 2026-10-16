import { EditorView } from '@codemirror/view';
import type { DebugStore } from '../state/debug-store.js';
import { setBreakpointsEffect, setExceptionLinesEffect, setSuspendedLinesEffect } from './effects.js';

export interface SyncStoreToExtensionsOptions {
  store: DebugStore;
  view: EditorView;
  /** 当前文档锚点（与 gutter 同源——通常即 sourcePathFacet 的当前值）。 */
  getSourcePath: (view: EditorView) => string;
}

/**
 * store→编辑器单向同步桥（plan 617 F3 签名）：store.subscribe → 按当前文档锚点
 * 过滤 → 派发三族 Effect。返回 dispose——清理 = dispose 单层 + apply 内
 * dom.isConnected 守卫（EditorView 6.x 无 isDestroyed；Compartment reconfigure
 * 场景下守卫不生效，泄漏边界 = dispose 必须被调用，plan 617 审计 B2 勘正）。
 */
export function syncStoreToExtensions(options: SyncStoreToExtensionsOptions): () => void {
  const { store, view, getSourcePath } = options;

  const apply = () => {
    // EditorView 6.x 无 isDestroyed 属性：以 DOM 连接性判定销毁态
    // （EditorView.destroy 后 dom 脱离文档）
    if (!view.dom.isConnected) {
      return;
    }
    const state = store.getState();
    const sourcePath = getSourcePath(view);
    const bpLines = state.breakpoints
      .filter((bp) => bp.sourcePath === sourcePath)
      .map((bp) => bp.line);
    const suspendedLines = state.suspended
      .filter((s) => s.sourcePath === sourcePath)
      .map((s) => s.line);
    const exceptionLines = state.exceptions
      .filter((e) => e.sourcePath === sourcePath && e.line != null && e.line > 0)
      .map((e) => e.line as number);
    view.dispatch({
      effects: [
        setBreakpointsEffect.of(bpLines),
        setSuspendedLinesEffect.of(suspendedLines),
        setExceptionLinesEffect.of(exceptionLines),
      ],
    });
  };

  const unsubscribe = store.subscribe(apply);
  apply();
  let disposed = false;
  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    unsubscribe();
  };
}
