import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  createEmptyAdapterRegistry,
  createStaticFieldSourceProvider,
  createMetaPatchDropAdapter,
  createUnsupportedTemplateCodecAdapter,
  type ReportDesignerCore,
  type ReportDesignerConfig,
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
      profile: {
        id: 'p1',
        kind: 'report-template',
        fieldSourceIds: [],
        fieldDropIds: [],
        codecId: 'json-codec',
      },
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

  it('should refresh derived state immediately after import', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const originalDoc = createReportTemplateDocument(spreadsheetDoc, 'Original');
    const importedDoc = createReportTemplateDocument(createEmptyDocument(), 'Imported');
    let currentDocument = originalDoc;
    const provider = {
      id: 'derived-source',
      load: vi
        .fn()
        .mockImplementation(() => [
          {
            id: currentDocument.name === 'Imported' ? 'imported-source' : 'original-source',
            label: currentDocument.name === 'Imported' ? 'Imported Source' : 'Original Source',
            groups: [],
          },
        ]),
    };

    const core = createReportDesignerCore({
      document: originalDoc,
      config: {
        kind: 'report-template',
        fieldSources: [{ id: 'remote', label: 'Remote', provider: provider.id, groups: [] }],
        inspector: {
          byTarget: {
            workbook: { type: 'text', text: 'Workbook inspector' },
          },
        },
      },
      adapters: {
        fieldSources: new Map([[provider.id, provider]]),
      },
      profile: {
        id: 'p1',
        kind: 'report-template',
        fieldSourceIds: ['remote'],
        fieldDropIds: [],
        codecId: 'json-codec',
      },
    });

    core.registerCodec({
      id: 'json-codec',
      async importDocument() {
        currentDocument = importedDoc;
        return importedDoc;
      },
      exportDocument() {
        return {};
      },
    });

    await core.setSelectionTarget({ kind: 'workbook' });
    expect(core.getSnapshot().fieldSources.map((source) => source.id)).toEqual(['original-source']);
    expect(core.getSnapshot().inspector.resolvedSchema).toEqual({
      type: 'text',
      text: 'Workbook inspector',
    });

    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: { data: 'test' },
    });

    expect(result.ok).toBe(true);
    expect(core.getSnapshot().selectionTarget).toBeUndefined();
    expect(core.getSnapshot().fieldSources.map((source) => source.id)).toEqual(['imported-source']);
    expect(provider.load).toHaveBeenLastCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({ name: 'Imported' }),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(core.getSnapshot().inspector.loading).toBe(false);
    expect(core.getSnapshot().inspector.error).toBeUndefined();
    expect(core.getSnapshot().inspector.resolvedSchema).toBeUndefined();
  });

  it('should export document via codec and return data', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc, 'Export Me');

    const core = createReportDesignerCore({
      document: doc,
      config: defaultConfig,
      profile: {
        id: 'p1',
        kind: 'report-template',
        fieldSourceIds: [],
        fieldDropIds: [],
        codecId: 'json-codec',
      },
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
      profile: {
        id: 'p1',
        kind: 'report-template',
        fieldSourceIds: [],
        fieldDropIds: [],
        codecId: 'missing-codec',
      },
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

describe('factory helpers', () => {
  it('createEmptyAdapterRegistry should start with empty maps', () => {
    const registry = createEmptyAdapterRegistry();

    expect(registry.fieldSources.size).toBe(0);
    expect(registry.fieldDrops.size).toBe(0);
    expect(registry.previews.size).toBe(0);
    expect(registry.codecs.size).toBe(0);
  });

  it('createStaticFieldSourceProvider should create a provider', () => {
    const provider = createStaticFieldSourceProvider('test', [
      { id: 'src1', label: 'Source 1', groups: [] },
    ]);

    expect(provider.id).toBe('test');
    const result = provider.load({} as any);
    expect(result).toEqual([{ id: 'src1', label: 'Source 1', groups: [] }]);
  });

  it('createMetaPatchDropAdapter should create a drop adapter', () => {
    const adapter = createMetaPatchDropAdapter({
      id: 'test-drop',
      fieldType: 'field',
      createPatch: (field) => ({ binding: field.fieldId }),
    });

    expect(adapter.id).toBe('test-drop');
    expect(
      adapter.canHandle(
        { type: 'field', sourceId: 's', fieldId: 'f', data: {} },
        { kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } },
      ),
    ).toBe(true);
    expect(
      adapter.canHandle(
        { type: 'other', sourceId: 's', fieldId: 'f', data: {} },
        { kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } },
      ),
    ).toBe(false);
    expect(
      adapter.mapDropToMetaPatch({
        field: { type: 'field', sourceId: 's', fieldId: 'f', data: {} },
        target: { kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } },
        context: {} as any,
      }),
    ).toEqual({ binding: 'f' });
  });

  it('createUnsupportedTemplateCodecAdapter should throw on import/export', () => {
    const codec = createUnsupportedTemplateCodecAdapter('test-codec');
    expect(() => codec.importDocument({}, {} as any)).toThrow();
    expect(() => codec.exportDocument({} as any, undefined, {} as any)).toThrow();
  });
});
