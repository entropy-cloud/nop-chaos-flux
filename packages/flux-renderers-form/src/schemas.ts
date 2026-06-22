import type {
  ActionSchema,
  ActionShapeLikeFields,
  BaseSchema,
  BoundFieldSchemaBase,
  HiddenFieldPolicy,
  SchemaObject,
  SchemaValue,
  SourceSchema,
  ValidationRule,
} from '@nop-chaos/flux-core';

export type FormCrossFieldRuleKind = Extract<
  ValidationRule['kind'],
  'equalsField' | 'notEqualsField'
>;

export interface FormCrossFieldRule extends SchemaObject {
  rule: FormCrossFieldRuleKind;
  field: string;
  target: string;
  message?: string;
}

/**
 * Configuration shape for on-demand tree sources (lazy children / remote search).
 *
 * Stored without `type: 'source'` so the runtime source-prop auto-resolver does
 * NOT pick it up. Renderers reconstruct a full {@link SourceSchema} via
 * `{ type: 'source', ...config }` immediately before invoking
 * `helpers.executeSource(...)`. This keeps the request path on the data-source
 * runtime (X3 §1/§3 — no component-level api shortcut) while preserving the
 * descriptor for on-demand, parameterised invocation.
 */
export interface TreeSourceConfig extends ActionShapeLikeFields {
  formula?: SchemaValue;
}

export interface SelectOptionSchema {
  [key: string]: import('@nop-chaos/flux-core').SchemaValue;
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
  disabledTip?: string;
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
  revealPassword?: boolean;
  validate?: {
    action?: ActionSchema;
    debounce?: number;
    message?: string;
  };
  hiddenFieldPolicy?: HiddenFieldPolicy;
  suggestSource?: string;
  suggestDebounce?: number;
  suggestTrigger?: 'input' | 'focus' | 'manual';
  suggestMinInputLength?: number;
  suggestTemplate?: BaseSchema[];
  suggestEmpty?: string;
}

export interface FormSchema extends BaseSchema {
  type: 'form';
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: Record<string, any>;
  mode?: 'normal' | 'horizontal' | 'inline';
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
  columnCount?: number;
  submitOnChange?: boolean;
  preventEnterSubmit?: boolean;
  autoFocus?: boolean;
  scrollToFirstError?: boolean;
  static?: boolean | string;
  rules?: FormCrossFieldRule[];
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
  optionTemplate?: BaseSchema[];
}

export interface TextareaSchema extends InputSchema {
  rows?: number;
  minRows?: number;
  maxRows?: number;
}

export interface RadioGroupSchema extends InputSchema {
  options?: SelectOptionsValue;
}

export interface CheckboxGroupSchema extends InputSchema {
  options?: SelectOptionsValue;
  checkAll?: boolean;
  maxSelected?: number;
  minSelected?: number;
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
  /**
   * Number of visible (flattened) tree options at which to switch from full
   * rendering to virtualised rendering via `@tanstack/react-virtual`. Defaults
   * to `100` (matching `select`). Set to `0` to disable virtualisation.
   */
  virtualThreshold?: number;
  /**
   * On-demand source descriptor for lazy child loading. When a node is marked
   * `deferChildren: true` (see `TreeOptionRecord`), expanding it triggers an
   * `executeSource` call with this descriptor. The descriptor's request may
   * reference `${expandedNodeValue}` in `args`/`api.data` to fetch the right
   * children. When undeclared, `deferChildren` nodes degrade to no children
   * (dev schema warn).
   */
  childrenSource?: TreeSourceConfig;
  /**
   * On-demand source descriptor for remote search. When `searchable: true` AND
   * `searchSource` is declared, the query (debounced) drives an
   * `executeSource` call whose result replaces `options`. The descriptor's
   * request may reference `${searchQuery}`. When undeclared, `searchable`
   * falls back to local substring filtering (backward compat).
   */
  searchSource?: TreeSourceConfig;
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
  /** @see InputTreeSchema.virtualThreshold */
  virtualThreshold?: number;
  /** @see InputTreeSchema.childrenSource */
  childrenSource?: TreeSourceConfig;
  /** @see InputTreeSchema.searchSource */
  searchSource?: TreeSourceConfig;
}

export interface CheckboxSchema extends InputSchema {
  option?: {
    label: string;
    value?: string | boolean;
  };
  trueValue?: SchemaValue;
  falseValue?: SchemaValue;
}

export interface SwitchSchema extends InputSchema {
  option?: {
    onLabel?: string;
    offLabel?: string;
  };
  trueValue?: SchemaValue;
  falseValue?: SchemaValue;
}

export interface TagListSchema extends InputSchema {
  tags?: string[];
}

export interface KeyValueSchema extends InputSchema {
  addLabel?: string;
  uniqueKeys?: boolean | { message?: string };
  minItems?: number;
  maxItems?: number;
}

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

export interface ArrayEditorSchema extends InputSchema {
  itemLabel?: string;
  minItems?: number;
  maxItems?: number;
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
