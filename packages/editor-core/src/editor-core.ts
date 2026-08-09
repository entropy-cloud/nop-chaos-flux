import type {
  EditorCommitPolicy,
  EditorCommitResult,
  EditorCore,
  EditorCoreOptions,
  EditorDiffEntry,
  EditorDomainAdapter,
  EditorMode,
  EditorSessionState,
} from './types.js';
import { UndoCommandStack } from './undo-command-stack.js';

const EMPTY_ERROR_MESSAGE = 'document is invalid';

function isPlainCloneSupported(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (typeof (value as { constructor?: unknown }).constructor === 'function' ||
      typeof (value as { constructor?: unknown }).constructor === 'undefined')
  );
}

/**
 * 文档克隆（working/committed 双态隔离的深拷贝，R5 Layer 2）。
 *
 * 领域文档约定为可序列化 JSON 形态（布局 JSON / 组态 JSON）：`structuredClone` 深隔离，
 * 保证 working 变更不回流 committed baseline；structuredClone 不支持的类型（function/
 * symbol 等）回退浅拷贝并保守处理（领域文档契约不含这类值）。
 */
export function cloneDocument<TDocument>(document: TDocument): TDocument {
  try {
    return structuredClone(document);
  } catch {
    if (isPlainCloneSupported(document)) {
      return { ...(document as object) } as TDocument;
    }
    return document;
  }
}

/**
 * `createEditorCore` —— 领域无关编辑器内核工厂（design: docs/architecture/editor-core.md §2）。
 *
 * 会话 working/committed 双态隔离 + undo/redo diff 命令栈 + 选择状态 + 提交策略 + 事务。
 * 无 React / DOM 依赖；经 `subscribe`/`getState` 供任意消费侧（React useSyncExternalStore 等）。
 */
