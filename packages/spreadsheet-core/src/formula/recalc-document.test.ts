import { describe, expect, it } from 'vitest';
import type { SpreadsheetDocument } from '../types.js';
import { cellAddress } from '../types.js';
import { recalcDocument } from './recalc-document.js';

function makeDocument(cells: Array<{ row: number; col: number; value?: unknown; formula?: string }>): SpreadsheetDocument {
  const cellMap: Record<string, import('../types.js').CellDocument> = {};
  for (const cell of cells) {
    const address = cellAddress(cell.row, cell.col);
    cellMap[address] = { address, row: cell.row, col: cell.col, value: cell.value, formula: cell.formula };
  }
  return {
    id: 'doc-1',
    kind: 'spreadsheet',
    name: 'recalc-test',
    version: '1',
    workbook: {
      sheets: [{ id: 'sheet-1', name: 'Sheet1', order: 0, cells: cellMap }],
    },
  };
}

function cellOf(doc: SpreadsheetDocument, row: number, col: number) {
  return doc.workbook.sheets[0].cells?.[cellAddress(row, col)];
}

describe('recalcDocument（ux-r4 Phase 2）', () => {
  it('formula 单元格求值写回 value（=SUM 区域）', () => {
    const doc = makeDocument([
      { row: 0, col: 1, value: 42 },
      { row: 1, col: 1, value: 7 },
      { row: 2, col: 1, formula: '=SUM(B1:B2)' },
    ]);
    const next = recalcDocument(doc);
    expect(cellOf(next, 2, 1)?.value).toBe(49);
    // formula 字段保留供编辑回显
    expect(cellOf(next, 2, 1)?.formula).toBe('=SUM(B1:B2)');
  });

  it('存量 `=` 前缀 value 防御性升格为 formula', () => {
    const doc = makeDocument([
      { row: 0, col: 0, value: '=1+2' },
    ]);
    const next = recalcDocument(doc);
    expect(cellOf(next, 0, 0)?.formula).toBe('=1+2');
    expect(cellOf(next, 0, 0)?.value).toBe(3);
  });

  it('依赖联动：B1 变化后 =SUM 重算', () => {
    const doc = makeDocument([
      { row: 0, col: 1, value: 10 },
      { row: 1, col: 1, value: 5 },
      { row: 2, col: 1, formula: '=SUM(B1:B2)' },
    ]);
    const edited = makeDocument([
      { row: 0, col: 1, value: 100 },
      { row: 1, col: 1, value: 5 },
      { row: 2, col: 1, formula: '=SUM(B1:B2)' },
    ]);
    // 模拟 dispatch 后重算：编辑文档（formula 未变）重新求值
    const next = recalcDocument(edited);
    expect(cellOf(next, 2, 1)?.value).toBe(105);
    // 原文档不变
    expect(cellOf(doc, 2, 1)?.value).toBeUndefined();
  });

  it('副作用护栏：计算值无变化 → 返回原文档引用', () => {
    const doc = makeDocument([
      { row: 0, col: 1, value: 42 },
      { row: 2, col: 1, formula: '=SUM(B1)' },
    ]);
    // 预置 value 已等于计算值 → 引用不变
    const preseted = makeDocument([
      { row: 0, col: 1, value: 42 },
      { row: 2, col: 1, formula: '=SUM(B1)', value: 42 },
    ]);
    expect(recalcDocument(preseted)).toBe(preseted);
    expect(recalcDocument(doc)).not.toBe(doc);
  });

  it('多 sheet 身份保持：前面 sheet 变更不影响后面无变更 sheet 的原引用', () => {
    const changedSheetCells = {
      A1: { address: 'A1', row: 0, col: 0, value: 2, formula: undefined },
      A2: { address: 'A2', row: 1, col: 0, value: undefined, formula: '=A1*3' },
    };
    const stableSheetCells = {
      A1: { address: 'A1', row: 0, col: 0, value: 42, formula: undefined },
      A2: { address: 'A2', row: 1, col: 0, value: 42, formula: '=A1' },
    };
    const doc: SpreadsheetDocument = {
      id: 'doc-multi',
      kind: 'spreadsheet',
      name: 'multi-sheet',
      version: '1',
      workbook: {
        sheets: [
          { id: 'sheet-1', name: 'One', order: 0, cells: changedSheetCells },
          { id: 'sheet-2', name: 'Two', order: 1, cells: stableSheetCells },
        ],
      },
    };
    const next = recalcDocument(doc);
    expect(next).not.toBe(doc);
    expect(next.workbook.sheets[0]).not.toBe(doc.workbook.sheets[0]);
    // sheet-2 计算值无变化 → 原 sheet 引用保持
    expect(next.workbook.sheets[1]).toBe(doc.workbook.sheets[1]);
  });

  it('循环引用 → #CIRC!，不挂死', () => {
    const doc = makeDocument([
      { row: 0, col: 0, formula: '=B1' },
      { row: 0, col: 1, formula: '=A1' },
    ]);
    const next = recalcDocument(doc);
    const a1 = cellOf(next, 0, 0)?.value;
    const b1 = cellOf(next, 0, 1)?.value;
    expect(a1 === '#CIRC!' || b1 === '#CIRC!' || a1 === '#CIRC!' || b1 === '#CIRC!').toBe(true);
  });

  it('错误值入格：#DIV/0! / #NAME?', () => {
    const doc = makeDocument([
      { row: 0, col: 0, formula: '=1/0' },
      { row: 1, col: 0, formula: '=FOO(1)' },
    ]);
    const next = recalcDocument(doc);
    expect(cellOf(next, 0, 0)?.value).toBe('#DIV/0!');
    expect(cellOf(next, 1, 0)?.value).toBe('#NAME?');
  });
});
