import type { ActionContext, ActionResult } from '@nop-chaos/flux-core';
import { isFailureClass } from '../action-core.js';
import type { ActionDispatcherContext } from './types.js';

// plan 841: extracted from action-execution.ts (oversized-gate split) — the
// diagnostics reporting slice: failure classification markers, the synthetic
// branch event list, and the error/notify reporters.

export const SYNTHETIC_BRANCH_EVENT_TYPES: ReadonlySet<string> = new Set([
  'actionError',
  'actionSettled',
  'actionSettledError',
]);

export const caughtFailureResults = new WeakSet<ActionResult>();

export function reportActionError(
  ctx: ActionDispatcherContext,
  error: unknown,
  actionCtx: ActionContext,
) {
  try {
    ctx.onActionError?.(error, actionCtx);
  } catch (diagnosticError) {
    console.warn('[action-execution] onActionError diagnostic hook threw:', diagnosticError);
    // plan 841 错②: the diagnostic hook's own failure now reaches the monitor
    // (phase 'action'), not just the console — fire-and-forget, monitor throws
    // are swallowed per the flux-monitor contract.
    try {
      ctx.monitor?.({
        type: 'error',
        phase: 'action',
        error: diagnosticError,
        details: { source: 'onActionError-hook' },
      });
    } catch (monitorError) {
      console.warn('[action-execution] monitor threw:', monitorError);
    }
  }

  for (const plugin of ctx.plugins ?? []) {
    try {
      plugin.onError?.(error, {
        phase: 'action',
        error,
        nodeId: actionCtx.nodeInstance?.templateNode.id,
        path: actionCtx.nodeInstance?.templateNode.templatePath,
      });
    } catch (pluginError) {
      console.warn('[action-execution] plugin onError diagnostic threw:', pluginError);
    }
  }
}

// Structured action failures (e.g. form submit validation results) carry
// non-Error payloads ({ValidationError[]}, {message}) — String() would render
// them as "[object Object]" in user-facing notify toasts.
export function describeActionFailure(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error
      .map((item) => describeActionFailure(item))
      .filter(Boolean)
      .join('；')
      .slice(0, 200);
  }
  if (
    error &&
    typeof error === 'object' &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  if (error === undefined || error === null) return 'Action failed';
  try {
    return JSON.stringify(error).slice(0, 200);
  } catch {
    return String(error);
  }
}

export function reportUnhandledFailureClass(
  ctx: ActionDispatcherContext,
  actionCtx: ActionContext,
  result: ActionResult,
  handledByOnError: boolean,
): void {
  const eventType =
    typeof (actionCtx.event as { type?: unknown } | undefined)?.type === 'string'
      ? (actionCtx.event as { type: string }).type
      : undefined;
  const syntheticBranchEvent = eventType !== undefined && SYNTHETIC_BRANCH_EVENT_TYPES.has(eventType);

  if (
    handledByOnError ||
    !isFailureClass(result) ||
    result.failureHandled ||
    syntheticBranchEvent
  ) {
    return;
  }

  // "Caught" results (errors converted to {ok:false} by runSingleAction's catch
  // block) still need a user-visible notification — the catch block only calls
  // onActionError (which may be undefined). Without this notify, action-arg
  // expression failures (e.g. unresolved ${pagination.currentPage} in a dialog
  // scope) are completely silent: no toast, no console message.
  const hasDiagnosticChannel = ctx.onActionError !== undefined || (ctx.plugins ?? []).some(p => typeof p.onError === 'function');
  if (hasDiagnosticChannel && caughtFailureResults.has(result)) {
    return;
  }

  const message = describeActionFailure(result.error);

  ctx.getEnv().notify('error', message);
}
