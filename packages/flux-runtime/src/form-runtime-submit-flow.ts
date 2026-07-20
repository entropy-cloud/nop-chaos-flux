import type {
  FieldState,
  FormValidationResult,
  ActionResult,
  ValidationReason,
  CompiledFormValidationModel,
} from '@nop-chaos/flux-core';
import { buildSubmitTouchedState, classifySubmitResult } from './form-runtime-submit.js';
import { getCompiledValidationField } from '@nop-chaos/flux-core';
import { isAbortError } from './error-utils.js';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types.js';

export interface FormOwnerRuntimeForSubmit {
  supersedeLowerPriorityWork(): void;
}

export interface SubmitFormInput {
  sharedState: ManagedFormRuntimeSharedState;
  ownerRuntime: FormOwnerRuntimeForSubmit;
  defaultValidationTriggers: string[];
  submittingDelay: number;
  getIsSubmitting: () => boolean;
  setIsSubmitting: (value: boolean) => void;
  getLifecycleHandlers: () => import('@nop-chaos/flux-core').FormLifecycleHandlers | undefined;
  getCurrentValidation: () =>
    | import('@nop-chaos/flux-core').CompiledFormValidationModel
    | undefined;
  validateForm: (
    reason?: ValidationReason,
    options?: { signal?: AbortSignal },
  ) => Promise<FormValidationResult>;
}

export type { FormValidationResult };

function isLifecycleTransitional(state: ManagedFormRuntimeSharedState['lifecycleState']): boolean {
  return state === 'bootstrapping' || state === 'refreshing';
}

function createLifecycleBlockedSubmitResult(
  lifecycleState: ManagedFormRuntimeSharedState['lifecycleState'],
): ActionResult {
  return {
    ok: false,
    error: new Error(`Submit is blocked while form lifecycleState is "${lifecycleState}".`),
  };
}

function toSubmitFailureResult(error: unknown): ActionResult {
  if (isAbortError(error)) {
    return {
      ok: false,
      cancelled: true,
      error,
    };
  }

  return {
    ok: false,
    error,
  };
}

function extractTouchedPaths(fieldStates: Record<string, FieldState>): Record<string, boolean> {
  const touched: Record<string, boolean> = {};
  for (const [path, fs] of Object.entries(fieldStates)) {
    if (fs.touched) {
      touched[path] = true;
    }
  }
  return touched;
}

function createSubmitAbortError(reason?: unknown) {
  if (reason instanceof Error && reason.name === 'AbortError') {
    return reason;
  }

  const error = Object.assign(new Error('Submit aborted'), { name: 'AbortError' });

  if (reason !== undefined) {
    (error as Error & { cause?: unknown }).cause = reason;
  }

  return error;
}

function createSubmitAbortedResult(signal?: AbortSignal): ActionResult {
  return {
    ok: false,
    cancelled: true,
    error: createSubmitAbortError(signal?.reason),
  };
}

function attachLifecycleError(result: ActionResult, error: unknown): ActionResult {
  return {
    ...result,
    settledError:
      typeof result.settledError === 'undefined' ? error : [result.settledError, error],
  };
}

async function runFailureLifecycleHandler(
  result: ActionResult,
  handler:
    | ((
        result: ActionResult,
        options?: { interactionId?: string; signal?: AbortSignal },
      ) => Promise<ActionResult>)
    | undefined,
  options?: { interactionId?: string; signal?: AbortSignal },
): Promise<ActionResult> {
  if (!handler) {
    return result;
  }

  try {
    const nextResult = await handler(result, options);
    if (!nextResult || nextResult.ok || nextResult.cancelled) {
      return {
        ...result,
        failureHandled: true,
      };
    }

    return {
      ...result,
      failureHandled: true,
      settledError: nextResult.settledError ?? result.settledError,
    };
  } catch (error) {
    return attachLifecycleError(result, error);
  }
}

async function awaitWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    throw createSubmitAbortError(signal.reason);
  }

  return await new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(createSubmitAbortError(signal.reason));
    };

    signal.addEventListener('abort', abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
  });
}

