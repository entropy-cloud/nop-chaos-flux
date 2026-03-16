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

interface TextareaSchema extends InputSchema {
  rows?: number;
}

interface RadioGroupSchema extends InputSchema {
  options?: Array<{ label: string; value: string }>;
}

interface CheckboxGroupSchema extends InputSchema {
  options?: Array<{ label: string; value: string }>;
}

interface CheckboxSchema extends InputSchema {
  option?: {
    label: string;
    value?: string | boolean;
  };
}

interface SwitchSchema extends InputSchema {
  option?: {
    onLabel?: string;
    offLabel?: string;
  };
}

interface TagListSchema extends InputSchema {
  tags?: string[];
}

interface KeyValueSchema extends InputSchema {
  addLabel?: string;
}

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
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

function useFieldPresentation(name: string, currentForm: FormRuntime | undefined) {
  const fieldState = useFormFieldState(name);
  const behavior = getFieldValidationBehavior(name, currentForm);
  const showError = Boolean(
    fieldState.error &&
      shouldShowFieldError(behavior, {
        touched: fieldState.touched,
        dirty: fieldState.dirty,
        visited: fieldState.visited,
        submitting: fieldState.submitting
      })
  );

  return {
    fieldState,
    showError,
    className: getFieldClassName({ ...fieldState, showError })
  };
}

