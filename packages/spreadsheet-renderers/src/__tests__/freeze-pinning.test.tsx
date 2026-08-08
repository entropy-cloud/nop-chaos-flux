import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge } from '../index.js';
import { SpreadsheetGridHarness } from './spreadsheet-grid-harness.js';

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('frozen pane pinning', () => {
  async function renderFrozenGrid(frozen: { row?: number; col?: number }) {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const doc = createEmptyDocument('frozen-pinning');
    const sheet = doc.workbook.sheets[0];
    sheet.frozen = frozen;
    const core = createSpreadsheetCore({ document: doc });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const view = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);
    return { view, core };
  }

  it('renders frozen cells with sticky positioning so they stay pinned during scroll', async () => {
    const { view } = await renderFrozenGrid({ row: 1, col: 1 });

    const frozenRowCell = view.container.querySelector(
      'td[data-row="0"][data-col="0"][data-cell-frozen]',
    ) as HTMLElement | null;
    const frozenColCell = view.container.querySelector(
      'td[data-row="1"][data-col="0"][data-cell-frozen]',
    ) as HTMLElement | null;
    const scrollableCell = view.container.querySelector(
      'td[data-row="2"][data-col="2"]',
    ) as HTMLElement | null;

    expect(frozenRowCell).not.toBeNull();
    expect(frozenColCell).not.toBeNull();
    expect(scrollableCell).not.toBeNull();

    expect(frozenRowCell?.style.position).toBe('sticky');
    expect(frozenColCell?.style.position).toBe('sticky');
    expect(scrollableCell?.style.position).not.toBe('sticky');
  });

  it('does not mark cells frozen when no frozen pane is configured', async () => {
    const { view } = await renderFrozenGrid({});

    const frozenCell = view.container.querySelector('td[data-cell-frozen]');
    expect(frozenCell).toBeNull();
  });
});
