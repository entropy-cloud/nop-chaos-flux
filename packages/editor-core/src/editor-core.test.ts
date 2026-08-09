import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearEditorDomains,
  createEditorCore,
  getEditorDomain,
  listEditorDomains,
  registerEditorDomain,
  UndoCommandStack,
  type EditorDomainAdapter,
} from './index.js';

interface TestDocument {
  title: string;
  items: string[];
}

function createTestAdapter(
  kind = 'test',
  options: { rejectValidation?: boolean } = {},
): EditorDomainAdapter<TestDocument, Partial<TestDocument>> {
  return {
    kind,
    load: () => ({ title: 't0', items: ['a'] }),
    serialize: (doc) => JSON.stringify(doc),
    validate: (doc) =>
      options.rejectValidation && doc.items.includes('forbidden')
        ? { ok: false, errors: ['forbidden item'] }
        : { ok: true },
    diff: (prev, next) => {
      const patch: Partial<TestDocument> = {};
      if (prev.title !== next.title) patch.title = next.title;
      if (prev.items.join('|') !== next.items.join('|')) patch.items = [...next.items];
      return Object.keys(patch).length > 0 ? patch : null;
    },
    applyDiff: (doc, diff) => ({
      title: diff.title ?? doc.title,
      items: diff.items ? [...diff.items] : [...doc.items],
    }),
    getDocumentIds: (doc) => doc.items,
  };
}

const docWith = (items: string[], title = 't0'): TestDocument => ({ title, items });

beforeEach(() => {
  clearEditorDomains();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('editor-core session contract (working/committed dual-state isolation)', () => {
  it('working changes do not pollute committed baseline', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    const changed = core.update((doc) => docWith([...doc.items, 'b']));
    expect(changed).toBe(true);
    expect(core.getState().working.items).toEqual(['a', 'b']);
    expect(core.getState().committed.items).toEqual(['a']);
    expect(core.getState().dirty).toBe(true);
  });

  it('commit advances the baseline and clears dirty', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    core.update((doc) => docWith([...doc.items, 'b']));
    const result = core.commit();
    expect(result.ok).toBe(true);
    expect(result.serialized).toBe(JSON.stringify(docWith(['a', 'b'])));
    expect(core.getState().committed.items).toEqual(['a', 'b']);
    expect(core.getState().dirty).toBe(false);
  });

  it('revert discards working changes and clears undo history', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    core.update((doc) => docWith([...doc.items, 'b']));
    expect(core.getState().canUndo).toBe(true);
    core.revert();
    const state = core.getState();
    expect(state.working.items).toEqual(['a']);
    expect(state.committed.items).toEqual(['a']);
    expect(state.dirty).toBe(false);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });

  it('commit reject keeps working and surfaces the error (failure path editor-core-commit-invalid)', () => {
    const core = createEditorCore(createTestAdapter('invalid', { rejectValidation: true }), {
      initialDocument: docWith(['a']),
    });
    core.update((doc) => docWith([...doc.items, 'forbidden']));
    const result = core.commit();
    expect(result.ok).toBe(false);
    expect(result.error?.message).toBe('forbidden item');
    expect(core.getState().working.items).toEqual(['a', 'forbidden']);
    expect(core.getState().dirty).toBe(true);
    expect(core.getState().canUndo).toBe(true);
  });

  it('update with structurally identical document records no undo entry and stays clean', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    const changed = core.update((doc) => docWith([...doc.items], doc.title));
    expect(changed).toBe(true);
    expect(core.getState().canUndo).toBe(false);
    expect(core.getState().dirty).toBe(false);
  });
});

