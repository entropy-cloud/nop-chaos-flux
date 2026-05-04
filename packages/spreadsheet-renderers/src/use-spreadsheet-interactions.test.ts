import { describe, it, expect } from 'vitest';
import type { SpreadsheetInteractionsReturn } from './use-spreadsheet-interactions.js';

/**
 * useSpreadsheetInteractions is a composite React hook that wires together
 * 14+ sub-hooks. Direct render-testing requires a full bridge + React context.
 *
 * This file tests the contract shape and re-exports to catch accidental
 * breakage when sub-hooks are refactored.
 */

describe('useSpreadsheetInteractions contract', () => {
  it('SpreadsheetInteractionsReturn covers expected API surface', () => {
    // Compile-time shape check: ensure the return type includes all key members.
    // If a member is removed or renamed, this will fail at typecheck time.
    const keys: (keyof SpreadsheetInteractionsReturn)[] = [
      'snapshot',
      'selectedCell',
      'setSelectedCell',
      'cellValue',
      'getSelectedRange',
      'editingCell',
      'editValue',
      'handleEditSave',
      'handleEditCancel',
      'handleCellClick',
      'handleCellDoubleClick',
      'handleCellMouseDown',
      'handleCellMouseEnter',
      'handleMouseUp',
      'handleSelectRow',
      'handleSelectColumn',
      'handleSelectAll',
      'handleColumnResizeStart',
      'handleRowResizeStart',
      'columnWidths',
      'rowHeights',
      'gridRef',
      'onCanvasMouseDown',
      'isInRange',
      'getMergeInfo',
      'handleCellValueChange',
      'handleCopy',
      'handleCut',
      'handlePaste',
      'handleClear',
      'handleStyleTool',
      'handleInsertRow',
      'handleDeleteRow',
      'handleInsertColumn',
      'handleDeleteColumn',
      'handleFillDown',
      'handleFillSeries',
      'handleAddSheet',
      'handleRemoveSheet',
      'handleRenameSheet',
      'handleMerge',
      'handleUnmerge',
      'handleMergeCenter',
      'handleFreeze',
      'handleUnfreeze',
      'handleUndo',
      'handleRedo',
      'showFindReplace',
      'setShowFindReplace',
      'findQuery',
      'setFindQuery',
      'replaceText',
      'setReplaceText',
      'findResults',
      'setFindResults',
      'handleFind',
      'handleReplace',
      'handleReplaceAll',
      'showCommentInput',
      'setShowCommentInput',
      'commentText',
      'setCommentText',
      'handleAddComment',
      'handleDeleteComment',
      'hasComment',
      'currentCell',
      'dropTargetCell',
      'setDropTargetCell',
      'handleFieldDrop',
      'handleFieldDragOver',
      'handleFieldDragLeave',
      'handleCellValueSave',
      'fillHandleState',
      'fillHandleRef',
      'isFillPreview',
      'handleFillHandleMouseDown',
      'handleFillHandleDoubleClick',
      'handleEditValueChange',
    ];

    // Runtime assertion that the list is non-empty (guards against empty array typo)
    expect(keys.length).toBeGreaterThan(70);

    // Ensure no duplicates
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
