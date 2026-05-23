// @vitest-environment happy-dom

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument } from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema } from './index.js';
import {
  createReportDesignerRegistry,
  createRuntimeConfig,
  env,
  reportTargetKindProbeRenderer,
} from './page-renderer.test-support.js';

describe('ReportDesignerPageRenderer initialization and failure paths', { timeout: 15000 }, () => {
  it('reports refreshFieldSources failures through monitor in addition to notify', async () => {
    const onError = vi.fn();
    const notify = vi.fn();
    const fieldSourceProvider = {
      id: 'broken-field-source',
      load: vi.fn(async () => {
        throw new Error('field sources exploded');
      }),
    };
    const monitoredEnv = {
      ...env,
      notify,
      monitor: { onError },
    };
    const spreadsheet = createEmptyDocument('page-renderer-monitor');
    const document = createReportTemplateDocument(spreadsheet, 'Monitor Report');
    const schema = defineReportDesignerPageSchema({
      type: 'report-designer-page',
      document,
      config: createRuntimeConfig({
        fieldSources: [
          { id: 'remote', label: 'Remote', provider: 'broken-field-source', groups: [] },
        ],
      }),
      adapters: {
        fieldSources: new Map([[fieldSourceProvider.id, fieldSourceProvider]]),
      },
    });
    const registry = createReportDesignerRegistry([reportTargetKindProbeRenderer]);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://report/page-renderer-monitor"
        schema={schema}
        env={monitoredEnv}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(fieldSourceProvider.load).toHaveBeenCalled();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith('warning', 'field sources exploded');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'render',
          path: '$',
          details: expect.objectContaining({
            schemaPath: '$',
            operation: 'initializeReportDesigner',
          }),
        }),
      );
    });
  });

  it('starts report designer initialization from mount effects instead of render construction', async () => {
    const fieldSourceProvider = {
      id: 'delayed-field-source',
      load: vi.fn(async () => [{ id: 'remote', label: 'Remote', groups: [] }]),
    };

    const registry = createReportDesignerRegistry();
    const SchemaRenderer = createSchemaRenderer();
    const spreadsheet = createEmptyDocument('page-renderer-effect-init');
    const document = createReportTemplateDocument(spreadsheet, 'Effect Init Report');
    const schema = defineReportDesignerPageSchema({
      type: 'report-designer-page',
      document,
      config: createRuntimeConfig({
        fieldSources: [
          { id: 'remote', label: 'Remote', provider: 'delayed-field-source', groups: [] },
        ],
      }),
      adapters: {
        fieldSources: new Map([[fieldSourceProvider.id, fieldSourceProvider]]),
      },
    });

    expect(fieldSourceProvider.load).not.toHaveBeenCalled();

    render(
      <SchemaRenderer
        schemaUrl="test://report/page-renderer-effect-init"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(fieldSourceProvider.load).toHaveBeenCalledTimes(1);
    });
  });

  it('reports invalid required runtime inputs while keeping the compatibility fallback stable', async () => {
    const notify = vi.fn();
    const onError = vi.fn();
    const monitoredEnv = {
      ...env,
      notify,
      monitor: { onError },
    };

    const schema = defineReportDesignerPageSchema({
      type: 'report-designer-page',
      document: 'bad-document' as any,
      config: 'bad-config' as any,
      profile: { id: 1, kind: null } as any,
      adapters: 'bad-adapters' as any,
      toolbar: { type: 'report-target-kind-probe' },
    });
    const registry = createReportDesignerRegistry([reportTargetKindProbeRenderer]);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://report/page-renderer-invalid-inputs"
        schema={schema}
        env={monitoredEnv}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-target-kind').textContent).toBe('sheet');
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(
        'warning',
        'report-designer-page received invalid required prop(s): document, config',
      );
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'render',
          path: '$',
          details: expect.objectContaining({
            schemaPath: '$',
            operation: 'resolveReportDesignerPageInputs',
            invalidProps: ['document', 'config'],
          }),
        }),
      );
    });
  });
});
