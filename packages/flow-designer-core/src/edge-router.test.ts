import { describe, expect, it } from 'vitest';
import {
  computeEdgeRoutes,
  segmentsClearOfBoxes,
  type EdgeRouterNodeInput,
} from './edge-router.js';

// Geometry mirrors the taskflow-workflow-schema demo (TF-1's flagship scene):
// script-1(250,200) invoke-1(450,200) if-1(650,200) delay-1(650,400)
// graph-1(250,400), all 192x112.
const NODES: EdgeRouterNodeInput[] = [
  { id: 'script-1', x: 250, y: 200, width: 192, height: 112 },
  { id: 'invoke-1', x: 450, y: 200, width: 192, height: 112 },
  { id: 'if-1', x: 650, y: 200, width: 192, height: 112 },
  { id: 'delay-1', x: 650, y: 400, width: 192, height: 112 },
  { id: 'graph-1', x: 250, y: 400, width: 192, height: 112 },
];

describe('computeEdgeRoutes (plan 640 UR-13)', () => {
  it('routes the e8-class backward edge (right exit -> left target) through the right lane and a gap corridor, clear of every node box', () => {
    const routes = computeEdgeRoutes(
      NODES,
      [{ id: 'e8', source: 'delay-1', target: 'invoke-1', sourceSide: 'right', targetSide: 'left' }],
    );
    const spec = routes.get('e8')!;
    expect(spec.route.kind).toBe('routed');
    if (spec.route.kind !== 'routed') return;

    const laneX = spec.route.waypoints[3].x;
    const maxRight = Math.max(...NODES.map((n) => n.x + n.width));
    expect(laneX).toBeGreaterThan(maxRight);
    expect(spec.route.waypoints[1].x).toBeGreaterThanOrEqual(maxRight - 1);
    expect(segmentsClearOfBoxes(spec.route.waypoints, NODES.map((n) => ({
      x: n.x, y: n.y, right: n.x + n.width, bottom: n.y + n.height,
    })))).toBe(true);
  });

  it('routes the e7-class backward edge (left exit) through the source gap column and the target corridor', () => {
    const routes = computeEdgeRoutes(
      NODES,
      [{ id: 'e7', source: 'invoke-1', target: 'graph-1', sourceSide: 'left', targetSide: 'left' }],
    );
    const spec = routes.get('e7')!;
    expect(spec.route.kind).toBe('routed');
    if (spec.route.kind !== 'routed') return;
    // exit gap sits between invoke-1's left neighbours and its own left edge
    const exitX = spec.route.waypoints[1].x;
    expect(exitX).toBeLessThan(450);
    expect(exitX).toBeGreaterThan(442);
    expect(segmentsClearOfBoxes(spec.route.waypoints, NODES.map((n) => ({
      x: n.x, y: n.y, right: n.x + n.width, bottom: n.y + n.height,
    })))).toBe(true);
  });

  it('bundles forward edges sharing a source handle with separated x-lane offsets (GR-2)', () => {
    // Two forward edges fanning out of the same right-side source handle
    // (the GR-2 fan-out shape) — both classified default-chain, bundled by
    // the shared source anchor.
    const routes = computeEdgeRoutes(
      NODES,
      [
        { id: 'f1', source: 'script-1', target: 'invoke-1', sourceSide: 'right', targetSide: 'left' },
        { id: 'f2', source: 'script-1', target: 'if-1', sourceSide: 'right', targetSide: 'left' },
      ],
    );
    const f1 = routes.get('f1')!;
    const f2 = routes.get('f2')!;
    expect(f1.route.kind).toBe('bundled');
    expect(f2.route.kind).toBe('bundled');
    expect(f1.route.axis).toBe('x');
    const o1 = (f1.route as { centerOffset: number }).centerOffset;
    const o2 = (f2.route as { centerOffset: number }).centerOffset;
    expect(o2 - o1).toBe(12);
  });

  it('keeps forward-chain edges on the default bezier path', () => {
    const routes = computeEdgeRoutes(
      NODES,
      [{ id: 'e4', source: 'invoke-1', target: 'delay-1', sourceSide: 'right', targetSide: 'left' }],
    );
    expect(routes.get('e4')!.route.kind).toBe('default');
  });

  it('characterizes the default bezier contract the consumer must preserve byte-for-byte (plan 640)', () => {
    // The consumer (DesignerXyflowEdge) renders default-route edges through
    // getBezierPath with exactly these inputs — this pins the contract so any
    // accidental change to the default dispatch fails here first.
    const routes = computeEdgeRoutes(
      NODES,
      [{ id: 'e4', source: 'invoke-1', target: 'delay-1', sourceSide: 'right', targetSide: 'left' }],
    );
    const route = routes.get('e4')!.route;
    expect(route).toEqual({ kind: 'default' });
  });
});