function readCheckboxGroupValue(scope: ReturnType<typeof useRenderScope>, name: string): string[] {
  const value = readFieldValue(scope, name);
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function toKeyValuePairs(value: unknown): KeyValuePair[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const candidate = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    return {
      id: typeof candidate.id === 'string' ? candidate.id : `pair-${index}`,
      key: typeof candidate.key === 'string' ? candidate.key : '',
      value: typeof candidate.value === 'string' ? candidate.value : ''
    };
  });
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
      <label className={presentation.className}>
        {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
        <input
          className="na-input"
          type={inputType}
          value={String(value)}
          aria-invalid={presentation.showError ? true : undefined}
          placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
          onFocus={handlers.onFocus}
          onChange={(event) => handlers.onChange(event.target.value)}
          onBlur={handlers.onBlur}
        />
        {renderFieldHint({
          errorMessage: presentation.fieldState.error?.message,
          validating: presentation.fieldState.validating,
          showError: presentation.showError
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

function TagListRenderer(props: RendererComponentProps<TagListSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const value = readCheckboxGroupValue(scope, name);
  const presentation = useFieldPresentation(name, currentForm);
  const tags = Array.isArray(props.props.tags) ? (props.props.tags as string[]) : [];

  const syncErrorVisibility = React.useCallback(() => {
    if (!currentForm || !name) {
      return;
    }

    if (currentForm.isTouched(name) || currentForm.store.getState().submitting) {
      void currentForm.validateField(name);
    }
  }, [currentForm, name]);

  React.useEffect(() => {
    if (!currentForm || !name) {
      return;
    }

    return currentForm.registerField({
      path: name,
      getValue() {
        return currentForm.scope.get(name);
      },
      validate() {
        const currentValue = currentForm.scope.get(name);
        const tags = Array.isArray(currentValue) ? currentValue.map((item) => String(item)) : [];

        if (tags.length === 0) {
          return [
            {
              path: name,
              rule: 'required',
              message: `${props.meta.label ?? name} requires at least one tag`
            }
          ];
        }

        return [];
      }
    });
  }, [currentForm, name, props.meta.label]);

  return (
    <label className={presentation.className}>
      {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
      <div className="na-tag-list">
        {tags.map((tag) => {
          const active = value.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              className={active ? 'na-tag na-tag--active' : 'na-tag'}
              onFocus={() => {
                if (currentForm && name) {
                  currentForm.visitField(name);
                }
              }}
              onClick={() => {
                const nextValue = active ? value.filter((item) => item !== tag) : [...value, tag];

                if (currentForm) {
                  if (!currentForm.isTouched(name)) {
                    currentForm.touchField(name);
                  }
                  currentForm.setValue(name, nextValue);
                  syncErrorVisibility();
                } else {
                  scope.update(name, nextValue);
                }
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {renderFieldHint({
        errorMessage: presentation.fieldState.error?.message,
        validating: presentation.fieldState.validating,
        showError: presentation.showError
      })}
    </label>
  );
}

function KeyValueRenderer(props: RendererComponentProps<KeyValueSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const presentation = useFieldPresentation(name, currentForm);
  const [pairs, setPairs] = React.useState<KeyValuePair[]>(() => toKeyValuePairs(readFieldValue(scope, name)));

  const syncField = React.useCallback(
    (nextPairs: KeyValuePair[]) => {
      setPairs(nextPairs);

      if (!currentForm || !name) {
        scope.update(name, nextPairs);
        return;
      }

      if (!currentForm.isTouched(name)) {
        currentForm.touchField(name);
      }

      currentForm.setValue(name, nextPairs);
      void currentForm.validateField(name);
    },
    [currentForm, name, scope]
  );

  React.useEffect(() => {
    if (!currentForm || !name) {
      return;
    }

    return currentForm.registerField({
      path: name,
      getValue() {
        return pairs;
      },
      validate() {
        const nonEmptyPairs = pairs.filter((pair) => pair.key.trim() !== '' || pair.value.trim() !== '');

        if (nonEmptyPairs.length === 0) {
          return [
            {
              path: name,
              rule: 'required',
              message: `${props.meta.label ?? name} requires at least one entry`
            }
          ];
        }

        const incomplete = nonEmptyPairs.find((pair) => pair.key.trim() === '' || pair.value.trim() === '');

        if (incomplete) {
          return [
            {
              path: name,
              rule: 'pattern',
              message: `${props.meta.label ?? name} entries need both key and value`
            }
          ];
        }

        return [];
      }
    });
  }, [currentForm, name, pairs, props.meta.label]);

  return (
    <label className={presentation.className}>
      {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
      <div className="na-kv-list">
        {pairs.map((pair, index) => (
          <div key={pair.id} className="na-kv-row">
            <input
              className="na-input"
              type="text"
              value={pair.key}
              placeholder="Key"
              onFocus={() => {
                if (currentForm && name) {
                  currentForm.visitField(name);
                }
              }}
              onChange={(event) => {
                const nextPairs = pairs.map((candidate, candidateIndex) =>
                  candidateIndex === index ? { ...candidate, key: event.target.value } : candidate
                );
                syncField(nextPairs);
              }}
            />
            <input
              className="na-input"
              type="text"
              value={pair.value}
              placeholder="Value"
              onFocus={() => {
                if (currentForm && name) {
                  currentForm.visitField(name);
                }
              }}
              onChange={(event) => {
                const nextPairs = pairs.map((candidate, candidateIndex) =>
                  candidateIndex === index ? { ...candidate, value: event.target.value } : candidate
                );
                syncField(nextPairs);
              }}
            />
            <button
              type="button"
              className="na-kv-remove"
              onClick={() => {
                syncField(pairs.filter((candidate) => candidate.id !== pair.id));
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="na-kv-add"
          onClick={() => {
            syncField([...pairs, { id: `pair-${pairs.length + 1}`, key: '', value: '' }]);
          }}
        >
          {props.props.addLabel ? String(props.props.addLabel) : 'Add entry'}
        </button>
      </div>
      {renderFieldHint({
        errorMessage: presentation.fieldState.error?.message,
        validating: presentation.fieldState.validating,
        showError: presentation.showError
      })}
    </label>
  );
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
        <label className={presentation.className}>
          {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
          <select
            className="na-select"
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
          {renderFieldHint({
            errorMessage: presentation.fieldState.error?.message,
            validating: presentation.fieldState.validating,
            showError: presentation.showError
          })}
        </label>
      );
    }
  },
  {
    type: 'textarea',
    component: function TextareaRenderer(props: RendererComponentProps<TextareaSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = readFieldValue(scope, name);
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
        <label className={presentation.className}>
          {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
          <textarea
            className="na-textarea"
            value={String(value)}
            rows={typeof props.props.rows === 'number' ? props.props.rows : 4}
            aria-invalid={presentation.showError ? true : undefined}
            placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
            onFocus={handlers.onFocus}
            onChange={(event) => handlers.onChange(event.target.value)}
            onBlur={handlers.onBlur}
          />
          {renderFieldHint({
            errorMessage: presentation.fieldState.error?.message,
            validating: presentation.fieldState.validating,
            showError: presentation.showError
          })}
        </label>
      );
    },
    validation: createFieldValidation()
  },
  {
    type: 'checkbox',
    validation: createFieldValidation(),
    component: function CheckboxRenderer(props: RendererComponentProps<CheckboxSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = Boolean(readFieldValue(scope, name));
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
        <label className={presentation.className}>
          {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
          <span className="na-checkbox">
            <input
              className="na-checkbox__input"
              type="checkbox"
              checked={value}
              aria-invalid={presentation.showError ? true : undefined}
              onFocus={handlers.onFocus}
              onChange={(event) => handlers.onChange(String(event.target.checked))}
              onBlur={handlers.onBlur}
            />
            {optionLabel ? <span className="na-checkbox__label">{optionLabel}</span> : null}
          </span>
          {renderFieldHint({
            errorMessage: presentation.fieldState.error?.message,
            validating: presentation.fieldState.validating,
            showError: presentation.showError
          })}
        </label>
      );
    }
  },
  {
    type: 'switch',
    validation: createFieldValidation(),
    component: function SwitchRenderer(props: RendererComponentProps<SwitchSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = Boolean(readFieldValue(scope, name));
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
        <label className={presentation.className}>
          {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
          <span className="na-switch">
            <input
              className="na-switch__input"
              type="checkbox"
              role="switch"
              checked={value}
              aria-invalid={presentation.showError ? true : undefined}
              onFocus={handlers.onFocus}
              onChange={(event) => handlers.onChange(String(event.target.checked))}
              onBlur={handlers.onBlur}
            />
            <span className="na-switch__track">
              <span className="na-switch__thumb" />
            </span>
            <span className="na-switch__label">{value ? option?.onLabel ?? 'On' : option?.offLabel ?? 'Off'}</span>
          </span>
          {renderFieldHint({
            errorMessage: presentation.fieldState.error?.message,
            validating: presentation.fieldState.validating,
            showError: presentation.showError
          })}
        </label>
      );
    }
  },
  {
    type: 'radio-group',
    validation: createFieldValidation(),
    component: function RadioGroupRenderer(props: RendererComponentProps<RadioGroupSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = String(readFieldValue(scope, name));
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
        <fieldset className={presentation.className}>
          {props.meta.label ? <legend className="na-field__label">{props.meta.label}</legend> : null}
          <div className="na-radio-group">
            {options?.map((option) => (
              <label key={option.value} className="na-radio">
                <input
                  className="na-radio__input"
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  aria-invalid={presentation.showError ? true : undefined}
                  onFocus={handlers.onFocus}
                  onChange={(event) => handlers.onChange(event.target.value)}
                  onBlur={handlers.onBlur}
                />
                <span className="na-radio__label">{option.label}</span>
              </label>
            ))}
          </div>
          {renderFieldHint({
            errorMessage: presentation.fieldState.error?.message,
            validating: presentation.fieldState.validating,
            showError: presentation.showError
          })}
        </fieldset>
      );
    }
  },
  {
    type: 'checkbox-group',
    validation: createFieldValidation(),
    component: function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = readCheckboxGroupValue(scope, name);
      const options = Array.isArray(props.props.options) ? (props.props.options as CheckboxGroupSchema['options']) : [];
      const presentation = useFieldPresentation(name, currentForm);
      const handlers = createFieldHandlers({
        name,
        currentForm,
        scope,
        setValue(nextValue) {
          currentForm?.setValue(name, JSON.parse(nextValue) as string[]);
        }
      });

      return (
        <fieldset className={presentation.className}>
          {props.meta.label ? <legend className="na-field__label">{props.meta.label}</legend> : null}
          <div className="na-checkbox-group">
            {options?.map((option) => {
              const checked = value.includes(option.value);

              return (
                <label key={option.value} className="na-checkbox">
                  <input
                    className="na-checkbox__input"
                    type="checkbox"
                    value={option.value}
                    checked={checked}
                    aria-invalid={presentation.showError ? true : undefined}
                    onFocus={handlers.onFocus}
                    onChange={(event) => {
                      const nextValue = event.target.checked
                        ? [...value, option.value]
                        : value.filter((candidate) => candidate !== option.value);
                      handlers.onChange(JSON.stringify(nextValue));
                    }}
                    onBlur={handlers.onBlur}
                  />
                  <span className="na-checkbox__label">{option.label}</span>
                </label>
              );
            })}
          </div>
          {renderFieldHint({
            errorMessage: presentation.fieldState.error?.message,
            validating: presentation.fieldState.validating,
            showError: presentation.showError
          })}
        </fieldset>
      );
    }
  },
  {
    type: 'tag-list',
    component: TagListRenderer
  },
  {
    type: 'key-value',
    component: KeyValueRenderer
  }
];

export function registerFormRenderers(registry: RendererRegistry) {
  for (const definition of formRendererDefinitions) {
    registry.register(definition);
  }

  return registry;
}
