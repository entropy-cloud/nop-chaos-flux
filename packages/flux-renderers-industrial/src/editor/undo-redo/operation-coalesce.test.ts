import { describe, it, expect } from 'vitest';
import { tryCoalesce, DEFAULT_COALESCE_WINDOW_MS } from './operation-coalesce.js';
import type { UndoStackEntry } from './undo-stack.js';
import type { ScadaConfigDiff, ScadaSymbolNode } from '../../serialization/config-types.js';

function updateEntry(
  kind: 'update-symbol' | 'property-edit',
  nodeId: string,
  patch: Partial<ScadaSymbolNode>,
  timestamp: number,
): UndoStackEntry {
  const forward: ScadaConfigDiff = { added: [], removed: [], updated: [{ id: nodeId, patch }] };
  return { forward, inverse: { ...forward }, operationKind: kind, timestamp };
}

describe('operation-coalesce DEFAULT_COALESCE_WINDOW_MS', () => {
  it('default window is 500ms (design §4.4)', () => {
    expect(DEFAULT_COALESCE_WINDOW_MS).toBe(500);
  });
});

describe('tryCoalesce merge hits', () => {
  it('merges same nodeId + same field within window into one diff (final value wins)', () => {
    const top = updateEntry('property-edit', 'a', { fill: '#000' }, 1000);
    const incoming = updateEntry('property-edit', 'a', { fill: '#fff' }, 1200);
    const merged = tryCoalesce(top, incoming);
    expect(merged).toBeDefined();
    expect(merged!.operationKind).toBe('property-edit');
    expect(merged!.forward.updated[0].patch.fill).toBe('#fff');
    expect(merged!.timestamp).toBe(1200);
  });

  it('merges update-symbol + update-symbol same nodeId + same field', () => {
    const top = updateEntry('update-symbol', 'a', { x: 10 }, 1000);
    const incoming = updateEntry('update-symbol', 'a', { x: 20 }, 1100);
    const merged = tryCoalesce(top, incoming);
    expect(merged).toBeDefined();
    expect(merged!.forward.updated[0].patch.x).toBe(20);
  });

  it('merged inverse preserves the original (pre-coalesce) value', () => {
    const top = updateEntry('property-edit', 'a', { fill: '#000' }, 1000);
    // simulate top.inverse holds the original value (e.g. '#999')
    top.inverse = { added: [], removed: [], updated: [{ id: 'a', patch: { fill: '#999' } }] };
    const incoming = updateEntry('property-edit', 'a', { fill: '#fff' }, 1200);
    const merged = tryCoalesce(top, incoming);
    expect(merged!.inverse.updated[0].patch.fill).toBe('#999');
  });
});

describe('tryCoalesce merge misses (not coalesced)', () => {
  it('does not merge different nodeIds', () => {
    const top = updateEntry('property-edit', 'a', { fill: '#000' }, 1000);
    const incoming = updateEntry('property-edit', 'b', { fill: '#fff' }, 1100);
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });

  it('does not merge different field sets', () => {
    const top = updateEntry('property-edit', 'a', { fill: '#000' }, 1000);
    const incoming = updateEntry('property-edit', 'a', { x: 10 }, 1100);
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });

  it('does not merge when time gap exceeds window', () => {
    const top = updateEntry('property-edit', 'a', { fill: '#000' }, 1000);
    const incoming = updateEntry('property-edit', 'a', { fill: '#fff' }, 1000 + DEFAULT_COALESCE_WINDOW_MS + 1);
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });

  it('does not merge transform ops (each pointerup = independent transaction)', () => {
    const top: UndoStackEntry = {
      forward: { added: [], removed: [], updated: [{ id: 'a', patch: { x: 10 } }] },
      inverse: { added: [], removed: [], updated: [{ id: 'a', patch: { x: 0 } }] },
      operationKind: 'transform-move',
      timestamp: 1000,
    };
    const incoming = { ...top, timestamp: 1100 };
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });

  it('does not merge connection ops (each pointerup = independent transaction)', () => {
    const top: UndoStackEntry = {
      forward: { added: [], removed: [], updated: [{ id: 'a', patch: { x: 10 } }] },
      inverse: { added: [], removed: [], updated: [{ id: 'a', patch: { x: 0 } }] },
      operationKind: 'connection-update',
      timestamp: 1000,
    };
    const incoming = { ...top, timestamp: 1100 };
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });

  it('does not merge structural diffs (added/removed non-empty)', () => {
    const top: UndoStackEntry = {
      forward: { added: [{ id: 'c', type: 'scada-rect', x: 0, y: 0, width: 1, height: 1 }], removed: [], updated: [] },
      inverse: { added: [], removed: ['c'], updated: [] },
      operationKind: 'update-symbol',
      timestamp: 1000,
    };
    const incoming = { ...top, timestamp: 1100 };
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });

  it('returns undefined when top is undefined', () => {
    const incoming = updateEntry('property-edit', 'a', { fill: '#fff' }, 1000);
    expect(tryCoalesce(undefined, incoming)).toBeUndefined();
  });
});

