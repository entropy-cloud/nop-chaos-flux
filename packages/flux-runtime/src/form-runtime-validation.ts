import type {
  CompiledFormValidationField,
  FieldState,
  FormValidationResult,
  RuntimeFieldRegistration,
  ValidationError,
  ValidationReason,
  ValidationResult,
} from '@nop-chaos/flux-core';
import {
  getCompiledValidationField,
  hasCompiledValidationNodes,
  validationErrorsEqual,
} from '@nop-chaos/flux-core';
import { findRuntimeRegistration, syncRegisteredFieldValue } from './form-runtime-registration.js';
import {
  collectSubtreeNodePaths,
  collectSubtreeValidationTargets,
} from './form-runtime-subtree.js';
import type { FormRuntimeValidationState } from './form-runtime-types.js';
import { scheduleDebounce } from '@nop-chaos/flux-core';
import { normalizeRuntimeValidationErrors } from './validation/index.js';
import { isPathHiddenByOwner } from './form-runtime-field-ops.js';
import { overlayFieldErrorsWithExternal } from './form-runtime-owner-external-errors.js';

function shouldValidateHiddenRuntimeRegistration(
  sharedState: FormRuntimeValidationState,
  registration?: RuntimeFieldRegistration,
): boolean {
  if (registration?.hiddenFieldPolicy?.validateWhenHidden != null) {
    return registration.hiddenFieldPolicy.validateWhenHidden === true;
  }

  return sharedState.inputValue.validation?.defaultHiddenFieldPolicy?.validateWhenHidden === true;
}

function createValidationResult(errors: ValidationError[]): ValidationResult {
  return {
    ok: errors.length === 0,
    errors,
  };
}

function createBlockedValidationResult(
  lifecycleState: FormRuntimeValidationState['lifecycleState'],
): ValidationResult {
  return {
    ok: false,
    errors: [
      {
        path: '',
        ownerPath: '',
        rule: 'async',
        message: `Validation is blocked while owner lifecycleState is "${lifecycleState}".`,
        sourceKind: 'form',
      },
    ],
  };
}

function isLifecycleTransitional(state: FormRuntimeValidationState): boolean {
  return state.lifecycleState === 'bootstrapping' || state.lifecycleState === 'refreshing';
}

export async function waitForActiveLifecycle(sharedState: FormRuntimeValidationState): Promise<boolean> {
  if (sharedState.lifecycleState === 'disposed') {
    return false;
  }

  if (!isLifecycleTransitional(sharedState)) {
    return true;
  }

  await new Promise<void>((resolve) => {
    sharedState.lifecycleWaiters.add(resolve);
  });

  return sharedState.lifecycleState === 'active';
}

const VALIDATION_CANCELLED = Symbol('validation-cancelled');

function isPathHidden(sharedState: FormRuntimeValidationState, path: string): boolean {
  return isPathHiddenByOwner(sharedState as FormRuntimeValidationState & Parameters<typeof isPathHiddenByOwner>[0], path);
}

function setPathErrors(
  sharedState: FormRuntimeValidationState,
  path: string,
  errors: ValidationError[],
) {
  sharedState.store.setPathErrors(path, errors);
}

function commitPathValidationState(input: {
  sharedState: FormRuntimeValidationState;
  path: string;
  errors: ValidationError[];
  validating?: boolean;
}) {
  const fieldStates = input.sharedState.store.getState().fieldStates;
  const existing = fieldStates[input.path];

  const nextFieldState: FieldState = { ...existing };

  if (input.errors.length > 0) {
    if (!validationErrorsEqual(existing?.errors, input.errors)) {
      nextFieldState.errors = input.errors;
    }
  } else {
    delete nextFieldState.errors;
  }

  if (typeof input.validating === 'boolean') {
    if (input.validating) {
      nextFieldState.validating = true;
    } else {
      delete nextFieldState.validating;
    }
  }

  const nextFieldStates =
    Object.keys(nextFieldState).length > 0
      ? { ...fieldStates, [input.path]: nextFieldState }
      : (() => {
          const next = { ...fieldStates };
          delete next[input.path];
          return next;
        })();

  if (nextFieldStates !== fieldStates) {
    input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });
  }
}

