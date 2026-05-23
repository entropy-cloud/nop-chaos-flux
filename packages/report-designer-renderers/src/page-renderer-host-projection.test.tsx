// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument } from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema } from './index.js';
import {
  createReportDesignerRegistry,
  createRuntimeConfig,
  env,
  renderReportDesignerPage,
} from './page-renderer.test-support.js';

describe('ReportDesignerPageRenderer host projection contracts', { timeout: 15000 }, () => {
  it('publishes report designer host status through statusPath', async () => {
    const spreadsheet = createEmptyDocument('page-renderer-status');
    const document = createReportTemplateDocument(spreadsheet, 'Status Report');

    const registry = createReportDesignerRegistry();
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

    const registry = createReportDesignerRegistry();
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
