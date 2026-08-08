import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, fireEvent, screen, waitFor } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge } from '../index.js';
import { DefaultSpreadsheetPageBody } from '../default-page-body.js';

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('Escape closes find/replace panel from within its inputs', () => {
  it('closes the find panel when Escape is pressed while the find input has focus', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const doc = createEmptyDocument('escape-find-panel');
    const core = createSpreadsheetCore({ document: doc });
    const bridge = createSpreadsheetBridge(core);
    const snapshot = bridge.getSnapshot();

    render(
      <DefaultSpreadsheetPageBody
        bridge={bridge}
        snapshot={snapshot}
        showToolbar={true}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Find.*Replace/ })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Find.*Replace/ }));
    const findInput = await screen.findByPlaceholderText(/Search/);
    expect(findInput).toBeTruthy();

    findInput.focus();
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(document.querySelector('[data-slot="spreadsheet-find-replace-panel"]')).toBeNull();
    });
  });

  it('reopens the find panel with Ctrl+F after Escape closed it', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const doc = createEmptyDocument('escape-find-reopen');
    const core = createSpreadsheetCore({ document: doc });
    const bridge = createSpreadsheetBridge(core);
    const snapshot = bridge.getSnapshot();

    render(
      <DefaultSpreadsheetPageBody
        bridge={bridge}
        snapshot={snapshot}
        showToolbar={true}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Find.*Replace/ })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Find.*Replace/ }));
    const findInput = await screen.findByPlaceholderText(/Search/);
    expect(findInput).toBeTruthy();

    findInput.focus();
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(document.querySelector('[data-slot="spreadsheet-find-replace-panel"]')).toBeNull();
    });

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

    await waitFor(() => {
      expect(document.querySelector('[data-slot="spreadsheet-find-replace-panel"]')).not.toBeNull();
    });
  });
});
