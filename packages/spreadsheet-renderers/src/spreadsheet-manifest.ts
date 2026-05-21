import type {
  CapabilityPublicationAttribution,
  FluxValueShape,
  HostCapabilityContract,
  HostCapabilityProjectionManifest,
  HostProjectionContract,
  RendererHostContract,
} from '@nop-chaos/flux-core';

const cellRefShape: FluxValueShape = {
  kind: 'object',
  fields: {
    sheetId: { kind: 'string' },
    address: { kind: 'string' },
    row: { kind: 'number' },
    col: { kind: 'number' },
  },
};

const rangeShape: FluxValueShape = {
  kind: 'object',
  fields: {
    sheetId: { kind: 'string' },
    startRow: { kind: 'number' },
    startCol: { kind: 'number' },
    endRow: { kind: 'number' },
    endCol: { kind: 'number' },
  },
};

const selectionResultShape: FluxValueShape = {
  kind: 'object',
  fields: {
    kind: { kind: 'string' },
    sheetId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    anchor: { kind: 'union', anyOf: [{ kind: 'null' }, cellRefShape] },
    range: { kind: 'union', anyOf: [{ kind: 'null' }, rangeShape] },
    rows: { kind: 'array', item: { kind: 'number' } },
    columns: { kind: 'array', item: { kind: 'number' } },
  },
  optional: ['sheetId', 'anchor', 'range', 'rows', 'columns'],
};

const viewportShape: FluxValueShape = {
  kind: 'object',
  fields: {
    scrollX: { kind: 'number' },
    scrollY: { kind: 'number' },
    zoom: { kind: 'number' },
  },
};

const clipboardResultShape: FluxValueShape = {
  kind: 'object',
  fields: {
    type: { kind: 'string' },
    sourceSheetId: { kind: 'string' },
    range: rangeShape,
    cells: { kind: 'array', item: { kind: 'array', item: { kind: 'object', fields: {} } } },
    timestamp: { kind: 'number' },
  },
};

const findOptionsShape: FluxValueShape = {
  kind: 'object',
  fields: {
    query: { kind: 'string' },
    searchScope: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    matchCase: { kind: 'boolean' },
    wholeCell: { kind: 'boolean' },
    includeFormulas: { kind: 'boolean' },
  },
  optional: ['searchScope', 'matchCase', 'wholeCell', 'includeFormulas'],
};

const findResultShape: FluxValueShape = {
  kind: 'union',
  anyOf: [
    { kind: 'null' },
    {
      kind: 'object',
      fields: {
        cell: cellRefShape,
        value: { kind: 'unknown' },
      },
      optional: ['value'],
    },
  ],
};

const runtimeShape: FluxValueShape = {
  kind: 'object',
  fields: {
    canUndo: { kind: 'boolean' },
    canRedo: { kind: 'boolean' },
    readonly: { kind: 'boolean' },
    dirty: { kind: 'boolean' },
    zoom: { kind: 'number' },
  },
};

const worksheetShape: FluxValueShape = {
  kind: 'object',
  fields: {
    id: { kind: 'string' },
    name: { kind: 'string' },
    order: { kind: 'number' },
    rows: { kind: 'object', fields: {} },
    columns: { kind: 'object', fields: {} },
    cells: { kind: 'object', fields: {} },
    merges: { kind: 'array', item: { kind: 'object', fields: {} } },
  },
};

const workbookShape: FluxValueShape = {
  kind: 'object',
  fields: {
    id: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    name: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    sheets: { kind: 'array', item: worksheetShape },
  },
};

const selectionShape: FluxValueShape = {
  kind: 'object',
  fields: {
    kind: { kind: 'string' },
    sheetId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    anchor: { kind: 'union', anyOf: [{ kind: 'null' }, cellRefShape] },
    range: { kind: 'union', anyOf: [{ kind: 'null' }, rangeShape] },
    rows: { kind: 'array', item: { kind: 'number' } },
    columns: { kind: 'array', item: { kind: 'number' } },
  },
  optional: ['sheetId', 'anchor', 'range', 'rows', 'columns'],
};

const spreadsheetProjection: HostProjectionContract = {
  fields: {
    workbook: {
      schema: workbookShape,
      description: 'Workbook document visible to spreadsheet-hosted fragments.',
    },
    activeSheet: {
      schema: {
        kind: 'union',
        anyOf: [{ kind: 'null' }, worksheetShape],
      },
      description: 'Current active worksheet.',
    },
    selection: {
      schema: selectionShape,
      description: 'Current spreadsheet selection.',
    },
    activeCell: {
      schema: {
        kind: 'union',
        anyOf: [{ kind: 'null' }, cellRefShape],
      },
      description: 'Current active cell when the selection kind is cell.',
    },
    activeRange: {
      schema: {
        kind: 'union',
        anyOf: [{ kind: 'null' }, rangeShape],
      },
      description: 'Current active range when the selection kind is range.',
    },
    runtime: {
      schema: runtimeShape,
      description: 'Readonly spreadsheet runtime summary.',
    },
  },
};

