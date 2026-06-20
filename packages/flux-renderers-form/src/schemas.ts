import type {
  ActionSchema,
  BaseSchema,
  BoundFieldSchemaBase,
  HiddenFieldPolicy,
  SourceSchema,
} from '@nop-chaos/flux-core';

export interface SelectOptionSchema {
  [key: string]: import('@nop-chaos/flux-core').SchemaValue;
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
}

export type SelectOptionsValue = SelectOptionSchema[] | SourceSchema;

export interface SelectOptionGroup {
  [key: string]: import('@nop-chaos/flux-core').SchemaValue;
  label: string;
  options: SelectOptionSchema[];
}

export interface InputSchema extends BoundFieldSchemaBase {
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  prefix?: string;
  suffix?: string;
  clearable?: boolean;
  trimContents?: boolean;
  showCounter?: boolean;
  nativeAutoComplete?: string;
  validate?: {
    action?: ActionSchema;
    debounce?: number;
    message?: string;
  };
  hiddenFieldPolicy?: HiddenFieldPolicy;
}

export interface FormSchema extends BaseSchema {
  type: 'form';
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: Record<string, any>;
  mode?: 'normal' | 'horizontal';
  labelAlign?: 'top' | 'left' | 'right';
  labelWidth?: string | number;
  gap?: number | string;
  statusPath?: string;
  valuesPath?: string;
  initAction?: ActionSchema | ActionSchema[];
  submitAction?: ActionSchema | ActionSchema[];
  onSubmitSuccess?: ActionSchema | ActionSchema[];
  onSubmitError?: ActionSchema | ActionSchema[];
  onValidateError?: ActionSchema | ActionSchema[];
  hiddenFieldPolicy?: HiddenFieldPolicy;
  bodyClassName?: string;
  actionsClassName?: string;
}

export type { FieldsetSchema } from './renderers/fieldset.js';

export interface SelectSchema extends InputSchema {
  options?: SelectOptionsValue;
  groups?: SelectOptionGroup[];
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  filterOption?: boolean | { ignoreCase?: boolean };
  searchPlaceholder?: string;
  noResultsText?: string;
  virtual?: boolean;
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

export interface InputTreeSchema extends InputSchema {
  type: 'input-tree';
  options?: SelectOptionsValue;
  treeMode?: 'normal' | 'radio' | 'checkbox';
  childrenKey?: string;
  labelField?: string;
  valueField?: string;
  cascade?: boolean;
  searchable?: boolean;
  onlyLeaf?: boolean;
  showPathLabel?: boolean;
}

export interface TreeSelectSchema extends InputSchema {
  type: 'tree-select';
  options?: SelectOptionsValue;
  treeMode?: 'normal' | 'radio' | 'checkbox';
  childrenKey?: string;
  labelField?: string;
  valueField?: string;
  cascade?: boolean;
  searchable?: boolean;
  onlyLeaf?: boolean;
  showPathLabel?: boolean;
  clearable?: boolean;
  placeholder?: string;
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

export interface InputNumberSchema extends BoundFieldSchemaBase {
  type: 'input-number';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  showStepper?: boolean;
  keyboard?: boolean;
  validate?: {
    action?: ActionSchema;
    debounce?: number;
    message?: string;
  };
  hiddenFieldPolicy?: HiddenFieldPolicy;
}
