import { useCallback, useEffect, useRef } from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { useCurrentFormModelGeneration, useSchemaProps } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { formLabelFieldRule, useFormFieldController } from '@nop-chaos/flux-renderers-form';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import type {
  ConditionBuilderSchema,
  ConditionGroupValue,
  ConditionOperatorOverrides,
  ConditionField,
} from './types';
import { ConditionGroup } from './condition-group';
import { genId } from './id-utils';
import { groupValuesEqual } from './utils';

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

function getConditionCountLabel(count: number): string {
  return t('conditionBuilder.conditionCount', { count });
}

function getRequiredMessage(label: string): string {
  return t('conditionBuilder.requiredMessage', { label });
}

export function ConditionBuilderRenderer(props: RendererComponentProps<ConditionBuilderSchema>) {
  const name = String(props.props.name ?? '');
  const { currentForm, value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    areValuesEqual: groupValuesEqual,
  });

  const schemaProps = useSchemaProps(props);
  const operatorsOverride = schemaProps.operators;
  const fields = (schemaProps.fields ?? []) as ConditionField[];

  const valueRef = useRef<ConditionGroupValue>(toGroupValue(undefined));
  const registrationRef = useRef<RuntimeFieldRegistration | undefined>(undefined);
  const modelGeneration = useCurrentFormModelGeneration();

  const effectiveValue = toGroupValue(value);

  useEffect(() => {
    valueRef.current = effectiveValue;
  }, [effectiveValue]);

  const syncValue = useCallback(
    (next: ConditionGroupValue) => {
      valueRef.current = next;
      handlers.onChange(next);
    },
    [handlers],
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
    <div className={cn('nop-condition-builder')}>
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
    <div className={cn('nop-condition-builder')}>
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
                  ? getConditionCountLabel(value.children.length)
                  : (schema.placeholder ?? t('conditionBuilder.pickerPlaceholder'))}
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
          message: getRequiredMessage(
            String(schema.label ?? schema.name ?? t('conditionBuilder.conditionLabel')),
          ),
        });
      }
      return rules;
    },
  },
  wrap: true,
};
