import React, { useCallback, useEffect, useRef } from 'react';
import type {
  BaseSchema,
  FormRuntime,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
  ScopeRef,
  ValidationRule,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { useCurrentFormModelGeneration, useCurrentValidationScope, useSchemaProps } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { formFieldRules, useFormFieldController } from '@nop-chaos/flux-renderers-form';
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import type {
  ConditionBuilderSchema,
  ConditionField,
  ConditionGroupValue,
  ConditionItemValue,
  ConditionOperatorOverrides,
} from './types.js';
import { ConditionGroup } from './condition-group.js';
import { genId } from './id-utils.js';
import { groupValuesEqual, sanitizeNode, sanitizeRight } from './utils.js';
import { createProjectedInlineForm } from '../composite-field/projected-inline-form.js';
import { createProjectedValidationRuntime } from '../detail-view/projected-validation-runtime.js';
import { createProjectedOwnerScope } from '../projected-owner-scope.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

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
    right: sanitizeRight(r.value),
  };
}

function toGroupValue(value: unknown): ConditionGroupValue {
  if (value && typeof value === 'object') {
    if ('children' in value) {
      return sanitizeNode(value as ConditionGroupValue) as ConditionGroupValue;
    }
    if ('rules' in value) {
      return sanitizeNode(convertAmisRule(value) as ConditionGroupValue) as ConditionGroupValue;
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
  const { currentForm, scope, value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
    areValuesEqual: groupValuesEqual,
  });
  const currentValidationScope = useCurrentValidationScope();

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

  const disabled = presentation.effectiveDisabled || presentation.fieldState.submitting;

  const createItemScope = useCallback(
    (item: ConditionItemValue): ScopeRef =>
      createProjectedOwnerScope({
        parentScope: scope,
        scopeId: `${scope.id}:condition-builder:${item.id}`,
        scopePath: `${scope.path}.${name || '$conditionBuilder'}.${item.id}.value`,
        readOnly: disabled,
        getValue: () => item.right,
        setValue(nextValue) {
          syncValue(rewriteItemRight(valueRef.current, item.id, nextValue));
        },
        getExtraPayload: () => ({ field: item.left.field, op: item.op, disabled }),
        getNestedValue(path) {
          return readNestedPath(item.right, path);
        },
        hasNestedValue(path) {
          return readNestedPath(item.right, path) !== undefined;
        },
        setNestedValue(path, nextValue) {
          syncValue(rewriteItemRight(valueRef.current, item.id, setNestedPath(item.right, path, nextValue)));
        },
        merge(data) {
          if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
            syncValue(rewriteItemRight(valueRef.current, item.id, (data as Record<string, unknown>).value));
            return;
          }

          syncValue(rewriteItemRight(valueRef.current, item.id, data));
        },
        replace(data) {
          if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
            syncValue(rewriteItemRight(valueRef.current, item.id, (data as Record<string, unknown>).value));
            return;
          }

          syncValue(rewriteItemRight(valueRef.current, item.id, data));
        },
      }),
    [disabled, name, scope, syncValue],
  );

  const createItemForm = useCallback(
    (item: ConditionItemValue): FormRuntime | undefined => {
      if (!currentForm) {
        return undefined;
      }

      return createProjectedInlineForm({
        parentForm: currentForm,
        ownerRootPath: name,
        prefixPath(path) {
          if (path === 'value') {
            return name;
          }

          return name ? `${name}.${path}` : path;
        },
        scalarValueAlias: 'value',
        projectValues() {
          return { value: item.right };
        },
        setValue(path, nextValue) {
          if (!path || path === 'value') {
            syncValue(rewriteItemRight(valueRef.current, item.id, nextValue));
            return;
          }

          syncValue(rewriteItemRight(valueRef.current, item.id, setNestedPath(item.right, path, nextValue)));
        },
        setValues(values) {
          if ('value' in values) {
            syncValue(rewriteItemRight(valueRef.current, item.id, values.value));
          }
        },
      });
    },
    [currentForm, name, syncValue],
  );

  const createItemValidationOwner = useCallback(
    (_item: ConditionItemValue): ValidationScopeRuntime | undefined => {
      if (!currentValidationScope || !name) {
        return undefined;
      }

      return createProjectedValidationRuntime(currentValidationScope, {
        ownerRootPath: name,
        prefixPath(path) {
          if (path === 'value') {
            return name;
          }

          return name ? `${name}.${path}` : path;
        },
        scalarValueAlias: 'value',
      });
    },
    [currentValidationScope, name],
  );

  const renderCustomSchema = useCallback(
    (schema: BaseSchema, options: { field: Extract<ConditionField, { type: 'custom' }>; op: string; value: unknown; disabled?: boolean; scope: ScopeRef }) =>
      asReactNode(
        props.helpers.render(schema, {
          scope: options.scope,
          pathSuffix: 'custom-value-editor',
        }),
      ),
    [props.helpers],
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
        disabled={disabled}
        renderCustomSchema={renderCustomSchema}
        projectedFormFactory={createItemForm}
        projectedScopeFactory={createItemScope}
        projectedValidationFactory={createItemValidationOwner}
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
        disabled={disabled}
        depth={0}
        renderCustomSchema={renderCustomSchema}
        projectedFormFactory={createItemForm}
        projectedScopeFactory={createItemScope}
        projectedValidationFactory={createItemValidationOwner}
      />
    </div>
  );
}

function rewriteItemRight(group: ConditionGroupValue, itemId: string, right: unknown): ConditionGroupValue {
  return {
    ...group,
    children: group.children.map((child) => {
      if ('children' in child) {
        return rewriteItemRight(child, itemId, right);
      }

      if (child.id !== itemId) {
        return child;
      }

      return {
        ...child,
        right,
      };
    }),
  };
}

function readNestedPath(value: unknown, path: string): unknown {
  if (!path) {
    return value;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, value);
}

function setNestedPath(value: unknown, path: string, nextValue: unknown): unknown {
  if (!path) {
    return nextValue;
  }

  const segments = path.split('.');
  const root = value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
  let cursor: Record<string, unknown> = root;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const current = cursor[segment];
    const next = current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
    cursor[segment] = next;
    cursor = next;
  }

  cursor[segments[segments.length - 1]] = nextValue;
  return root;
}

function PickerModeContent({
  value,
  fields,
  schema,
  className,
  operatorsOverride,
  onChange,
  disabled,
  renderCustomSchema,
  projectedFormFactory,
  projectedScopeFactory,
  projectedValidationFactory,
}: {
  value: ConditionGroupValue;
  fields: ConditionField[];
  schema: ConditionBuilderSchema;
  className?: string;
  operatorsOverride?: ConditionOperatorOverrides;
  onChange: (v: ConditionGroupValue) => void;
  disabled?: boolean;
  renderCustomSchema?: (schema: BaseSchema, options: { field: Extract<ConditionField, { type: 'custom' }>; op: string; value: unknown; disabled?: boolean; scope: ScopeRef }) => React.ReactNode;
  projectedFormFactory?: (item: ConditionItemValue) => FormRuntime | undefined;
  projectedScopeFactory?: (item: ConditionItemValue) => ScopeRef;
  projectedValidationFactory?: (item: ConditionItemValue) => ValidationScopeRuntime | undefined;
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
              renderCustomSchema={renderCustomSchema}
              projectedFormFactory={projectedFormFactory}
              projectedScopeFactory={projectedScopeFactory}
              projectedValidationFactory={projectedValidationFactory}
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
