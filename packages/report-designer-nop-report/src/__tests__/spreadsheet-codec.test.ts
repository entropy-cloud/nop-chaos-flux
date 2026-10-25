import { describe, expect, it } from 'vitest';
import type {
  CellDocument,
  SpreadsheetDocument,
  WorksheetDocument,
} from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetCodec, formatAddress, parseAddress } from '../index.js';

function sampleDocument(): SpreadsheetDocument {
  const boldCell: CellDocument = {
    address: 'A1',
    row: 0,
    col: 0,
    value: 'Title',
    type: 'string',
    style: { fontWeight: 'bold', fontColor: '#ff0000' },
    numberFormat: '#,##0.00',
    comment: { text: 'note', author: 'alice' },
    raw: { extUnknownCellField: { deep: [1, 2] } },
  };
  const plainCell: CellDocument = {
    address: 'B2',
    row: 1,
    col: 1,
    value: 42,
    formula: '=A1',
    styleId: 's1',
    linkUrl: 'https://example.com',
    protected: true,
  };
  const sheet: WorksheetDocument = {
    id: 'sheet-main',
    name: 'Main',
    order: 0,
    props: { pageSetup: { orientation: 'landscape' }, extUnknownSheetProp: 'keep-me' },
    rows: { '0': { index: 0, height: 32, hidden: false, styleId: 'r1' } },
    columns: { '1': { index: 1, width: 120, hidden: true } },
    cells: { A1: boldCell, B2: plainCell },
    merges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 2 }],
    frozen: { row: 1 },
    tabColor: '#00ff00',
    hidden: false,
    protected: false,
    protectionOptions: { selectLockedCells: true },
    defaultRowHeight: 24,
    defaultColumnWidth: 90,
  };
  return {
    id: 'doc-1',
    kind: 'spreadsheet',
    name: 'My Report',
    version: '2.1.0',
    meta: { viewHint: 'view-only', raw: { extUnknownDocField: true } },
    viewport: { scrollX: 1, scrollY: 2, zoom: 3 },
    workbook: {
      id: 'wb-1',
      name: 'My Report',
      props: { extUnknownWorkbookProp: { a: 1 } },
      styles: [{ id: 's1', name: 'accent', props: { backgroundColor: '#eee' } }],
      sheets: [sheet],
    },
  };
}

describe('SpreadsheetCodec round-trip', () => {
  const codec = createSpreadsheetCodec();

  it('preserves modeled cell/sheet/workbook fields through round-trip', () => {
    const original = sampleDocument();
    const like = codec.exportSpreadsheet(original);
    const restored = codec.importSpreadsheet(like);

    expect(restored.id).toBe('doc-1');
    expect(restored.kind).toBe('spreadsheet');
    expect(restored.name).toBe('My Report');
    expect(restored.version).toBe('2.1.0');

    const sheet = restored.workbook.sheets[0];
    expect(sheet.id).toBe('sheet-main');
    expect(sheet.name).toBe('Main');
    expect(sheet.order).toBe(0);
    expect(sheet.frozen).toEqual({ row: 1 });
    expect(sheet.tabColor).toBe('#00ff00');
    expect(sheet.defaultRowHeight).toBe(24);
    expect(sheet.defaultColumnWidth).toBe(90);
    expect(sheet.protectionOptions).toEqual({ selectLockedCells: true });

    expect(restored.workbook.styles).toEqual(original.workbook.styles);

    const a1 = sheet.cells!.A1!;
    expect(a1.value).toBe('Title');
    expect(a1.style).toEqual({ fontWeight: 'bold', fontColor: '#ff0000' });
    expect(a1.numberFormat).toBe('#,##0.00');
    expect(a1.comment).toEqual({ text: 'note', author: 'alice' });

    const b2 = sheet.cells!.B2!;
    expect(b2.value).toBe(42);
    expect(b2.formula).toBe('=A1');
    expect(b2.styleId).toBe('s1');
    expect(b2.linkUrl).toBe('https://example.com');
    expect(b2.protected).toBe(true);
  });

  it('preserves unknown cell/sheet/workbook fields (discriminating: raw-discarding export fails here)', () => {
    const original = sampleDocument();
    const like = codec.exportSpreadsheet(original);
    const restored = codec.importSpreadsheet(like);

    const a1 = restored.workbook.sheets[0].cells!.A1!;
    expect(a1.raw).toEqual({ extUnknownCellField: { deep: [1, 2] } });

    const sheet = restored.workbook.sheets[0] as WorksheetDocument & { raw?: Record<string, unknown> };
    expect((sheet.props as Record<string, unknown>).pageSetup).toEqual({ orientation: 'landscape' });
    expect((sheet.props as Record<string, unknown>).extUnknownSheetProp).toBe('keep-me');

    expect((restored.workbook.props as Record<string, unknown>).extUnknownWorkbookProp).toEqual({ a: 1 });
    expect((restored.meta as { raw?: Record<string, unknown> })?.raw).toEqual({
      extUnknownDocField: true,
    });
  });

  it('keeps view-only meta/viewport out of the exported domain model', () => {
    const like = codec.exportSpreadsheet(sampleDocument());
    const serialized = JSON.stringify(like);
    expect(serialized).not.toContain('viewHint');
    expect(serialized).not.toContain('viewport');
  });

  it('normalizes anchor-cell mergeAcross/mergeDown into canonical MergeRange[] on import', () => {
    const restored = codec.importSpreadsheet({
      sheets: [
        {
          name: 'Merged',
          cells: {
            A1: { value: 'header', name: 'A1', mergeAcross: 2, mergeDown: 1, raw: { rowIndex: 0, colIndex: 0 } },
          },
        },
      ],
    });
    expect(restored.workbook.sheets[0].merges).toEqual([
      { startRow: 0, startCol: 0, endRow: 1, endCol: 2 },
    ]);
  });

  it('refills anchor mergeAcross/mergeDown on export and round-trips canonical merges', () => {
    const original = sampleDocument();
    const like = codec.exportSpreadsheet(original);
    expect(like.sheets[0].cells!.A1!.mergeAcross).toBe(2);
    expect(like.sheets[0].cells!.A1!.mergeDown).toBe(0);
    expect(like.sheets[0].merges).toEqual([{ startRow: 0, startCol: 0, endRow: 0, endCol: 2 }]);

    const restored = codec.importSpreadsheet(JSON.parse(JSON.stringify(like)));
    expect(restored.workbook.sheets[0].merges).toEqual([{ startRow: 0, startCol: 0, endRow: 0, endCol: 2 }]);
  });

  it('keeps sparse rows/columns non-inflated', () => {
    const like = codec.exportSpreadsheet(sampleDocument());
    expect(Object.keys(like.sheets[0].rows!)).toEqual(['0']);
    expect(Object.keys(like.sheets[0].columns!)).toEqual(['1']);
  });

  it('rejects non-envelope input with codec-envelope-invalid', () => {
    expect(() => codec.importSpreadsheet({ sheets: 'nope' })).toThrowError(/codec-envelope-invalid/);
  });

  it('parses and formats cell addresses', () => {
    expect(parseAddress('A1')).toEqual({ row: 0, col: 0 });
    expect(parseAddress('AA10')).toEqual({ row: 9, col: 26 });
    expect(formatAddress(9, 26)).toBe('AA10');
    expect(formatAddress(0, 0)).toBe('A1');
  });
});
