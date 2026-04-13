import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyDocument,
} from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  createEmptyAdapterRegistry,
  createStaticFieldSourceProvider,
  createStaticInspectorProvider,
  createMetaPatchDropAdapter,
  createUnsupportedTemplateCodecAdapter,
  matchInspectorProviders,
  groupPanelsByMode,
  findDefaultActivePanel,
  type ReportDesignerCore,
  type ReportDesignerConfig,
  type ReportDesignerAdapterContext,
  type ReportTemplateDocument,
  type InspectorProvider,
  type InspectorPanelDescriptor,
  type FieldDropAdapter,
  type FieldSourceProvider,
} from '../index.js';

const defaultConfig: ReportDesignerConfig = {
  kind: 'report-template',
};

describe('importTemplate / exportTemplate commands', () => {
  it('should import document via codec and reset selection', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const originalDoc = createReportTemplateDocument(spreadsheetDoc, 'Original');
    const importedDoc = createReportTemplateDocument(createEmptyDocument(), 'Imported');

    const core = createReportDesignerCore({
      document: originalDoc,
      config: defaultConfig,
      profile: { id: 'p1', kind: 'report-template', fieldSourceIds: [], inspectorIds: [], fieldDropIds: [], codecId: 'json-codec' },
    });

    core.registerCodec({
      id: 'json-codec',
      async importDocument() {
        return importedDoc;
      },
      exportDocument() {
        return {};
      },
    });

    await core.setSelectionTarget({ kind: 'workbook' });
    expect(core.getSnapshot().selectionTarget?.kind).toBe('workbook');

    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: { data: 'test' },
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(core.getSnapshot().document.name).toBe('Imported');
    expect(core.getSnapshot().selectionTarget).toBeUndefined();
  });

  it('should export document via codec and return data', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc, 'Export Me');

    const core = createReportDesignerCore({
      document: doc,
      config: defaultConfig,
      profile: { id: 'p1', kind: 'report-template', fieldSourceIds: [], inspectorIds: [], fieldDropIds: [], codecId: 'json-codec' },
    });

    core.registerCodec({
      id: 'json-codec',
      importDocument() {
        return createReportTemplateDocument(createEmptyDocument());
      },
      exportDocument(exportedDoc, format) {
        return { name: exportedDoc.name, format };
      },
    });

    const result = await core.dispatch({
      type: 'report-designer:exportTemplate',
      format: 'json',
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.data).toEqual({ name: 'Export Me', format: 'json' });
  });

  it('should fail with structured error when codecId not in registry', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);

    const core = createReportDesignerCore({
      document: doc,
      config: defaultConfig,
      profile: { id: 'p1', kind: 'report-template', fieldSourceIds: [], inspectorIds: [], fieldDropIds: [], codecId: 'missing-codec' },
    });

    const importResult = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: {},
    });

    expect(importResult.ok).toBe(false);
    expect(importResult.changed).toBe(false);
    expect(importResult.error).toBeInstanceOf(Error);
    expect((importResult.error as Error).message).toBe('Codec not found: missing-codec');

    const exportResult = await core.dispatch({
      type: 'report-designer:exportTemplate',
      format: 'json',
    });

    expect(exportResult.ok).toBe(false);
    expect(exportResult.error).toBeInstanceOf(Error);
    expect((exportResult.error as Error).message).toBe('Codec not found: missing-codec');
  });
});

describe('adapter registry', () => {
  let core: ReportDesignerCore;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    core = createReportDesignerCore({ document: doc, config: defaultConfig });
  });

  it('should register field source', () => {
    const provider: FieldSourceProvider = {
      id: 'test-source',
      load: () => [],
    };
    core.registerFieldSource(provider);

    const registry = core.getAdapterRegistry();
    expect(registry.fieldSources.has('test-source')).toBe(true);
  });

  it('should register inspector', () => {
    const provider: InspectorProvider = {
      id: 'test-inspector',
      match: () => true,
      getPanels: () => [],
    };
    core.registerInspector(provider);

    const registry = core.getAdapterRegistry();
    expect(registry.inspectors.has('test-inspector')).toBe(true);
  });

  it('should register field drop adapter', () => {
    const adapter: FieldDropAdapter = {
      id: 'test-drop',
      canHandle: () => true,
      mapDropToMetaPatch: () => ({}),
    };
    core.registerFieldDrop(adapter);

    const registry = core.getAdapterRegistry();
    expect(registry.fieldDrops.has('test-drop')).toBe(true);
  });
});

describe('field drop to range', () => {
  let core: ReportDesignerCore;
  let sheetId: string;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    sheetId = spreadsheetDoc.workbook.sheets[0].id;
    const doc = createReportTemplateDocument(spreadsheetDoc);
    core = createReportDesignerCore({ document: doc, config: defaultConfig });
  });

  it('should drop field to range', async () => {
    const payload = {
      type: 'field',
      sourceId: 'ds1',
      fieldId: 'amount',
      data: { label: 'Amount' },
    };

    await core.dispatch({
      type: 'report-designer:dropFieldToTarget',
      field: payload,
      target: {
        kind: 'range',
        range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      },
    });

    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c <= 1; c++) {
        const meta = core.getMetadata({
          kind: 'cell',
          cell: {
            sheetId,
            address: `${String.fromCharCode(65 + c)}${r + 1}`,
            row: r,
            col: c,
          },
        });
        expect(meta?.field).toBeDefined();
      }
    }
  });
});

