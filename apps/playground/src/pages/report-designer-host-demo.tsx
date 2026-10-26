import { useEffect, useMemo, useState } from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { notifyWithToast } from './notify-toast.js';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { ReportDesignerConfig } from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema } from '@nop-chaos/report-designer-renderers';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { createDesignerRegistry, REPORT_DESIGNER_DEMO_RECIPE } from '../designer-hosts/registry-factory.js';
import {
  createNopReportAdapters,
  createNopReportExpressionEditorAdapter,
  createNopReportFieldSourceConfigEntry,
  createNopReportInspectorSchemas,
  createNopReportProfile,
  createNopReportReferencePickerAdapter,
  createNopReportRendererDefinitions,
  createNopReportTemplateCodec,
  withNopReportFieldKinds,
  type NopReportTemplateEnvelope,
} from '@nop-chaos/report-designer-nop-report';

declare global {
  interface Window {
    __REPORT_DESIGNER_HOST__?: {
      getDocument: () => unknown;
      getPreviewCalls: () => unknown[];
    };
  }
}

// plan 753: seed from a real-shape nop-report envelope (workbook + xpt) via the
// composed codec instead of createEmptyDocument — the demo exercises the same
// import path production hosts use.
function seedFromEnvelope(): ReturnType<ReturnType<typeof createNopReportTemplateCodec>['importTemplate']>['document'] {
  const envelope: NopReportTemplateEnvelope = {
    format: 'nop-report-template',
    version: '1.0.0',
    workbook: {
      sheets: [
        {
          id: 'sheet-main',
          name: 'Main',
          raw: { order: 0 },
          cells: {
            A1: { value: 'Alpha', raw: { rowIndex: 0, colIndex: 0 } },
            B1: { value: '42', raw: { rowIndex: 0, colIndex: 1 } },
            A2: { value: 'Beta', raw: { rowIndex: 1, colIndex: 0 } },
          },
        },
      ],
      raw: {
        documentId: 'host-demo-report',
        documentKind: 'spreadsheet',
        documentName: 'Host Demo Report',
        documentVersion: '1.0.0',
      },
    },
    xpt: {
      sheets: {
        'sheet-main': {
          cells: {
            A2: { model: { field: 'orderId', ds: 'orders', expandType: 'r' } },
          },
        },
      },
    },
  };
  const result = createNopReportTemplateCodec().importTemplate(envelope);
  if (!result.ok || !result.document) {
    throw new Error(`nop-report demo envelope invalid: ${JSON.stringify(result.diagnostics)}`);
  }
  return result.document;
}

const nopReportDatasets = [
  {
    id: 'orders',
    label: 'Orders',
    fields: [
      { path: 'orderId', label: 'Order ID', valueType: 'string' },
      { path: 'amount', label: 'Amount', valueType: 'number' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    fields: [
      { path: 'name', label: 'Name', valueType: 'string' },
      { path: 'level', label: 'Level', valueType: 'string' },
    ],
  },
];

function HostDirtyProbe() {
  const dirty = useScopeSelector(
    (data: { runtime?: { dirty?: boolean } }) => Boolean(data.runtime?.dirty),
    Object.is,
    { paths: ['runtime.dirty'] },
  );
  return (
    <span data-testid="host-dirty-probe" data-dirty={String(dirty)}>
      {dirty ? 'dirty' : 'clean'}
    </span>
  );
}

const hostDirtyProbeRenderer: RegisteredRendererDefinition = {
  type: 'host-dirty-probe',
  component: HostDirtyProbe,
};

const SchemaRenderer = createSchemaRenderer();
const nopReportProfile = createNopReportProfile();
const nopReportSchemas = withNopReportFieldKinds(createNopReportInspectorSchemas(), {
  expressionEditor: true,
  referencePicker: true,
});
const registry = createDesignerRegistry({
  ...REPORT_DESIGNER_DEMO_RECIPE,
  register: [
    ...REPORT_DESIGNER_DEMO_RECIPE.register,
    hostDirtyProbeRenderer,
    ...createNopReportRendererDefinitions({
      expressionEditor: createNopReportExpressionEditorAdapter(),
      referencePicker: createNopReportReferencePickerAdapter({
        selectAddress: () => window.prompt?.('Pick cell address') ?? undefined,
      }),
    }),
  ],
});
const env = createDefaultEnv({ notify: notifyWithToast });
const formulaCompiler = createFormulaCompiler();

export function ReportDesignerHostDemo() {
  const [invalidDocument, setInvalidDocument] = useState(false);
  const [previewCalls, setPreviewCalls] = useState<unknown[]>([]);

  const reportDoc = useMemo(() => seedFromEnvelope()!, []);
  const adapters = useMemo(
    () =>
      createNopReportAdapters({
        datasets: nopReportDatasets,
        previewEndpoint: async (args) => {
          setPreviewCalls((prev) => [...prev, { mode: args.mode ?? 'inline', at: Date.now() }]);
          await new Promise((resolve) => setTimeout(resolve, 300));
          return { data: { rows: 2, label: 'Preview OK' } };
        },
      }),
    [setPreviewCalls],
  );
  const designerConfig: ReportDesignerConfig = useMemo(
    () => ({
      kind: 'nop-report',
      fieldSources: [createNopReportFieldSourceConfigEntry('Datasets') as never],
      inspector: {
        byProfile: { 'nop-report-default': nopReportSchemas },
        byTarget: {
          range: { type: 'text', text: 'Range selected' },
          row: { type: 'text', text: 'Row selected' },
          column: { type: 'text', text: 'Column selected' },
        },
      },
    }),
    [],
  );
  const schema = useMemo(() => {
    const document = invalidDocument ? ({ kind: 'invalid-document' } as unknown) : reportDoc;
    return defineReportDesignerPageSchema({
      type: 'report-designer-page',
      document: document as never,
      config: designerConfig,
      profile: nopReportProfile,
      adapters,
      toolbar: [{ type: 'report-toolbar' }, { type: 'host-dirty-probe' }],
      inspector: [{ type: 'report-inspector-shell', title: 'Inspector' }],
    });
  }, [adapters, designerConfig, invalidDocument, reportDoc]);

  useEffect(() => {
    window.__REPORT_DESIGNER_HOST__ = {
      getDocument: () => reportDoc,
      getPreviewCalls: () => previewCalls,
    };
    return () => {
      delete window.__REPORT_DESIGNER_HOST__;
    };
  }, [previewCalls, reportDoc]);

  return (
    <div className={cn('report-designer-host h-full')} data-slot="report-designer-host">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="toggle-invalid-document"
          onClick={() => setInvalidDocument((v) => !v)}
        >
          Toggle empty template
        </Button>
        <span className="text-sm text-muted-foreground">
          host page renderer demo (report-designer-page)
        </span>
      </div>
      <div className="min-h-0 h-[calc(100%-45px)]">
        <SchemaRenderer
          key={invalidDocument ? 'invalid-document' : 'valid-document'}
          schemaUrl="playground://report-designer/host-demo"
          schema={schema}
          registry={registry}
          env={env}
          formulaCompiler={formulaCompiler}
          data={{}}
        />
      </div>
    </div>
  );
}
