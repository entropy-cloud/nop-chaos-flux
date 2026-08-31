/**
 * Grid-tracker replica — grouped-view computation (plan 2026-08-30-0614-2
 * P6a Phase 1; generalized to multiple group fields in P6b A8). `group=`
 * parameterized grouping with per-group counts + precomputed summary rows +
 * a small sample of member rows; unknown group fields fall back to the flat
 * shape (at-group-unknown).
 */

import {
  formatAirtableAmount,
  toAirtableRecordRow,
  summarizeAirtable,
} from './mock-backend-airtable-records';
import {
  AT_CATEGORY_LABELS,
  AT_PEOPLE,
  type AtGroup,
  type AtGroupsPayload,
  type AtRecord,
} from './mock-backend-airtable-types';

/** Members kept visible per group in the grouped static sample. */
const SAMPLE_SIZE = 3;

/** Group fields served by the endpoint (registry + collaborator + checkbox). */
export const AT_GROUPABLE_FIELDS = ['category', 'owner', 'done'] as const;
export type AtGroupableField = (typeof AT_GROUPABLE_FIELDS)[number];

function groupValueOf(record: AtRecord, field: AtGroupableField): string {
  if (field === 'owner') return record.owner.name;
  if (field === 'done') return record.done ? '已交付' : '未交付';
  return record.category;
}

function groupMetaOf(field: AtGroupableField, key: string): { label: string; chipClass: string } {
  if (field === 'owner') {
    const person = AT_PEOPLE.find((p) => p.name === key);
    return { label: key, chipClass: `at-chip at-chip-${person?.hue ?? 'gray'}` };
  }
  if (field === 'done') {
    return key === '已交付'
      ? { label: key, chipClass: 'at-chip at-chip-green' }
      : { label: key, chipClass: 'at-chip at-chip-gray' };
  }
  const category = AT_CATEGORY_LABELS.find((c) => c.label === key);
  return { label: key, chipClass: `at-chip at-chip-${category?.hue ?? 'gray'}` };
}

function orderedGroupKeys(field: AtGroupableField, present: Set<string>): string[] {
  if (field === 'owner') return AT_PEOPLE.map((p) => p.name).filter((n) => present.has(n));
  if (field === 'done') return ['已交付', '未交付'].filter((l) => present.has(l));
  return AT_CATEGORY_LABELS.map((c) => c.label).filter((l) => present.has(l));
}

export function groupAirtableRecords(records: AtRecord[], field: string = 'category'): AtGroupsPayload {
  if (!AT_GROUPABLE_FIELDS.includes(field as AtGroupableField)) {
    // at-group-unknown: unsupported group fields → flat shape (empty groups).
    return { groups: [], total: records.length };
  }
  const groupField = field as AtGroupableField;
  const byValue = new Map<string, AtRecord[]>();
  for (const record of records) {
    const value = groupValueOf(record, groupField);
    const bucket = byValue.get(value) ?? [];
    bucket.push(record);
    byValue.set(value, bucket);
  }
  const groups: AtGroup[] = orderedGroupKeys(groupField, new Set(byValue.keys())).map((key) => {
    const members = byValue.get(key) ?? [];
    const summary = summarizeAirtable(members);
    const meta = groupMetaOf(groupField, key);
    return {
      key,
      label: meta.label,
      chipClass: meta.chipClass,
      count: summary.count,
      amountSum: summary.amountSum,
      doneCount: summary.doneCount,
      amountSumLabel: formatAirtableAmount(summary.amountSum),
      collapsed: false,
      sample: members.slice(0, SAMPLE_SIZE).map(toAirtableRecordRow),
    };
  });
  return { groups, total: records.length };
}
