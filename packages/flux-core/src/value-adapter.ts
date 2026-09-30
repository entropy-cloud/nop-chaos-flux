import type { ActionContext, ActionResult, ActionSchema } from './types/actions.js';
import type { FormRuntime } from './types/runtime.js';
import type { CompiledActionNode, CompiledActionProgram } from './types/actions.js';
import type { SchemaValue } from './types/schema.js';
import type { ScopeRef } from './types/scope.js';

export interface AdapterContext {
  name?: string;
  readOnly: boolean;
}

export type AdapterDispatch = (
  action: ActionSchema | ActionSchema[],
  ctx?: Partial<ActionContext>,
) => Promise<ActionResult>;

export interface AdapterActionContext extends AdapterContext {
  scope?: ScopeRef;
  form?: FormRuntime | null;
  dispatch?: AdapterDispatch;
  originalValue?: unknown;
}

export type AdapterValidationResult =
  | { valid: true }
  | { valid: false; issues: AdapterValidationIssue[] };

export interface AdapterValidationIssue {
  level: 'error' | 'warning';
  message: string;
  path?: string;
  value?: unknown;
  cause?: unknown;
}

export interface ValueAdapter<
  TExternal = unknown,
  TInternal = unknown,
  TContext extends AdapterContext = AdapterContext,
> {
  in(value: TExternal, ctx: TContext): TInternal | Promise<TInternal>;
  out(value: TInternal, ctx: TContext): TExternal | Promise<TExternal>;
  validate?(
    value: TInternal,
    ctx: TContext,
  ): AdapterValidationResult | Promise<AdapterValidationResult>;
}

type SyncMarkedAdapter = {
  __syncIn?: true;
  __syncOut?: true;
};

