import type { FormulaToken } from './lexer';
import type { IdentifierNode, LiteralNode, MemberExpressionNode, SourceLocation } from './ast';

export function createSourceLocation(start: number, end: number): SourceLocation {
  return { start, end };
}

export function createLiteralNode(
  value: unknown,
  raw: string,
  start: number,
  end: number,
): LiteralNode {
  return {
    type: 'Literal',
    value,
    raw,
    loc: createSourceLocation(start, end),
  };
}

export function createIdentifierNode(token: FormulaToken): IdentifierNode {
  return {
    type: 'Identifier',
    name: token.value,
    loc: createSourceLocation(token.start, token.end),
  };
}

export function createMemberExpressionNode(args: {
  object: import('./ast').FormulaAstNode;
  property: import('./ast').FormulaAstNode;
  computed: boolean;
  optional: boolean;
  end: number;
}): MemberExpressionNode {
  return {
    type: 'MemberExpression',
    object: args.object,
    property: args.property,
    computed: args.computed,
    optional: args.optional,
    loc: createSourceLocation(args.object.loc.start, args.end),
  };
}
