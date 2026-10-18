import { describe, expect, it } from 'vitest';
import { computeEdgeRoutes, type EdgeRouterEdgeInput, type EdgeRouterNodeInput } from './edge-router.js';

// FM-5 bisheng-build P0 (FM5-S1-C-A1): the designer canvas blanks with
// "Cannot read properties of undefined (reading 'x')" when computeEdgeRoutes
// receives input it cannot anchor — a node without measured geometry, or an
// edge whose port position is outside the four router sides (the bisheng
// condition node declares ports "right-top"/"right-bottom"). Routing must
// skip such edges onto the default bezier instead of throwing.

describe('computeEdgeRoutes defensive fallback (FM-5 bisheng-build P0)', () => {
  const ROUTED_NODES: EdgeRouterNodeInput[] = [
    { id: 'a', x: 0, y: 0, width: 100, height: 50 },
    { id: 'b', x: 300, y: 0, width: 100, height: 50 },
  ];

  it('falls back to the default route when a side is outside the router union (live bisheng trigger)', () => {
    const edges = [
      {
        id: 'e-branch',
        source: 'a',
        target: 'b',
        sourceSide: 'right-top',
        targetSide: 'left',
      } as unknown as EdgeRouterEdgeInput,
    ];
    let routes: Map<string, { route: { kind: string } }>;
    expect(() => {
      routes = computeEdgeRoutes(ROUTED_NODES, edges) as Map<string, { route: { kind: string } }>;
    }).not.toThrow();
    expect(routes!.get('e-branch')!.route).toEqual({ kind: 'default' });
  });

  it('falls back to the default route when an endpoint node lacks measured geometry', () => {
    const nodes: EdgeRouterNodeInput[] = [
      ...ROUTED_NODES,
      // schema-driven node that reached the router before measurement
      { id: 'ghost', x: undefined as unknown as number, y: undefined as unknown as number, width: undefined as unknown as number, height: undefined as unknown as number },
    ];
    const edges: EdgeRouterEdgeInput[] = [
      { id: 'e-ghost', source: 'a', target: 'ghost', sourceSide: 'right', targetSide: 'left' },
    ];
    let routes: Map<string, { route: { kind: string } }>;
    expect(() => {
      routes = computeEdgeRoutes(nodes, edges) as Map<string, { route: { kind: string } }>;
    }).not.toThrow();
    expect(routes!.get('e-ghost')!.route).toEqual({ kind: 'default' });
  });

  it('keeps valid edges routable when an unmeasured sibling node would poison the field metrics', () => {
    const nodes: EdgeRouterNodeInput[] = [
      ...ROUTED_NODES,
      { id: 'ghost', x: NaN, y: NaN, width: NaN, height: NaN },
    ];
    const edges: EdgeRouterEdgeInput[] = [
      // backward edge between two fully measured nodes: must still route via a finite lane
      { id: 'e-back', source: 'b', target: 'a', sourceSide: 'right', targetSide: 'left' },
    ];
    const routes = computeEdgeRoutes(nodes, edges);
    const spec = routes.get('e-back')!;
    expect(spec.route.kind).toBe('routed');
    if (spec.route.kind !== 'routed') return;
    for (const wp of spec.route.waypoints) {
      expect(Number.isFinite(wp.x)).toBe(true);
      expect(Number.isFinite(wp.y)).toBe(true);
    }
  });
});
