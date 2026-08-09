import { useSyncExternalStore, type ReactNode } from 'react';
import type { EditorCore, EditorSessionState } from '@nop-chaos/editor-core';

const EMPTY_STATE: EditorSessionState<unknown> = {
  working: undefined,
  committed: undefined,
  selection: [],
  mode: 'edit',
  canUndo: false,
  canRedo: false,
  undoDepth: 0,
  redoDepth: 0,
  dirty: false,
};

/**
 * React 适配：`useSyncExternalStore` 订阅 editor-core 会话（INV-4：session 不进 flux scope，
 * 经投影消费；core 引用变化才重新订阅，env 引用变化不触发重建）。
 */
export function useEditorCoreSession<TDocument>(
  core: EditorCore<TDocument, unknown> | null,
): EditorSessionState<TDocument> {
  return useSyncExternalStore(
    (onStoreChange: () => void) => {
      if (!core) return () => undefined;
      const unsubscribe = core.subscribe(onStoreChange);
      return unsubscribe;
    },
    () => (core ? (core.getState() as EditorSessionState<TDocument>) : (EMPTY_STATE as EditorSessionState<TDocument>)),
  );
}

export type { ReactNode };
