import type { ActionContext, ActionResult, ActionSchema, ScopeRef } from '@nop-chaos/flux-core';
import type { SurfaceEntry } from '@nop-chaos/flux-core';

export interface HookPayload {
  result?: unknown;
  formData?: Record<string, unknown>;
  hookName?: 'close' | 'submit:success' | 'submit:error';
}

/**
 * Dispatch a lifecycle hook schema in the surface's owner ctx.
 *
 * Rebuilds an owner-side ActionContext from `entry.ownerActionCtx` + the
 * captured `ownerScope` / `ownerNodeInstance`, injects `$formData` / `$result`
 * / `$hook` evaluation bindings, and dispatches via `runtime.dispatch`.
 *
 * - If `entry.ownerActionCtx` is missing (declarative surface, or surface
 *   opened without the action-adapter hook plumbing) → returns
 *   `{ ok: false, error: ... }` without dispatching.
 * - If the hook schema is missing or empty → returns `{ ok: true, skipped: true }`.
 * - Hook dispatch errors are propagated as `{ ok: false, error }`. Callers
 *   should wrap in try/catch to keep the triggering flow resilient (see
 *   `surface-runtime.close` which catches and console.warns).
 */
export async function dispatchInOwner(
  entry: SurfaceEntry,
  nodes: ActionSchema | ActionSchema[] | undefined,
  payload: HookPayload = {},
): Promise<ActionResult> {
  if (!nodes) {
    return { ok: true, data: { skipped: true } };
  }
  if (!entry.ownerActionCtx) {
    return {
      ok: false,
      error: new Error('dispatchInOwner: entry has no ownerActionCtx'),
    };
  }

  const ownerCtx: ActionContext = {
    ...entry.ownerActionCtx,
    scope: (entry.ownerScope ?? entry.ownerActionCtx.scope) as ScopeRef,
    nodeInstance: entry.ownerNodeInstance ?? entry.ownerActionCtx.nodeInstance,
    prevResult: payload.result as ActionResult | undefined,
    evaluationBindings: {
      ...(entry.ownerActionCtx.evaluationBindings ?? {}),
      $formData: payload.formData ?? {},
      $result: payload.result,
      $hook: payload.hookName,
    },
  };

  return entry.ownerActionCtx.runtime.dispatch(nodes, ownerCtx);
}
