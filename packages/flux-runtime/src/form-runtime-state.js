import { getCompiledValidationTraversalOrder, getIn } from '@nop-chaos/flux-core';
export function buildInitialFieldState(values, validation) {
    const initialValues = {};
    const dirty = {};
    for (const path of getCompiledValidationTraversalOrder(validation)) {
        initialValues[path] = getIn(values, path);
        dirty[path] = false;
    }
    return {
        initialValues,
        dirty
    };
}
//# sourceMappingURL=form-runtime-state.js.map