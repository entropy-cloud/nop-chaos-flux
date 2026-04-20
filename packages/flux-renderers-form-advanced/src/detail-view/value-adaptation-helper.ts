import { actionAdapter, type ActionResult, type ActionSchema, type FormRuntime } from '@nop-chaos/flux-core';

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

type ValueAdaptationAction = ActionSchema | ActionSchema[];

export type ActionRunner = (
  actionSchema: ValueAdaptationAction
) => Promise<ActionResult>;

export interface ValueAdaptationOwnerHelper {
  runTransformIn(
    actionSchema: ValueAdaptationAction | undefined,
    input: ValueAdaptationInput,
    runner: ActionRunner
  ): Promise<unknown>;

  runTransformOut(
    actionSchema: ValueAdaptationAction | undefined,
    input: TransformOutInput,
    runner: ActionRunner
  ): Promise<unknown>;

  runValidate(
    actionSchema: ValueAdaptationAction | undefined,
    input: ValidateValueInput,
    runner: ActionRunner
  ): Promise<ValidateValueResult>;
}

function createLegacyActionDispatch(runner: ActionRunner) {
  return async (actionSchema: ValueAdaptationAction) => runner(actionSchema);
}

export const valueAdaptationOwnerHelper: ValueAdaptationOwnerHelper = {
  async runTransformIn(actionSchema, input, runner) {
    const adapter = actionAdapter(actionSchema, undefined, undefined, createLegacyActionDispatch(runner));
    return adapter.in(input.rawValue, {
      name: input.name,
      readOnly: input.readOnly ?? false
    });
  },

  async runTransformOut(actionSchema, input, runner) {
    const adapter = actionAdapter(undefined, actionSchema, undefined, createLegacyActionDispatch(runner));
    return adapter.out(input.workingValue, {
      name: input.name,
      readOnly: input.readOnly ?? false,
      originalValue: input.originalValue
    });
  },

  async runValidate(actionSchema, input, runner) {
    const adapter = actionAdapter(undefined, undefined, actionSchema, createLegacyActionDispatch(runner));
    const result = await adapter.validate?.(input.workingValue, {
      name: input.name,
      readOnly: false,
      originalValue: input.originalValue
    });

    return result ?? { valid: true };
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
