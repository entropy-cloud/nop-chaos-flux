import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  type SpreadsheetCore,
  type SpreadsheetDocument,
} from '../index.js';

// ux-r4 Phase 2：重算挂 dispatchSpreadsheetCommand 统一出口的集成级验证。
// 覆盖：依赖联动、粘贴含公式区域、排序搬移公式格、undo/redo 后自洽。

function seedDoc(): SpreadsheetDocument {
  const doc = createEmptyDocument('formula-dispatch-test');
  const sheet = doc.workbook.sheets[0];
  sheet.cells = {
    A1: { address: 'A1', row: 0, col: 0, value: 10 },
    A2: { address: 'A2', row: 1, col: 0, value: 20 },
    B1: { address: 'B1', row: 0, col: 1, value: 30, formula: '=SUM(A1:A2)' },
  };
  return doc;
}

describe('dispatch 出口重算（ux-r4 Phase 2 集成）', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = seedDoc();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  const cellValue = (address: string): unknown =>
    core.getSnapshot().document.workbook.sheets[0].cells?.[address]?.value;
  const cellFormula = (address: string): unknown =>
    core.getSnapshot().document.workbook.sheets[0].cells?.[address]?.formula;

  it('装载求值：种子公式打开即见计算值', () => {
    expect(cellValue('B1')).toBe(30);
    expect(cellFormula('B1')).toBe('=SUM(A1:A2)');
  });

  it('依赖联动：改 A1 → =SUM(A1:A2) 重算', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 100,
    });
    expect(result.ok).toBe(true);
    expect(cellValue('B1')).toBe(120);
  });

  it('setCellFormula 提交即求值', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellFormula',
      cell: { sheetId, address: 'C1', row: 0, col: 2 },
      formula: '=A1*2',
    });
    expect(cellValue('C1')).toBe(20);
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 50,
    });
    expect(cellValue('C1')).toBe(100);
  });

  it('粘贴含公式区域：公式随粘贴求值', async () => {
    await core.dispatch({
      type: 'spreadsheet:copyCells',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 0, endCol: 1 },
    });
    const result = await core.dispatch({
      type: 'spreadsheet:pasteCells',
      target: { sheetId, address: 'E1', row: 0, col: 4 },
    });
    expect(result.ok).toBe(true);
    expect(cellValue('E1')).toBe(10);
    // 粘贴进来的 B1 公式格 → F1（同行右移，公式文本保持原文并按现址求值）
    expect(cellFormula('F1')).toBe('=SUM(A1:A2)');
    expect(cellValue('F1')).toBe(30);
  });

  it('排序搬移公式格：搬移后仍自洽求值', async () => {
    // A 列降序排序（无表头）：A2=20 行上移 → 公式格 B1 随行搬移到 B2
    await core.dispatch({
      type: 'spreadsheet:sortRange',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      keyCol: 0,
      direction: 'desc',
    });
    const snap = core.getSnapshot().document.workbook.sheets[0].cells ?? {};
    const formulas = Object.values(snap).filter((cell) => typeof cell.formula === 'string');
    expect(formulas.length).toBe(1);
    // 公式格搬移后仍求值出结果（文本引用不调整，按现址重算自洽）
    expect(formulas[0].address).toBe('B2');
    expect(formulas[0].formula).toBe('=SUM(A1:A2)');
    expect(formulas[0].value).toBe(30);
  });

  it('undo 后公式值与文档一致', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 100,
    });
    expect(cellValue('B1')).toBe(120);
    await core.dispatch({ type: 'spreadsheet:undo' });
    expect(cellValue('A1')).toBe(10);
    expect(cellValue('B1')).toBe(30);
    await core.dispatch({ type: 'spreadsheet:redo' });
    expect(cellValue('B1')).toBe(120);
  });

  it('事务回滚后重算自洽', async () => {
    await core.dispatch({ type: 'spreadsheet:beginTransaction' });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 1000,
    });
    expect(cellValue('B1')).toBe(1020);
    await core.dispatch({ type: 'spreadsheet:rollbackTransaction' });
    expect(cellValue('A1')).toBe(10);
    expect(cellValue('B1')).toBe(30);
  });
});
