import { extractPointIdRefs } from './reverse-index.js';
import type { ScadaPrimitive } from '../serialization/config-types.js';

export type EvaluatorValue = ScadaPrimitive;

export interface ExpressionEvaluatorContext {
  getPointValue: (pointId: string) => ScadaPrimitive | undefined;
  hasPoint: (pointId: string) => boolean;
  getPointExpression?: (pointId: string) => string | undefined;
}

export type EvaluationResult =
  | { ok: true; value: ScadaPrimitive }
  | { ok: false; error: string };

export type EvaluationError = { ok: false; error: string };

interface CacheEntry {
  deps: string[];
  result: EvaluationResult;
}

interface PointNode {
  kind: 'point';
  pointId: string;
}

interface LiteralNode {
  kind: 'literal';
  value: ScadaPrimitive;
}

interface BinaryNode {
  kind: 'binary';
  op: string;
  left: AstNode;
  right: AstNode;
}

interface UnaryNode {
  kind: 'unary';
  op: string;
  operand: AstNode;
}

interface TernaryNode {
  kind: 'ternary';
  condition: AstNode;
  whenTrue: AstNode;
  whenFalse: AstNode;
}

type AstNode = PointNode | LiteralNode | BinaryNode | UnaryNode | TernaryNode;

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'point'; value: string }
  | { type: 'op'; value: string };

function isTokenType<T extends Token['type']>(
  token: Token | undefined,
  type: T,
): token is Extract<Token, { type: T }> {
  return token !== undefined && token.type === type;
}

function isOp(token: Token | undefined, op: string): token is Extract<Token, { type: 'op' }> {
  return token !== undefined && token.type === 'op' && token.value === op;
}

const COMPARISON_OPS = new Set(['<', '>', '<=', '>=', '==', '!=']);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    if (char === '@' && input[index + 1] === '{') {
      const end = input.indexOf('}', index + 2);
      if (end === -1) throw new EvalError('unclosed @{ point reference');
      const pointId = input.slice(index + 2, end).trim();
      if (!pointId) throw new EvalError('empty @{} point reference');
      tokens.push({ type: 'point', value: pointId });
      index = end + 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      const end = input.indexOf(quote, index + 1);
      if (end === -1) throw new EvalError(`unclosed string literal`);
      tokens.push({ type: 'string', value: input.slice(index + 1, end) });
      index = end + 1;
      continue;
    }
    const numberMatch = /^[0-9]+(\.[0-9]+)?/.exec(input.slice(index));
    if (numberMatch) {
      tokens.push({ type: 'number', value: Number(numberMatch[0]) });
      index += numberMatch[0].length;
      continue;
    }
    const twoCharOp = input.slice(index, index + 2);
    if (['<=', '>=', '==', '!='].includes(twoCharOp)) {
      tokens.push({ type: 'op', value: twoCharOp });
      index += 2;
      continue;
    }
    if ('+-*/()?:<>'.includes(char)) {
      tokens.push({ type: 'op', value: char });
      index++;
      continue;
    }
    if (/^true|^false/.test(input.slice(index))) {
      tokens.push({ type: 'boolean', value: input.startsWith('true', index) });
      index += input.startsWith('true', index) ? 4 : 5;
      continue;
    }
    throw new EvalError(`unexpected token at ${index}: ${char}`);
  }
  return tokens;
}

class EvalError extends Error {}

