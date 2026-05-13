import type {
  FieldState,
  FormValidationResult,
  ActionResult,
  ValidationReason,
} from '@nop-chaos/flux-core';
import { buildSubmitTouchedState, classifySubmitResult } from './form-runtime-submit.js';
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
  validateForm: (reason?: ValidationReason) => Promise<FormValidationResult>;
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

function createSubmitAbortError() {
  return Object.assign(new Error('Submit aborted'), { name: 'AbortError' });
}

async function awaitWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    throw createSubmitAbortError();
  }

  return await new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(createSubmitAbortError());
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
    return { ok: false, cancelled: true, error: new Error('Submit aborted') };
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
        : await validateForm('submit');

    const lifecycleHandlers = getLifecycleHandlers();

    if (!validation.ok) {
      const validationFailure = {
        ok: false,
        error: validation.errors,
        data: validation.fieldErrors,
      } as const;

      if (options?.signal?.aborted) {
        return { ok: false, cancelled: true, error: new Error('Submit aborted') };
      }

      const lifecycleResult = lifecycleHandlers?.onValidateError
        ? await lifecycleHandlers.onValidateError(validationFailure, options)
        : undefined;

      return lifecycleResult ?? validationFailure;
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
          awaitWithAbort(contract.triggerValidation(), options?.signal).then((result) => ({
            childOwnerId: contract.childOwnerId,
            result,
          })),
        );
      }
    }

    if (summaryGateBlockers.length > 0) {
      const summaryGateFailure = {
        ok: false,
        error: [new Error(`Submit blocked by child scope: ${summaryGateBlockers.join(', ')}`)],
        data: {},
      } as const;

      return lifecycleHandlers?.onValidateError
        ? await lifecycleHandlers.onValidateError(summaryGateFailure, options)
        : summaryGateFailure;
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

        return lifecycleHandlers?.onValidateError
          ? await lifecycleHandlers.onValidateError(childValidationFailure, options)
          : childValidationFailure;
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

        return lifecycleHandlers?.onValidateError
          ? await lifecycleHandlers.onValidateError(childValidationFailure, options)
          : childValidationFailure;
      }
    }

    const submitLifecycleAction = lifecycleHandlers?.submitAction;
    const executeSubmit = submitLifecycleAction
      ? () => submitLifecycleAction(options)
      : () => Promise.resolve({ ok: true, data: store.getState().values });

    if (options?.signal?.aborted) {
      return { ok: false, cancelled: true, error: new Error('Submit aborted') };
    }

    const result = await awaitWithAbort(executeSubmit(), options?.signal);

    if (options?.signal?.aborted) {
      return { ok: false, cancelled: true, error: new Error('Submit aborted') };
    }

    const resultClass = classifySubmitResult(result);

    if (resultClass === 'success') {
      return lifecycleHandlers?.onSubmitSuccess
        ? await lifecycleHandlers.onSubmitSuccess(result, options)
        : result;
    }

    if (resultClass === 'failure') {
      return lifecycleHandlers?.onSubmitError
        ? await lifecycleHandlers.onSubmitError(result, options)
        : result;
    }

    return result;
  } catch (error) {
    const failureResult = toSubmitFailureResult(error);

    if (failureResult.cancelled) {
      return failureResult;
    }

    return getLifecycleHandlers()?.onSubmitError
      ? await getLifecycleHandlers()?.onSubmitError?.(failureResult, options) ?? failureResult
      : failureResult;
  } finally {
    setIsSubmitting(false);

    if (submittingTimer !== undefined) {
      clearTimeout(submittingTimer);
      submittingTimer = undefined;
    }

    store.setSubmitting(false);
  }
}
