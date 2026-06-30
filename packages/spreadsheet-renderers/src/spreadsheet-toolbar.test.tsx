import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { SpreadsheetToolbar, type SpreadsheetToolbarProps } from './spreadsheet-toolbar.js';

async function setupI18n() {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
}

function createProps(overrides?: Partial<SpreadsheetToolbarProps>): SpreadsheetToolbarProps {
  return {
    selectedCell: { row: 0, col: 0 },
    cellAddress: 'A1',
    cellValue: 'hello',
    frozen: false,
    hasSelection: true,
    currentCellStyle: {
      fontWeight: 'bold',
      textAlign: 'center',
    },
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onPaste: vi.fn(),
    onClear: vi.fn(),
    onStyleTool: vi.fn(),
    onMerge: vi.fn(),
    onUnmerge: vi.fn(),
    onMergeCenter: vi.fn(),
    onFillDown: vi.fn(),
    onFillSeries: vi.fn(),
    onInsertRow: vi.fn(),
    onDeleteRow: vi.fn(),
    onInsertColumn: vi.fn(),
    onDeleteColumn: vi.fn(),
    onFreeze: vi.fn(),
    onUnfreeze: vi.fn(),
    onCellValueChange: vi.fn(),
    showFindReplace: false,
    onToggleFindReplace: vi.fn(),
    findQuery: '',
    onFindQueryChange: vi.fn(),
    replaceText: '',
    onReplaceTextChange: vi.fn(),
    findResults: '',
    onFind: vi.fn(),
    onReplace: vi.fn(),
    onReplaceAll: vi.fn(),
    showCommentInput: false,
    onToggleCommentInput: vi.fn(),
    commentText: '',
    onCommentTextChange: vi.fn(),
    onAddComment: vi.fn(),
    onDeleteComment: vi.fn(),
    hasComment: false,
    ...overrides,
  };
}

describe('SpreadsheetToolbar', () => {
  it('renders toolbar groups and status through the split shell', async () => {
    await setupI18n();
    const { container } = render(<SpreadsheetToolbar {...createProps({ frozen: true })} />);

    expect(container.querySelector('[data-slot="spreadsheet-toolbar-cell-address"]')?.textContent).toBe('A1');
    expect(screen.getByText('Frozen')).toBeTruthy();
    expect(container.querySelector('[data-slot="spreadsheet-toolbar"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="spreadsheet-toolbar-group"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="spreadsheet-toolbar-status"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="spreadsheet-toolbar-frozen-badge"]')?.textContent).toBe(
      'Frozen',
    );
  });

  it('renders find and replace controls when enabled', async () => {
    await setupI18n();
    const { container } = render(
      <SpreadsheetToolbar
        {...createProps({ showFindReplace: true, findQuery: 'foo', replaceText: 'bar' })}
      />,
    );

    expect(screen.getByDisplayValue('foo')).toBeTruthy();
    expect(screen.getByDisplayValue('bar')).toBeTruthy();
    expect(screen.getByText('Find Next')).toBeTruthy();
    expect(screen.getByText('Replace All')).toBeTruthy();
    expect(container.querySelector('[data-slot="spreadsheet-find-replace-panel"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="spreadsheet-find-row"]')).toHaveLength(2);
    expect(container.querySelector('[data-slot="spreadsheet-find-input"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="spreadsheet-replace-input"]')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search text...')).toBeTruthy();
    expect(screen.getByPlaceholderText('Replace with...')).toBeTruthy();
  });

  it('does not render a toolbar cell value editor even when comment input is active', async () => {
    await setupI18n();
    const { container } = render(
      <SpreadsheetToolbar
        {...createProps({ showCommentInput: true, commentText: 'note', hasComment: true })}
      />,
    );

    expect(container.querySelector('[data-slot="spreadsheet-cell-editor"]')).toBeNull();
    expect(container.querySelector('[data-slot="spreadsheet-cell-value-input"]')).toBeNull();
  });

  it('keeps style and auxiliary actions wired through the shell', async () => {
    await setupI18n();
    const props = createProps();
    const { container } = render(<SpreadsheetToolbar {...props} />);

    const boldButton = within(container).getByRole('button', { name: 'Bold Ctrl+B' });
    const searchButton = within(container).getByRole('button', { name: 'Find & Replace Ctrl+F' });

    expect(boldButton).toBeTruthy();
    expect(searchButton).toBeTruthy();

    fireEvent.click(boldButton);
    fireEvent.click(searchButton);

    expect(props.onStyleTool).toHaveBeenCalledWith('bold');
    expect(props.onToggleFindReplace).toHaveBeenCalled();
  });

  it('exposes translated accessible labels on icon toolbar buttons', async () => {
    await setupI18n();
    render(<SpreadsheetToolbar {...createProps()} />);

    expect(screen.getAllByRole('button', { name: 'Bold Ctrl+B' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Find & Replace Ctrl+F' }).length).toBeGreaterThan(
      0,
    );
  });

  it('publishes pressed state for active style and alignment buttons', async () => {
    await setupI18n();
    render(<SpreadsheetToolbar {...createProps()} />);

    const boldButton = screen.getAllByRole('button', { name: 'Bold Ctrl+B' })[0];
    const italicButton = screen.getAllByRole('button', { name: 'Italic Ctrl+I' })[0];
    const alignCenterButton = screen.getAllByRole('button', { name: 'Align Center' })[0];
    const alignLeftButton = screen.getAllByRole('button', { name: 'Align Left' })[0];

    expect(boldButton.getAttribute('aria-pressed')).toBe('true');
    expect(italicButton.getAttribute('aria-pressed')).toBe('false');
    expect(alignCenterButton.getAttribute('aria-pressed')).toBe('true');
    expect(alignLeftButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('disables mutation controls in readOnly mode while keeping find available', async () => {
    await setupI18n();
    render(<SpreadsheetToolbar {...createProps({ readOnly: true })} />);

    const undoButtons = screen.getAllByRole('button', { name: 'Undo Ctrl+Z' });
    const cutButtons = screen.getAllByRole('button', { name: 'Cut Ctrl+X' });
    const findButtons = screen.getAllByRole('button', { name: 'Find & Replace Ctrl+F' });

    expect(undoButtons.some((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(cutButtons.some((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(findButtons.some((button) => !button.hasAttribute('disabled'))).toBe(true);
  });
});
