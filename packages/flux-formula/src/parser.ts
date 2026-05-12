import type {
  ArrayExpressionNode,
  ArrowFunctionExpressionNode,
  FormulaAstNode,
  IdentifierNode,
  ObjectExpressionNode,
  PropertyNode,
} from './ast.js';
import { tokenizeFormula, type FormulaToken } from './lexer.js';
import {
  createIdentifierNode,
  createLiteralNode,
  createMemberExpressionNode,
  createSourceLocation,
} from './parser-node-factories.js';

export interface FormulaSyntaxError extends Error {
  index: number;
  source: string;
}

const MAX_PARSER_DEPTH = 256;

function parseStringLiteral(raw: string): string {
  if (raw.startsWith('"')) {
    return JSON.parse(raw);
  }

  if (!raw.startsWith("'")) {
    throw new Error(`Unsupported string literal: ${raw}`);
  }

  let normalized = '"';
  for (let index = 1; index < raw.length - 1; index += 1) {
    const current = raw[index];

    if (current === '\\') {
      const next = raw[index + 1];
      if (next === undefined || index + 1 >= raw.length - 1) {
        throw new Error(`Unterminated string literal: ${raw}`);
      }

      if (next === "'") {
        normalized += "'";
      } else if (next === '"') {
        normalized += '\\"';
      } else {
        normalized += `\\${next}`;
      }
      index += 1;
      continue;
    }

    if (current === '"') {
      normalized += '\\"';
      continue;
    }

    normalized += current;
  }

  normalized += '"';
  return JSON.parse(normalized);
}

class Parser {
  private readonly tokens: FormulaToken[];
  private index = 0;
  private depth = 0;

  constructor(private readonly source: string) {
    this.tokens = tokenizeFormula(source);
  }

  parse(): FormulaAstNode {
    const expression = this.parseArrowExpression();
    this.expect('eof');
    return expression;
  }

  private current(): FormulaToken {
    return this.tokens[this.index];
  }

  private lookahead(offset = 1): FormulaToken {
    return this.tokens[this.index + offset] ?? this.tokens[this.tokens.length - 1];
  }

  private consume(): FormulaToken {
    const token = this.current();
    this.index += 1;
    return token;
  }

  private match(type: FormulaToken['type'], value?: string): boolean {
    const token = this.current();
    return token.type === type && (value === undefined || token.value === value);
  }

  private expect(type: FormulaToken['type'], value?: string): FormulaToken {
    if (!this.match(type, value)) {
      this.throwSyntaxError(`Expected ${value ?? type}`);
    }
    return this.consume();
  }

  private throwSyntaxError(message: string): never {
    const error = new Error(`${message} at ${this.current().start}`) as FormulaSyntaxError;
    error.index = this.current().start;
    error.source = this.source;
    throw error;
  }

  private enterRecursive(): void {
    this.depth += 1;
    if (this.depth > MAX_PARSER_DEPTH) {
      throw new Error(
        `Parser depth limit exceeded (${MAX_PARSER_DEPTH}) at ${this.current().start}`,
      ) as FormulaSyntaxError;
    }
  }

  private leaveRecursive(): void {
    this.depth -= 1;
  }

  private parseArrowExpression(): FormulaAstNode {
    this.enterRecursive();
    try {
      if (this.match('identifier') && this.lookahead().type === 'arrow') {
        const param = this.consume();
        this.consume();
        const body = this.parseArrowExpression();
        return {
          type: 'ArrowFunctionExpression',
          params: [createIdentifierNode(param)],
          body,
          loc: createSourceLocation(param.start, body.loc.end),
        } satisfies ArrowFunctionExpressionNode;
      }

      if (this.isArrowParameterList()) {
        const start = this.current().start;
        const params = this.parseArrowParameters();
        const body = this.parseArrowExpression();
        return {
          type: 'ArrowFunctionExpression',
          params,
          body,
          loc: createSourceLocation(start, body.loc.end),
        } satisfies ArrowFunctionExpressionNode;
      }

      return this.parseConditional();
    } finally {
      this.leaveRecursive();
    }
  }

  private isArrowParameterList(): boolean {
    if (!this.match('punctuation', '(')) {
      return false;
    }

    let cursor = this.index + 1;
    let expectParam = true;

    while (cursor < this.tokens.length) {
      const token = this.tokens[cursor];
      if (token.type === 'punctuation' && token.value === ')') {
        return this.tokens[cursor + 1]?.type === 'arrow';
      }

      if (expectParam) {
        if (token.type !== 'identifier') {
          return false;
        }
        expectParam = false;
        cursor += 1;
        continue;
      }

      if (token.type === 'punctuation' && token.value === ',') {
        expectParam = true;
        cursor += 1;
        continue;
      }

      return false;
    }

    return false;
  }

