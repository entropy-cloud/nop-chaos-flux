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
import { formFieldRules, useFormFieldController } from '@nop-chaos/flux-renderers-form';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import type {
  ConditionBuilderSchema,
  ConditionGroupValue,
  ConditionItemValue,
  ConditionOperatorOverrides,
  ConditionField,
} from './types.js';
import { ConditionGroup } from './condition-group.js';
import { genId } from './id-utils.js';
import { groupValuesEqual } from './utils.js';

function convertAmisRule(rule: unknown): ConditionGroupValue | ConditionItemValue {
  if (!rule || typeof rule !== 'object') {
    return { id: genId('item'), left: { type: 'field', field: '' }, op: 'eq' };
  }
  const r = rule as Record<string, unknown>;
  if ('rules' in r || 'children' in r) {
    const raw = r as { combinator?: string; conjunction?: string; rules?: unknown[]; children?: unknown[]; not?: boolean };
    return {
      id: genId('group'),
      conjunction: (raw.combinator === 'or' || raw.conjunction === 'or') ? 'or' : 'and',
      not: raw.not,
      children: ((raw.rules ?? raw.children ?? []) as unknown[]).map(convertAmisRule),
    };
  }
  return {
    id: genId('item'),
    left: { type: 'field', field: (r.field as string) ?? '' },
    op: (r.operator as string) ?? 'eq',
    right: r.value,
  };
}

function toGroupValue(value: unknown): ConditionGroupValue {
  if (value && typeof value === 'object') {
    if ('children' in value) {
      return value as ConditionGroupValue;
    }
    if ('rules' in value) {
      return convertAmisRule(value) as ConditionGroupValue;
    }
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
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
    areValuesEqual: groupValuesEqual,
  });

  const schemaProps = useSchemaProps(props) as ConditionBuilderSchema;
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

  const embed = schemaProps.embed !== false;

  if (!embed) {
    return (
      <PickerModeContent
        value={effectiveValue}
        fields={fields}
        schema={schemaProps}
        className={props.meta.className}
        operatorsOverride={operatorsOverride}
        onChange={syncValue}
        disabled={presentation.effectiveDisabled || presentation.fieldState.submitting}
      />
    );
  }

  return (
    <div
      className={cn('nop-condition-builder', props.meta.className)}
    >
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
  className,
  operatorsOverride,
  onChange,
  disabled,
}: {
  value: ConditionGroupValue;
  fields: ConditionField[];
  schema: ConditionBuilderSchema;
  className?: string;
  operatorsOverride?: ConditionOperatorOverrides;
  onChange: (v: ConditionGroupValue) => void;
  disabled?: boolean;
}) {
  const hasConditions = value.children.length > 0;

  return (
    <div className={cn('nop-condition-builder', className)}>
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
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: ConditionBuilderRenderer,
  fields: formFieldRules,
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
  frameRootTag: 'div',
};