export function cancelValidationDebounce(sharedState: FormRuntimeValidationState, path: string) {
  const pending = sharedState.pendingValidationDebounces.get(path);
  const abortController = sharedState.validationAbortControllers.get(path);
  const ownerId = `validation:${sharedState.scope.id}:${path}`;

  if (abortController) {
    abortController.abort();
    sharedState.validationAbortControllers.delete(path);
    sharedState.validationAsyncGovernance.invalidateCurrentRun(ownerId);
  }

  if (!pending) {
    return;
  }

  clearTimeout(pending.timer);
  pending.resolve(false);
  sharedState.pendingValidationDebounces.delete(path);
}

export function cancelAllValidationDebounces(sharedState: FormRuntimeValidationState) {
  for (const path of Array.from(sharedState.pendingValidationDebounces.keys())) {
    cancelValidationDebounce(sharedState, path);
  }
}

export function waitForValidationDebounce(
  sharedState: FormRuntimeValidationState,
  path: string,
  debounce: number | undefined,
  runId: number,
  reason?: ValidationReason,
): Promise<boolean> {
  const isHighPriority = reason === 'submit' || reason === 'commit';

  if (isHighPriority || !debounce || debounce <= 0) {
    return Promise.resolve(sharedState.validationRuns.get(path) === runId);
  }

  return scheduleDebounce(sharedState.pendingValidationDebounces, path, debounce, () => {
    return sharedState.validationRuns.get(path) === runId;
  });
}

async function validateRuntimeRegistrationRoot(
  sharedState: FormRuntimeValidationState,
  path: string,
  registration: RuntimeFieldRegistration,
): Promise<ValidationResult> {
  const capturedGeneration = sharedState.modelGeneration;
  const runId = (sharedState.validationRuns.get(path) ?? 0) + 1;
  sharedState.validationRuns.set(path, runId);
  const runtimeErrors =
    normalizeRuntimeValidationErrors(await registration.validate?.(), registration, path) ?? [];
  if (
    sharedState.validationRuns.get(path) !== runId ||
    sharedState.modelGeneration !== capturedGeneration
  ) {
    return createValidationResult([]);
  }
  const nextErrors = overlayFieldErrorsWithExternal(sharedState, path, runtimeErrors);
  commitPathValidationState({
    sharedState,
    path,
    errors: nextErrors,
  });
  return createValidationResult(nextErrors);
}

async function validateRuntimeRegistrationChild(
  sharedState: FormRuntimeValidationState,
  path: string,
  registration: RuntimeFieldRegistration,
  childPath: string,
): Promise<ValidationResult> {
  const capturedGeneration = sharedState.modelGeneration;
  const runId = (sharedState.validationRuns.get(childPath) ?? 0) + 1;
  sharedState.validationRuns.set(childPath, runId);
  const runtimeErrors =
    normalizeRuntimeValidationErrors(
      await registration.validateChild?.(childPath),
      registration,
      path,
      childPath,
    ) ?? [];
  if (
    sharedState.validationRuns.get(childPath) !== runId ||
    sharedState.modelGeneration !== capturedGeneration
  ) {
    return createValidationResult([]);
  }
  const nextErrors = overlayFieldErrorsWithExternal(sharedState, childPath, runtimeErrors);
  commitPathValidationState({
    sharedState,
    path: childPath,
    errors: nextErrors,
  });
  return createValidationResult(nextErrors);
}

async function collectRuntimeRegistrationChildErrorsForPath(
  sharedState: FormRuntimeValidationState,
  path: string,
  runtimeRegistration: RuntimeFieldRegistration | undefined,
  runtimeTarget: ReturnType<typeof findRuntimeRegistration>,
): Promise<ValidationError[]> {
  if (!runtimeRegistration || !runtimeTarget.childPath) {
    return [];
  }

  return (
    normalizeRuntimeValidationErrors(
      await runtimeRegistration.validateChild?.(runtimeTarget.childPath),
      runtimeRegistration,
      path,
      runtimeTarget.childPath,
    ) ?? []
  );
}

