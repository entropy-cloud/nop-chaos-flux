import type { ApiObject, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import {
  createFieldHandlers,
  formLabelFieldRule,
  resolveFieldLabelContent,
  useBoundFieldValue,
  useFieldPresentation
} from '../field-utils';
import { FieldHint, FieldLabel } from './shared';
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
    const labelContent = resolveFieldLabelContent(props);
    const handlers = createFieldHandlers({
      name,
      currentForm,
      scope,
      setValue(nextValue) {
        currentForm?.setValue(name, nextValue);
      }
    });

    return (
      <label className={presentation.className}>
        <FieldLabel content={labelContent} />
        <input
          className="nop-input"
          type={inputType}
          value={String(value)}
          aria-invalid={presentation.showError ? true : undefined}
          placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
          onFocus={handlers.onFocus}
          onChange={(event) => handlers.onChange(event.target.value)}
          onBlur={handlers.onBlur}
        />
        <FieldHint
          errorMessage={presentation.fieldState.error?.message}
          validating={presentation.fieldState.validating}
          showError={presentation.showError}
        />
      </label>
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
    validation: createFieldValidation()
  },
  {
    type: 'input-email',
    component: createInputRenderer('email'),
    fields: [formLabelFieldRule],
    validation: createFieldValidation(undefined, true)
  },
  {
    type: 'input-password',
    component: createInputRenderer('password'),
    fields: [formLabelFieldRule],
    validation: createFieldValidation()
  },
  {
    type: 'select',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    component: function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = useBoundFieldValue(name, currentForm);
      const options = Array.isArray(props.props.options) ? (props.props.options as SelectSchema['options']) : [];
      const presentation = useFieldPresentation(name, currentForm);
      const labelContent = resolveFieldLabelContent(props);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });

      return (
        <label className={presentation.className}>
          <FieldLabel content={labelContent} />
          <select
            className="nop-select"
            value={String(value)}
            aria-invalid={presentation.showError ? true : undefined}
            onFocus={handlers.onFocus}
            onChange={(event) => handlers.onChange(event.target.value)}
            onBlur={handlers.onBlur}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldHint
            errorMessage={presentation.fieldState.error?.message}
            validating={presentation.fieldState.validating}
            showError={presentation.showError}
          />
        </label>
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
      const labelContent = resolveFieldLabelContent(props);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });

      return (
        <label className={presentation.className}>
          <FieldLabel content={labelContent} />
          <textarea
            className="nop-textarea"
            value={String(value)}
            rows={typeof props.props.rows === 'number' ? props.props.rows : 4}
            aria-invalid={presentation.showError ? true : undefined}
            placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
            onFocus={handlers.onFocus}
            onChange={(event) => handlers.onChange(event.target.value)}
            onBlur={handlers.onBlur}
          />
          <FieldHint
            errorMessage={presentation.fieldState.error?.message}
            validating={presentation.fieldState.validating}
            showError={presentation.showError}
          />
        </label>
      );
    },
    validation: createFieldValidation()
  },
  {
    type: 'checkbox',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
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
      const labelContent = resolveFieldLabelContent(props);

      return (
        <label className={presentation.className}>
          <FieldLabel content={labelContent} />
          <span className="nop-checkbox">
            <input
              className="nop-checkbox__input"
              type="checkbox"
              checked={value}
              aria-invalid={presentation.showError ? true : undefined}
              onFocus={handlers.onFocus}
              onChange={(event) => handlers.onChange(String(event.target.checked))}
              onBlur={handlers.onBlur}
            />
            {optionLabel ? <span className="nop-checkbox__label">{optionLabel}</span> : null}
          </span>
          <FieldHint
            errorMessage={presentation.fieldState.error?.message}
            validating={presentation.fieldState.validating}
            showError={presentation.showError}
          />
        </label>
      );
    }
  },
  {
    type: 'switch',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
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
      const labelContent = resolveFieldLabelContent(props);

      return (
        <label className={presentation.className}>
          <FieldLabel content={labelContent} />
          <span className="nop-switch">
            <input
              className="nop-switch__input"
              type="checkbox"
              role="switch"
              checked={value}
              aria-invalid={presentation.showError ? true : undefined}
              onFocus={handlers.onFocus}
              onChange={(event) => handlers.onChange(String(event.target.checked))}
              onBlur={handlers.onBlur}
            />
            <span className="nop-switch__track">
              <span className="nop-switch__thumb" />
            </span>
            <span className="nop-switch__label">{value ? option?.onLabel ?? 'On' : option?.offLabel ?? 'Off'}</span>
          </span>
          <FieldHint
            errorMessage={presentation.fieldState.error?.message}
            validating={presentation.fieldState.validating}
            showError={presentation.showError}
          />
        </label>
      );
    }
  },
  {
    type: 'radio-group',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    component: function RadioGroupRenderer(props: RendererComponentProps<RadioGroupSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = String(useBoundFieldValue(name, currentForm));
      const options = Array.isArray(props.props.options) ? (props.props.options as RadioGroupSchema['options']) : [];
      const presentation = useFieldPresentation(name, currentForm);
      const labelContent = resolveFieldLabelContent(props);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });

      return (
        <fieldset className={presentation.className}>
          <FieldLabel content={labelContent} as="legend" />
          <div className="nop-radio-group">
            {options?.map((option) => (
              <label key={option.value} className="nop-radio">
                <input
                  className="nop-radio__input"
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  aria-invalid={presentation.showError ? true : undefined}
                  onFocus={handlers.onFocus}
                  onChange={(event) => handlers.onChange(event.target.value)}
                  onBlur={handlers.onBlur}
                />
                <span className="nop-radio__label">{option.label}</span>
              </label>
            ))}
          </div>
          <FieldHint
            errorMessage={presentation.fieldState.error?.message}
            validating={presentation.fieldState.validating}
            showError={presentation.showError}
          />
        </fieldset>
      );
    }
  },
  {
    type: 'checkbox-group',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    component: function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const rawValue = useBoundFieldValue(name, currentForm);
      const value = Array.isArray(rawValue) ? rawValue : [];
      const options = Array.isArray(props.props.options) ? (props.props.options as CheckboxGroupSchema['options']) : [];
      const presentation = useFieldPresentation(name, currentForm);
      const labelContent = resolveFieldLabelContent(props);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });

      return (
        <fieldset className={presentation.className}>
          <FieldLabel content={labelContent} as="legend" />
          <div className="nop-checkbox-group">
            {options?.map((option) => {
              const checked = value.some((candidate) => Object.is(candidate, option.value));

              return (
                <label key={option.value} className="nop-checkbox">
                  <input
                    className="nop-checkbox__input"
                    type="checkbox"
                    value={option.value}
                    checked={checked}
                     aria-invalid={presentation.showError ? true : undefined}
                     onFocus={handlers.onFocus}
                     onChange={(event) => {
                        const nextValue = event.target.checked
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
          <FieldHint
            errorMessage={presentation.fieldState.error?.message}
            validating={presentation.fieldState.validating}
            showError={presentation.showError}
          />
        </fieldset>
      );
    }
  }
];

