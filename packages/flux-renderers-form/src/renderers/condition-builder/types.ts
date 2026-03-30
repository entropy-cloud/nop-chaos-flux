import type { BaseSchema } from '@nop-chaos/flux-core';

export type ConditionFieldType = 'text' | 'number' | 'date' | 'time' | 'datetime' | 'select' | 'boolean' | 'custom';

export type ConditionConjunction = 'and' | 'or';

export interface BaseConditionField {
  name: string;
  label: string;
  type: ConditionFieldType;
  placeholder?: string;
  operators?: (string | ConditionCustomOperator)[];
  defaultOp?: string;
  defaultValue?: unknown;
  disabled?: boolean;
  valueTypes?: Array<'value' | 'field' | 'func'>;
}

export interface ConditionCustomOperator {
  label: string;
  value: string;
  values?: ConditionCustomOperatorValueField[];
}

export interface ConditionCustomOperatorValueField {
  type: string;
  name: string;
  label?: string;
  placeholder?: string;
}

export interface ConditionTextField extends BaseConditionField {
  type: 'text';
  minLength?: number;
  maxLength?: number;
}

export interface ConditionNumberField extends BaseConditionField {
  type: 'number';
  minimum?: number;
  maximum?: number;
  step?: number;
  precision?: number;
}

export interface ConditionDateField extends BaseConditionField {
  type: 'date';
  format?: string;
  inputFormat?: string;
  minDate?: string;
  maxDate?: string;
}

export interface ConditionTimeField extends BaseConditionField {
  type: 'time';
  format?: string;
  inputFormat?: string;
  minTime?: string;
  maxTime?: string;
}

export interface ConditionDateTimeField extends BaseConditionField {
  type: 'datetime';
  format?: string;
  inputFormat?: string;
  timeFormat?: string;
}

export interface ConditionSelectField extends BaseConditionField {
  type: 'select';
  options?: Array<{ label: string; value: unknown }>;
  source?: string;
  searchable?: boolean;
  multiple?: boolean;
  autoComplete?: string;
  maxTagCount?: number;
}

export interface ConditionBooleanField extends BaseConditionField {
  type: 'boolean';
  trueLabel?: string;
  falseLabel?: string;
}

export interface ConditionCustomField extends BaseConditionField {
  type: 'custom';
  value: BaseSchema;
}

export interface ConditionFieldGroup {
  type: 'group';
  label: string;
  children: ConditionField[];
}

export type ConditionField =
  | ConditionTextField
  | ConditionNumberField
  | ConditionDateField
  | ConditionTimeField
  | ConditionDateTimeField
  | ConditionSelectField
  | ConditionBooleanField
  | ConditionCustomField
  | ConditionFieldGroup;

export interface ConditionGroupValue {
  id: string;
  conjunction: ConditionConjunction;
  not?: boolean;
  if?: string;
  children: Array<ConditionGroupValue | ConditionItemValue>;
}

export interface ConditionItemValue {
  id: string;
  left: {
    type: 'field';
    field: string;
  };
  op: string;
  right?: unknown;
}

export type ConditionValueNode = ConditionGroupValue | ConditionItemValue;

export interface ConditionOperatorOverrides {
  labels?: Record<string, string>;
  operatorsByType?: Record<string, string[]>;
  defaultOpByType?: Record<string, string>;
}

export interface ConditionBuilderSchema extends BaseSchema {
  type: 'condition-builder';
  name: string;
  fields?: any[];
  source?: string;
  builderMode?: 'full' | 'simple';
  embed?: boolean;
  title?: string;
  selectMode?: 'list' | 'tree' | 'chained';
  searchable?: boolean;
  draggable?: boolean;
  showANDOR?: boolean;
  showNot?: boolean;
  showIf?: boolean;
  uniqueFields?: boolean;
  operators?: any;
  addBtnVisibleOn?: string;
  addGroupBtnVisibleOn?: string;
  placeholder?: string;
  addConditionLabel?: string;
  addGroupLabel?: string;
  removeConditionLabel?: string;
  removeGroupLabel?: string;
  maxDepth?: number;
  maxItemsPerGroup?: number;
  required?: boolean;
}
