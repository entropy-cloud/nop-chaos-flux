import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  BaseSchema,
  FormRuntime,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
  ScopeRef,
  SourceSchema,
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
  ConditionFormulaConfig,
  ConditionGroupValue,
  ConditionItemValue,
  ConditionOperatorOverrides,
} from './types.js';
import { ConditionGroup } from './condition-group.js';
import { genId } from './id-utils.js';
import { groupValuesEqual, rewriteItemRight, sanitizeNode, sanitizeRight } from './utils.js';

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

export interface FormulaEvaluationResult {
  value: unknown;
  error: boolean;
}

export type EvaluateConditionFormula = (formula: string) => Promise<FormulaEvaluationResult>;

function createFormulaEvaluator(
  helpers: RendererComponentProps<ConditionBuilderSchema>['helpers'],
  scope: ScopeRef,
  formulas: ConditionFormulaConfig | undefined,
): EvaluateConditionFormula {
  return async (formula: string): Promise<FormulaEvaluationResult> => {
    if (!formula) return { value: undefined, error: false };
    try {
      let contextScope = scope;
      const sourceExpr = formulas?.source;
      if (sourceExpr) {
        const sourceSchema: SourceSchema = { type: 'source', formula: sourceExpr };
        const result = await helpers.executeSource(sourceSchema, { scope });
        const sourceData = (result as { data?: unknown } | undefined)?.data ?? result;
        if (sourceData && typeof sourceData === 'object' && !Array.isArray(sourceData)) {
          contextScope = helpers.createScope(sourceData as Record<string, unknown>);
        }
      }
      const value = helpers.evaluate(formula, contextScope);
      return { value, error: false };
    } catch (err) {
      console.warn('[condition-builder] formula eval error:', err);
      return { value: formula, error: true };
    }
  };
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
  const staticFields = (schemaProps.fields ?? []) as ConditionField[];
  const formulas = schemaProps.formulas;
  const formulaForIf = schemaProps.formulaForIf;

  const fields = staticFields;
  const effectiveOperatorsOverride = operatorsOverride;

  const evaluateFormula = useMemo(
    () => createFormulaEvaluator(props.helpers, scope, formulas),
    [props.helpers, scope, formulas],
  );

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
  // Keep the latest syncValue in a ref so cached projection instances can call
  // it without capturing a churny closure (handlers identity churns each render,
  // which would otherwise reset the projection cache every render — H30). The
  // ref is updated in an effect, which is safe because projections invoke it on
  // user interaction (after the effect has flushed).
  const syncValueRef = useRef(syncValue);
  useEffect(() => {
    syncValueRef.current = syncValue;
  }, [syncValue]);

  const disabled = presentation.effectiveDisabled || presentation.fieldState.submitting;

  // H30: projected form/scope/validation instances are stable per item across
  // renders. `effectiveValue` is rebuilt every render (sanitizeNode), so child
  // identity churns; the cache keys each projection by item id and reuses the
  // cached instance as long as the item's `right` value is unchanged (deep
  // equality via groupValuesEqual). When `right` changes the projection is
  // rebuilt with the fresh item, so the editor never sees stale data; when it is
  // unchanged the same instance is returned, so downstream memoization stays
  // effective (no per-render churn). The cache itself resets whenever an input
  // that changes projection identity changes (useMemo deps below).
  const projectionCaches = React.useMemo(() => {
    // These inputs define projection identity; referencing them makes the
    // reset-on-change intent explicit (when any changes, the cache is rebuilt
    // so instances wrapping the old parent/scope are discarded).
    void currentForm;
    void currentValidationScope;
    void scope;
    void name;
    void disabled;
    return {
      form: new Map<string, { instance: FormRuntime | undefined; right: unknown }>(),
      scope: new Map<string, { instance: ScopeRef; right: unknown }>(),
      validation: new Map<string, ValidationScopeRuntime | undefined>(),
    };
  }, [currentForm, currentValidationScope, scope, name, disabled]);

  const createItemScope = useCallback(
    (item: ConditionItemValue): ScopeRef => {
      const id = item.id;
      const cached = projectionCaches.scope.get(id);
      if (cached && groupValuesEqual(cached.right, item.right)) {
        return cached.instance;
      }
      const projected = createProjectedOwnerScope({
        parentScope: scope,
        scopeId: `${scope.id}:condition-builder:${id}`,
        scopePath: `${scope.path}.${name || '$conditionBuilder'}.${id}.value`,
        readOnly: disabled,
        getValue: () => item.right,
        setValue(nextValue) {
          syncValueRef.current(rewriteItemRight(valueRef.current, id, nextValue));
        },
        getExtraPayload: () => ({ field: item.left.field, op: item.op, disabled }),
        getNestedValue(path) {
          return readNestedPath(item.right, path);
        },
        hasNestedValue(path) {
          return readNestedPath(item.right, path) !== undefined;
        },
        setNestedValue(path, nextValue) {
          syncValueRef.current(rewriteItemRight(valueRef.current, id, setNestedPath(item.right, path, nextValue)));
        },
        merge(data) {
          if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
            syncValueRef.current(rewriteItemRight(valueRef.current, id, (data as Record<string, unknown>).value));
            return;
          }

          syncValueRef.current(rewriteItemRight(valueRef.current, id, data));
        },
        replace(data) {
          if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
            syncValueRef.current(rewriteItemRight(valueRef.current, id, (data as Record<string, unknown>).value));
            return;
          }

          syncValueRef.current(rewriteItemRight(valueRef.current, id, data));
        },
      });
      projectionCaches.scope.set(id, { instance: projected, right: item.right });
      return projected;
    },
    [disabled, name, scope, projectionCaches],
  );

  const createItemForm = useCallback(
    (item: ConditionItemValue): FormRuntime | undefined => {
      const id = item.id;
      const cached = projectionCaches.form.get(id);
      if (cached && groupValuesEqual(cached.right, item.right)) {
        return cached.instance;
      }
      if (!currentForm) {
        projectionCaches.form.set(id, { instance: undefined, right: item.right });
        return undefined;
      }

      const form = createProjectedInlineForm({
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
            syncValueRef.current(rewriteItemRight(valueRef.current, id, nextValue));
            return;
          }

          syncValueRef.current(rewriteItemRight(valueRef.current, id, setNestedPath(item.right, path, nextValue)));
        },
        setValues(values) {
          if ('value' in values) {
            syncValueRef.current(rewriteItemRight(valueRef.current, id, values.value));
          }
        },
      });
      projectionCaches.form.set(id, { instance: form, right: item.right });
      return form;
    },
    [currentForm, name, projectionCaches],
  );

  const createItemValidationOwner = useCallback(
    (item: ConditionItemValue): ValidationScopeRuntime | undefined => {
      const id = item.id;
      const cached = projectionCaches.validation.get(id);
      if (cached) return cached;
      if (!currentValidationScope || !name) {
        return undefined;
      }

      const projected = createProjectedValidationRuntime(currentValidationScope, {
        ownerRootPath: name,
        prefixPath(path) {
          if (path === 'value') {
            return name;
          }

          return name ? `${name}.${path}` : path;
        },
        scalarValueAlias: 'value',
      });
      projectionCaches.validation.set(id, projected);
      return projected;
    },
    [currentValidationScope, name, projectionCaches],
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
        operatorsOverride={effectiveOperatorsOverride}
        onChange={syncValue}
        disabled={disabled}
        formulas={formulas}
        formulaForIf={formulaForIf}
        evaluateFormula={evaluateFormula}
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
        operatorsOverride={effectiveOperatorsOverride}
        onChange={syncValue}
        disabled={disabled}
        depth={0}
        formulas={formulas}
        formulaForIf={formulaForIf}
        evaluateFormula={evaluateFormula}
        renderCustomSchema={renderCustomSchema}
        projectedFormFactory={createItemForm}
        projectedScopeFactory={createItemScope}
        projectedValidationFactory={createItemValidationOwner}
      />
    </div>
  );
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
  formulas,
  formulaForIf,
  evaluateFormula,
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
  formulas?: ConditionFormulaConfig;
  formulaForIf?: ConditionFormulaConfig;
  evaluateFormula?: EvaluateConditionFormula;
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
              formulas={formulas}
              formulaForIf={formulaForIf}
              evaluateFormula={evaluateFormula}
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
