import { describe, expect, it } from 'vitest';
import { bindAst, type BindingContext } from './bind-ast.js';
import { createIdentifierNode, createMemberExpressionNode } from './parser-node-factories.js';
import type { FormulaAstNode } from './ast.js';

function ident(name: string) {
  const node = createIdentifierNode({ type: 'identifier', value: name, start: 0, end: name.length } as never);
  return node;
}

function member(object: FormulaAstNode, property: FormulaAstNode, computed = false) {
  return createMemberExpressionNode({
    object,
    property,
    computed,
    optional: false,
    end: object.loc.end + property.loc.end,
  });
}

function bindingOf(node: FormulaAstNode): string | undefined {
  return (node as { binding?: string }).binding;
}

function collectIdentifiers(node: FormulaAstNode): { name: string; binding?: string }[] {
  const out: { name: string; binding?: string }[] = [];
  const visit = (n: FormulaAstNode) => {
    if (n.type === 'Identifier') {
      out.push({ name: (n as { name: string }).name, binding: bindingOf(n) });
      return;
    }
    const children: FormulaAstNode[] = [];
    if ('argument' in n && n.argument) children.push(n.argument as FormulaAstNode);
    if ('left' in n && n.left) children.push(n.left as FormulaAstNode);
    if ('right' in n && n.right) children.push(n.right as FormulaAstNode);
    if ('test' in n && n.test) children.push(n.test as FormulaAstNode);
    if ('consequent' in n && n.consequent) children.push(n.consequent as FormulaAstNode);
    if ('alternate' in n && n.alternate) children.push(n.alternate as FormulaAstNode);
    if ('callee' in n && n.callee) children.push(n.callee as FormulaAstNode);
    if ('object' in n && n.object) children.push(n.object as FormulaAstNode);
    if ('property' in n && n.property && (n as { computed?: boolean }).computed) {
      children.push(n.property as FormulaAstNode);
    }
    if ('elements' in n && Array.isArray((n as { elements: FormulaAstNode[] }).elements)) {
      children.push(...(n as { elements: FormulaAstNode[] }).elements);
    }
    if ('properties' in n && Array.isArray((n as { properties: { key: FormulaAstNode; value: FormulaAstNode }[] }).properties)) {
      for (const p of (n as { properties: { key: FormulaAstNode; value: FormulaAstNode }[] }).properties) {
        children.push(p.key, p.value);
      }
    }
    if ('arguments' in n && Array.isArray((n as { arguments: FormulaAstNode[] }).arguments)) {
      children.push(...(n as { arguments: FormulaAstNode[] }).arguments);
    }
    if ('body' in n && n.body) children.push(n.body as FormulaAstNode);
    children.forEach(visit);
  };
  visit(node);
  return out;
}

const ctx = (over: { libraryNames?: string[]; namespaceNames?: string[]; functionNames?: string[] } = {}): BindingContext => ({
  libraryNames: new Set(over.libraryNames ?? []),
  namespaceNames: new Set(over.namespaceNames ?? []),
  functionNames: new Set(over.functionNames ?? []),
});

