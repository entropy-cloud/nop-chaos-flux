import type { BaseSchema, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

export type ConditionFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'boolean'
  | 'custom';

export type ConditionConjunction = 'and' | 'or';

export interface BaseConditionField extends SchemaObject {
  name: string;
  label: string;
  type: ConditionFieldType;
  placeholder?: string;
  operators?: (string | ConditionCustomOperator)[];
  defaultOp?: string;
}

export interface ConditionCustomOperator extends SchemaObject {
  label: string;
  value: string;
  /** Declared but not yet consumed by the value editor (design §7.2 documents
   *  the future dynamic-form extension; kept as a documented extension point). */
  values?: ConditionCustomOperatorValueField[];
}

export interface ConditionCustomOperatorValueField extends SchemaObject {
  type: string;
  name: string;
  label?: string;
  placeholder?: string;
}

export interface ConditionTextField extends BaseConditionField {
  type: 'text';
}

export interface ConditionNumberField extends BaseConditionField {
  type: 'number';
}

export interface ConditionDateField extends BaseConditionField {
  type: 'date';
}

export interface ConditionTimeField extends BaseConditionField {
  type: 'time';
}

export interface ConditionDateTimeField extends BaseConditionField {
  type: 'datetime';
}

export interface ConditionSelectField extends BaseConditionField {
  type: 'select';
  options?: Array<{ label: string; value: SchemaValue } & SchemaObject>;
  multiple?: boolean;
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

export interface ConditionFieldGroup extends SchemaObject {
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

export interface ConditionOperatorOverrides extends SchemaObject {
  labels?: Record<string, string>;
  operatorsByType?: Record<string, string[]>;
  defaultOpByType?: Record<string, string>;
}

export type ConditionFieldSchemaValue = ConditionField & SchemaValue;
export type ConditionOperatorOverridesSchemaValue = ConditionOperatorOverrides & SchemaValue;

export interface ConditionFormulaConfig extends SchemaObject {
  enabled?: boolean;
  formula?: string;
  source?: string;
}

export interface ConditionBuilderSchema extends BaseSchema {
  type: 'condition-builder';
  name: string;
  fields?: ConditionFieldSchemaValue[];
  builderMode?: 'full' | 'simple';
  embed?: boolean;
  showAndOr?: boolean;
  showNot?: boolean;
  showIf?: boolean;
  draggable?: boolean;
  uniqueFields?: boolean;
  formulas?: ConditionFormulaConfig;
  formulaForIf?: ConditionFormulaConfig;
  operators?: ConditionOperatorOverridesSchemaValue;
  placeholder?: string;
  addConditionLabel?: string;
  addGroupLabel?: string;
  removeConditionLabel?: string;
  removeGroupLabel?: string;
  maxDepth?: number;
  maxItemsPerGroup?: number;
  required?: boolean;
}
