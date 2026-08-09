import { describe, it, expect } from 'vitest';
import {
  normalizedToWorld,
  worldToNormalized,
  findSnapCandidate,
  generateConnectionId,
  readConnections,
  EDGE_SNAP_POSITIONS,
  DEFAULT_SNAP_THRESHOLD,
  type ScadaSymbolBounds,
} from './anchor-snap.js';

const device: ScadaSymbolBounds = { id: 'dev-1', x: 100, y: 200, width: 80, height: 60 };

describe('anchor-snap normalizedToWorld / worldToNormalized', () => {
  it('converts normalized {0,0} → bounds origin', () => {
    expect(normalizedToWorld({ x: 0, y: 0 }, device)).toEqual({ x: 100, y: 200 });
  });

  it('converts normalized {1,1} → bounds far corner', () => {
    expect(normalizedToWorld({ x: 1, y: 1 }, device)).toEqual({ x: 180, y: 260 });
  });

  it('converts normalized {0.5,0.5} → bounds center', () => {
    expect(normalizedToWorld({ x: 0.5, y: 0.5 }, device)).toEqual({ x: 140, y: 230 });
  });

  it('worldToNormalized is the inverse of normalizedToWorld (within bounds)', () => {
    const world = { x: 150, y: 250 };
    const normalized = worldToNormalized(world, device);
    expect(normalizedToWorld(normalized, device)).toEqual(world);
  });
});

describe('anchor-snap EDGE_SNAP_POSITIONS / DEFAULT_SNAP_THRESHOLD', () => {
  it('exposes 0/0.5/1 three-tier edge positions (design §4.1 rule 1)', () => {
    expect(EDGE_SNAP_POSITIONS).toEqual([0, 0.5, 1]);
  });

  it('default threshold is 8 px (design §4.2 rule 2)', () => {
    expect(DEFAULT_SNAP_THRESHOLD).toBe(8);
  });
});

describe('anchor-snap findSnapCandidate', () => {
  it('snaps to top edge mid-point when within threshold', () => {
    const topMidWorld = normalizedToWorld({ x: 0.5, y: 0 }, device);
    // pointer 2px off the anchor → within 8px threshold
    const pointer = { x: topMidWorld.x + 2, y: topMidWorld.y + 2 };
    const result = findSnapCandidate({ worldPoint: pointer, candidates: [device] });
    expect(result).toBeDefined();
    expect(result!.nodeId).toBe('dev-1');
    expect(result!.normalizedPoint).toEqual({ x: 0.5, y: 0 });
    expect(result!.edge).toBe('top');
  });

  it('snaps to right-middle edge (x:1, y:0.5)', () => {
    const rightMidWorld = normalizedToWorld({ x: 1, y: 0.5 }, device);
    const pointer = { x: rightMidWorld.x - 3, y: rightMidWorld.y };
    const result = findSnapCandidate({ worldPoint: pointer, candidates: [device] });
    expect(result).toBeDefined();
    expect(result!.normalizedPoint).toEqual({ x: 1, y: 0.5 });
    expect(result!.edge).toBe('right');
  });

  it('snaps to corner (top-left = {0,0})', () => {
    const cornerWorld = normalizedToWorld({ x: 0, y: 0 }, device);
    const result = findSnapCandidate({ worldPoint: cornerWorld, candidates: [device] });
    expect(result).toBeDefined();
    expect(result!.normalizedPoint).toEqual({ x: 0, y: 0 });
  });

  it('returns undefined when pointer is outside threshold (free drag)', () => {
    const farPoint = { x: 1000, y: 1000 };
    expect(findSnapCandidate({ worldPoint: farPoint, candidates: [device] })).toBeUndefined();
  });

  it('returns the nearest candidate among multiple symbols (multi-endpoint)', () => {
    const deviceA: ScadaSymbolBounds = { id: 'dev-a', x: 0, y: 0, width: 40, height: 40 };
    const deviceB: ScadaSymbolBounds = { id: 'dev-b', x: 200, y: 200, width: 40, height: 40 };
    // pointer near dev-a right-middle (40, 20)
    const pointer = { x: 38, y: 20 };
    const result = findSnapCandidate({ worldPoint: pointer, candidates: [deviceA, deviceB] });
    expect(result).toBeDefined();
    expect(result!.nodeId).toBe('dev-a');
    expect(result!.normalizedPoint).toEqual({ x: 1, y: 0.5 });
  });

  it('respects custom threshold', () => {
    const rightMidWorld = normalizedToWorld({ x: 1, y: 0.5 }, device);
    // 5px off: within default 8 but outside custom 4
    const pointer = { x: rightMidWorld.x + 5, y: rightMidWorld.y };
    expect(findSnapCandidate({ worldPoint: pointer, candidates: [device], threshold: 4 })).toBeUndefined();
    expect(findSnapCandidate({ worldPoint: pointer, candidates: [device], threshold: 8 })).toBeDefined();
  });

  it('excludes ids (C3: do not snap to self junction)', () => {
    const topMidWorld = normalizedToWorld({ x: 0.5, y: 0 }, device);
    const result = findSnapCandidate({
      worldPoint: topMidWorld,
      candidates: [device],
      excludeIds: ['dev-1'],
    });
    expect(result).toBeUndefined();
  });

  it('skips degenerate (zero-area) bounds', () => {
    const zero: ScadaSymbolBounds = { id: 'zero', x: 0, y: 0, width: 0, height: 0 };
    expect(findSnapCandidate({ worldPoint: { x: 0, y: 0 }, candidates: [zero] })).toBeUndefined();
  });
});

describe('anchor-snap generateConnectionId (C4 uniqueness)', () => {
  it('generates ${junctionId}-conn-${index}', () => {
    expect(generateConnectionId('j1', [])).toBe('j1-conn-0');
  });

  it('avoids collisions with existing ids', () => {
    const existing = [
      { id: 'j1-conn-0', x: 0, y: 0, direction: 'out' as const },
      { id: 'j1-conn-1', x: 1, y: 0, direction: 'out' as const },
    ];
    expect(generateConnectionId('j1', existing)).toBe('j1-conn-2');
  });

  it('skips a reused id when index collides', () => {
    const existing = [
      { id: 'j1-conn-0', x: 0, y: 0, direction: 'out' as const },
      { id: 'j1-conn-1', x: 1, y: 0, direction: 'out' as const },
      { id: 'j1-conn-2', x: 0, y: 1, direction: 'in' as const },
    ];
    expect(generateConnectionId('j1', existing)).toBe('j1-conn-3');
  });
});

describe('anchor-snap readConnections', () => {
  it('returns empty array when custom is undefined', () => {
    expect(readConnections(undefined)).toEqual([]);
  });

  it('returns empty array when connections is not an array', () => {
    expect(readConnections({ connections: 'no' })).toEqual([]);
  });

  it('reads connections array from custom', () => {
    const connections = [{ id: 'c1', x: 0, y: 0, direction: 'out' as const }];
    expect(readConnections({ connections })).toEqual(connections);
  });
});
