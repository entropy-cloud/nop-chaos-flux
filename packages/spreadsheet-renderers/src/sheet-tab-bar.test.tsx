import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { SheetTabBar } from './sheet-tab-bar.js';

async function setupI18n() {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
}

afterEach(() => {
  resetFluxI18n();
});

describe('SheetTabBar', () => {
  it('keeps the remove action outside the sheet tab button', async () => {
    await setupI18n();
    const onSwitchSheet = vi.fn();
    const onRemoveSheet = vi.fn();

    render(
      <SheetTabBar
        sheets={[
          { id: 'sheet-1', name: 'Summary', hidden: false },
          { id: 'sheet-2', name: 'Details', hidden: false },
        ] as any}
        activeSheetId="sheet-1"
        onSwitchSheet={onSwitchSheet}
        onAddSheet={vi.fn()}
        onRemoveSheet={onRemoveSheet}
        canRemoveSheet
      />,
    );

    const tabButton = screen.getAllByRole('button', { name: 'Summary' })[0];
    const removeButton = screen.getByRole('button', { name: 'Remove sheet Summary' });

    expect(tabButton.querySelector('button')).toBeNull();
    expect(removeButton.closest('[data-slot="spreadsheet-sheet-tab"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add sheet' }).dataset.slot).toBe('spreadsheet-sheet-add');

    fireEvent.click(removeButton);

    expect(onSwitchSheet).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Delete Sheet' })).toBeTruthy();
    expect(onRemoveSheet).not.toHaveBeenCalled();
  });

  it('disables sheet mutations when readOnly is true', async () => {
    await setupI18n();
    render(
      <SheetTabBar
        sheets={[
          { id: 'sheet-1', name: 'Summary', hidden: false },
          { id: 'sheet-2', name: 'Details', hidden: false },
        ] as any}
        activeSheetId="sheet-1"
        onSwitchSheet={vi.fn()}
        onAddSheet={vi.fn()}
        onRemoveSheet={vi.fn()}
        onRenameSheet={vi.fn()}
        canRemoveSheet
        readOnly
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Summary' })[0]?.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Add sheet' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Remove sheet Summary' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('supports keyboard rename entry with F2 and labels the rename input', async () => {
    await setupI18n();
    const onRenameSheet = vi.fn();

    const rendered = render(
      <SheetTabBar
        sheets={[
          { id: 'sheet-1', name: 'Summary', hidden: false },
          { id: 'sheet-2', name: 'Details', hidden: false },
        ] as any}
        activeSheetId="sheet-1"
        onSwitchSheet={vi.fn()}
        onAddSheet={vi.fn()}
        onRenameSheet={onRenameSheet}
      />,
    );

    const tabButton = within(rendered.container).getByRole('button', { name: 'Summary' });
    fireEvent.keyDown(tabButton, { key: 'F2' });

    const renameInput = screen.getByRole('textbox', { name: 'Rename sheet Summary' });
    expect(renameInput.dataset.slot).toBe('spreadsheet-sheet-tab-rename');
    fireEvent.change(renameInput, { target: { value: 'Overview' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });

    expect(onRenameSheet).toHaveBeenCalledWith('sheet-1', 'Overview');
  });
});
