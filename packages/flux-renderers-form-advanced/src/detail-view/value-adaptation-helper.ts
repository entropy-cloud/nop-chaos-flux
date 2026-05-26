import {
  actionAdapter,
  type CompiledActionNode,
  type ActionResult,
  type ActionSchema,
  type AdapterValidationIssue,
  type CompiledActionProgram,
  type FormRuntime,
  type SchemaValue,
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

type ValueAdaptationAction = ActionSchema | ActionSchema[] | CompiledActionProgram;

function isCompiledActionProgram(value: unknown): value is CompiledActionProgram {
  return Boolean(
    value && typeof value === 'object' && 'nodes' in value && Array.isArray((value as { nodes?: unknown }).nodes),
  );
}

function injectDefaultArgs(
  actionSchema: ActionSchema | ActionSchema[],
  payload: Record<string, unknown>,
): ActionSchema | ActionSchema[] {
  const schemaPayload = payload as Record<string, SchemaValue>;

  if (Array.isArray(actionSchema)) {
    return actionSchema.map((entry) =>
      entry.args === undefined && supportsArgsInjection(entry)
        ? { ...entry, args: schemaPayload }
        : entry,
    );
  }

  return actionSchema.args === undefined && supportsArgsInjection(actionSchema)
    ? { ...actionSchema, args: schemaPayload }
    : actionSchema;
}

function supportsArgsInjection(action: ActionSchema) {
  return (
    action.action !== 'closeDialog' &&
    action.action !== 'closeDrawer' &&
    action.action !== 'closeSurface' &&
    action.action !== 'refreshTable' &&
    action.action !== 'refreshSource'
  );
}

function cloneCompiledActionProgramWithPayload(
  program: CompiledActionProgram,
  payload: Record<string, unknown>,
): CompiledActionProgram {
  const schemaPayload = payload as Record<string, SchemaValue>;

  return {
    ...program,
    isFullyStatic: false,
    nodes: program.nodes.map(function cloneNode(node): CompiledActionNode {
      const source = injectDefaultArgs(node.source, payload) as ActionSchema;
      return {
        ...node,
        source,
        payload: {
          ...node.payload,
          args:
            node.source.args === undefined && supportsArgsInjection(node.source)
              ? {
                  kind: 'static',
                  isStatic: true,
                  node: { kind: 'static-node', value: schemaPayload },
                  value: schemaPayload,
                }
              : node.payload.args,
        },
        then: node.then?.map(cloneNode),
        onError: node.onError?.map(cloneNode),
        onSettled: node.onSettled?.map(cloneNode),
        parallel: node.parallel?.map(cloneNode),
      };
    }),
  };
}

function getActionResultValue(result: ActionResult, fallback: unknown) {
  return result.data !== undefined ? result.data : fallback;
}

function createActionFailureError(
  phase: 'transformIn' | 'transformOut',
  resultOrError: ActionResult | unknown,
): Error {
  if (
    typeof resultOrError === 'object' &&
    resultOrError !== null &&
    'ok' in resultOrError &&
    (resultOrError as ActionResult).ok === false
  ) {
    const result = resultOrError as ActionResult;
    const messageSource = result.error ?? result;
    const error = new Error(
      `[flux] ${phase} failed: ${messageSource instanceof Error ? messageSource.message : String(messageSource ?? 'Unknown adapter error')}`,
    );
    (error as Error & { cause?: unknown }).cause = result;
    return error;
  }

  const error = new Error(
    `[flux] ${phase} failed: ${resultOrError instanceof Error ? resultOrError.message : String(resultOrError ?? 'Unknown adapter error')}`,
  );

  if (resultOrError !== undefined) {
    (error as Error & { cause?: unknown }).cause = resultOrError;
  }

  return error;
}

function toValidationIssues(error: unknown): AdapterValidationIssue[] {
  return [
    {
      level: 'error',
      message: error instanceof Error ? error.message : String(error ?? 'Validation failed'),
    },
  ];
}

async function runValueAdaptationAction(
  actionSchema: ValueAdaptationAction | undefined,
  payload: Record<string, unknown>,
  runner: (actionSchema: ValueAdaptationAction) => Promise<ActionResult>,
): Promise<ActionResult | undefined> {
  if (!actionSchema) {
    return undefined;
  }

  return runner(
    isCompiledActionProgram(actionSchema)
      ? cloneCompiledActionProgramWithPayload(actionSchema, payload)
      : injectDefaultArgs(actionSchema, payload),
  );
}

function createDetailAdapter(
  transformInAction: ValueAdaptationAction | undefined,
  transformOutAction: ValueAdaptationAction | undefined,
  validateAction: ValueAdaptationAction | undefined,
  runner: (actionSchema: ValueAdaptationAction) => Promise<ActionResult>,
) {
  if (
    !isCompiledActionProgram(transformInAction) &&
    !isCompiledActionProgram(transformOutAction) &&
    !isCompiledActionProgram(validateAction)
  ) {
  return actionAdapter(
    transformInAction,
    transformOutAction,
    validateAction,
    async (actionSchema) => runner(actionSchema as ValueAdaptationAction),
  );
  }

  return {
    async in(value: unknown, ctx: { name?: string; readOnly: boolean }) {
      if (!transformInAction) {
        return value;
      }

      const result = await runValueAdaptationAction(
        transformInAction,
        {
          value,
          readOnly: ctx.readOnly,
          ...(ctx.name !== undefined ? { name: ctx.name } : {}),
        },
        runner,
      );

      if (!result?.ok) {
        throw createActionFailureError('transformIn', result);
      }

      return getActionResultValue(result, value);
    },

    async out(
      value: unknown,
      ctx: { name?: string; readOnly: boolean; originalValue?: unknown },
    ) {
      if (!transformOutAction) {
        return value;
      }

      const result = await runValueAdaptationAction(
        transformOutAction,
        {
          value,
          originalValue: ctx.originalValue,
          readOnly: ctx.readOnly,
          ...(ctx.name !== undefined ? { name: ctx.name } : {}),
        },
        runner,
      );

      if (!result?.ok) {
        throw createActionFailureError('transformOut', result);
      }

      return getActionResultValue(result, value);
    },

    async validate(
      value: unknown,
      ctx: { name?: string; readOnly: boolean; originalValue?: unknown },
    ) {
      if (!validateAction) {
        return { valid: true };
      }

      try {
        const result = await runValueAdaptationAction(
          validateAction,
          {
            value,
            originalValue: ctx.originalValue,
            ...(ctx.name !== undefined ? { name: ctx.name } : {}),
          },
          runner,
        );

        if (!result?.ok) {
          return {
            valid: false,
            issues: toValidationIssues(result?.error),
          };
        }

        const data = result.data;
        if (!data || typeof data !== 'object') {
          return { valid: true };
        }

        const candidate = data as {
          valid?: unknown;
          issues?: AdapterValidationIssue[];
        };

        if (candidate.valid === false) {
          return {
            valid: false,
            issues: Array.isArray(candidate.issues) ? candidate.issues : [],
          };
        }

        return { valid: true };
      } catch (error) {
        return {
          valid: false,
          issues: toValidationIssues(error),
        };
      }
    },
  };
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
