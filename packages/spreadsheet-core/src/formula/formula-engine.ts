/**
 * 最小电子表格公式引擎（ux-r4）。
 *
 * 语法面：`=公式` 前缀；单元格引用 A1；区域 A1:B2（仅函数实参位）；四则 + - * /、
 * 幂 ^、一元负号、括号、比较 = <> < > <= >=；数值/字符串/布尔字面量；
 * 函数 SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/ROUND/ABS。
 *
 * 错误值：#CIRC!（循环引用，由求值上下文 visiting 集合判定）、#NAME?（未知函数）、
 * #DIV/0!、#REF!（引用越界/解析失败）、#ERROR!（语法错误）。错误按 Excel 语义传播
 * （操作数含错误值 → 结果为该错误值）。
 *
 * 纯函数：单元格取值经注入的 resolver（含递归依赖求值 + 循环检测），本模块不触碰文档。
 */

export type FormulaValue = number | string | boolean | null;

type CellResolver = (col: number, row: number) => FormulaValue;

const ERROR_NAME = '#NAME?';
const ERROR_DIV0 = '#DIV/0!';
const ERROR_REF = '#REF!';
const ERROR_PARSE = '#ERROR!';

export function isFormulaError(value: FormulaValue): value is string {
  return typeof value === 'string' && value.startsWith('#') && value.endsWith('!');
}

interface Token {
  kind: 'number' | 'string' | 'bool' | 'ident' | 'cellref' | 'op' | 'lparen' | 'rparen' | 'comma' | 'colon';
  text: string;
}

const CELL_REF_PATTERN = /^\$?[A-Za-z]{1,3}\$?[1-9]\d*(?::\$?[A-Za-z]{1,3}\$?[1-9]\d*)?$/;

function tokenize(input: string): Token[] | string {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === ' ' || ch === '\t') {
      i += 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) {
        j += 1;
      }
      tokens.push({ kind: 'number', text: input.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let text = '';
      while (j < input.length && input[j] !== '"') {
        text += input[j];
        j += 1;
      }
      if (j >= input.length) {
        return ERROR_PARSE;
      }
      tokens.push({ kind: 'string', text });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < input.length && /[A-Za-z0-9_$.]/.test(input[j])) {
        j += 1;
      }
      const text = input.slice(i, j);
      if (CELL_REF_PATTERN.test(text)) {
        tokens.push({ kind: 'cellref', text });
      } else {
        tokens.push({ kind: 'ident', text });
      }
      i = j;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen', text: ch });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen', text: ch });
      i += 1;
      continue;
    }
    if (ch === ',' || ch === '，') {
      tokens.push({ kind: 'comma', text: ',' });
      i += 1;
      continue;
    }
    if (ch === ':') {
      tokens.push({ kind: 'colon', text: ch });
      i += 1;
      continue;
    }
    const two = input.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '<>') {
      tokens.push({ kind: 'op', text: two });
      i += 2;
      continue;
    }
    if ('+-*/^&=<>%'.includes(ch)) {
      tokens.push({ kind: 'op', text: ch });
      i += 1;
      continue;
    }
    return ERROR_PARSE;
  }
  return tokens;
}

/** "B2" / "$B$2" → 0-based {col, row}（与 cellAddress 消费口径一致）；越出三字母列或 0 行 → null（#REF!）。 */
export function parseCellRefText(text: string): { col: number; row: number } | null {
  const match = /^\$?([A-Za-z]{1,3})\$?([1-9]\d*)$/.exec(text);
  if (!match) {
    return null;
  }
  let col1 = 0;
  for (const ch of match[1].toUpperCase()) {
    col1 = col1 * 26 + (ch.charCodeAt(0) - 64);
  }
  const col = col1 - 1;
  const row = Number.parseInt(match[2], 10) - 1;
  return { col, row };
}

