/**
 * Bounded edge router (plan 640, UR-13): classifies edges and, for backward
 * (loopback) edges, emits explicit waypoints that route around the node field
 * via a gap-column corridor into the target handle.
 *
 * Design (docs/plans/640-cross-roadmap-ur13-edge-router-plan.md): routing
 * returns explicit waypoints because getSmoothStepPath centerX/centerY
 * injection is axis/polarity dependent and cannot express backward lanes.
 * Forward edges return `default` and keep the existing bezier rendering
 * byte-for-byte (zero regression surface). Edges sharing a handle on the same
 * side are bundled with a center offset on their handle axis.
 *
 * Defensive contract (FM-5 bisheng-build P0): an edge whose endpoint lacks
 * measured geometry or whose side is not one of the four router sides (demo
 * schemas declare ports like "right-top") has no resolvable handle anchor —
 * such edges are skipped by routing and fall back to the default bezier
 * instead of throwing and blanking the whole designer canvas.
 */

export interface EdgeRouterNodeInput {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EdgeRouterSide = 'top' | 'right' | 'bottom' | 'left';

export interface EdgeRouterEdgeInput {
  id: string;
  source: string;
  target: string;
  sourceSide: EdgeRouterSide;
  targetSide: EdgeRouterSide;
}

export type EdgeRoute =
  | { kind: 'default' }
  | {
      kind: 'routed';
      waypoints: Array<{ x: number; y: number }>;
      /** true when the target is entered vertically through a gap corridor */
      corridorEntry: boolean;
    }
  | { kind: 'bundled'; axis: 'x' | 'y'; centerOffset: number; offset: number };

export interface EdgeRouteSpec {
  route: EdgeRoute;
  /** lateral shift for the anchor point when several edges share a handle */
  anchorShift: number;
}

export interface EdgeRouterOptions {
  /** horizontal distance between parallel loopback lanes */
  laneGap?: number;
  /** right margin between the node field and the first lane */
  laneBase?: number;
  /** vertical margin between the node field and the return corridor */
  corridorMargin?: number;
  /** lateral distance between bundled edges sharing a handle */
  pairGap?: number;
  /** epsilon for the backward-edge classification */
  backwardEpsilon?: number;
}

const DEFAULT_LANE_GAP = 16;
const DEFAULT_LANE_BASE = 24;
const DEFAULT_CORRIDOR_MARGIN = 24;
const DEFAULT_PAIR_GAP = 12;
const DEFAULT_BACKWARD_EPSILON = 1;

const ROUTER_SIDES: ReadonlySet<string> = new Set<EdgeRouterSide>(['top', 'right', 'bottom', 'left']);

/** Runtime guard: schema-driven nodes can reach the router before measurement
 * (x/y/width/height undefined or non-finite). */
function hasMeasuredGeometry(node: EdgeRouterNodeInput): boolean {
  return (
    Number.isFinite(node.x) &&
    Number.isFinite(node.y) &&
    Number.isFinite(node.width) &&
    Number.isFinite(node.height)
  );
}

/** Runtime guard: demo port positions are not limited to the four router
 * sides (e.g. "right-top"), and handlePoint has no anchor for them. */
function hasRoutableSides(edge: EdgeRouterEdgeInput): boolean {
  return ROUTER_SIDES.has(edge.sourceSide) && ROUTER_SIDES.has(edge.targetSide);
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

function handlePoint(node: Box, side: EdgeRouterSide): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: node.x + node.width / 2, y: node.y };
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.bottom };
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 };
    case 'right':
      return { x: node.right, y: node.y + node.height / 2 };
  }
}

/** True when every segment a->b stays clear of all node boxes (with a small
 * shrink so merely touching an edge does not count as crossing). */
export function segmentsClearOfBoxes(
  waypoints: Array<{ x: number; y: number }>,
  boxes: Array<{ x: number; y: number; right: number; bottom: number }>,
): boolean {
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    for (const box of boxes) {
      if (minX < box.right - 1 && maxX > box.x + 1 && minY < box.bottom - 1 && maxY > box.y + 1) {
        return false;
      }
    }
  }
  return true;
}

