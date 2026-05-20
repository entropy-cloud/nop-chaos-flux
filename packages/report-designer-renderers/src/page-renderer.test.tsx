// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createDefaultRegistry,
  createSchemaRenderer,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportTemplateDocument,
  type ReportDesignerConfig,
  type ReportDesignerProfile,
} from '@nop-chaos/report-designer-core';
import {
  defineReportDesignerPageSchema,
  registerReportDesignerRenderers,
} from './index.js';

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

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
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
  const targetKind = useScopeSelector((data: any) => data.selectionTarget?.kind ?? '');
  return <span data-testid="report-target-kind">{String(targetKind)}</span>;
}

const reportTargetKindProbeRenderer: RendererDefinition = {
  type: 'report-target-kind-probe',
  component: ReportTargetKindProbe,
};

function ReportStatusProbe() {
  const status = useScopeSelector((data: any) => data.reportStatus);
  return (
    <span data-testid="report-status">
      {status
        ? `${status.kind}:${status.fieldSourceCount}:${status.dirty ? 'dirty' : 'clean'}`
        : ''}
    </span>
  );
}

const reportStatusProbeRenderer: RendererDefinition = {
  type: 'report-status-probe',
  component: ReportStatusProbe,
};

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

function createRuntimeConfig(overrides?: Partial<ReportDesignerConfig>): ReportDesignerConfig {
  return {
    kind: 'report-template',
    ...(overrides ?? {}),
  };
}

function renderReportDesignerPage(input: {
  document?: any;
  config?: ReportDesignerConfig;
  profile?: ReportDesignerProfile;
  adapters?: any;
  toolbar?: any;
  inspector?: any;
}) {
  const spreadsheet = createEmptyDocument('page-renderer-report-designer');
  const document =
    input.document ?? createReportTemplateDocument(spreadsheet, 'Page Renderer Report');
  const schema = defineReportDesignerPageSchema({
    type: 'report-designer-page',
    document,
    config: input.config ?? createRuntimeConfig(),
    profile: input.profile,
    adapters: input.adapters,
    toolbar: input.toolbar,
    inspector: input.inspector,
  });

  const registry = createDefaultRegistry([
    pageRenderer,
    actionButtonRenderer,
    textRenderer,
    reportRuntimeDirtyProbeRenderer,
    reportTargetKindProbeRenderer,
    reportStatusProbeRenderer,
  ]);
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  render(
    <SchemaRenderer
      schemaUrl="test://report/page-renderer"
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={{}}
    />,
  );
}

