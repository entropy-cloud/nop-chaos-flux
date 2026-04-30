import { describe, expect, it } from 'vitest';
import { tokenizeFormula } from './lexer';

describe('tokenizeFormula', () => {
  it('tokenizes unicode identifiers, numbers, strings, keywords, and operators', () => {
    const tokens = tokenizeFormula('变量 and foo?.bar ?? .5e+2 !== "x"');

    expect(tokens.map((token) => [token.type, token.value])).toEqual([
      ['identifier', '变量'],
      ['keyword', 'and'],
      ['identifier', 'foo'],
      ['operator', '?.'],
      ['identifier', 'bar'],
      ['operator', '??'],
      ['number', '.5e+2'],
      ['operator', '!=='],
      ['string', '"x"'],
      ['eof', ''],
    ]);
  });

  it('tokenizes arrows and bitshift operators', () => {
    const tokens = tokenizeFormula('value => value >>> 1');
    expect(tokens.map((token) => token.type)).toEqual([
      'identifier',
      'arrow',
      'identifier',
      'operator',
      'number',
      'eof',
    ]);
  });

  it('throws on unterminated strings and unexpected tokens', () => {
    expect(() => tokenizeFormula('"unterminated')).toThrow(/Unterminated string literal/);
    expect(() => tokenizeFormula('@bad')).toThrow(/Unexpected token '@'/);
  });
});
