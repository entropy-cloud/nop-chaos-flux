import { describe, expect, it } from 'vitest';
import {
  evaluateFormulaBody,
  parseCellRefText,
  type FormulaValue,
} from './formula-engine.js';

function makeCtx(cells: Record<string, FormulaValue>) {
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
      const values: FormulaValue[] = [];
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

describe('evaluateFormulaBody - 字面量与算术（ux-r4 Phase 1）', () => {
  it('数值/字符串/布尔字面量', () => {
    expect(evaluateFormulaBody('1.5', makeCtx({}))).toBe(1.5);
    expect(evaluateFormulaBody('"hello"', makeCtx({}))).toBe('hello');
    expect(evaluateFormulaBody('TRUE', makeCtx({}))).toBe(true);
  });

  it('四则与优先级/括号/一元负号/幂', () => {
    const ctx = makeCtx({});
    expect(evaluateFormulaBody('1+2*3', ctx)).toBe(7);
    expect(evaluateFormulaBody('(1+2)*3', ctx)).toBe(9);
    expect(evaluateFormulaBody('-3+1', ctx)).toBe(-2);
    expect(evaluateFormulaBody('2^3', ctx)).toBe(8);
    expect(evaluateFormulaBody('10/4', ctx)).toBe(2.5);
  });

  it('比较符', () => {
    const ctx = makeCtx({});
    expect(evaluateFormulaBody('1<2', ctx)).toBe(true);
    expect(evaluateFormulaBody('2>=3', ctx)).toBe(false);
    expect(evaluateFormulaBody('"a"="a"', ctx)).toBe(true);
    expect(evaluateFormulaBody('1<>2', ctx)).toBe(true);
  });
});

describe('evaluateFormulaBody - 单元格引用与函数', () => {
  it('单元格引用取 resolver 值参与运算', () => {
    const ctx = makeCtx({ B1: 10, B2: 7 });
    expect(evaluateFormulaBody('B1+B2', ctx)).toBe(17);
    expect(evaluateFormulaBody('B1*B2', ctx)).toBe(70);
  });

  it('SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/ROUND/ABS', () => {
    const ctx = makeCtx({ B1: 10, B2: 7, B3: 3 });
    expect(evaluateFormulaBody('SUM(B1:B3)', ctx)).toBe(20);
    expect(evaluateFormulaBody('AVERAGE(B1:B3)', ctx)).toBeCloseTo(6.6667, 3);
    expect(evaluateFormulaBody('MIN(B1:B3)', ctx)).toBe(3);
    expect(evaluateFormulaBody('MAX(B1:B3)', ctx)).toBe(10);
    expect(evaluateFormulaBody('COUNT(B1:B3)', ctx)).toBe(3);
    expect(evaluateFormulaBody('COUNTA(A1:A3)', ctx)).toBe(0);
    expect(evaluateFormulaBody('ROUND(AVERAGE(B1:B2), 1)', ctx)).toBe(8.5);
    expect(evaluateFormulaBody('ABS(0-5)', ctx)).toBe(5);
    expect(evaluateFormulaBody('SUM(B1:B2, 100)', ctx)).toBe(117);
  });

  it('聚合跳过非数值文本（区域含表头文本时求和不受污染）', () => {
    const ctx = makeCtx({ B1: 'Q1', B2: 120, B3: 'N/A', B4: 80 });
    expect(evaluateFormulaBody('SUM(B1:B4)', ctx)).toBe(200);
    expect(evaluateFormulaBody('AVERAGE(B1:B4)', ctx)).toBe(100);
    expect(evaluateFormulaBody('MIN(B1:B4)', ctx)).toBe(80);
    expect(evaluateFormulaBody('MAX(B1:B4)', ctx)).toBe(120);
    expect(evaluateFormulaBody('COUNT(B1:B4)', ctx)).toBe(2);
    expect(evaluateFormulaBody('COUNTA(B1:B4)', ctx)).toBe(4);
    // 数值字符串仍参与聚合
    const numericText = makeCtx({ B1: '5', B2: 10 });
    expect(evaluateFormulaBody('SUM(B1:B2)', numericText)).toBe(15);
    expect(evaluateFormulaBody('AVERAGE(B1:B2)', numericText)).toBe(7.5);
  });
});

describe('evaluateFormulaBody - 错误值（ux-r4 Failure Paths）', () => {
  it('#DIV/0! 除零', () => {
    expect(evaluateFormulaBody('1/0', makeCtx({}))).toBe('#DIV/0!');
  });

  it('#NAME? 未知函数', () => {
    expect(evaluateFormulaBody('FOO(1)', makeCtx({}))).toBe('#NAME?');
  });

  it('#REF! 引用越界', () => {
    expect(evaluateFormulaBody('ZZZZ1', makeCtx({}))).toBe('#REF!');
  });

  it('#ERROR! 语法错误', () => {
    expect(evaluateFormulaBody('1+', makeCtx({}))).toBe('#ERROR!');
    expect(evaluateFormulaBody('(1', makeCtx({}))).toBe('#ERROR!');
    expect(evaluateFormulaBody('"unclosed', makeCtx({}))).toBe('#ERROR!');
  });

  it('错误传播：操作数含错误值 → 结果为该错误', () => {
    const ctx = makeCtx({ B1: '#DIV/0!' });
    expect(evaluateFormulaBody('B1+1', ctx)).toBe('#DIV/0!');
    expect(evaluateFormulaBody('SUM(B1:B2)', ctx)).toBe('#DIV/0!');
  });
});

describe('parseCellRefText', () => {
  it('A1/B2/AA10/$B$2 解析', () => {
    expect(parseCellRefText('A1')).toEqual({ col: 0, row: 0 });
    expect(parseCellRefText('B2')).toEqual({ col: 1, row: 1 });
    expect(parseCellRefText('AA10')).toEqual({ col: 26, row: 9 });
    expect(parseCellRefText('$B$2')).toEqual({ col: 1, row: 1 });
  });

  it('越界形态返回 null（→ #REF!）', () => {
    expect(parseCellRefText('AAAA1')).toBeNull();
    expect(parseCellRefText('A0')).toBeNull();
  });
});