function markSyncAdapter<TAdapter extends ValueAdapter>(
  adapter: TAdapter,
  options: { in?: true; out?: true } = { in: true, out: true },
): TAdapter {
  const syncAdapter = adapter as TAdapter & SyncMarkedAdapter;

  if (options.in) {
    syncAdapter.__syncIn = true;
  }

  if (options.out) {
    syncAdapter.__syncOut = true;
  }

  return syncAdapter;
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

function toValidationIssues(error: unknown): AdapterValidationIssue[] {
  return [
    {
      level: 'error',
      message: error instanceof Error ? error.message : String(error ?? 'Validation failed'),
      cause: error,
    },
  ];
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

function resolveDispatch(ctx: AdapterActionContext, dispatch?: AdapterDispatch) {
  return dispatch ?? ctx.dispatch;
}

async function runAction(
  actionSchema: ActionSchema | ActionSchema[] | undefined,
  payload: Record<string, unknown>,
  ctx: AdapterActionContext,
  dispatch?: AdapterDispatch,
): Promise<ActionResult | undefined> {
  if (!actionSchema) {
    return undefined;
  }

  const runner = resolveDispatch(ctx, dispatch);
  if (!runner) {
    return {
      ok: false,
      error: 'Missing adapter dispatch',
    };
  }

  return runner(injectDefaultArgs(actionSchema, payload), {
    scope: ctx.scope,
    form: ctx.form ?? undefined,
  });
}

export function identityAdapter<TValue = unknown>(): ValueAdapter<TValue, TValue> {
  return markSyncAdapter({
    in(value) {
      return value;
    },
    out(value) {
      return value;
    },
  });
}

export function stringAdapter(): ValueAdapter<unknown, string> {
  return markSyncAdapter({
    in(value) {
      return value == null ? '' : String(value);
    },
    out(value) {
      return value;
    },
  });
}

export function booleanStringAdapter(): ValueAdapter<unknown, boolean> {
  return markSyncAdapter({
    in(value) {
      if (typeof value === 'string') return value === 'true';
      return Boolean(value);
    },
    out(value) {
      return Boolean(value);
    },
  });
}

/**
 * Boolean value adapter that maps between an internal `boolean` (the checkbox /
 * switch UI primitive state) and a configurable external representation.
 *
 * - `in(external)`: returns `true` iff `Object.is(external, trueValue)`. Any
 *   other value (including `falseValue`, `null`, or unrelated values) is
 *   treated as unchecked. This matches the `value-neither` failure path: a
 *   value that matches neither mapping is preserved untouched by the caller
 *   until the next `onChange` overwrites it.
 * - `out(internal)`: returns `trueValue` when checked, `falseValue` otherwise.
 *
 * Defaults (`true` / `false`) reproduce the legacy `booleanStringAdapter.out`
 * contract so schemas without `trueValue`/`falseValue` are byte-for-byte
 * backward compatible.
 */
export function booleanMappingAdapter(
  trueValue: unknown = true,
  falseValue: unknown = false,
): ValueAdapter<unknown, boolean> {
  return markSyncAdapter({
    in(value) {
      return Object.is(value, trueValue);
    },
    out(value) {
      return value ? trueValue : falseValue;
    },
  });
}

export function numberAdapter(): ValueAdapter<unknown, number | undefined> {
  return markSyncAdapter({
    in(value: unknown) {
      if (value == null || value === '') return undefined;
      if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    out(value: unknown) {
      if (value == null || value === '') return undefined;
      if (typeof value === 'number') return value;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
  });
}

export function nullableAdapter<TValue, TContext extends AdapterContext = AdapterContext>(
  inner: ValueAdapter<TValue, TValue, TContext>,
): ValueAdapter<TValue | null | undefined, TValue | null | undefined, TContext> {
  const adapter: ValueAdapter<TValue | null | undefined, TValue | null | undefined, TContext> = {
    in(value, ctx): TValue | Promise<TValue | null | undefined> | null | undefined {
      if (value == null) {
        return value;
      }

      return inner.in(value as TValue, ctx) as TValue | Promise<TValue | null | undefined>;
    },
    out(value, ctx): TValue | Promise<TValue | null | undefined> | null | undefined {
      if (value == null) {
        return value;
      }

      return inner.out(value as TValue, ctx) as TValue | Promise<TValue | null | undefined>;
    },
    validate(value, ctx) {
      if (value == null || !inner.validate) {
        return { valid: true };
      }

      return inner.validate(value, ctx);
    },
  };

  const syncInner = inner as SyncMarkedAdapter;
  return markSyncAdapter(adapter, {
    in: syncInner.__syncIn ? true : undefined,
    out: syncInner.__syncOut ? true : undefined,
  });
}

export function actionAdapter(
  transformInAction?: ActionSchema | ActionSchema[],
  transformOutAction?: ActionSchema | ActionSchema[],
  validateAction?: ActionSchema | ActionSchema[],
  dispatch?: AdapterDispatch,
): ValueAdapter<unknown, unknown, AdapterActionContext> {
  return {
    async in(value, ctx) {
      if (!transformInAction) {
        return value;
      }

      const result = await runAction(
        transformInAction,
        {
          value,
          readOnly: ctx.readOnly,
          ...(ctx.name !== undefined ? { name: ctx.name } : {}),
        },
        ctx,
        dispatch,
      );

      if (!result?.ok) {
        throw createActionFailureError('transformIn', result);
      }

      return getActionResultValue(result, value);
    },

    async out(value, ctx) {
      if (!transformOutAction) {
        return value;
      }

      const result = await runAction(
        transformOutAction,
        {
          value,
          originalValue: ctx.originalValue,
          readOnly: ctx.readOnly,
          ...(ctx.name !== undefined ? { name: ctx.name } : {}),
        },
        ctx,
        dispatch,
      );

      if (!result?.ok) {
        throw createActionFailureError('transformOut', result);
      }

      return getActionResultValue(result, value);
    },

    async validate(value, ctx) {
      if (!validateAction) {
        return { valid: true };
      }

      try {
        const result = await runAction(
          validateAction,
          {
            value,
            originalValue: ctx.originalValue,
            ...(ctx.name !== undefined ? { name: ctx.name } : {}),
          },
          ctx,
          dispatch,
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



// --- Action-backed adapter composition (cq-4 Phase 2) -----------------------

export type ValueAdaptationAction = ActionSchema | ActionSchema[] | CompiledActionProgram;

export function isCompiledActionProgram(value: unknown): value is CompiledActionProgram {
  return Boolean(
    value && typeof value === 'object' && 'nodes' in value && Array.isArray((value as { nodes?: unknown }).nodes),
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

async function runValueAdaptationAction(
  actionSchema: ValueAdaptationAction | undefined,
  payload: Record<string, unknown>,
  runner: (actionSchema: ValueAdaptationAction, ctx?: AdapterActionContext) => Promise<ActionResult>,
  ctx?: AdapterActionContext,
): Promise<ActionResult | undefined> {
  if (!actionSchema) {
    return undefined;
  }

  return runner(
    isCompiledActionProgram(actionSchema)
      ? cloneCompiledActionProgramWithPayload(actionSchema, payload)
      : injectDefaultArgs(actionSchema, payload),
    ctx,
  );
}

export interface ActionBackedAdapterOptions {
  transformInAction?: ValueAdaptationAction;
  transformOutAction?: ValueAdaptationAction;
  validateAction?: ValueAdaptationAction;
  runner: (actionSchema: ValueAdaptationAction, ctx?: AdapterActionContext) => Promise<ActionResult>;
  /**
   * Message seam (flux-core stays dependency-free — no i18n here). Default
   * emits plain English messages with `cause`; hosts inject their own
   * localization (form-advanced passes the flux.form.validationFailedDetail
   * formatter).
   */
  toValidationIssues?: (error: unknown) => AdapterValidationIssue[];
}

/**
 * Composition of transformIn/transformOut/validate action pipelines over a
 * host-provided runner. Supports compiled action programs (payload is cloned
 * into every node); falls through to {@link actionAdapter} for plain schema
 * inputs. This is the detail-view adaptation seam (cq-4 Phase 2).
 */
export function createActionBackedAdapter(options: ActionBackedAdapterOptions): ValueAdapter<unknown, unknown, AdapterActionContext> {
  const {
    transformInAction,
    transformOutAction,
    validateAction,
    runner,
    toValidationIssues: formatIssues = toValidationIssues,
  } = options;

  if (
    !isCompiledActionProgram(transformInAction) &&
    !isCompiledActionProgram(transformOutAction) &&
    !isCompiledActionProgram(validateAction)
  ) {
    return actionAdapter(
      transformInAction as ActionSchema | ActionSchema[] | undefined,
      transformOutAction as ActionSchema | ActionSchema[] | undefined,
      validateAction as ActionSchema | ActionSchema[] | undefined,
      // runner seam: core's dispatch path resolves the runner from ctx at call
      // time and forwards (scope, form); the composition's runner ignores ctx.
      async (actionSchema) => runner(actionSchema as ValueAdaptationAction),
    );
  }

  return {
    async in(value, ctx) {
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
        ctx,
      );

      if (!result?.ok) {
        throw createActionFailureError('transformIn', result);
      }

      return getActionResultValue(result, value);
    },

    async out(value, ctx) {
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
        ctx,
      );

      if (!result?.ok) {
        throw createActionFailureError('transformOut', result);
      }

      return getActionResultValue(result, value);
    },

    async validate(value, ctx) {
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
            issues: formatIssues(result?.error),
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
          issues: formatIssues(error),
        };
      }
    },
  };
}
