import type { ApiSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { Checkbox, Input, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner, Switch, Textarea } from '@nop-chaos/ui';
import {
  formLabelFieldRule,
  useFieldPresentation,
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
    const name = String(props.props.name ?? props.schema.name ?? '');
    const { value, handlers, currentForm } = useFormFieldController(name);
    const presentation = useFieldPresentation(name, currentForm, {
      disabled: props.meta.disabled,
      required: Boolean(props.props.required ?? props.schema.required)
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
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, handlers, currentForm } = useFormFieldController(name);
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
  });
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const ariaLabel = String(props.props.label ?? name);
  const loading = optionsSourceState?.loading === true;
  const placeholder = loading ? 'Loading...' : undefined;
  const errorMessage = getSourceErrorMessage(optionsSourceState);

  return (
    <div className="grid gap-2">
      <Select value={value == null ? '' : String(value)} onValueChange={(nextValue) => handlers.onChange(nextValue)} disabled={loading || presentation.effectiveDisabled}>
        <SelectTrigger
          className="w-full"
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
      {errorMessage ? <span className="text-sm text-destructive">{errorMessage}</span> : null}
    </div>
  );
}

function TextareaRenderer(props: RendererComponentProps<TextareaSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, handlers, currentForm } = useFormFieldController(name);
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
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
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, handlers, currentForm } = useFormFieldController(name, { toFormValue: coerceBooleanString });
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
  });
  const option = props.props.option as CheckboxSchema['option'] | undefined;
  const optionLabel = option?.label;

  return (
    <span className="inline-flex items-center gap-2.5">
      <Checkbox
        checked={Boolean(value)}
        disabled={presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={optionLabel}
        onFocus={handlers.onFocus}
        onCheckedChange={(checked) => handlers.onChange(String(Boolean(checked)))}
        onBlur={handlers.onBlur}
      />
      {optionLabel ? <span className="font-medium">{optionLabel}</span> : null}
    </span>
  );
}

function SwitchRenderer(props: RendererComponentProps<SwitchSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, handlers, currentForm } = useFormFieldController(name, { toFormValue: coerceBooleanString });
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
  });
  const option = props.props.option as SwitchSchema['option'] | undefined;
  const checked = Boolean(value);

  return (
    <span className="inline-flex items-center gap-3">
      <Switch
        checked={checked}
        disabled={presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={String(props.props.label ?? name)}
        onFocus={handlers.onFocus}
        onCheckedChange={(nextChecked) => handlers.onChange(String(Boolean(nextChecked)))}
        onBlur={handlers.onBlur}
      />
      <span className="font-semibold">{checked ? option?.onLabel ?? 'On' : option?.offLabel ?? 'Off'}</span>
    </span>
  );
}

function RadioGroupRenderer(props: RendererComponentProps<RadioGroupSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, handlers, currentForm } = useFormFieldController(name);
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
  });
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);

  return (
    <div className="grid gap-2.5">
      {loading ? (
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" aria-hidden="true" />
          <span>Loading options...</span>
        </span>
      ) : null}
      <RadioGroup
        className="grid gap-2.5"
        value={value == null ? '' : String(value)}
        disabled={loading || presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        onFocus={handlers.onFocus}
        onValueChange={(nextValue) => handlers.onChange(nextValue)}
        onBlur={handlers.onBlur}
      >
        {options?.map((option) => (
          <label key={option.value} className="inline-flex items-center gap-2.5">
            <RadioGroupItem value={option.value} aria-label={option.label} disabled={loading} />
            <span className="font-medium">{option.label}</span>
          </label>
        ))}
      </RadioGroup>
      {errorMessage ? <span className="text-sm text-destructive">{errorMessage}</span> : null}
    </div>
  );
}

function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value: rawValue, handlers, currentForm } = useFormFieldController(name);
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
  });
  const value = Array.isArray(rawValue) ? rawValue : [];
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);

  return (
    <div className="grid gap-2.5">
      {loading ? (
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" aria-hidden="true" />
          <span>Loading options...</span>
        </span>
      ) : null}
      {options?.map((option) => {
        const checked = value.some((candidate) => Object.is(candidate, option.value));

        return (
          <label key={option.value} className="inline-flex items-center gap-2.5">
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
            <span className="font-medium">{option.label}</span>
          </label>
        );
      })}
      {errorMessage ? <span className="text-sm text-destructive">{errorMessage}</span> : null}
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
