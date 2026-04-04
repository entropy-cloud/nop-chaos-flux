import type {
  CompiledFormValidationField,
  FormValidationResult,
  ValidationError,
  ValidationResult
} from '@nop-chaos/flux-core';
import { getCompiledValidationField, hasCompiledValidationNodes } from '@nop-chaos/flux-core';
import { findRuntimeRegistration, syncRegisteredFieldValue } from './form-runtime-registration';
import { collectSubtreeNodePaths, collectSubtreePaths } from './form-runtime-subtree';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';
import { scheduleDebounce } from './utils/debounce';
import { normalizeRuntimeValidationErrors } from './validation';

function createValidationResult(errors: ValidationError[]): ValidationResult {
  return {
    ok: errors.length === 0,
    errors
  };
}

const VALIDATION_CANCELLED = Symbol('validation-cancelled');

function setPathErrors(sharedState: ManagedFormRuntimeSharedState, path: string, errors: ValidationError[]) {
  sharedState.store.setPathErrors(path, errors);
}

function buildNextBooleanPathState(
  input: Record<string, boolean>,
  path: string,
  nextValue: boolean
): Record<string, boolean> {
  if (nextValue) {
    if (input[path]) {
      return input;
    }

    return { ...input, [path]: true };
  }

  if (!input[path]) {
    return input;
  }

  const next = { ...input };
  delete next[path];
  return next;
}

function buildNextErrorPathState(
  input: Record<string, ValidationError[]>,
  path: string,
  errors: ValidationError[]
): Record<string, ValidationError[]> {
  const existing = input[path];

  if (errors.length === 0) {
    if (!existing) {
      return input;
    }

    const next = { ...input };
    delete next[path];
    return next;
  }

  if (existing === errors) {
    return input;
  }

  return { ...input, [path]: errors };
}

function commitPathValidationState(input: {
  sharedState: ManagedFormRuntimeSharedState;
  path: string;
  errors: ValidationError[];
  validating?: boolean;
}) {
  const state = input.sharedState.store.getState();
  const nextErrors = buildNextErrorPathState(state.errors, input.path, input.errors);

  if (typeof input.validating !== 'boolean') {
    if (nextErrors !== state.errors) {
      input.sharedState.store.batchUpdate({ errors: nextErrors });
    }

    return;
  }

  const nextValidating = buildNextBooleanPathState(state.validating, input.path, input.validating);

  if (nextErrors === state.errors && nextValidating === state.validating) {
    return;
  }

  input.sharedState.store.batchUpdate({
    errors: nextErrors,
    validating: nextValidating
  });
}

export function cancelValidationDebounce(sharedState: ManagedFormRuntimeSharedState, path: string) {
  const pending = sharedState.pendingValidationDebounces.get(path);

  if (!pending) {
    return;
  }

  clearTimeout(pending.timer);
  pending.resolve(false);
  sharedState.pendingValidationDebounces.delete(path);
}

export function cancelAllValidationDebounces(sharedState: ManagedFormRuntimeSharedState) {
  for (const path of Array.from(sharedState.pendingValidationDebounces.keys())) {
    cancelValidationDebounce(sharedState, path);
  }
}

export function waitForValidationDebounce(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
  debounce: number | undefined,
  runId: number
): Promise<boolean> {
  if (!debounce || debounce <= 0) {
    return Promise.resolve(sharedState.validationRuns.get(path) === runId);
  }

  return scheduleDebounce(sharedState.pendingValidationDebounces, path, debounce, () => {
    return sharedState.validationRuns.get(path) === runId;
  });
}

async function validateRuntimeRegistrationRoot(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
  registration: NonNullable<ReturnType<typeof findRuntimeRegistration>['registration']>
): Promise<ValidationResult> {
  const runtimeErrors = normalizeRuntimeValidationErrors(await registration.validate?.(), registration, path) ?? [];
  commitPathValidationState({
    sharedState,
    path,
    errors: runtimeErrors
  });
  return createValidationResult(runtimeErrors);
}

async function validateRuntimeRegistrationChild(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
  registration: NonNullable<ReturnType<typeof findRuntimeRegistration>['registration']>,
  childPath: string
): Promise<ValidationResult> {
  const runtimeErrors = normalizeRuntimeValidationErrors(
    await registration.validateChild?.(childPath),
    registration,
    path,
    childPath
  ) ?? [];
  commitPathValidationState({
    sharedState,
    path,
    errors: runtimeErrors
  });
  return createValidationResult(runtimeErrors);
}

