import React, { useCallback, useEffect, useRef } from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { useCurrentFormState, useCurrentFormModelGeneration, useScopeSelector, useSchemaProps } from '@nop-chaos/flux-react';
import {
  formLabelFieldRule,
  useFormFieldController,
} from '@nop-chaos/flux-renderers-form';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import type {
  ConditionBuilderSchema,
  ConditionGroupValue,
  ConditionOperatorOverrides,
  ConditionField,
} from './types';
import { ConditionGroup } from './ConditionGroup';
import { genId } from './id-utils';
import { groupValuesEqual } from './utils';
import { t, tf } from './i18n';

function toGroupValue(value: unknown): ConditionGroupValue {
  if (value && typeof value === 'object' && 'children' in value) {
    return value as ConditionGroupValue;
  }
  return {
    id: genId('root'),
    conjunction: 'and',
    children: [],
  };
}

export function ConditionBuilderRenderer(props: RendererComponentProps<ConditionBuilderSchema>) {
  const name = String(props.props.name ?? '');
  const { currentForm, scope, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });

  const schemaProps = useSchemaProps(props);
  const operatorsOverride = schemaProps.operators;
  const fields = (schemaProps.fields ?? []) as ConditionField[];

  const valueRef = useRef<ConditionGroupValue>(toGroupValue(undefined));
  const registrationRef = useRef<RuntimeFieldRegistration | undefined>(undefined);
  const modelGeneration = useCurrentFormModelGeneration();

  const formExternalValue = useCurrentFormState(
    (state) => (currentForm && name ? toGroupValue(getIn(state.values, name)) : undefined),
    groupValuesEqual,
  ) as ConditionGroupValue | undefined;
  const scopeExternalValue = useScopeSelector(
    (scopeData) => (currentForm || !name ? undefined : toGroupValue(getIn(scopeData, name))),
    groupValuesEqual,
  ) as ConditionGroupValue | undefined;
  const externalValue = currentForm ? formExternalValue : scopeExternalValue;
  const effectiveValue = externalValue ?? toGroupValue(undefined);

  useEffect(() => {
    valueRef.current = effectiveValue;
  }, [effectiveValue]);

  const syncValue = useCallback(
    (next: ConditionGroupValue) => {
      valueRef.current = next;

      if (currentForm && name) {
        if (!currentForm.isTouched(name)) {
          currentForm.touchField(name);
        }
        currentForm.setValue(name, next);
        void currentForm.validateField(name);
        return;
      }

      if (name) {
        scope.update(name, next);
      }
    },
    [currentForm, name, scope],
  );

  useEffect(() => {
    if (!currentForm || !name) return;

    const registration: RuntimeFieldRegistration = {
      path: name,
      childPaths: [],
      getValue() {
        return valueRef.current;
      },
      syncValue() {
        return valueRef.current;
      },
      validateChild() {
        return [];
      },
    };

    registrationRef.current = registration;
    return currentForm.registerField(registration).unregister;
  }, [currentForm, modelGeneration, name]);

  const embed = props.props.embed !== false;

  if (!embed) {
    return (
      <PickerModeContent
        value={effectiveValue}
        fields={fields}
        schema={schemaProps}
        operatorsOverride={operatorsOverride}
        onChange={syncValue}
        disabled={presentation.effectiveDisabled || presentation.fieldState.submitting}
      />
    );
  }

  return (
    <div className="nop-condition-builder">
      <ConditionGroup
        value={effectiveValue}
        schema={schemaProps}
        fields={fields}
        operatorsOverride={operatorsOverride}
        onChange={syncValue}
        disabled={presentation.effectiveDisabled || presentation.fieldState.submitting}
        depth={0}
      />
    </div>
  );
}

function PickerModeContent({
  value,
  fields,
  schema,
  operatorsOverride,
  onChange,
  disabled,
}: {
  value: ConditionGroupValue;
  fields: ConditionField[];
  schema: ConditionBuilderSchema;
  operatorsOverride?: ConditionOperatorOverrides;
  onChange: (v: ConditionGroupValue) => void;
  disabled?: boolean;
}) {
  const hasConditions = value.children.length > 0;

  return (
    <div className="nop-condition-builder">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="flex h-9 w-full items-center justify-between px-3 py-2 text-sm"
              disabled={disabled}
            >
              <span className={hasConditions ? '' : 'text-muted-foreground'}>
                {hasConditions
                  ? tf('conditionCount', value.children.length)
                  : schema.placeholder ?? t('pickerPlaceholder')}
              </span>
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 max-h-[60vh] overflow-auto">
            <ConditionGroup
              value={value}
              schema={schema}
              fields={fields}
              operatorsOverride={operatorsOverride}
              onChange={onChange}
              disabled={disabled}
              depth={0}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const conditionBuilderRendererDefinition: RendererDefinition = {
  type: 'condition-builder',
  component: ConditionBuilderRenderer,
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const rules: ValidationRule[] = [];
      if (schema.required) {
        rules.push({
          kind: 'required',
          message: tf('requiredMessage', String(schema.label ?? schema.name ?? '条件')),
        });
      }
      return rules;
    },
  },
  wrap: true,
};
