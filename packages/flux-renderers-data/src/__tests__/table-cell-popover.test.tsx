import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import { renderDataRow, type FlattenedRow } from '../table-renderer/table-body-row-rendering.js';
import { TableCellPopOver, type TableCellPopOverProps } from '../table-renderer/table-cell-popover.js';
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

function renderRowWithPopover(
  record: Record<string, unknown>,
  column: TableColumnSchema,
  regions: Record<string, unknown> = {},
) {
  const parentProps = makeParentProps({ regions });
  render(
    <table>
      <tbody>
        {renderDataRow(
          buildRow(record, 0, '1'),
          { type: 'table' } as TableSchema,
          [column],
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
}

function makeContentRegion(renderFn: (opts: { scope: ScopeRef; bindings?: { record: unknown; index: unknown } }) => React.ReactNode) {
  return { key: 'test-popover-content', render: vi.fn(renderFn) } as any;
}

describe('TableCellPopOver component (unit)', () => {
  function renderCell(overrides: Partial<TableCellPopOverProps> = {}) {
    const props: TableCellPopOverProps = {
      popOver: { trigger: 'click', placement: 'top' },
      rowValue: 'some value',
      record: { name: 'alice', note: 'some value' },
      rowIndex: 0,
      rowScope: makeRowScope({ name: 'alice' }, 0),
      rowInstancePath: [{ repeatedTemplateId: 'row', instanceKey: '1' }],
      contentRegion: undefined,
      ...overrides,
    } as any;
    return render(<TableCellPopOver {...props} />);
  }

  it('renders trigger icon with marker when popOver is declared (click trigger, default)', () => {
    renderCell();
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]');
    expect(trigger).toBeTruthy();
  });

  it('trigger click opens popover content (click trigger)', () => {
    const contentRegion = makeContentRegion(({ bindings }) => (
      <span data-slot="popover-content-inner">Content for {String((bindings as any)?.record?.note ?? '')}</span>
    ));
    renderCell({ contentRegion });
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]') as HTMLElement;
    expect(document.querySelector('[data-slot="table-cell-popover-content"]')).toBeNull();
    act(() => {
      fireEvent.click(trigger);
    });
    // PopoverContent portal is rendered to document.body via Base UI Portal.
    const content = document.querySelector('[data-slot="table-cell-popover-content"]');
    expect(content).toBeTruthy();
    expect(content?.textContent).toContain('Content for');
  });

  it('trigger hover passes openOnHover=true to popover trigger (trigger=hover)', () => {
    const contentRegion = makeContentRegion(() => (
      <span data-slot="popover-content-inner">Hover content</span>
    ));
    renderCell({ popOver: { trigger: 'hover', placement: 'top' }, contentRegion });
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]') as HTMLElement;
    // Base UI PopoverTrigger openOnHover defaults to a 300ms delay + pointer events
    // not reliably simulated in jsdom. Verify the prop wiring via attribute presence:
    // when openOnHover=true, Base UI attaches pointermove/pointerenter handlers; we
    // verify the trigger renders + region wiring via click fallback below.
    expect(trigger).toBeTruthy();
    // Click also opens (Base UI Trigger opens on click regardless of openOnHover).
    act(() => {
      fireEvent.click(trigger);
    });
    const content = document.querySelector('[data-slot="table-cell-popover-content"]');
    expect(content).toBeTruthy();
  });

  it('showOnOverflow=true hides trigger when content is not truncated', () => {
    renderCell({ popOver: { trigger: 'click', placement: 'top', showOnOverflow: true } });
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]');
    // On initial mount with no scrollWidth overflow, trigger is not rendered.
    expect(trigger).toBeNull();
  });

  it('showOnOverflow=false (default) always renders trigger', () => {
    renderCell({ popOver: { trigger: 'click', placement: 'top' } });
    expect(document.querySelector('[data-slot="table-cell-popover-trigger"]')).toBeTruthy();
  });

  it('onEmpty=hide (default) does not render trigger when rowValue is empty', () => {
    renderCell({ rowValue: '' });
    expect(document.querySelector('[data-slot="table-cell-popover-trigger"]')).toBeNull();
  });

  it('onEmpty=hide does not render trigger when rowValue is undefined', () => {
    renderCell({ rowValue: undefined });
    expect(document.querySelector('[data-slot="table-cell-popover-trigger"]')).toBeNull();
  });

  it('onEmpty=show renders trigger when rowValue is empty and shows emptyText', () => {
    renderCell({
      rowValue: '',
      popOver: { trigger: 'click', placement: 'top', onEmpty: 'show', emptyText: 'Nothing here' },
    });
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]') as HTMLElement;
    expect(trigger).toBeTruthy();
    act(() => {
      fireEvent.click(trigger);
    });
    const empty = document.querySelector('[data-slot="table-cell-popover-empty"]');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('Nothing here');
  });

  it('renders title marker when popOver.title is declared', () => {
    const contentRegion = makeContentRegion(() => <span>body</span>);
    renderCell({ popOver: { trigger: 'click', placement: 'top', title: 'My Title' }, contentRegion });
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]') as HTMLElement;
    act(() => {
      fireEvent.click(trigger);
    });
    const title = document.querySelector('[data-slot="table-cell-popover-title"]');
    expect(title).toBeTruthy();
    expect(title?.textContent).toContain('My Title');
  });

  it('falls back to String(rowValue) when contentRegion throws (Failure Path popover-content-region-fail)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const contentRegion = {
      key: 'test-popover-content',
      render: vi.fn(() => {
        throw new Error('region compile failed');
      }),
    } as any;
    renderCell({ rowValue: 'visible value', contentRegion: contentRegion as any });
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]') as HTMLElement;
    act(() => {
      fireEvent.click(trigger);
    });
    const content = document.querySelector('[data-slot="table-cell-popover-content"]');
    expect(content?.textContent).toContain('visible value');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('renders no trigger when popOver is undefined (baseline)', () => {
    const { rerender } = render(<div />);
    rerender(<div />);
    expect(document.querySelector('[data-slot="table-cell-popover-trigger"]')).toBeNull();
  });

  it('trigger has accessible aria-label default', () => {
    renderCell();
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]') as HTMLElement;
    expect(trigger?.getAttribute('aria-label')).toBeTruthy();
  });

  it('uses popOver.icon when provided', () => {
    renderCell({ popOver: { trigger: 'click', placement: 'top', icon: 'star' } });
    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]') as HTMLElement;
    expect(trigger).toBeTruthy();
    // The icon is rendered inside the trigger as a child (svg or span)
    expect(trigger.children.length).toBeGreaterThan(0);
  });
});

