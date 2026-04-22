import type { ActionContext, ActionResult, ActionSchema } from './types/actions';
import type { FormRuntime } from './types/runtime';
import type { SchemaValue } from './types/schema';
import type { ScopeRef } from './types/scope';

export interface AdapterContext {
  name?: string;
  readOnly: boolean;
}

export type AdapterDispatch = (
  action: ActionSchema | ActionSchema[],
  ctx?: Partial<ActionContext>
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
}

export interface ValueAdapter<TExternal = unknown, TInternal = unknown, TContext extends AdapterContext = AdapterContext> {
  in(value: TExternal, ctx: TContext): TInternal | Promise<TInternal>;
  out(value: TInternal, ctx: TContext): TExternal | Promise<TExternal>;
  validate?(value: TInternal, ctx: TContext): AdapterValidationResult | Promise<AdapterValidationResult>;
}

type SyncMarkedAdapter = {
  __syncIn?: true;
  __syncOut?: true;
};

function markSyncAdapter<TAdapter extends ValueAdapter>(
  adapter: TAdapter,
  options: { in?: true; out?: true } = { in: true, out: true }
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

function injectDefaultArgs(
  actionSchema: ActionSchema | ActionSchema[],
  payload: Record<string, unknown>
): ActionSchema | ActionSchema[] {
  const schemaPayload = payload as Record<string, SchemaValue>;

  function supportsArgsInjection(action: ActionSchema) {
    return action.action !== 'closeDialog'
      && action.action !== 'closeDrawer'
      && action.action !== 'refreshTable'
      && action.action !== 'refreshSource';
  }

  if (Array.isArray(actionSchema)) {
    return actionSchema.map((entry) => (entry.args === undefined && supportsArgsInjection(entry)
      ? { ...entry, args: schemaPayload }
      : entry));
  }

  return actionSchema.args === undefined && supportsArgsInjection(actionSchema)
    ? { ...actionSchema, args: schemaPayload }
    : actionSchema;
}

function toValidationIssues(error: unknown): AdapterValidationIssue[] {
  return [{
    level: 'error',
    message: String(error ?? 'Validation failed')
  }];
}

function getActionResultValue(result: ActionResult, fallback: unknown) {
  return result.data !== undefined ? result.data : fallback;
}

function resolveDispatch(ctx: AdapterActionContext, dispatch?: AdapterDispatch) {
  return dispatch ?? ctx.dispatch;
}

async function runAction(
  actionSchema: ActionSchema | ActionSchema[] | undefined,
  payload: Record<string, unknown>,
  ctx: AdapterActionContext,
  dispatch?: AdapterDispatch
): Promise<ActionResult | undefined> {
  if (!actionSchema) {
    return undefined;
  }

  const runner = resolveDispatch(ctx, dispatch);
  if (!runner) {
    return {
      ok: false,
      error: 'Missing adapter dispatch'
    };
  }

  return runner(injectDefaultArgs(actionSchema, payload), {
    scope: ctx.scope,
    form: ctx.form ?? undefined
  });
}

export function identityAdapter<TValue = unknown>(): ValueAdapter<TValue, TValue> {
  return markSyncAdapter({
    in(value) {
      return value;
    },
    out(value) {
      return value;
    }
  });
}

export function stringAdapter(): ValueAdapter<unknown, string> {
  return markSyncAdapter({
    in(value) {
      return value == null ? '' : String(value);
    },
    out(value) {
      return value;
    }
  });
}

export function booleanStringAdapter(): ValueAdapter<unknown, boolean> {
  return markSyncAdapter({
    in(value) {
      return Boolean(value);
    },
    out(value) {
      return Boolean(value);
    }
  });
}

export function nullableAdapter<TValue, TContext extends AdapterContext = AdapterContext>(
  inner: ValueAdapter<TValue, TValue, TContext>
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
    }
  };

  const syncInner = inner as SyncMarkedAdapter;
  return markSyncAdapter(adapter, {
    in: syncInner.__syncIn ? true : undefined,
    out: syncInner.__syncOut ? true : undefined
  });
}

export function actionAdapter(
  transformInAction?: ActionSchema | ActionSchema[],
  transformOutAction?: ActionSchema | ActionSchema[],
  validateAction?: ActionSchema | ActionSchema[],
  dispatch?: AdapterDispatch
): ValueAdapter<unknown, unknown, AdapterActionContext> {
  return {
    async in(value, ctx) {
      if (!transformInAction) {
        return value;
      }

      try {
        const result = await runAction(transformInAction, {
          value,
          readOnly: ctx.readOnly,
          ...(ctx.name !== undefined ? { name: ctx.name } : {})
        }, ctx, dispatch);

        if (!result?.ok) {
          return value;
        }

        return getActionResultValue(result, value);
      } catch {
        return value;
      }
    },

    async out(value, ctx) {
      if (!transformOutAction) {
        return value;
      }

      try {
        const result = await runAction(transformOutAction, {
          value,
          originalValue: ctx.originalValue,
          readOnly: ctx.readOnly,
          ...(ctx.name !== undefined ? { name: ctx.name } : {})
        }, ctx, dispatch);

        if (!result?.ok) {
          return value;
        }

        return getActionResultValue(result, value);
      } catch {
        return value;
      }
    },

    async validate(value, ctx) {
      if (!validateAction) {
        return { valid: true };
      }

      try {
        const result = await runAction(validateAction, {
          value,
          originalValue: ctx.originalValue,
          ...(ctx.name !== undefined ? { name: ctx.name } : {})
        }, ctx, dispatch);

        if (!result?.ok) {
          return {
            valid: false,
            issues: toValidationIssues(result?.error)
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
            issues: Array.isArray(candidate.issues) ? candidate.issues : []
          };
        }

        return { valid: true };
      } catch (error) {
        return {
          valid: false,
          issues: toValidationIssues(error)
        };
      }
    }
  };
}
