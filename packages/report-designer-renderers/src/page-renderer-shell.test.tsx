// @vitest-environment happy-dom

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument } from '@nop-chaos/report-designer-core';
import {
  createRuntimeConfig,
  renderReportDesignerPage,
} from './page-renderer.test-support.js';

describe('ReportDesignerPageRenderer shell contracts', { timeout: 15000 }, () => {
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
});
