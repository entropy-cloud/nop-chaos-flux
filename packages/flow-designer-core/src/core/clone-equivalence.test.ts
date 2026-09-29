import { describe, expect, it } from 'vitest';
import { cloneTreeDocument, documentsEquivalent } from './clone.js';
import type { GraphDocument, TreeDocument } from '../types.js';

function makeDoc(): GraphDocument {
  return {
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [
      { id: 'n1', type: 'standard', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'standard', position: { x: 100, y: 0 }, data: { label: 'B' } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2', data: {} }],
  } as unknown as GraphDocument;
}

describe('flow-designer serialization helpers (plan 2026-09-29-4 Workstream 3)', () => {
  it('cloneTreeDocument deep-copies without JSON round-trip (mutation isolation)', () => {
    const tree = {
      root: { id: 'root', children: ['a'] },
      nodes: { a: { id: 'a', label: 'A', children: [] } },
    } as unknown as TreeDocument;
    const clone = cloneTreeDocument(tree)!;
    expect(clone).toEqual(tree);
    expect(clone).not.toBe(tree);
    clone.nodes.a.label = 'MUTATED';
    expect((tree.nodes as Record<string, { label: string }>).a.label).toBe('A');
    expect(cloneTreeDocument(undefined)).toBeUndefined();
  });

  it('documentsEquivalent: identical documents are equal regardless of reference identity', () => {
    const a = makeDoc();
    const b = cloneTreeDocument(a as unknown as TreeDocument) as unknown as GraphDocument;
    expect(documentsEquivalent(a, b)).toBe(true);
  });

  it('documentsEquivalent: position/data/edge changes are detected', () => {
    const base = makeDoc();
    const moved = cloneTreeDocument(base as unknown as TreeDocument) as unknown as GraphDocument;
    moved.nodes[0]!.position = { x: 5, y: 5 };
    expect(documentsEquivalent(base, moved)).toBe(false);

    const relabeled = cloneTreeDocument(base as unknown as TreeDocument) as unknown as GraphDocument;
    (relabeled.nodes[0]!.data as Record<string, unknown>).label = 'Z';
    expect(documentsEquivalent(base, relabeled)).toBe(false);

    const rewired = cloneTreeDocument(base as unknown as TreeDocument) as unknown as GraphDocument;
    rewired.edges[0]!.target = 'n1';
    expect(documentsEquivalent(base, rewired)).toBe(false);

    const added = cloneTreeDocument(base as unknown as TreeDocument) as unknown as GraphDocument;
    added.nodes = [...added.nodes, { ...added.nodes[0]!, id: 'n3' }];
    expect(documentsEquivalent(base, added)).toBe(false);
  });
});
