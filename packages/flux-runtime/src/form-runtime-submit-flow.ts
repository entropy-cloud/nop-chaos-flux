import type {
  ApiSchema,
  FormValidationResult,
  ValidationReason
} from '@nop-chaos/flux-core';
import { buildSubmitTouchedState, classifySubmitResult } from './form-runtime-submit';
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
  getCurrentValidation: () => import('@nop-chaos/flux-core').CompiledFormValidationModel | undefined;
  submitApiCall: (api: ApiSchema, options?: { interactionId?: string }) => Promise<import('@nop-chaos/flux-core').ActionResult>;
  validateForm: (reason?: ValidationReason) => Promise<FormValidationResult>;
}

export type { FormValidationResult };

export async function executeFormSubmit(
  input: SubmitFormInput,
  api?: ApiSchema,
  options?: { interactionId?: string }
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
    submitApiCall,
    validateForm
  } = input;

  if (getIsSubmitting()) {
    return {
      ok: false,
      cancelled: true,
      error: new Error('Submit already in progress')
    };
  }

  if (sharedState.lifecycleState === 'disposed') {
    return { ok: false, cancelled: true, error: new Error('Form is disposed') };
  }

  setIsSubmitting(true);

  const { store, runtimeFieldRegistrations } = sharedState;
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
  const nextTouched = buildSubmitTouchedState({
    touched: store.getState().touched,
    validation: currentValidation,
    runtimeFieldRegistrations: Array.from(runtimeFieldRegistrations.values()).map((e) => e.registration),
    defaultValidationTriggers
  });

  if (nextTouched !== store.getState().touched) {
    store.batchUpdate({ touched: nextTouched });
  }

  ownerRuntime.supersedeLowerPriorityWork();

  const validation = (!currentValidation && runtimeFieldRegistrations.size === 0)
    ? { ok: true, errors: [], fieldErrors: {} } as FormValidationResult
    : await validateForm('submit');

  const lifecycleHandlers = getLifecycleHandlers();

  if (!validation.ok) {
    const validationFailure = {
      ok: false,
      error: validation.errors,
      data: validation.fieldErrors
    } as const;

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

  for (const contract of sharedState.childContracts.values()) {
    if (contract.mode === 'recurse-submit' && contract.active) {
      contract.unregister();
    }
  }

  const submitLifecycleAction = lifecycleHandlers?.submitAction;
  const executeSubmit = submitLifecycleAction
    ? () => submitLifecycleAction(options)
    : api
      ? () => submitApiCall(api, options)
      : () => Promise.resolve({ ok: true, data: store.getState().values });

  try {
    const result = await executeSubmit();
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
  } finally {
    setIsSubmitting(false);

    if (submittingTimer !== undefined) {
      clearTimeout(submittingTimer);
      submittingTimer = undefined;
    }

    store.setSubmitting(false);
  }
}
