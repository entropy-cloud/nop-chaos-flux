import { getCompiledValidationField, hasCompiledValidationNodes } from '@nop-chaos/flux-core';
import { findRuntimeRegistration, syncRegisteredFieldValue } from './form-runtime-registration';
import { collectSubtreeNodePaths, collectSubtreePaths } from './form-runtime-subtree';
import { normalizeRuntimeValidationErrors } from './validation';
function createValidationResult(errors) {
    return {
        ok: errors.length === 0,
        errors
    };
}
function setPathErrors(sharedState, path, errors) {
    sharedState.store.setPathErrors(path, errors);
}
export function cancelValidationDebounce(sharedState, path) {
    const pending = sharedState.pendingValidationDebounces.get(path);
    if (!pending) {
        return;
    }
    clearTimeout(pending.timer);
    pending.resolve(false);
    sharedState.pendingValidationDebounces.delete(path);
}
export function cancelAllValidationDebounces(sharedState) {
    for (const path of Array.from(sharedState.pendingValidationDebounces.keys())) {
        cancelValidationDebounce(sharedState, path);
    }
}
export function waitForValidationDebounce(sharedState, path, debounce, runId) {
    if (!debounce || debounce <= 0) {
        return Promise.resolve(sharedState.validationRuns.get(path) === runId);
    }
    cancelValidationDebounce(sharedState, path);
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            sharedState.pendingValidationDebounces.delete(path);
            resolve(sharedState.validationRuns.get(path) === runId);
        }, debounce);
        sharedState.pendingValidationDebounces.set(path, { timer, resolve });
    });
}
async function validateRuntimeRegistrationRoot(sharedState, path, registration) {
    const runtimeErrors = normalizeRuntimeValidationErrors(await registration.validate?.(), registration, path) ?? [];
    setPathErrors(sharedState, path, runtimeErrors);
    return createValidationResult(runtimeErrors);
}
async function validateRuntimeRegistrationChild(sharedState, path, registration, childPath) {
    const runtimeErrors = normalizeRuntimeValidationErrors(await registration.validateChild?.(childPath), registration, path, childPath) ?? [];
    setPathErrors(sharedState, path, runtimeErrors);
    return createValidationResult(runtimeErrors);
}
async function validateCompiledField(sharedState, path, field) {
    const runtimeRegistration = sharedState.runtimeFieldRegistrations.get(path);
    const syncedRuntimeValue = syncRegisteredFieldValue(sharedState, path);
    const runId = (sharedState.validationRuns.get(path) ?? 0) + 1;
    sharedState.validationRuns.set(path, runId);
    const value = syncedRuntimeValue ?? sharedState.scope.get(path);
    const errors = [];
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
    }
    finally {
        if (hasAsyncRules && sharedState.validationRuns.get(path) === runId) {
            sharedState.store.setValidating(path, false);
        }
    }
}
export async function validatePath(sharedState, path) {
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
export async function validateSubtreeByNode(sharedState, path) {
    if (!hasCompiledValidationNodes(sharedState.inputValue.validation)) {
        return undefined;
    }
    const nodeTargets = collectSubtreeNodePaths(sharedState, path);
    if (nodeTargets.length === 0) {
        return undefined;
    }
    const remainingRuntimeTargets = new Set(collectSubtreePaths(sharedState, path));
    const errors = [];
    const fieldErrors = {};
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
//# sourceMappingURL=form-runtime-validation.js.map