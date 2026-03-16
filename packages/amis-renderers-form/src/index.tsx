import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/amis-schema';
import { useCurrentForm, useRenderScope } from '@nop-chaos/amis-react';

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

    return (
      <label className="na-field">
        {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
        <input
          className="na-input"
          type={inputType}
          value={String(value)}
          placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
          onChange={(event) => {
            if (currentForm) {
              currentForm.setValue(name, event.target.value);
            } else {
              scope.update(name, event.target.value);
            }
          }}
        />
      </label>
    );
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
    component: createInputRenderer('text')
  },
  {
    type: 'input-email',
    component: createInputRenderer('email')
  },
  {
    type: 'input-password',
    component: createInputRenderer('password')
  },
  {
    type: 'select',
    component: function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
      const scope = useRenderScope();
      const currentForm = useCurrentForm();
      const name = String(props.props.name ?? props.schema.name ?? '');
      const value = readFieldValue(scope, name);
      const options = Array.isArray(props.props.options) ? (props.props.options as SelectSchema['options']) : [];

      return (
        <label className="na-field">
          {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
          <select
            className="na-select"
            value={String(value)}
            onChange={(event) => {
              if (currentForm) {
                currentForm.setValue(name, event.target.value);
              } else {
                scope.update(name, event.target.value);
              }
            }}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
