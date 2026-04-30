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

const spreadsheetCapabilities: HostCapabilityContract = {
  namespace: 'spreadsheet',
  methods: {
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
  },
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
