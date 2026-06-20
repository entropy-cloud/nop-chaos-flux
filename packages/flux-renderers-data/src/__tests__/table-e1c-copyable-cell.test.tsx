import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, fireEvent, act, waitFor } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import { renderDataRow, type FlattenedRow } from '../table-renderer/table-body-row-rendering.js';
import { copyToClipboard } from '../table-renderer/copy-to-clipboard.js';
import type { TableRowEntry } from '../table-renderer/types.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';

afterEach(cleanup);

const noopFixedLayout: FixedColumnLayout = {
  hasStickyColumns: false,
  getExpandCellProps: () => ({ className: '', style: {} }),
  getSelectionCellProps: () => ({ className: '', style: {} }),
  getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
} as unknown as FixedColumnLayout;

function makeParentProps(overrides: Record<string, unknown> = {}) {
  return {
    props: { expandable: {}, rowSelection: undefined },
    helpers: {
      render: vi.fn(() => null),
      evaluate: vi.fn((value: unknown) => value),
    },
    regions: {},
    events: {},
    node: {
      instancePath: [{ repeatedTemplateId: 'page', instanceKey: 'root' }],
      scope: { id: 'table-scope', get: () => undefined },
    },
    meta: {},
    ...overrides,
  } as any;
}

function makeRowScope(record: Record<string, unknown>, index: number): ScopeRef {
  return {
    id: `scope-${index}`,
    path: `$rows.${index}`,
    value: { record, index },
    get(path: string) {
      if (path === 'record') return record;
      if (path === 'index') return index;
      return undefined;
    },
    has: () => false,
    readOwn: () => ({ record, index }),
    readVisible: () => ({ record, index }),
    materializeVisible: () => ({ record, index }),
    update: vi.fn(),
    merge() {},
  };
}

function buildRow(record: Record<string, unknown>, index: number, rowKey: string): FlattenedRow {
  const entry: TableRowEntry = {
    rowKey,
    cacheKey: rowKey,
    sourceIndex: index,
    record,
  };
  return {
    kind: 'data',
    entry,
    rowScope: makeRowScope(record, index),
    rowKey,
    rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: rowKey }],
    isExpanded: false,
    isSelected: false,
    isEven: index % 2 === 0,
  };
}

describe('copyToClipboard helper', () => {
  let originalClipboard: typeof navigator.clipboard | undefined;
  let originalExecCommand: typeof document.execCommand;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    document.execCommand = originalExecCommand;
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const result = await copyToClipboard('hello');
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result).toEqual({ success: true, method: 'clipboard-api' });
  });

  it('falls back to execCommand when clipboard API rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    const result = await copyToClipboard('hello');
    expect(result).toEqual({ success: true, method: 'exec-command' });
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns failure when both clipboard API and execCommand fail (Failure Path e1c-copy-clipboard-denied)', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(false);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await copyToClipboard('hello');
    expect(result.success).toBe(false);
    expect(result.method).toBe('none');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('falls back when navigator.clipboard is missing entirely', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await copyToClipboard('hello');
    expect(result).toEqual({ success: true, method: 'exec-command' });
  });
});

describe('renderDataRow copyable cell', () => {
  it('renders copy button when column.copyable is true', () => {
    const columns: TableColumnSchema[] = [
      { type: 'column', name: 'name', copyable: true },
    ] as TableColumnSchema[];
    const parentProps = makeParentProps();

    render(
      <table>
        <tbody>
          {renderDataRow(
            buildRow({ name: 'alice' }, 0, '1'),
            { type: 'table' } as TableSchema,
            columns,
            parentProps.helpers,
            parentProps,
            noopFixedLayout,
            false,
            false,
            () => {},
            () => {},
            false,
          )}
        </tbody>
      </table>,
    );

    const button = document.querySelector('[data-slot="table-cell-copy-button"]');
    expect(button).toBeTruthy();
  });

  it('does not render copy button when column.copyable not declared (baseline)', () => {
    const columns: TableColumnSchema[] = [{ type: 'column', name: 'name' }] as TableColumnSchema[];
    const parentProps = makeParentProps();

    render(
      <table>
        <tbody>
          {renderDataRow(
            buildRow({ name: 'alice' }, 0, '1'),
            { type: 'table' } as TableSchema,
            columns,
            parentProps.helpers,
            parentProps,
            noopFixedLayout,
            false,
            false,
            () => {},
            () => {},
            false,
          )}
        </tbody>
      </table>,
    );

    expect(document.querySelector('[data-slot="table-cell-copy-button"]')).toBeNull();
  });

  it('clicks copy button calls navigator.clipboard.writeText with cell value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const columns: TableColumnSchema[] = [
      { type: 'column', name: 'name', copyable: true },
    ] as TableColumnSchema[];
    const parentProps = makeParentProps();

    render(
      <table>
        <tbody>
          {renderDataRow(
            buildRow({ name: 'alice@example.com' }, 0, '1'),
            { type: 'table' } as TableSchema,
            columns,
            parentProps.helpers,
            parentProps,
            noopFixedLayout,
            false,
            false,
            () => {},
            () => {},
            false,
          )}
        </tbody>
      </table>,
    );

    const button = document.querySelector('[data-slot="table-cell-copy-button"]') as HTMLElement;
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('alice@example.com');
    });
  });
});
