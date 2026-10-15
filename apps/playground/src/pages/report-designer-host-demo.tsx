import { useEffect, useMemo, useState } from 'react';
import { createSchemaRenderer, createDefaultEnv } from '@nop-chaos/flux-react';
import { notifyWithToast } from './notify-toast.js';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportTemplateDocument,
  type ReportDesignerConfig,
} from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema } from '@nop-chaos/report-designer-renderers';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { createDesignerRegistry, REPORT_DESIGNER_DEMO_RECIPE } from '../designer-hosts/registry-factory.js';
import { fieldSources } from './report-designer-demo-shared.js';

declare global {
  interface Window {
    __REPORT_DESIGNER_HOST__?: {
      getDocument: () => unknown;
      getPreviewCalls: () => unknown[];
    };
  }
}

function seedSpreadsheet() {
  const doc = createEmptyDocument('report-designer-host-demo');
  const sheet = doc.workbook.sheets[0];
  sheet.cells = {
    A1: { address: 'A1', row: 0, col: 0, value: 'Alpha' },
    B1: { address: 'B1', row: 0, col: 1, value: '42' },
    A2: { address: 'A2', row: 1, col: 0, value: 'Beta' },
  };
  return doc;
}

function HostDirtyProbe() {
  const dirty = useScopeSelector((data: { runtime?: { dirty?: boolean } }) =>
    Boolean(data.runtime?.dirty),
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
const registry = createDesignerRegistry({
  ...REPORT_DESIGNER_DEMO_RECIPE,
  register: [...REPORT_DESIGNER_DEMO_RECIPE.register, hostDirtyProbeRenderer],
});
const env = createDefaultEnv({ notify: notifyWithToast });
const formulaCompiler = createFormulaCompiler();

export function ReportDesignerHostDemo() {
  const [invalidDocument, setInvalidDocument] = useState(false);
  const [previewCalls, setPreviewCalls] = useState<unknown[]>([]);

  const spreadsheetDoc = useMemo(() => seedSpreadsheet(), []);
  const reportDoc = useMemo(
    () => createReportTemplateDocument(spreadsheetDoc, 'Host Demo Report'),
    [spreadsheetDoc],
  );
  const previewAdapter = useMemo(
    () => ({
      id: 'host-preview',
      preview: async (args: { mode?: string }) => {
        setPreviewCalls((prev) => [...prev, { mode: args.mode ?? 'inline', at: Date.now() }]);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { ok: true, mode: args.mode ?? 'inline', data: { rows: 2, label: 'Preview OK' } };
      },
    }),
    [setPreviewCalls],
  );
  const designerConfig: ReportDesignerConfig = useMemo(
    () => ({
      kind: 'report-template',
      fieldSources: fieldSources.map((fs) => ({ ...fs, provider: undefined })),
      preview: { provider: 'host-preview' },
      inspector: {
        byTarget: {
          workbook: { type: 'text', text: 'Workbook selected' },
          sheet: { type: 'text', text: 'Sheet selected' },
          cell: { type: 'text', text: 'Cell selected' },
          range: { type: 'text', text: 'Range selected' },
          row: { type: 'text', text: 'Row selected' },
          column: { type: 'text', text: 'Column selected' },
        },
      },
    }),
    [],
  );
  const adapters = useMemo(
    () => ({ previews: new Map([['host-preview', previewAdapter]]) }),
    [previewAdapter],
  );
  const schema = useMemo(() => {
    const document = invalidDocument ? ({ kind: 'invalid-document' } as unknown) : reportDoc;
    return defineReportDesignerPageSchema({
      type: 'report-designer-page',
      document: document as never,
      config: designerConfig,
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
