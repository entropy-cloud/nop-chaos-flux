import { describe, expect, it } from 'vitest';
import { evaluateFormulaBody, isFormulaError } from './formula-engine.js';

// P1-MA4.4-005 regression guard: formula error-value classification. The
// legacy predicate (`startsWith('#') && endsWith('!')`) misclassified
// `#NAME?` (?-terminated) and `#N/A` (no bang) — the engine's own #NAME?
// output escaped propagation. The fix switches to an enumerated error-value
// set; the matrix below drives five error values through arithmetic,
// aggregate, and comparison operations asserting Excel propagation semantics
// (operand error -> same error out).

function makeCtx(cells: Record<string, string | number | boolean | null>) {
  const parse = (text: string) => {
    const m = /^\$?([A-Za-z]{1,3})\$?([1-9]\d*)$/.exec(text)!;
    let col = 0;
    for (const ch of m[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
    return { col, row: Number.parseInt(m[2], 10) };
  };
  const addressOf = (col: number, row: number) => {
    let text = '';
    let c = col;
    while (c >= 0) {
      text = String.fromCharCode(65 + (c % 26)) + text;
      c = Math.floor(c / 26) - 1;
    }
    return `${text}${row + 1}`;
  };
  return {
    resolveCell: (col: number, row: number) => cells[addressOf(col, row)] ?? null,
    resolveRange: (from: { col: number; row: number }, to: { col: number; row: number }) => {
      const values: (string | number | boolean | null)[] = [];
      for (let row = from.row; row <= to.row; row += 1) {
        for (let col = from.col; col <= to.col; col += 1) {
          values.push(cells[addressOf(col, row)] ?? null);
        }
      }
      return values;
    },
    parse,
  };
}

const ERROR_VALUES = ['#CIRC!', '#NAME?', '#N/A', '#DIV/0!', '#VALUE!'] as const;

describe('formula error-value classification (P1-MA4.4-005)', () => {
  it('predicate: every enumerated error value is classified as an error; near-misses are not', () => {
    for (const value of ERROR_VALUES) {
      expect(isFormulaError(value), `predicate must accept ${value}`).toBe(true);
    }
    expect(isFormulaError('#REF!')).toBe(true);
    expect(isFormulaError('#ERROR!')).toBe(true);
    for (const nearMiss of ['#NAME', '#N', 'name?', '#DIV/0', 'VALUE!', '']) {
      expect(isFormulaError(nearMiss), `predicate must reject near-miss ${JSON.stringify(nearMiss)}`).toBe(false);
    }
  });

  it.each(ERROR_VALUES)('matrix: %s propagates through arithmetic, aggregate, and comparison', (errorValue) => {
    const arithmetic = evaluateFormulaBody('A1+1', makeCtx({ A1: errorValue }));
    expect(arithmetic).toBe(errorValue);

    const aggregate = evaluateFormulaBody('SUM(B1:B2)', makeCtx({ B1: errorValue, B2: 3 }));
    expect(aggregate).toBe(errorValue);

    const comparison = evaluateFormulaBody('A1<5', makeCtx({ A1: errorValue }));
    expect(comparison).toBe(errorValue);
  });
});