/** Vertical gap midpoint on the given side of a node among nodes whose span
 * overlaps [fromY, toY]. */
function gapMidX(
  boxes: Box[],
  node: Box,
  side: 'left' | 'right',
  fromY: number,
  toY: number,
): number {
  const innerEdge = side === 'left' ? node.x : node.right;
  let nearest = side === 'left' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  let found = false;
  for (const box of boxes) {
    if (!(box.y < toY && box.bottom > fromY)) continue;
    if (side === 'left' && box.right <= node.x - 1) {
      nearest = Math.max(nearest, box.right);
      found = true;
    }
    if (side === 'right' && box.x >= node.right + 1) {
      nearest = Math.min(nearest, box.x);
      found = true;
    }
  }
  // No neighbour on this side: no gap column exists — fall back to the inner
  // edge (the consumer's shrink tolerance handles the degenerate case).
  if (!found) return innerEdge;
  return side === 'left' ? (nearest + node.x) / 2 : (node.right + nearest) / 2;
}

export function computeEdgeRoutes(
  nodes: EdgeRouterNodeInput[],
  edges: EdgeRouterEdgeInput[],
  options?: EdgeRouterOptions,
): Map<string, EdgeRouteSpec> {
  const laneGap = options?.laneGap ?? DEFAULT_LANE_GAP;
  const laneBase = options?.laneBase ?? DEFAULT_LANE_BASE;
  const corridorMargin = options?.corridorMargin ?? DEFAULT_CORRIDOR_MARGIN;
  const pairGap = options?.pairGap ?? DEFAULT_PAIR_GAP;
  const backwardEpsilon = options?.backwardEpsilon ?? DEFAULT_BACKWARD_EPSILON;

  // Nodes without measured geometry contribute no box: lanes and gap columns
  // computed over a non-finite box would poison every route (NaN lanes), so
  // their edges fall back to the default route below.
  const boxes: Box[] = [];
  const boxById = new Map<string, Box>();
  for (const n of nodes) {
    if (!hasMeasuredGeometry(n)) continue;
    const box: Box = {
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      right: n.x + n.width,
      bottom: n.y + n.height,
    };
    boxes.push(box);
    boxById.set(n.id, box);
  }
  const maxRight = boxes.reduce((m, b) => Math.max(m, b.right), 0);
  const maxBottom = boxes.reduce((m, b) => Math.max(m, b.bottom), 0);
  const minTop = boxes.reduce((m, b) => Math.min(m, b.y), Number.POSITIVE_INFINITY);

  const result = new Map<string, EdgeRouteSpec>();

  const sourceGroups = new Map<string, string[]>();
  const targetGroups = new Map<string, string[]>();
  for (const edge of edges) {
    const sourceBox = boxById.get(edge.source);
    const targetBox = boxById.get(edge.target);
    if (!sourceBox || !targetBox || !hasRoutableSides(edge)) continue;
    const sk = `${edge.source}::${edge.sourceSide}`;
    const tk = `${edge.target}::${edge.targetSide}`;
    sourceGroups.set(sk, [...(sourceGroups.get(sk) ?? []), edge.id]);
    targetGroups.set(tk, [...(targetGroups.get(tk) ?? []), edge.id]);
  }

  // Classify backward edges (loopback); assign right-hand lanes in input order.
  const laneXByEdge = new Map<string, number>();
  let laneIdx = 0;
  for (const edge of edges) {
    const sourceBox = boxById.get(edge.source);
    const targetBox = boxById.get(edge.target);
    if (!sourceBox || !targetBox || !hasRoutableSides(edge)) continue;
    const sp = handlePoint(sourceBox, edge.sourceSide);
    if (sp.x >= targetBox.x - backwardEpsilon) {
      laneXByEdge.set(edge.id, maxRight + laneBase + laneIdx * laneGap);
      laneIdx += 1;
    }
  }

  for (const edge of edges) {
    const sourceBox = boxById.get(edge.source);
    const targetBox = boxById.get(edge.target);
    if (!sourceBox || !targetBox || !hasRoutableSides(edge)) {
      // Unmeasured endpoint or unresolvable side: no anchor to route from —
      // fall back to the consumer's default bezier instead of throwing.
      result.set(edge.id, { route: { kind: 'default' }, anchorShift: 0 });
      continue;
    }

    if (laneXByEdge.has(edge.id)) {
      // Loopback: gap-column exit from the source, bottom return corridor,
      // then a gap-column corridor into the target handle (vertical entry).
      const sp = handlePoint(sourceBox, edge.sourceSide);
      const tp = handlePoint(targetBox, edge.targetSide);
      const bottomY = maxBottom + corridorMargin;
      const topY = minTop - corridorMargin;
      const laneX = laneXByEdge.get(edge.id)!;

      let targetNearest =
        edge.targetSide === 'left' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
      let targetFound = false;
      for (const box of boxes) {
        if (!(box.y < bottomY && box.bottom > tp.y)) continue;
        if (edge.targetSide === 'left' && box.right <= targetBox.x - 1) {
          targetNearest = Math.max(targetNearest, box.right);
          targetFound = true;
        }
        if (edge.targetSide === 'right' && box.x >= targetBox.right + 1) {
          targetNearest = Math.min(targetNearest, box.x);
          targetFound = true;
        }
      }
      // No neighbour on the target side: no gap column — the corridor falls
      // back to the inner edge (rides the target border; degenerate but safe).
      const corridorX = targetFound
        ? edge.targetSide === 'left'
          ? (targetNearest + targetBox.x) / 2
          : (targetBox.right + targetNearest) / 2
        : edge.targetSide === 'left'
          ? targetBox.x
          : targetBox.right;

      let waypoints: Array<{ x: number; y: number }>;
      if (edge.sourceSide === 'right') {
        // Right-exit backward edges must not run horizontally at the handle's
        // y-band (intermediate nodes share it) — exit through the gap column
        // right of the source, rise above the field, then use the top channel
        // to the right lane.
        const exitX = gapMidX(boxes, sourceBox, 'right', topY, sp.y);
        waypoints = [sp, { x: exitX, y: sp.y }, { x: exitX, y: topY }, { x: laneX, y: topY }, { x: laneX, y: bottomY }];
      } else if (edge.sourceSide === 'left') {
        const exitX = gapMidX(boxes, sourceBox, 'left', sp.y, bottomY);
        waypoints = [sp, { x: exitX, y: sp.y }, { x: exitX, y: bottomY }];
      } else if (edge.sourceSide === 'top') {
        const exitX = gapMidX(boxes, sourceBox, 'left', topY, sp.y);
        waypoints = [sp, { x: sp.x, y: topY }, { x: exitX, y: topY }];
      } else {
        waypoints = [sp, { x: laneX, y: sp.y }, { x: laneX, y: bottomY }];
      }
      waypoints.push({ x: corridorX, y: bottomY });
      waypoints.push({ x: corridorX, y: tp.y });
      waypoints.push(tp);

      result.set(edge.id, {
        route: { kind: 'routed', waypoints, corridorEntry: true },
        anchorShift: 0,
      });
      continue;
    }

    // Bundled: shared source or target handle with the same side.
    const sk = `${edge.source}::${edge.sourceSide}`;
    const tk = `${edge.target}::${edge.targetSide}`;
    const sourceGroup = sourceGroups.get(sk) ?? [];
    const targetGroup = targetGroups.get(tk) ?? [];
    const bundledInSource = sourceGroup.length > 1;
    const bundledInTarget = targetGroup.length > 1;
    if (bundledInSource || bundledInTarget) {
      const group = bundledInSource ? sourceGroup : targetGroup;
      const index = group.indexOf(edge.id);
      const count = group.length;
      const horizontalAxis = edge.sourceSide === 'left' || edge.sourceSide === 'right';
      const centerOffset = (index - (count - 1) / 2) * pairGap;
      result.set(edge.id, {
        route: {
          kind: 'bundled',
          axis: horizontalAxis ? 'x' : 'y',
          centerOffset,
          offset: centerOffset,
        },
        anchorShift: centerOffset,
      });
      continue;
    }

    result.set(edge.id, { route: { kind: 'default' }, anchorShift: 0 });
  }

  return result;
}