describe('matchInspectorProviders', () => {
  function makeContext(doc: ReportTemplateDocument): ReportDesignerAdapterContext {
    return {
      config: defaultConfig,
      document: doc,
      designer: {} as any,
    };
  }

  it('should match providers by target kind', () => {
    const registry = createEmptyAdapterRegistry();

    const cellProvider: InspectorProvider = {
      id: 'cell-panel',
      match: (target) => target.kind === 'cell',
      getPanels: () => [
        { id: 'basic', title: 'Basic', targetKind: 'cell', body: {} },
      ],
    };

    const sheetProvider: InspectorProvider = {
      id: 'sheet-panel',
      match: (target) => target.kind === 'sheet',
      getPanels: () => [
        { id: 'sheet', title: 'Sheet', targetKind: 'sheet', body: {} },
      ],
    };

    registry.inspectors.set('cell-panel', cellProvider);
    registry.inspectors.set('sheet-panel', sheetProvider);

    const context = makeContext(createReportTemplateDocument(createEmptyDocument()));

    const cellMatch = matchInspectorProviders(
      { kind: 'cell', cell: { sheetId: 's1', address: 'A1', row: 0, col: 0 } },
      registry,
      context,
    );
    expect(cellMatch.length).toBe(1);
    expect(cellMatch[0].id).toBe('cell-panel');

    const sheetMatch = matchInspectorProviders(
      { kind: 'sheet', sheetId: 's1' },
      registry,
      context,
    );
    expect(sheetMatch.length).toBe(1);
    expect(sheetMatch[0].id).toBe('sheet-panel');
  });

  it('should sort by priority', () => {
    const registry = createEmptyAdapterRegistry();
    const context = makeContext(createReportTemplateDocument(createEmptyDocument()));

    registry.inspectors.set('low', {
      id: 'low',
      match: () => true,
      getPanels: () => [],
      priority: -1,
    });
    registry.inspectors.set('high', {
      id: 'high',
      match: () => true,
      getPanels: () => [],
      priority: 10,
    });
    registry.inspectors.set('default', {
      id: 'default',
      match: () => true,
      getPanels: () => [],
    });

    const matched = matchInspectorProviders({ kind: 'workbook' }, registry, context);
    expect(matched[0].id).toBe('high');
    expect(matched[1].id).toBe('default');
    expect(matched[2].id).toBe('low');
  });
});

describe('groupPanelsByMode', () => {
  it('should group panels by mode', () => {
    const panels: InspectorPanelDescriptor[] = [
      { id: 'tab1', title: 'Tab 1', targetKind: 'cell', mode: 'tab', body: {} },
      { id: 'sec1', title: 'Sec 1', targetKind: 'cell', mode: 'section', body: {} },
      { id: 'tab2', title: 'Tab 2', targetKind: 'cell', mode: 'tab', body: {} },
      { id: 'inl1', title: 'Inl 1', targetKind: 'cell', mode: 'inline', body: {} },
    ];

    const grouped = groupPanelsByMode(panels);
    expect(grouped.tabs.length).toBe(2);
    expect(grouped.sections.length).toBe(1);
    expect(grouped.inline.length).toBe(1);
  });

  it('should default to tab mode', () => {
    const panels: InspectorPanelDescriptor[] = [
      { id: 'default', title: 'Default', targetKind: 'cell', body: {} },
    ];

    const grouped = groupPanelsByMode(panels);
    expect(grouped.tabs.length).toBe(1);
  });
});

describe('findDefaultActivePanel', () => {
  it('should return undefined for empty panels', () => {
    expect(findDefaultActivePanel([])).toBeUndefined();
  });

  it('should return first panel id', () => {
    const panels: InspectorPanelDescriptor[] = [
      { id: 'first', title: 'First', targetKind: 'cell', body: {} },
      { id: 'second', title: 'Second', targetKind: 'cell', body: {} },
    ];
    expect(findDefaultActivePanel(panels)).toBe('first');
  });

  it('should prefer non-readonly panel', () => {
    const panels: InspectorPanelDescriptor[] = [
      { id: 'readonly', title: 'Readonly', targetKind: 'cell', body: {}, readonly: true },
      { id: 'editable', title: 'Editable', targetKind: 'cell', body: {} },
    ];
    expect(findDefaultActivePanel(panels)).toBe('editable');
  });
});

describe('factory helpers', () => {
  it('createStaticFieldSourceProvider should create a provider', () => {
    const provider = createStaticFieldSourceProvider('test', [
      { id: 'src1', label: 'Source 1', groups: [] },
    ]);

    expect(provider.id).toBe('test');
    const result = provider.load({} as any);
    expect(result).toEqual([{ id: 'src1', label: 'Source 1', groups: [] }]);
  });

  it('createStaticInspectorProvider should create a provider', () => {
    const provider = createStaticInspectorProvider('test', 'cell', [
      { id: 'p1', title: 'Panel 1', targetKind: 'cell', body: {} },
    ]);

    expect(provider.id).toBe('test');
    expect(provider.match({ kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } }, {} as any)).toBe(true);
    expect(provider.match({ kind: 'sheet', sheetId: 's' }, {} as any)).toBe(false);
  });

  it('createMetaPatchDropAdapter should create a drop adapter', () => {
    const adapter = createMetaPatchDropAdapter({
      id: 'test-drop',
      fieldType: 'field',
      createPatch: (field) => ({ binding: field.fieldId }),
    });

    expect(adapter.id).toBe('test-drop');
    expect(adapter.canHandle({ type: 'field', sourceId: 's', fieldId: 'f', data: {} }, { kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } })).toBe(true);
    expect(adapter.canHandle({ type: 'other', sourceId: 's', fieldId: 'f', data: {} }, { kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } })).toBe(false);
  });

  it('createUnsupportedTemplateCodecAdapter should throw on import/export', () => {
    const codec = createUnsupportedTemplateCodecAdapter('test-codec');
    expect(() => codec.importDocument({}, {} as any)).toThrow();
    expect(() => codec.exportDocument({} as any, undefined, {} as any)).toThrow();
  });
});
