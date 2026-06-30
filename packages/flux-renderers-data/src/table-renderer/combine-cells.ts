import { getIn } from '@nop-chaos/flux-core';
import type { TableColumnSchema } from '../schemas.js';
import type { TableRowEntry } from './types.js';

export type CombinePlan = Array<Record<string, number>>;

/**
 * Stable singleton returned by `computeCombinePlan` whenever no merging is
 * active (`combineNum` unset/non-positive, empty rows, or virtual mode). Using
 * a stable reference keeps `React.memo` comparisons on `combinePlan` valid
 * across re-renders, so unchanged rows are not forced to re-render simply
 * because the surrounding `processedData` array was rebuilt.
 */
export const EMPTY_COMBINE_PLAN: CombinePlan = [];

function getCellValue(record: Record<string, unknown>, column: TableColumnSchema): unknown {
  if (!column.name) return undefined;
  return getIn(record, column.name);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * Compute a rowSpan plan for cell merging based on amis `combineNum` semantics.
 *
 * amis `combineNum: N` means: for the first N columns, merge consecutive rows
 * that have the same value into a single cell (rowSpan). Hidden cells (covered
 * by an earlier span) get rowSpan 0; span starts get rowSpan = number of merged
 * rows.
 *
 * When `virtualEnabled` is true, we cannot safely merge across virtual windows
 * (because rows outside the window would never render the cell that should be
 * merged). In that case, we degrade to per-row planning where each row is its
 * own span of 1 (no merging).
 */
export function computeCombinePlan(
  rows: TableRowEntry[],
  columns: TableColumnSchema[],
  combineNum: number | undefined,
  options: { virtualEnabled?: boolean } = {},
): CombinePlan {
  if (typeof combineNum !== 'number' || combineNum <= 0 || rows.length === 0) {
    return EMPTY_COMBINE_PLAN;
  }

  if (options.virtualEnabled) {
    return EMPTY_COMBINE_PLAN;
  }

  const n = Math.min(Math.floor(combineNum), columns.length);
  if (n <= 0) {
    return EMPTY_COMBINE_PLAN;
  }

  const plan: CombinePlan = rows.map(() => ({}));
  const affectedColumnKeys = columns.slice(0, n).map((column, index) => ({
    key: column.name ?? `column-${index}`,
    column,
  }));

  for (const { key, column } of affectedColumnKeys) {
    let spanStart = 0;
    let spanLength = 1;

    for (let index = 1; index < rows.length; index += 1) {
      const current = rows[index];
      const previous = rows[index - 1];
      if (!current || !previous) {
        continue;
      }

      if (valuesEqual(getCellValue(current.record, column), getCellValue(previous.record, column))) {
        spanLength += 1;
        plan[index]![key] = 0;
      } else {
        if (spanLength > 1) {
          plan[spanStart]![key] = spanLength;
        }
        spanStart = index;
        spanLength = 1;
      }
    }

    if (spanLength > 1) {
      plan[spanStart]![key] = spanLength;
    }
  }

  return plan;
}

export function getCellRowSpan(
  plan: CombinePlan,
  rowIndex: number,
  column: TableColumnSchema,
  columnIndex: number,
): number | undefined {
  const rowPlan = plan[rowIndex];
  if (!rowPlan) return undefined;
  const key = column.name ?? `column-${columnIndex}`;
  const value = rowPlan[key];
  if (value === undefined) return undefined;
  return value === 0 ? 0 : value;
}
