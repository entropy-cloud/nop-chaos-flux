import { describe, it, expect } from 'vitest';
import {
  collectSymbolBounds,
  beginConnectionDrag,
  updateDragCandidate,
  commitConnectionDrag,
  programmaticConnect,
  programmaticDisconnect,
  listAllConnections,
  recomputeJunctionAfterMove,
  type JunctionNode,
} from './connection-adapter.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';

function junctionNode(connections: unknown[]): JunctionNode {
  return {
    id: 'j1',
    type: 'scada-pipe-junction',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    custom: { connections },
  };
}

const symbols: ScadaSymbolNode[] = [
  { id: 'j1', type: 'scada-pipe-junction', x: 0, y: 0, width: 100, height: 100, custom: { connections: [] } },
  { id: 'dev-1', type: 'scada-rect', x: 300, y: 100, width: 80, height: 60 },
];

describe('collectSymbolBounds', () => {
  it('flattens symbols including group children with accumulated parent offset', () => {
    // plan 2026-08-09-0648-3 Phase 1 / P2-5：父 group 非零偏移——collectSymbolBounds 经
    // collectWorldBounds 累加 parent offset（旧 x:0/y:0 → world==local，累加逻辑无论对错都通过=false-green）。
    const withGroup: ScadaSymbolNode[] = [
      { id: 'g', type: 'scada-group', x: 100, y: 50, children: [{ id: 'c', type: 'scada-rect', x: 5, y: 6, width: 10, height: 12 }] },
    ];
    const bounds = collectSymbolBounds(withGroup);
    expect(bounds).toEqual([
      { id: 'g', x: 100, y: 50, width: 0, height: 0 },
      // c local (5,6) + 父偏移 (100,50) → world (105, 56)。父偏移非 0 → 真断言。
      { id: 'c', x: 105, y: 56, width: 10, height: 12 },
    ]);
  });

  it('defaults undefined x/y/width/height to 0', () => {
    const bounds = collectSymbolBounds([{ id: 'bare', type: 'scada-rect' }]);
    expect(bounds).toEqual([{ id: 'bare', x: 0, y: 0, width: 0, height: 0 }]);
  });
});

describe('connection drag state machine', () => {
  it('beginConnectionDrag: new endpoint (not redrag)', () => {
    const state = beginConnectionDrag({ junctionId: 'j1' });
    expect(state.junctionId).toBe('j1');
    expect(state.isRedrag).toBe(false);
    expect(state.connectionId).toBe('j1-conn-0');
  });

  it('beginConnectionDrag: redrag snapshots original connection', () => {
    const original = { id: 'j1-conn-0', x: 0.5, y: 0, direction: 'out' as const, target: 'dev-1' };
    const state = beginConnectionDrag({ junctionId: 'j1', connectionId: 'j1-conn-0', existingConnection: original });
    expect(state.isRedrag).toBe(true);
    expect(state.originalConnection).toEqual(original);
  });

  it('updateDragCandidate + commitConnectionDrag: writes connection on snap', () => {
    const node = junctionNode([]);
    const state = beginConnectionDrag({ junctionId: 'j1' });
    // dev-1 right-middle world = (380, 130)
    updateDragCandidate(state, {
      worldPoint: { x: 378, y: 130 },
      candidates: collectSymbolBounds(symbols),
    });
    expect(state.currentCandidate).toBeDefined();
    const result = commitConnectionDrag(state, node);
    expect(result).toBeDefined();
    expect(result!.kind).toBe('create');
    expect(result!.junctionId).toBe('j1');
    expect(result!.written.target).toBe('dev-1');
    expect(result!.written.x).toBe(1);
    expect(result!.written.y).toBe(0.5);
    expect(result!.connections).toHaveLength(1);
  });

  it('commitConnectionDrag: noop when no candidate (new endpoint released to empty space)', () => {
    const node = junctionNode([]);
    const state = beginConnectionDrag({ junctionId: 'j1' });
    updateDragCandidate(state, {
      worldPoint: { x: 9999, y: 9999 },
      candidates: collectSymbolBounds(symbols),
    });
    expect(state.currentCandidate).toBeUndefined();
    expect(commitConnectionDrag(state, node)).toBeUndefined();
  });

  it('commitConnectionDrag: excludes self junction (C3)', () => {
    const state = beginConnectionDrag({ junctionId: 'j1' });
    // pointer on j1 itself — should not snap to j1
    updateDragCandidate(state, {
      worldPoint: { x: 100, y: 50 },
      candidates: collectSymbolBounds(symbols),
    });
    const candidate = state.currentCandidate;
    expect(candidate?.nodeId).not.toBe('j1');
  });

    it('commitConnectionDrag: redrag overwrites existing connection', () => {
    const existing = [{ id: 'j1-conn-0', x: 0.5, y: 0, direction: 'out' as const, target: 'old' }];
    const node = junctionNode(existing);
    const state = beginConnectionDrag({      junctionId: 'j1',
      connectionId: 'j1-conn-0',
      existingConnection: existing[0],
    });
    updateDragCandidate(state, {
      worldPoint: { x: 378, y: 130 },
      candidates: collectSymbolBounds(symbols),
    });
    const result = commitConnectionDrag(state, node);
    expect(result!.kind).toBe('redrag');
    expect(result!.written.target).toBe('dev-1');
    expect(result!.connections).toHaveLength(1);
  });
});

