import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const mockInteractions = vi.fn();
const mockToolbar = vi.fn();

vi.mock('./use-spreadsheet-interactions.js', () => ({
  useSpreadsheetInteractions: (...args: unknown[]) => mockInteractions(...args),
}));

vi.mock('./spreadsheet-toolbar.js', () => ({
  SpreadsheetToolbar: (props: unknown) => {
    mockToolbar(props);
    return <div data-testid="spreadsheet-toolbar-probe" />;
  },
}));

vi.mock('./spreadsheet-grid.js', () => ({
  SpreadsheetGrid: () => <div data-testid="spreadsheet-grid-probe" />,
}));

vi.mock('./sheet-tab-bar.js', () => ({
  SheetTabBar: () => <div data-testid="sheet-tab-bar-probe" />,
}));

import { DefaultSpreadsheetPageBody } from './default-page-body.js';

afterEach(() => {
  cleanup();
  mockInteractions.mockReset();
  mockToolbar.mockReset();
});

function createInteractions() {
  const handleUndo = vi.fn();
  const handleRedo = vi.fn();

  return {
    snapshot: {
      workbook: { sheets: [{ id: 'sheet-1', name: 'Sheet1' }] },
      activeSheet: { id: 'sheet-1' },
      runtime: { readonly: false },
      selection: null,
    },
    selectedCell: { row: 0, col: 0 },
    cellValue: 'hello',
    currentCell: { style: { fontWeight: 'bold' } },
    columnWidths: {},
    rowHeights: {},
    editingCell: null,
    editValue: '',
    fillHandleState: null,
    dropTargetCell: null,
    showFindReplace: false,
    setShowFindReplace: vi.fn(),
    findQuery: '',
    setFindQuery: vi.fn(),
    replaceText: '',
    setReplaceText: vi.fn(),
    findResults: '',
    showCommentInput: false,
    setShowCommentInput: vi.fn(),
    commentText: '',
    setCommentText: vi.fn(),
    hasComment: false,
    gridRef: { current: null },
    editingCellRef: { current: null },
    isInRange: vi.fn(() => false),
    isFillPreview: vi.fn(() => false),
    getSelectedRange: vi.fn(() => null),
    getMergeInfo: vi.fn(() => ({ isMerged: false, isTopLeft: false, rowSpan: 1, colSpan: 1 })),
    handleUndo,
    handleRedo,
    handleCopy: vi.fn(),
    handleCut: vi.fn(),
    handlePaste: vi.fn(),
    handleClear: vi.fn(),
    handleStyleTool: vi.fn(),
    handleMerge: vi.fn(),
    handleUnmerge: vi.fn(),
    handleMergeCenter: vi.fn(),
    handleFillDown: vi.fn(),
    handleFillSeries: vi.fn(),
    handleAddSheet: vi.fn(),
    handleRemoveSheet: vi.fn(),
    handleRenameSheet: vi.fn(),
    handleInsertRow: vi.fn(),
    handleDeleteRow: vi.fn(),
    handleInsertColumn: vi.fn(),
    handleDeleteColumn: vi.fn(),
    handleFreeze: vi.fn(),
    handleUnfreeze: vi.fn(),
    handleCellValueChange: vi.fn(),
    handleFind: vi.fn(),
    handleReplace: vi.fn(),
    handleReplaceAll: vi.fn(),
    handleAddComment: vi.fn(),
    handleDeleteComment: vi.fn(),
    handleCellClick: vi.fn(),
    handleCellDoubleClick: vi.fn(),
    handleCellMouseDown: vi.fn(),
    handleCellMouseEnter: vi.fn(),
    handleSelectRow: vi.fn(),
    handleSelectColumn: vi.fn(),
    handleSelectAll: vi.fn(),
    handleColumnResizeStart: vi.fn(),
    handleRowResizeStart: vi.fn(),
    handleFillHandleMouseDown: vi.fn(),
    handleFillHandleDoubleClick: vi.fn(),
    handleEditValueChange: vi.fn(),
    handleEditSave: vi.fn(),
    handleEditCancel: vi.fn(),
    handleFieldDragOver: vi.fn(),
    handleFieldDragLeave: vi.fn(),
  };
}

describe('DefaultSpreadsheetPageBody', () => {
  it('routes undo and redo handlers through the default toolbar entry point', () => {
    const interactions = createInteractions();
    mockInteractions.mockReturnValue(interactions);

    render(
      <DefaultSpreadsheetPageBody
        bridge={{ dispatch: vi.fn() } as any}
        snapshot={{
          workbook: { sheets: [{ id: 'sheet-1', name: 'Sheet1' }] },
          activeSheet: { id: 'sheet-1' },
        } as any}
        showToolbar={true}
      />,
    );

    expect(screen.getByTestId('spreadsheet-toolbar-probe')).toBeTruthy();
    expect(mockToolbar).toHaveBeenCalled();
    const toolbarProps = mockToolbar.mock.calls[0]?.[0] as
      | { onUndo?: () => void; onRedo?: () => void }
      | undefined;

    expect(toolbarProps?.onUndo).toBeTypeOf('function');
    expect(toolbarProps?.onRedo).toBeTypeOf('function');

    toolbarProps?.onUndo?.();
    toolbarProps?.onRedo?.();

    expect(interactions.handleUndo).toHaveBeenCalledTimes(1);
    expect(interactions.handleRedo).toHaveBeenCalledTimes(1);
  });

  it('routes outside clicks through handleEditSave when an editor is active', () => {
    const interactions = createInteractions();
    interactions.editingCellRef = { current: { row: 0, col: 0 } } as any;
    mockInteractions.mockReturnValue(interactions);

    const view = render(
      <DefaultSpreadsheetPageBody
        bridge={{ dispatch: vi.fn() } as any}
        snapshot={{
          workbook: { sheets: [{ id: 'sheet-1', name: 'Sheet1' }] },
          activeSheet: { id: 'sheet-1' },
        } as any}
        showToolbar={true}
      />,
    );

    fireEvent.mouseDown(view.container.querySelector('[data-slot="spreadsheet-default-host"]')!);

    expect(interactions.handleEditSave).toHaveBeenCalledTimes(1);
  });

  it('does not route input clicks through handleEditSave while editing remains inside the cell editor', () => {
    const interactions = createInteractions();
    interactions.editingCellRef = { current: { row: 0, col: 0 } } as any;
    mockInteractions.mockReturnValue(interactions);

    const view = render(
      <DefaultSpreadsheetPageBody
        bridge={{ dispatch: vi.fn() } as any}
        snapshot={{
          workbook: { sheets: [{ id: 'sheet-1', name: 'Sheet1' }] },
          activeSheet: { id: 'sheet-1' },
        } as any}
        showToolbar={true}
      />,
    );
    
    const input = document.createElement('input');
    input.className = 'ss-cell-edit-input';
    view.container.querySelector('[data-slot="spreadsheet-default-host"]')!.appendChild(input);

    fireEvent.mouseDown(input);

    expect(interactions.handleEditSave).not.toHaveBeenCalled();
  });
});
