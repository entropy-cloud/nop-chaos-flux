import { describe, it, expect, vi } from 'vitest';
import { UndoRedoAdapter } from './undo-redo-adapter.js';
import { UndoStack } from './undo-stack.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';

function cfg(symbols: ScadaSymbolNode[]): ScadaConfig {
  return { version: 1, symbols };
}

const node = (id: string, x: number): ScadaSymbolNode => ({ id, type: 'scada-rect', x, y: 0, width: 10, height: 10 });

describe('UndoRedoAdapter transaction semantics (design-undo-redo.md §4.2)', () => {
  it('beginTransaction + commitTransaction pushes a single diff for the whole transaction', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    const initial = cfg([node('a', 0)]);
    adapter.beginTransaction('transform-move', initial);
    expect(adapter.isInTransaction).toBe(true);
    // simulate per-frame working copy updates during the transaction (NOT pushed)
    const moved = cfg([node('a', 5)]);
    const movedMore = cfg([node('a', 10)]);
    // commit uses the final working copy
    const entry = adapter.commitTransaction(movedMore);
    expect(entry).toBeDefined();
    expect(entry!.operationKind).toBe('transform-move');
    expect(entry!.forward.updated[0].patch.x).toBe(10);
    expect(stack.undoStackDepth).toBe(1);
    // moved / movedMore intermediates not on the stack (only one entry)
    void moved;
  });

  it('commitTransaction with no changes returns undefined (empty diff not pushed)', () => {
    const adapter = new UndoRedoAdapter(new UndoStack());
    const initial = cfg([node('a', 0)]);
    adapter.beginTransaction('transform-move', initial);
    expect(adapter.commitTransaction(initial)).toBeUndefined();
  });

  it('commitTransaction with no active transaction returns undefined', () => {
    const adapter = new UndoRedoAdapter(new UndoStack());
    expect(adapter.commitTransaction(cfg([node('a', 0)]))).toBeUndefined();
  });

  it('abortTransaction cancels without pushing', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    adapter.beginTransaction('transform-move', cfg([node('a', 0)]));
    adapter.abortTransaction();
    expect(adapter.isInTransaction).toBe(false);
    expect(stack.undoStackDepth).toBe(0);
  });

  it('nested beginTransaction is ignored (first transaction wins)', () => {
    const adapter = new UndoRedoAdapter(new UndoStack());
    adapter.beginTransaction('transform-move', cfg([node('a', 0)]));
    adapter.beginTransaction('transform-scale', cfg([node('a', 5)])); // ignored
    const entry = adapter.commitTransaction(cfg([node('a', 10)]));
    expect(entry!.operationKind).toBe('transform-move'); // first kind retained
  });
});

describe('UndoRedoAdapter pushOperation (add/remove/update)', () => {
  it('pushOperation computes diff + inverse and pushes', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    const prev = cfg([node('a', 0)]);
    const current = cfg([node('a', 50)]);
    const entry = adapter.pushOperation('update-symbol', prev, current);
    expect(entry).toBeDefined();
    expect(entry!.forward.updated[0].patch.x).toBe(50);
    expect(entry!.inverse.updated[0].patch.x).toBe(0);
  });

  it('pushOperation returns undefined for empty diff', () => {
    const adapter = new UndoRedoAdapter(new UndoStack());
    const same = cfg([node('a', 0)]);
    expect(adapter.pushOperation('update-symbol', same, same)).toBeUndefined();
  });

  it('undo/redo return inverse/forward diff respectively', () => {
    const adapter = new UndoRedoAdapter(new UndoStack());
    adapter.pushOperation('update-symbol', cfg([node('a', 0)]), cfg([node('a', 50)]));
    const inverse = adapter.undo();
    expect(inverse!.updated[0].patch.x).toBe(0);
    const forward = adapter.redo();
    expect(forward!.updated[0].patch.x).toBe(50);
  });

  it('undo on empty stack returns undefined (boundary no-undo)', () => {
    const adapter = new UndoRedoAdapter(new UndoStack());
    expect(adapter.undo()).toBeUndefined();
    expect(adapter.redo()).toBeUndefined();
  });
});