async function validateCompiledField(
  sharedState: FormRuntimeValidationState,
  path: string,
  field: CompiledFormValidationField,
  reason?: ValidationReason,
  options?: { signal?: AbortSignal },
): Promise<ValidationResult> {
  const runtimeTarget = findRuntimeRegistration(sharedState, path);
  const runtimeRegistration = runtimeTarget.entry?.registration;
  const syncedRuntimeValue = syncRegisteredFieldValue(sharedState, path);
  const capturedGeneration = sharedState.modelGeneration;
  const runId = (sharedState.validationRuns.get(path) ?? 0) + 1;
  sharedState.validationRuns.set(path, runId);
  sharedState.validationAbortControllers.get(path)?.abort();
  sharedState.validationAbortControllers.delete(path);
  const value = syncedRuntimeValue ?? sharedState.scope.get(path);
  const errors: ValidationError[] = [];
  const hasAsyncRules = field.rules.some((compiledRule) => compiledRule.rule.kind === 'async');
  let finalErrors: ValidationError[] = [];
  const validationRun = hasAsyncRules
    ? sharedState.validationAsyncGovernance.beginRun({
        ownerKind: 'validation',
        ownerId: `validation:${sharedState.scope.id}:${path}`,
        scopeId: sharedState.scope.id,
        cause: reason ?? 'manual',
      })
    : undefined;

  const validatingDelay = sharedState.inputValue.validatingDelay ?? 0;
  let validatingTimer: ReturnType<typeof setTimeout> | undefined;
  let validationAbortController: AbortController | undefined;
  let detachAbortListener: (() => void) | undefined;

  if (hasAsyncRules) {
    validationAbortController = new AbortController();
    sharedState.validationAbortControllers.set(path, validationAbortController);

    if (options?.signal) {
      if (options.signal.aborted) {
        validationAbortController.abort();
      } else {
        const abortValidation = () => validationAbortController?.abort();
        options.signal.addEventListener('abort', abortValidation, { once: true });
        detachAbortListener = () => options.signal?.removeEventListener('abort', abortValidation);
      }
    }

    if (validatingDelay > 0) {
      validatingTimer = setTimeout(() => {
        validatingTimer = undefined;

        if (
          sharedState.validationRuns.get(path) === runId &&
          sharedState.modelGeneration === capturedGeneration
        ) {
          sharedState.store.setValidating(path, true);
        }
      }, validatingDelay);
    } else {
      sharedState.store.setValidating(path, true);
    }
  }

  try {
    for (const compiledRule of field.rules) {
      const rule = compiledRule.rule;

      if (rule.kind === 'async') {
        const shouldRun = await waitForValidationDebounce(
          sharedState,
          path,
          rule.debounce,
          runId,
          reason,
        );

        if (!shouldRun) {
          throw VALIDATION_CANCELLED;
        }

        if (sharedState.modelGeneration !== capturedGeneration) {
          throw VALIDATION_CANCELLED;
        }

        const asyncError = await sharedState.inputValue.executeValidationRule(
          compiledRule,
          rule,
          field,
          sharedState.scope,
          validationAbortController?.signal,
        );

        if (asyncError) {
          errors.push(asyncError);
        }

        continue;
      }

      const syncError = sharedState.inputValue.validateRule(
        compiledRule,
        value,
        field,
        sharedState.scope,
      );

      if (syncError) {
        errors.push(syncError);
      }

      if (hasAsyncRules) {
        finalErrors = overlayFieldErrorsWithExternal(sharedState, path, errors);
        commitPathValidationState({
          sharedState,
          path,
          errors: finalErrors,
          validating: true,
        });
      }
    }

    const runtimeChildErrors = await collectRuntimeRegistrationChildErrorsForPath(
      sharedState,
      path,
      runtimeRegistration,
      runtimeTarget,
    );

    if (runtimeChildErrors.length > 0) {
      errors.push(...runtimeChildErrors);
    }

    if (runtimeRegistration?.validate) {
      const runtimeErrors = normalizeRuntimeValidationErrors(
        await runtimeRegistration.validate(),
        runtimeRegistration,
        path,
      );

      if (runtimeErrors.length > 0) {
        errors.push(...runtimeErrors);
      }
    }

    if (
      sharedState.validationRuns.get(path) !== runId ||
      sharedState.modelGeneration !== capturedGeneration
    ) {
      finalErrors = [];
      if (validationRun) {
        sharedState.validationAsyncGovernance.settleRun(validationRun, { outcome: 'succeeded' });
      }
      return createValidationResult([]);
    }

    finalErrors = overlayFieldErrorsWithExternal(sharedState, path, errors);

    if (!hasAsyncRules) {
      setPathErrors(sharedState, path, finalErrors);
    }

    if (validationRun) {
      sharedState.validationAsyncGovernance.settleRun(validationRun, { outcome: 'succeeded' });
    }

    return createValidationResult(finalErrors);
  } catch (error) {
    if (error === VALIDATION_CANCELLED) {
      if (validationRun) {
        sharedState.validationAsyncGovernance.settleRun(validationRun, {
          outcome: 'cancelled',
          cancelled: true,
        });
      }
      throw error;
    }

    const normalizedError =
      error instanceof Error ? error : new Error(String(error), { cause: error });
    if (validationRun) {
      sharedState.validationAsyncGovernance.settleRun(validationRun, {
        outcome: 'failed',
        error: normalizedError,
      });
    }

    throw normalizedError;
  } finally {
    if (validatingTimer !== undefined) {
      clearTimeout(validatingTimer);
      validatingTimer = undefined;
    }

    detachAbortListener?.();

    if (
      validationAbortController &&
      sharedState.validationAbortControllers.get(path) === validationAbortController
    ) {
      sharedState.validationAbortControllers.delete(path);
    }

    if (
      hasAsyncRules &&
      sharedState.validationRuns.get(path) === runId &&
      sharedState.modelGeneration === capturedGeneration
    ) {
      commitPathValidationState({
        sharedState,
        path,
        errors: finalErrors,
        validating: false,
      });
    }
  }
}

