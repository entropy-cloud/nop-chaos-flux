import { describe, expect, it } from 'vitest';
import {
  createIdentifierNode,
  createLiteralNode,
  createMemberExpressionNode,
  createSourceLocation,
} from './parser-node-factories.js';

describe('createSourceLocation', () => {
  it('returns the exact start/end pair', () => {
    expect(createSourceLocation(7, 11)).toEqual({ start: 7, end: 11 });
  });

  it('allows zero-width locations and rejects nothing (factory is permissive)', () => {
    expect(createSourceLocation(0, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe('createLiteralNode', () => {
  it('produces an exact Literal node shape (value, raw, loc)', () => {
    expect(createLiteralNode(42, '42', 3, 5)).toEqual({
      type: 'Literal',
      value: 42,
      raw: '42',
      loc: { start: 3, end: 5 },
    });
  });

  it('keeps value and raw independent (no coercion between them)', () => {
    const node = createLiteralNode(null, 'null', 0, 4);
    expect(node.value).toBeNull();
    expect(node.raw).toBe('null');
    const str = createLiteralNode('a', "'a'", 0, 3);
    expect(str.value).toBe('a');
    expect(str.raw).toBe("'a'");
  });
});

describe('createIdentifierNode', () => {
  it('takes name from token.value and loc from token bounds', () => {
    const node = createIdentifierNode({ type: 'identifier', value: 'userName', start: 4, end: 12 } as never);
    expect(node).toEqual({
      type: 'Identifier',
      name: 'userName',
      loc: { start: 4, end: 12 },
    });
  });

  it('does not invent a binding property (binding is added later by bindAst)', () => {
    const node = createIdentifierNode({ type: 'identifier', value: 'x', start: 0, end: 1 } as never);
    expect('binding' in node).toBe(false);
  });
});

describe('createMemberExpressionNode', () => {
  it('assembles object/property/computed/optional with loc spanning object.start..end', () => {
    const object = createIdentifierNode({ type: 'identifier', value: 'a', start: 0, end: 1 } as never);
    const property = createIdentifierNode({ type: 'identifier', value: 'b', start: 3, end: 4 } as never);
    const node = createMemberExpressionNode({ object, property, computed: false, optional: false, end: 4 });
    expect(node).toMatchObject({
      type: 'MemberExpression',
      object,
      property,
      computed: false,
      optional: false,
    });
    expect(node.loc).toEqual({ start: 0, end: 4 });
  });

  it('keeps computed/optional flags verbatim (no normalization)', () => {
    const object = createLiteralNode(1, '1', 0, 1);
    const property = createLiteralNode(2, '2', 4, 5);
    const computed = createMemberExpressionNode({ object, property, computed: true, optional: true, end: 6 });
    expect(computed.computed).toBe(true);
    expect(computed.optional).toBe(true);
    const plain = createMemberExpressionNode({ object, property, computed: false, optional: false, end: 6 });
    expect(plain.computed).toBe(false);
    expect(plain.optional).toBe(false);
  });
});
