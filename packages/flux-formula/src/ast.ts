export interface SourceLocation {
  start: number;
  end: number;
}

interface BaseNode {
  type: string;
  loc: SourceLocation;
}

export interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: unknown;
  raw: string;
}

export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface BinaryExpressionNode extends BaseNode {
  type: 'BinaryExpression';
  op: string;
  left: FormulaAstNode;
  right: FormulaAstNode;
}

export interface LogicalExpressionNode extends BaseNode {
  type: 'LogicalExpression';
  op: string;
  left: FormulaAstNode;
  right: FormulaAstNode;
}

export interface UnaryExpressionNode extends BaseNode {
  type: 'UnaryExpression';
  op: string;
  argument: FormulaAstNode;
}

export interface ConditionalExpressionNode extends BaseNode {
  type: 'ConditionalExpression';
  test: FormulaAstNode;
  consequent: FormulaAstNode;
  alternate: FormulaAstNode;
}

export interface MemberExpressionNode extends BaseNode {
  type: 'MemberExpression';
  object: FormulaAstNode;
  property: FormulaAstNode;
  computed: boolean;
  optional: boolean;
}

export interface CallExpressionNode extends BaseNode {
  type: 'CallExpression';
  callee: FormulaAstNode;
  arguments: FormulaAstNode[];
}

export interface ArrayExpressionNode extends BaseNode {
  type: 'ArrayExpression';
  elements: FormulaAstNode[];
}

export interface PropertyNode extends BaseNode {
  type: 'Property';
  key: FormulaAstNode;
  value: FormulaAstNode;
  computed: boolean;
  shorthand: boolean;
}

export interface ObjectExpressionNode extends BaseNode {
  type: 'ObjectExpression';
  properties: PropertyNode[];
}

export interface ArrowFunctionExpressionNode extends BaseNode {
  type: 'ArrowFunctionExpression';
  params: IdentifierNode[];
  body: FormulaAstNode;
}

export interface NullCoalesceExpressionNode extends BaseNode {
  type: 'NullCoalesceExpression';
  left: FormulaAstNode;
  right: FormulaAstNode;
}

export type FormulaAstNode =
  | LiteralNode
  | IdentifierNode
  | BinaryExpressionNode
  | LogicalExpressionNode
  | UnaryExpressionNode
  | ConditionalExpressionNode
  | MemberExpressionNode
  | CallExpressionNode
  | ArrayExpressionNode
  | ObjectExpressionNode
  | ArrowFunctionExpressionNode
  | NullCoalesceExpressionNode;
