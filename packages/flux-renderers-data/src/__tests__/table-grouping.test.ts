import { describe, expect, it } from 'vitest';
import type { TableRowEntry } from '../table-renderer/types.js';
import {
  buildGroupedDisplayItems,
  buildTableGroups,
  computeGroupAggregate,
  resolveTableGroupConfig,
} from '../table-renderer/table-grouping.js';

function entries(records: Array<Record<string, unknown>>): TableRowEntry[] {
  return records.map((record, sourceIndex) => ({
    rowKey: String(record.id ?? sourceIndex),
    cacheKey: String(record.id ?? sourceIndex),
    sourceIndex,
    record,
  }));
}

describe('resolveTableGroupConfig', () => {
  it('resolves a valid group config with defaults', () => {
    expect(resolveTableGroupConfig({ field: 'category' })).toEqual({
      field: 'category',
      aggregates: [],
      missingLabel: '-',
    });
  });

  it('keeps declared aggregates and missingLabel', () => {
    expect(
      resolveTableGroupConfig({
        field: 'category',
        missingLabel: 'N/A',
        aggregates: [{ fn: 'sum', field: 'amount', label: 'SUM' }],
      }),
    ).toEqual({
      field: 'category',
      aggregates: [{ fn: 'sum', field: 'amount', label: 'SUM' }],
      missingLabel: 'N/A',
    });
  });

  it('returns undefined for missing field / non-object / null / array forms', () => {
    expect(resolveTableGroupConfig(undefined)).toBeUndefined();
    expect(resolveTableGroupConfig(null)).toBeUndefined();
    expect(resolveTableGroupConfig({})).toBeUndefined();
    expect(resolveTableGroupConfig({ field: '' })).toBeUndefined();
    expect(resolveTableGroupConfig({ field: 42 })).toBeUndefined();
    expect(resolveTableGroupConfig('category')).toBeUndefined();
    expect(resolveTableGroupConfig(['category'])).toBeUndefined();
  });
});

describe('computeGroupAggregate', () => {
  const rows = entries([
    { id: '1', amount: 10 },
    { id: '2', amount: 20 },
    { id: '3', amount: 'bad' },
    { id: '4' },
  ]);

  it('count ignores the field and equals the member count', () => {
    expect(computeGroupAggregate('count', undefined, rows)).toEqual({
      fn: 'count',
      label: 'count',
      value: 4,
      valid: true,
    });
  });

  it('sum skips missing/non-numeric values', () => {
    expect(computeGroupAggregate('sum', 'amount', rows)).toMatchObject({
      fn: 'sum',
      value: 30,
      valid: true,
    });
  });

  it('avg averages only valid values', () => {
    expect(computeGroupAggregate('avg', 'amount', rows)).toMatchObject({
      value: 15,
      valid: true,
    });
  });

  it('min and max pick the extremes of valid values', () => {
    expect(computeGroupAggregate('min', 'amount', rows)).toMatchObject({ value: 10 });
    expect(computeGroupAggregate('max', 'amount', rows)).toMatchObject({ value: 20 });
  });

  it('falls back to "-" with valid=false when no value is numeric', () => {
    const empty = entries([{ id: '1', amount: 'nope' }]);
    const result = computeGroupAggregate('sum', 'amount', empty);
    expect(result.value).toBe('-');
    expect(result.valid).toBe(false);
  });

  it('honors the declared label', () => {
    expect(computeGroupAggregate('sum', 'amount', rows, '合计').label).toBe('合计');
  });
});

describe('buildTableGroups', () => {
  it('groups rows by first-appearance order and computes aggregates per group', () => {
    const groups = buildTableGroups(
      entries([
        { id: '1', category: 'A', amount: 10 },
        { id: '2', category: 'B', amount: 5 },
        { id: '3', category: 'A', amount: 15 },
      ]),
      resolveTableGroupConfig({ field: 'category', aggregates: [{ fn: 'sum', field: 'amount' }] })!,
    );

    expect(groups.map((group) => group.label)).toEqual(['A', 'B']);
    expect(groups[0]).toMatchObject({ key: 'A', count: 2, missing: false });
    expect(groups[0].aggregates[0]).toMatchObject({ fn: 'sum', value: 25, valid: true });
    expect(groups[1].count).toBe(1);
  });

  it('routes missing/null/empty field values into the fallback group (gd-group-missing-field)', () => {
    const groups = buildTableGroups(
      entries([
        { id: '1', category: 'A' },
        { id: '2' },
        { id: '3', category: null },
        { id: '4', category: '' },
      ]),
      resolveTableGroupConfig({ field: 'category', missingLabel: 'N/A' })!,
    );

    expect(groups).toHaveLength(2);
    expect(groups[1]).toMatchObject({ key: '__missing__', label: 'N/A', count: 3, missing: true });
  });

  it('keeps falsy-but-valid group values (0 / false) out of the fallback group', () => {
    const groups = buildTableGroups(
      entries([
        { id: '1', flag: false },
        { id: '2', flag: 0 },
        { id: '3', flag: true },
      ]),
      resolveTableGroupConfig({ field: 'flag' })!,
    );

    expect(groups.map((group) => group.label)).toEqual(['false', '0', 'true']);
    expect(groups.every((group) => !group.missing)).toBe(true);
  });

  it('returns an empty list for empty rows', () => {
    expect(buildTableGroups([], resolveTableGroupConfig({ field: 'category' })!)).toEqual([]);
  });
});

describe('buildGroupedDisplayItems', () => {
  const groups = buildTableGroups(
    entries([
      { id: '1', category: 'A' },
      { id: '2', category: 'A' },
      { id: '3', category: 'B' },
    ]),
    resolveTableGroupConfig({ field: 'category' })!,
  );

  it('interleaves group headers with member rows when nothing is collapsed', () => {
    const items = buildGroupedDisplayItems(groups, new Set());
    expect(items.map((item) => item.kind)).toEqual(['group', 'row', 'row', 'group', 'row']);
    expect(items[0]).toMatchObject({
      kind: 'group',
      group: expect.objectContaining({ key: 'A' }),
      collapsed: false,
    });
  });

  it('hides member rows of collapsed groups while keeping the header', () => {
    const items = buildGroupedDisplayItems(groups, new Set(['A']));
    expect(items.map((item) => item.kind)).toEqual(['group', 'group', 'row']);
    expect(items[0]).toMatchObject({ kind: 'group', collapsed: true });
  });
});
