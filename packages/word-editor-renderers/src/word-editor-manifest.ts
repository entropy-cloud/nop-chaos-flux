import type {
  CapabilityPublicationAttribution,
  FluxValueShape,
  HostCapabilityContract,
  HostCapabilityProjectionManifest,
  HostProjectionContract,
  RendererHostContract,
} from '@nop-chaos/flux-core';

const chartShape: FluxValueShape = {
  kind: 'object',
  fields: {
    id: { kind: 'string' },
    chartName: { kind: 'string' },
    chartType: { kind: 'string' },
    showChartName: { kind: 'boolean' },
    datasetId: { kind: 'string' },
    categoryField: { kind: 'string' },
    valueField: { kind: 'array', item: { kind: 'string' } },
    seriesField: { kind: 'array', item: { kind: 'string' } },
  },
  optional: ['seriesField'],
};

const codeShape: FluxValueShape = {
  kind: 'object',
  fields: {
    id: { kind: 'string' },
    codeName: { kind: 'string' },
    codeType: { kind: 'string' },
    datasetId: { kind: 'string' },
    valueField: { kind: 'string' },
  },
};

const datasetShape: FluxValueShape = {
  kind: 'object',
  fields: {
    id: { kind: 'string' },
    name: { kind: 'string' },
    description: { kind: 'string' },
    type: { kind: 'string' },
    columns: {
      kind: 'array',
      item: {
        kind: 'object',
        fields: {
          name: { kind: 'string' },
          label: { kind: 'string' },
          description: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          type: { kind: 'string' },
        },
        optional: ['description'],
      },
    },
  },
};

const wordEditorProjection: HostProjectionContract = {
  fields: {
    document: {
      schema: {
        kind: 'object',
        fields: {
          header: { kind: 'array', item: { kind: 'object', fields: {} } },
          main: { kind: 'array', item: { kind: 'object', fields: {} } },
          footer: { kind: 'array', item: { kind: 'object', fields: {} } },
          charts: { kind: 'array', item: chartShape },
          codes: { kind: 'array', item: codeShape },
        },
        optional: ['charts', 'codes'],
      },
      description: 'Current word document and persisted placeholders.',
    },
    datasets: {
      schema: { kind: 'array', item: datasetShape },
      description: 'Current dataset definitions available to template expressions.',
    },
    runtime: {
      schema: {
        kind: 'object',
        fields: {
          ready: { kind: 'boolean' },
          dirty: { kind: 'boolean' },
          wordCount: { kind: 'number' },
          canUndo: { kind: 'boolean' },
          canRedo: { kind: 'boolean' },
          currentPage: { kind: 'number' },
          totalPages: { kind: 'number' },
          scale: { kind: 'number' },
          datasetCount: { kind: 'number' },
          chartCount: { kind: 'number' },
          codeCount: { kind: 'number' },
        },
      },
      description: 'Readonly runtime summary for the word editor host.',
    },
    selection: {
      schema: {
        kind: 'object',
        fields: {
          bold: { kind: 'boolean' },
          italic: { kind: 'boolean' },
          underline: { kind: 'boolean' },
          strikeout: { kind: 'boolean' },
          superscript: { kind: 'boolean' },
          subscript: { kind: 'boolean' },
          font: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          size: { kind: 'number' },
          color: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          highlight: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          rowFlex: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          level: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          listType: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          listStyle: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
          rowMargin: { kind: 'number' },
          undo: { kind: 'boolean' },
          redo: { kind: 'boolean' },
        },
      },
      description: 'Current editor selection formatting snapshot.',
    },
  },
};

const wordEditorCapabilities: HostCapabilityContract = {
  namespace: 'word-editor',
  methods: {
    save: {
      result: { kind: 'object', fields: { saved: { kind: 'boolean' } } },
      description: 'Persist the current document, datasets, charts, and codes.',
    },
    insertField: {
      args: {
        kind: 'object',
        fields: {
          datasetName: { kind: 'string' },
          fieldName: { kind: 'string' },
        },
      },
      description: 'Insert a field expression at the current cursor position.',
    },
    insertChart: {
      args: chartShape,
      description: 'Insert a chart placeholder tag and persist its metadata.',
    },
    insertCode: {
      args: codeShape,
      description: 'Insert a barcode or QR-code placeholder tag and persist its metadata.',
    },
    undo: {
      description: 'Undo the most recent editor operation.',
    },
    redo: {
      description: 'Redo the most recent undone editor operation.',
    },
  },
};

export const WORD_EDITOR_MANIFEST_V1: HostCapabilityProjectionManifest = {
  family: 'word-editor',
  version: '1.0',
  projection: wordEditorProjection,
  capabilities: wordEditorCapabilities,
  metadata: {
    title: 'Word Editor Host',
    description: 'Word template designer host capability contract.',
    docsPath: 'docs/components/word-editor-page/design.md',
  },
};

const manifestVersions = new Map<string, HostCapabilityProjectionManifest>([
  ['1.0', WORD_EDITOR_MANIFEST_V1],
  ['1', WORD_EDITOR_MANIFEST_V1],
  ['latest', WORD_EDITOR_MANIFEST_V1],
]);

export function resolveWordEditorManifest(
  versionSelector: string,
): HostCapabilityProjectionManifest | undefined {
  return manifestVersions.get(versionSelector);
}

export const WORD_EDITOR_CAPABILITY_PUBLICATION: CapabilityPublicationAttribution = {
  mode: 'region-scoped',
  capableRegions: ['toolbar', 'leftPanel', 'rightPanel'],
  transitiveInheritance: true,
};

export const wordEditorHostContract: RendererHostContract = {
  family: 'word-editor',
  defaultVersion: '1.0',
  resolveManifest: resolveWordEditorManifest,
  capabilityPublication: WORD_EDITOR_CAPABILITY_PUBLICATION,
};
