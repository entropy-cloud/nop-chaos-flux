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
}

export interface ArrayFieldSchema extends BoundFieldSchemaBase {
  type: 'array-field';
  itemKind: 'scalar' | 'object';
  itemKey?: string;
  item: SchemaInput;
  addable?: boolean;
  removable?: boolean;
  removeWhen?: string;
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
  triggerLabel?: string;
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
  columnCount?: number;
  addable?: boolean;
  removable?: boolean;
  reorderable?: boolean;
  minItems?: number;
  maxItems?: number;
  itemKey?: string;
  removeWhen?: string;
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
  removeWhen?: string;
  /** Bottom slot rendered below the table (type aligned with `TableSchema.footer`). */
  footer?: SchemaInput | string;
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
  searchOnly?: boolean;
  searchPlaceholder?: string;
  checkAll?: boolean;
  checkAllLabel?: string;
  clearable?: boolean;
  selectTitle?: string;
  resultTitle?: string;
  onAdd?: ActionSchema | ActionSchema[];
  onRemove?: ActionSchema | ActionSchema[];
  onChange?: ActionSchema | ActionSchema[];
  onSelectAll?: ActionSchema | ActionSchema[];
}

/**
 * W4c — picker v3: popup-layer selection field.
 *
 * Responsibilities split:
 *  - Picker concerns: popup config, value/label mapping, label template,
 *    overflow config, autoFill, onPick/onItemClick actions.
 *  - CRUD concerns (via pickerSchema.rowSelection): multi-select type,
 *    keepOnPageChange, toggleOnRowClick, modifierSelect, selectAllMode.
 *  - Non-CRUD pickerSchema: use built-in `pick` action for submission.
 *
 * popup surface configured by `pickerPopup.type`. Popup content (any BaseSchema)
 * lives in `pickerSchema`. valueField/labelField map selection values to the
 * form-bound field. labelTpl renders a compound display; overflowConfig
 * controls multi-select tag collapse behavior.
 */
export interface PickerPopupConfig extends SchemaObject {
  /** Surface type. Default: 'dialog'. */
  type?: 'dialog' | 'drawer' | 'popover';
  title?: string;
  /** Size preset aligned with AMIS. Default: 'default'. */
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'full';
  /** Placement for drawer/popover surfaces. Default: 'right' for drawer, 'bottom' for popover. */
  placement?: 'left' | 'right' | 'top' | 'bottom';
  /** Explicit width override (drawer/popover). */
  width?: string | number;
  /** Explicit height override (drawer/popover). */
  height?: string | number;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
  /** Show mask overlay. Default: true for dialog/drawer, false for popover. */
  showMask?: boolean;
  showCloseButton?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export interface OverflowConfig extends SchemaObject {
  /** Maximum number of tags shown. -1 (default) = no limit. */
  maxTagCount?: number;
  /** Popover config for collapsed tags. */
  overflowTagPopover?: SchemaObject;
}

/** Minimal template binding type (string template or object form). */
export type SchemaTpl = string | SchemaObject;

export interface PickerSchema extends BoundFieldSchemaBase {
  type: 'picker';
  /** Popup surface configuration. */
  pickerPopup?: PickerPopupConfig | boolean;
  /**
   * Popup content schema — the sole content definition. `crud` content renders
   * the CRUD renderer (which publishes its selection to its declared
   * `selectionStatePath` scope variable; picker reads that path at confirm).
   * Other content types render inside the PickerContext; they submit via the
   * `pick` action whose payload travels through `args`.
   */
  pickerSchema?: BaseSchema;
  /** Action that resolves stored values into display labels (picker-level concern). */
  labelResolveAction?: ActionSchema | ActionSchema[];
  /** Field path on the selected option row used as value. */
  valueField?: string;
  /** Field path on the selected option row used as label. */
  labelField?: string;
  /** Compound label template (overrides labelField when provided). */
  labelTpl?: SchemaTpl;
  /** Multi-select mode. Default: false. */
  multiple?: boolean;
  /** Overall clearable. Default: true. */
  clearable?: boolean;
  /** Per-tag clearable (multi-select). Default: true. */
  itemClearable?: boolean;
  /** Join multi-select values into a delimiter-separated string. Default: true. */
  joinValues?: boolean;
  /** Delimiter used when joinValues=true. Default: ','. */
  delimiter?: string;
  /** Extract value from nested object (e.g. when labelField resolves to {value, label}). Default: true. */
  extractValue?: boolean;
  /** Multi-select tag overflow configuration. */
  overflowConfig?: OverflowConfig;
  /** Show keyword search input in the built-in lightweight list popup. Default: true. */
  searchable?: boolean;
  /** Auto-fill sibling form fields from selected row. */
  autoFill?: Record<string, string>;
  /** Action invoked after a successful pick. */
  onPick?: ActionSchema | ActionSchema[];
  /** Action invoked when an already-selected tag is clicked. */
  onItemClick?: ActionSchema | ActionSchema[];
  /** Embed mode (no popup). */
  embed?: boolean;
  /** Value written on clear. */
  resetValue?: SchemaValue;
}

export interface DetailViewSchema extends BaseSchema {
  type: 'detail-view';
  readOnly?: boolean;
  data?: SchemaObject;
  scopePath?: string;
  viewer?: SchemaInput;
  content: SchemaInput;
  surface?: DetailSurfaceConfig;
  triggerLabel?: string;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
