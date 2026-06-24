import type {
  ActionSchema,
  BaseSchema,
  BoundFieldSchemaBase,
  SchemaObject,
  SchemaValue,
} from '@nop-chaos/flux-core';

export type SchemaInput = BaseSchema | BaseSchema[];

export interface ObjectFieldSchema extends BoundFieldSchemaBase {
  type: 'object-field';
  body: SchemaInput;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface ArrayFieldSchema extends BoundFieldSchemaBase {
  type: 'array-field';
  itemKind: 'scalar' | 'object';
  itemKey?: string;
  item: SchemaInput;
  addable?: boolean;
  removable?: boolean;
  sortable?: boolean;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface VariantMatch extends SchemaObject {
  kind: string;
  value?: SchemaValue;
  key?: string;
  requiredKeys?: string[];
  when?: SchemaValue;
}

export interface VariantOption extends SchemaObject {
  key: string;
  label: string;
  viewer?: SchemaInput;
  content: SchemaInput;
  match?: VariantMatch;
  initialValue?: SchemaValue;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface VariantSelectorConfig extends SchemaObject {
  mode?: string;
  label?: string;
}

export interface VariantFieldSchema extends BoundFieldSchemaBase {
  type: 'variant-field';
  variants: VariantOption[];
  selector?: VariantSelectorConfig;
  selectorMode?: string;
  defaultVariant?: string;
  detectVariantAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface DetailSurfaceConfig extends SchemaObject {
  mode?: string;
  title?: string;
  size?: string;
  placement?: string;
}

export interface DetailFieldSchema extends BoundFieldSchemaBase {
  type: 'detail-field';
  viewer?: SchemaInput;
  content: SchemaInput;
  surface?: DetailSurfaceConfig;
  trigger?: string;
  triggerLabel?: string;
  openAction?: ActionSchema | ActionSchema[];
  confirmAction?: ActionSchema | ActionSchema[];
  cancelAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

/**
 * W4c — combo: repeated composite-item field editor. Value owner is the form
 * field system (staged owner reuse); each item is an independent composite field
 * rendered via the `items` region inside a projected item scope.
 */
export interface ComboSchema extends BoundFieldSchemaBase {
  type: 'combo';
  items: SchemaInput;
  multiple?: boolean;
  addable?: boolean;
  removable?: boolean;
  reorderable?: boolean;
  minItems?: number;
  maxItems?: number;
  itemKey?: string;
  onAdd?: ActionSchema | ActionSchema[];
  onRemove?: ActionSchema | ActionSchema[];
  onReorder?: ActionSchema | ActionSchema[];
}

/**
 * W4c — input-table: tabular object-array field editor. Value owner is the form
 * field system; each row renders its cells through the `item` region inside a
 * projected item scope. `columns` provides the header row.
 */
export interface InputTableColumn extends SchemaObject {
  label?: string;
  width?: string | number;
}

export interface InputTableSchema extends BoundFieldSchemaBase {
  type: 'input-table';
  columns?: InputTableColumn[];
  item: SchemaInput;
  rowKey?: string;
  addable?: boolean;
  removable?: boolean;
  reorderable?: boolean;
  minItems?: number;
  maxItems?: number;
  onAdd?: ActionSchema | ActionSchema[];
  onRemove?: ActionSchema | ActionSchema[];
  onReorder?: ActionSchema | ActionSchema[];
}

/**
 * W4c — transfer: two-pane shuttle selection field. `options` is the candidate
 * set; selected values are written back to the field. valueKey/labelKey map
 * arbitrary option records to the canonical {label,value} form.
 */
export interface TransferSchema extends BoundFieldSchemaBase {
  type: 'transfer';
  options?: SchemaValue;
  multiple?: boolean;
  valueKey?: string;
  labelKey?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onAdd?: ActionSchema | ActionSchema[];
  onRemove?: ActionSchema | ActionSchema[];
  onChange?: ActionSchema | ActionSchema[];
}

/**
 * W4c — picker: dialog-layer selection field. `pickerDialog` configures the
 * dialog surface (title/placement/size); selection inside the dialog writes back
 * through valueKey/labelKey normalization.
 */
export interface PickerDialogConfig extends SchemaObject {
  title?: string;
  size?: string;
  placement?: string;
}

export interface PickerSchema extends BoundFieldSchemaBase {
  type: 'picker';
  options?: SchemaValue;
  valueKey?: string;
  labelKey?: string;
  multiple?: boolean;
  pickerDialog?: PickerDialogConfig | boolean;
  onPick?: ActionSchema | ActionSchema[];
}

export interface DetailViewSchema extends BaseSchema {
  type: 'detail-view';
  readOnly?: boolean;
  data?: SchemaObject;
  scopePath?: string;
  viewer?: SchemaInput;
  content: SchemaInput;
  surface?: DetailSurfaceConfig;
  trigger?: string;
  triggerLabel?: string;
  openAction?: ActionSchema | ActionSchema[];
  confirmAction?: ActionSchema | ActionSchema[];
  cancelAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