function computeExcludedHiddenPaths(
  hiddenFields: Set<string> | undefined,
  validation: CompiledFormValidationModel | undefined,
): Set<string> {
  if (!hiddenFields || hiddenFields.size === 0) {
    return new Set();
  }

  const exclude = new Set<string>();

  for (const path of hiddenFields) {
    const field = getCompiledValidationField(validation, path);

    if (!field?.hiddenFieldPolicy.clearValueWhenHidden) {
      exclude.add(path);
    }
  }

  return exclude;
}

function excludeHiddenFieldPaths(
  obj: Record<string, unknown>,
  hiddenFields: Set<string>,
): Record<string, unknown> {
  function walk(current: unknown, path: string): unknown {
    if (current == null || typeof current !== 'object') {
      return current;
    }

    if (Array.isArray(current)) {
      return current.map((item, index) => {
        const itemPath = `${path}.${index}`;
        if (hiddenFields.has(itemPath)) {
          return undefined;
        }
        return walk(item, itemPath);
      });
    }

    const record = current as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      const childPath = path ? `${path}.${key}` : key;

      if (hiddenFields.has(childPath)) {
        continue;
      }

      const processed = walk(value, childPath);

      if (processed !== undefined) {
        result[key] = processed;
      }
    }

    return result;
  }

  return walk(obj, '') as Record<string, unknown>;
}

