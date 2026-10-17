import { cloneDeep, genId } from '@nop-chaos/flux-core';
import type { GraphDocument, GraphNode, GraphEdge, TreeDocument } from '../types.js';

const cloneValue = cloneDeep;

// Canonical flux-core shape (`<ms>-<base36>`); kept as a named re-export for
// flow-designer-core's historical API.
export const generateId = genId;

export function cloneNode(node: GraphNode): GraphNode {
  return {
    ...node,
    position: { ...node.position },
    data: cloneValue(node.data ?? {}),
  };
}

export function cloneEdge(edge: GraphEdge): GraphEdge {
  return {
    ...edge,
    data: cloneValue(edge.data ?? {}),
  };
}

export function cloneDocument(doc: GraphDocument): GraphDocument {
  return {
    ...doc,
    viewport: doc.viewport ? { ...doc.viewport } : undefined,
    nodes: doc.nodes.map(cloneNode),
    edges: doc.edges.map(cloneEdge),
  };
}

export function cloneTreeDocument(tree: TreeDocument | undefined): TreeDocument | undefined {
  if (!tree) return undefined;
  // structuredClone primary with JSON round-trip fallback. Single deep-clone
  // source for TreeDocument across the package (cq-2 Phase 1; WA-flow-
  // designer-core-002: the hand-rolled structural clone family that
  // predated this branch in tree-structure.ts converged here).
  if (typeof structuredClone === 'function') {
    return structuredClone(tree);
  }
  return JSON.parse(JSON.stringify(tree)) as TreeDocument;
}

/** Structural equality for the relayout no-op check — replaces the
 *  whole-document double JSON.stringify (plan 2026-09-29-4 R2-P14). Node/edge
 *  payloads fall back to a recursive order-sensitive structural compare
 *  (plan 626 B4) — no string allocation. Semantics contract vs the previous
 *  stringify comparisons, pinned by clone-equivalence.test.ts: within the
 *  JSON-safe value domain verdicts match byte-for-byte (key ORDER is
 *  significant; `?? null` normalization at the compare site keeps
 *  `data: undefined` ≡ `data: null` exactly as before; NaN/Infinity diverge —
 *  documented and pinned by test; circular references return false instead of
 *  throwing — graph payloads are acyclic. Bound: payloads are JSON-safe
 *  objects — non-JSON-safe undefined array slots (`[1, undefined]` ≡ `[1]`
 *  here where stringify disagrees) are outside the payload domain. Diverges
 *  intentionally from the print adapter's helper (no array/function-slot
 *  handling) — kept package-local to avoid a cross-package clone. */
function nodePayloadEquals(a: unknown, b: unknown): boolean {
  return nodePayloadInner(a, b, new Map());
}

// `seen` holds in-flight (a, b) object pairs: re-entry = equivalent cycles,
// judged unequal (conservative, registered deviation from stringify throwing).
function nodePayloadInner(a: unknown, b: unknown, seen: Map<object, object>): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (seen.get(a as object) === (b as object)) return false;
  seen.set(a as object, b as object);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = effectiveKeys(a as Record<string, unknown>);
  const bKeys = effectiveKeys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i]!;
    if (key !== bKeys[i]) return false;
    if (!nodePayloadInner((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], seen)) {
      return false;
    }
  }
  return true;
}

function effectiveKeys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).filter((key) => {
    const value = obj[key];
    return value !== undefined && typeof value !== 'function';
  });
}

export function documentsEquivalent(a: GraphDocument, b: GraphDocument): boolean {
  if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) {
    return false;
  }
  for (let i = 0; i < a.nodes.length; i++) {
    const na = a.nodes[i]!;
    const nb = b.nodes[i]!;
    if (na.id !== nb.id || na.position.x !== nb.position.x || na.position.y !== nb.position.y) {
      return false;
    }
    // `?? null` normalization preserved from the stringify era: undefined and
    // null payloads remain equal (plan 626 B4 boundary pin).
    if (na.data !== nb.data && !nodePayloadEquals(na.data ?? null, nb.data ?? null)) {
      return false;
    }
  }
  for (let i = 0; i < a.edges.length; i++) {
    const ea = a.edges[i]!;
    const eb = b.edges[i]!;
    if (ea.id !== eb.id || ea.source !== eb.source || ea.target !== eb.target) {
      return false;
    }
  }
  return true;
}
