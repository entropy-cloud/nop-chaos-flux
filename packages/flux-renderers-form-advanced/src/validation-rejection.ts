import { reportRuntimeHostIssue, type RendererEnv } from '@nop-chaos/flux-core';

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

export function attachValidationRejectionHandler(
  result: unknown,
  report: (error: unknown) => void,
): void {
  if (isPromiseLike(result)) {
    void result.catch(report);
  }
}

export function reportValidationFailure(env: RendererEnv | undefined, path: string, error: unknown): void {
  if (!env) {
    console.warn('[flux-form-advanced] validateField/validateAt failed', error);
    return;
  }
  reportRuntimeHostIssue({
    env,
    level: 'warning',
    message: 'Field validation failed',
    error,
    phase: 'action',
    path,
  });
}
