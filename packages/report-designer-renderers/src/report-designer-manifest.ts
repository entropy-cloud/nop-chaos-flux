import type {
  CapabilityPublicationAttribution,
  FluxValueShape,
  HostCapabilityContract,
  HostCapabilityProjectionManifest,
  HostProjectionContract,
  RendererHostContract,
} from '@nop-chaos/flux-core';

const metadataBagShape: FluxValueShape = {
  kind: 'object',
  fields: {},
  description: 'Report designer metadata bag.',
};

const selectionTargetShape: FluxValueShape = {
  kind: 'union',
  anyOf: [
    { kind: 'null' },
    {
      kind: 'object',
      fields: {
        kind: { kind: 'string' },
        sheetId: { kind: 'string' },
        row: { kind: 'number' },
        col: { kind: 'number' },
        cell: { kind: 'object', fields: {} },
        range: { kind: 'object', fields: {} },
      },
      optional: ['sheetId', 'row', 'col', 'cell', 'range'],
    },
  ],
};

const fieldSourcesShape: FluxValueShape = {
  kind: 'array',
  item: {
    kind: 'object',
    fields: {
      id: { kind: 'string' },
      label: { kind: 'string' },
      groups: { kind: 'array', item: { kind: 'object', fields: {} } },
    },
  },
};

const inspectorShape: FluxValueShape = {
  kind: 'object',
  fields: {
    open: { kind: 'boolean' },
    mode: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    resolvedSchema: { kind: 'unknown' },
    loading: { kind: 'boolean' },
    error: { kind: 'unknown' },
  },
  optional: ['mode', 'resolvedSchema', 'error'],
};

const previewShape: FluxValueShape = {
  kind: 'object',
  fields: {
    running: { kind: 'boolean' },
    mode: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    lastResult: { kind: 'unknown' },
  },
  optional: ['mode', 'lastResult'],
};

const runtimeShape: FluxValueShape = {
  kind: 'object',
  fields: {
    canUndo: { kind: 'boolean' },
    canRedo: { kind: 'boolean' },
    previewRunning: { kind: 'boolean' },
    previewMode: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
    dirty: { kind: 'boolean' },
  },
  optional: ['previewMode'],
};

const spreadsheetShape: FluxValueShape = {
  kind: 'object',
  fields: {
    workbook: { kind: 'object', fields: {} },
    activeSheet: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] },
    selection: { kind: 'object', fields: {} },
    activeCell: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] },
    activeRange: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] },
    runtime: {
      kind: 'object',
      fields: {
        canUndo: { kind: 'boolean' },
        canRedo: { kind: 'boolean' },
        readonly: { kind: 'boolean' },
        dirty: { kind: 'boolean' },
        zoom: { kind: 'number' },
      },
    },
  },
};

const reportDesignerProjection: HostProjectionContract = {
  fields: {
    designer: {
      schema: {
        kind: 'object',
        fields: {
          kind: { kind: 'string' },
          dirty: { kind: 'boolean' },
          documentId: { kind: 'string' },
          documentName: { kind: 'string' },
          selectionTarget: selectionTargetShape,
          selectionKind: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          inspector: inspectorShape,
          inspectorPanels: {
            kind: 'union',
            anyOf: [{ kind: 'unknown' }, { kind: 'null' }],
          },
          fieldDrag: { kind: 'object', fields: {} },
          preview: previewShape,
          activeMeta: { kind: 'unknown' },
          canUndo: { kind: 'boolean' },
          canRedo: { kind: 'boolean' },
          fieldSources: fieldSourcesShape,
          fieldSourceCount: { kind: 'number' },
          fieldCount: { kind: 'number' },
        },
        optional: ['selectionKind', 'activeMeta', 'inspectorPanels'],
      },
      description: 'Primary report-designer host projection.',
    },
    runtime: {
      schema: runtimeShape,
      description: 'Readonly report-designer runtime summary.',
    },
    spreadsheet: {
      schema: spreadsheetShape,
      description: 'Nested spreadsheet projection exposed inside report designer.',
    },
    inspector: {
      schema: inspectorShape,
      description: 'Inspector runtime state.',
    },
    inspectorPanels: {
      schema: {
        kind: 'union',
        anyOf: [{ kind: 'unknown' }, { kind: 'null' }],
      },
      description: 'Resolved inspector schema for the current target.',
    },
    meta: {
      schema: metadataBagShape,
      description: 'Current active metadata bag.',
    },
    selectionTarget: {
      schema: selectionTargetShape,
      description: 'Canonical current selection target.',
    },
    workbook: {
      schema: { kind: 'object', fields: {} },
      description: 'Current workbook document.',
    },
    activeSheet: {
      schema: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] },
      description: 'Current active sheet.',
    },
    activeCell: {
      schema: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] },
      description: 'Current active cell.',
    },
    activeRange: {
      schema: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] },
      description: 'Current active range.',
    },
    documentName: {
      schema: { kind: 'string' },
      description: 'Current document name.',
    },
    fieldSources: {
      schema: fieldSourcesShape,
      description: 'Resolved field source snapshots.',
    },
    fieldCount: {
      schema: { kind: 'number' },
      description: 'Resolved field count.',
    },
    preview: {
      schema: previewShape,
      description: 'Preview execution status.',
    },
    reportDocument: {
      schema: { kind: 'object', fields: {} },
      description: 'Current report template document.',
    },
  },
};