class Parser {
  private readonly tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): AstNode {
    if (this.tokens.length === 0) throw new EvalError('empty expression');
    const node = this.parseTernary();
    if (this.index < this.tokens.length) {
      throw new EvalError(`unexpected trailing token: ${String(this.tokens[this.index].value)}`);
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    if (token === undefined) throw new EvalError('unexpected end of expression');
    this.index++;
    return token;
  }

  private parseTernary(): AstNode {
    const condition = this.parseComparison();
    if (isOp(this.peek(), '?')) {
      this.consume();
      const whenTrue = this.parseTernary();
      if (!isOp(this.peek(), ':')) throw new EvalError('expected : in ternary expression');
      this.consume();
      const whenFalse = this.parseTernary();
      return { kind: 'ternary', condition, whenTrue, whenFalse };
    }
    return condition;
  }

  private parseComparison(): AstNode {
    const left = this.parseAdditive();
    const token = this.peek();
    if (token !== undefined && token.type === 'op' && COMPARISON_OPS.has(token.value)) {
      this.consume();
      const right = this.parseAdditive();
      return { kind: 'binary', op: token.value, left, right };
    }
    return left;
  }

  private parseAdditive(): AstNode {
    let node = this.parseMultiplicative();
    for (;;) {
      const token = this.peek();
      if (!isOp(token, '+') && !isOp(token, '-')) return node;
      this.consume();
      const right = this.parseMultiplicative();
      node = { kind: 'binary', op: token.value, left: node, right };
    }
  }

  private parseMultiplicative(): AstNode {
    let node = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (!isOp(token, '*') && !isOp(token, '/')) return node;
      this.consume();
      const right = this.parseUnary();
      node = { kind: 'binary', op: token.value, left: node, right };
    }
  }

  private parseUnary(): AstNode {
    const token = this.peek();
    if (isOp(token, '-') || isOp(token, '+')) {
      this.consume();
      const operand = this.parseUnary();
      return { kind: 'unary', op: token.value, operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const token = this.consume();
    if (isTokenType(token, 'number') || isTokenType(token, 'string') || isTokenType(token, 'boolean')) {
      return { kind: 'literal', value: token.value };
    }
    if (isTokenType(token, 'point')) {
      return { kind: 'point', pointId: token.value };
    }
    if (token.type === 'op' && token.value === '(') {
      const node = this.parseTernary();
      if (!isOp(this.peek(), ')')) throw new EvalError('expected )');
      this.consume();
      return node;
    }
    throw new EvalError(`unexpected token: ${String(token.value)}`);
  }
}

class Evaluator {
  constructor(private readonly context: ExpressionEvaluatorContext) {}

  evaluate(node: AstNode): ScadaPrimitive {
    switch (node.kind) {
      case 'literal':
        return node.value;
      case 'point': {
        if (!this.context.hasPoint(node.pointId)) {
          throw new EvalError(`unknown point id: ${node.pointId}`);
        }
        const value = this.context.getPointValue(node.pointId);
        if (value === undefined) {
          throw new EvalError(`point has no value: ${node.pointId}`);
        }
        return value;
      }
      case 'unary': {
        const value = this.evaluate(node.operand);
        if (node.op === '-') {
          if (typeof value !== 'number') throw new EvalError('unary - requires a number');
          return -value;
        }
        return value;
      }
      case 'binary':
        return this.evaluateBinary(node);
      case 'ternary': {
        const condition = this.evaluate(node.condition);
        return this.evaluate(condition ? node.whenTrue : node.whenFalse);
      }
    }
  }

  private evaluateBinary(node: BinaryNode): ScadaPrimitive {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);
    switch (node.op) {
      case '+':
        return typeof left === 'string' || typeof right === 'string'
          ? `${String(left)}${String(right)}`
          : (left as number) + (right as number);
      case '-':
      case '*':
      case '/':
        return this.numeric(op(node.op), left, right);
      case '<':
      case '>':
      case '<=':
      case '>=':
        return this.compare(node.op, left, right);
      case '==':
        return left === right;
      case '!=':
        return left !== right;
    }
    throw new EvalError(`unsupported operator: ${node.op}`);
  }

  private numeric(opName: string, left: ScadaPrimitive, right: ScadaPrimitive): number {
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new EvalError(`${opName} requires numbers`);
    }
    switch (opName) {
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      default:
        throw new EvalError(`unsupported numeric operator: ${opName}`);
    }
  }

  private compare(opName: string, left: ScadaPrimitive, right: ScadaPrimitive): boolean {
    if (typeof left === 'number' && typeof right === 'number') {
      switch (opName) {
        case '<':
          return left < right;
        case '>':
          return left > right;
        case '<=':
          return left <= right;
        case '>=':
          return left >= right;
      }
    }
    if (typeof left === 'string' && typeof right === 'string') {
      switch (opName) {
        case '<':
          return left < right;
        case '>':
          return left > right;
        case '<=':
          return left <= right;
        case '>=':
          return left >= right;
      }
    }
    throw new EvalError(`comparison ${opName} requires two numbers or two strings`);
  }
}

function op(operator: string): string {
  return operator;
}

/**
 * 组态内表达式求值器（I6.2）：`@{pointId}` 引用 + 算术/比较/三元/字符串拼接子集。
 * 依赖链收集（语法级 refs）+ 按依赖失效的缓存 + 表达式点环检测（active 栈）。
 */
export class ExpressionEvaluator {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly active = new Set<string>();

  constructor(private readonly context: ExpressionEvaluatorContext) {}

  evaluate(expression: string): EvaluationResult {
    const cached = this.cache.get(expression);
    if (cached) return cached.result;
    const deps = extractPointIdRefs(expression);
    let result: EvaluationResult;
    try {
      const tokens = tokenize(expression);
      const ast = new Parser(tokens).parse();
      const value = new Evaluator(this.context).evaluate(ast);
      result = { ok: true, value };
    } catch (error) {
      result = {
        ok: false,
        error: error instanceof EvalError ? error.message : `expression error: ${String(error)}`,
      };
    }
    this.cache.set(expression, { deps, result });
    return result;
  }

  /** 重算表达式点（source='expression'）：active 栈环检测（binding-cycle Failure Path）。 */
  evaluatePoint(pointId: string): EvaluationResult {
    if (this.active.has(pointId)) {
      return { ok: false, error: `circular dependency involving point: ${pointId}` };
    }
    const expression = this.context.getPointExpression?.(pointId);
    if (expression === undefined) {
      return { ok: false, error: `no expression declared for point: ${pointId}` };
    }
    this.active.add(pointId);
    try {
      return this.evaluate(expression);
    } finally {
      this.active.delete(pointId);
    }
  }

  dependenciesOf(expression: string): string[] {
    return extractPointIdRefs(expression);
  }

  /** 依赖 pointId 的表达式缓存失效（点表值变化时）。 */
  invalidate(pointId: string): void {
    for (const [expression, entry] of this.cache) {
      if (entry.deps.includes(pointId)) {
        this.cache.delete(expression);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.active.clear();
  }
}
