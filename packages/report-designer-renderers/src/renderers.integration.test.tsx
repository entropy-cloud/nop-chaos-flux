// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry, useScopeSelector } from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument, type ReportDesignerConfig } from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema, registerReportDesignerRenderers } from './index.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? props.meta.label ?? 'Action')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

afterEach(() => {
  cleanup();
});

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

function WorkbookTitleProbe() {
  const scopeData = useScopeSelector((data: Record<string, unknown>) => data) as {
    reportDocument?: { semantic?: { workbookMeta?: { title?: string } } };
  };
  const title = scopeData.reportDocument?.semantic?.workbookMeta?.title;
  return <span data-testid="sheet-title">{title ?? ''}</span>;
}

const sheetTitleProbeRenderer: RendererDefinition = {
  type: 'sheet-title-probe',
  component: WorkbookTitleProbe,
};

function createRuntimeConfig(overrides?: Partial<ReportDesignerConfig>): ReportDesignerConfig {
  return {
    kind: 'report-template',
    ...(overrides ?? {}),
  };
}

function renderReportDesignerPage(input: {
  config?: ReportDesignerConfig;
  toolbar?: any;
  inspector?: any;
}) {
  const spreadsheet = createEmptyDocument('integration-report-designer');
  const document = createReportTemplateDocument(spreadsheet, 'Integration Report');
  const schema = defineReportDesignerPageSchema({
    type: 'report-designer-page',
    document,
    designer: input.config ?? createRuntimeConfig(),
    toolbar: input.toolbar,
    inspector: input.inspector,
  });

  const registry = createDefaultRegistry([actionButtonRenderer, textRenderer, sheetTitleProbeRenderer]);
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  render(
    <SchemaRenderer
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={{}}
    />,
  );
}

describe('report-designer namespaced actions integration', () => {
  it('updates sheet metadata from toolbar action via report-designer namespace', async () => {
    renderReportDesignerPage({
      toolbar: [
        {
          type: 'action-button',
          label: 'Set Sheet Title',
          onClick: {
            action: 'report-designer:updateMeta',
            args: {
              target: {
                kind: 'workbook',
              },
              patch: {
                title: 'Toolbar Updated',
              },
            },
          },
        },
        {
          type: 'sheet-title-probe',
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Set Sheet Title' }));

    await waitFor(() => {
      expect(screen.getByTestId('sheet-title').textContent).toBe('Toolbar Updated');
    });
  });

  it('submits inspector panel action through report-designer namespace', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig({
        inspector: {
          providers: [
            {
              id: 'sheet-basic',
              label: 'Sheet Basic',
              match: { kinds: ['sheet'] },
              mode: 'tab',
              body: {
                type: 'text',
                text: 'Sheet inspector panel',
              },
              submitAction: {
                action: 'report-designer:updateMeta',
                args: {
                  target: {
                    kind: 'workbook',
                  },
                  patch: {
                    title: 'Inspector Updated',
                  },
                },
              },
            },
          ],
        },
      }),
      toolbar: {
        type: 'sheet-title-probe',
      },
      inspector: {
        type: 'report-inspector-shell',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Save Panel')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Save Panel'));

    await waitFor(() => {
      expect(screen.getByTestId('sheet-title').textContent).toBe('Inspector Updated');
    });
  });
});

