import { describe, expect, it } from 'vitest';
import type { CompiledValueNode, RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler } from './expression-compiler.js';
import { createEvalContext, createStateFromNode, evaluateNode } from './evaluate.js';

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

function makeScope(data: Record<string, unknown>) {
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
    readVisible: () => data,
    materializeVisible: () => data,
    update: () => undefined,
    merge: () => {},
  };
}

function evalNode<T>(node: CompiledValueNode<T>, data: Record<string, unknown>): T {
  const ctx = createEvalContext(makeScope(data));
  const state = createStateFromNode(node);
  return evaluateNode(node, ctx, env, state.root).value;
}

/**
 * compileNode string handling contract (compile/compile-node.ts):
 *  - pure `${expr}`      → expression-node (or static when foldable)
 *  - mixed text + `${expr}` → template-node (partial interpolation IS supported)
 *  - any parse failure    → static-node fallback that echoes the raw string
 *    (this is what makes `foo ${a?.[0].b}` appear "uninterpolated" — the
 *    optional-computed syntax itself fails to parse, not the mixed template).
 */
describe('compileNode string templates', () => {
  const compiler = createExpressionCompiler();

  it('pure expression compiles to an expression node', () => {
    const node = compiler.compileNode('${count}');
    expect(node.kind).toBe('expression-node');
    expect(evalNode(node, { count: 3 })).toBe(3);
  });

  it('plain text stays a static node', () => {
    const node = compiler.compileNode('逾期');
    expect(node.kind).toBe('static-node');
  });

  it('partial interpolation renders text + expression segments', () => {
    const node = compiler.compileNode('逾期${count}');
    expect(node.kind).toBe('template-node');
    expect(evalNode(node, { count: 3 })).toBe('逾期3');
  });

  it('partial interpolation with leading and trailing text', () => {
    const node = compiler.compileNode('共有${count}件逾期，共${total}件');
    expect(evalNode(node, { count: 3, total: 14 })).toBe('共有3件逾期，共14件');
  });

  it('nullish segment renders as empty string', () => {
    const node = compiler.compileNode('逾期${missing}');
    expect(evalNode(node, {})).toBe('逾期');
  });

  it('optional computed index ?.[0] evaluates null-safely in a mixed template', () => {
    const node = compiler.compileNode('逾期${pressure?.items?.[0]?.count ?? 0}');
    expect(node.kind).toBe('template-node');
    expect(evalNode(node, { pressure: { items: [{ count: 3 }] } })).toBe('逾期3');
    // Missing root / missing index → undefined → nullish fallback
    expect(evalNode(node, {})).toBe('逾期0');
    expect(evalNode(node, { pressure: { items: [] } })).toBe('逾期0');
  });

  it('pure expression with optional computed index evaluates null-safely', () => {
    const node = compiler.compileNode('${pressure?.items?.[0]?.count ?? 0}');
    expect(node.kind).toBe('expression-node');
    expect(evalNode(node, { pressure: { items: [{ count: 3 }] } })).toBe(3);
    expect(evalNode(node, {})).toBe(0);
  });

  it('falls back to the raw string only when an embedded expression fails to parse', () => {
    // e.g. an unterminated expression keeps the whole mixed template static.
    const node = compiler.compileNode('逾期${pressure.items[0].count');
    expect(node.kind).toBe('static-node');
    expect(evalNode(node, { pressure: { items: [{ count: 3 }] } })).toBe(
      '逾期${pressure.items[0].count',
    );
  });

  it('a well-formed computed index without optional chaining evaluates fine', () => {
    const node = compiler.compileNode('${pressure.items[0].count}');
    expect(node.kind).toBe('expression-node');
    expect(evalNode(node, { pressure: { items: [{ count: 3 }] } })).toBe(3);
  });
});
