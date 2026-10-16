
import { describe, expect, it } from 'vitest';
import type { SyntaxNode, Tree } from '@lezer/common';
import { parser } from '../../generated/xlang.parser.js';
import sample from './fixtures/sample.xlang?raw';

/** 防吞体量断言（06-grammar-spike.md 坑 #1）：注释规则吞整文件会让"0 错误"空洞为真。 */
function countNodes(tree: Tree): number {
  let count = 0;
  tree.iterate({
    enter: () => {
      count += 1;
    },
  });
  return count;
}

function collectNames(tree: Tree): Set<string> {
  const names = new Set<string>();
  tree.iterate({
    enter: (node: SyntaxNode) => {
      names.add(node.name);
    },
  });
  return names;
}

function findErrorNodes(tree: Tree): SyntaxNode[] {
  const errors: SyntaxNode[] = [];
  tree.iterate({
    enter: (node: SyntaxNode) => {
      if (node.name === '⚠') {
        errors.push(node);
      }
    },
  });
  return errors;
}

describe('xlang lezer grammar', () => {
  const tree = parser.parse(sample);

  it('parses the representative sample without error nodes', () => {
    const errors = findErrorNodes(tree);
    expect(errors, `error nodes: ${errors.length}`).toHaveLength(0);
  });

  it('produces a substantial tree (anti-swallow guard)', () => {
    expect(countNodes(tree)).toBeGreaterThan(50);
  });

  it('covers the promised construction families', () => {
    const names = collectNames(tree);
    for (const name of [
      'FunctionDeclaration',
      'ForStatement',
      'WhileStatement',
      'IfStatement',
      'ReturnStatement',
      'LetStatement',
      'ImportStatement',
      'TemplateString',
      'MacroExpr',
      'LineComment',
      'BlockComment',
      'TernaryExpression',
    ]) {
      expect(names.has(name), `missing node type: ${name}`).toBe(true);
    }
  });

  it('parses a minimal expression', () => {
    const mini = parser.parse('let x = 1 + 2;');
    expect(mini.toString()).not.toContain('⚠');
  });
});
