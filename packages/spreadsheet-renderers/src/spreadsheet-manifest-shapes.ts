import type { FluxValueShape, HostProjectionContract } from '@nop-chaos/flux-core';

export const cellRefShape: FluxValueShape = {
  kind: 'object',
  fields: {
    sheetId: { kind: 'string' },
    address: { kind: 'string' },
    row: { kind: 'number' },
    col: { kind: 'number' },
  },
  unknownKeys: 'reject',
};

export const rangeShape: FluxValueShape = {
  kind: 'object',
  fields: {
    sheetId: { kind: 'string' },
    startRow: { kind: 'number' },
    startCol: { kind: 'number' },
    endRow: { kind: 'number' },
    endCol: { kind: 'number' },
  },
  unknownKeys: 'reject',
};

export const selectionKindShape: FluxValueShape = {
  kind: 'union',
  anyOf: [
    { kind: 'literal', value: 'none' },
    { kind: 'literal', value: 'cell' },
    { kind: 'literal', value: 'range' },
    { kind: 'literal', value: 'row' },
    { kind: 'literal', value: 'column' },
    { kind: 'literal', value: 'sheet' },
  ],
};

export const searchScopeShape: FluxValueShape = {
  kind: 'union',
  anyOf: [
    { kind: 'literal', value: 'sheet' },
    { kind: 'literal', value: 'workbook' },
    { kind: 'null' },
  ],
};

export const targetShape: FluxValueShape = {
  kind: 'union',
  anyOf: [cellRefShape, rangeShape],
};

export const emptyObjectShape: FluxValueShape = {
  kind: 'object',
  fields: {},
  unknownKeys: 'reject',
};

export const sheetProtectionOptionsShape: FluxValueShape = {
  kind: 'object',
  fields: {
    selectLockedCells: { kind: 'boolean' },
    selectUnlockedCells: { kind: 'boolean' },
    formatCells: { kind: 'boolean' },
    formatColumns: { kind: 'boolean' },
    formatRows: { kind: 'boolean' },
    insertColumns: { kind: 'boolean' },
    insertRows: { kind: 'boolean' },
    deleteColumns: { kind: 'boolean' },
    deleteRows: { kind: 'boolean' },
  },
  optional: [
    'selectLockedCells',
    'selectUnlockedCells',
    'formatCells',
    'formatColumns',
    'formatRows',
    'insertColumns',
    'insertRows',
    'deleteColumns',
    'deleteRows',
  ],
  unknownKeys: 'reject',
};

export const selectionResultShape: FluxValueShape = {
  kind: 'object',
  fields: {
    kind: selectionKindShape,
    sheetId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    anchor: { kind: 'union', anyOf: [{ kind: 'null' }, cellRefShape] },
    range: { kind: 'union', anyOf: [{ kind: 'null' }, rangeShape] },
    rows: { kind: 'array', item: { kind: 'number' } },
    columns: { kind: 'array', item: { kind: 'number' } },
  },
  optional: ['sheetId', 'anchor', 'range', 'rows', 'columns'],
  unknownKeys: 'reject',
};

export const viewportShape: FluxValueShape = {
  kind: 'object',
  fields: {
    scrollX: { kind: 'number' },
    scrollY: { kind: 'number' },
    zoom: { kind: 'number' },
  },
  unknownKeys: 'reject',
};

export const clipboardResultShape: FluxValueShape = {
  kind: 'object',
  fields: {
    type: { kind: 'string' },
    sourceSheetId: { kind: 'string' },
    range: rangeShape,
    cells: { kind: 'array', item: { kind: 'array', item: { kind: 'object', fields: {} } } },
    timestamp: { kind: 'number' },
  },
};

export const findOptionsShape: FluxValueShape = {
  kind: 'object',
  fields: {
    query: { kind: 'string' },
    searchScope: searchScopeShape,
    matchCase: { kind: 'boolean' },
    matchWholeCell: { kind: 'boolean' },
    useRegex: { kind: 'boolean' },
  },
  optional: ['searchScope', 'matchCase', 'matchWholeCell', 'useRegex'],
  unknownKeys: 'reject',
};

export const findResultShape: FluxValueShape = {
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

export const runtimeShape: FluxValueShape = {
  kind: 'object',
  fields: {
    canUndo: { kind: 'boolean' },
    canRedo: { kind: 'boolean' },
    readonly: { kind: 'boolean' },
    dirty: { kind: 'boolean' },
    zoom: { kind: 'number' },
  },
  unknownKeys: 'reject',
};

export const worksheetShape: FluxValueShape = {
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

export const workbookShape: FluxValueShape = {
  kind: 'object',
  fields: {
    id: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    name: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    sheets: { kind: 'array', item: worksheetShape },
  },
};

export const selectionShape: FluxValueShape = {
  kind: 'object',
  fields: {
    kind: selectionKindShape,
    sheetId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    anchor: { kind: 'union', anyOf: [{ kind: 'null' }, cellRefShape] },
    range: { kind: 'union', anyOf: [{ kind: 'null' }, rangeShape] },
    rows: { kind: 'array', item: { kind: 'number' } },
    columns: { kind: 'array', item: { kind: 'number' } },
  },
  optional: ['sheetId', 'anchor', 'range', 'rows', 'columns'],
  unknownKeys: 'reject',
};

export const spreadsheetProjection: HostProjectionContract = {
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
