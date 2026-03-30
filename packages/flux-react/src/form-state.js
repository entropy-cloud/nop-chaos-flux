export const EMPTY_FORM_STORE_STATE = {
    values: {},
    errors: {},
    validating: {},
    touched: {},
    dirty: {},
    visited: {},
    submitting: false
};
function matchesFormErrorQuery(error, query) {
    if (!query) {
        return true;
    }
    if (query.path && error.path !== query.path) {
        return false;
    }
    if (query.ownerPath && (error.ownerPath ?? error.path) !== query.ownerPath) {
        return false;
    }
    if (query.rule && error.rule !== query.rule) {
        return false;
    }
    if (query.sourceKinds?.length && (!error.sourceKind || !query.sourceKinds.includes(error.sourceKind))) {
        return false;
    }
    return true;
}
export function selectCurrentFormErrors(state, query) {
    const matches = [];
    if (query?.path) {
        const errors = state.errors[query.path] ?? [];
        return errors.filter((error) => matchesFormErrorQuery(error, query));
    }
    for (const errors of Object.values(state.errors)) {
        for (const error of errors) {
            if (matchesFormErrorQuery(error, query)) {
                matches.push(error);
            }
        }
    }
    return matches;
}
export function selectCurrentFormFieldState(state, path, query) {
    return {
        error: selectCurrentFormErrors(state, query ?? { path })[0],
        validating: state.validating[path] === true,
        touched: state.touched[path] === true,
        dirty: state.dirty[path] === true,
        visited: state.visited[path] === true,
        submitting: state.submitting
    };
}