describe('programmaticConnect (test handle connect)', () => {
  it('writes a new connection via linkage algorithm', () => {
    const node = junctionNode([]);
    const result = programmaticConnect({
      junctionNode: node,
      connectionId: 'j1-conn-0',
      targetNodeId: 'dev-1',
      targetAnchor: { x: 1, y: 0.5 },
      junction: { x: 0, y: 0, width: 100, height: 100 },
      targetDevice: { x: 300, y: 100, width: 80, height: 60 },
    });
    expect(result.written.target).toBe('dev-1');
    expect(result.written.x).toBeCloseTo(3.8);
    expect(result.written.y).toBeCloseTo(1.3);
    expect(result.connections).toHaveLength(1);
  });

  it('overwrites existing connection by id', () => {
    const node = junctionNode([{ id: 'j1-conn-0', x: 0, y: 0, direction: 'in', target: 'old' }]);
    const result = programmaticConnect({
      junctionNode: node,
      connectionId: 'j1-conn-0',
      targetNodeId: 'dev-1',
      targetAnchor: { x: 1, y: 0.5 },
      junction: { x: 0, y: 0, width: 100, height: 100 },
      targetDevice: { x: 300, y: 100, width: 80, height: 60 },
    });
    expect(result.connections).toHaveLength(1);
    expect(result.written.target).toBe('dev-1');
    expect(result.written.direction).toBe('out');
  });
});

describe('programmaticDisconnect', () => {
  it('removes a connection by id', () => {
    const node = junctionNode([
      { id: 'c1', x: 0, y: 0, direction: 'out', target: 'dev-1' },
      { id: 'c2', x: 1, y: 0, direction: 'in', target: 'dev-2' },
    ]);
    const result = programmaticDisconnect({ junctionNode: node, connectionId: 'c1' });
    expect(result!.removed.id).toBe('c1');
    expect(result!.connections).toHaveLength(1);
    expect(result!.connections[0].id).toBe('c2');
  });

  it('returns undefined when connectionId not found', () => {
    const node = junctionNode([{ id: 'c1', x: 0, y: 0, direction: 'out', target: 'dev-1' }]);
    expect(programmaticDisconnect({ junctionNode: node, connectionId: 'nope' })).toBeUndefined();
  });
});

