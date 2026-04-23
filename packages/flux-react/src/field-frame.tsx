import type { ReactNode } from 'react';
import { useAggregateError, useCurrentForm, useCurrentFormFieldState, useCurrentFormState } from './hooks';
import type { CompiledValidationBehavior } from '@nop-chaos/flux-core';
import { getCompiledValidationField } from '@nop-chaos/flux-core';
import { EMPTY_FORM_FIELD_STATE, isFieldEffectivelyRequired } from './form-state';
import { shouldShowFieldError } from './field-error-visibility';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

export interface FieldFrameProps {
  name?: string;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  description?: ReactNode;
  layout?: 'default' | 'checkbox' | 'radio';
  rootTag?: 'label' | 'div';
  validationBehavior?: CompiledValidationBehavior;
  className?: string;
  testid?: string;
  cid?: number;
  rootProps?: Record<string, string | number | undefined>;
  children: ReactNode;
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
    rootTag,
    validationBehavior,
    className,
    testid,
    cid,
    rootProps,
    children
  } = props;

  const currentForm = useCurrentForm();
  
  // Path-scoped subscription for field state (O(1) wakeup when other fields change)
  // Falls back to whole-store subscription if store doesn't support subscribeToPath
  // Always call the hook with a stable path to satisfy Rules of Hooks
  const rawFieldState = useCurrentFormFieldState(name ?? '', { path: name ?? '', ownerPath: name ?? '' });
  const fieldState = name ? rawFieldState : EMPTY_FORM_FIELD_STATE;
  
  // Aggregate errors from array/object/form level
  const aggregateError = useAggregateError(name ?? '', { enabled: Boolean(name) });
  const validationField = name ? getCompiledValidationField(currentForm?.validation, name) : undefined;
  const fieldBehavior = validationField?.behavior;
  const behavior = validationBehavior ?? fieldBehavior ?? currentForm?.validation?.behavior ?? defaultBehavior;
  const hasDynamicRequiredRule = Boolean(
    validationField?.rules.some(({ rule }) => rule.kind === 'requiredWhen' || rule.kind === 'requiredUnless')
  );
  const dynamicRequired = useCurrentFormState(
    (state) => {
      if (!hasDynamicRequiredRule || !name) return false;
      return isFieldEffectivelyRequired(currentForm?.validation, name, state.values);
    },
    Object.is,
    { enabled: hasDynamicRequiredRule && Boolean(name) }
  );

  const error = aggregateError ?? fieldState.error;
  const showError = Boolean(
    error && shouldShowFieldError(behavior, {
      touched: fieldState.touched,
      dirty: fieldState.dirty,
      visited: fieldState.visited,
      submitting: fieldState.submitting,
      submitAttempted: fieldState.submitAttempted
    })
  );

  const isGroup = layout === 'checkbox' || layout === 'radio';
  const Tag = isGroup ? 'fieldset' : (rootTag ?? 'label');
  const LabelTag = isGroup ? 'legend' : 'span';
  const effectiveRequired = Boolean(required) || Boolean(dynamicRequired);

  return (
    <Tag
      {...rootProps}
      className={cn('nop-field', className)}
      data-testid={testid || undefined}
      data-cid={cid != null ? cid : undefined}
      data-field-visited={fieldState.visited ? '' : undefined}
      data-field-touched={fieldState.touched ? '' : undefined}
      data-field-dirty={fieldState.dirty ? '' : undefined}
      data-field-invalid={showError ? '' : undefined}
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
        <span data-slot="field-hint">{t('flux.common.validating')}</span>
      ) : !error && hint ? (
        <span data-slot="field-hint">{hint}</span>
      ) : !error && !hint && description ? (
        <span data-slot="field-description">{description}</span>
      ) : null}
    </Tag>
  );
}
