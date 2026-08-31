import { getIn } from '@nop-chaos/flux-core';
import type { TableGroupAggregateConfig, TableGroupConfig } from '../schemas.js';
import type { TableRowEntry } from './types.js';

export const MISSING_GROUP_KEY = '__missing__';

export interface ResolvedTableGroupConfig {
  field: string;
  aggregates: TableGroupAggregateConfig[];
  missingLabel: string;
}

export interface TableGroupAggregateValue {
  fn: TableGroupAggregateConfig['fn'];
  label: string;
  value: number | string;
  /** false → no valid numeric member (rendered as '-'); caller warns once. */
  valid: boolean;
}

export interface TableGroupModel {
  key: string;
  label: string;
  entries: TableRowEntry[];
  count: number;
  aggregates: TableGroupAggregateValue[];
  /** true → the fallback group for missing/null/empty field values. */
  missing: boolean;
}

export type GroupedDisplayItem =
  | { kind: 'group'; group: TableGroupModel; collapsed: boolean }
  | { kind: 'row'; entry: TableRowEntry; groupKey: string };

const AGGREGATE_FNS = new Set(['sum', 'avg', 'min', 'max', 'count']);

export function resolveTableGroupConfig(group: unknown): ResolvedTableGroupConfig | undefined {
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    return undefined;
  }

  const config = group as TableGroupConfig;
  if (typeof config.field !== 'string' || config.field.length === 0) {
    return undefined;
  }

  return {
    field: config.field,
    aggregates: Array.isArray(config.aggregates)
      ? config.aggregates.filter(
          (aggregate): aggregate is TableGroupAggregateConfig =>
            Boolean(aggregate) &&
            typeof aggregate === 'object' &&
            typeof (aggregate as TableGroupAggregateConfig).fn === 'string' &&
            AGGREGATE_FNS.has((aggregate as TableGroupAggregateConfig).fn),
        )
      : [],
    missingLabel: typeof config.missingLabel === 'string' ? config.missingLabel : '-',
  };
}

function toNumericValues(entries: TableRowEntry[], field: string | undefined): number[] {
  const values: number[] = [];
  for (const entry of entries) {
    const raw = field ? getIn(entry.record, field) : entry.record;
    if (raw === null || raw === undefined || raw === '') {
      continue;
    }
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      values.push(numeric);
    }
  }
  return values;
}

export function computeGroupAggregate(
  fn: TableGroupAggregateConfig['fn'],
  field: string | undefined,
  entries: TableRowEntry[],
  label?: string,
): TableGroupAggregateValue {
  const resolvedLabel = typeof label === 'string' && label.length > 0 ? label : fn;

  if (fn === 'count') {
    return { fn, label: resolvedLabel, value: entries.length, valid: true };
  }

  const values = toNumericValues(entries, field);
  if (values.length === 0) {
    return { fn, label: resolvedLabel, value: '-', valid: false };
  }

  let value: number;
  if (fn === 'sum') {
    value = values.reduce((total, current) => total + current, 0);
  } else if (fn === 'avg') {
    value = values.reduce((total, current) => total + current, 0) / values.length;
  } else if (fn === 'min') {
    value = Math.min(...values);
  } else {
    value = Math.max(...values);
  }

  return { fn, label: resolvedLabel, value, valid: true };
}

export function buildTableGroups(
  rows: TableRowEntry[],
  config: ResolvedTableGroupConfig,
): TableGroupModel[] {
  const order: string[] = [];
  const buckets = new Map<string, { label: string; entries: TableRowEntry[]; missing: boolean }>();

  for (const entry of rows) {
    const raw = getIn(entry.record, config.field);
    const isMissing = raw === null || raw === undefined || raw === '';
    const key = isMissing ? MISSING_GROUP_KEY : String(raw);
    const label = isMissing ? config.missingLabel : String(raw);

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { label, entries: [], missing: isMissing };
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.entries.push(entry);
  }

  return order.map((key) => {
    const bucket = buckets.get(key)!;
    return {
      key,
      label: bucket.label,
      entries: bucket.entries,
      count: bucket.entries.length,
      missing: bucket.missing,
      aggregates: config.aggregates.map((aggregate) =>
        computeGroupAggregate(
          aggregate.fn,
          aggregate.fn === 'count' ? undefined : aggregate.field,
          bucket.entries,
          aggregate.label,
        ),
      ),
    };
  });
}

export function buildGroupedDisplayItems(
  groups: TableGroupModel[],
  collapsedKeys: ReadonlySet<string>,
): GroupedDisplayItem[] {
  const items: GroupedDisplayItem[] = [];
  for (const group of groups) {
    const collapsed = collapsedKeys.has(group.key);
    items.push({ kind: 'group', group, collapsed });
    if (!collapsed) {
      for (const entry of group.entries) {
        items.push({ kind: 'row', entry, groupKey: group.key });
      }
    }
  }
  return items;
}

export function formatGroupAggregateText(
  aggregates: TableGroupAggregateValue[],
): string | undefined {
  if (aggregates.length === 0) {
    return undefined;
  }
  return aggregates.map((aggregate) => `${aggregate.label}: ${aggregate.value}`).join(' · ');
}
