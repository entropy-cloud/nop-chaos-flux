import React, { useCallback, useEffect, useRef } from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { useCurrentForm, useCurrentFormState, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import {
  formLabelFieldRule,
  readFieldValue,
  resolveFieldLabelContent,
  useFieldPresentation,
} from '../../field-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import { FieldHint, FieldLabel } from '../shared';
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
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const presentation = useFieldPresentation(name, currentForm);
  const labelContent = resolveFieldLabelContent(props);

  const operatorsOverride = props.props.operators as ConditionOperatorOverrides | undefined;
  const fields = (props.props.fields ?? []) as ConditionField[];
  const schemaOverride = props.props as unknown as ConditionBuilderSchema;

  const [localValue, setLocalValue] = React.useState<ConditionGroupValue>(() =>
    toGroupValue(readFieldValue(scope, name)),
  );
  const valueRef = useRef(localValue);
  const registrationRef = useRef<RuntimeFieldRegistration | undefined>(undefined);

  useEffect(() => {
    valueRef.current = localValue;
  }, [localValue]);

  const formExternalValue = useCurrentFormState(
    (state) => (currentForm && name ? toGroupValue(getIn(state.values, name)) : undefined),
    groupValuesEqual,
  ) as ConditionGroupValue | undefined;
  const scopeExternalValue = useScopeSelector(
    (scopeData) => (currentForm || !name ? undefined : toGroupValue(getIn(scopeData, name))),
    groupValuesEqual,
  ) as ConditionGroupValue | undefined;
  const externalValue = currentForm ? formExternalValue : scopeExternalValue;

  useEffect(() => {
    if (externalValue !== undefined && !groupValuesEqual(externalValue, valueRef.current)) {
      valueRef.current = externalValue;
      setLocalValue(externalValue);
    }
  }, [externalValue]);

  const syncValue = useCallback(
    (next: ConditionGroupValue) => {
      valueRef.current = next;
      setLocalValue(next);

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
    return currentForm.registerField(registration);
  }, [currentForm, name]);

  const embed = props.props.embed !== false;

  if (!embed) {
    return (
      <PickerModeContent
        value={localValue}
        fields={fields}
        schema={schemaOverride}
        operatorsOverride={operatorsOverride}
        onChange={syncValue}
        disabled={presentation.fieldState.submitting}
        labelContent={labelContent}
        presentation={presentation}
      />
    );
  }

  return (
    <label
      className={`nop-condition-builder ${presentation.className}`}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <ConditionGroup
        value={localValue}
        schema={schemaOverride}
        fields={fields}
        operatorsOverride={operatorsOverride}
        onChange={syncValue}
        disabled={presentation.fieldState.submitting}
        depth={0}
      />
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        validating={presentation.fieldState.validating}
        showError={presentation.showError}
      />
    </label>
  );
}

function PickerModeContent({
  value,
  fields,
  schema,
  operatorsOverride,
  onChange,
  disabled,
  labelContent,
  presentation,
}: {
  value: ConditionGroupValue;
  fields: ConditionField[];
  schema: ConditionBuilderSchema;
  operatorsOverride?: ConditionOperatorOverrides;
  onChange: (v: ConditionGroupValue) => void;
  disabled?: boolean;
  labelContent: React.ReactNode;
  presentation: ReturnType<typeof useFieldPresentation>;
}) {
  const hasConditions = value.children.length > 0;

  return (
    <label
      className={`nop-condition-builder ${presentation.className}`}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground"
            disabled={disabled}
          >
            <span className={hasConditions ? '' : 'text-muted-foreground'}>
              {hasConditions
                ? tf('conditionCount', value.children.length)
                : schema.placeholder ?? t('pickerPlaceholder')}
            </span>
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
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
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        validating={presentation.fieldState.validating}
        showError={presentation.showError}
      />
    </label>
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
