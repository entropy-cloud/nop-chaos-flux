import type { ApiSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Checkbox, cn, Input, Label, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner, Switch, Textarea } from '@nop-chaos/ui';
import {
  formLabelFieldRule,
  useFormFieldController
} from '../field-utils';
import type {
  CheckboxGroupSchema,
  CheckboxSchema,
  InputSchema,
  RadioGroupSchema,
  SelectSchema,
  SwitchSchema,
  TextareaSchema
} from '../schemas';

export function createInputRenderer(inputType: string) {
  return function InputRenderer(props: RendererComponentProps<InputSchema>) {
    const name = String(props.props.name ?? '');
    const { value, handlers, presentation } = useFormFieldController(name, {
      disabled: props.meta.disabled,
      required: Boolean(props.props.required)
    });

    return (
      <Input
        type={inputType}
        value={value == null ? '' : String(value)}
        disabled={presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
        onFocus={handlers.onFocus}
        onChange={(event) => handlers.onChange(event.target.value)}
        onBlur={handlers.onBlur}
      />
    );
  };
}

function coerceBooleanString(nextValue: unknown) {
  return nextValue === 'true';
}

function getSourceErrorMessage(sourceState: SourceTransientState | undefined) {
  if (sourceState?.status !== 'error') {
    return undefined;
  }

  if (typeof sourceState.error === 'string' && sourceState.error) {
    return sourceState.error;
  }

  if (
    sourceState.error &&
    typeof sourceState.error === 'object' &&
    'message' in sourceState.error &&
    typeof (sourceState.error as { message?: unknown }).message === 'string'
  ) {
    return (sourceState.error as { message: string }).message;
  }

  return 'Failed to load options.';
}

export function createFieldValidation(nameResolver?: (schema: InputSchema) => string | undefined, email?: boolean) {
  return {
    kind: 'field' as const,
    valueKind: 'scalar' as const,
    getFieldPath(schema: InputSchema) {
      return nameResolver ? nameResolver(schema) : schema.name;
    },
    collectRules(schema: InputSchema) {
      const rules: Array<{ kind: 'email' } | { kind: 'async'; api: ApiSchema; debounce?: number; message?: string }> = email
        ? [{ kind: 'email' }]
        : [];

      if (schema.validate?.api) {
        rules.push({
          kind: 'async',
          api: schema.validate.api,
          debounce: schema.validate.debounce,
          message: schema.validate.message
        });
      }

      return rules;
    }
  };
}

function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const ariaLabel = String(props.props.label ?? name);
  const loading = optionsSourceState?.loading === true;
  const placeholder = loading ? 'Loading...' : undefined;
  const errorMessage = getSourceErrorMessage(optionsSourceState);

  return (
    <div className={cn('nop-select-wrapper', props.meta.className)} data-slot="select-wrapper">
      <Select value={value == null ? '' : String(value)} onValueChange={(nextValue) => handlers.onChange(nextValue)} disabled={loading || presentation.effectiveDisabled}>
        <SelectTrigger
          data-slot="select-trigger"
          aria-label={ariaLabel}
          aria-invalid={presentation.showError ? true : undefined}
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
        >
          {loading ? <Spinner className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errorMessage ? <span data-slot="select-error">{errorMessage}</span> : null}
    </div>
  );
}

function TextareaRenderer(props: RendererComponentProps<TextareaSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });

  return (
    <Textarea
      value={value == null ? '' : String(value)}
      rows={typeof props.props.rows === 'number' ? props.props.rows : 4}
      disabled={presentation.effectiveDisabled}
      aria-invalid={presentation.showError ? true : undefined}
      placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
      onFocus={handlers.onFocus}
      onChange={(event) => handlers.onChange(event.target.value)}
      onBlur={handlers.onBlur}
    />
  );
}

