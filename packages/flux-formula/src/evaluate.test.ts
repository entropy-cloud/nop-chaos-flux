import { describe, expect, it } from 'vitest';
import type {
  ArrayValueNode,
  ObjectValueNode,
  RendererEnv,
  StaticValueNode
} from '@nop-chaos/flux-core';
import { createEvalContext, createStateFromNode, evaluateNode } from './evaluate';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined
};

function staticNode<T>(value: T): StaticValueNode<T> {
  return { kind: 'static-node', value };
}

function makeScope(data: Record<string, any>) {
  return {
    id: 'test',
    path: 'test',
    value: data,
    get(path: string) {
      return path.split('.').reduce<unknown>((cur, seg) => {
        if (cur == null || typeof cur !== 'object') return undefined;
        return (cur as Record<string, unknown>)[seg];
      }, data);
    },
    has(path: string) {
      return this.get(path) !== undefined;
    },
    readOwn: () => data,
    read: () => data,
    update: () => undefined,
    merge: () => {}
  };
}

describe('evaluateArray boundary guard (FIX-8)', () => {
  it('handles schema hot-reload shrinking array items', () => {
    const node3: ArrayValueNode = {
      kind: 'array-node',
      items: [staticNode('a'), staticNode('b'), staticNode('c')]
    };
    const state = createStateFromNode(node3);
    const ctx = createEvalContext(makeScope({}));

    const r1 = evaluateNode(node3, ctx, env, state.root);
    expect(r1.value).toEqual(['a', 'b', 'c']);

    const node2: ArrayValueNode = {
      kind: 'array-node',
      items: [staticNode('x'), staticNode('y')]
    };
    const r2 = evaluateNode(node2, ctx, env, state.root);
    expect(r2.value).toEqual(['x', 'y']);
  });

  it('handles schema hot-reload growing array items', () => {
    const node2: ArrayValueNode = {
      kind: 'array-node',
      items: [staticNode('a'), staticNode('b')]
    };
    const state = createStateFromNode(node2);
    const ctx = createEvalContext(makeScope({}));

    evaluateNode(node2, ctx, env, state.root);

    const node4: ArrayValueNode = {
      kind: 'array-node',
      items: [staticNode('a'), staticNode('b'), staticNode('c'), staticNode('d')]
    };
    const r = evaluateNode(node4, ctx, env, state.root);
    expect(r.value).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('evaluateObject boundary guard (FIX-8)', () => {
  it('handles schema hot-reload replacing keys', () => {
    const nodeAB: ObjectValueNode = {
      kind: 'object-node',
      keys: ['a', 'b'],
      entries: { a: staticNode(1), b: staticNode(2) }
    };
    const state = createStateFromNode(nodeAB);
    const ctx = createEvalContext(makeScope({}));

    const r1 = evaluateNode(nodeAB, ctx, env, state.root);
    expect(r1.value).toEqual({ a: 1, b: 2 });

    const nodeAC: ObjectValueNode = {
      kind: 'object-node',
      keys: ['a', 'c'],
      entries: { a: staticNode(10), c: staticNode(30) }
    };
    const r2 = evaluateNode(nodeAC, ctx, env, state.root);
    expect(r2.value).toEqual({ a: 10, c: 30 });
  });

  it('handles schema hot-reload adding keys', () => {
    const node1: ObjectValueNode = {
      kind: 'object-node',
      keys: ['x'],
      entries: { x: staticNode(1) }
    };
    const state = createStateFromNode(node1);
    const ctx = createEvalContext(makeScope({}));

    evaluateNode(node1, ctx, env, state.root);

    const node3: ObjectValueNode = {
      kind: 'object-node',
      keys: ['x', 'y', 'z'],
      entries: { x: staticNode(1), y: staticNode(2), z: staticNode(3) }
    };
    const r = evaluateNode(node3, ctx, env, state.root);
    expect(r.value).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe('early-exit optimization (FIX-12)', () => {
  it('returns reusedReference on second identical array evaluation', () => {
    const node: ArrayValueNode = {
      kind: 'array-node',
      items: [staticNode('a'), staticNode('b')]
    };
    const state = createStateFromNode(node);
    const ctx = createEvalContext(makeScope({}));

    const r1 = evaluateNode(node, ctx, env, state.root);
    expect(r1.changed).toBe(true);

    const r2 = evaluateNode(node, ctx, env, state.root);
    expect(r2.reusedReference).toBe(true);
    expect(r2.value).toBe(r1.value);
  });

  it('returns reusedReference on second identical object evaluation', () => {
    const node: ObjectValueNode = {
      kind: 'object-node',
      keys: ['a', 'b'],
      entries: { a: staticNode(1), b: staticNode(2) }
    };
    const state = createStateFromNode(node);
    const ctx = createEvalContext(makeScope({}));

    const r1 = evaluateNode(node, ctx, env, state.root);
    expect(r1.changed).toBe(true);

    const r2 = evaluateNode(node, ctx, env, state.root);
    expect(r2.reusedReference).toBe(true);
    expect(r2.value).toBe(r1.value);
  });
});
