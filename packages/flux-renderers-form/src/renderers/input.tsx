import {
  type BaseSchema,
  stringAdapter,
  type RendererComponentProps,
  type RendererDefinition,
  type RendererSchemaValidationContext,
} from '@nop-chaos/flux-core';
import { Input } from '@nop-chaos/ui';
import { formFieldRules, useFormFieldController } from '../field-utils.js';
import type {
  InputSchema,
} from '../schemas.js';
import { validateHiddenFieldPolicySchema } from './hidden-field-policy-schema.js';
import {
  CheckboxGroupRenderer,
  CheckboxRenderer,
  RadioGroupRenderer,
  SelectRenderer,
  SwitchRenderer,
  TextareaRenderer,
} from './input-choice-renderers.js';
import { InputNumberRenderer } from './input-number-renderer.js';

export function validateInputFieldSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  validateHiddenFieldPolicySchema(context);
}

export function createInputRenderer(inputType: string) {
  return function InputRenderer(props: RendererComponentProps<InputSchema>) {
    const name = String(props.props.name ?? '');
    const { value, handlers, presentation } = useFormFieldController(name, {
      adapter: stringAdapter(),
      disabled: props.props.disabled,
      required: props.props.required,
      readOnly: props.props.readOnly,
    });
    const inputValue = value as string;
    const errorId = name ? `${name}-error` : undefined;

    return (
      <Input
        type={inputType}
        id={name ? `${name}-control` : undefined}
        name={name || undefined}
        value={inputValue}
        disabled={presentation.effectiveDisabled}
        aria-label={String((props.props.label ?? name) || '') || undefined}
        aria-required={props.props.required ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        aria-describedby={presentation.showError ? errorId : undefined}
        aria-errormessage={presentation.showError ? errorId : undefined}
        placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
        className={props.meta.className}
        onFocus={handlers.onFocus}
        onChange={(event) => handlers.onChange(event.target.value)}
        onBlur={handlers.onBlur}
      />
    );
  };
}

export function createFieldValidation(
  nameResolver?: (schema: InputSchema) => string | undefined,
  email?: boolean,
) {
  return {
    kind: 'field' as const,
    valueKind: 'scalar' as const,
    getFieldPath(schema: InputSchema) {
      return nameResolver ? nameResolver(schema) : schema.name;
    },
    collectRules(schema: InputSchema) {
      const rules: Array<
        | { kind: 'email' }
        | {
            kind: 'async';
            action: import('@nop-chaos/flux-core').ActionSchema;
            debounce?: number;
            message?: string;
          }
      > = email ? [{ kind: 'email' }] : [];

      if (schema.validate?.action) {
        rules.push({
          kind: 'async',
          action: schema.validate.action,
          debounce: schema.validate.debounce,
          message: schema.validate.message,
        });
      }

      return rules;
    },
  };
}

export const inputRendererDefinitions: RendererDefinition[] = [
  {
    type: 'input-text',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('text'),
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
  },
  {
    type: 'input-email',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('email'),
    fields: formFieldRules,
    validation: createFieldValidation(undefined, true),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
  },
  {
    type: 'input-password',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('password'),
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
  },
  {
    type: 'select',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: SelectRenderer,
  },
  {
    type: 'textarea',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: formFieldRules,
    component: TextareaRenderer,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
  },
  {
    type: 'checkbox',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: CheckboxRenderer,
  },
  {
    type: 'switch',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: SwitchRenderer,
  },
  {
    type: 'radio-group',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: RadioGroupRenderer,
  },
  {
    type: 'checkbox-group',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: CheckboxGroupRenderer,
  },
  {
    type: 'input-number',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: InputNumberRenderer,
  },
];
