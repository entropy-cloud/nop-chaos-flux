import { useCallback, useEffect, useRef } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';

interface SchedulingEventCtx {
  event: { type: string } & Record<string, unknown>;
  evaluationBindings: Record<string, unknown>;
  scope: ScopeRef;
}

/**
 * CX-10 / bug-83 family convention: schema event dispatches carry a second
 * dispatch-arg ctx { event, evaluationBindings, scope } so action args
 * templates can read payload keys as bare bindings. Single source for the
 * scheduling family (barcode/calendar/gantt/kanban) — previously four
 * verbatim copies (cq-3 Phase 6).
 */
function buildSchedulingEventCtx(
  scope: ScopeRef,
  payload: Record<string, unknown>,
): SchedulingEventCtx {
  return {
    event: { ...payload, type: typeof payload.type === 'string' ? payload.type : 'custom' },
    evaluationBindings: payload,
    scope,
  };
}

/** Direct-scope variant: ctx identity changes when the scope changes. */
export function useSchedulingEventCtx(scope: ScopeRef) {
  return useCallback(
    (payload: Record<string, unknown>) => buildSchedulingEventCtx(scope, payload),
    [scope],
  );
}

/**
 * Ref-stable variant (gantt): reads the scope through a getter at fire time so
 * the returned ctx callback keeps a stable identity across scope changes —
 * keeps mount/unmount effects from re-firing.
 */
export function useSchedulingEventCtxStable(getScope: () => ScopeRef) {
  // The getter is read through a ref (synced post-render) so the returned ctx
  // callback keeps a []-deps identity — the caller's mount/unmount effects
  // must not re-fire on scope changes (gantt contract, bug-83 lineage).
  const getScopeRef = useRef(getScope);
  useEffect(() => {
    getScopeRef.current = getScope;
  });
  return useCallback(
    (payload: Record<string, unknown>) => buildSchedulingEventCtx(getScopeRef.current(), payload),
    [],
  );
}