export async function executeFormSubmit(
  input: SubmitFormInput,
  options?: { interactionId?: string; signal?: AbortSignal },
): Promise<import('@nop-chaos/flux-core').ActionResult> {
  const {
    sharedState,
    ownerRuntime,
    defaultValidationTriggers,
    submittingDelay,
    getIsSubmitting,
    setIsSubmitting,
    getLifecycleHandlers,
    getCurrentValidation,
    validateForm,
  } = input;

  if (getIsSubmitting()) {
    return {
      ok: false,
      cancelled: true,
      error: new Error('Submit already in progress'),
    };
  }

  if (sharedState.lifecycleState === 'disposed') {
    return { ok: false, cancelled: true, error: new Error('Form is disposed') };
  }

  if (isLifecycleTransitional(sharedState.lifecycleState)) {
    return createLifecycleBlockedSubmitResult(sharedState.lifecycleState);
  }

  if (options?.signal?.aborted) {
    return createSubmitAbortedResult(options.signal);
  }

  const { store, runtimeFieldRegistrations } = sharedState;
  setIsSubmitting(true);
  store.setSubmitAttempted(true);
  let submittingTimer: ReturnType<typeof setTimeout> | undefined;

  if (submittingDelay > 0) {
    submittingTimer = setTimeout(() => {
      submittingTimer = undefined;

      if (getIsSubmitting()) {
        store.setSubmitting(true);
      }
    }, submittingDelay);
  } else {
    store.setSubmitting(true);
  }

  try {
    const currentValidation = getCurrentValidation();
    const childContractsSnapshot = Array.from(sharedState.childContracts.values()).filter(
      (contract) => contract.active,
    );
    const currentTouched = extractTouchedPaths(store.getState().fieldStates);
    const nextTouched = buildSubmitTouchedState({
      touched: currentTouched,
      validation: currentValidation,
      runtimeFieldRegistrations: Array.from(runtimeFieldRegistrations.values()).map(
        (e) => e.registration,
      ),
      defaultValidationTriggers,
    });

    if (nextTouched !== currentTouched) {
      const fieldStates = store.getState().fieldStates;
      const nextFieldStates = { ...fieldStates };

      for (const path of Object.keys(nextTouched)) {
        if (!currentTouched[path]) {
          nextFieldStates[path] = { ...nextFieldStates[path], touched: true };
        }
      }

      store.batchUpdate({ fieldStates: nextFieldStates });
    }

    ownerRuntime.supersedeLowerPriorityWork();

    const validation =
      !currentValidation && runtimeFieldRegistrations.size === 0
        ? ({ ok: true, errors: [], fieldErrors: {} } as FormValidationResult)
        : await validateForm('submit', { signal: options?.signal });

    const lifecycleHandlers = getLifecycleHandlers();

    if (!validation.ok) {
      const validationFailure = {
        ok: false,
        error: validation.errors,
        data: validation.fieldErrors,
      } as const;

      if (options?.signal?.aborted) {
        return createSubmitAbortedResult(options.signal);
      }

      return runFailureLifecycleHandler(validationFailure, lifecycleHandlers?.onValidateError, options);
    }

    const childValidationPromises: Promise<import('@nop-chaos/flux-core').ValidationResult>[] = [];
    const summaryGatePromises: Array<
      Promise<{
        childOwnerId: string;
        result: import('@nop-chaos/flux-core').ValidationResult;
      }>
    > = [];
    const summaryGateBlockers: string[] = [];
    for (const contract of childContractsSnapshot) {
      if (contract.mode === 'recurse-submit') {
        childValidationPromises.push(awaitWithAbort(contract.triggerValidation(), options?.signal));
      } else if (contract.mode === 'summary-gate') {
        const childState = contract.getState();
        if (!childState.ready || childState.validating || !childState.valid) {
          summaryGateBlockers.push(contract.childOwnerId);
          continue;
        }

        summaryGatePromises.push(
          Promise.resolve({
            childOwnerId: contract.childOwnerId,
            result: {
              ok: childState.valid,
              errors: childState.valid
                ? []
                : [
                    {
                      path: contract.childOwnerId,
                      message: `Submit blocked by child scope: ${contract.childOwnerId}`,
                      rule: 'required',
                      sourceKind: 'external',
                    },
                  ],
            },
          }),
        );
      }
    }

    if (summaryGateBlockers.length > 0) {
      const summaryGateFailure = {
        ok: false,
        error: [new Error(`Submit blocked by child scope: ${summaryGateBlockers.join(', ')}`)],
        data: {},
      } as const;

      return runFailureLifecycleHandler(summaryGateFailure, lifecycleHandlers?.onValidateError, options);
    }

    if (summaryGatePromises.length > 0) {
      const summaryGateResults = await awaitWithAbort(
        Promise.all(summaryGatePromises),
        options?.signal,
      );
      const failingChildren = summaryGateResults.filter(({ result }) => !result.ok);
      if (failingChildren.length > 0) {
        const childErrors = failingChildren.flatMap(({ result }) => result.errors);
        const childValidationFailure = {
          ok: false,
          error: childErrors,
          data: {},
        } as const;

        return runFailureLifecycleHandler(
          childValidationFailure,
          lifecycleHandlers?.onValidateError,
          options,
        );
      }
    }

    if (childValidationPromises.length > 0) {
      const childResults = await awaitWithAbort(Promise.all(childValidationPromises), options?.signal);
      const childErrors = childResults.flatMap((r) => r.errors);
      if (childErrors.length > 0) {
        const childValidationFailure = {
          ok: false,
          error: childErrors,
          data: {},
        } as const;

        return runFailureLifecycleHandler(
          childValidationFailure,
          lifecycleHandlers?.onValidateError,
          options,
        );
      }
    }

    const submitLifecycleAction = lifecycleHandlers?.submitAction;
    const executeSubmit = submitLifecycleAction
      ? () => submitLifecycleAction(options)
      : () => {
          const rawValues = store.getState().values;
          const excludedPaths = computeExcludedHiddenPaths(
            sharedState.hiddenFields,
            currentValidation,
          );
          const data = excludedPaths.size > 0
            ? excludeHiddenFieldPaths(rawValues, excludedPaths)
            : rawValues;
          return Promise.resolve({ ok: true, data });
        };

    if (options?.signal?.aborted) {
      return createSubmitAbortedResult(options.signal);
    }

    const result = await awaitWithAbort(executeSubmit(), options?.signal);

    if (options?.signal?.aborted) {
      return createSubmitAbortedResult(options.signal);
    }

    const resultClass = classifySubmitResult(result);

    if (resultClass === 'success') {
      return lifecycleHandlers?.onSubmitSuccess
        ? await lifecycleHandlers.onSubmitSuccess(result, options)
        : result;
    }

    if (resultClass === 'failure') {
      return runFailureLifecycleHandler(result, lifecycleHandlers?.onSubmitError, options);
    }

    return result;
  } catch (error) {
    const failureResult = toSubmitFailureResult(error);

    if (failureResult.cancelled) {
      return failureResult;
    }

    return runFailureLifecycleHandler(failureResult, getLifecycleHandlers()?.onSubmitError, options);
  } finally {
    setIsSubmitting(false);

    if (submittingTimer !== undefined) {
      clearTimeout(submittingTimer);
      submittingTimer = undefined;
    }

    store.setSubmitting(false);
  }
}
