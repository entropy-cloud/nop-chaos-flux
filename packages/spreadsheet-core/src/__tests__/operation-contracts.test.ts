import { describe, expect, it } from 'vitest';
import { applyEditComment, applySetCellValue } from '../core/cell-operations.js';
import { createEmptyDocument, type SpreadsheetDocument } from '../index.js';

// cq-3 Phase 2 behavior locks for the replaceSheet combinator migration:
// these two contracts are load-bearing for the report-designer seal tests
// (designer-core.test.ts:250/:269) and were previously untested here.
describe('spreadsheet operation contracts (cq-3)', () => {
  it('throws Sheet not found when the sheet id is missing', () => {
    const doc = createEmptyDocument('d1');
    expect(() =>
      applySetCellValue(doc, { sheetId: 'no-such-sheet', row: 0, col: 0, address: 'A1' }, 1),
    ).toThrow(/Sheet not found/);
  });

  it('returns the input document reference on a comment no-op (no existing comment)', () => {
    const doc: SpreadsheetDocument = createEmptyDocument('d1');
    const sheetId = doc.workbook.sheets[0].id;
    const result = applyEditComment(doc, { sheetId, row: 0, col: 0, address: 'A1' }, 'text');
    expect(result).toBe(doc);
  });
});