  private parseArrowParameters(): IdentifierNode[] {
    this.expect('punctuation', '(');
    const params = [];
    if (!this.match('punctuation', ')')) {
      for (;;) {
        const token = this.expect('identifier');
        if (token.value.startsWith('$')) {
          this.throwSyntaxError('Lambda parameters cannot start with $');
        }
        params.push(createIdentifierNode(token));
        if (!this.match('punctuation', ',')) {
          break;
        }
        this.consume();
      }
    }
    this.expect('punctuation', ')');
    this.expect('arrow');
    return params;
  }

  private parseConditional(): FormulaAstNode {
    const test = this.parseNullCoalesce();
    if (!this.match('punctuation', '?')) {
      return test;
    }

    this.consume();
    const consequent = this.parseArrowExpression();
    this.expect('punctuation', ':');
    const alternate = this.parseArrowExpression();
    return {
      type: 'ConditionalExpression',
      test,
      consequent,
      alternate,
      loc: createSourceLocation(test.loc.start, alternate.loc.end),
    };
  }

  private parseNullCoalesce(): FormulaAstNode {
    let left = this.parseLogicalOr();
    while (this.match('operator', '??')) {
      this.consume();
      const right = this.parseLogicalOr();
      left = {
        type: 'NullCoalesceExpression',
        left,
        right,
        loc: createSourceLocation(left.loc.start, right.loc.end),
      };
    }
    return left;
  }

  private parseLogicalOr(): FormulaAstNode {
    return this.parseBinaryChain(() => this.parseLogicalAnd(), ['||', 'or'], 'LogicalExpression');
  }

  private parseLogicalAnd(): FormulaAstNode {
    return this.parseBinaryChain(() => this.parseBitwiseOr(), ['&&', 'and'], 'LogicalExpression');
  }

  private parseBitwiseOr(): FormulaAstNode {
    return this.parseBinaryChain(() => this.parseBitwiseXor(), ['|'], 'BinaryExpression');
  }

  private parseBitwiseXor(): FormulaAstNode {
    return this.parseBinaryChain(() => this.parseBitwiseAnd(), ['^'], 'BinaryExpression');
  }

  private parseBitwiseAnd(): FormulaAstNode {
    return this.parseBinaryChain(() => this.parseEquality(), ['&'], 'BinaryExpression');
  }

  private parseEquality(): FormulaAstNode {
    return this.parseBinaryChain(
      () => this.parseComparison(),
      ['==', '!=', '===', '!=='],
      'BinaryExpression',
    );
  }

  private parseComparison(): FormulaAstNode {
    return this.parseBinaryChain(
      () => this.parseShift(),
      ['<', '<=', '>', '>=', 'instanceof'],
      'BinaryExpression',
    );
  }

  private parseShift(): FormulaAstNode {
    return this.parseBinaryChain(
      () => this.parseAdditive(),
      ['<<', '>>', '>>>'],
      'BinaryExpression',
    );
  }

  private parseAdditive(): FormulaAstNode {
    return this.parseBinaryChain(() => this.parseMultiplicative(), ['+', '-'], 'BinaryExpression');
  }

  private parseMultiplicative(): FormulaAstNode {
    return this.parseBinaryChain(() => this.parseExponent(), ['*', '/', '%'], 'BinaryExpression');
  }

  private parseExponent(): FormulaAstNode {
    const left = this.parseUnary();
    if (!this.match('operator', '**')) {
      return left;
    }
    this.consume();
    const right = this.parseExponent();
    return {
      type: 'BinaryExpression',
      op: '**',
      left,
      right,
      loc: createSourceLocation(left.loc.start, right.loc.end),
    };
  }

