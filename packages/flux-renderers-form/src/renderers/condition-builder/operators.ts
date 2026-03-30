import type { ConditionCustomOperator, ConditionOperatorOverrides } from './types';

export interface ConditionOperatorInfo {
  label: string;
  value: string;
  values?: ConditionCustomOperator['values'];
}

export const OPERATOR_LABELS: Record<string, string> = {
  equal: '等于',
  not_equal: '不等于',
  less: '小于',
  less_or_equal: '小于等于',
  greater: '大于',
  greater_or_equal: '大于等于',
  between: '范围内',
  not_between: '范围外',
  is_empty: '为空',
  is_not_empty: '不为空',
  like: '包含',
  not_like: '不包含',
  starts_with: '开头是',
  ends_with: '结尾是',
  select_equals: '等于',
  select_not_equals: '不等于',
  select_any_in: '包含任意',
  select_not_any_in: '不包含任意',
};

export const OPERATORS_BY_TYPE: Record<string, { defaultOp: string; operators: string[] }> = {
  text: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'is_empty', 'is_not_empty', 'like', 'not_like', 'starts_with', 'ends_with'],
  },
  number: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'],
  },
  date: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'],
  },
  time: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'],
  },
  datetime: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'],
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
  if (!builtIn) return [];

  const rawOps = fieldOverride ?? schemaOverride?.operatorsByType?.[fieldType] ?? builtIn.operators;

  return rawOps.map((op) => {
    if (typeof op === 'string') {
      const label = schemaOverride?.labels?.[op] ?? OPERATOR_LABELS[op] ?? op;
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
  if (schemaOverride?.defaultOpByType?.[fieldType]) return schemaOverride.defaultOpByType[fieldType];
  return OPERATORS_BY_TYPE[fieldType]?.defaultOp ?? 'equal';
}

export function resolveOperatorLabel(
  op: string,
  schemaOverride: ConditionOperatorOverrides | undefined,
): string {
  return schemaOverride?.labels?.[op] ?? OPERATOR_LABELS[op] ?? op;
}
