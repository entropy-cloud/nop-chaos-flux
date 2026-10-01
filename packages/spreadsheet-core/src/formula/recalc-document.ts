import type { CellDocument, SpreadsheetDocument } from '../types.js';
import { cellAddress } from '../types.js';
import {
  evaluateFormulaBody,
  isFormulaError,
  type FormulaValue,
} from './formula-engine.js';

/**
 * 全量公式重算（ux-r4）：对文档内全部公式单元格（formula 字段或 `=` 前缀 value）
 * 求值并把计算值写回 value（formula 字段保留供编辑回显）。
 *
 * 副作用护栏：所有计算值与现有 value 严格相等时返回**原文档引用**——dispatch 以
 * 滚动/选中频率触发，朴素写回会翻动 document 身份污染 dirty 位与 undo 栈。
 * 求值 memo 化 + visiting 集合判循环（#CIRC!）；引用限定同 sheet（跨 sheet 引用为
 * Non-Goal）；存量 `=` 前缀 value 防御性升格为 formula（历史文档/粘贴来源）。
 */

function normalizeFormulaText(cell: CellDocument): string | null {
  if (typeof cell.formula === 'string' && cell.formula.trim().length > 0) {
    return cell.formula.startsWith('=') ? cell.formula.slice(1) : cell.formula;
  }
  if (typeof cell.value === 'string' && cell.value.trim().startsWith('=')) {
    return cell.value.slice(1);
  }
  return null;
}

function toDisplayValue(value: FormulaValue): unknown {
  return value;
}

export function recalcDocument(doc: SpreadsheetDocument): SpreadsheetDocument {
  let changed = false;

  const nextSheets = doc.workbook.sheets.map((sheet) => {
    let sheetChanged = false;

    const cells = sheet.cells;
    if (!cells) {
      return sheet;
    }
    const hasFormulaWork = Object.values(cells).some((cell) => normalizeFormulaText(cell) !== null);
    if (!hasFormulaWork) {
      return sheet;
    }

    const memo = new Map<string, FormulaValue>();
    const visiting = new Set<string>();
    const nextCells: Record<string, CellDocument> = { ...cells };

    const resolveAddress = (address: string): FormulaValue => {
      const key = `${sheet.id}!${address}`;
      if (memo.has(key)) {
        return memo.get(key)!;
      }
      if (visiting.has(key)) {
        return '#CIRC!';
      }
      visiting.add(key);
      const cell = cells[address];
      let result: FormulaValue;
      const formulaText = cell ? normalizeFormulaText(cell) : null;
      if (formulaText !== null) {
        result = evaluateFormulaBody(formulaText, {
          resolveCell: (col, row) => resolveAddress(cellAddress(row, col)),
          resolveRange: (from, to) => {
            const collected: FormulaValue[] = [];
            for (let row = from.row; row <= to.row; row += 1) {
              for (let col = from.col; col <= to.col; col += 1) {
                collected.push(resolveAddress(cellAddress(row, col)));
              }
            }
            return collected;
          },
        });
      } else {
        const raw = cell?.value;
        result =
          raw === undefined || raw === null || typeof raw === 'number' || typeof raw === 'boolean'
            ? (raw ?? null)
            : String(raw);
      }
      visiting.delete(key);
      memo.set(key, result);
      return result;
    };

    for (const cell of Object.values(cells)) {
      const formulaText = normalizeFormulaText(cell);
      if (formulaText === null) {
        continue;
      }
      const computed = resolveAddress(cell.address);
      // 防御性升格：`=` 前缀 value 落到 formula 字段（历史文档/粘贴来源）
      const needsFormulaField =
        typeof cell.formula !== 'string' &&
        typeof cell.value === 'string' &&
        cell.value.trim().startsWith('=');
      const nextValue = isFormulaError(computed) ? computed : toDisplayValue(computed);
      if (needsFormulaField || cell.value !== nextValue) {
        sheetChanged = true;
        nextCells[cell.address] = {
          ...cell,
          ...(needsFormulaField ? { formula: `=${formulaText}` } : {}),
          value: nextValue,
        };
      }
    }

    if (!sheetChanged) {
      return sheet;
    }
    changed = true;
    return { ...sheet, cells: nextCells };
  });

  if (!changed) {
    return doc;
  }
  return { ...doc, workbook: { ...doc.workbook, sheets: nextSheets } };
}
