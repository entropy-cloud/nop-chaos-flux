import { describe, expect, it } from 'vitest';
import type { GraphDocument, NormalizedDesignerConfig } from '../types.js';
import { validateEdgeConnection } from './constraints.js';

// P1-MA4.4-003 regression guard: the IMPLEMENTED connection validation
// surface (audit Round A / A-03: design.md §8 promised six steps, the impl
// has three checks). The doc-downgrade adjudication (plan 730 Deferred)
// narrows the doc to these three; this pin keeps each implemented branch
// from silently regressing.

function makeConfig(rules?: { allowSelfLoop?: boolean; allowMultiEdge?: boolean }): NormalizedDesignerConfig {
  return {
    version: '1',
    kind: 'test',
    nodeTypes: new Map(),
    edgeTypes: new Map(),
    shortcuts: {},
    features: {},
    rules: {
      allowSelfLoop: false,
      allowMultiEdge: true,
      defaultEdgeType: 'default',
      ...rules,
    },
    canvas: {},
  } as unknown as NormalizedDesignerConfig;
}

function makeDoc(): GraphDocument {
  return {
    id: 'doc-1',
    kind: 'graph',
    name: 'constraints-doc',
    version: '1',
    nodes: [
      { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'n2', type: 'task', position: { x: 100, y: 0 }, data: {} },
    ] as never,
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }] as never,
  };
}

describe('validateEdgeConnection implemented checks (P1-MA4.4-003)', () => {
  it('rejects a connection whose endpoint node is missing', () => {
    const error = validateEdgeConnection(makeDoc(), makeConfig(), 'n1', 'missing-node');
    expect(error).toBeDefined();
    expect(error).not.toBe('');
  });

  it('rejects self-loops when rules.allowSelfLoop is false', () => {
    const error = validateEdgeConnection(makeDoc(), makeConfig({ allowSelfLoop: false }), 'n1', 'n1');
    expect(error).toBeDefined();
  });

  it('rejects duplicate edges when rules.allowMultiEdge is false', () => {
    const error = validateEdgeConnection(makeDoc(), makeConfig({ allowMultiEdge: false }), 'n1', 'n2');
    expect(error).toBeDefined();
  });

  it('accepts a legal new connection between existing distinct nodes', () => {
    const doc = makeDoc();
    const error = validateEdgeConnection(doc, makeConfig({ allowMultiEdge: false }), 'n2', 'n1');
    expect(error).toBeUndefined();
  });
});