describe('ReportDesignerPageRenderer', { timeout: 15000 }, () => {
  it('prefers byProfile inspector schema over byTarget and body', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig({
        inspector: {
          body: { type: 'text', text: 'Body inspector' },
          byTarget: {
            sheet: { type: 'text', text: 'Target inspector' },
          },
          byProfile: {
            profileA: {
              sheet: { type: 'text', text: 'Profile inspector' },
            },
          },
        },
      }),
      profile: {
        id: 'profile-a',
        kind: 'report-template',
        fieldSourceIds: [],
        fieldDropIds: [],
        inspectorSchemaId: 'profileA',
      },
      inspector: { type: 'report-inspector-shell' },
    });

    await waitFor(() => {
      expect(screen.getByText('Profile inspector')).toBeTruthy();
    });
  });

  it('hides the inspector side when no inspector schema exists', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig(),
      inspector: { type: 'report-inspector-shell' },
    });

    await waitFor(() => {
      expect(screen.queryByTestId('right-panel-expanded')).toBeNull();
      expect(screen.queryByTestId('right-panel-collapsed')).toBeNull();
      expect(screen.queryByText('No inspector panels available.')).toBeNull();
    });
  });

  it('lets runtime close the inspector side after the configured shell seeded it open', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig({
        inspector: {
          body: { type: 'text', text: 'Inspector body' },
        },
      }),
      toolbar: [
        {
          type: 'action-button',
          label: 'Close inspector',
          onClick: {
            action: 'report-designer:closeInspector',
          },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('right-panel-expanded')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }));

    await waitFor(() => {
      expect(screen.queryByTestId('right-panel-expanded')).toBeNull();
      expect(screen.queryByTestId('right-panel-collapsed')).toBeNull();
    });
  });

  it('hides left and right workbench sides when config does not resolve them', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig(),
      inspector: { type: 'report-inspector-shell' },
    });

    await waitFor(() => {
      expect(screen.queryByTestId('left-panel-expanded')).toBeNull();
      expect(screen.queryByTestId('left-panel-collapsed')).toBeNull();
      expect(screen.queryByTestId('right-panel-expanded')).toBeNull();
      expect(screen.queryByTestId('right-panel-collapsed')).toBeNull();
      expect(screen.queryByText('No inspector panels available.')).toBeNull();
    });
  });

  it('hides config-defined sides when feature gates disable them', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig({
        fieldSources: [{ id: 'sales', label: 'Sales', groups: [] }],
        inspector: {
          body: { type: 'text', text: 'Inspector body' },
        },
        features: {
          fieldPanel: false,
          inspector: false,
        },
      }),
    });

    await waitFor(() => {
      expect(screen.queryByTestId('left-panel-expanded')).toBeNull();
      expect(screen.queryByTestId('right-panel-expanded')).toBeNull();
      expect(screen.queryByText('Inspector body')).toBeNull();
    });
  });

  it('reports refreshFieldSources failures through monitor in addition to notify', async () => {
    const onError = vi.fn();
    const notify = vi.fn();
    const fieldSourceProvider = {
      id: 'broken-field-source',
      load: vi.fn(async () => {
        throw new Error('field sources exploded');
      }),
    };
    const monitoredEnv: RendererEnv = {
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
    const registry = createDefaultRegistry([pageRenderer]);
    registerReportDesignerRenderers(registry);
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
      expect(notify).toHaveBeenCalledWith('warning', 'field sources exploded');
      expect(onError).toHaveBeenCalled();
    });
  });

  it('starts report designer initialization from mount effects instead of render construction', async () => {
    const fieldSourceProvider = {
      id: 'delayed-field-source',
      load: vi.fn(async () => [{ id: 'remote', label: 'Remote', groups: [] }]),
    };

    const registry = createDefaultRegistry([pageRenderer]);
    registerReportDesignerRenderers(registry);
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
    const monitoredEnv: RendererEnv = {
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
    const registry = createDefaultRegistry([pageRenderer, reportTargetKindProbeRenderer]);
    registerReportDesignerRenderers(registry);
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
      expect(notify).toHaveBeenCalledWith(
        'warning',
        'report-designer-page received invalid required prop(s): document, config',
      );
      expect(onError).toHaveBeenCalled();
    });
  });

  it('exposes shared collapse controls for expanded workbench sides', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig({
        fieldSources: [{ id: 'sales', label: 'Sales', groups: [] }],
        inspector: {
          body: { type: 'text', text: 'Inspector body' },
        },
      }),
    });

    await waitFor(() => {
      expect(screen.getByTestId('left-panel-expanded')).toBeTruthy();
      expect(screen.getByTestId('right-panel-expanded')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('collapse-report-field-panel'));
    fireEvent.click(screen.getByTestId('collapse-report-inspector'));

    await waitFor(() => {
      expect(screen.getByTestId('left-panel-collapsed')).toBeTruthy();
      expect(screen.getByTestId('right-panel-collapsed')).toBeTruthy();
    });
  });

  it('uses the live field panel contract for the default left workbench panel', async () => {
    const spreadsheet = createEmptyDocument('page-renderer-field-panel-default');
    const sheetId = spreadsheet.workbook.sheets[0].id;

    renderReportDesignerPage({
      document: createReportTemplateDocument(spreadsheet, 'Field Panel Report') as any,
      config: createRuntimeConfig({
        fieldSources: [
          {
            id: 'sales',
            label: 'Sales',
            groups: [
              {
                id: 'metrics',
                label: 'Metrics',
                expanded: true,
                fields: [{ id: 'revenue', label: 'Revenue', fieldType: 'number' }],
              },
            ],
          },
        ],
      }),
      toolbar: [
        {
          type: 'action-button',
          label: 'Select A1',
          onClick: {
            action: 'spreadsheet:setSelection',
            args: {
              selection: {
                kind: 'cell',
                sheetId,
                anchor: {
                  sheetId,
                  address: 'A1',
                  row: 0,
                  col: 0,
                },
              },
            },
          },
        },
      ],
    });

    await waitFor(() => {
      const insertButton = screen.getByRole('button', {
        name: 'Insert field Revenue into the current selection',
      }) as HTMLButtonElement;
      expect(screen.getByTestId('left-panel-expanded')).toBeTruthy();
      expect(document.querySelector('[data-slot="report-field-panel-shell"]')).toBeTruthy();
      expect(insertButton.disabled).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select A1' }));

    await waitFor(() => {
      const insertButton = screen.getByRole('button', {
        name: 'Insert field Revenue into the current selection',
      }) as HTMLButtonElement;
      expect(insertButton.disabled).toBe(false);
    });
  });

  it('publishes report designer host status through statusPath', async () => {
    const spreadsheet = createEmptyDocument('page-renderer-status');
    const document = createReportTemplateDocument(spreadsheet, 'Status Report');

    const registry = createDefaultRegistry([pageRenderer, reportStatusProbeRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://report/page-renderer-status"
        schema={
          {
            type: 'page',
            body: [
              defineReportDesignerPageSchema({
                type: 'report-designer-page',
                document,
                config: createRuntimeConfig(),
                statusPath: 'reportStatus',
              }),
              { type: 'report-status-probe' },
            ],
          } as any
        }
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

  it('clears report designer host status on unmount', async () => {
    const spreadsheet = createEmptyDocument('page-renderer-status-unmount');
    const document = createReportTemplateDocument(spreadsheet, 'Status Report');

    const registry = createDefaultRegistry([pageRenderer, reportStatusProbeRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    const schemaWithPage = {
      type: 'page',
      body: [
        defineReportDesignerPageSchema({
          type: 'report-designer-page',
          document,
          config: createRuntimeConfig(),
          statusPath: 'reportStatus',
        }),
        { type: 'report-status-probe' },
      ],
    } as any;

    const schemaWithoutPage = {
      type: 'page',
      body: [{ type: 'report-status-probe' }],
    } as any;

    const view = render(
      <SchemaRenderer
        schemaUrl="test://report/page-renderer-status-unmount"
        schema={schemaWithPage}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-status').textContent).toContain('report-designer:0:clean');
    });

    view.rerender(
      <SchemaRenderer
        schemaUrl="test://report/page-renderer-status-unmount"
        schema={schemaWithoutPage}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-status').textContent).toBe('');
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
        { type: 'report-runtime-dirty-probe' },
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

  it('projects canonical selectionTarget into report designer host scope and keeps it reactive', async () => {
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
        { type: 'report-target-kind-probe' },
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

  it('clears report target projection when spreadsheet selection becomes none', async () => {
    const spreadsheet = createEmptyDocument('page-renderer-selection-clear');
    const sheetId = spreadsheet.workbook.sheets[0].id;

    renderReportDesignerPage({
      toolbar: [
        {
          type: 'action-button',
          label: 'Select A1',
          onClick: {
            action: 'spreadsheet:setSelection',
            args: {
              selection: {
                kind: 'cell',
                sheetId,
                anchor: {
                  sheetId,
                  address: 'A1',
                  row: 0,
                  col: 0,
                },
              },
            },
          },
        },
        {
          type: 'action-button',
          label: 'Clear selection',
          onClick: {
            action: 'spreadsheet:setSelection',
            args: {
              selection: { kind: 'none' },
            },
          },
        },
        { type: 'report-target-kind-probe' },
      ],
      document: createReportTemplateDocument(spreadsheet, 'Selection Report') as any,
    });

    await waitFor(() => {
      expect(screen.getByTestId('report-target-kind').textContent).toBe('sheet');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select A1' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-target-kind').textContent).toBe('cell');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-target-kind').textContent).toBe('');
    });
  });
});
