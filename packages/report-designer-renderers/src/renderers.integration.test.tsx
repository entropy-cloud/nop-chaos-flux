// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaRenderer,
  createDefaultRegistry,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { createActionScope } from '@nop-chaos/flux-runtime';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportTemplateDocument,
  type ReportDesignerConfig,
  type ReportDesignerProfile,
} from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema, registerReportDesignerRenderers } from './index.js';
import { createReportDesignerActionProvider } from './host-action-provider.js';

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

function WorkbookTitleProbe() {
  const title = useScopeSelector((data: Record<string, unknown>) => {
    const reportDocument = data.reportDocument as
      | { semantic?: { workbookMeta?: { title?: string } } }
      | undefined;
    return reportDocument?.semantic?.workbookMeta?.title ?? '';
  });
  return <span data-testid="sheet-title">{String(title)}</span>;
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
  const targetKind = useScopeSelector(
    (data: any) => data.selectionTarget?.kind ?? data.target?.kind ?? data.selection?.kind ?? '',
  );
  return <span data-testid="report-target-kind">{String(targetKind)}</span>;
}

const reportTargetKindProbeRenderer: RendererDefinition = {
  type: 'report-target-kind-probe',
  component: ReportTargetKindProbe,
};

function ReportSpreadsheetA1Probe() {
  const value = useScopeSelector(
    (data: any) =>
      data.spreadsheet?.activeSheet?.cells?.A1?.value ?? data.activeSheet?.cells?.A1?.value,
  );
  return <span data-testid="report-spreadsheet-a1">{value == null ? '' : String(value)}</span>;
}

const reportSpreadsheetA1ProbeRenderer: RendererDefinition = {
  type: 'report-spreadsheet-a1-probe',
  component: ReportSpreadsheetA1Probe,
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
  const spreadsheet = createEmptyDocument('integration-report-designer');
  const document =
    input.document ?? createReportTemplateDocument(spreadsheet, 'Integration Report');
  const schema = defineReportDesignerPageSchema({
    type: 'report-designer-page',
    document,
    designer: input.config ?? createRuntimeConfig(),
    profile: input.profile,
    adapters: input.adapters,
    toolbar: input.toolbar,
    inspector: input.inspector,
  });

  const registry = createDefaultRegistry([
    pageRenderer,
    actionButtonRenderer,
    textRenderer,
    sheetTitleProbeRenderer,
    reportRuntimeDirtyProbeRenderer,
    reportTargetKindProbeRenderer,
    reportSpreadsheetA1ProbeRenderer,
    reportStatusProbeRenderer,
  ]);
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  render(
    <SchemaRenderer
      schemaUrl="test://report/renderers-integration"
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={{}}
    />,
  );
}

describe('report-designer namespaced actions integration', { timeout: 15000 }, () => {
  it('updates sheet metadata from toolbar action via report-designer namespace', async () => {
    renderReportDesignerPage({
      toolbar: [
        {
          type: 'action-button',
          label: 'Set Sheet Title',
          onClick: {
            action: 'report-designer:updateMeta',
            args: {
              target: { kind: 'workbook' },
              patch: { title: 'Toolbar Updated' },
            },
          },
        },
        { type: 'sheet-title-probe' },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Set Sheet Title' }));

    await waitFor(() => {
      expect(screen.getByTestId('sheet-title').textContent).toBe('Toolbar Updated');
    });
  });

  it('mounts byTarget inspector schema and routes writeback through report-designer namespace', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig({
        inspector: {
          byTarget: {
            sheet: {
              type: 'action-button',
              label: 'Apply Inspector Change',
              onClick: {
                action: 'report-designer:updateMeta',
                args: {
                  target: { kind: 'workbook' },
                  patch: { title: 'Inspector Updated' },
                },
              },
            },
          },
        },
      }),
      toolbar: { type: 'sheet-title-probe' },
      inspector: { type: 'report-inspector-shell' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply Inspector Change' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Inspector Change' }));

    await waitFor(() => {
      expect(screen.getByTestId('sheet-title').textContent).toBe('Inspector Updated');
    });
  });

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

  it('renders explicit empty state when no inspector schema exists', async () => {
    renderReportDesignerPage({
      config: createRuntimeConfig(),
      inspector: { type: 'report-inspector-shell' },
    });

    await waitFor(() => {
      expect(screen.getByText('No inspector panels available.')).toBeTruthy();
    });
  });

  it('publishes report designer host status through statusPath', async () => {
    const spreadsheet = createEmptyDocument('status-report-designer');
    const document = createReportTemplateDocument(spreadsheet, 'Status Report');

    const registry = createDefaultRegistry([pageRenderer, reportStatusProbeRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://report/renderers-status"
        schema={
          {
            type: 'page',
            body: [
              defineReportDesignerPageSchema({
                type: 'report-designer-page',
                document,
                designer: createRuntimeConfig(),
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
    const spreadsheet = createEmptyDocument('status-report-designer-unmount');
    const document = createReportTemplateDocument(spreadsheet, 'Status Report');

    const registry = createDefaultRegistry([pageRenderer, reportStatusProbeRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://report/renderers-status-unmount"
        schema={
          {
            type: 'page',
            body: [
              defineReportDesignerPageSchema({
                type: 'report-designer-page',
                document,
                designer: createRuntimeConfig(),
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

    view.unmount();
    expect(screen.queryByTestId('report-status')).toBeNull();
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
    const spreadsheet = createEmptyDocument('selection-clear-report-designer');
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
      document: createReportTemplateDocument(spreadsheet, 'Integration Report') as any,
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
        { type: 'report-spreadsheet-a1-probe' },
        { type: 'report-runtime-dirty-probe' },
      ],
      config: createRuntimeConfig(),
      document: createReportTemplateDocument(spreadsheet, 'Integration Report') as any,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Set A1' }));

    await waitFor(() => {
      expect(screen.getByTestId('report-spreadsheet-a1').textContent).toBe('42');
      expect(screen.getByTestId('report-runtime-dirty').textContent).toBe('true');
    });
  });

  it('maps failed report-designer commands to top-level action result errors', async () => {
    const provider = createReportDesignerActionProvider(async () => ({
      ok: false,
      changed: false,
      error: 'Preview adapter unavailable',
      data: { code: 'preview-unavailable' },
    }));

    const actionScope = createActionScope({ id: 'report-designer-test-scope' });
    const unregister = actionScope.registerNamespace('report-designer', provider);

    try {
      const resolved = actionScope.resolve('report-designer:preview');
      expect(resolved?.method).toBe('preview');

      const result = await resolved!.provider.invoke(resolved!.method, {}, {} as any);
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Preview adapter unavailable');
      expect(result.data).toEqual({ code: 'preview-unavailable' });
    } finally {
      unregister();
    }
  });
});