export async function validatePath(
  sharedState: FormRuntimeValidationState,
  path: string,
  reason?: ValidationReason,
  options?: { signal?: AbortSignal },
): Promise<ValidationResult> {
  if (sharedState.lifecycleState === 'disposed') {
    return createBlockedValidationResult(sharedState.lifecycleState);
  }

  if (isLifecycleTransitional(sharedState)) {
    const activated = await waitForActiveLifecycle(sharedState);

    if (!activated) {
      return createBlockedValidationResult(sharedState.lifecycleState);
    }
  }

  const field = getCompiledValidationField(sharedState.inputValue.validation, path);
  const runtimeTarget = findRuntimeRegistration(sharedState, path);
  const runtimeRegistration = runtimeTarget.entry?.registration;

  if (!field && !runtimeRegistration) {
    return createValidationResult([]);
  }

  if (field && !field.hiddenFieldPolicy.validateWhenHidden) {
    const isHidden = isPathHidden(sharedState, path);
    if (isHidden) {
      commitPathValidationState({ sharedState, path, errors: [] });
      return createValidationResult([]);
    }
  }

  if (!field && runtimeRegistration) {
    const isHidden = isPathHidden(sharedState, path);
    if (isHidden && !shouldValidateHiddenRuntimeRegistration(sharedState, runtimeRegistration)) {
      commitPathValidationState({ sharedState, path, errors: [] });
      return createValidationResult([]);
    }
  }

  if (!field && runtimeTarget.childPath && runtimeRegistration?.validateChild) {
    return validateRuntimeRegistrationChild(
      sharedState,
      path,
      runtimeRegistration,
      runtimeTarget.childPath,
    );
  }

  if (!field && runtimeRegistration?.validate) {
    return validateRuntimeRegistrationRoot(sharedState, path, runtimeRegistration);
  }

  if (!field) {
    return createValidationResult([]);
  }

  try {
    return await validateCompiledField(sharedState, path, field, reason, options);
  } catch (error) {
    if (error === VALIDATION_CANCELLED) {
      return sharedState.lifecycleState === 'active'
        ? createValidationResult([])
        : createBlockedValidationResult(sharedState.lifecycleState);
    }

    throw error;
  }
}

export async function validateSubtreeByNode(
  sharedState: FormRuntimeValidationState,
  path: string,
  reason?: ValidationReason,
): Promise<FormValidationResult | undefined> {
  if (!hasCompiledValidationNodes(sharedState.inputValue.validation)) {
    return undefined;
  }

  const nodeTargets = collectSubtreeNodePaths(sharedState, path);

  if (nodeTargets.length === 0) {
    return undefined;
  }

  const remainingRuntimeTargets = new Set(collectSubtreeValidationTargets(sharedState, path));
  const errors: ValidationError[] = [];
  const fieldErrors: Record<string, ValidationError[]> = {};

  for (const targetPath of nodeTargets) {
    remainingRuntimeTargets.delete(targetPath);
    const result = await validatePath(sharedState, targetPath, reason);

    if (!result.ok) {
      fieldErrors[targetPath] = result.errors;
      errors.push(...result.errors);
    }
  }

  for (const targetPath of remainingRuntimeTargets) {
    const result = await validatePath(sharedState, targetPath, reason);

    if (!result.ok) {
      fieldErrors[targetPath] = result.errors;
      errors.push(...result.errors);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    fieldErrors,
  };
}
