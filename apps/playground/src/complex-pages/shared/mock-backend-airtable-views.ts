/**
 * Grid-tracker replica — grouped-view computation (plan 2026-08-30-0614-2
 * P6a Phase 1). `group=` parameterized grouping with per-group counts +
 * precomputed summary rows + a small sample of member rows; unknown group
 * fields fall back to the flat shape (at-group-unknown).
 */

import {
  formatAirtableAmount,
  toAirtableRecordRow,
  summarizeAirtable,
} from './mock-backend-airtable-records';
import {
  AT_CATEGORY_LABELS,
  type AtGroup,
  type AtGroupsPayload,
  type AtRecord,
} from './mock-backend-airtable-types';

/** Members kept visible per group in the grouped static sample. */
const SAMPLE_SIZE = 3;

export function groupAirtableRecords(records: AtRecord[]): AtGroupsPayload {
  const byLabel = new Map<string, AtRecord[]>();
  for (const record of records) {
    const bucket = byLabel.get(record.category) ?? [];
    bucket.push(record);
    byLabel.set(record.category, bucket);
  }
  const groups: AtGroup[] = AT_CATEGORY_LABELS.filter((c) => byLabel.has(c.label)).map(
    (category) => {
      const members = byLabel.get(category.label) ?? [];
      const summary = summarizeAirtable(members);
      return {
        key: category.label,
        label: category.label,
        chipClass: `at-chip at-chip-${category.hue}`,
        count: summary.count,
        amountSum: summary.amountSum,
        doneCount: summary.doneCount,
        amountSumLabel: formatAirtableAmount(summary.amountSum),
        collapsed: false,
        sample: members.slice(0, SAMPLE_SIZE).map(toAirtableRecordRow),
      };
    },
  );
  return { groups, total: records.length };
}
