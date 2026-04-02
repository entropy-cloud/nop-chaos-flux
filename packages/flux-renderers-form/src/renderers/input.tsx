import type { ApiObject, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { Checkbox, Input, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@nop-chaos/ui';
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
    const name = String(props.props.name ?? props.schema.name ?? '');
    const { value, presentation, handlers } = useFormFieldController(name);

    return (
      <Input
        type={inputType}
        value={String(value)}
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

export function createFieldValidation(nameResolver?: (schema: InputSchema) => string | undefined, email?: boolean) {
  return {
    kind: 'field' as const,
    valueKind: 'scalar' as const,
    getFieldPath(schema: InputSchema) {
      return nameResolver ? nameResolver(schema) : schema.name;
    },
    collectRules(schema: InputSchema) {
      const rules: Array<{ kind: 'email' } | { kind: 'async'; api: ApiObject; debounce?: number; message?: string }> = email
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
  const { value, presentation, handlers } = useFormFieldController(name);
  const options = Array.isArray(props.props.options) ? (props.props.options as SelectSchema['options']) : [];
  const ariaLabel = String(props.meta.label ?? props.props.label ?? name);

  return (
    <Select value={String(value)} onValueChange={(nextValue) => handlers.onChange(nextValue)}>
      <SelectTrigger
        className="w-full"
        aria-label={ariaLabel}
        aria-invalid={presentation.showError ? true : undefined}
        onFocus={handlers.onFocus}
        onBlur={handlers.onBlur}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TextareaRenderer(props: RendererComponentProps<TextareaSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, presentation, handlers } = useFormFieldController(name);

  return (
    <Textarea
      value={String(value)}
      rows={typeof props.props.rows === 'number' ? props.props.rows : 4}
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
  const { value, presentation, handlers } = useFormFieldController(name, { toFormValue: coerceBooleanString });
  const option = props.props.option as CheckboxSchema['option'] | undefined;
  const optionLabel = option?.label;

  return (
    <span className="inline-flex items-center gap-2.5">
      <Checkbox
        checked={Boolean(value)}
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
  const { value, presentation, handlers } = useFormFieldController(name, { toFormValue: coerceBooleanString });
  const option = props.props.option as SwitchSchema['option'] | undefined;
  const checked = Boolean(value);

  return (
    <span className="inline-flex items-center gap-3">
      <Switch
        checked={checked}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={String(props.meta.label ?? props.props.label ?? name)}
        onFocus={handlers.onFocus}
        type="checkbox"
        onChange={(e) => handlers.onChange(String(Boolean(e.target.checked)))}
        onBlur={handlers.onBlur}
      />
      <span className="font-semibold">{checked ? option?.onLabel ?? 'On' : option?.offLabel ?? 'Off'}</span>
    </span>
  );
}

function RadioGroupRenderer(props: RendererComponentProps<RadioGroupSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, presentation, handlers } = useFormFieldController(name);
  const options = Array.isArray(props.props.options) ? (props.props.options as RadioGroupSchema['options']) : [];

  return (
    <RadioGroup
      className="grid gap-2.5"
      value={String(value)}
      aria-invalid={presentation.showError ? true : undefined}
      onFocus={handlers.onFocus}
      onValueChange={(nextValue) => handlers.onChange(nextValue)}
      onBlur={handlers.onBlur}
    >
      {options?.map((option) => (
        <label key={option.value} className="inline-flex items-center gap-2.5">
          <RadioGroupItem value={option.value} aria-label={option.label} />
          <span className="font-medium">{option.label}</span>
        </label>
      ))}
    </RadioGroup>
  );
}

function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value: rawValue, presentation, handlers } = useFormFieldController(name);
  const value = Array.isArray(rawValue) ? rawValue : [];
  const options = Array.isArray(props.props.options) ? (props.props.options as CheckboxGroupSchema['options']) : [];

  return (
    <div className="grid gap-2.5">
      {options?.map((option) => {
        const checked = value.some((candidate) => Object.is(candidate, option.value));

        return (
          <label key={option.value} className="inline-flex items-center gap-2.5">
            <Checkbox
              checked={checked}
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
    fields: [formLabelFieldRule],
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
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true,
    component: RadioGroupRenderer
  },
  {
    type: 'checkbox-group',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true,
    component: CheckboxGroupRenderer
  }
];
