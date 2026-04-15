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
      {String(props.props.label ?? 'Action')}
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

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render()}</section>,
  regions: ['body']
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

function ReportRuntimeDirtyProbe() {
  const dirty = useScopeSelector((data: any) => data.runtime?.dirty);
  return <span data-testid="report-runtime-dirty">{String(Boolean(dirty))}</span>;
}

const reportRuntimeDirtyProbeRenderer: RendererDefinition = {
  type: 'report-runtime-dirty-probe',
  component: ReportRuntimeDirtyProbe,
};

function ReportTargetKindProbe() {
  const targetKind = useScopeSelector((data: any) => data.target?.kind ?? data.selection?.kind ?? '');
  return <span data-testid="report-target-kind">{String(targetKind)}</span>;
}

const reportTargetKindProbeRenderer: RendererDefinition = {
  type: 'report-target-kind-probe',
  component: ReportTargetKindProbe,
};

function ReportSpreadsheetA1Probe() {
  const value = useScopeSelector((data: any) => data.spreadsheet?.activeSheet?.cells?.A1?.value ?? data.activeSheet?.cells?.A1?.value);
  return <span data-testid="report-spreadsheet-a1">{value == null ? '' : String(value)}</span>;
}

const reportSpreadsheetA1ProbeRenderer: RendererDefinition = {
  type: 'report-spreadsheet-a1-probe',
  component: ReportSpreadsheetA1Probe,
};

function ReportProviderSpreadsheetProbe() {
  const value = useScopeSelector((data: any) => data.reportDocument?.semantic?.workbookMeta?.providerSheetId);
  return <span data-testid="report-provider-spreadsheet">{value == null ? '' : String(value)}</span>;
}

const reportProviderSpreadsheetProbeRenderer: RendererDefinition = {
  type: 'report-provider-spreadsheet-probe',
  component: ReportProviderSpreadsheetProbe,
};

function ReportStatusProbe() {
  const status = useScopeSelector((data: any) => data.reportStatus);
   return <span data-testid="report-status">{status ? `${status.kind}:${status.fieldSourceCount}:${status.dirty ? 'dirty' : 'clean'}` : ''}</span>;
}

function createRuntimeConfig(overrides?: Partial<ReportDesignerConfig>): ReportDesignerConfig {
  return {
    kind: 'report-template',
    ...(overrides ?? {}),
  };
}

