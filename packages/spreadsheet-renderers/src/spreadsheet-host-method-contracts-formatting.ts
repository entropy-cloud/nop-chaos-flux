import type { HostCapabilityContract } from '@nop-chaos/flux-core';
import {
  cellRefShape,
  findOptionsShape,
  findResultShape,
  rangeShape,
  targetShape,
} from './spreadsheet-manifest-shapes.js';

export const SPREADSHEET_HOST_METHOD_CONTRACTS_FORMATTING: HostCapabilityContract['methods'] = {
  setCellFontFamily: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        fontFamily: { kind: 'string' },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell font family.',
  },
  setCellFontSize: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        fontSize: { kind: 'number' },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell font size.',
  },
  setCellFontWeight: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        fontWeight: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'normal' },
            { kind: 'literal', value: 'bold' },
          ],
        },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell font weight.',
  },
  setCellFontStyle: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        fontStyle: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'normal' },
            { kind: 'literal', value: 'italic' },
          ],
        },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell font style.',
  },
  setCellTextDecoration: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        textDecoration: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'none' },
            { kind: 'literal', value: 'underline' },
            { kind: 'literal', value: 'line-through' },
          ],
        },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell text decoration.',
  },
  setCellFontColor: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        color: { kind: 'string' },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell font color.',
  },
  setCellBackgroundColor: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        color: { kind: 'string' },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell background color.',
  },
  setCellBorder: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        border: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'none' },
            { kind: 'literal', value: 'all' },
            { kind: 'literal', value: 'outer' },
            { kind: 'literal', value: 'inner' },
            { kind: 'literal', value: 'top' },
            { kind: 'literal', value: 'right' },
            { kind: 'literal', value: 'bottom' },
            { kind: 'literal', value: 'left' },
          ],
        },
        color: { kind: 'string' },
        width: { kind: 'number' },
      },
      optional: ['color', 'width'],
      unknownKeys: 'reject',
    },
    description: 'Set the cell border.',
  },
  setCellTextAlign: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        textAlign: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'left' },
            { kind: 'literal', value: 'center' },
            { kind: 'literal', value: 'right' },
          ],
        },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell text alignment.',
  },
  setCellVerticalAlign: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        verticalAlign: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'top' },
            { kind: 'literal', value: 'middle' },
            { kind: 'literal', value: 'bottom' },
          ],
        },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell vertical alignment.',
  },
  setCellWrapText: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        wrapText: { kind: 'boolean' },
      },
      unknownKeys: 'reject',
    },
    description: 'Set cell wrapping.',
  },
  setCellNumberFormat: {
    args: {
      kind: 'object',
      fields: {
        target: targetShape,
        format: { kind: 'string' },
      },
      unknownKeys: 'reject',
    },
    description: 'Set the cell number format.',
  },
  fillDown: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
      },
      unknownKeys: 'reject',
    },
    description: 'Fill downward from the current selection.',
  },
  fillRight: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
      },
      unknownKeys: 'reject',
    },
    description: 'Fill right from the current selection.',
  },
  fillSeries: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
        direction: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'down' },
            { kind: 'literal', value: 'right' },
          ],
        },
        seriesType: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'linear' },
            { kind: 'literal', value: 'auto' },
          ],
        },
      },
      optional: ['seriesType'],
      unknownKeys: 'reject',
    },
    description: 'Fill a generated series from the current selection.',
  },
  addComment: {
    args: {
      kind: 'object',
      fields: {
        cell: cellRefShape,
        text: { kind: 'string' },
        author: { kind: 'string' },
      },
      optional: ['author'],
      unknownKeys: 'reject',
    },
    description: 'Add a cell comment.',
  },
  editComment: {
    args: {
      kind: 'object',
      fields: {
        cell: cellRefShape,
        text: { kind: 'string' },
      },
      unknownKeys: 'reject',
    },
    description: 'Edit a cell comment.',
  },
  deleteComment: {
    args: {
      kind: 'object',
      fields: {
        cell: cellRefShape,
      },
      unknownKeys: 'reject',
    },
    description: 'Delete a cell comment.',
  },
  autoFitRow: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        row: { kind: 'number' },
      },
      unknownKeys: 'reject',
    },
    description: 'Auto-fit a row height.',
  },
  autoFitColumn: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        col: { kind: 'number' },
      },
      unknownKeys: 'reject',
    },
    description: 'Auto-fit a column width.',
  },
  mergeCellsCenter: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
        textAlign: { kind: 'literal', value: 'center' },
      },
      optional: ['textAlign'],
      unknownKeys: 'reject',
    },
    description: 'Merge cells and center the value.',
  },
  freezePanes: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        row: { kind: 'number' },
        col: { kind: 'number' },
      },
      optional: ['row', 'col'],
      unknownKeys: 'reject',
    },
    description: 'Freeze panes at the current anchor.',
  },
  unfreezePanes: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
      },
      unknownKeys: 'reject',
    },
    description: 'Unfreeze panes.',
  },
  sortRange: {
    args: {
      kind: 'object',
      fields: {
        range: rangeShape,
        keyCol: { kind: 'number' },
        direction: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'asc' },
            { kind: 'literal', value: 'desc' },
          ],
        },
        hasHeader: { kind: 'boolean' },
      },
      optional: ['hasHeader'],
      unknownKeys: 'reject',
    },
    description: 'Sort the current range.',
  },
  filterRowsByCellValue: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
        col: { kind: 'number' },
        value: { kind: 'unknown' },
        hasHeader: { kind: 'boolean' },
      },
      optional: ['hasHeader'],
    },
    description: 'Filter rows by the selected cell value.',
  },
  clearRowFilters: {
    args: {
      kind: 'object',
      fields: {
        sheetId: { kind: 'string' },
      },
    },
    description: 'Clear row filters.',
  },
  find: {
    args: {
      kind: 'object',
      fields: {
        options: findOptionsShape,
      },
    },
    result: findResultShape,
    description: 'Find text in the workbook.',
  },
  findNext: {
    args: {
      kind: 'object',
      fields: {
        options: findOptionsShape,
        from: cellRefShape,
      },
      optional: ['from'],
    },
    result: findResultShape,
    description: 'Advance to the next find result.',
  },
  replace: {
    args: {
      kind: 'object',
      fields: {
        cell: cellRefShape,
        replacement: { kind: 'string' },
        options: findOptionsShape,
      },
    },
    description: 'Replace the current find result.',
  },
  replaceAll: {
    args: {
      kind: 'object',
      fields: {
        replacement: { kind: 'string' },
        options: findOptionsShape,
      },
    },
    result: {
      kind: 'object',
      fields: {
        count: { kind: 'number' },
      },
    },
    description: 'Replace all matching results.',
  },
};
