import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaRenderer,
  createDefaultRegistry,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument, type FieldSourceSnapshot } from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema, registerReportDesignerRenderers } from '../index.js';
import {
  createRuntimeConfig,
  env,
  pageRenderer,
  actionButtonRenderer,
  textRenderer,
} from '../page-renderer.test-support.js';

// React StrictMode double-mounts effects (dev default, HMR). The page renderer
// used to dispose its memoized designer core in the effect cleanup, which killed
// the core on the simulated unmount: the remount's initialize() no-ops
// (`disposed`), so field sources never load and selection mirroring stops.
// Regression: cores survive StrictMode remounts and still initialize.

const fieldSources: FieldSourceSnapshot[] = [
  {
    id: 'orders',
    label: 'Orders Dataset',
    groups: [
      {
        id: 'basic',
        label: 'Basic Fields',
        expanded: true,
        fields: [{ id: 'orderId', label: 'Order ID', path: 'orders.orderId', fieldType: 'number' }],
      },
    ],
  },
];

function FieldSourceProbe() {
  const raw = useScopeSelector((data: Record<string, unknown>) => data.fieldSources);
  return (
    <span data-testid="field-source-probe">
      {String(Array.isArray(raw) ? raw.length : -1)}
    </span>
  );
}

const fieldSourceProbeRenderer = {
  type: 'field-source-probe',
  component: FieldSourceProbe,
};

describe('ReportDesignerPageRenderer under React StrictMode', { timeout: 15000 }, () => {
  it('keeps the designer core alive across StrictMode double-mount and loads field sources', async () => {
    const spreadsheet = createEmptyDocument('strict-mode-probe');
    const document = createReportTemplateDocument(spreadsheet, 'Strict Mode Report');
    const schema = defineReportDesignerPageSchema({
      type: 'report-designer-page',
      document,
      config: createRuntimeConfig({
        fieldSources: fieldSources.map((fs) => ({ ...fs, provider: undefined })),
      }),
      toolbar: [{ type: 'field-source-probe' }],
    });
    const registry = createDefaultRegistry([
      pageRenderer,
      actionButtonRenderer,
      textRenderer,
      fieldSourceProbeRenderer,
    ]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://strict-mode-probe"
          schema={schema}
          env={env}
          registry={registry}
          formulaCompiler={createFormulaCompiler()}
          data={{}}
        />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(
        globalThis.document.querySelector('[data-testid="field-source-probe"]')?.textContent,
      ).toBe('1');
    });
  });
});