type Node =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'cellref'; col: number; row: number }
  | { kind: 'range'; from: { col: number; row: number }; to: { col: number; row: number } }
  | { kind: 'unary'; op: '-' | '+'; operand: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] };

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const token = this.tokens[this.pos];
    this.pos += 1;
    return token;
  }

  parseExpression(): Node | string {
    const node = this.parseComparison();
    if (typeof node !== 'string' && this.peek() !== undefined) {
      return ERROR_PARSE;
    }
    return node;
  }

  private parseComparison(): Node | string {
    let left = this.parseAdditive();
    if (typeof left === 'string') {
      return left;
    }
    while (true) {
      const token = this.peek();
      if (!token || token.kind !== 'op' || !['=', '<>', '<', '>', '<=', '>='].includes(token.text)) {
        return left;
      }
      this.consume();
      const right = this.parseAdditive();
      if (typeof right === 'string') {
        return right;
      }
      left = { kind: 'binary', op: token.text, left, right };
    }
  }

  private parseAdditive(): Node | string {
    let left = this.parseMultiplicative();
    if (typeof left === 'string') {
      return left;
    }
    while (true) {
      const token = this.peek();
      if (!token || token.kind !== 'op' || !(token.text === '+' || token.text === '-')) {
        return left;
      }
      this.consume();
      const right = this.parseMultiplicative();
      if (typeof right === 'string') {
        return right;
      }
      left = { kind: 'binary', op: token.text, left, right };
    }
  }

  private parseMultiplicative(): Node | string {
    let left = this.parseUnary();
    if (typeof left === 'string') {
      return left;
    }
    while (true) {
      const token = this.peek();
      if (!token || token.kind !== 'op' || !(token.text === '*' || token.text === '/')) {
        return left;
      }
      this.consume();
      const right = this.parseUnary();
      if (typeof right === 'string') {
        return right;
      }
      left = { kind: 'binary', op: token.text, left, right };
    }
  }

  private parseUnary(): Node | string {
    const token = this.peek();
    if (token && token.kind === 'op' && (token.text === '-' || token.text === '+')) {
      this.consume();
      const operand = this.parseUnary();
      if (typeof operand === 'string') {
        return operand;
      }
      return { kind: 'unary', op: token.text as '-' | '+', operand };
    }
    return this.parsePower();
  }

  private parsePower(): Node | string {
    const base = this.parsePrimary();
    if (typeof base === 'string') {
      return base;
    }
    const token = this.peek();
    if (token && token.kind === 'op' && token.text === '^') {
      this.consume();
      const exponent = this.parseUnary();
      if (typeof exponent === 'string') {
        return exponent;
      }
      return { kind: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  private parsePrimary(): Node | string {
    const token = this.consume();
    if (!token) {
      return ERROR_PARSE;
    }
    if (token.kind === 'number') {
      return { kind: 'number', value: Number.parseFloat(token.text) };
    }
    if (token.kind === 'string') {
      return { kind: 'string', value: token.text };
    }
    if (token.kind === 'bool') {
      return { kind: 'bool', value: token.text.toUpperCase() === 'TRUE' };
    }
    if (token.kind === 'cellref') {
      const from = parseCellRefText(token.text);
      if (!from) {
        return ERROR_REF;
      }
      // 区域跨三个 token（cellref ':' cellref）——tokenizer 在 ':' 处切分
      const second = this.peek();
      if (second && second.kind === 'colon') {
        this.consume();
        const third = this.consume();
        if (!third || third.kind !== 'cellref') {
          return ERROR_PARSE;
        }
        const to = parseCellRefText(third.text);
        if (!to) {
          return ERROR_REF;
        }
        return {
          kind: 'range',
          from: { col: Math.min(from.col, to.col), row: Math.min(from.row, to.row) },
          to: { col: Math.max(from.col, to.col), row: Math.max(from.row, to.row) },
        };
      }
      return { kind: 'cellref', col: from.col, row: from.row };
    }
    if (token.kind === 'ident') {
      const next = this.peek();
      if (next && next.kind === 'lparen') {
        this.consume();
        const args: Node[] = [];
        const first = this.peek();
        if (first && first.kind === 'rparen') {
          this.consume();
          return { kind: 'call', name: token.text.toUpperCase(), args };
        }
        while (true) {
          const arg = this.parseComparison();
          if (typeof arg === 'string') {
            return arg;
          }
          args.push(arg);
          const separator = this.peek();
          if (separator && separator.kind === 'comma') {
            this.consume();
            continue;
          }
          break;
        }
        const closing = this.peek();
        if (!closing || closing.kind !== 'rparen') {
          return ERROR_PARSE;
        }
        this.consume();
        return { kind: 'call', name: token.text.toUpperCase(), args };
      }
      if (token.text.toUpperCase() === 'TRUE' || token.text.toUpperCase() === 'FALSE') {
        return { kind: 'bool', value: token.text.toUpperCase() === 'TRUE' };
      }
      // 类引用形态（字母列+行号）但越界（如 ZZZZ1 四字母列）→ #REF! 而非 #NAME?
      if (/^\$?[A-Za-z]{1,}\$?[1-9]\d*$/.test(token.text)) {
        return ERROR_REF;
      }
      return ERROR_NAME;
    }
    if (token.kind === 'lparen') {
      const inner = this.parseComparison();
      if (typeof inner === 'string') {
        return inner;
      }
      const closing = this.peek();
      if (!closing || closing.kind !== 'rparen') {
        return ERROR_PARSE;
      }
      this.consume();
      return inner;
    }
    return ERROR_PARSE;
  }
}

interface RangeResolver {
  (from: { col: number; row: number }, to: { col: number; row: number }): FormulaValue[];
}

interface EvaluateContext {
  resolveCell: CellResolver;
  resolveRange: RangeResolver;
}

function toNumber(value: FormulaValue): number | string {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return `#VALUE!`;
}

function compareValues(left: FormulaValue, right: FormulaValue): number | string {
  if (isFormulaError(left)) return left;
  if (isFormulaError(right)) return right;
  const ln = toNumber(left);
  const rn = toNumber(right);
  if (typeof ln === 'number' && typeof rn === 'number') {
    return ln === rn ? 0 : ln < rn ? -1 : 1;
  }
  // 混类型（如 "a" 与 1）：按 Excel 语义走字符串序比较，不视为错误
  const ls = left === null || left === undefined ? '' : String(left);
  const rs = right === null || right === undefined ? '' : String(right);
  return ls === rs ? 0 : ls < rs ? -1 : 1;
}

function evaluateNode(node: Node, ctx: EvaluateContext): FormulaValue {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    case 'bool':
      return node.value;
    case 'cellref':
      return ctx.resolveCell(node.col, node.row);
    case 'range':
      return ERROR_REF;
    case 'unary': {
      const value = evaluateNode(node.operand, ctx);
      if (isFormulaError(value)) return value;
      const num = toNumber(value);
      if (typeof num === 'string') return num;
      return node.op === '-' ? -num : num;
    }
    case 'binary': {
      if (['=', '<>', '<', '>', '<=', '>='].includes(node.op)) {
        const lv = evaluateNode(node.left, ctx);
        if (isFormulaError(lv)) return lv;
        const rv = evaluateNode(node.right, ctx);
        if (isFormulaError(rv)) return rv;
        const cmp = compareValues(lv, rv);
        if (typeof cmp === 'string') return cmp;
        switch (node.op) {
          case '=':
            return cmp === 0;
          case '<>':
            return cmp !== 0;
          case '<':
            return cmp < 0;
          case '>':
            return cmp > 0;
          case '<=':
            return cmp <= 0;
          case '>=':
            return cmp >= 0;
        }
      }
      const left = evaluateNode(node.left, ctx);
      if (isFormulaError(left)) return left;
      const right = evaluateNode(node.right, ctx);
      if (isFormulaError(right)) return right;
      const ln = toNumber(left);
      if (typeof ln === 'string') return ln;
      const rn = toNumber(right);
      if (typeof rn === 'string') return rn;
      switch (node.op) {
        case '+':
          return ln + rn;
        case '-':
          return ln - rn;
        case '*':
          return ln * rn;
        case '/':
          return rn === 0 ? ERROR_DIV0 : ln / rn;
        case '^':
          return ln ** rn;
        case '&':
          return `${String(left ?? '')}${String(right ?? '')}`;
        case '%':
          return ln / 100;
      }
      return ERROR_PARSE;
    }
    case 'call': {
      const argValues: FormulaValue[] = [];
      for (const arg of node.args) {
        if (arg.kind === 'range') {
          argValues.push(...ctx.resolveRange(arg.from, arg.to));
          continue;
        }
        argValues.push(evaluateNode(arg, ctx));
      }
      switch (node.name) {
        case 'SUM': {
          let sum = 0;
          for (const value of argValues) {
            if (isFormulaError(value)) return value;
            const num = toNumber(value);
            // Excel 语义：聚合对非数值文本跳过（区域引用含表头文本时求和不受污染）
            if (typeof num === 'string') continue;
            sum += num;
          }
          return sum;
        }
        case 'AVERAGE': {
          let sum = 0;
          let count = 0;
          for (const value of argValues) {
            if (isFormulaError(value)) return value;
            const num = toNumber(value);
            if (typeof num === 'string') continue;
            sum += num;
            count += 1;
          }
          return count === 0 ? ERROR_DIV0 : sum / count;
        }
        case 'MIN':
        case 'MAX': {
          let best: number | null = null;
          for (const value of argValues) {
            if (isFormulaError(value)) return value;
            const num = toNumber(value);
            if (typeof num === 'string') continue;
            if (best === null || (node.name === 'MIN' ? num < best : num > best)) {
              best = num;
            }
          }
          return best ?? 0;
        }
        case 'COUNT': {
          let count = 0;
          for (const value of argValues) {
            if (typeof value === 'number') count += 1;
          }
          return count;
        }
        case 'COUNTA': {
          let count = 0;
          for (const value of argValues) {
            if (value !== null && value !== undefined && value !== '') count += 1;
          }
          return count;
        }
        case 'ABS': {
          if (argValues.length !== 1) return ERROR_PARSE;
          const num = toNumber(argValues[0]);
          if (typeof num === 'string') return num;
          return Math.abs(num);
        }
        case 'ROUND': {
          if (argValues.length < 1 || argValues.length > 2) return ERROR_PARSE;
          const num = toNumber(argValues[0]);
          if (typeof num === 'string') return num;
          const digits = argValues.length === 2 ? toNumber(argValues[1]) : 0;
          if (typeof digits === 'string') return digits;
          const factor = 10 ** digits;
          return Math.round(num * factor) / factor;
        }
      }
      return ERROR_NAME;
    }
  }
}

/** 求值 `=` 后的公式体（不含 `=` 前缀）；语法错误等以 `#ERROR!` 系字符串返回。 */
export function evaluateFormulaBody(body: string, ctx: EvaluateContext): FormulaValue {
  const tokens = tokenize(body);
  if (typeof tokens === 'string') {
    return tokens;
  }
  if (tokens.length === 0) {
    return ERROR_PARSE;
  }
  const ast = new Parser(tokens).parseExpression();
  if (typeof ast === 'string') {
    return ast;
  }
  return evaluateNode(ast, ctx);
}
