import type { ApiObject, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import { Checkbox, Input, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@nop-chaos/ui';
import {
  createFieldHandlers,
  formLabelFieldRule,
  useBoundFieldValue,
  useFieldPresentation
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
    const scope = useRenderScope();
    const currentForm = useCurrentForm();
    const name = String(props.props.name ?? props.schema.name ?? '');
    const value = useBoundFieldValue(name, currentForm);
    const presentation = useFieldPresentation(name, currentForm);
    const handlers = createFieldHandlers({
      name,
      currentForm,
      scope,
      setValue(nextValue) {
        currentForm?.setValue(name, nextValue);
      }
    });
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
    component: function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = useBoundFieldValue(name, currentForm);
      const options = Array.isArray(props.props.options) ? (props.props.options as SelectSchema['options']) : [];
      const presentation = useFieldPresentation(name, currentForm);
      const ariaLabel = String(props.meta.label ?? props.props.label ?? name);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });

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
  },
  {
    type: 'textarea',
    fields: [formLabelFieldRule],
    component: function TextareaRenderer(props: RendererComponentProps<TextareaSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = useBoundFieldValue(name, currentForm);
      const presentation = useFieldPresentation(name, currentForm);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });

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
    },
    validation: createFieldValidation(),
    wrap: true
  },
  {
    type: 'checkbox',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true,
    component: function CheckboxRenderer(props: RendererComponentProps<CheckboxSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = Boolean(useBoundFieldValue(name, currentForm));
      const presentation = useFieldPresentation(name, currentForm);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue === 'true');
        }
      });
      const option = props.props.option as CheckboxSchema['option'] | undefined;
      const optionLabel = option?.label;

      return (
        <span className="nop-checkbox">
          <Checkbox
            className="nop-checkbox__input"
            checked={value}
            aria-invalid={presentation.showError ? true : undefined}
            aria-label={optionLabel}
            onFocus={handlers.onFocus}
            onCheckedChange={(checked) => handlers.onChange(String(Boolean(checked)))}
            onBlur={handlers.onBlur}
          />
          {optionLabel ? <span className="nop-checkbox__label">{optionLabel}</span> : null}
        </span>
      );
    }
  },
  {
    type: 'switch',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true,
    component: function SwitchRenderer(props: RendererComponentProps<SwitchSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = Boolean(useBoundFieldValue(name, currentForm));
      const presentation = useFieldPresentation(name, currentForm);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue === 'true');
        }
      });
      const option = props.props.option as SwitchSchema['option'] | undefined;

      return (
        <span className="nop-switch">
          <Switch
            className="nop-switch__input"
            checked={value}
            aria-invalid={presentation.showError ? true : undefined}
            aria-label={String(props.meta.label ?? props.props.label ?? name)}
            onFocus={handlers.onFocus}
            onCheckedChange={(checked) => handlers.onChange(String(Boolean(checked)))}
            onBlur={handlers.onBlur}
          />
          <span className="nop-switch__label">{value ? option?.onLabel ?? 'On' : option?.offLabel ?? 'Off'}</span>
        </span>
      );
    }
  },
  {
    type: 'radio-group',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true,
    component: function RadioGroupRenderer(props: RendererComponentProps<RadioGroupSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = String(useBoundFieldValue(name, currentForm));
      const options = Array.isArray(props.props.options) ? (props.props.options as RadioGroupSchema['options']) : [];
      const presentation = useFieldPresentation(name, currentForm);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });

      return (
        <RadioGroup
          className="nop-radio-group"
          value={value}
          aria-invalid={presentation.showError ? true : undefined}
          onFocus={handlers.onFocus}
          onValueChange={(nextValue) => handlers.onChange(nextValue)}
          onBlur={handlers.onBlur}
        >
          {options?.map((option) => (
            <label key={option.value} className="nop-radio">
              <RadioGroupItem className="nop-radio__input" value={option.value} aria-label={option.label} />
              <span className="nop-radio__label">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      );
    }
  },
  {
    type: 'checkbox-group',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    wrap: true,
    component: function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const rawValue = useBoundFieldValue(name, currentForm);
      const value = Array.isArray(rawValue) ? rawValue : [];
      const options = Array.isArray(props.props.options) ? (props.props.options as CheckboxGroupSchema['options']) : [];
      const presentation = useFieldPresentation(name, currentForm);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });

      return (
        <div className="nop-checkbox-group">
          {options?.map((option) => {
            const checked = value.some((candidate) => Object.is(candidate, option.value));

            return (
              <label key={option.value} className="nop-checkbox">
                <Checkbox
                  className="nop-checkbox__input"
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
                <span className="nop-checkbox__label">{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    }
  }
];