async function validateCompiledField(
  sharedState: ManagedFormRuntimeSharedState,
  path: string,
  field: CompiledFormValidationField
): Promise<ValidationResult> {
  const runtimeRegistration = sharedState.runtimeFieldRegistrations.get(path);
  const syncedRuntimeValue = syncRegisteredFieldValue(sharedState, path);
  const runId = (sharedState.validationRuns.get(path) ?? 0) + 1;
  sharedState.validationRuns.set(path, runId);
  const value = syncedRuntimeValue ?? sharedState.scope.get(path);
  const errors: ValidationError[] = [];
  const hasAsyncRules = field.rules.some((compiledRule) => compiledRule.rule.kind === 'async');
  let finalErrors = errors;

  const validatingDelay = sharedState.inputValue.validatingDelay ?? 0;
  let validatingTimer: ReturnType<typeof setTimeout> | undefined;

  if (hasAsyncRules) {
    if (validatingDelay > 0) {
      validatingTimer = setTimeout(() => {
        validatingTimer = undefined;

        if (sharedState.validationRuns.get(path) === runId) {
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
        const shouldRun = await waitForValidationDebounce(sharedState, path, rule.debounce, runId);

        if (!shouldRun) {
          throw VALIDATION_CANCELLED;
        }

        const asyncError = await sharedState.inputValue.executeValidationRule(compiledRule, rule, field, sharedState.scope);

        if (asyncError) {
          errors.push(asyncError);
        }

        continue;
      }

      const syncError = sharedState.inputValue.validateRule(compiledRule, value, field, sharedState.scope);

      if (syncError) {
        errors.push(syncError);
      }
    }

    if (runtimeRegistration?.validate) {
      const runtimeErrors = normalizeRuntimeValidationErrors(await runtimeRegistration.validate(), runtimeRegistration, path);

      if (runtimeErrors.length > 0) {
        errors.push(...runtimeErrors);
      }
    }

    if (sharedState.validationRuns.get(path) !== runId) {
      finalErrors = [];
      return createValidationResult([]);
    }

    finalErrors = errors;

    if (!hasAsyncRules) {
      setPathErrors(sharedState, path, errors);
    }

    return createValidationResult(errors);
  } finally {
    if (validatingTimer !== undefined) {
      clearTimeout(validatingTimer);
      validatingTimer = undefined;
    }

    if (hasAsyncRules && sharedState.validationRuns.get(path) === runId) {
      commitPathValidationState({
        sharedState,
        path,
        errors: finalErrors,
        validating: false
      });
    }
  }
}

export async function validatePath(sharedState: ManagedFormRuntimeSharedState, path: string): Promise<ValidationResult> {
  const field = getCompiledValidationField(sharedState.inputValue.validation, path);
  const runtimeTarget = findRuntimeRegistration(sharedState.runtimeFieldRegistrations, path);
  const runtimeRegistration = runtimeTarget.registration;

  if (!field && !runtimeRegistration) {
    return createValidationResult([]);
  }

  if (!field && runtimeTarget.childPath && runtimeRegistration?.validateChild) {
    return validateRuntimeRegistrationChild(sharedState, path, runtimeRegistration, runtimeTarget.childPath);
  }

  if (!field && runtimeRegistration?.validate) {
    return validateRuntimeRegistrationRoot(sharedState, path, runtimeRegistration);
  }

  if (!field) {
    return createValidationResult([]);
  }

  try {
    return await validateCompiledField(sharedState, path, field);
  } catch (error) {
    if (error === VALIDATION_CANCELLED) {
      return createValidationResult([]);
    }

    throw error;
  }
}

export async function validateSubtreeByNode(
  sharedState: ManagedFormRuntimeSharedState,
  path: string
): Promise<FormValidationResult | undefined> {
  if (!hasCompiledValidationNodes(sharedState.inputValue.validation)) {
    return undefined;
  }

  const nodeTargets = collectSubtreeNodePaths(sharedState, path);

  if (nodeTargets.length === 0) {
    return undefined;
  }

  const remainingRuntimeTargets = new Set(collectSubtreePaths(sharedState, path));
  const errors: ValidationError[] = [];
  const fieldErrors: Record<string, ValidationError[]> = {};

  for (const targetPath of nodeTargets) {
    remainingRuntimeTargets.delete(targetPath);
    const result = await validatePath(sharedState, targetPath);

    if (!result.ok) {
      fieldErrors[targetPath] = result.errors;
      errors.push(...result.errors);
    }
  }

  for (const targetPath of remainingRuntimeTargets) {
    const result = await validatePath(sharedState, targetPath);

    if (!result.ok) {
      fieldErrors[targetPath] = result.errors;
      errors.push(...result.errors);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    fieldErrors
  };
}
