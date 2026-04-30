import type {
  FieldState,
  FormValidationResult,
  ActionResult,
  ValidationReason,
} from '@nop-chaos/flux-core';
import { buildSubmitTouchedState, classifySubmitResult } from './form-runtime-submit';
import { isAbortError } from './error-utils';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';

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

  const currentValidation = getCurrentValidation();
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

    setIsSubmitting(false);

    if (submittingTimer !== undefined) {
      clearTimeout(submittingTimer);
      submittingTimer = undefined;
    }

    store.setSubmitting(false);

    return lifecycleResult ?? validationFailure;
  }

  const childValidationPromises: Promise<import('@nop-chaos/flux-core').ValidationResult>[] = [];
  for (const contract of sharedState.childContracts.values()) {
    if (contract.mode === 'recurse-submit' && contract.active) {
      childValidationPromises.push(contract.triggerValidation());
    }
  }

  if (childValidationPromises.length > 0) {
    const childResults = await Promise.all(childValidationPromises);
    const childErrors = childResults.flatMap((r) => r.errors);
    if (childErrors.length > 0) {
      const childValidationFailure = {
        ok: false,
        error: childErrors,
        data: {},
      } as const;

      setIsSubmitting(false);

      if (submittingTimer !== undefined) {
        clearTimeout(submittingTimer);
        submittingTimer = undefined;
      }

      store.setSubmitting(false);

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

  try {
    const result = await executeSubmit();

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

    return lifecycleHandlers?.onSubmitError
      ? await lifecycleHandlers.onSubmitError(failureResult, options)
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
