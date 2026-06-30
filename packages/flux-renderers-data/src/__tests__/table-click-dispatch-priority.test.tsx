import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import { renderDataRow, type FlattenedRow } from '../table-renderer/table-body-row-rendering.js';
import type { TableRowEntry } from '../table-renderer/types.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});
afterEach(cleanup);

const noopFixedLayout: FixedColumnLayout = {
  hasStickyColumns: false,
  getExpandCellProps: () => ({ className: '', style: {} }),
  getSelectionCellProps: () => ({ className: '', style: {} }),
  getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
} as unknown as FixedColumnLayout;

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
  const entry: TableRowEntry = { rowKey, cacheKey: rowKey, sourceIndex: index, record };
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

function makeParentProps(onRowClick: ReturnType<typeof vi.fn>) {
  return {
    props: { rowSelection: { type: 'checkbox' } },
    helpers: { render: vi.fn(() => null), evaluate: vi.fn((value: unknown) => value) },
    regions: {},
    events: { onRowClick },
    node: {
      instancePath: [{ repeatedTemplateId: 'page', instanceKey: 'root' }],
      scope: { id: 'table-scope', get: () => undefined },
    },
    meta: {},
  } as any;
}

function renderRow(columns: TableColumnSchema[], onRowClick: ReturnType<typeof vi.fn>) {
  const parentProps = makeParentProps(onRowClick);
  render(
    <table>
      <tbody>
        {renderDataRow(
          buildRow({ id: '1', name: 'Alice', note: 'detail' }, 0, '1'),
          { type: 'table', rowSelection: { type: 'checkbox' } } as TableSchema,
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
  return parentProps;
}

describe('table click-dispatch priority (B3.1 / T8)', () => {
  it('clicking the selection checkbox toggles selection and does NOT trigger onRowClick', () => {
    const onRowClick = vi.fn();
    renderRow([{ label: 'Name', name: 'name' }] as TableColumnSchema[], onRowClick);

    const checkbox = document.querySelector('[data-slot="checkbox"]') as HTMLElement;
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('clicking the copyable button does NOT trigger onRowClick', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const onRowClick = vi.fn();
    renderRow([{ label: 'Name', name: 'name', copyable: true }] as TableColumnSchema[], onRowClick);

    const copyButton = document.querySelector(
      '[data-slot="table-cell-copy-button"]',
    ) as HTMLElement;
    expect(copyButton).toBeTruthy();
    fireEvent.click(copyButton);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('clicking the popOver trigger does NOT trigger onRowClick', () => {
    const onRowClick = vi.fn();
    renderRow(
      [{ label: 'Name', name: 'name', popOver: { trigger: 'click', placement: 'top' } }] as TableColumnSchema[],
      onRowClick,
    );

    const trigger = document.querySelector(
      '[data-slot="table-cell-popover-trigger"]',
    ) as HTMLElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('clicking a plain data cell DOES trigger onRowClick', () => {
    const onRowClick = vi.fn();
    renderRow([{ label: 'Name', name: 'name' }] as TableColumnSchema[], onRowClick);

    fireEvent.click(document.querySelector('[data-slot="table-row"] td:nth-child(2)')!);
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });
});