describe('UndoRedoAdapter applyDiff (working copy consistency)', () => {
  it('applyDiff applies a diff immutably to config', () => {
    const adapter = new UndoRedoAdapter(new UndoStack());
    const config = cfg([node('a', 0)]);
    const next = adapter.applyDiff(config, { added: [], removed: [], updated: [{ id: 'a', patch: { x: 99 } }] });
    expect(next.symbols[0].x).toBe(99);
    expect(config.symbols[0].x).toBe(0); // original unchanged
  });
});

describe('UndoRedoAdapter pushOperation coalesce (design-undo-redo.md §4.4)', () => {
  it('coalesces consecutive same-nodeId same-field update-symbol within window', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    vi.useFakeTimers();
    const t0 = Date.now();
    adapter.pushOperation('update-symbol', cfg([node('a', 0)]), cfg([node('a', 10)]));
    vi.setSystemTime(t0 + 100);
    adapter.pushOperation('update-symbol', cfg([node('a', 10)]), cfg([node('a', 20)]));
    vi.useRealTimers();
    // coalesced into 1 entry
    expect(stack.undoStackDepth).toBe(1);
    expect(stack.peekUndoTop()!.forward.updated[0].patch.x).toBe(20);
    // inverse preserves original value (0)
    expect(stack.peekUndoTop()!.inverse.updated[0].patch.x).toBe(0);
  });

  it('does NOT coalesce different nodeIds', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    adapter.pushOperation('update-symbol', cfg([node('a', 0)]), cfg([node('a', 10)]));
    adapter.pushOperation('update-symbol', cfg([node('a', 10), node('b', 0)]), cfg([node('a', 10), node('b', 5)]));
    expect(stack.undoStackDepth).toBe(2);
  });
});

describe('UndoRedoAdapter pushForward (structure diff + coalesce path)', () => {
  it('pushForward pushes structure diff directly', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    const prev = cfg([node('a', 0)]);
    const forward = { added: [node('b', 5)], removed: [], updated: [] };
    const entry = adapter.pushForward('add-symbol', forward, prev);
    expect(entry).toBeDefined();
    expect(stack.undoStackDepth).toBe(1);
  });

  it('pushForward returns undefined for empty diff', () => {
    const adapter = new UndoRedoAdapter(new UndoStack());
    expect(adapter.pushForward('add-symbol', { added: [], removed: [], updated: [] }, cfg([]))).toBeUndefined();
  });

  it('pushForward with coalesce=true merges consecutive same-field updates', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    adapter.pushForward(
      'update-symbol',
      { added: [], removed: [], updated: [{ id: 'a', patch: { x: 10 } }] },
      cfg([node('a', 0)]),
    );
    adapter.pushForward(
      'update-symbol',
      { added: [], removed: [], updated: [{ id: 'a', patch: { x: 20 } }] },
      cfg([node('a', 10)]),
      true,
    );
    expect(stack.undoStackDepth).toBe(1);
    expect(stack.peekUndoTop()!.forward.updated[0].patch.x).toBe(20);
  });

  it('pushForward with coalesce=true but non-coalescable kind pushes normally', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    adapter.pushForward(
      'add-symbol',
      { added: [node('b', 5)], removed: [], updated: [] },
      cfg([node('a', 0)]),
      true,
    );
    expect(stack.undoStackDepth).toBe(1);
  });
});

describe('UndoRedoAdapter transaction with variables (structuredCloneSafe coverage)', () => {
  it('beginTransaction snapshots config with variables and restores on commit inverse', () => {
    const stack = new UndoStack();
    const adapter = new UndoRedoAdapter(stack);
    const initial: ScadaConfig = {
      version: 1,
      symbols: [node('a', 0)],
      variables: [{ id: 'var1', source: 'static', value: 42 }],
    };
    adapter.beginTransaction('transform-move', initial);
    // simulate variable change during transaction
    const afterChange: ScadaConfig = {
      version: 1,
      symbols: [node('a', 5)],
      variables: [{ id: 'var1', source: 'static', value: 99 }],
    };
    const entry = adapter.commitTransaction(afterChange);
    expect(entry).toBeDefined();
    expect(entry!.inverse.variables).toBeDefined();
  });
});
