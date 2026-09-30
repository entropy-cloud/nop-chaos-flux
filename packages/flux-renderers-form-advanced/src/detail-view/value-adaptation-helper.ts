import type { FormRuntime } from '@nop-chaos/flux-core';
import { createActionBackedAdapter } from '@nop-chaos/flux-core';
import type { AdapterValidationIssue } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';

interface TransformInInput {
  rawValue: unknown;
  name?: string;
  readOnly?: boolean;
}

interface TransformOutInput {
  workingValue: unknown;
  originalValue: unknown;
  name?: string;
  readOnly?: boolean;
}

interface ValidateValueInput {
  workingValue: unknown;
  originalValue: unknown;
  name?: string;
}

export interface ValidateValueResult {
  valid: boolean;
  issues?: Array<{
    level: 'error' | 'warning';
    message: string;
    path?: string;
  }>;
}

type ValueAdaptationAction = Parameters<typeof createActionBackedAdapter>[0]['transformInAction'];
type ValueAdapterRunner = Parameters<typeof createActionBackedAdapter>[0]['runner'];

/**
 * detail-view value adaptation (cq-4 Phase 2): thin over flux-core's
 * `createActionBackedAdapter`. The machinery (compiled-program payload
 * cloning, arg injection, failure normalization) is single-sourced there;
 * this wrapper contributes only the localized validation-message seam
 * (flux.form.validationFailedDetail) — flux-core itself stays i18n-free.
 */
function localizedIssues(error: unknown): AdapterValidationIssue[] {
  return [
    {
      level: 'error',
      message:
        error instanceof Error
          ? t('flux.form.validationFailedDetail', { message: error.message })
          : t('flux.form.validationFailedDetail', { message: String(error ?? '') }),
    },
  ];
}

function createDetailAdapter(
  transformInAction: ValueAdaptationAction | undefined,
  transformOutAction: ValueAdaptationAction | undefined,
  validateAction: ValueAdaptationAction | undefined,
  runner: ValueAdapterRunner,
) {
  return createActionBackedAdapter({
    transformInAction,
    transformOutAction,
    validateAction,
    runner,
    toValidationIssues: localizedIssues,
  });
}

export async function runTransformIn(
  actionSchema: ValueAdaptationAction | undefined,
  input: TransformInInput,
  runner: ValueAdapterRunner,
): Promise<unknown> {
  const adapter = createDetailAdapter(actionSchema, undefined, undefined, runner);
  return adapter.in(input.rawValue, {
    name: input.name,
    readOnly: input.readOnly ?? false,
  });
}

export async function runTransformOut(
  actionSchema: ValueAdaptationAction | undefined,
  input: TransformOutInput,
  runner: ValueAdapterRunner,
): Promise<unknown> {
  const adapter = createDetailAdapter(undefined, actionSchema, undefined, runner);
  return adapter.out(input.workingValue, {
    name: input.name,
    readOnly: input.readOnly ?? false,
    originalValue: input.originalValue,
  });
}

export async function runValidate(
  actionSchema: ValueAdaptationAction | undefined,
  input: ValidateValueInput,
  runner: ValueAdapterRunner,
): Promise<ValidateValueResult> {
  const adapter = createDetailAdapter(undefined, undefined, actionSchema, runner);
  const result = await adapter.validate?.(input.workingValue, {
    name: input.name,
    readOnly: false,
    originalValue: input.originalValue,
  });

  return result ?? { valid: true };
}

export function publishValidateResultErrors(
  result: ValidateValueResult,
  fieldPath: string,
  form: FormRuntime,
): void {
  if (result.valid) {
    form.applyExternalErrors({
      sourceId: `value-adaptation:${fieldPath}`,
      errors: [],
      replace: true,
    });
    return;
  }

  const issues = result.issues ?? [{ level: 'error' as const, message: 'Value is invalid' }];

  form.applyExternalErrors({
    sourceId: `value-adaptation:${fieldPath}`,
    errors: issues.map((issue) => ({
      path: issue.path ?? fieldPath,
      message: issue.message,
      rule: 'async',
      sourceKind: 'runtime-overlay' as const,
    })),
    replace: true,
  });
}