describe('bindAst', () => {
  it('binds a bare identifier as scope', () => {
    const node = ident('user');
    bindAst(node, ctx());
    expect(bindingOf(node)).toBe('scope');
  });

  it('binds namespace and library identifiers, and leaves function names unbound', () => {
    const bindingCtx = ctx({ namespaceNames: ['api'], libraryNames: ['Math'], functionNames: ['MAX'] });
    const ns = ident('api');
    bindAst(ns, bindingCtx);
    const lib = ident('Math');
    bindAst(lib, bindingCtx);
    const fn = ident('MAX');
    const bare = ident('plain');
    const call = {
      type: 'CallExpression',
      callee: fn,
      arguments: [bare],
    } as unknown as FormulaAstNode;
    bindAst(call, bindingCtx);
    expect(bindingOf(ns)).toBe('namespace');
    expect(bindingOf(lib)).toBe('library');
    expect(bindingOf(fn)).toBeUndefined();
    expect(bindingOf(bare)).toBe('scope');
  });

  it('gives lambda parameters precedence over scope binding (identifier inside arrow body)', () => {
    const param = ident('x');
    const arrow = {
      type: 'ArrowFunctionExpression',
      params: [param],
      body: param,
    } as unknown as FormulaAstNode;
    bindAst(arrow, ctx());
    expect(bindingOf(param)).toBeUndefined();
  });

  it('walks nested member/call/binary/array/object shapes and binds every free identifier', () => {
    const a = ident('alpha');
    const b = ident('beta');
    const structuralProperty = ident('x');
    const arr = {
      type: 'ArrayExpression',
      elements: [member(a, structuralProperty), { type: 'Literal', value: 1 } as unknown as FormulaAstNode, b],
    } as unknown as FormulaAstNode;
    const obj = {
      type: 'ObjectExpression',
      properties: [{ key: ident('k'), value: ident('v') }],
    } as unknown as FormulaAstNode;
    const bin = {
      type: 'BinaryExpression',
      left: arr,
      right: obj,
    } as unknown as FormulaAstNode;
    bindAst(bin, ctx());
    const names = collectIdentifiers(bin).map((i) => `${i.name}:${i.binding ?? 'unbound'}`);
    // member .property on a non-computed member is structural, not a scope read
    expect(names).toContain('alpha:scope');
    expect(names).toContain('beta:scope');
    expect(names).toContain('k:scope');
    expect(names).toContain('v:scope');
    // read the property node directly: collectIdentifiers never visits a
    // non-computed property, so a names-based check could not fail here
    expect(bindingOf(structuralProperty)).toBeUndefined();
  });

  it('descends into unary/logical/null-coalesce/conditional operands', () => {
    const operand = ident('flag');
    const left = ident('lhs');
    const right = ident('rhs');
    const fallback = ident('fallback');
    const test = ident('cond');
    const consequent = ident('yes');
    const alternate = ident('no');
    const node = {
      type: 'ConditionalExpression',
      test: {
        type: 'LogicalExpression',
        operator: '&&',
        left: { type: 'UnaryExpression', operator: '!', argument: operand },
        right: test,
      },
      consequent: { type: 'NullCoalesceExpression', left, right: { type: 'LogicalExpression', operator: '&&', left: fallback, right: consequent } },
      alternate: { type: 'LogicalExpression', operator: '||', left: right, right: alternate },
    } as unknown as FormulaAstNode;
    bindAst(node, ctx());
    for (const id of [operand, left, right, fallback, test, consequent, alternate]) {
      expect(bindingOf(id)).toBe('scope');
    }
  });

  it('binds computed member property identifiers as scope reads', () => {
    const key = ident('dynamicKey');
    const m = member(ident('obj'), key, true);
    bindAst(m, ctx());
    expect(bindingOf(key)).toBe('scope');
  });

  it('treats a lambda param shadowing a namespace name as the param (no namespace binding)', () => {
    const param = ident('api');
    const arrow = {
      type: 'ArrowFunctionExpression',
      params: [param],
      body: param,
    } as unknown as FormulaAstNode;
    bindAst(arrow, ctx({ namespaceNames: ['api'] }));
    expect(bindingOf(param)).toBeUndefined();
  });

  it('mutates nodes in place and returns void (no copy semantics)', () => {
    const node = ident('thing');
    expect(bindAst(node, ctx())).toBeUndefined();
    expect(bindingOf(node)).toBe('scope');
  });
});

describe('bindAst discriminates stale bindings on re-bind', () => {
  it('re-binding with a different context overwrites a previous scope binding with library', () => {
    const node = ident('Math');
    bindAst(node, ctx());
    expect(bindingOf(node)).toBe('scope');
    bindAst(node, ctx({ libraryNames: ['Math'] }));
    expect(bindingOf(node)).toBe('library');
  });
});

describe('bindAst on node shapes outside the walker switch', () => {
  it('leaves an unknown node type untouched instead of throwing', () => {
    const unknown = { type: 'TemplateElement', name: 'x', loc: { start: 0, end: 1 } } as unknown as FormulaAstNode;
    expect(() => bindAst(unknown, ctx({}))).not.toThrow();
    expect('binding' in unknown).toBe(false);
  });

  it('does not descend into children of an unknown wrapper (no binding leaks through)', () => {
    const child = ident('hidden');
    const wrapper = { type: 'SequenceExpression', expressions: [child], loc: { start: 0, end: 6 } } as unknown as FormulaAstNode;
    bindAst(wrapper, ctx({}));
    expect(bindingOf(child)).toBeUndefined();
  });
});
