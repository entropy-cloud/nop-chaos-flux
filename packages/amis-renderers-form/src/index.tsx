import React from 'react';
import type {
  ApiObject,
  BaseSchema,
  CompiledValidationBehavior,
  FormRuntime,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/amis-schema';
import { useCurrentForm, useCurrentFormState, useRenderScope } from '@nop-chaos/amis-react';

const defaultValidationBehavior: CompiledValidationBehavior = {
  triggers: ['blur'],
  showErrorOn: ['touched', 'submit']
};

function getFieldValidationBehavior(name: string, currentForm: FormRuntime | undefined): CompiledValidationBehavior {
  if (!currentForm || !name) {
    return defaultValidationBehavior;
  }

  const field = currentForm.validation?.fields[name];
  return field?.behavior ?? currentForm.validation?.behavior ?? defaultValidationBehavior;
}

function shouldValidateOn(name: string, currentForm: FormRuntime | undefined, trigger: 'change' | 'blur' | 'submit') {
  return getFieldValidationBehavior(name, currentForm).triggers.includes(trigger);
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

function readFieldValue(scope: ReturnType<typeof useRenderScope>, name: string): unknown {
  return name ? scope.get(name) ?? '' : '';
}

function getFieldClassName(state: {
  visited: boolean;
  touched: boolean;
  dirty: boolean;
  showError: boolean;
}) {
  return [
    'na-field',
    state.visited ? 'na-field--visited' : '',
    state.touched ? 'na-field--touched' : '',
    state.dirty ? 'na-field--dirty' : '',
    state.showError ? 'na-field--invalid' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

function createFieldHandlers(args: {
  name: string;
  currentForm: FormRuntime | undefined;
  scope: ReturnType<typeof useRenderScope>;
  setValue: (value: string) => void;
}) {
  const { name, currentForm, scope, setValue } = args;

  return {
    onFocus() {
      if (currentForm && name) {
        currentForm.visitField(name);
      }
    },
    onChange(nextValue: string) {
      if (currentForm) {
        setValue(nextValue);

        if (shouldValidateOn(name, currentForm, 'change') && currentForm.isTouched(name)) {
          void currentForm.validateField(name);
        }

        return;
      }

      scope.update(name, nextValue);
    },
    onBlur() {
      if (currentForm && name) {
        currentForm.touchField(name);

        if (shouldValidateOn(name, currentForm, 'blur')) {
          void currentForm.validateField(name);
        }
      }
    }
  };
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

interface CheckboxSchema extends InputSchema {
  option?: {
    label: string;
    value?: string | boolean;
  };
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
  showError?: boolean;
}) {
  if (input.errorMessage && input.showError) {
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
    const behavior = getFieldValidationBehavior(name, currentForm);
    const handlers = createFieldHandlers({
      name,
      currentForm,
      scope,
      setValue(nextValue) {
        currentForm?.setValue(name, nextValue);
      }
    });
    const showError = Boolean(
      fieldState.error &&
        shouldShowFieldError(behavior, {
          touched: fieldState.touched,
          dirty: fieldState.dirty,
          visited: fieldState.visited,
          submitting: fieldState.submitting
        })
    );

    return (
      <label className={getFieldClassName({ ...fieldState, showError })}>
        {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
        <input
          className="na-input"
          type={inputType}
          value={String(value)}
          aria-invalid={showError ? true : undefined}
          placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
          onFocus={handlers.onFocus}
          onChange={(event) => handlers.onChange(event.target.value)}
          onBlur={handlers.onBlur}
        />
        {renderFieldHint({
          errorMessage: fieldState.error?.message,
          validating: fieldState.validating,
          showError
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
      const behavior = getFieldValidationBehavior(name, currentForm);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue);
        }
      });
      const showError = Boolean(
        fieldState.error &&
          shouldShowFieldError(behavior, {
            touched: fieldState.touched,
            dirty: fieldState.dirty,
            visited: fieldState.visited,
            submitting: fieldState.submitting
          })
      );

      return (
        <label className={getFieldClassName({ ...fieldState, showError })}>
          {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
          <select
            className="na-select"
            value={String(value)}
            aria-invalid={showError ? true : undefined}
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
          {renderFieldHint({
            errorMessage: fieldState.error?.message,
            validating: fieldState.validating,
            showError
          })}
        </label>
      );
    }
  },
  {
    type: 'checkbox',
    validation: createFieldValidation(),
    component: function CheckboxRenderer(props: RendererComponentProps<CheckboxSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = Boolean(readFieldValue(scope, name));
      const fieldState = useFormFieldState(name);
      const behavior = getFieldValidationBehavior(name, currentForm);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, nextValue === 'true');
        }
      });
      const showError = Boolean(
        fieldState.error &&
          shouldShowFieldError(behavior, {
            touched: fieldState.touched,
            dirty: fieldState.dirty,
            visited: fieldState.visited,
            submitting: fieldState.submitting
          })
      );
      const option = props.props.option as CheckboxSchema['option'] | undefined;
      const optionLabel = option?.label;

      return (
        <label className={getFieldClassName({ ...fieldState, showError })}>
          {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
          <span className="na-checkbox">
            <input
              className="na-checkbox__input"
              type="checkbox"
              checked={value}
              aria-invalid={showError ? true : undefined}
              onFocus={handlers.onFocus}
              onChange={(event) => handlers.onChange(String(event.target.checked))}
              onBlur={handlers.onBlur}
            />
            {optionLabel ? <span className="na-checkbox__label">{optionLabel}</span> : null}
          </span>
          {renderFieldHint({
            errorMessage: fieldState.error?.message,
            validating: fieldState.validating,
            showError
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