describe('editor-core undo/redo diff command stack', () => {
  it('records diffs and replays undo/redo in order', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    core.update((doc) => docWith([...doc.items, 'b']));
    core.update((doc) => docWith([...doc.items, 'c']));
    expect(core.getState().undoDepth).toBe(2);

    expect(core.undo()).toBe(true);
    expect(core.getState().working.items).toEqual(['a', 'b']);
    expect(core.getState().redoDepth).toBe(1);

    expect(core.undo()).toBe(true);
    expect(core.getState().working.items).toEqual(['a']);
    expect(core.getState().canUndo).toBe(false);

    expect(core.redo()).toBe(true);
    expect(core.getState().working.items).toEqual(['a', 'b']);
    expect(core.redo()).toBe(true);
    expect(core.getState().working.items).toEqual(['a', 'b', 'c']);
    expect(core.getState().canRedo).toBe(false);
  });

  it('undo/redo on empty stack is a no-op with a dev warn (failure path editor-core-undo-empty)', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    expect(core.undo()).toBe(false);
    expect(core.redo()).toBe(false);
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(core.getState().working.items).toEqual(['a']);
  });

  it('new record after undo truncates the redo chain', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    core.update((doc) => docWith([...doc.items, 'b']));
    core.update((doc) => docWith([...doc.items, 'c']));
    core.undo();
    expect(core.getState().working.items).toEqual(['a', 'b']);
    core.update((doc) => docWith([...doc.items, 'x']));
    expect(core.getState().canRedo).toBe(false);
    expect(core.redo()).toBe(false);
    core.undo();
    expect(core.getState().working.items).toEqual(['a', 'b']);
  });

  it('commit keeps the undo stack (aligned with hmi save() semantics)', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    core.update((doc) => docWith([...doc.items, 'b']));
    core.commit();
    expect(core.getState().canUndo).toBe(true);
    core.undo();
    expect(core.getState().working.items).toEqual(['a']);
    expect(core.getState().committed.items).toEqual(['a', 'b']);
  });

  it('undo/redo applies forward/inverse symmetrically (round-trip contract)', () => {
    const adapter = createTestAdapter();
    const prev = docWith(['a', 'b']);
    const next = docWith(['a', 'b', 'c'], 'renamed');
    const forward = adapter.diff(prev, next) as Partial<TestDocument>;
    const inverse = adapter.diff(next, prev) as Partial<TestDocument>;
    expect(adapter.applyDiff(adapter.applyDiff(prev, forward), inverse)).toEqual(prev);
    expect(adapter.applyDiff(adapter.applyDiff(next, inverse), forward)).toEqual(next);

    const core = createEditorCore(adapter, { initialDocument: prev });
    core.update(() => next);    expect(core.undo()).toBe(true);
    expect(core.getState().working).toEqual(prev);
    expect(core.redo()).toBe(true);
    expect(core.getState().working).toEqual(next);
  });

  it('bounded stack depth drops the oldest entries (U7)', () => {
    const core = createEditorCore(createTestAdapter(), {
      initialDocument: docWith([]),
      maxStackDepth: 3,
    });
    for (let i = 1; i <= 5; i += 1) {
      core.update((doc) => docWith([...doc.items, `i${i}`]));
    }
    expect(core.getState().undoDepth).toBe(3);
    core.undo();
    expect(core.getState().working.items).toEqual(['i1', 'i2', 'i3', 'i4']);
    core.undo();
    core.undo();
    expect(core.getState().canUndo).toBe(false);
    expect(core.getState().working.items).toEqual(['i1', 'i2']);
  });

  it('transaction coalesces many updates into a single undo entry (one drag = one step)', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    core.beginTransaction();
    core.update((doc) => docWith([...doc.items, 'b']));
    core.update((doc) => docWith([...doc.items, 'c']));
    core.update((doc) => docWith([...doc.items, 'd']));
    expect(core.getState().undoDepth).toBe(0);
    expect(core.endTransaction()).toBe(true);
    expect(core.getState().undoDepth).toBe(1);
    core.undo();
    expect(core.getState().working.items).toEqual(['a']);
  });

  it('abortTransaction rolls working back to the transaction start without recording', () => {
    const core = createEditorCore(createTestAdapter(), { initialDocument: docWith(['a']) });
    core.beginTransaction();
    core.update((doc) => docWith([...doc.items, 'b']));
    core.update((doc) => docWith([...doc.items, 'c']));
    core.abortTransaction();
    expect(core.getState().working.items).toEqual(['a']);
    expect(core.getState().undoDepth).toBe(0);
  });

  it('selection is pruned to ids still present after document mutations', () => {
    const core = createEditorCore(createTestAdapter(), {
      initialDocument: docWith(['a', 'b', 'c']),
      selection: ['a', 'b'],
    });
    core.setSelection(['a', 'b']);
    core.update(() => docWith(['a']));
    expect(core.getState().selection).toEqual(['a']);
    expect(core.getState().canUndo).toBe(true);
  });
});

