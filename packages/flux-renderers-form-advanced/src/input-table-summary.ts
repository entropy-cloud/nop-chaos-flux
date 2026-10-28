import type { InputTableAggregate, InputTableSummaryBinding } from './composite-field/composite-schemas.js';

/**
 * Plan 785 — shared aggregate math for the input-table summary row and
 * summaryBinding write-back. Non-numeric cells are skipped (counted in
 * `skipped`), they never block editing.
 */
type ScalarAggregate = 'sum' | 'count' | 'avg';

interface AggregateResult {
  value: number | null;
  skipped: number;
}

export function isScalarAggregate(agg: unknown): agg is ScalarAggregate {
  return agg === 'sum' || agg === 'count' || agg === 'avg';
}

export function isExprAggregate(aggregate: InputTableAggregate): aggregate is { expr: string } {
  return typeof aggregate === 'object' && aggregate !== null && typeof aggregate.expr === 'string';
}

export function isValidSummaryBinding(binding: unknown): binding is InputTableSummaryBinding {
  return (
    typeof binding === 'object' &&
    binding !== null &&
    typeof (binding as InputTableSummaryBinding).field === 'string' &&
    (binding as InputTableSummaryBinding).field.length > 0 &&
    typeof (binding as InputTableSummaryBinding).column === 'string' &&
    (binding as InputTableSummaryBinding).column.length > 0 &&
    isScalarAggregate((binding as InputTableSummaryBinding).agg)
  );
}

function toNumericCell(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function aggregateColumn(items: readonly unknown[], column: string, agg: ScalarAggregate): AggregateResult {
  if (agg === 'count') {
    return { value: items.length, skipped: 0 };
  }
  let sum = 0;
  let numericCount = 0;
  let skipped = 0;
  for (const item of items) {
    const cell =
      item && typeof item === 'object' ? (item as Record<string, unknown>)[column] : undefined;
    const numeric = toNumericCell(cell);
    if (numeric === undefined) {
      skipped += 1;
      continue;
    }
    sum += numeric;
    numericCount += 1;
  }
  if (agg === 'sum') {
    return { value: numericCount > 0 ? sum : null, skipped };
  }
  return { value: numericCount > 0 ? sum / numericCount : null, skipped };
}

export function formatAggregateValue(value: number | null): string {
  if (value === null) return '';
  return String(value);
}
