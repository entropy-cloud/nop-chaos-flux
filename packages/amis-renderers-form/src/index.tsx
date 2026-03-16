import React from 'react';
import type {
  ApiObject,
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/amis-schema';
import { useCurrentForm, useCurrentFormState, useRenderScope } from '@nop-chaos/amis-react';

function readFieldValue(scope: ReturnType<typeof useRenderScope>, name: string): unknown {
  return name ? scope.get(name) ?? '' : '';
}

interface FormSchema extends BaseSchema {
  type: 'form';
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: Record<string, any>;
}

interface SelectSchema extends InputSchema {
  options?: Array<{ label: string; value: string }>;
}

interface InputSchema extends BaseSchema {
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  validate?: {
    api?: ApiObject;
    debounce?: number;
    message?: string;
  };
}

function useFormFieldState(name: string) {
  return useCurrentFormState(
    (state) => ({
      error: name ? state.errors[name]?.[0] : undefined,
      validating: name ? state.validating[name] === true : false,
      touched: name ? state.touched[name] === true : false,
      dirty: name ? state.dirty[name] === true : false,
      visited: name ? state.visited[name] === true : false,
      submitting: state.submitting
    }),
    (left, right) =>
      left.error === right.error &&
      left.validating === right.validating &&
      left.touched === right.touched &&
      left.dirty === right.dirty &&
      left.visited === right.visited &&
      left.submitting === right.submitting
  );
}

function renderFieldHint(input: {
  errorMessage?: string;
  validating?: boolean;
  touched?: boolean;
  submitting?: boolean;
}) {
  if (input.errorMessage && (input.touched || input.submitting)) {
    return <span className="na-field__error">{input.errorMessage}</span>;
  }

  if (input.validating) {
    return <span className="na-field__hint">Validating...</span>;
  }

  return null;
}

function FormRenderer(props: RendererComponentProps<FormSchema>) {
  return (
    <section className="na-form">
      <div className="na-form__body">{props.regions.body?.render()}</div>
      <div className="na-form__actions">{props.regions.actions?.render()}</div>
    </section>
  );
}

function createInputRenderer(inputType: string) {
  return function InputRenderer(props: RendererComponentProps<InputSchema>) {
    const scope = useRenderScope();
    const currentForm = useCurrentForm();
    const name = String(props.props.name ?? props.schema.name ?? '');
    const value = readFieldValue(scope, name);
    const fieldState = useFormFieldState(name);
    const showError = fieldState.error && (fieldState.touched || fieldState.submitting);

    return (
      <label
        className={[
          'na-field',
          fieldState.visited ? 'na-field--visited' : '',
          fieldState.touched ? 'na-field--touched' : '',
          fieldState.dirty ? 'na-field--dirty' : '',
          showError ? 'na-field--invalid' : ''
        ].filter(Boolean).join(' ')}
      >
        {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
        <input
          className="na-input"
          type={inputType}
          value={String(value)}
          aria-invalid={showError ? true : undefined}
          placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
            }
          }}
          onChange={(event) => {
            if (currentForm) {
              currentForm.setValue(name, event.target.value);

              if (name && currentForm.isTouched(name)) {
                void currentForm.validateField(name);
              }
            } else {
              scope.update(name, event.target.value);
            }
          }}
          onBlur={() => {
            if (currentForm && name) {
              currentForm.touchField(name);
              void currentForm.validateField(name);
            }
          }}
        />
        {renderFieldHint({
          errorMessage: fieldState.error?.message,
          validating: fieldState.validating,
          touched: fieldState.touched,
          submitting: fieldState.submitting
        })}
      </label>
    );
  };
}

function createFieldValidation(nameResolver?: (schema: InputSchema) => string | undefined, email?: boolean) {
  return {
    kind: 'field' as const,
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

export const formRendererDefinitions: RendererDefinition[] = [
  {
    type: 'form',
    component: FormRenderer,
    regions: ['body', 'actions'],
    scopePolicy: 'form'
  },
  {
    type: 'input-text',
    component: createInputRenderer('text'),
    validation: createFieldValidation()
  },
  {
    type: 'input-email',
    component: createInputRenderer('email'),
    validation: createFieldValidation(undefined, true)
  },
  {
    type: 'input-password',
    component: createInputRenderer('password'),
    validation: createFieldValidation()
  },
  {
    type: 'select',
    validation: createFieldValidation(),
    component: function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = readFieldValue(scope, name);
      const options = Array.isArray(props.props.options) ? (props.props.options as SelectSchema['options']) : [];
      const fieldState = useFormFieldState(name);
      const showError = fieldState.error && (fieldState.touched || fieldState.submitting);

      return (
        <label
          className={[
            'na-field',
            fieldState.visited ? 'na-field--visited' : '',
            fieldState.touched ? 'na-field--touched' : '',
            fieldState.dirty ? 'na-field--dirty' : '',
            showError ? 'na-field--invalid' : ''
          ].filter(Boolean).join(' ')}
        >
          {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
          <select
            className="na-select"
            value={String(value)}
            aria-invalid={showError ? true : undefined}
            onFocus={() => {
              if (currentForm && name) {
                currentForm.visitField(name);
              }
            }}
            onChange={(event) => {
              if (currentForm) {
                currentForm.setValue(name, event.target.value);

                if (name && currentForm.isTouched(name)) {
                  void currentForm.validateField(name);
                }
              } else {
                scope.update(name, event.target.value);
              }
            }}
            onBlur={() => {
              if (currentForm && name) {
                currentForm.touchField(name);
                void currentForm.validateField(name);
              }
            }}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {renderFieldHint({
            errorMessage: fieldState.error?.message,
            validating: fieldState.validating,
            touched: fieldState.touched,
            submitting: fieldState.submitting
          })}
        </label>
      );
    }
  }
];

export function registerFormRenderers(registry: RendererRegistry) {
  for (const definition of formRendererDefinitions) {
    registry.register(definition);
  }

  return registry;
}
