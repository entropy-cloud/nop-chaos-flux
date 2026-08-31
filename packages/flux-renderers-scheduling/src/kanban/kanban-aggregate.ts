import type { SchemaObject } from '@nop-chaos/flux-core';
import type { BoardItem } from './kanban.types.js';

export type KanbanColumnAggregateFn = 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface KanbanColumnAggregateConfig extends SchemaObject {
  /** Aggregation function. `count` ignores `field` and equals the card count. */
  fn: KanbanColumnAggregateFn;
  /** Card `data` key aggregated by sum/avg/min/max (non-numeric values are skipped). */
  field?: string;
  /** Header label override; defaults to the fn token. */
  label?: string;
}

export interface KanbanColumnAggregateResult {
  /** Numeric aggregate, or the `-` fallback when no card carries a valid value. */
  value: number | '-';
}

export function isKanbanColumnAggregateFn(value: unknown): value is KanbanColumnAggregateFn {
  return value === 'sum' || value === 'avg' || value === 'min' || value === 'max' || value === 'count';
}

function toFiniteNumber(input: unknown): number | undefined {
  if (input == null || input === '') {
    return undefined;
  }
  const num = Number(input);
  return Number.isFinite(num) ? num : undefined;
}

export function computeColumnAggregate(
  cards: readonly BoardItem[],
  config: KanbanColumnAggregateConfig,
): KanbanColumnAggregateResult {
  if (config.fn === 'count') {
    return { value: cards.length };
  }

  const field = config.field;
  const values: number[] = [];
  for (const card of cards) {
    const raw = (card.data ?? {})[field as string];
    const num = toFiniteNumber(raw);
    if (num !== undefined) {
      values.push(num);
    }
  }

  if (values.length === 0) {
    return { value: '-' };
  }

  switch (config.fn) {
    case 'sum':
      return { value: values.reduce((acc, v) => acc + v, 0) };
    case 'avg':
      return { value: Math.round((values.reduce((acc, v) => acc + v, 0) / values.length) * 100) / 100 };
    case 'min':
      return { value: Math.min(...values) };
    case 'max':
      return { value: Math.max(...values) };
    default:
      return { value: '-' };
  }
}
