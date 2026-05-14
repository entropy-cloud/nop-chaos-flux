// @vitest-environment happy-dom

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SheetTabBar } from './sheet-tab-bar.js';

describe('SheetTabBar', () => {
  it('keeps the remove action outside the sheet tab button', () => {
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

    const tabButton = screen.getByRole('button', { name: 'Summary' });
    const removeButton = screen.getByRole('button', { name: 'Remove sheet Summary' });

    expect(tabButton.querySelector('button')).toBeNull();
    expect(removeButton.closest('.ss-sheet-tab')).toBeNull();

    fireEvent.click(removeButton);

    expect(onSwitchSheet).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '删除工作表' })).toBeTruthy();
    expect(onRemoveSheet).not.toHaveBeenCalled();
  });

  it('disables sheet mutations when readOnly is true', () => {
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

    expect(screen.getByRole('button', { name: 'Summary' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Add sheet' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Remove sheet Summary' }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});
