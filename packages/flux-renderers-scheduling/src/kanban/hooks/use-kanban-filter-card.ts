import { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';

export type KanbanFilterCardFn = (cardData: Record<string, any>, text: string) => boolean;

/**
 * Compiles the schema `filterCard` expression (or accepts a function form)
 * into a predicate over (card, filterText). Compile failure is surfaced as a
 * user-visible message via the returned `filterError` — never thrown, never
 * setState during render (the effect relatches the ref after the commit).
 */
export function useKanbanFilterCard(
  filterCard: unknown,
  runtime: RendererRuntime,
  rootScope: ScopeRef,
): { filterCardFn: KanbanFilterCardFn | undefined; filterError: string | null; clearFilterError: () => void } {
  const [filterError, setFilterError] = useState<string | null>(null);
  const filterCompileErrorRef = useRef<string | null>(null);

  const filterCardFn = useMemo<KanbanFilterCardFn | undefined>(() => {
    if (!filterCard) return undefined;
    if (typeof filterCard === 'function') return filterCard as KanbanFilterCardFn;
    if (typeof filterCard === 'string') {
      try {
        const compiled = runtime.expressionCompiler.compileValue(filterCard);
        filterCompileErrorRef.current = null;
        if (compiled) {
          return (cardData: Record<string, any>, text: string) => {
            const evalScope = runtime.createChildScope(rootScope, { card: cardData, text });
            try {
              return !!(runtime.evaluateCompiled(compiled, evalScope));
            } finally {
              runtime.disposeScope(evalScope.id);
            }
          };
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? t('flux.scheduling.kanban.filterCompileFailedDetail', { message: err.message })
            : t('flux.scheduling.kanban.filterCompileFailed');
        filterCompileErrorRef.current = msg;
      }
    }
    return undefined;
  }, [filterCard, runtime, rootScope]);

  useEffect(() => {
    setFilterError(filterCompileErrorRef.current);
  }, [filterCard]);

  return { filterCardFn, filterError, clearFilterError: () => setFilterError(null) };
}