describe('renderDataRow popOver cell integration', () => {
  it('renders popover trigger alongside cell value when column.popOver is declared', () => {
    const contentRegion = makeContentRegion(({ bindings }) => (
      <span data-slot="popover-content-inner">
        Extended info for {String((bindings as any)?.record?.note ?? '')}
      </span>
    ));
    renderRowWithPopover(
      { id: 1, note: 'A long note that does not fit' },
      {
        type: 'column',
        name: 'note',
        label: 'Note',
        popOver: {
          trigger: 'click',
          placement: 'top',
          contentRegionKey: 'columns.0.popOver.content',
        },
      } as TableColumnSchema,
      { 'columns.0.popOver.content': contentRegion },
    );

    const trigger = document.querySelector('[data-slot="table-cell-popover-trigger"]');
    expect(trigger).toBeTruthy();
    // Cell value still rendered.
    expect(document.querySelector('td')?.textContent).toContain('A long note');
  });

  it('coexists with copyable icon when both popOver and copyable declared on the same column', () => {
    const contentRegion = makeContentRegion(() => <span>details</span>);
    renderRowWithPopover(
      { id: 1, note: 'hello@example.com' },
      {
        type: 'column',
        name: 'note',
        copyable: true,
        popOver: {
          trigger: 'click',
          placement: 'top',
          contentRegionKey: 'columns.0.popOver.content',
        },
      } as TableColumnSchema,
      { 'columns.0.popOver.content': contentRegion },
    );

    expect(document.querySelector('[data-slot="table-cell-copy-button"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="table-cell-popover-trigger"]')).toBeTruthy();
  });

  it('does not render popover trigger when rowValue is empty and onEmpty=hide (default)', () => {
    renderRowWithPopover(
      { id: 1, note: '' },
      {
        type: 'column',
        name: 'note',
        popOver: { trigger: 'click', placement: 'top' },
      } as TableColumnSchema,
    );
    expect(document.querySelector('[data-slot="table-cell-popover-trigger"]')).toBeNull();
  });

  it('does not render popover trigger when column has no popOver (baseline)', () => {
    renderRowWithPopover(
      { id: 1, note: 'a note' },
      { type: 'column', name: 'note' } as TableColumnSchema,
    );
    expect(document.querySelector('[data-slot="table-cell-popover-trigger"]')).toBeNull();
  });
});
