import type { ReactNode } from 'react';
import {
  useAggregateError,
  useCurrentForm,
  useCurrentFormFieldState,
  useCurrentFormState,
  useCurrentValidationScope,
  useFormLayout,
} from './hooks';
import type { CompiledValidationBehavior } from '@nop-chaos/flux-core';
import { getCompiledValidationField } from '@nop-chaos/flux-core';
import {
  EMPTY_FORM_FIELD_STATE,
  getDynamicRequiredDependencyPaths,
  isFieldEffectivelyRequired,
} from './form-state';
import { shouldShowFieldError } from './field-error-visibility';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

export interface FieldRemarkProps {
  icon?: string;
  content: ReactNode;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: ('click' | 'hover' | 'focus')[];
}

export interface FieldRemarkSchemaLike {
  icon?: string;
  content: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: ('click' | 'hover' | 'focus')[];
}

export function toFieldRemarkProps(schema: FieldRemarkSchemaLike): FieldRemarkProps {
  return {
    icon: schema.icon,
    content: schema.content,
    placement: schema.placement,
    trigger: schema.trigger,
  };
}

export interface FieldFrameProps {
  name?: string;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  description?: ReactNode;
  remark?: FieldRemarkProps;
  labelRemark?: FieldRemarkProps;
  layout?: 'default' | 'checkbox' | 'radio';
  labelAlign?: 'top' | 'left' | 'right';
  labelWidth?: string | number;
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
  showErrorOn: ['touched', 'submit'],
};

export function FieldFrame(props: FieldFrameProps) {
  const {
    name,
    label,
    required,
    hint,
    description,
    remark,
    labelRemark,
    layout,
    labelAlign: labelAlignProp,
    labelWidth: labelWidthProp,
    rootTag,
    validationBehavior,
    className,
    testid,
    cid,
    rootProps,
    children,
  } = props;

  const formLayout = useFormLayout();

  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();

  const rawFieldState = useCurrentFormFieldState(name ?? '', {
    path: name ?? '',
    ownerPath: name ?? '',
  });
  const fieldState = name ? rawFieldState : EMPTY_FORM_FIELD_STATE;

  const aggregateError = useAggregateError(name ?? '', { enabled: Boolean(name) });
  const validationModel = currentForm?.validation ?? currentValidationScope?.validation;
  const validationField = name ? getCompiledValidationField(validationModel, name) : undefined;
  const fieldBehavior = validationField?.behavior;
  const behavior =
    validationBehavior ?? fieldBehavior ?? validationModel?.behavior ?? defaultBehavior;
  const dynamicRequiredDependencyPaths = name
    ? getDynamicRequiredDependencyPaths(validationField)
    : EMPTY_DYNAMIC_REQUIRED_PATHS;
  const hasDynamicRequiredRule = dynamicRequiredDependencyPaths.length > 0;
  const dynamicRequired = useCurrentFormState(
    (state) => {
      if (!hasDynamicRequiredRule || !name || !validationModel) {
        return false;
      }

      return isFieldEffectivelyRequired(validationModel, name, state.values);
    },
    Object.is,
    {
      enabled: hasDynamicRequiredRule && Boolean(name),
      paths: dynamicRequiredDependencyPaths,
    },
  );

  const error = aggregateError ?? fieldState.error;
  const showError = Boolean(
    error &&
    shouldShowFieldError(behavior, {
      touched: fieldState.touched,
      dirty: fieldState.dirty,
      visited: fieldState.visited,
      submitting: fieldState.submitting,
      submitAttempted: fieldState.submitAttempted,
    }),
  );

  const isGroup = layout === 'checkbox' || layout === 'radio';
  const Tag = isGroup ? 'fieldset' : (rootTag ?? 'label');
  const LabelTag = isGroup ? 'legend' : 'span';
  const effectiveRequired = Boolean(required) || Boolean(dynamicRequired);
  const errorId = name ? `${name}-error` : undefined;
  const controlId = name ? `${name}-control` : undefined;

  const effectiveLabelAlign = labelAlignProp ?? formLayout.labelAlign;
  const effectiveLabelWidth = labelWidthProp ?? formLayout.labelWidth;
  const formMode = formLayout.mode ?? 'normal';

  const labelStyle = effectiveLabelWidth != null ? { width: effectiveLabelWidth } : undefined;
  const isLabelTop =
    effectiveLabelAlign === 'top' || (formMode === 'normal' && !effectiveLabelAlign);

  return (
    <Tag
      {...rootProps}
      className={cn('nop-field', className)}
      data-label-align={isLabelTop ? 'top' : 'left'}
      data-testid={testid || undefined}
      data-cid={cid != null ? cid : undefined}
      data-field-visited={fieldState.visited ? '' : undefined}
      data-field-touched={fieldState.touched ? '' : undefined}
      data-field-dirty={fieldState.dirty ? '' : undefined}
      data-field-invalid={showError ? '' : undefined}
      data-field-mode={formMode}
      aria-required={effectiveRequired || undefined}
    >
      {label ? (
        <LabelTag data-slot="field-label" style={labelStyle}>
          {label}
          {effectiveRequired ? (
            <span data-slot="field-required" aria-hidden="true">
              *
            </span>
          ) : null}
          {labelRemark ? (
            <span
              data-slot="field-label-remark"
              title={typeof labelRemark.content === 'string' ? labelRemark.content : undefined}
            >
              {labelRemark.icon ?? '?'}
            </span>
          ) : null}
        </LabelTag>
      ) : null}

      <div
        data-slot="field-control"
        id={controlId}
        aria-describedby={showError ? errorId : undefined}
        aria-invalid={showError || undefined}
      >
        {children}
        {remark ? (
          <span
            data-slot="field-remark"
            title={typeof remark.content === 'string' ? remark.content : undefined}
          >
            {remark.icon ?? '?'}
          </span>
        ) : null}
      </div>

      {error && showError ? (
        <span data-slot="field-error" id={errorId} role="alert" aria-live="assertive">{error.message}</span>
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

const EMPTY_DYNAMIC_REQUIRED_PATHS: readonly string[] = [];
