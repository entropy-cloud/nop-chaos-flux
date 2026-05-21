// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument, createReportDesignerCore } from '@nop-chaos/report-designer-core';

const testMocks = vi.hoisted(() => ({
  notify: vi.fn(),
  reportRuntimeHostIssue: vi.fn(),
  mockUseRendererEnv: vi.fn(),
  mockUseSpreadsheetInteractions: vi.fn(),
}));

vi.mock('@nop-chaos/flux-core', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/flux-core')>('@nop-chaos/flux-core');
  return {
    ...actual,
    reportRuntimeHostIssue: testMocks.reportRuntimeHostIssue,
  };
});

vi.mock('@nop-chaos/flux-react', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/flux-react')>('@nop-chaos/flux-react');
  return {
    ...actual,
    useRendererEnv: () => testMocks.mockUseRendererEnv(),
  };
});

vi.mock('@nop-chaos/spreadsheet-renderers', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/spreadsheet-renderers')>(
    '@nop-chaos/spreadsheet-renderers',
  );
  return {
    ...actual,
    SpreadsheetGrid: (props: any) => <div data-testid="spreadsheet-grid" {...props} />,
    SheetTabBar: () => <div data-testid="sheet-tab-bar" />,
    useSpreadsheetInteractions: (...args: any[]) => testMocks.mockUseSpreadsheetInteractions(...args),
  };
});

import { ReportSpreadsheetCanvas } from './report-spreadsheet-canvas.js';

describe('ReportSpreadsheetCanvas', () => {
  beforeEach(() => {
    testMocks.notify.mockReset();
    testMocks.reportRuntimeHostIssue.mockReset();
    testMocks.mockUseRendererEnv.mockReset();
    testMocks.mockUseRendererEnv.mockReturnValue({ notify: testMocks.notify });
    testMocks.mockUseSpreadsheetInteractions.mockReset();
  });

  it('rolls back the spreadsheet cell when designer field drop fails', async () => {
    const spreadsheet = createEmptyDocument('report-spreadsheet-drop-rollback');
    const sheetId = spreadsheet.workbook.sheets[0]?.id ?? '';
    const document = createReportTemplateDocument(spreadsheet, 'Drop Rollback');
    const core = createReportDesignerCore({ document, config: { kind: 'report-template' } });
    const snapshot = core.getSnapshot();

    const spreadsheetBridge = {
      dispatch: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, changed: true })
        .mockResolvedValueOnce({ ok: true, changed: true }),
      getSnapshot: vi.fn(() => ({
        activeSheetId: sheetId,
        activeSheet: {
          id: sheetId,
          cells: {},
        },
      })),
    } as any;

    testMocks.mockUseSpreadsheetInteractions.mockReturnValue({
      snapshot: {
        runtime: { readonly: false },
        workbook: { sheets: [{ id: sheetId, name: 'Sheet1' }] },
        activeSheet: { id: sheetId, cells: {}, merges: [] },
        selection: { kind: 'none' },
      },
      selectedCell: { row: 0, col: 0 },
      editingCell: null,
      editValue: '',
      editSaveState: { status: 'idle' },
      editingCellRef: { current: null },
      fillHandleState: { isFilling: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0, currentRow: 0, currentCol: 0 },
      isFillPreview: () => false,
      handleFillHandleMouseDown: vi.fn(),
      handleEditSave: vi.fn(),
      handleEditCancel: vi.fn(),
      handleEditValueChange: vi.fn(),
      handleCellClick: vi.fn(),
      handleCellDoubleClick: vi.fn(),
      handleCellMouseDown: vi.fn(),
      handleCellMouseEnter: vi.fn(),
      handleColumnResizeStart: vi.fn(),
      handleRowResizeStart: vi.fn(),
      columnWidths: {},
      rowHeights: {},
      gridRef: { current: null },
      isInRange: () => false,
      getMergeInfo: () => ({ isMerged: false, isTopLeft: false, rowSpan: 1, colSpan: 1 }),
      handleAddSheet: vi.fn(),
      handleRemoveSheet: vi.fn(),
      handleRenameSheet: vi.fn(),
      dropTargetCell: { row: 0, col: 0 },
      handleFieldDragOver: vi.fn(),
      handleFieldDragLeave: vi.fn(),
      handleFieldDrop: async (cb: (target: { row: number; col: number }) => Promise<void>) => {
        await cb({ row: 0, col: 0 });
        return true;
      },
      getSelectedRange: () => null,
      handleSelectRow: vi.fn(),
      handleSelectColumn: vi.fn(),
      handleSelectAll: vi.fn(),
      handleFillHandleDoubleClick: vi.fn(),
    });

    vi.spyOn(core, 'getSnapshot').mockReturnValue({
      ...snapshot,
      fieldDrag: {
        active: true,
        sourceId: 'sales',
        fieldId: 'amount',
        payload: {
          sourceId: 'sales',
          fieldId: 'amount',
          data: { label: 'Amount' },
        },
      },
    } as any);
    vi.spyOn(core, 'dispatch').mockResolvedValueOnce({
      ok: false,
      changed: false,
      error: new Error('designer rejected drop'),
    } as any);

    const actualReportRuntimeHostIssue = await vi.importActual<typeof import('@nop-chaos/flux-core')>(
      '@nop-chaos/flux-core'
    );
    testMocks.reportRuntimeHostIssue.mockImplementation((input) => {
      actualReportRuntimeHostIssue.reportRuntimeHostIssue(input as never);
    });

    const view = render(
      <ReportSpreadsheetCanvas
        core={core}
        snapshot={snapshot}
        spreadsheetBridge={spreadsheetBridge}
        spreadsheetSnapshot={{
          activeSheetId: sheetId,
          runtime: { readonly: false },
          workbook: { sheets: [{ id: sheetId, name: 'Sheet1' }] },
          activeSheet: { id: sheetId, cells: {}, merges: [] },
          selection: { kind: 'none' },
        } as any}
      />,
    );

    fireEvent.drop(view.container.firstElementChild as HTMLElement);

    await waitFor(() => {
      expect(spreadsheetBridge.dispatch).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: 'spreadsheet:setCellValue',
          value: '${amount}',
        }),
      );
      expect(spreadsheetBridge.dispatch).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: 'spreadsheet:clearCells',
          clearValues: true,
        }),
      );
      expect(testMocks.notify).toHaveBeenCalledTimes(1);
      expect(testMocks.notify).toHaveBeenCalledWith('warning', 'designer rejected drop');
      expect(testMocks.reportRuntimeHostIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          notify: false,
          phase: 'action',
          path: 'report-designer.spreadsheet-canvas',
          details: {
            operation: 'report-field-drop',
            sheetId,
          },
        }),
      );
    });
  });
});
