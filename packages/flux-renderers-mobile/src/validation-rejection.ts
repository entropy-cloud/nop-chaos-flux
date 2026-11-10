import { reportRuntimeHostIssue, type RendererEnv } from '@nop-chaos/flux-core';

interface ChangeValidatable {
  validateField?: (name: string, trigger: 'change') => unknown;
}

// The wheel family validates by capability (plan 665 review m4); a rejecting
// validator must reach the host reporting channel, never an unhandled rejection.
export function validateFieldOnChange(
  form: ChangeValidatable,
  env: RendererEnv | undefined,
  name: string,
): void {
  if (typeof form.validateField !== 'function') {
    return;
  }
  void Promise.resolve(form.validateField(name, 'change')).catch((error: unknown) => {
    if (!env) {
      console.warn('[flux-mobile] validateField failed', error);
      return;
    }
    reportRuntimeHostIssue({
      env,
      level: 'warning',
      message: 'Field validation failed',
      error,
      phase: 'action',
      path: name,
    });
  });
}
