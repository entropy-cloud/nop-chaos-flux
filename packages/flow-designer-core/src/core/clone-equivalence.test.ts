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

// plan 626 B4：nodePayloadEquals 判别锚（语义契约 = 旧 stringify 比较，JSON-safe
// 值域内逐例一致；`?? null` 归一保持 undefined ≡ null；偏差登记见 clone.ts 头注）
describe('documentsEquivalent payload equality (plan 626 B4)', () => {
  it('deep-equal fresh-reference payload → equivalent', () => {
    const a = makeDoc();
    const b = makeDoc();
    a.nodes[0]!.data = { label: 'A', meta: { x: 1, ys: [1, 2] } };
    b.nodes[0]!.data = { label: 'A', meta: { x: 1, ys: [1, 2] } };
    expect(documentsEquivalent(a, b)).toBe(true);
  });

  it('key-order divergence in payload is UNEQUAL (order-sensitive pin)', () => {
    const a = makeDoc();
    const b = makeDoc();
    a.nodes[0]!.data = { label: 'A', extra: 1 };
    b.nodes[0]!.data = { extra: 1, label: 'A' };
    expect(documentsEquivalent(a, b)).toBe(false);
  });

  it('nested change → not equivalent', () => {
    const a = makeDoc();
    const b = makeDoc();
    a.nodes[0]!.data = { label: 'A', meta: { x: 1 } };
    b.nodes[0]!.data = { label: 'A', meta: { x: 2 } };
    expect(documentsEquivalent(a, b)).toBe(false);
  });

  it('undefined payload ≡ null payload (?? null normalization boundary pin)', () => {
    const a = makeDoc();
    const b = makeDoc();
    a.nodes[0]!.data = undefined as unknown as Record<string, never>;
    b.nodes[0]!.data = null as unknown as Record<string, never>;
    expect(documentsEquivalent(a, b)).toBe(true);
  });

  it('undefined-valued field compares as absent (stringify skip semantics)', () => {
    const a = makeDoc();
    const b = makeDoc();
    a.nodes[0]!.data = { label: 'A', ghost: undefined };
    b.nodes[0]!.data = { label: 'A' };
    expect(documentsEquivalent(a, b)).toBe(true);
  });

  it('NaN payload pair compares equal (stringify "null" parity, flow-branch pin)', () => {
    const a = makeDoc();
    const b = makeDoc();
    a.nodes[0]!.data = { label: 'A', v: Number.NaN };
    b.nodes[0]!.data = { label: 'A', v: Number.NaN };
    expect(documentsEquivalent(a, b)).toBe(true);
  });

  it('circular payload returns false instead of throwing (registered deviation)', () => {
    const a = makeDoc();
    const b = makeDoc();
    const ca: Record<string, unknown> = { x: 1 };
    ca.self = ca;
    const cb: Record<string, unknown> = { x: 1 };
    cb.self = cb;
    a.nodes[0]!.data = ca as unknown as Record<string, never>;
    b.nodes[0]!.data = cb as unknown as Record<string, never>;
    expect(() => documentsEquivalent(a, b)).not.toThrow();
    expect(documentsEquivalent(a, b)).toBe(false);
  });
});