export function createEditorCore<TDocument = unknown, TDiff = unknown>(
  adapter: EditorDomainAdapter<TDocument, TDiff>,
  options: EditorCoreOptions<TDocument> = {},
): EditorCore<TDocument, TDiff> {
  const policy: EditorCommitPolicy = options.policy ?? 'manual';
  const mode: EditorMode = options.mode ?? 'edit';
  const selection: string[] = options.selection ? [...options.selection] : [];
  const initialDocument = options.initialDocument ?? adapter.load();
  const stack = new UndoCommandStack<TDiff>(options.maxStackDepth);
  const listeners = new Set<(state: EditorSessionState<TDocument>) => void>();

  let working: TDocument = cloneDocument(initialDocument);
  let committed: TDocument = cloneDocument(initialDocument);
  let currentMode: EditorMode = mode;
  let disposed = false;
  let txStart: TDocument | null = null;
  let lastSnapshot: EditorSessionState<TDocument> | null = null;

  const isDirty = (): boolean => adapter.diff(committed, working) !== null;

  const pruneSelection = (): void => {
    if (!adapter.getDocumentIds || selection.length === 0) return;
    const ids = new Set(adapter.getDocumentIds(working));
    for (let i = selection.length - 1; i >= 0; i -= 1) {
      if (!ids.has(selection[i])) selection.splice(i, 1);
    }
  };

  const buildSnapshot = (): EditorSessionState<TDocument> => ({
    working,
    committed,
    selection: [...selection],
    mode: currentMode,
    canUndo: stack.canUndo,
    canRedo: stack.canRedo,
    undoDepth: stack.undoDepth,
    redoDepth: stack.redoDepth,
    dirty: isDirty(),
  });

  const notify = (): void => {
    if (disposed) return;
    lastSnapshot = buildSnapshot();
    for (const listener of listeners) {
      listener(lastSnapshot);
    }
  };

  const warnEmptyStack = (op: 'undo' | 'redo'): void => {
    console.warn(`[editor-core] ${op} on empty stack (no-op)`);
  };

  const recordEntry = (forward: TDiff, inverse: TDiff, operationKind?: string): void => {
    const entry: EditorDiffEntry<TDiff> = {
      forward,
      inverse,
      operationKind,
      timestamp: Date.now(),
    };
    stack.push(entry);
  };

  const applyEntryToWorking = (entry: EditorDiffEntry<TDiff>, direction: 'forward' | 'inverse'): boolean => {
    try {
      working = adapter.applyDiff(working, entry[direction]);
      return true;
    } catch (error) {
      console.warn('[editor-core] applyDiff failed', error);
      return false;
    }
  };

  const runCommit = (): EditorCommitResult => {
    const validation = adapter.validate(working);
    if (!validation.ok) {
      const error = new Error(
        validation.errors?.length ? validation.errors.join('; ') : EMPTY_ERROR_MESSAGE,
      );
      return { ok: false, error };
    }
    try {
      const serialized = adapter.serialize(working);
      committed = cloneDocument(working);
      pruneSelection();
      const result: EditorCommitResult = { ok: true, serialized };
      options.onCommitted?.(result);
      notify();
      return result;
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const core: EditorCore<TDocument, TDiff> = {
    adapter,
    policy,

    getState() {
      if (lastSnapshot === null) {
        lastSnapshot = buildSnapshot();
      }
      return lastSnapshot;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    update(updater) {
      if (disposed) return false;
      const prev = working;
      const next = updater(prev);
      if (next === prev) return false;

      const diff = adapter.diff(prev, next);
      if (txStart === null) {
        if (diff !== null) {
          const inverse = adapter.diff(next, prev);
          recordEntry(diff, inverse as TDiff);
        }
      }
      working = next;
      pruneSelection();
      notify();

      if (policy === 'auto') {
        runCommit();
      }
      return true;
    },

    record(forward, inverse, operationKind) {
      if (disposed || txStart !== null) return;
      recordEntry(forward, inverse, operationKind);
      notify();
    },

    beginTransaction() {
      if (disposed) return;
      if (txStart === null) {
        txStart = working;
      }
    },

    endTransaction() {
      if (disposed || txStart === null) return false;
      const start = txStart;
      txStart = null;
      const forward = adapter.diff(start, working);
      if (forward === null) return false;
      const inverse = adapter.diff(working, start);
      recordEntry(forward, inverse as TDiff);
      notify();
      if (policy === 'auto') {
        runCommit();
      }
      return true;
    },

    abortTransaction() {
      if (disposed || txStart === null) return;
      working = txStart;
      txStart = null;
      pruneSelection();
      notify();
    },

    undo() {
      if (disposed) return false;
      const entry = stack.peekUndo();
      if (!entry) {
        warnEmptyStack('undo');
        return false;
      }
      if (!applyEntryToWorking(entry, 'inverse')) return false;
      stack.popUndo();
      stack.pushRedo(entry);
      pruneSelection();
      notify();
      return true;
    },

    redo() {
      if (disposed) return false;
      const entry = stack.peekRedo();
      if (!entry) {
        warnEmptyStack('redo');
        return false;
      }
      if (!applyEntryToWorking(entry, 'forward')) return false;
      stack.popRedo();
      stack.pushUndo(entry);
      pruneSelection();
      notify();
      return true;
    },

    commit() {
      if (disposed) return { ok: false, error: new Error('editor-core disposed') };
      return runCommit();
    },

    revert() {
      if (disposed) return;
      working = cloneDocument(committed);
      stack.clear();
      pruneSelection();
      notify();
    },

    setMode(modeToSet) {
      if (disposed || modeToSet === currentMode) return;
      currentMode = modeToSet;
      notify();
    },

    setSelection(nextSelection) {
      if (disposed) return;
      const next = [...nextSelection];
      if (adapter.getDocumentIds) {
        const ids = new Set(adapter.getDocumentIds(working));
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (!ids.has(next[i])) next.splice(i, 1);
        }
      }
      selection.length = 0;
      selection.push(...next);
      notify();
    },

    dispose() {
      disposed = true;
      listeners.clear();
      stack.clear();
      txStart = null;
    },
  };

  return core;
}