const reportDesignerCapabilities: HostCapabilityContract = {
  namespace: 'report-designer',
  methods: {
    dropFieldToTarget: {
      args: {
        kind: 'object',
        fields: {
          field: { kind: 'object', fields: {} },
          target: { kind: 'object', fields: {} },
        },
      },
      description: 'Drop a field onto a report target.',
    },
    updateMeta: {
      args: {
        kind: 'object',
        fields: {
          target: { kind: 'object', fields: {} },
          patch: metadataBagShape,
        },
      },
      description: 'Patch metadata for the current selection target.',
    },
    replaceMeta: {
      args: {
        kind: 'object',
        fields: {
          target: { kind: 'object', fields: {} },
          nextMeta: metadataBagShape,
        },
      },
      description: 'Replace metadata for the current selection target.',
    },
    openInspector: {
      args: {
        kind: 'object',
        fields: {
          target: { kind: 'object', fields: {} },
        },
        optional: ['target'],
      },
      description: 'Open the inspector for a target.',
    },
    closeInspector: {
      description: 'Close the inspector.',
    },
    preview: {
      args: {
        kind: 'object',
        fields: {
          mode: { kind: 'string' },
          args: { kind: 'object', fields: {} },
        },
        optional: ['mode', 'args'],
      },
      description: 'Run report preview.',
    },
    stopPreview: {
      description: 'Stop report preview.',
    },
    undo: {
      description: 'Undo last report-designer change.',
    },
    redo: {
      description: 'Redo last report-designer change.',
    },
    save: {
      description: 'Persist the report template.',
    },
    importTemplate: {
      args: {
        kind: 'object',
        fields: {
          payload: { kind: 'unknown' },
        },
      },
      description: 'Import a report template payload.',
    },
    exportTemplate: {
      args: {
        kind: 'object',
        fields: {
          format: { kind: 'string' },
        },
        optional: ['format'],
      },
      description: 'Export the report template.',
    },
  },
};

export const REPORT_DESIGNER_MANIFEST_V1: HostCapabilityProjectionManifest = {
  family: 'report-designer',
  version: '1.0',
  projection: reportDesignerProjection,
  capabilities: reportDesignerCapabilities,
  metadata: {
    title: 'Report Designer Host',
    description: 'Report designer workbench capability contract.',
    docsPath: 'docs/components/report-designer-page/design.md',
  },
};

const manifestVersions = new Map<string, HostCapabilityProjectionManifest>([
  ['1.0', REPORT_DESIGNER_MANIFEST_V1],
  ['1', REPORT_DESIGNER_MANIFEST_V1],
  ['latest', REPORT_DESIGNER_MANIFEST_V1],
]);

export function resolveReportDesignerManifest(
  versionSelector: string,
): HostCapabilityProjectionManifest | undefined {
  return manifestVersions.get(versionSelector);
}

export const REPORT_DESIGNER_CAPABILITY_PUBLICATION: CapabilityPublicationAttribution = {
  mode: 'region-scoped',
  capableRegions: ['toolbar', 'fieldPanel', 'inspector', 'dialogs', 'body'],
  transitiveInheritance: true,
};

export const reportDesignerHostContract: RendererHostContract = {
  family: 'report-designer',
  defaultVersion: '1.0',
  resolveManifest: resolveReportDesignerManifest,
  capabilityPublication: REPORT_DESIGNER_CAPABILITY_PUBLICATION,
};
