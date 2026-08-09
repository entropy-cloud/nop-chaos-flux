import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createFixedColumnLayout } from '../table-renderer/fixed-columns.js';
import {
  measureColumnWidthsFromTable,
  useTableColumnWidths,
} from '../table-renderer/column-width-measure.js';
import type { TableColumnSchema, TableSchema } from '../schemas.js';

afterEach(cleanup);

function fakeCell(key: string | undefined, width: number) {
  return {
    dataset: { columnWidthKey: key } as DOMStringMap,
    getBoundingClientRect: () => ({ width, height: 0, top: 0, left: 0 }),
  };
}

const emptySchema = { rowSelection: undefined, expandable: undefined } as unknown as TableSchema;

describe('measureColumnWidthsFromTable (C1a Phase 4)', () => {
  it('collects measured widths keyed by data-column-width-key', () => {
    const table = {
      querySelectorAll: () => [
        fakeCell('name:0', 120.5),
        fakeCell('email:1', 183.6),
        fakeCell('__selection__', 40),
      ],
    };
    const { widths, missingKeys } = measureColumnWidthsFromTable(table);
    expect(widths.get('name:0')).toBe(121);
    expect(widths.get('email:1')).toBe(184);
    expect(widths.get('__selection__')).toBe(40);
    expect(missingKeys).toEqual([]);
  });

  it('skips zero-width cells and reports them as missing (fp-measure-layout)', () => {
    const table = {
      querySelectorAll: () => [
        fakeCell('name:0', 0),
        fakeCell('email:1', 120),
        fakeCell(undefined, 90),
      ],
    };
    const { widths, missingKeys } = measureColumnWidthsFromTable(table);
    expect(widths.has('name:0')).toBe(false);
    expect(widths.get('email:1')).toBe(120);
    expect(missingKeys).toEqual(['name:0']);
  });

  it('returns empty maps for null/undefined table (no-op container)', () => {
    for (const table of [null, undefined]) {
      const { widths, missingKeys } = measureColumnWidthsFromTable(table);
      expect(widths.size).toBe(0);
      expect(missingKeys).toEqual([]);
    }
  });
});

describe('createFixedColumnLayout measured width priority (C1a Phase 4)', () => {
  it('uses measured widths over declared widths for offsets and cell width', () => {
    const columns: TableColumnSchema[] = [
      { name: 'name', label: 'Name', fixed: 'left', width: 160 },
      { name: 'email', label: 'Email' },
      { name: 'actions', label: 'Actions', fixed: 'right' },
    ] as TableColumnSchema[];
    const measured = new Map<string, number>([
      ['name:0', 220],
      ['actions:2', 180],
    ]);
    const layout = createFixedColumnLayout(emptySchema, columns, false, measured);
    const nameCell = layout.getColumnCellProps(columns[0], 0);
    expect(nameCell.style?.left).toBe('0px');
    expect(nameCell.style?.width).toBe(220);
    const actionsCell = layout.getColumnCellProps(columns[2], 2);
    expect(actionsCell.style?.right).toBe('0px');
    expect(actionsCell.style?.width).toBe(180);
  });

  it('falls back to declared widths when a fixed column is not measured', () => {
    const columns: TableColumnSchema[] = [
      { name: 'name', label: 'Name', fixed: 'left', width: 160 },
      { name: 'email', label: 'Email' },
    ] as TableColumnSchema[];
    const measured = new Map<string, number>([['email:1', 300]]);
    const layout = createFixedColumnLayout(emptySchema, columns, false, measured);
    const cell = layout.getColumnCellProps(columns[0], 0);
    expect(cell.style?.width).toBe(160);
    expect(cell.style?.left).toBe('0px');
  });

  it('accumulates later left-fixed offsets from measured widths', () => {
    const columns: TableColumnSchema[] = [
      { name: 'a', label: 'A', fixed: 'left', width: 100 },
      { name: 'b', label: 'B', fixed: 'left', width: 100 },
      { name: 'c', label: 'C' },
    ] as TableColumnSchema[];
    const measured = new Map<string, number>([
      ['a:0', 140],
      ['b:1', 90],
    ]);
    const layout = createFixedColumnLayout(emptySchema, columns, false, measured);
    const a = layout.getColumnCellProps(columns[0], 0);
    const b = layout.getColumnCellProps(columns[1], 1);
    expect(a.style?.left).toBe('0px');
    expect(a.style?.width).toBe(140);
    expect(b.style?.left).toBe('140px');
    expect(b.style?.width).toBe(90);
  });
});

describe('useTableColumnWidths dev warning (plan 2026-08-09-1140-1)', () => {
  function Probe({ children }: { children: React.ReactNode }) {
    const ref = React.useRef<HTMLDivElement | null>(null);
    useTableColumnWidths(ref, []);
    return <div ref={ref}>{children}</div>;
  }

  function PartialProbe({ digest }: { digest: number }) {
    const ref = React.useRef<HTMLDivElement | null>(null);
    useTableColumnWidths(ref, [digest]);
    return (
      <div ref={ref}>
        <table>
          <thead>
            <tr>
              <th data-column-width-key="a:0">A</th>
              <th data-column-width-key="b:1">B</th>
            </tr>
          </thead>
        </table>
      </div>
    );
  }

  it('does NOT warn when every cell fails to measure (jsdom / hidden first frame — digest self-heals)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Probe>
        <table>
          <thead>
            <tr>
              <th data-column-width-key="a:0">A</th>
              <th data-column-width-key="b:1">B</th>
            </tr>
          </thead>
        </table>
      </Probe>,
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns when only part of the cells measured (partial failure is a real layout anomaly)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = render(<PartialProbe digest={0} />);

    const firstCell = document.querySelector('[data-column-width-key="a:0"]')!;
    vi.spyOn(firstCell, 'getBoundingClientRect').mockReturnValue({
      width: 120,
      height: 20,
      top: 0,
      left: 0,
      right: 120,
      bottom: 20,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    rerender(<PartialProbe digest={1} />);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});