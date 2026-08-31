import { useEffect, useRef } from 'react';
import {
  isKanbanColumnAggregateFn,
  type KanbanColumnAggregateConfig,
} from '../kanban-aggregate.js';

function isDevKanbanRuntime(): boolean {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

/**
 * Resolves the schema `columnAggregate` declaration (G-C): invalid `fn`
 * values are dropped with a one-time dev warn; `warnAggregateFallback` fires
 * at most once per board when a column has no numeric values (fallback "-").
 */
export function useKanbanColumnAggregate(raw: unknown): {
  columnAggregate: KanbanColumnAggregateConfig | undefined;
  warnAggregateFallback: () => void;
} {
  const aggregateWarnedRef = useRef(false);
  const warnAggregateInvalidRef = useRef(false);
  const invalidFn =
    raw != null && (typeof raw !== 'object' || !isKanbanColumnAggregateFn((raw as KanbanColumnAggregateConfig).fn));

  useEffect(() => {
    if (!invalidFn || warnAggregateInvalidRef.current) return;
    warnAggregateInvalidRef.current = true;
    if (isDevKanbanRuntime()) {
      console.warn(
        '[KanbanBoard] kanban-aggregate-invalid: columnAggregate.fn must be one of sum | avg | min | max | count; aggregate skipped.',
      );
    }
  }, [invalidFn]);

  const columnAggregate =
    raw && typeof raw === 'object' && !invalidFn ? (raw as KanbanColumnAggregateConfig) : undefined;

  const warnAggregateFallback = () => {
    if (!isDevKanbanRuntime() || aggregateWarnedRef.current) return;
    aggregateWarnedRef.current = true;
    console.warn(
      '[KanbanBoard] kanban-aggregate-missing-field: columnAggregate found no numeric values for a column; showing "-" fallback.',
    );
  };

  return { columnAggregate, warnAggregateFallback };
}
