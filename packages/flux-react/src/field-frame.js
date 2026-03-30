import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCurrentForm, useOwnedFieldState, useAggregateError } from './hooks';
import { getCompiledValidationField } from '@nop-chaos/flux-core';
function shouldShowFieldError(behavior, state) {
    return behavior.showErrorOn.some((trigger) => {
        switch (trigger) {
            case 'touched':
                return state.touched;
            case 'dirty':
                return state.dirty;
            case 'visited':
                return state.visited;
            case 'submit':
                return state.submitting;
        }
    });
}
const defaultBehavior = {
    triggers: ['blur'],
    showErrorOn: ['touched', 'submit']
};
export function FieldFrame(props) {
    const { name, label, required, hint, description, layout, validationBehavior, className, testid, cid, children } = props;
    const currentForm = useCurrentForm();
    const fieldState = useOwnedFieldState(name ?? '');
    const aggregateError = useAggregateError(name ?? '');
    const fieldBehavior = name ? getCompiledValidationField(currentForm?.validation, name)?.behavior : undefined;
    const behavior = validationBehavior ?? fieldBehavior ?? currentForm?.validation?.behavior ?? defaultBehavior;
    const error = aggregateError ?? fieldState.error;
    const showError = Boolean(error && shouldShowFieldError(behavior, {
        touched: fieldState.touched,
        dirty: fieldState.dirty,
        visited: fieldState.visited,
        submitting: fieldState.submitting
    }));
    const isGroup = layout === 'checkbox' || layout === 'radio';
    const Tag = isGroup ? 'fieldset' : 'label';
    const LabelTag = isGroup ? 'legend' : 'span';
    return (_jsxs(Tag, { className: ['nop-field grid gap-2', className].filter(Boolean).join(' ') || undefined, "data-testid": testid || undefined, "data-cid": cid != null ? cid : undefined, "data-field-visited": fieldState.visited || undefined, "data-field-touched": fieldState.touched || undefined, "data-field-dirty": fieldState.dirty || undefined, "data-field-invalid": showError || undefined, children: [label ? (_jsxs(LabelTag, { className: "nop-field__label", children: [label, required ? _jsx("span", { className: "nop-field__required", children: "*" }) : null] })) : null, _jsx("div", { className: "nop-field__control", children: children }), error && showError ? (_jsx("span", { className: "nop-field__error", children: error.message })) : fieldState.validating ? (_jsx("span", { className: "nop-field__hint", children: "Validating..." })) : !error && hint ? (_jsx("span", { className: "nop-field__hint", children: hint })) : !error && !hint && description ? (_jsx("span", { className: "nop-field__description", children: description })) : null] }));
}
