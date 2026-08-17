import { describe, expect, it } from 'vitest';
import { parseFormula } from './parser.js';

describe('parseFormula', () => {
  it('parses operator precedence and null coalescing', () => {
    const ast = parseFormula('a + b * c ?? d');
    expect(ast.type).toBe('NullCoalesceExpression');
  });

  it('parses arrow functions inside calls', () => {
    const ast = parseFormula('ARRAYMAP(items, item => item.name)');
    expect(ast.type).toBe('CallExpression');
  });

  it('parses optional member access', () => {
    const ast = parseFormula('user?.name');
    expect(ast.type).toBe('MemberExpression');
    if (ast.type !== 'MemberExpression') {
      throw new Error('Expected MemberExpression');
    }
    expect(ast.optional).toBe(true);
  });

  it('rejects optional calls', () => {
    expect(() => parseFormula('user?.run()')).toThrow(/Optional call is not supported/);
  });

  it('supports optional chaining before a computed index (?.[)', () => {
    const ast = parseFormula('items?.[0]');
    expect(ast.type).toBe('MemberExpression');
    if (ast.type !== 'MemberExpression') {
      throw new Error('Expected MemberExpression');
    }
    expect(ast.computed).toBe(true);
    expect(ast.optional).toBe(true);

    const chained = parseFormula('items?.[key].name');
    expect(chained.type).toBe('MemberExpression');
    if (chained.type !== 'MemberExpression') {
      throw new Error('Expected MemberExpression');
    }
    expect(chained.optional).toBe(false);
    expect(chained.object.type).toBe('MemberExpression');
    if (chained.object.type === 'MemberExpression') {
      expect(chained.object.optional).toBe(true);
      expect(chained.object.computed).toBe(true);
    }
  });

  it('supports plain computed index access without optional chaining', () => {
    const ast = parseFormula('items[0].name');
    expect(ast.type).toBe('MemberExpression');
  });

  it('rejects unsupported object keys', () => {
    expect(() => parseFormula('{1: value}')).toThrow(/Invalid object key/);
  });

  it('parses arrays, objects, exponentiation, and computed members', () => {
    const objectAst = parseFormula('{foo, [bar]: baz}');
    expect(objectAst.type).toBe('ObjectExpression');

    const exponentAst = parseFormula('2 ** 3 ** 2');
    expect(exponentAst.type).toBe('BinaryExpression');
    if (exponentAst.type !== 'BinaryExpression') {
      throw new Error('Expected BinaryExpression');
    }
    expect(exponentAst.right.type).toBe('BinaryExpression');

    const memberAst = parseFormula('items[index](arg)');
    expect(memberAst.type).toBe('CallExpression');
  });

  it('rejects unsupported lambda parameters and syntax families', () => {
    expect(() => parseFormula('($bad) => value')).toThrow();
    expect(() => parseFormula('new Foo()')).toThrow();
    expect(() => parseFormula('`value`')).toThrow();
    expect(() => parseFormula('/test/')).toThrow();
  });

  it('throws when parser depth exceeds limit', () => {
    let deep = '';
    for (let i = 0; i < 300; i++) {
      deep = `(${deep}a)`;
    }
    expect(() => parseFormula(deep)).toThrow(/depth limit exceeded/);
  });
});