describe('editor-core dual-state mode switch (INV-4)', () => {
  it('mode switch does not leak or reset session state', () => {
    const core = createEditorCore(createTestAdapter(), {
      initialDocument: docWith(['a']),
      selection: ['a'],
      mode: 'edit',
    });
    core.update((doc) => docWith([...doc.items, 'b']));
    core.setMode('preview');
    let state = core.getState();
    expect(state.mode).toBe('preview');
    expect(state.working.items).toEqual(['a', 'b']);
    expect(state.selection).toEqual(['a']);
    expect(state.undoDepth).toBe(1);
    core.setMode('edit');
    state = core.getState();
    expect(state.mode).toBe('edit');
    expect(state.working.items).toEqual(['a', 'b']);
  });

  it('auto commit policy commits on every update and fires onCommitted', () => {
    const onCommitted = vi.fn();
    const core = createEditorCore(createTestAdapter(), {
      initialDocument: docWith(['a']),
      policy: 'auto',
      onCommitted,
    });
    core.update((doc) => docWith([...doc.items, 'b']));
    expect(core.getState().dirty).toBe(false);
    expect(core.getState().committed.items).toEqual(['a', 'b']);
    expect(onCommitted).toHaveBeenCalledTimes(1);
    expect(onCommitted.mock.calls[0][0].serialized).toBe(JSON.stringify(docWith(['a', 'b'])));
  });
});

describe('editor-core domain adapter registry', () => {
  it('register/get/list round-trips', () => {
    const adapter = createTestAdapter('dash');
    registerEditorDomain(adapter);
    expect(getEditorDomain('dash')).toBe(adapter);
    expect(listEditorDomains()).toEqual(['dash']);
    clearEditorDomains();
    expect(getEditorDomain('dash')).toBeUndefined();
    expect(listEditorDomains()).toEqual([]);
  });

  it('duplicate registration overrides with the latest adapter', () => {
    const first = createTestAdapter('over');
    const second = createTestAdapter('over');
    registerEditorDomain(first);
    registerEditorDomain(second);
    expect(getEditorDomain('over')).toBe(second);
    expect(listEditorDomains()).toEqual(['over']);
  });
});

describe('UndoCommandStack primitive', () => {
  it('moves entries between stacks without swapping fields', () => {
    const stack = new UndoCommandStack<number>(10);
    stack.push({ forward: 1, inverse: -1, operationKind: 'move', timestamp: 1 });
    const entry = stack.peekUndo();
    expect(entry?.forward).toBe(1);
    expect(entry?.inverse).toBe(-1);
    stack.popUndo();
    stack.pushRedo(entry as never);
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
    expect(stack.peekRedo()?.forward).toBe(1);
    expect(stack.peekRedo()?.inverse).toBe(-1);
    stack.popRedo();
    stack.pushUndo(entry as never);
    expect(stack.canUndo).toBe(true);
    expect(stack.peekUndo()?.forward).toBe(1);
    expect(stack.peekUndo()?.inverse).toBe(-1);
  });
});
