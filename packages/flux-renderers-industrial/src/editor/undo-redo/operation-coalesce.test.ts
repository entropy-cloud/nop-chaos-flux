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