function renderReportDesignerPage(input: {
  document?: any;
  config?: ReportDesignerConfig;
  adapters?: any;
  toolbar?: any;
  inspector?: any;
}) {
  const spreadsheet = createEmptyDocument('integration-report-designer');
  const document = input.document ?? createReportTemplateDocument(spreadsheet, 'Integration Report');
  const schema = defineReportDesignerPageSchema({
    type: 'report-designer-page',
    document,
    designer: input.config ?? createRuntimeConfig(),
    adapters: input.adapters,
    toolbar: input.toolbar,
    inspector: input.inspector,
  });

  const registry = createDefaultRegistry([
    actionButtonRenderer,
    textRenderer,
    sheetTitleProbeRenderer,
    reportRuntimeDirtyProbeRenderer,
    reportTargetKindProbeRenderer,
    reportSpreadsheetA1ProbeRenderer,
    reportProviderSpreadsheetProbeRenderer,
  ]);
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

  it('renders toolbar via report-toolbar schema in page', async () => {
    renderReportDesignerPage({
      toolbar: {
        type: 'report-toolbar',
        itemsOverride: [
          { id: 'save', type: 'button', label: 'Custom Save', action: 'report-designer:save' },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Custom Save')).toBeTruthy();
    });
    expect(document.querySelector('.nop-report-designer')).toBeTruthy();
    expect(document.querySelector('[data-slot="report-designer-header"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="report-designer-status"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="report-designer-toolbar"]')).toBeTruthy();
  });

  it('publishes report designer host status through statusPath', async () => {
    const spreadsheet = createEmptyDocument('status-report-designer');
    const document = createReportTemplateDocument(spreadsheet, 'Status Report');
    const statusProbeRenderer: RendererDefinition = {
      type: 'report-status-probe',
      component: ReportStatusProbe
    };

    const registry = createDefaultRegistry([pageRenderer, actionButtonRenderer, sheetTitleProbeRenderer, statusProbeRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            defineReportDesignerPageSchema({
              type: 'report-designer-page',
              document,
              designer: createRuntimeConfig(),
              statusPath: 'reportStatus',
            }),
            { type: 'report-status-probe' }
          ]
        } as any}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-status').textContent).toContain('report-designer:0:clean');
    });
  });

  it('publishes dirty host status after report-designer mutations', async () => {
    const spreadsheet = createEmptyDocument('dirty-status-report-designer');
    const document = createReportTemplateDocument(spreadsheet, 'Dirty Status Report');
    const statusProbeRenderer: RendererDefinition = {
      type: 'report-status-probe',
      component: ReportStatusProbe
    };

    const registry = createDefaultRegistry([pageRenderer, actionButtonRenderer, statusProbeRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            defineReportDesignerPageSchema({
              type: 'report-designer-page',
              document,
              designer: createRuntimeConfig(),
              statusPath: 'reportStatus',
              toolbar: {
                type: 'action-button',
                label: 'Dirty report',
                onClick: {
                  action: 'report-designer:updateMeta',
                  args: {
                    target: { kind: 'workbook' },
                    patch: { title: 'Changed' }
                  }
                }
              } as any
            } as any),
            { type: 'report-status-probe' }
          ]
        } as any}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-status').textContent).toContain('report-designer:0:clean');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dirty report' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-status').textContent).toContain('report-designer:0:dirty');
    });
  });

  it('projects runtime dirty into report designer host scope after mutations', async () => {
    renderReportDesignerPage({
      toolbar: [
        {
          type: 'action-button',
          label: 'Dirty report',
          onClick: {
            action: 'report-designer:updateMeta',
            args: {
              target: { kind: 'workbook' },
              patch: { title: 'Changed' },
            },
          },
        },
        {
          type: 'report-runtime-dirty-probe',
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('report-runtime-dirty').textContent).toBe('false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dirty report' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-runtime-dirty').textContent).toBe('true');
    });
  });

  it('projects target aliases into report designer host scope and keeps them reactive', async () => {
    renderReportDesignerPage({
      toolbar: [
        {
          type: 'action-button',
          label: 'Inspect workbook',
          onClick: {
            action: 'report-designer:openInspector',
            args: {
              target: { kind: 'workbook' },
            },
          },
        },
        {
          type: 'report-target-kind-probe',
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('report-target-kind').textContent).toBe('sheet');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Inspect workbook' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-target-kind').textContent).toBe('workbook');
    });
  });

  it('supports spreadsheet namespaced actions through report-designer page host scope', async () => {
    const spreadsheet = createEmptyDocument('spreadsheet-action-report-designer');
    const sheetId = spreadsheet.workbook.sheets[0].id;

    renderReportDesignerPage({
      toolbar: [
        {
          type: 'action-button',
          label: 'Set A1',
          onClick: {
            action: 'spreadsheet:setCellValue',
            args: {
              cell: {
                sheetId,
                address: 'A1',
                row: 0,
                col: 0,
              },
              value: '42',
            },
          },
        },
        {
          type: 'report-spreadsheet-a1-probe',
        },
        {
          type: 'report-runtime-dirty-probe',
        },
      ],
      config: createRuntimeConfig(),
      document: createReportTemplateDocument(spreadsheet, 'Integration Report') as any,
    } as any);

    fireEvent.click(screen.getByRole('button', { name: 'Set A1' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-spreadsheet-a1').textContent).toBe('42');
      expect(screen.getByTestId('report-runtime-dirty').textContent).toBe('true');
    });
  });

  it('renders inspector provider failures through stable host error state', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig({
        inspector: {
          providers: [
            {
              id: 'failing-panel',
              label: 'Failing Panel',
              match: { kinds: ['sheet'] },
              provider: 'failing-provider',
            },
          ],
        },
      }),
      adapters: {
        inspectors: new Map([
          ['failing-provider', {
            id: 'failing-provider',
            match: () => true,
            getPanels: () => {
              throw new Error('Inspector load failed');
            },
          }],
        ]),
      },
      inspector: {
        type: 'report-inspector-shell',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to load inspector panels.')).toBeTruthy();
      expect(screen.getByText(/Inspector load failed/)).toBeTruthy();
    });
  });

  it('passes spreadsheet snapshot into report inspector providers', async () => {
    const spreadsheet = createEmptyDocument('provider-context-report-designer');
    const sheetId = spreadsheet.workbook.sheets[0].id;

    renderReportDesignerPage({
      document: createReportTemplateDocument(spreadsheet, 'Provider Context Report') as any,
      config: createRuntimeConfig({
        inspector: {
          providers: [
            {
              id: 'provider-panel',
              label: 'Provider Panel',
              match: { kinds: ['sheet'] },
              provider: 'provider-panel',
            },
          ],
        },
      }),
      adapters: {
        inspectors: new Map([
          ['provider-panel', {
            id: 'provider-panel',
            match: () => true,
            getPanels: (context: any) => [{
              id: 'provider-panel',
              title: 'Provider Panel',
              targetKind: 'sheet',
              body: {
                type: 'action-button',
                label: 'Capture Spreadsheet Context',
                onClick: {
                  action: 'report-designer:updateMeta',
                  args: {
                    target: { kind: 'workbook' },
                    patch: { providerSheetId: context.spreadsheet.activeSheetId },
                  },
                },
              },
            }],
          }],
        ]),
      },
      toolbar: {
        type: 'report-provider-spreadsheet-probe',
      },
      inspector: {
        type: 'report-inspector-shell',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Capture Spreadsheet Context')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Capture Spreadsheet Context' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-provider-spreadsheet').textContent).toBe(sheetId);
    });
  });
});
