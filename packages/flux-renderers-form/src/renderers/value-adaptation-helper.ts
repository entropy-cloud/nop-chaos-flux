import type { ActionResult, FormRuntime } from '@nop-chaos/flux-core';

export interface ValueAdaptationInput {
  rawValue: unknown;
  name?: string;
  readOnly?: boolean;
}

export interface TransformOutInput {
  workingValue: unknown;
  originalValue: unknown;
  name?: string;
  readOnly?: boolean;
}

export interface ValidateValueInput {
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

export type ActionRunner = (
  actionSchema: unknown,
  payload: Record<string, unknown>
) => Promise<ActionResult>;

export interface ValueAdaptationOwnerHelper {
  runTransformIn(
    actionSchema: unknown,
    input: ValueAdaptationInput,
    runner: ActionRunner
  ): Promise<unknown>;

  runTransformOut(
    actionSchema: unknown,
    input: TransformOutInput,
    runner: ActionRunner
  ): Promise<unknown>;

  runValidate(
    actionSchema: unknown,
    input: ValidateValueInput,
    runner: ActionRunner
  ): Promise<ValidateValueResult>;
}

export const valueAdaptationOwnerHelper: ValueAdaptationOwnerHelper = {
  async runTransformIn(actionSchema, input, runner) {
    if (!actionSchema) {
      return input.rawValue;
    }

    const payload: Record<string, unknown> = {
      value: input.rawValue,
      readOnly: input.readOnly ?? false
    };

    if (input.name !== undefined) {
      payload.name = input.name;
    }

    const result = await runner(actionSchema, payload);

    if (!result.ok) {
      return input.rawValue;
    }

    return result.data !== undefined ? result.data : input.rawValue;
  },

  async runTransformOut(actionSchema, input, runner) {
    if (!actionSchema) {
      return input.workingValue;
    }

    const payload: Record<string, unknown> = {
      value: input.workingValue,
      originalValue: input.originalValue,
      readOnly: input.readOnly ?? false
    };

    if (input.name !== undefined) {
      payload.name = input.name;
    }

    const result = await runner(actionSchema, payload);

    if (!result.ok) {
      return input.workingValue;
    }

    return result.data !== undefined ? result.data : input.workingValue;
  },

  async runValidate(actionSchema, input, runner) {
    if (!actionSchema) {
      return { valid: true };
    }

    const payload: Record<string, unknown> = {
      value: input.workingValue,
      originalValue: input.originalValue
    };

    if (input.name !== undefined) {
      payload.name = input.name;
    }

    const result = await runner(actionSchema, payload);

    if (!result.ok) {
      return { valid: false, issues: [{ level: 'error' as const, message: String(result.error ?? 'Validation failed') }] };
    }

    const data = result.data as Record<string, unknown> | undefined;

    if (!data || typeof data !== 'object') {
      return { valid: true };
    }

    return {
      valid: data.valid !== false,
      issues: Array.isArray(data.issues) ? data.issues as ValidateValueResult['issues'] : undefined
    };
  }
};

export function publishValidateResultErrors(
  result: ValidateValueResult,
  fieldPath: string,
  form: FormRuntime
): void {
  if (result.valid) {
    form.clearErrors(fieldPath);
    return;
  }

  const issues = result.issues ?? [{ level: 'error' as const, message: 'Value is invalid' }];

  form.applyExternalErrors({
    sourceId: `value-adaptation:${fieldPath}`,
    errors: issues.map((issue) => ({
      path: issue.path ?? fieldPath,
      message: issue.message,
      rule: 'custom' as any,
      sourceKind: 'runtime-overlay' as const
    })),
    replace: true
  });
}