  private parseUnary(): FormulaAstNode {
    if (this.match('operator') && ['!', '~', '-', '+'].includes(this.current().value)) {
      const operator = this.consume();
      const argument = this.parseUnary();
      return {
        type: 'UnaryExpression',
        op: operator.value,
        argument,
        loc: createSourceLocation(operator.start, argument.loc.end),
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): FormulaAstNode {
    let expression = this.parsePrimary();

    while (true) {
      if (this.match('operator', '?.')) {
        const operator = this.consume();
        const property = createIdentifierNode(this.expect('identifier'));
        expression = createMemberExpressionNode({
          object: expression,
          property,
          computed: false,
          optional: true,
          end: property.loc.end,
        });
        if (this.match('punctuation', '(')) {
          this.throwSyntaxError('Optional call is not supported');
        }
        void operator;
        continue;
      }

      if (this.match('punctuation', '.')) {
        this.consume();
        const property = createIdentifierNode(this.expect('identifier'));
        expression = createMemberExpressionNode({
          object: expression,
          property,
          computed: false,
          optional: false,
          end: property.loc.end,
        });
        continue;
      }

      if (this.match('punctuation', '[')) {
        this.consume();
        const property = this.parseArrowExpression();
        const closing = this.expect('punctuation', ']');
        expression = createMemberExpressionNode({
          object: expression,
          property,
          computed: true,
          optional: false,
          end: closing.end,
        });
        continue;
      }

      if (this.match('punctuation', '(')) {
        const args = this.parseArguments();
        expression = {
          type: 'CallExpression',
          callee: expression,
          arguments: args,
          loc: createSourceLocation(expression.loc.start, this.tokens[this.index - 1].end),
        };
        continue;
      }

      break;
    }

    return expression;
  }

  private parseArguments(): FormulaAstNode[] {
    this.expect('punctuation', '(');
    const args: FormulaAstNode[] = [];
    if (!this.match('punctuation', ')')) {
      for (;;) {
        args.push(this.parseArrowExpression());
        if (!this.match('punctuation', ',')) {
          break;
        }
        this.consume();
      }
    }
    this.expect('punctuation', ')');
    return args;
  }

  private parsePrimary(): FormulaAstNode {
    this.enterRecursive();
    try {
      const token = this.current();

      if (this.match('number')) {
        this.consume();
        return createLiteralNode(Number(token.value), token.value, token.start, token.end);
      }

      if (this.match('string')) {
        this.consume();
        return createLiteralNode(parseStringLiteral(token.value), token.value, token.start, token.end);
      }

      if (this.match('keyword', 'true') || this.match('keyword', 'false')) {
        this.consume();
        return createLiteralNode(token.value === 'true', token.value, token.start, token.end);
      }

      if (this.match('keyword', 'null')) {
        this.consume();
        return createLiteralNode(null, token.value, token.start, token.end);
      }

      if (this.match('keyword', 'undefined')) {
        this.consume();
        return createLiteralNode(undefined, token.value, token.start, token.end);
      }

      if (this.match('identifier')) {
        this.consume();
        return createIdentifierNode(token);
      }

      if (this.match('punctuation', '(')) {
        this.consume();
        const expression = this.parseArrowExpression();
        this.expect('punctuation', ')');
        return expression;
      }

      if (this.match('punctuation', '[')) {
        return this.parseArrayExpression();
      }

      if (this.match('punctuation', '{')) {
        return this.parseObjectExpression();
      }

      this.throwSyntaxError(`Unexpected token ${token.value || token.type}`);
    } finally {
      this.leaveRecursive();
    }
  }

  private parseArrayExpression(): ArrayExpressionNode {
    const start = this.expect('punctuation', '[').start;
    const elements: FormulaAstNode[] = [];
    if (!this.match('punctuation', ']')) {
      for (;;) {
        elements.push(this.parseArrowExpression());
        if (!this.match('punctuation', ',')) {
          break;
        }
        this.consume();
      }
    }
    const end = this.expect('punctuation', ']').end;
    return {
      type: 'ArrayExpression',
      elements,
      loc: createSourceLocation(start, end),
    };
  }

  private parseObjectExpression(): ObjectExpressionNode {
    const start = this.expect('punctuation', '{').start;
    const properties: PropertyNode[] = [];
    if (!this.match('punctuation', '}')) {
      for (;;) {
        const keyToken = this.current();
        let key: FormulaAstNode;
        let computed = false;
        let shorthand = false;

        if (this.match('punctuation', '[')) {
          this.consume();
          key = this.parseArrowExpression();
          this.expect('punctuation', ']');
          computed = true;
        } else if (this.match('identifier')) {
          key = createIdentifierNode(this.consume());
        } else if (this.match('string')) {
          const token = this.consume();
          key = createLiteralNode(
            parseStringLiteral(token.value),
            token.value,
            token.start,
            token.end,
          );
        } else {
          this.throwSyntaxError('Invalid object key');
        }

        let value: FormulaAstNode;
        if (this.match('punctuation', ':')) {
          this.consume();
          value = this.parseArrowExpression();
        } else if (!computed && key.type === 'Identifier') {
          shorthand = true;
          value = key;
        } else {
          this.throwSyntaxError('Expected : in object literal');
        }

        properties.push({
          type: 'Property',
          key,
          value,
          computed,
          shorthand,
          loc: createSourceLocation(keyToken.start, value.loc.end),
        });

        if (!this.match('punctuation', ',')) {
          break;
        }
        this.consume();
      }
    }

    const end = this.expect('punctuation', '}').end;
    return {
      type: 'ObjectExpression',
      properties,
      loc: createSourceLocation(start, end),
    };
  }

  private parseBinaryChain(
    parseOperand: () => FormulaAstNode,
    operators: string[],
    type: 'BinaryExpression' | 'LogicalExpression',
  ): FormulaAstNode {
    let expression = parseOperand();
    while (
      (this.match('operator') || this.match('keyword')) &&
      operators.includes(this.current().value)
    ) {
      const operator = this.consume();
      const right = parseOperand();
      expression = {
        type,
        op: operator.value,
        left: expression,
        right,
        loc: createSourceLocation(expression.loc.start, right.loc.end),
      } as FormulaAstNode;
    }
    return expression;
  }
}

export function parseFormula(source: string): FormulaAstNode {
  return new Parser(source).parse();
}
