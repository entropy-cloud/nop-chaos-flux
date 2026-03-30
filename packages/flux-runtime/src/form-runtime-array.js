import { remapBooleanState, remapErrorState, transformArrayIndexedPath } from './form-path-state';
export function remapValidationRunState(sharedState, arrayPath, transformIndex, cancelValidationDebounce) {
    for (const path of Array.from(sharedState.validationRuns.keys())) {
        const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);
        if (!nextPath) {
            sharedState.validationRuns.delete(path);
            continue;
        }
        if (nextPath !== path) {
            const value = sharedState.validationRuns.get(path);
            sharedState.validationRuns.delete(path);
            if (value !== undefined) {
                sharedState.validationRuns.set(nextPath, value);
            }
        }
    }
    for (const path of Array.from(sharedState.pendingValidationDebounces.keys())) {
        const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);
        if (!nextPath) {
            cancelValidationDebounce(path);
            continue;
        }
        if (nextPath !== path) {
            const pending = sharedState.pendingValidationDebounces.get(path);
            if (!pending) {
                continue;
            }
            sharedState.pendingValidationDebounces.delete(path);
            sharedState.pendingValidationDebounces.set(nextPath, pending);
        }
    }
}
export function remapInitialFieldState(sharedState, arrayPath, transformIndex) {
    const nextInitialValues = {};
    for (const [path, value] of Object.entries(sharedState.initialFieldState.initialValues)) {
        const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);
        if (nextPath) {
            nextInitialValues[nextPath] = value;
        }
    }
    sharedState.initialFieldState.initialValues = nextInitialValues;
    sharedState.initialFieldState.dirty = remapBooleanState(sharedState.initialFieldState.dirty, arrayPath, transformIndex);
}
export function remapArrayFieldState(sharedState, arrayPath, transformIndex, cancelValidationDebounce) {
    const state = sharedState.store.getState();
    sharedState.store.setErrors(remapErrorState(state.errors, arrayPath, transformIndex));
    sharedState.store.setTouchedState(remapBooleanState(state.touched, arrayPath, transformIndex));
    sharedState.store.setDirtyState(remapBooleanState(state.dirty, arrayPath, transformIndex));
    sharedState.store.setVisitedState(remapBooleanState(state.visited, arrayPath, transformIndex));
    sharedState.store.setValidatingState(remapBooleanState(state.validating, arrayPath, transformIndex));
    remapValidationRunState(sharedState, arrayPath, transformIndex, cancelValidationDebounce);
    remapInitialFieldState(sharedState, arrayPath, transformIndex);
}
export function replaceManagedArrayValue(input) {
    input.sharedState.validationRuns.set(input.arrayPath, (input.sharedState.validationRuns.get(input.arrayPath) ?? 0) + 1);
    input.cancelValidationDebounce(input.arrayPath);
    input.sharedState.store.setValidating(input.arrayPath, false);
    const baseline = input.sharedState.initialFieldState.initialValues[input.arrayPath];
    input.sharedState.store.setDirty(input.arrayPath, !Object.is(baseline, input.nextValue));
    input.sharedState.store.setValue(input.arrayPath, input.nextValue);
    input.clearErrors(input.arrayPath);
    void input.revalidateDependents(input.arrayPath);
}
//# sourceMappingURL=form-runtime-array.js.map