// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ReportDesignerDemo } from './report-designer-demo';

let injectSpreadsheetInsertFailure = false;

vi.mock('@nop-chaos/spreadsheet-renderers', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/spreadsheet-renderers')>(
    '@nop-chaos/spreadsheet-renderers',
  );

  return {
    ...actual,
    createSpreadsheetBridge(core: Parameters<typeof actual.createSpreadsheetBridge>[0]) {
      const bridge = actual.createSpreadsheetBridge(core);
      return {
        ...bridge,
        async dispatch(command: Parameters<typeof bridge.dispatch>[0]) {
          if (injectSpreadsheetInsertFailure && command.type === 'spreadsheet:setCellValue') {
            return { ok: false, error: new Error('Injected spreadsheet insert failure') };
          }
          return bridge.dispatch(command);
        },
      };
    },
  };
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
  injectSpreadsheetInsertFailure = false;
});

describe('ReportDesignerDemo', () => {
  it('inserts a field into the selected cell through the field panel insert button', async () => {
    initFluxI18n();

    const { container } = render(<ReportDesignerDemo />);

    const firstCell = container.querySelector('td.ss-cell[data-row="0"][data-col="0"]') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);
    const insertButton = screen.getByRole('button', {
      name: '将字段 Order ID 插入到当前选择',
    });

    await waitFor(() => {
      expect(insertButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(insertButton);

    await waitFor(() => {
      const updatedCell = container.querySelector(
        'td.ss-cell[data-row="0"][data-col="0"]',
      ) as HTMLElement | null;
      expect(updatedCell?.textContent).toContain('${orderId}');
      expect(updatedCell?.getAttribute('data-cell-bound')).toBe('true');
    });
  });

  it('reports insert failures to the user when no spreadsheet target write succeeds', async () => {
    initFluxI18n();
    injectSpreadsheetInsertFailure = true;

    const { container } = render(<ReportDesignerDemo />);

    const firstCell = container.querySelector('td.ss-cell[data-row="0"][data-col="0"]') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);
    const insertButton = screen.getByRole('button', {
      name: '将字段 Order ID 插入到当前选择',
    });

    await waitFor(() => {
      expect(insertButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(insertButton);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Injected spreadsheet insert failure');
    });
  });
});