describe('tryCoalesce M3 group merge (§4.4 align/distribute/z-order consecutive ops)', () => {
  function groupEntry(
    kind: 'transform-move' | 'z-order',
    group: string,
    forward: ScadaConfigDiff,
    inverse: ScadaConfigDiff,
    timestamp: number,
  ): UndoStackEntry {
    return { forward, inverse, operationKind: kind, timestamp, coalesceGroup: group };
  }

  it('merges consecutive same-group align ops (forward=latest, inverse=original)', () => {
    const top = groupEntry(
      'transform-move',
      'align:left',
      { added: [], removed: [], updated: [{ id: 'a', patch: { x: 5 } }] },
      { added: [], removed: [], updated: [{ id: 'a', patch: { x: 0 } }] },
      1000,
    );
    const incoming = groupEntry(
      'transform-move',
      'align:left',
      { added: [], removed: [], updated: [{ id: 'a', patch: { x: 10 } }] },
      { added: [], removed: [], updated: [{ id: 'a', patch: { x: 5 } }] },
      1100,
    );
    const merged = tryCoalesce(top, incoming);
    expect(merged).toBeDefined();
    // forward takes latest state (x=10)
    expect(merged!.forward.updated[0].patch.x).toBe(10);
    // inverse preserves original state (x=0) → undo reverts to before the run
    expect(merged!.inverse.updated[0].patch.x).toBe(0);
    expect(merged!.coalesceGroup).toBe('align:left');
    expect(merged!.timestamp).toBe(1100);
  });

  it('does NOT merge different groups (align:left vs align:right)', () => {
    const top = groupEntry(
      'transform-move',
      'align:left',
      { added: [], removed: [], updated: [{ id: 'a', patch: { x: 5 } }] },
      { added: [], removed: [], updated: [] },
      1000,
    );
    const incoming = groupEntry(
      'transform-move',
      'align:right',
      { added: [], removed: [], updated: [{ id: 'a', patch: { x: 50 } }] },
      { added: [], removed: [], updated: [] },
      1100,
    );
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });

  it('does NOT merge when window exceeded', () => {
    const top = groupEntry(
      'z-order',
      'zorder:toTop',
      { added: [], removed: ['a'], updated: [] },
      { added: [], removed: ['a'], updated: [] },
      1000,
    );
    const incoming = groupEntry(
      'z-order',
      'zorder:toTop',
      { added: [], removed: ['b'], updated: [] },
      { added: [], removed: ['b'], updated: [] },
      1000 + DEFAULT_COALESCE_WINDOW_MS + 1,
    );
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });

  it('merges consecutive z-order structural diffs (full-replace)', () => {
    const top = groupEntry(
      'z-order',
      'zorder:toTop',
      { added: [{ id: 'a', type: 'scada-rect' }], removed: ['a'], updated: [] },
      { added: [{ id: 'a', type: 'scada-rect' }], removed: ['a'], updated: [] },
      1000,
    );
    const incoming = groupEntry(
      'z-order',
      'zorder:toTop',
      { added: [{ id: 'b', type: 'scada-rect' }], removed: ['b'], updated: [] },
      { added: [{ id: 'b', type: 'scada-rect' }], removed: ['b'], updated: [] },
      1100,
    );
    const merged = tryCoalesce(top, incoming);
    expect(merged).toBeDefined();
    // forward = latest (b moved); inverse = original (a order)
    expect(merged!.forward.removed).toEqual(['b']);
    expect(merged!.inverse.removed).toEqual(['a']);
  });

  it('does NOT coalesce transform-move drag entries (no coalesceGroup)', () => {
    // drag transform-move without coalesceGroup should not merge (pointerup = independent transaction)
    const top: UndoStackEntry = {
      forward: { added: [], removed: [], updated: [{ id: 'a', patch: { x: 10, y: 10 } }] },
      inverse: { added: [], removed: [], updated: [{ id: 'a', patch: { x: 0, y: 0 } }] },
      operationKind: 'transform-move',
      timestamp: 1000,
    };
    const incoming: UndoStackEntry = {
      forward: { added: [], removed: [], updated: [{ id: 'a', patch: { x: 20, y: 20 } }] },
      inverse: { added: [], removed: [], updated: [{ id: 'a', patch: { x: 10, y: 10 } }] },
      operationKind: 'transform-move',
      timestamp: 1100,
    };
    expect(tryCoalesce(top, incoming)).toBeUndefined();
  });
});