function CheckboxRenderer(props: RendererComponentProps<CheckboxSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    toFormValue: coerceBooleanString,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const option = props.props.option as CheckboxSchema['option'] | undefined;
  const optionLabel = option?.label;

  return (
    <span className={cn('nop-checkbox-wrapper', props.meta.className)} data-slot="checkbox-wrapper">
      <Checkbox
        checked={Boolean(value)}
        disabled={presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={optionLabel}
        onFocus={handlers.onFocus}
        onCheckedChange={(checked) => handlers.onChange(String(Boolean(checked)))}
        onBlur={handlers.onBlur}
      />
      {optionLabel ? <span data-slot="checkbox-label">{optionLabel}</span> : null}
    </span>
  );
}

function SwitchRenderer(props: RendererComponentProps<SwitchSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    toFormValue: coerceBooleanString,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const option = props.props.option as SwitchSchema['option'] | undefined;
  const checked = Boolean(value);

  return (
    <span className={cn('nop-switch-wrapper', props.meta.className)} data-slot="switch-wrapper">
      <Switch
        checked={checked}
        disabled={presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={String(props.props.label ?? name)}
        onFocus={handlers.onFocus}
        onCheckedChange={(nextChecked) => handlers.onChange(String(Boolean(nextChecked)))}
        onBlur={handlers.onBlur}
      />
      <span data-slot="switch-label">{checked ? option?.onLabel ?? 'On' : option?.offLabel ?? 'Off'}</span>
    </span>
  );
}

function RadioGroupRenderer(props: RendererComponentProps<RadioGroupSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);

  return (
    <div className={cn('nop-radio-group-wrapper', props.meta.className)} data-slot="radio-group-wrapper">
      {loading ? (
        <span data-slot="radio-group-loading">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      <RadioGroup
        data-slot="radio-group-options"
        value={value == null ? '' : String(value)}
        disabled={loading || presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        onFocus={handlers.onFocus}
        onValueChange={(nextValue) => handlers.onChange(nextValue)}
        onBlur={handlers.onBlur}
      >
        {options?.map((option) => (
          <Label key={option.value} data-slot="radio-group-item">
            <RadioGroupItem value={option.value} aria-label={option.label} disabled={loading} />
            <span data-slot="radio-group-item-label">{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
      {errorMessage ? <span data-slot="radio-group-error">{errorMessage}</span> : null}
    </div>
  );
}

function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
  const name = String(props.props.name ?? '');
  const { value: rawValue, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const value = Array.isArray(rawValue) ? rawValue : [];
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);

  return (
    <div className={cn('nop-checkbox-group-wrapper', props.meta.className)} data-slot="checkbox-group-wrapper">
      {loading ? (
        <span data-slot="checkbox-group-loading">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      {options?.map((option) => {
        const checked = value.some((candidate) => Object.is(candidate, option.value));

        return (
          <Label key={option.value} data-slot="checkbox-group-item">
            <Checkbox
              checked={checked}
              disabled={loading || presentation.effectiveDisabled}
              aria-invalid={presentation.showError ? true : undefined}
              aria-label={option.label}
              onFocus={handlers.onFocus}
              onCheckedChange={(nextChecked) => {
                const checkedValue = Boolean(nextChecked);
                const nextValue = checkedValue
                  ? [...value, option.value]
                  : value.filter((candidate) => !Object.is(candidate, option.value));
                handlers.onChange(nextValue);
              }}
              onBlur={handlers.onBlur}
            />
            <span data-slot="checkbox-group-item-label">{option.label}</span>
          </Label>
        );
      })}
      {errorMessage ? <span data-slot="checkbox-group-error">{errorMessage}</span> : null}
    </div>
  );
}

export const inputRendererDefinitions: RendererDefinition[] = [
  {
    type: 'input-text',
    component: createInputRenderer('text'),
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true
  },
  {
    type: 'input-email',
    component: createInputRenderer('email'),
    fields: [formLabelFieldRule],
    validation: createFieldValidation(undefined, true),
    wrap: true
  },
  {
    type: 'input-password',
    component: createInputRenderer('password'),
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true
  },
  {
    type: 'select',
    fields: [formLabelFieldRule, { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' }],
    validation: createFieldValidation(),
    wrap: true,
    component: SelectRenderer
  },
  {
    type: 'textarea',
    fields: [formLabelFieldRule],
    component: TextareaRenderer,
    validation: createFieldValidation(),
    wrap: true
  },
  {
    type: 'checkbox',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true,
    component: CheckboxRenderer
  },
  {
    type: 'switch',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true,
    component: SwitchRenderer
  },
  {
    type: 'radio-group',
    fields: [formLabelFieldRule, { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' }],
    validation: createFieldValidation(),
    wrap: true,
    component: RadioGroupRenderer
  },
  {
    type: 'checkbox-group',
    fields: [formLabelFieldRule, { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' }],
    validation: createFieldValidation(),
    wrap: true,
    component: CheckboxGroupRenderer
  }
];
