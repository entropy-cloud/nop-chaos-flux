import { describe, it, expect } from 'vitest';
import { computeInverse, applyDiffToConfig, findNodeForInverse } from './compute-inverse.js';
import type { ScadaConfig, ScadaConfigDiff, ScadaSymbolNode } from '../../serialization/config-types.js';

function configWith(symbols: ScadaSymbolNode[]): ScadaConfig {
  return { version: 1, symbols };
}

const prev: ScadaConfig = configWith([
  { id: 'a', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#f00' },
  { id: 'b', type: 'scada-ellipse', x: 30, y: 40, width: 60, height: 60 },
]);

describe('computeInverse (design-undo-redo.md §4.1.1)', () => {
  it('inverse.added = forward.removed (restores deleted nodes from prevSnapshot)', () => {
    const forward: ScadaConfigDiff = { added: [], removed: ['b'], updated: [] };
    const inverse = computeInverse(forward, prev);
    expect(inverse.added).toHaveLength(1);
    expect(inverse.added[0].id).toBe('b');
    expect(inverse.added[0].type).toBe('scada-ellipse');
  });

  it('inverse.removed = forward.added (removes newly added ids)', () => {
    const newNode: ScadaSymbolNode = { id: 'c', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 };
    const forward: ScadaConfigDiff = { added: [newNode], removed: [], updated: [] };
    const inverse = computeInverse(forward, prev);
    expect(inverse.removed).toEqual(['c']);
    expect(inverse.added).toEqual([]);
  });

  it('inverse.updated reverses updated patch using prevSnapshot original values', () => {
    const forward: ScadaConfigDiff = {
      added: [],
      removed: [],
      updated: [{ id: 'a', patch: { x: 999, fill: '#0f0' } }],
    };
    const inverse = computeInverse(forward, prev);
    expect(inverse.updated).toHaveLength(1);
    expect(inverse.updated[0].id).toBe('a');
    expect(inverse.updated[0].patch).toEqual({ x: 10, fill: '#f00' });
  });

  it('U4 round-trip: applyDiff(forward) then applyDiff(inverse) = identity (prevSnapshot)', () => {
    const forward: ScadaConfigDiff = {
      added: [{ id: 'c', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 }],
      removed: ['b'],
      updated: [{ id: 'a', patch: { x: 999, fill: '#0f0' } }],
    };
    const inverse = computeInverse(forward, prev);
    const afterForward = applyDiffToConfig(prev, forward);
    const afterInverse = applyDiffToConfig(afterForward, inverse);
    // afterInverse should equal prev (symbols same set + fields)
    expect(afterInverse.symbols.map((s) => s.id).sort()).toEqual(['a', 'b']);
    const a = afterInverse.symbols.find((s) => s.id === 'a')!;
    expect(a.x).toBe(10);
    expect(a.fill).toBe('#f00');
  });

  it('group→ungroup structural round-trip: forward(group) inverse(ungroup) restores children', () => {
    const before: ScadaConfig = configWith([
      { id: 'c1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
      { id: 'c2', type: 'scada-ellipse', x: 20, y: 20, width: 10, height: 10 },
    ]);
    const groupNode: ScadaSymbolNode = {
      id: 'grp',
      type: 'scada-group',
      x: 0,
      y: 0,
      children: [
        { id: 'c1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
        { id: 'c2', type: 'scada-ellipse', x: 20, y: 20, width: 10, height: 10 },
      ],
    };
    // group forward: removed = children ids, added = group node
    const forward: ScadaConfigDiff = { added: [groupNode], removed: ['c1', 'c2'], updated: [] };
    const inverse = computeInverse(forward, before);
    // inverse should restore: added = c1,c2 (from prevSnapshot); removed = grp
    expect(inverse.removed).toEqual(['grp']);
    expect(inverse.added.map((n) => n.id).sort()).toEqual(['c1', 'c2']);
    // round-trip
    const afterForward = applyDiffToConfig(before, forward);
    expect(afterForward.symbols.map((s) => s.id).sort()).toEqual(['grp']);
    const afterInverse = applyDiffToConfig(afterForward, inverse);
    expect(afterInverse.symbols.map((s) => s.id).sort()).toEqual(['c1', 'c2']);
  });

  it('variables inverse: added→removed, removed→added, updated reversed', () => {
    const withVars: ScadaConfig = {
      version: 1,
      symbols: [],
      variables: [
        { id: 'v1', source: 'static', value: 1 },
        { id: 'v2', source: 'static', value: 2 },
      ],
    };
    const forward: ScadaConfigDiff = {
      added: [],
      removed: [],
      updated: [],
      variables: {
        added: [{ id: 'v3', source: 'static', value: 3 }],
        removed: ['v2'],
        updated: [{ id: 'v1', patch: { value: 99 } }],
      },
    };
    const inverse = computeInverse(forward, withVars);
    expect(inverse.variables).toBeDefined();
    expect(inverse.variables!.removed).toEqual(['v3']);
    expect(inverse.variables!.added.map((v) => v.id)).toEqual(['v2']);
    expect(inverse.variables!.updated).toEqual([{ id: 'v1', patch: { value: 1 } }]);
  });

  it('computeInverse does NOT store full prevSnapshot (R4: only incremental fields)', () => {
    const forward: ScadaConfigDiff = { added: [], removed: [], updated: [{ id: 'a', patch: { x: 999 } }] };
    const inverse = computeInverse(forward, prev);
    // inverse.updated[0].patch only contains the reversed field (x), not the full node
    expect(Object.keys(inverse.updated[0].patch)).toEqual(['x']);
    // no prevSnapshot field on the diff
    expect((inverse as unknown as Record<string, unknown>).prevSnapshot).toBeUndefined();
  });

  it('findNodeForInverse walks group children', () => {
    const withGroup: ScadaConfig = configWith([
      { id: 'g', type: 'scada-group', x: 0, y: 0, children: [{ id: 'inner', type: 'scada-rect', x: 1, y: 2, width: 3, height: 4 }] },
    ]);
    expect(findNodeForInverse(withGroup, 'inner')?.id).toBe('inner');
    expect(findNodeForInverse(withGroup, 'missing')).toBeUndefined();
  });

  it('applyDiffToConfig returns a new config (immutable)', () => {
    const forward: ScadaConfigDiff = { added: [], removed: [], updated: [{ id: 'a', patch: { x: 50 } }] };
    const next = applyDiffToConfig(prev, forward);
    expect(next).not.toBe(prev);
    expect(next.symbols).not.toBe(prev.symbols);
    // original prev unchanged
    expect(prev.symbols.find((s) => s.id === 'a')!.x).toBe(10);
    expect(next.symbols.find((s) => s.id === 'a')!.x).toBe(50);
  });

  it('applyDiffToConfig removes nodes nested in group children', () => {
    const withGroup: ScadaConfig = configWith([
      {
        id: 'g',
        type: 'scada-group',
        x: 0,
        y: 0,
        children: [
          { id: 'c1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
          { id: 'c2', type: 'scada-rect', x: 20, y: 20, width: 10, height: 10 },
        ],
      },
    ]);
    const next = applyDiffToConfig(withGroup, { added: [], removed: ['c1'], updated: [] });
    const g = next.symbols.find((s) => s.id === 'g')!;
    expect(g.children!.map((c) => c.id)).toEqual(['c2']);
  });

  it('applyDiffToConfig updates nodes nested in group children', () => {
    const withGroup: ScadaConfig = configWith([
      {
        id: 'g',
        type: 'scada-group',
        x: 0,
        y: 0,
        children: [{ id: 'c1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
      },
    ]);
    const next = applyDiffToConfig(withGroup, {
      added: [],
      removed: [],
      updated: [{ id: 'c1', patch: { x: 99 } }],
    });
    const c1 = next.symbols.find((s) => s.id === 'g')!.children!.find((c) => c.id === 'c1')!;
    expect(c1.x).toBe(99);
  });

  it('applyDiffToConfig applies variables-only diff', () => {
    const withVars: ScadaConfig = {
      version: 1,
      symbols: [],
      variables: [
        { id: 'v1', source: 'static', value: 1 },
        { id: 'v2', source: 'static', value: 2 },
      ],
    };
    const next = applyDiffToConfig(withVars, {
      added: [],
      removed: [],
      updated: [],
      variables: {
        added: [{ id: 'v3', source: 'static', value: 3 }],
        removed: ['v2'],
        updated: [{ id: 'v1', patch: { value: 99 } }],
      },
    });
    expect(next.variables!.map((v) => v.id)).toEqual(['v1', 'v3']);
    expect(next.variables!.find((v) => v.id === 'v1')!.value).toBe(99);
  });

  it('applyDiffToConfig with only added (no removed/updated)', () => {
    const next = applyDiffToConfig(prev, {
      added: [{ id: 'c', type: 'scada-rect', x: 0, y: 0, width: 5, height: 5 }],
      removed: [],
      updated: [],
    });
    expect(next.symbols.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('skips inverse.added for removed ids absent from prevSnapshot', () => {
    const inverse = computeInverse({ added: [], removed: ['ghost'], updated: [] }, prev);
    expect(inverse.added).toEqual([]);
  });

  it('skips inverse.updated for updated ids absent from prevSnapshot', () => {
    const inverse = computeInverse(
      { added: [], removed: [], updated: [{ id: 'ghost', patch: { x: 1 } }] },
      prev,
    );
    expect(inverse.updated).toEqual([]);
  });

  it('variables inverse tolerates prevSnapshot without variables + missing var ids', () => {
    const noVars: ScadaConfig = { version: 1, symbols: [] };
    const inverse = computeInverse(
      {
        added: [],
        removed: [],
        updated: [],
        variables: {
          added: [],
          removed: ['ghost'],
          updated: [{ id: 'ghost2', patch: { value: 1 } }],
        },
      },
      noVars,
    );
    expect(inverse.variables).toBeDefined();
    expect(inverse.variables!.added).toEqual([]);
    expect(inverse.variables!.updated).toEqual([]);
  });

  it('applyDiffToConfig applies variables-only-removed diff when config has no variables', () => {
    const noVars: ScadaConfig = { version: 1, symbols: [] };
    const next = applyDiffToConfig(noVars, {
      added: [],
      removed: [],
      updated: [],
      variables: { added: [], removed: ['v1'], updated: [] },
    });
    expect(next.variables).toEqual([]);
  });
});
