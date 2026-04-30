import {
  actionAdapter,
  type ActionResult,
  type ActionSchema,
  type FormRuntime,
} from '@nop-chaos/flux-core';

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

type ValueAdaptationAction = ActionSchema | ActionSchema[];

function createDetailAdapter(
  transformInAction: ValueAdaptationAction | undefined,
  transformOutAction: ValueAdaptationAction | undefined,
  validateAction: ValueAdaptationAction | undefined,
  runner: (actionSchema: ValueAdaptationAction) => Promise<ActionResult>,
) {
  return actionAdapter(
    transformInAction,
    transformOutAction,
    validateAction,
    async (actionSchema) => runner(actionSchema as ValueAdaptationAction),
  );
}

export async function runTransformIn(
  actionSchema: ValueAdaptationAction | undefined,
  input: TransformInInput,
  runner: (actionSchema: ValueAdaptationAction) => Promise<ActionResult>,
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
  runner: (actionSchema: ValueAdaptationAction) => Promise<ActionResult>,
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
  runner: (actionSchema: ValueAdaptationAction) => Promise<ActionResult>,
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
      sourceKind: 'runtime-overlay' as const,
    })),
    replace: true,
  });
}
