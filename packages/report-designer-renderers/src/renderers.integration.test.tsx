// @vitest-environment happy-dom
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
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportTemplateDocument,
  type ReportDesignerConfig,
  type ReportDesignerProfile,
} from '@nop-chaos/report-designer-core';
import {
  defineReportDesignerPageSchema,
  reportDesignerRendererDefinitions,
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
    sheetTitleProbeRenderer,
    reportSpreadsheetA1ProbeRenderer,
    reportRuntimeDirtyProbeRenderer,
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
  it('publishes the live config vocabulary on the report-designer-page contract', () => {
    const definition = reportDesignerRendererDefinitions.find(
      (candidate) => candidate.type === 'report-designer-page',
    );

    expect(definition?.propContracts?.config?.shape).toEqual({
      kind: 'object',
      fields: {
        kind: { kind: 'string' },
        fieldSources: { kind: 'array', item: { kind: 'object', fields: {} } },
        maxUndoDepth: { kind: 'number' },
        features: {
          kind: 'object',
          fields: {
            fieldPanel: { kind: 'boolean' },
            inspector: { kind: 'boolean' },
            preview: { kind: 'boolean' },
            expressionEditor: { kind: 'boolean' },
            dragFieldToCell: { kind: 'boolean' },
            dragFieldToRange: { kind: 'boolean' },
            customPropertyPanels: { kind: 'boolean' },
          },
          optional: [
            'fieldPanel',
            'inspector',
            'preview',
            'expressionEditor',
            'dragFieldToCell',
            'dragFieldToRange',
            'customPropertyPanels',
          ],
        },
        inspector: {
          kind: 'object',
          fields: {
            mode: {
              kind: 'union',
              anyOf: [
                { kind: 'literal', value: 'panel' },
                { kind: 'literal', value: 'drawer' },
              ],
            },
            body: { kind: 'object', fields: {} },
            byTarget: { kind: 'object', fields: {} },
            byProfile: { kind: 'object', fields: {} },
          },
          optional: ['mode', 'body', 'byTarget', 'byProfile'],
        },
        preview: {
          kind: 'object',
          fields: {
            provider: { kind: 'string' },
          },
          optional: ['provider'],
        },
      },
      optional: ['kind', 'fieldSources', 'maxUndoDepth', 'features', 'inspector', 'preview'],
    });
  });

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

});
