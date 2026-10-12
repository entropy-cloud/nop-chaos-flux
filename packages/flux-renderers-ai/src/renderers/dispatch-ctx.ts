import type { ActionContext, FluxActionEvent, ScopeRef } from '@nop-chaos/flux-core';

/**
 * bug-83 family convention (C8.1/C8.2/C8.3 P1-1, CX-10): the second dispatch
 * argument carries `{ event, evaluationBindings, scope }` so action-args
 * templates can read the payload keys — the runtime only resolves
 * `evaluationBindings` + scope, never a bare `event` binding. The payload
 * object doubles as the bindings so `${message}` / `${error}` /
 * `${conversationId}` resolve to real values.
 *
 * WA-ai-001 (plan 571): single home for the previously hand-copied
 * `dispatchCtx`/`eventCtx`/inline literals across the renderer family (13
 * sites born in three same-day waves). This file is package-private — do not
 * re-export from index.ts.
 */
export function buildDispatchCtx(
  payload: Record<string, unknown>,
  nodeScope: ScopeRef | undefined,
): Partial<ActionContext> {
  return {
    event: payload as FluxActionEvent,
    evaluationBindings: payload,
    scope: nodeScope,
  };
}
