import { describe, it, expect } from 'vitest';
import {
  recomputeConnectionAnchor,
  resolveTargetAnchor,
  recomputeJunctionConnections,
  type LinkGeometry,
} from './connection-link.js';

const junction: LinkGeometry = { x: 0, y: 0, width: 100, height: 100 };
const targetDevice: LinkGeometry = { x: 300, y: 100, width: 80, height: 60 };

describe('recomputeConnectionAnchor (design-connection.md §4.5)', () => {
  it('returns normalized point so stub endpoint world coord = target anchor world coord', () => {
    const targetAnchor = { x: 1, y: 0.5 };
    const point = recomputeConnectionAnchor({
      connection: { id: 'c1', target: 'dev-1', direction: 'out' },
      junction,
      targetDevice,
      targetAnchor,
    });
    // target anchor world = (300 + 1*80, 100 + 0.5*60) = (380, 130)
    // normalized = (380 - 0)/100 = 3.8, (130 - 0)/100 = 1.3
    expect(point).toEqual({ x: 3.8, y: 1.3 });
  });

  it('produces a point whose normalizedToWorld equals the target anchor world coord', () => {
    const targetAnchor = { x: 0, y: 0.5 };
    const point = recomputeConnectionAnchor({
      connection: { id: 'c1', target: 'dev-1', direction: 'out' },
      junction,
      targetDevice,
      targetAnchor,
    });
    const stubEndpointWorld = {
      x: junction.x + point.x * junction.width,
      y: junction.y + point.y * junction.height,
    };
    const expectedTargetWorld = {
      x: targetDevice.x + targetAnchor.x * targetDevice.width,
      y: targetDevice.y + targetAnchor.y * targetDevice.height,
    };
    expect(stubEndpointWorld).toEqual(expectedTargetWorld);
  });

  it('does NOT clamp out-of-range normalized point (C1 risk: target far from junction)', () => {
    const farDevice: LinkGeometry = { x: 10000, y: 10000, width: 50, height: 50 };
    const point = recomputeConnectionAnchor({
      connection: { id: 'c1', target: 'far', direction: 'out' },
      junction,
      targetDevice: farDevice,
      targetAnchor: { x: 0, y: 0 },
    });
    expect(point.x).toBeGreaterThan(1);
    expect(point.y).toBeGreaterThan(1);
  });

  it('respects non-origin junction offset', () => {
    const offsetJunction: LinkGeometry = { x: 50, y: 50, width: 20, height: 20 };
    const dev: LinkGeometry = { x: 100, y: 100, width: 40, height: 40 };
    const point = recomputeConnectionAnchor({
      connection: { id: 'c1', target: 'dev', direction: 'out' },
      junction: offsetJunction,
      targetDevice: dev,
      targetAnchor: { x: 0, y: 0 },
    });
    // target world = (100, 100); normalized = (100-50)/20=2.5, (100-50)/20=2.5
    expect(point).toEqual({ x: 2.5, y: 2.5 });
  });
});

describe('resolveTargetAnchor', () => {
  it('defaults to right-middle {x:1, y:0.5} (M2 default policy)', () => {
    expect(resolveTargetAnchor({ id: 'c1', x: 0, y: 0, direction: 'out', target: 'dev' })).toEqual({
      x: 1,
      y: 0.5,
    });
  });
});

describe('recomputeJunctionConnections (batch linkage)', () => {
  it('recomputes all valid (non-dangling) connections', () => {
    const connections = [
      { id: 'c1', x: 0, y: 0, direction: 'out' as const, target: 'dev-a' },
      { id: 'c2', x: 0, y: 0, direction: 'in' as const, target: 'dev-b' },
    ];
    const deviceBoundsById = new Map<string, LinkGeometry>([
      ['dev-a', { x: 200, y: 0, width: 40, height: 40 }],
      ['dev-b', { x: 0, y: 200, width: 40, height: 40 }],
    ]);
    const result = recomputeJunctionConnections({ junction, connections, deviceBoundsById });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.connectionId)).toEqual(['c1', 'c2']);
    // dev-a right-middle world = (240, 20); normalized = (2.4, 0.2)
    expect(result[0].point).toEqual({ x: 2.4, y: 0.2 });
  });

  it('skips dangling connections (target not in deviceBoundsById)', () => {
    const connections = [
      { id: 'c1', x: 0, y: 0, direction: 'out' as const, target: 'gone' },
    ];
    const result = recomputeJunctionConnections({
      junction,
      connections,
      deviceBoundsById: new Map(),
    });
    expect(result).toEqual([]);
  });

  it('skips connections with no target', () => {
    const connections = [{ id: 'c1', x: 0, y: 0, direction: 'out' as const }];
    const result = recomputeJunctionConnections({
      junction,
      connections,
      deviceBoundsById: new Map([['dev', { x: 0, y: 0, width: 10, height: 10 }]]),
    });
    expect(result).toEqual([]);
  });
});