describe('listAllConnections (with dangling mark)', () => {
  it('marks connections whose target does not exist as dangling', () => {
    const syms: ScadaSymbolNode[] = [
      {
        id: 'j1',
        type: 'scada-pipe-junction',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        custom: {
          connections: [
            { id: 'c1', x: 0, y: 0, direction: 'out', target: 'dev-1' },
            { id: 'c2', x: 0, y: 0, direction: 'out', target: 'gone' },
            { id: 'c3', x: 0, y: 0, direction: 'out' },
          ],
        },
      },
      { id: 'dev-1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
    ];
    const list = listAllConnections({ symbols: syms });
    expect(list).toHaveLength(3);
    const byId = new Map(list.map((l) => [l.connection.id, l]));
    expect(byId.get('c1')!.dangling).toBe(false);
    expect(byId.get('c2')!.dangling).toBe(true);
    expect(byId.get('c3')!.dangling).toBe(true);
  });

  it('walks group children', () => {
    const syms: ScadaSymbolNode[] = [
      {
        id: 'g',
        type: 'scada-group',
        x: 0,
        y: 0,
        children: [
          {
            id: 'j1',
            type: 'scada-pipe-junction',
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            custom: { connections: [{ id: 'c1', x: 0, y: 0, direction: 'out', target: 'dev-1' }] },
          },
        ],
      },
      { id: 'dev-1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
    ];
    const list = listAllConnections({ symbols: syms });
    expect(list).toHaveLength(1);
    expect(list[0].junctionId).toBe('j1');
  });

  // plan 2026-08-08-0900-1 Phase 1 / P2 #8（Proof-only 复核，不重复修）：
  // connection-adapter.ts:263-269 已递归 collectIds（含 group 子树），group child 作为 connection target
  // 不再被误报 dangling。复核通过 → 记 residual，无 Fix。
  it('does NOT misreport a group child as dangling when it is a connection target (P2 #8 residual proof)', () => {
    const syms: ScadaSymbolNode[] = [
      {
        id: 'g',
        type: 'scada-group',
        x: 0,
        y: 0,
        children: [
          { id: 'child-dev', type: 'scada-rect', x: 5, y: 6, width: 10, height: 12 },
        ],
      },
      {
        id: 'j1',
        type: 'scada-pipe-junction',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        custom: { connections: [{ id: 'c1', x: 0, y: 0, direction: 'out', target: 'child-dev' }] },
      },
    ];
    const list = listAllConnections({ symbols: syms });
    expect(list).toHaveLength(1);
    expect(list[0].connection.target).toBe('child-dev');
    // group child target 在递归 collectIds 收集的 id 集中 → 不误报 dangling。
    expect(list[0].dangling).toBe(false);
  });
});

describe('recomputeJunctionAfterMove (linkage)', () => {
  it('returns recomputed normalized points for valid connections', () => {
    const node = junctionNode([{ id: 'c1', x: 0, y: 0, direction: 'out', target: 'dev-1' }]);
    const result = recomputeJunctionAfterMove({ junctionNode: node, symbols });
    expect(result).toBeDefined();
    expect(result!).toHaveLength(1);
    // dev-1 right-middle world = (380, 130); normalized = (3.8, 1.3)
    expect(result![0].point.x).toBeCloseTo(3.8);
    expect(result![0].point.y).toBeCloseTo(1.3);
  });

  it('returns undefined when no connections', () => {
    const node = junctionNode([]);
    expect(recomputeJunctionAfterMove({ junctionNode: node, symbols })).toBeUndefined();
  });

  it('returns undefined when all connections are dangling (target missing)', () => {
    const node = junctionNode([{ id: 'c1', x: 0, y: 0, direction: 'out', target: 'gone' }]);
    expect(recomputeJunctionAfterMove({ junctionNode: node, symbols })).toBeUndefined();
  });

  it('defaults undefined geometry fields to 0 (defensive ?? 0)', () => {
    const node: JunctionNode = { id: 'j1', type: 'scada-pipe-junction', custom: { connections: [{ id: 'c1', x: 0, y: 0, direction: 'out', target: 'dev-1' }] } };
    const result = recomputeJunctionAfterMove({ junctionNode: node, symbols });
    expect(result).toBeDefined();
  });
});

describe('programmaticConnect / programmaticDisconnect defensive branches', () => {
  it('programmaticConnect handles undefined junctionNode (treats as empty connections)', () => {
    const result = programmaticConnect({
      junctionNode: undefined,
      connectionId: 'c1',
      targetNodeId: 'dev-1',
      targetAnchor: { x: 1, y: 0.5 },
      junction: { x: 0, y: 0, width: 100, height: 100 },
      targetDevice: { x: 300, y: 100, width: 80, height: 60 },
    });
    expect(result.connections).toHaveLength(1);
  });

  it('programmaticDisconnect returns undefined when junctionNode is undefined', () => {
    expect(programmaticDisconnect({ junctionNode: undefined, connectionId: 'c1' })).toBeUndefined();
  });
});

describe('plan 2026-08-07-1835-1 Phase 2/3 defensive branches', () => {
  it('commitConnectionDrag handles undefined junctionNode (treats as empty connections list)', () => {
    // covers the `junctionNode ? readConnections(...) : []` falsy branch.
    const state = beginConnectionDrag({ junctionId: 'j1' });
    updateDragCandidate(state, {
      worldPoint: { x: 380, y: 130 },
      candidates: collectSymbolBounds(symbols),
    });
    expect(state.currentCandidate).toBeDefined();
    const result = commitConnectionDrag(state, undefined);
    expect(result).toBeDefined();
    expect(result!.written.target).toBe(state.currentCandidate!.nodeId);
    expect(result!.connections).toHaveLength(1);
  });

  it('recomputeJunctionAfterMove: junctionNode missing from symbols falls back to local coords', () => {
    // Construct a junctionNode that is NOT in the symbols list — collectSymbolBounds won't include it,
    // exercising the `junctionWorld ?? fallback` defensive branch.
    const orphan: JunctionNode = {
      id: 'orphan-junction',
      type: 'scada-pipe-junction',
      x: 50,
      y: 50,
      width: 20,
      height: 20,
      custom: { connections: [{ id: 'c1', x: 0, y: 0, direction: 'out', target: 'dev-1' }] },
    };
    const result = recomputeJunctionAfterMove({ junctionNode: orphan, symbols });
    expect(result).toBeDefined();
    // dev-1 right-middle world = (380, 130); junction fallback local = (50, 50), size 20×20.
    // normalized = (380-50)/20, (130-50)/20 = (16.5, 4).
    expect(result![0].point.x).toBeCloseTo(16.5, 3);
    expect(result![0].point.y).toBeCloseTo(4, 3);
  });
});
