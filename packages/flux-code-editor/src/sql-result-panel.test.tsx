// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SQLResultPanel } from './sql-result-panel';
import type { SQLResultState } from './sql-result-panel';

afterEach(() => {
  cleanup();
});

describe('SQLResultPanel', () => {
  it('renders nothing for idle state', () => {
    const result: SQLResultState = { status: 'idle' };
    const { container } = render(<SQLResultPanel result={result} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Executing..." for loading state', () => {
    const result: SQLResultState = { status: 'loading' };
    render(<SQLResultPanel result={result} />);
    const text = screen.getByText('Executing...');
    expect(text).toBeDefined();
    expect(text.classList.contains('nop-code-editor__result-loading')).toBe(true);
  });

  it('renders table with correct headers and rows for success state', () => {
    const result: SQLResultState = {
      status: 'success',
      data: [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 }
      ],
      columns: ['id', 'name', 'age']
    };
    render(<SQLResultPanel result={result} />);

    const table = screen.getByRole('table');
    expect(table).toBeDefined();
    expect(screen.getByText('id')).toBeDefined();
    expect(screen.getByText('name')).toBeDefined();
    expect(screen.getByText('age')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('30')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('25')).toBeDefined();
  });

  it('auto-detects columns from data when columns not provided', () => {
    const result: SQLResultState = {
      status: 'success',
      data: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]
    };
    render(<SQLResultPanel result={result} />);

    expect(screen.getByText('id')).toBeDefined();
    expect(screen.getByText('name')).toBeDefined();
  });

  it('uses provided columns when given', () => {
    const result: SQLResultState = {
      status: 'success',
      data: [
        { id: 1, name: 'Alice', age: 30, extra: 'ignore' },
        { id: 2, name: 'Bob', age: 25, extra: 'ignore' }
      ],
      columns: ['id', 'name']
    };
    render(<SQLResultPanel result={result} />);

    expect(screen.getByText('id')).toBeDefined();
    expect(screen.getByText('name')).toBeDefined();
    expect(screen.queryByText('age')).toBeNull();
    expect(screen.queryByText('extra')).toBeNull();
    expect(screen.queryByText('30')).toBeNull();
    expect(screen.queryByText('ignore')).toBeNull();
  });

  it('shows error message for error state', () => {
    const result: SQLResultState = {
      status: 'error',
      message: 'Syntax error near SELECT'
    };
    render(<SQLResultPanel result={result} />);

    expect(screen.getByText('Error')).toBeDefined();
    expect(screen.getByText('Syntax error near SELECT')).toBeDefined();
    expect(screen.getByText('Error').closest('.nop-code-editor__result-error')).toBeTruthy();
  });

  it('close button calls onClose callback', () => {
    const onClose = vi.fn();
    const result: SQLResultState = {
      status: 'error',
      message: 'Test error'
    };
    render(<SQLResultPanel result={result} onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    closeButton.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close button triggers on Enter key', () => {
    const onClose = vi.fn();
    const result: SQLResultState = {
      status: 'error',
      message: 'Test error'
    };
    render(<SQLResultPanel result={result} onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.keyDown(closeButton, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close button triggers on Space key', () => {
    const onClose = vi.fn();
    const result: SQLResultState = {
      status: 'error',
      message: 'Test error'
    };
    render(<SQLResultPanel result={result} onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.keyDown(closeButton, { key: ' ' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows row count in header for success state', () => {
    const result: SQLResultState = {
      status: 'success',
      data: [
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]
    };
    render(<SQLResultPanel result={result} />);

    expect(screen.getByText('Result (3 rows)')).toBeDefined();
  });

  it('renders empty table when data is empty', () => {
    const result: SQLResultState = {
      status: 'success',
      data: []
    };
    render(<SQLResultPanel result={result} />);

    expect(screen.getByText('Result (0 rows)')).toBeDefined();
    expect(screen.getByRole('table')).toBeDefined();
  });
});
