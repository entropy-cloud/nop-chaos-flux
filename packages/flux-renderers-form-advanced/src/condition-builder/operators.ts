import type { ConditionCustomOperator, ConditionOperatorOverrides } from './types.js';
import { t } from '@nop-chaos/flux-i18n';

export interface ConditionOperatorInfo {
  label: string;
  value: string;
  values?: ConditionCustomOperator['values'];
}

export const OPERATOR_LABEL_KEYS: Record<string, string> = {
  equal: 'conditionBuilder.operators.equal',
  not_equal: 'conditionBuilder.operators.notEqual',
  less: 'conditionBuilder.operators.less',
  less_or_equal: 'conditionBuilder.operators.lessOrEqual',
  greater: 'conditionBuilder.operators.greater',
  greater_or_equal: 'conditionBuilder.operators.greaterOrEqual',
  between: 'conditionBuilder.operators.between',
  not_between: 'conditionBuilder.operators.notBetween',
  is_empty: 'conditionBuilder.operators.isEmpty',
  is_not_empty: 'conditionBuilder.operators.isNotEmpty',
  like: 'conditionBuilder.operators.like',
  not_like: 'conditionBuilder.operators.notLike',
  starts_with: 'conditionBuilder.operators.startsWith',
  ends_with: 'conditionBuilder.operators.endsWith',
  select_equals: 'conditionBuilder.operators.selectEquals',
  select_not_equals: 'conditionBuilder.operators.selectNotEquals',
  select_any_in: 'conditionBuilder.operators.selectAnyIn',
  select_not_any_in: 'conditionBuilder.operators.selectNotAnyIn',
};

export function getBuiltInOperatorLabel(op: string): string | undefined {
  const key = OPERATOR_LABEL_KEYS[op];
  return key ? t(key) : undefined;
}

export const OPERATORS_BY_TYPE: Record<string, { defaultOp: string; operators: string[] }> = {
  text: {
    defaultOp: 'equal',
    operators: [
      'equal',
      'not_equal',
      'is_empty',
      'is_not_empty',
      'like',
      'not_like',
      'starts_with',
      'ends_with',
    ],
  },
  number: {
    defaultOp: 'equal',
    operators: [
      'equal',
      'not_equal',
      'less',
      'less_or_equal',
      'greater',
      'greater_or_equal',
      'between',
      'not_between',
      'is_empty',
      'is_not_empty',
    ],
  },
  date: {
    defaultOp: 'equal',
    operators: [
      'equal',
      'not_equal',
      'less',
      'less_or_equal',
      'greater',
      'greater_or_equal',
      'between',
      'not_between',
      'is_empty',
      'is_not_empty',
    ],
  },
  time: {
    defaultOp: 'equal',
    operators: [
      'equal',
      'not_equal',
      'less',
      'less_or_equal',
      'greater',
      'greater_or_equal',
      'between',
      'not_between',
      'is_empty',
      'is_not_empty',
    ],
  },
  datetime: {
    defaultOp: 'equal',
    operators: [
      'equal',
      'not_equal',
      'less',
      'less_or_equal',
      'greater',
      'greater_or_equal',
      'between',
      'not_between',
      'is_empty',
      'is_not_empty',
    ],
  },
  select: {
    defaultOp: 'select_equals',
    operators: ['select_equals', 'select_not_equals', 'select_any_in', 'select_not_any_in'],
  },
  boolean: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal'],
  },
  custom: {
    defaultOp: 'equal',
    operators: [],
  },
};

export const NO_VALUE_OPS = new Set(['is_empty', 'is_not_empty']);

export function resolveOperators(
  fieldType: string,
  fieldOverride: (string | ConditionCustomOperator)[] | undefined,
  schemaOverride: ConditionOperatorOverrides | undefined,
): ConditionOperatorInfo[] {
  const builtIn = OPERATORS_BY_TYPE[fieldType];
  const fieldOverrideOperators = fieldOverride;
  const schemaOverrideOperators = schemaOverride?.operatorsByType?.[fieldType];

  const rawOps = fieldOverrideOperators ?? schemaOverrideOperators ?? builtIn?.operators;

  if (!rawOps || rawOps.length === 0) return [];

  return rawOps.map((op) => {
    if (typeof op === 'string') {
      const label = schemaOverride?.labels?.[op] ?? getBuiltInOperatorLabel(op) ?? op;
      return { label, value: op };
    }
    return { label: op.label, value: op.value, values: op.values };
  });
}

export function resolveDefaultOp(
  fieldType: string,
  fieldDefaultOp: string | undefined,
  schemaOverride: ConditionOperatorOverrides | undefined,
): string {
  if (fieldDefaultOp) return fieldDefaultOp;
  if (schemaOverride?.defaultOpByType?.[fieldType])
    return schemaOverride.defaultOpByType[fieldType];
  return OPERATORS_BY_TYPE[fieldType]?.defaultOp ?? 'equal';
}

export function resolveOperatorLabel(
  op: string,
  schemaOverride: ConditionOperatorOverrides | undefined,
): string {
  return schemaOverride?.labels?.[op] ?? getBuiltInOperatorLabel(op) ?? op;
}
