import { validateHostMethodPayload } from './schema-diagnostics/value-shape-runtime.js';
import { type HostCapabilityContract } from './schema-diagnostics/manifest.js';
import type { ActionNamespaceProvider, ActionResult } from './types/actions.js';

/** Shape shared by designer-family host command results (`{ ok, changed, cancelled?, error?, data? }`). */
export interface HostCommandResult {
  ok: boolean;
  cancelled?: boolean;
  error?: unknown;
  data?: unknown;
}

/**
 * Normalize an unknown thrown/returned error into an `ActionResult.error`.
 * Errors pass through; strings become Errors; objects map `message`/`code`;
 * null maps to undefined; anything else stringifies with `cause` attached.
 */
export function toHostActionError(error: unknown, fallbackMessage: string): Error | undefined {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.length > 0) {
    return new Error(error);
  }

  if (error == null) {
    return undefined;
  }

  if (typeof error === 'object') {
    const message =
      typeof (error as { message?: unknown }).message === 'string' &&
      (error as { message: string }).message.length > 0
        ? (error as { message: string }).message
        : typeof (error as { code?: unknown }).code === 'string' &&
            (error as { code: string }).code.length > 0
          ? (error as { code: string }).code
          : fallbackMessage;

    return new Error(message, { cause: error });
  }

  return new Error(String(error), { cause: error });
}

export interface HostActionProviderFactoryOptions<
  TCommand extends { type: string },
  TResult extends HostCommandResult,
> {
  /** Command namespace, e.g. `spreadsheet` — also the `type:` prefix of dispatched commands. */
  namespace: string;
  methods: readonly string[];
  contracts: HostCapabilityContract['methods'];
  dispatch: (command: TCommand) => Promise<TResult>;
  toActionResult: (result: TResult) => ActionResult;
  /** Message used when an object error carries neither `message` nor `code`. */
  fallbackErrorMessage?: string;
  /** Optional observation hook (e.g. report-designer's console.warn). */
  onInvokeError?: (method: string, error: unknown) => void;
}

/**
 * Factory for the designer-family host action-provider glue: contract-table
 * validation via `validateHostMethodPayload`, `namespace:method` dispatch, and
 * result/error normalization. Replaces the per-package copies in
 * report/spreadsheet renderers (cq-2 Phase 2a); word/flow keep their own
 * invoke bodies and only share the error/validation primitives.
 */
export function createHostActionProvider<
  TCommand extends { type: string },
  TResult extends HostCommandResult,
>(
  options: HostActionProviderFactoryOptions<TCommand, TResult>,
): ActionNamespaceProvider {
  const {
    namespace,
    methods,
    contracts,
    dispatch,
    toActionResult,
    fallbackErrorMessage = 'Host command failed',
    onInvokeError,
  } = options;

  return {
    kind: 'host',
    listMethods() {
      return methods;
    },
    async invoke(method, payload) {
      const validation = validateHostMethodPayload(
        namespace,
        method,
        payload,
        contracts[method],
      );
      if (!validation.ok) {
        return {
          ok: false,
          error: validation.error,
        };
      }

      try {
        const result = await dispatch({
          type: `${namespace}:${method}`,
          ...(validation.args as Record<string, unknown>),
        } as TCommand);
        return toActionResult(result);
      } catch (error) {
        onInvokeError?.(method, error);
        const normalizedError = toHostActionError(error, fallbackErrorMessage);
        return {
          ok: false,
          error: normalizedError,
          cause: error,
        } satisfies ActionResult;
      }
    },
  };
}

/**
 * Bind a contract table to a namespace, yielding the per-package
 * `validateMethodPayload(method, payload)` helper. Shared by designer-family
 * providers that keep bespoke invoke bodies (word-editor, flow-designer —
 * cq-2 Phase 2b) instead of the full factory.
 */
export function createHostMethodValidator(
  namespace: string,
  contracts: HostCapabilityContract['methods'],
): (method: string, payload: unknown) => { ok: true; args: Record<string, unknown> } | { ok: false; error: Error } {
  return (method, payload) => {
    const validation = validateHostMethodPayload(namespace, method, payload, contracts[method]);
    return validation.ok
      ? { ok: true, args: validation.args as Record<string, unknown> }
      : validation;
  };
}
