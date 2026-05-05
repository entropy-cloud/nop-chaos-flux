// @vitest-environment jsdom

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
    render(<SpreadsheetToolbar {...createProps({ frozen: true })} />);

    expect(screen.getByText('A1')).toBeTruthy();
    expect(screen.getByText('Frozen')).toBeTruthy();
  });

  it('renders find and replace controls when enabled', async () => {
    await setupI18n();
    render(
      <SpreadsheetToolbar
        {...createProps({ showFindReplace: true, findQuery: 'foo', replaceText: 'bar' })}
      />,
    );

    expect(screen.getByDisplayValue('foo')).toBeTruthy();
    expect(screen.getByDisplayValue('bar')).toBeTruthy();
    expect(screen.getByText('Find Next')).toBeTruthy();
    expect(screen.getByText('Replace All')).toBeTruthy();
  });

  it('renders cell and comment editors when a cell and comment input are active', async () => {
    await setupI18n();
    render(
      <SpreadsheetToolbar
        {...createProps({ showCommentInput: true, commentText: 'note', hasComment: true })}
      />,
    );

    expect(screen.getAllByDisplayValue('hello').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('note')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('keeps style and auxiliary actions wired through the shell', async () => {
    await setupI18n();
    const props = createProps();
    const { container } = render(<SpreadsheetToolbar {...props} />);

    const boldButton = container.querySelector('svg.lucide-bold')?.closest('[data-slot="button"]');
    const searchButton = container
      .querySelector('svg.lucide-search')
      ?.closest('[data-slot="button"]');

    expect(boldButton).toBeTruthy();
    expect(searchButton).toBeTruthy();

    fireEvent.click(boldButton as Element);
    fireEvent.click(searchButton as Element);

    expect(props.onStyleTool).toHaveBeenCalled();
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
});
