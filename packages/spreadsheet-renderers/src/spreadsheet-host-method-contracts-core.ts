import type { HostCapabilityContract } from '@nop-chaos/flux-core';
import {
  cellRefShape,
  clipboardResultShape,
  emptyObjectShape,
  rangeShape,
  selectionResultShape,
  selectionShape,
  sheetProtectionOptionsShape,
  targetShape,
  viewportShape,
} from './spreadsheet-manifest-shapes.js';

export const SPREADSHEET_HOST_METHOD_CONTRACTS_CORE: HostCapabilityContract['methods'] = {
  setActiveSheet: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
      },
    },
    description: 'Switch the active sheet.',
  },
  setSelection: {
    args: {
      kind: 'object',
      fields: {
        selection: selectionShape,
      },
    },
    description: 'Set spreadsheet selection.',
  },
  setViewport: {
    args: {
      kind: 'object',
      fields: {
        viewport: viewportShape,
      },
    },
    description: 'Update spreadsheet viewport state.',
  },
  setCellValue: {
    args: {
      kind: 'object',
      fields: {
        cell: cellRefShape,
        value: { kind: 'unknown' },
      },
    },
    description: 'Set a cell value.',
  },
  setCellFormula: {
    args: {
      kind: 'object',
      fields: {
        cell: cellRefShape,
        formula: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
      },
      optional: ['formula'],
    },
    description: 'Set or clear a cell formula.',
  },
  setCellStyle: {
    args: {
      kind: 'object',
      fields: {
        target: { kind: 'union', anyOf: [cellRefShape, rangeShape] },
        styleId: { kind: 'string' },
      },
    },
    description: 'Apply a named style to a cell or range.',
  },
  resizeRow: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        row: { kind: 'number' },
        height: { kind: 'number' },
      },
    },
    description: 'Resize a row.',
  },
  resizeColumn: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        col: { kind: 'number' },
        width: { kind: 'number' },
      },
    },
    description: 'Resize a column.',
  },
  mergeRange: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
      },
    },
    description: 'Merge a range.',
  },
  unmergeRange: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
      },
    },
    description: 'Unmerge a range.',
  },
  hideRow: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        row: { kind: 'number' },
        hidden: { kind: 'boolean' },
      },
    },
    description: 'Hide or show a row.',
  },
  hideColumn: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        col: { kind: 'number' },
        hidden: { kind: 'boolean' },
      },
    },
    description: 'Hide or show a column.',
  },
  addSheet: {
    args: {
      kind: 'object',
      fields: {
        name: { kind: 'string' },
        index: { kind: 'number' },
      },
      optional: ['name', 'index'],
    },
    description: 'Add a worksheet.',
  },
  removeSheet: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
      },
    },
    description: 'Remove a worksheet.',
  },
  beginTransaction: {
    args: {
      kind: 'object',
      fields: {
        label: { kind: 'string' },
      },
      optional: ['label'],
    },
    description: 'Begin a spreadsheet transaction.',
  },
  commitTransaction: {
    args: emptyObjectShape,
    description: 'Commit current spreadsheet transaction.',
  },
  rollbackTransaction: {
    args: emptyObjectShape,
    description: 'Rollback current spreadsheet transaction.',
  },
  undo: {
    args: emptyObjectShape,
    description: 'Undo last spreadsheet operation.',
  },
  redo: {
    args: emptyObjectShape,
    description: 'Redo last spreadsheet operation.',
  },
  copyCells: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
      },
    },
    result: clipboardResultShape,
    description: 'Copy the current selection.',
  },
  cutCells: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
      },
    },
    result: clipboardResultShape,
    description: 'Cut the current selection.',
  },
  pasteCells: {
    args: {
      kind: 'object',
      fields: {
        target: cellRefShape,
        options: { kind: 'object', fields: {}, unknownKeys: 'allow' },
      },
      optional: ['options'],
      unknownKeys: 'reject',
    },
    description: 'Paste clipboard content at the current target.',
  },
  clearCells: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        clearValues: { kind: 'boolean' },
        clearFormats: { kind: 'boolean' },
        clearComments: { kind: 'boolean' },
      },
      optional: ['clearValues', 'clearFormats', 'clearComments'],
      unknownKeys: 'reject',
    },
    description: 'Clear the current selection.',
  },
  insertRow: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        row: { kind: 'number' },
        count: { kind: 'number' },
      },
      optional: ['count'],
    },
    description: 'Insert one or more rows.',
  },
  insertColumn: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        col: { kind: 'number' },
        count: { kind: 'number' },
      },
      optional: ['count'],
    },
    description: 'Insert one or more columns.',
  },
  deleteRow: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        row: { kind: 'number' },
        count: { kind: 'number' },
      },
      optional: ['count'],
    },
    description: 'Delete one or more rows.',
  },
  deleteColumn: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        col: { kind: 'number' },
        count: { kind: 'number' },
      },
      optional: ['count'],
    },
    description: 'Delete one or more columns.',
  },
  renameSheet: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        name: { kind: 'string' },
      },
    },
    description: 'Rename a worksheet.',
  },
  moveSheet: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        targetIndex: { kind: 'number' },
      },
      unknownKeys: 'reject',
    },
    description: 'Move a worksheet.',
  },
  copySheet: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        name: { kind: 'string' },
      },
      optional: ['name'],
      unknownKeys: 'reject',
    },
    description: 'Copy a worksheet.',
  },
  setSheetTabColor: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        color: { kind: 'string' },
      },
      unknownKeys: 'reject',
    },
    description: 'Set a worksheet tab color.',
  },
  hideSheet: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        hidden: { kind: 'boolean' },
      },
      unknownKeys: 'reject',
    },
    description: 'Hide or show a worksheet.',
  },
  protectSheet: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        password: { kind: 'string' },
        options: sheetProtectionOptionsShape,
      },
      optional: ['password', 'options'],
      unknownKeys: 'reject',
    },
    description: 'Protect or unprotect a worksheet.',
  },
  selectAll: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
      },
    },
    result: selectionResultShape,
    description: 'Select the entire sheet.',
  },
  selectRow: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        row: { kind: 'number' },
        extend: { kind: 'boolean' },
      },
      optional: ['extend'],
    },
    result: selectionResultShape,
    description: 'Select one or more rows.',
  },
  selectColumn: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        col: { kind: 'number' },
        extend: { kind: 'boolean' },
      },
      optional: ['extend'],
    },
    result: selectionResultShape,
    description: 'Select one or more columns.',
  },
};
