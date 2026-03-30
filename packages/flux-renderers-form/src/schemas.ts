import type { ApiObject, BaseSchema } from '@nop-chaos/flux-core';

export interface InputSchema extends BaseSchema {
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  validate?: {
    api?: ApiObject;
    debounce?: number;
    message?: string;
  };
}

export interface FormSchema extends BaseSchema {
  type: 'form';
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: Record<string, any>;
}

export interface SelectSchema extends InputSchema {
  options?: Array<{ label: string; value: string }>;
}

export interface TextareaSchema extends InputSchema {
  rows?: number;
}

export interface RadioGroupSchema extends InputSchema {
  options?: Array<{ label: string; value: string }>;
}

export interface CheckboxGroupSchema extends InputSchema {
  options?: Array<{ label: string; value: string }>;
}

export interface CheckboxSchema extends InputSchema {
  option?: {
    label: string;
    value?: string | boolean;
  };
}

export interface SwitchSchema extends InputSchema {
  option?: {
    onLabel?: string;
    offLabel?: string;
  };
}

export interface TagListSchema extends InputSchema {
  tags?: string[];
}

export interface KeyValueSchema extends InputSchema {
  addLabel?: string;
  uniqueKeys?: boolean | { message?: string };
}

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

export interface ArrayEditorSchema extends InputSchema {
  itemLabel?: string;
}

export interface ArrayEditorItem {
  id: string;
  value: string;
}

export type { ConditionBuilderSchema, ConditionField, ConditionGroupValue, ConditionItemValue } from './renderers/condition-builder/types';

export interface ExpressionEditorSchema extends InputSchema {
  variables?: string[];
  operators?: string[];
  showValidationText?: boolean;
  constraintVariables?: boolean;
}
