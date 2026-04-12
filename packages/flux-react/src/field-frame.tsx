import type { ReactNode } from 'react';
import { useCurrentForm, useCurrentFormState } from './hooks';
import type { CompiledValidationBehavior } from '@nop-chaos/flux-core';
import { getCompiledValidationField } from '@nop-chaos/flux-core';
import { EMPTY_FORM_FIELD_STATE, isFieldEffectivelyRequired, selectCurrentFormErrors, selectCurrentFormFieldState } from './form-state';

export interface FieldFrameProps {
  name?: string;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  description?: ReactNode;
  layout?: 'default' | 'checkbox' | 'radio';
  validationBehavior?: CompiledValidationBehavior;
  className?: string;
  testid?: string;
  cid?: number;
  children: ReactNode;
}

function shouldShowFieldError(
  behavior: CompiledValidationBehavior,
  state: { touched: boolean; dirty: boolean; visited: boolean; submitting: boolean }
) {
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

const defaultBehavior: CompiledValidationBehavior = {
  triggers: ['blur'],
  showErrorOn: ['touched', 'submit']
};

export function FieldFrame(props: FieldFrameProps) {
  const {
    name,
    label,
    required,
    hint,
    description,
    layout,
    validationBehavior,
    className,
    testid,
    cid,
    children
  } = props;

  const currentForm = useCurrentForm();
  const fieldState = useCurrentFormState(
    (state) => name ? selectCurrentFormFieldState(state, name, { path: name, ownerPath: name }) : EMPTY_FORM_FIELD_STATE,
    (left, right) =>
      left.error === right.error &&
      left.validating === right.validating &&
      left.touched === right.touched &&
      left.dirty === right.dirty &&
      left.visited === right.visited &&
      left.submitting === right.submitting
  );
  const aggregateError = useCurrentFormState(
    (state) => name ? selectCurrentFormErrors(state, { path: name, ownerPath: name, sourceKinds: ['array', 'object', 'form', 'runtime-registration'] })[0] : undefined,
    Object.is
  );
  const validationField = name ? getCompiledValidationField(currentForm?.validation, name) : undefined;
  const fieldBehavior = validationField?.behavior;
  const behavior = validationBehavior ?? fieldBehavior ?? currentForm?.validation?.behavior ?? defaultBehavior;
  const hasDynamicRequiredRule = Boolean(
    validationField?.rules.some(({ rule }) => rule.kind === 'requiredWhen' || rule.kind === 'requiredUnless')
  );
  const values = useCurrentFormState(
    (state) => hasDynamicRequiredRule ? state.values : undefined,
    Object.is
  );

  const error = aggregateError ?? fieldState.error;
  const showError = Boolean(
    error && shouldShowFieldError(behavior, {
      touched: fieldState.touched,
      dirty: fieldState.dirty,
      visited: fieldState.visited,
      submitting: fieldState.submitting
    })
  );

  const isGroup = layout === 'checkbox' || layout === 'radio';
  const Tag = isGroup ? 'fieldset' : 'label';
  const LabelTag = isGroup ? 'legend' : 'span';
  const effectiveRequired = Boolean(required) || Boolean(name && isFieldEffectivelyRequired(currentForm?.validation, name, values ?? {}));

  return (
    <Tag
      className={['nop-field grid gap-2', className].filter(Boolean).join(' ') || undefined}
      data-testid={testid || undefined}
      data-cid={cid != null ? cid : undefined}
      data-field-visited={fieldState.visited || undefined}
      data-field-touched={fieldState.touched || undefined}
      data-field-dirty={fieldState.dirty || undefined}
      data-field-invalid={showError || undefined}
    >
      {label ? (
        <LabelTag data-slot="field-label">
          {label}
          {effectiveRequired ? <span data-slot="field-required" aria-hidden="true">*</span> : null}
        </LabelTag>
      ) : null}

      <div data-slot="field-control">
        {children}
      </div>

      {error && showError ? (
        <span data-slot="field-error">{error.message}</span>
      ) : fieldState.validating ? (
        <span data-slot="field-hint">Validating...</span>
      ) : !error && hint ? (
        <span data-slot="field-hint">{hint}</span>
      ) : !error && !hint && description ? (
        <span data-slot="field-description">{description}</span>
      ) : null}
    </Tag>
  );
}
