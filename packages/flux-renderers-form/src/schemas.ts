import type { ActionSchema, ApiSchema, BaseSchema, SourceSchema } from '@nop-chaos/flux-core';

export interface SelectOptionSchema {
  [key: string]: import('@nop-chaos/flux-core').SchemaValue;
  label: string;
  value: string;
}

export type SelectOptionsValue = SelectOptionSchema[] | SourceSchema;

export interface InputSchema extends BaseSchema {
  name?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  validate?: {
    api?: ApiSchema;
    debounce?: number;
    message?: string;
  };
}

export interface FormSchema extends BaseSchema {
  type: 'form';
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: Record<string, any>;
  initAction?: ActionSchema | ActionSchema[];
  submitAction?: ActionSchema | ActionSchema[];
  onSubmitSuccess?: ActionSchema | ActionSchema[];
  onSubmitError?: ActionSchema | ActionSchema[];
  onValidateError?: ActionSchema | ActionSchema[];
}

export interface SelectSchema extends InputSchema {
  options?: SelectOptionsValue;
}

export interface TextareaSchema extends InputSchema {
  rows?: number;
}

export interface RadioGroupSchema extends InputSchema {
  options?: SelectOptionsValue;
}

export interface CheckboxGroupSchema extends InputSchema {
  options?: SelectOptionsValue;
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