export const SPREADSHEET_HOST_METHOD_CONTRACTS: HostCapabilityContract['methods'] = {
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
      description: 'Commit current spreadsheet transaction.',
    },
    rollbackTransaction: {
      description: 'Rollback current spreadsheet transaction.',
    },
    undo: {
      description: 'Undo last spreadsheet operation.',
    },
    redo: {
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
          options: { kind: 'object', fields: {} },
        },
        optional: ['options'],
      },
      description: 'Paste clipboard content at the current target.',
    },
    clearCells: {
      args: {
        kind: 'object',
        fields: {
          target: { kind: 'union', anyOf: [cellRefShape, rangeShape] },
          clearValues: { kind: 'boolean' },
          clearFormats: { kind: 'boolean' },
          clearComments: { kind: 'boolean' },
        },
        optional: ['clearValues', 'clearFormats', 'clearComments'],
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
      description: 'Move a worksheet.',
    },
    copySheet: {
      description: 'Copy a worksheet.',
    },
    setSheetTabColor: {
      description: 'Set a worksheet tab color.',
    },
    hideSheet: {
      description: 'Hide or show a worksheet.',
    },
    protectSheet: {
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
    setCellFontFamily: {
      description: 'Set the cell font family.',
    },
    setCellFontSize: {
      description: 'Set the cell font size.',
    },
    setCellFontWeight: {
      description: 'Set the cell font weight.',
    },
    setCellFontStyle: {
      description: 'Set the cell font style.',
    },
    setCellTextDecoration: {
      description: 'Set the cell text decoration.',
    },
    setCellFontColor: {
      description: 'Set the cell font color.',
    },
    setCellBackgroundColor: {
      description: 'Set the cell background color.',
    },
    setCellBorder: {
      description: 'Set the cell border.',
    },
    setCellTextAlign: {
      description: 'Set the cell text alignment.',
    },
    setCellVerticalAlign: {
      description: 'Set the cell vertical alignment.',
    },
    setCellWrapText: {
      description: 'Set cell wrapping.',
    },
    setCellNumberFormat: {
      description: 'Set the cell number format.',
    },
    fillDown: {
      description: 'Fill downward from the current selection.',
    },
    fillRight: {
      description: 'Fill right from the current selection.',
    },
    fillSeries: {
      description: 'Fill a generated series from the current selection.',
    },
    addComment: {
      description: 'Add a cell comment.',
    },
    editComment: {
      description: 'Edit a cell comment.',
    },
    deleteComment: {
      description: 'Delete a cell comment.',
    },
    autoFitRow: {
      description: 'Auto-fit a row height.',
    },
    autoFitColumn: {
      description: 'Auto-fit a column width.',
    },
    mergeCellsCenter: {
      description: 'Merge cells and center the value.',
    },
    freezePanes: {
      description: 'Freeze panes at the current anchor.',
    },
    unfreezePanes: {
      description: 'Unfreeze panes.',
    },
    sortRange: {
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

export const SPREADSHEET_HOST_METHODS = Object.freeze(
  Object.keys(SPREADSHEET_HOST_METHOD_CONTRACTS),
) as readonly string[];

const spreadsheetCapabilities: HostCapabilityContract = {
  namespace: 'spreadsheet',
  methods: SPREADSHEET_HOST_METHOD_CONTRACTS,
};

export const SPREADSHEET_MANIFEST_V1: HostCapabilityProjectionManifest = {
  family: 'spreadsheet',
  version: '1.0',
  projection: spreadsheetProjection,
  capabilities: spreadsheetCapabilities,
  metadata: {
    title: 'Spreadsheet Host',
    description: 'Spreadsheet editor host capability contract.',
    docsPath: 'docs/components/spreadsheet-page/design.md',
  },
};

const manifestVersions = new Map<string, HostCapabilityProjectionManifest>([
  ['1.0', SPREADSHEET_MANIFEST_V1],
  ['1', SPREADSHEET_MANIFEST_V1],
  ['latest', SPREADSHEET_MANIFEST_V1],
]);

export function resolveSpreadsheetManifest(
  versionSelector: string,
): HostCapabilityProjectionManifest | undefined {
  return manifestVersions.get(versionSelector);
}

export const SPREADSHEET_CAPABILITY_PUBLICATION: CapabilityPublicationAttribution = {
  mode: 'region-scoped',
  capableRegions: ['toolbar', 'body', 'dialogs'],
  transitiveInheritance: true,
};

export const spreadsheetHostContract: RendererHostContract = {
  family: 'spreadsheet',
  defaultVersion: '1.0',
  resolveManifest: resolveSpreadsheetManifest,
  capabilityPublication: SPREADSHEET_CAPABILITY_PUBLICATION,
};
