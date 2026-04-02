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

function setPathErrors(sharedState: ManagedFormRuntimeSharedState, path: string, errors: ValidationError[]) {
  sharedState.store.setPathErrors(path, errors);
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
  setPathErrors(sharedState, path, runtimeErrors);
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
  setPathErrors(sharedState, path, runtimeErrors);
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

  if (hasAsyncRules) {
    sharedState.store.setValidating(path, true);
  }

  try {
    for (const compiledRule of field.rules) {
      const rule = compiledRule.rule;

      if (rule.kind === 'async') {
        const shouldRun = await waitForValidationDebounce(sharedState, path, rule.debounce, runId);

        if (!shouldRun) {
          return createValidationResult([]);
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
      return createValidationResult([]);
    }

    setPathErrors(sharedState, path, errors);
    return createValidationResult(errors);
  } finally {
    if (hasAsyncRules && sharedState.validationRuns.get(path) === runId) {
      sharedState.store.setValidating(path, false);
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

  return validateCompiledField(sharedState, path, field);
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

