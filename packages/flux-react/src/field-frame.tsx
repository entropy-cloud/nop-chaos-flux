import type { ReactNode } from 'react';
import { useCurrentForm, useOwnedFieldState, useAggregateError } from './hooks';
import type { CompiledValidationBehavior } from '@nop-chaos/flux-core';
import { getCompiledValidationField } from '@nop-chaos/flux-core';

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
  const fieldState = useOwnedFieldState(name ?? '');
  const aggregateError = useAggregateError(name ?? '');
  const fieldBehavior = name ? getCompiledValidationField(currentForm?.validation, name)?.behavior : undefined;
  const behavior = validationBehavior ?? fieldBehavior ?? currentForm?.validation?.behavior ?? defaultBehavior;

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
        <LabelTag className="nop-field__label">
          {label}
          {required ? <span className="nop-field__required">*</span> : null}
        </LabelTag>
      ) : null}

      <div className="nop-field__control">
        {children}
      </div>

      {error && showError ? (
        <span className="nop-field__error">{error.message}</span>
      ) : fieldState.validating ? (
        <span className="nop-field__hint">Validating...</span>
      ) : !error && hint ? (
        <span className="nop-field__hint">{hint}</span>
      ) : !error && !hint && description ? (
        <span className="nop-field__description">{description}</span>
      ) : null}
    </Tag>
  );
}
