export type TokenType =
  | 'eof'
  | 'identifier'
  | 'number'
  | 'string'
  | 'punctuation'
  | 'operator'
  | 'arrow'
  | 'keyword';

export interface FormulaToken {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

const TWO_CHAR_OPERATORS = new Set(['?.', '??', '&&', '||', '==', '!=', '<=', '>=', '<<', '>>', '**', '=>']);
const THREE_CHAR_OPERATORS = new Set(['===', '!==', '>>>']);
const PUNCTUATION = new Set(['(', ')', '[', ']', '{', '}', ',', ':', '?', '.']);
const KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'instanceof', 'and', 'or']);

function isWhitespace(value: string): boolean {
  return /\s/.test(value);
}

function isDigit(value: string | undefined): boolean {
  return value !== undefined && /[0-9]/.test(value);
}

function isIdentifierStart(value: string | undefined): boolean {
  return value !== undefined && /[$A-Za-z_\u0080-\uffff]/.test(value);
}

function isIdentifierPart(value: string | undefined): boolean {
  return value !== undefined && /[$0-9A-Za-z_\u0080-\uffff]/.test(value);
}

function readString(source: string, start: number): FormulaToken {
  const quote = source[start];
  let index = start + 1;

  while (index < source.length) {
    const current = source[index];
    if (current === '\\') {
      index += 2;
      continue;
    }
    if (current === quote) {
      return {
        type: 'string',
        value: source.slice(start, index + 1),
        start,
        end: index + 1
      };
    }
    index += 1;
  }

  throw new Error(`Unterminated string literal at ${start}`);
}

function readNumber(source: string, start: number): FormulaToken {
  let index = start;

  while (isDigit(source[index])) {
    index += 1;
  }

  if (source[index] === '.' && isDigit(source[index + 1])) {
    index += 1;
    while (isDigit(source[index])) {
      index += 1;
    }
  }

  if ((source[index] === 'e' || source[index] === 'E') && (isDigit(source[index + 1]) || ((source[index + 1] === '+' || source[index + 1] === '-') && isDigit(source[index + 2])))) {
    index += 1;
    if (source[index] === '+' || source[index] === '-') {
      index += 1;
    }
    while (isDigit(source[index])) {
      index += 1;
    }
  }

  return {
    type: 'number',
    value: source.slice(start, index),
    start,
    end: index
  };
}

function readIdentifier(source: string, start: number): FormulaToken {
  let index = start + 1;
  while (isIdentifierPart(source[index])) {
    index += 1;
  }

  const value = source.slice(start, index);
  return {
    type: KEYWORDS.has(value) ? 'keyword' : 'identifier',
    value,
    start,
    end: index
  };
}

export function tokenizeFormula(source: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let index = 0;

  while (index < source.length) {
    const current = source[index];

    if (isWhitespace(current)) {
      index += 1;
      continue;
    }

    const threeChars = source.slice(index, index + 3);
    if (THREE_CHAR_OPERATORS.has(threeChars)) {
      tokens.push({ type: 'operator', value: threeChars, start: index, end: index + 3 });
      index += 3;
      continue;
    }

    const twoChars = source.slice(index, index + 2);
    if (TWO_CHAR_OPERATORS.has(twoChars)) {
      tokens.push({ type: twoChars === '=>' ? 'arrow' : 'operator', value: twoChars, start: index, end: index + 2 });
      index += 2;
      continue;
    }

    if (current === '"' || current === "'") {
      const token = readString(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }

    if (isDigit(current) || (current === '.' && isDigit(source[index + 1]))) {
      const token = readNumber(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }

    if (isIdentifierStart(current)) {
      const token = readIdentifier(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }

    if (PUNCTUATION.has(current)) {
      tokens.push({ type: 'punctuation', value: current, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if ('+-*/%<>&|^!~='.includes(current)) {
      tokens.push({ type: 'operator', value: current, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected token '${current}' at ${index}`);
  }

  tokens.push({ type: 'eof', value: '', start: source.length, end: source.length });
  return tokens;
}
