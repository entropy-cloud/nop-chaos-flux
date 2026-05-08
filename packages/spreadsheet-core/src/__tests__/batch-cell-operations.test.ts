import { describe, expect, it } from 'vitest';
import type { SpreadsheetDocument, WorksheetDocument } from '../types.js';
import { createEmptyDocument } from '../types.js';
import { applyFillDown, applySetCellStyle } from '../core/cell-operations.js';

function createDocumentWithCountedCells(): {
  doc: SpreadsheetDocument;
  sheet: WorksheetDocument;
  ownKeysCallCount: () => number;
} {
  const doc = createEmptyDocument('batch-ops-proof');
  const sheet = doc.workbook.sheets[0];
  let ownKeysCalls = 0;
  const cells = new Proxy(
    {
      A1: { address: 'A1', row: 0, col: 0, value: 'seed', style: { fontWeight: 'bold' as const } },
      B1: { address: 'B1', row: 0, col: 1, value: 'seed-2' },
    },
    {
      ownKeys(target) {
        ownKeysCalls += 1;
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, property) {
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      get(target, property, receiver) {
        return Reflect.get(target, property, receiver);
      },
      set(target, property, value, receiver) {
        return Reflect.set(target, property, value, receiver);
      },
      has(target, property) {
        return Reflect.has(target, property);
      },
    },
  ) as WorksheetDocument['cells'];

  sheet.cells = cells;

  return {
    doc,
    sheet,
    ownKeysCallCount: () => ownKeysCalls,
  };
}

describe('batch cell operations', () => {
  it('clones the cell map once when filling a range', () => {
    const { doc, ownKeysCallCount } = createDocumentWithCountedCells();
    const sheetId = doc.workbook.sheets[0].id;

    const next = applyFillDown(doc, {
      sheetId,
      startRow: 0,
      startCol: 0,
      endRow: 3,
      endCol: 1,
    });

    expect(ownKeysCallCount()).toBe(1);
    expect(next.workbook.sheets[0].cells?.A2?.value).toBe('seed');
    expect(next.workbook.sheets[0].cells?.B4?.value).toBe('seed-2');
  });

  it('clones the cell map once when styling a range', () => {
    const { doc, ownKeysCallCount } = createDocumentWithCountedCells();
    const sheetId = doc.workbook.sheets[0].id;

    const next = applySetCellStyle(
      doc,
      {
        sheetId,
        startRow: 0,
        startCol: 0,
        endRow: 1,
        endCol: 1,
      },
      'highlight',
    );

    expect(ownKeysCallCount()).toBe(1);
    expect(next.workbook.sheets[0].cells?.A1?.styleId).toBe('highlight');
    expect(next.workbook.sheets[0].cells?.B2?.styleId).toBe('highlight');
  });
});
