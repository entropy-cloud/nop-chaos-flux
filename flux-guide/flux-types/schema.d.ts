/* eslint-disable max-lines */
/**
 * Flux Schema 类型定义
 * 基于 packages/flux-core/src/types/ + 各 flux-renderers-*/src/*-schemas.ts 提取。
 * 这是 flux-guide 的权威字段知识源——修改 packages 下任一 schema 须同步本文件。
 */

import type {
  BaseSchema,
  BoundFieldSchemaBase,
  SchemaInput,
  SchemaValue,
  SchemaObject,
  ActionSchema,
} from './common';

// ============================================================================
// Page / Dialog / Drawer  (flux-renderers-basic)
// ============================================================================

export type SurfaceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface PageSchema extends BaseSchema {
  type: 'page';
  title?: string;
  subTitle?: string;
  remark?: string;
  data?: SchemaValue;
  statusPath?: string;
  body?: BaseSchema[];
  header?: BaseSchema[];
  footer?: BaseSchema[];
  aside?: BaseSchema[];
  asidePosition?: 'left' | 'right';
  modalContainer?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  asideClassName?: string;
  toolbarClassName?: string;
}

export interface DialogSchema extends BaseSchema {
  type: 'dialog';
  title?: string;
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: SchemaValue;
  open?: boolean;
  defaultOpen?: boolean;
  statusPath?: string;
  closeOnOutsideClick?: boolean;
  container?: string;
  showMask?: boolean;
  closeOnEsc?: boolean;
  size?: SurfaceSize;
  width?: number | string;
  height?: number | string;
  showCloseButton?: boolean;
  header?: BaseSchema[];
  footer?: BaseSchema[];
  confirm?: boolean | string;
  onConfirm?: ActionSchema | ActionSchema[];
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

export interface DrawerSchema extends BaseSchema {
  type: 'drawer';
  title?: string;
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: SchemaValue;
  open?: boolean;
  defaultOpen?: boolean;
  side?: 'left' | 'right' | 'top' | 'bottom';
  statusPath?: string;
  container?: string;
  showMask?: boolean;
  closeOnOutside?: boolean;
  closeOnEsc?: boolean;
  size?: SurfaceSize;
  width?: number | string;
  height?: number | string;
  showCloseButton?: boolean;
  header?: BaseSchema[];
  footer?: BaseSchema[];
  confirm?: boolean | string;
  onConfirm?: ActionSchema | ActionSchema[];
  resizable?: boolean;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

// ============================================================================
// Layout  (flux-renderers-basic / flux-renderers-layout)
// ============================================================================

export interface ContainerSchema extends BaseSchema {
  type: 'container';
  direction?: 'row' | 'column';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number | string;
  body?: BaseSchema[];
  header?: BaseSchema[];
  footer?: BaseSchema[];
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

export interface FlexSchema extends BaseSchema {
  type: 'flex';
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  alignContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' | 'stretch';
  gap?: number | string;
  className?: string;
}

export interface GridItemSchema extends SchemaObject {
  body?: SchemaInput;
  colSpan?: number;
  rowSpan?: number;
}

export interface GridSchema extends BaseSchema {
  type: 'grid';
  items?: GridItemSchema[];
  columns?: number | string;
  responsiveColumns?: { sm?: number; md?: number; lg?: number };
  gap?: number | string;
  autoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
}

export interface TabsItemSchema extends SchemaObject {
  key?: string | number;
  value?: string | number;
  title?: string;
  label?: string;
  disabled?: boolean | string;
  badge?: string | number;
  icon?: string;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
}

export interface TabsSchema extends BaseSchema {
  type: 'tabs';
  items?: TabsItemSchema[];
  value?: string | number;
  defaultValue?: string | number;
  valueOwnership?: 'local' | 'controlled' | 'scope';
  valueStatePath?: string;
  statusPath?: string;
  toolbar?: BaseSchema | BaseSchema[];
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'line';
  tabsMode?:
    | ''
    | 'line'
    | 'card'
    | 'radio'
    | 'vertical'
    | 'chrome'
    | 'simple'
    | 'strong'
    | 'tiled'
    | 'sidebar';
  sidePosition?: 'left' | 'right';
  contentClassName?: string;
  toolbarClassName?: string;
}

export interface CollapseItemSchema extends SchemaObject {
  key?: string | number;
  title?: SchemaValue | SchemaInput;
  body?: SchemaInput;
  disabled?: SchemaValue;
}

export interface CollapseSchema extends BaseSchema {
  type: 'collapse';
  items: CollapseItemSchema[];
  value?: string | number | (string | number)[];
  defaultValue?: string | number | (string | number)[];
  valueOwnership?: 'local' | 'controlled' | 'scope';
  valueStatePath?: string;
  multiple?: boolean;
  collapsible?: boolean;
  onChange?: ActionSchema;
}

export interface ButtonGroupItemSchema extends SchemaObject {
  key?: string | number;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  action?: ActionSchema | ActionSchema[];
  disabled?: boolean;
}

export interface ButtonGroupSchema extends BaseSchema {
  type: 'button-group';
  items: ButtonGroupItemSchema[];
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg';
  selectionMode?: 'none' | 'single' | 'multiple';
  value?: string | number | (string | number)[];
  defaultValue?: string | number | (string | number)[];
  onChange?: ActionSchema;
}

export interface DropdownButtonItemSchema extends SchemaObject {
  key?: string | number;
  label?: string;
  action?: ActionSchema | ActionSchema[];
  disabled?: boolean;
  destructive?: boolean;
}

export interface DropdownButtonSchema extends BaseSchema {
  type: 'dropdown-button';
  icon?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg';
  items?: DropdownButtonItemSchema[];
  trigger?: 'click' | 'hover';
  disabled?: boolean;
}

export interface StepsItemSchema extends SchemaObject {
  value?: string | number;
  key?: string | number;
  title?: string;
  description?: string;
  status?: 'wait' | 'process' | 'finish' | 'error';
  disabled?: boolean;
}

export interface StepsSchema extends BaseSchema {
  type: 'steps';
  items: StepsItemSchema[];
  value?: string | number;
  defaultValue?: string | number;
  valueOwnership?: 'local' | 'controlled' | 'scope';
  valueStatePath?: string;
  orientation?: 'horizontal' | 'vertical';
  onChange?: ActionSchema;
}

export interface TimelineItemSchema extends SchemaObject {
  time?: string;
  title?: string;
  detail?: string;
  icon?: string;
  level?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export interface TimelineSchema extends BaseSchema {
  type: 'timeline';
  items: TimelineItemSchema[];
  mode?: 'left' | 'right' | 'alternate';
  orientation?: 'horizontal' | 'vertical';
  reverse?: boolean;
}

export interface WizardStepSchema extends SchemaObject {
  key?: string | number;
  title?: SchemaValue | SchemaInput;
  description?: SchemaValue | SchemaInput;
  body?: SchemaInput;
  actions?: SchemaInput;
  visible?: SchemaValue;
  disabled?: SchemaValue;
  beforeEnter?: ActionSchema | ActionSchema[];
  beforeLeave?: ActionSchema | ActionSchema[];
}

export interface WizardSchema extends BaseSchema {
  type: 'wizard';
  steps: WizardStepSchema[];
  value?: string | number;
  defaultValue?: string | number;
  statusPath?: string;
  linear?: boolean;
  allowStepJump?: boolean;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  onChange?: ActionSchema;
  onStepCommit?: ActionSchema | ActionSchema[];
  onComplete?: ActionSchema | ActionSchema[];
  onStepError?: ActionSchema | ActionSchema[];
}

export interface SeparatorSchema extends BaseSchema {
  type: 'separator';
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

// ============================================================================
// Form  (flux-renderers-form)
// ============================================================================

export interface FormCrossFieldRule extends SchemaObject {
  rule: 'equalsField' | 'notEqualsField';
  field: string;
  target: string;
  message?: string;
}

export interface FormSchema extends BaseSchema {
  type: 'form';
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: Record<string, unknown>;
  mode?: 'normal' | 'horizontal' | 'inline';
  labelAlign?: 'top' | 'left' | 'right';
  labelWidth?: string | number;
  gap?: number | string;
  statusPath?: string;
  valuesPath?: string;
  autoInit?: boolean;
  initAction?: ActionSchema | ActionSchema[];
  submitAction?: ActionSchema | ActionSchema[];
  onSubmitSuccess?: ActionSchema | ActionSchema[];
  onSubmitError?: ActionSchema | ActionSchema[];
  onValidateError?: ActionSchema | ActionSchema[];
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

export interface FieldsetSchema extends BaseSchema {
  type: 'fieldset';
  title?: string;
  body?: BaseSchema[];
  bodyClassName?: string;
  titleClassName?: string;
}

/** 表单输入项公共字段（input-text/email/password/number/select/textarea 等继承） */
export interface InputSchema extends BoundFieldSchemaBase {
  placeholder?: string;
  inputMode?: string;
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
  validate?: { action?: ActionSchema; debounce?: number; message?: string };
  suggestSource?: string;
  suggestDebounce?: number;
  suggestTrigger?: 'input' | 'focus' | 'manual';
  suggestMinInputLength?: number;
  suggestTemplate?: BaseSchema[];
  suggestEmpty?: string;
}

export interface InputTextSchema extends InputSchema {
  type: 'input-text';
}
export interface InputPasswordSchema extends InputSchema {
  type: 'input-password';
}
export interface InputEmailSchema extends InputSchema {
  type: 'input-email';
}

export interface InputNumberSchema extends BoundFieldSchemaBase {
  type: 'input-number';
  placeholder?: string;
  inputMode?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  showStepper?: boolean;
  keyboard?: boolean;
}

export interface TextareaSchema extends InputSchema {
  type: 'textarea';
  rows?: number;
  minRows?: number;
  maxRows?: number;
}

export interface SelectSchema extends InputSchema {
  type: 'select';
  options?: SchemaValue;
  groups?: Array<{ label: string; options: unknown[] }>;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  filterOption?: boolean | { ignoreCase?: boolean };
  searchPlaceholder?: string;
  noResultsText?: string;
  virtual?: boolean;
  optionTemplate?: BaseSchema[];
}

export interface RadioGroupSchema extends InputSchema {
  type: 'radio-group';
  options?: SchemaValue;
}
export interface CheckboxGroupSchema extends InputSchema {
  type: 'checkbox-group';
  options?: SchemaValue;
  checkAll?: boolean;
  maxSelected?: number;
  minSelected?: number;
}
export interface CheckboxSchema extends InputSchema {
  type: 'checkbox';
  option?: { label: string; value?: string | boolean };
  trueValue?: SchemaValue;
  falseValue?: SchemaValue;
}
export interface SwitchSchema extends InputSchema {
  type: 'switch';
  option?: { onLabel?: string; offLabel?: string };
  trueValue?: SchemaValue;
  falseValue?: SchemaValue;
}

export interface InputDateSchema extends BoundFieldSchemaBase {
  type: 'input-date';
  placeholder?: string;
  valueFormat?: string;
  displayFormat?: string;
  minDate?: string;
  maxDate?: string;
  utc?: boolean;
  clearable?: boolean;
}
export interface InputDatetimeSchema extends BoundFieldSchemaBase {
  type: 'input-datetime';
  placeholder?: string;
  valueFormat?: string;
  displayFormat?: string;
  timeFormat?: string;
  minDate?: string;
  maxDate?: string;
  utc?: boolean;
  clearable?: boolean;
}
export interface InputTimeSchema extends BoundFieldSchemaBase {
  type: 'input-time';
  placeholder?: string;
  valueFormat?: string;
  displayFormat?: string;
  minTime?: string;
  maxTime?: string;
  clearable?: boolean;
}
export interface DateRangeSchema extends BoundFieldSchemaBase {
  type: 'date-range';
  placeholder?: string;
  rangeKind?: 'date' | 'datetime' | 'time';
  valueFormat?: string;
  displayFormat?: string;
  delimiter?: string;
  minDate?: string;
  maxDate?: string;
  utc?: boolean;
  clearable?: boolean;
  shortcuts?: Array<{ label: string; start: string; end: string }>;
}
export interface InputPeriodSchema extends BoundFieldSchemaBase {
  type: 'input-month' | 'input-quarter' | 'input-year';
  placeholder?: string;
  selectionMode?: 'single' | 'range';
  valueFormat?: string;
  displayFormat?: string;
  delimiter?: string;
  minDate?: string;
  maxDate?: string;
  clearable?: boolean;
}
export interface MarkdownEditorSchema extends BoundFieldSchemaBase {
  type: 'markdown-editor';
  placeholder?: string;
  viewMode?: 'split' | 'edit' | 'preview';
  toolbar?: boolean;
}

// ============================================================================
// Advanced Form Fields  (flux-renderers-form-advanced)
// ============================================================================

export interface ComboSchema extends BoundFieldSchemaBase {
  type: 'combo';
  items: SchemaInput;
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

export interface InputTreeSchema extends InputSchema {
  type: 'input-tree';
  options?: SchemaValue;
  treeMode?: 'normal' | 'radio' | 'checkbox';
  childrenKey?: string;
  labelField?: string;
  valueField?: string;
  cascade?: boolean;
  searchable?: boolean;
  onlyLeaf?: boolean;
  showPathLabel?: boolean;
  virtualThreshold?: number;
}
export interface TreeSelectSchema extends InputSchema {
  type: 'tree-select';
  options?: SchemaValue;
  treeMode?: 'normal' | 'radio' | 'checkbox';
  childrenKey?: string;
  labelField?: string;
  valueField?: string;
  cascade?: boolean;
  searchable?: boolean;
  onlyLeaf?: boolean;
  showPathLabel?: boolean;
  clearable?: boolean;
  virtualThreshold?: number;
}

export interface TransferSchema extends BoundFieldSchemaBase {
  type: 'transfer';
  options?: SchemaValue;
  multiple?: boolean;
  valueKey?: string;
  labelKey?: string;
  searchable?: boolean;
  searchOnly?: boolean;
  searchPlaceholder?: string;
  onAdd?: ActionSchema | ActionSchema[];
  onRemove?: ActionSchema | ActionSchema[];
  onChange?: ActionSchema | ActionSchema[];
}

export interface PickerSchema extends BoundFieldSchemaBase {
  type: 'picker';
  options?: SchemaValue;
  loadAction?: ActionSchema | ActionSchema[];
  labelResolveAction?: ActionSchema | ActionSchema[];
  valueKey?: string;
  labelKey?: string;
  multiple?: boolean;
  columns?: unknown[];
  searchable?: boolean;
  autoFill?: Record<string, string>;
  pickerDialog?: { title?: string; size?: string; placement?: string } | boolean;
  onPick?: ActionSchema | ActionSchema[];
}

export interface InputTableSchema extends BoundFieldSchemaBase {
  type: 'input-table';
  columns?: Array<{ label?: string; width?: string | number }>;
  item: SchemaInput;
  rowKey?: string;
  addable?: boolean;
  removable?: boolean;
  reorderable?: boolean;
  minItems?: number;
  maxItems?: number;
}

export interface ObjectFieldSchema extends BoundFieldSchemaBase {
  type: 'object-field';
  body: SchemaInput;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
}
export interface ArrayFieldSchema extends BoundFieldSchemaBase {
  type: 'array-field';
  itemKind: 'scalar' | 'object';
  item: SchemaInput;
  addable?: boolean;
  removable?: boolean;
  sortable?: boolean;
}
export interface VariantFieldSchema extends BoundFieldSchemaBase {
  type: 'variant-field';
  variants: Array<{ key: string; label: string; content: SchemaInput; viewer?: SchemaInput }>;
  selector?: { mode?: string; label?: string };
  defaultVariant?: string;
}
export interface DetailFieldSchema extends BoundFieldSchemaBase {
  type: 'detail-field';
  viewer?: SchemaInput;
  content: SchemaInput;
  trigger?: string;
  triggerLabel?: string;
  openAction?: ActionSchema | ActionSchema[];
}
export interface DetailViewSchema extends BaseSchema {
  type: 'detail-view';
  readOnly?: boolean;
  data?: SchemaObject;
  scopePath?: string;
  viewer?: SchemaInput;
  content: SchemaInput;
}

export interface InputFileSchema extends BoundFieldSchemaBase {
  type: 'input-file';
  placeholder?: string;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  uploadAction?: ActionSchema | ActionSchema[];
  valueMode?: 'url' | 'object' | 'array';
  buttonText?: string;
}
export interface InputImageSchema extends BoundFieldSchemaBase {
  type: 'input-image';
  placeholder?: string;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  uploadAction?: ActionSchema | ActionSchema[];
  valueMode?: 'url' | 'object' | 'array';
  previewMode?: 'thumbnail' | 'fill';
  crop?: SchemaObject;
  buttonText?: string;
}

export interface TagListSchema extends InputSchema {
  type: 'tag-list';
  tags?: string[];
}
export interface KeyValueSchema extends InputSchema {
  type: 'key-value';
  addLabel?: string;
  uniqueKeys?: boolean | { message?: string };
  minItems?: number;
  maxItems?: number;
}
export interface ArrayEditorSchema extends InputSchema {
  type: 'array-editor';
  itemLabel?: string;
  minItems?: number;
  maxItems?: number;
}
export interface EditorSchema extends BoundFieldSchemaBase {
  type: 'editor';
  language?: string;
  minimap?: boolean;
}

export interface ConditionBuilderSchema extends BaseSchema {
  type: 'condition-builder';
  name: string;
  fields?: SchemaValue[];
  builderMode?: 'full' | 'simple';
  embed?: boolean;
  title?: string;
  searchable?: boolean;
  draggable?: boolean;
  showAndOr?: boolean;
  showNot?: boolean;
  showIf?: boolean;
  uniqueFields?: boolean;
  formulas?: { enabled?: boolean; formula?: string; source?: string };
  placeholder?: string;
  maxDepth?: number;
  maxItemsPerGroup?: number;
  required?: boolean;
}

// ============================================================================
// Data Displays  (flux-renderers-data)
// ============================================================================

export interface TableColumnSchema extends SchemaObject {
  name?: string;
  label?: SchemaInput | string;
  type?: string;
  width?: number | string;
  fixed?: 'left' | 'right';
  hidden?: boolean;
  toggled?: boolean;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  searchable?: boolean | SchemaInput;
  cell?: SchemaInput;
  body?: SchemaInput;
  quickEdit?: boolean | SchemaObject;
}

export interface TableSchema extends BaseSchema {
  type: 'table';
  source?: SchemaValue;
  rowKey?: string;
  paginationOwnership?: 'local' | 'controlled' | 'scope';
  selectionOwnership?: 'local' | 'controlled' | 'scope';
  sortOwnership?: 'local' | 'controlled' | 'scope';
  filterOwnership?: 'local' | 'controlled' | 'scope';
  paginationStatePath?: string;
  selectionStatePath?: string;
  sortStatePath?: string;
  filterStatePath?: string;
  columns?: TableColumnSchema[];
  header?: SchemaInput | string;
  footer?: SchemaInput | string;
  empty?: SchemaInput | string;
  loading?: boolean;
  loadingContent?: SchemaInput | string;
  stripe?: boolean;
  bordered?: boolean;
  virtualThreshold?: number;
  scrollHeight?: number;
  columnResize?: boolean;
  affixHeader?: boolean;
  draggable?: boolean;
  orderField?: string;
  rowChildrenField?: string;
  multiSort?: boolean;
  pagination?: {
    enabled?: boolean;
    currentPage?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    showSizeChanger?: boolean;
    mode?: 'pages' | 'infinite';
    serverPaged?: boolean;
    total?: number;
  };
  rowSelection?: {
    type?: 'checkbox' | 'radio';
    selectedRowKeys?: string[];
    keepOnPageChange?: boolean;
    maxSelectionLength?: number;
    checkableWhen?: string;
  };
  expandable?: {
    expandedRowKeys?: string[];
    expandRowByClick?: boolean;
    expandedRow?: SchemaInput;
  };
  quickSaveAction?: ActionSchema;
  quickSaveItemAction?: ActionSchema;
  onRowClick?: BaseSchema;
  onSortChange?: BaseSchema;
  onFilterChange?: BaseSchema;
  onPageChange?: BaseSchema;
  onSelectionChange?: BaseSchema;
  onRefresh?: BaseSchema;
}

// —— CRUD 子配置 ——
export interface CrudQueryFormConfig extends SchemaObject {
  data?: SchemaValue;
  body?: SchemaInput;
  actions?: SchemaInput;
  statusPath?: string;
  layout?: 'horizontal' | 'vertical' | 'inline';
  mode?: 'manual' | 'auto';
  syncLocation?: boolean;
  defaultParams?: Record<string, SchemaValue>;
  defaultCollapsed?: boolean;
  collapsedLabel?: string;
  expandedLabel?: string;
}
export interface CrudPollingConfig extends SchemaObject {
  enabled?: boolean | string;
  sourceId?: string;
  stopWhen?: string;
}
export interface CrudColumnFilterConfig extends SchemaObject {
  options?: Array<{ label: string; value: string }>;
  source?: SchemaValue;
  searchable?: boolean;
  multiple?: boolean;
}
export interface CrudQuickEditConfig extends SchemaObject {
  mode?: 'dialog' | 'inline';
  body?: SchemaInput;
  saveImmediately?: boolean | SchemaValue;
}
export interface CrudColumnSchema extends SchemaObject {
  type?: string;
  name?: string;
  label?: SchemaValue;
  cell?: SchemaInput;
  width?: number | string;
  fixed?: 'left' | 'right';
  hidden?: boolean;
  toggled?: boolean;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  searchable?: boolean | SchemaInput;
  filterable?: boolean | CrudColumnFilterConfig;
  quickEdit?: boolean | CrudQuickEditConfig;
  buttons?: SchemaInput;
}
export interface CrudToolbarItemConfig extends SchemaObject {
  type?: 'listActions' | 'pagination' | 'statistics' | 'switch-per-page' | 'columns-toggler';
  align?: 'left' | 'right';
}
export interface CrudColumnSettingsConfig extends SchemaObject {
  enabled?: boolean;
  draggable?: boolean;
  overlay?: boolean;
  toggledColumnsStatePath?: string;
  orderedColumnsStatePath?: string;
}
export interface CrudResponsiveConfig extends SchemaObject {
  mode?: 'table' | 'expand';
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | number;
  expandTrigger?: 'button' | 'row';
  defaultExpanded?: boolean;
}
export interface CrudClientModeConfig extends SchemaObject {
  loadDataOnce?: boolean;
  fetchOnFilter?: boolean;
  filterOnAllColumns?: boolean;
  matchFunc?: SchemaValue;
}
export interface CrudSelectionConfig extends SchemaObject {
  type?: 'checkbox' | 'radio';
  keepOnPageChange?: boolean;
  maxSelectionLength?: number;
  checkableWhen?: string;
}
export interface CrudPaginationConfig extends SchemaObject {
  mode?: 'pages' | 'infinite';
}

/**
 * CRUD 复合渲染器。取数两路径：`source`（消费 data-source 结果，推荐）/ `loadAction`（自带编排）。
 * 数据格式 `{ items, total }`。摘要经 `$crud` 发布：`${$crud.itemCount}`/`${$crud.total}` 等。
 */
export interface CrudSchema extends BaseSchema {
  type: 'crud';
  name?: string;
  statusPath?: string;
  source?: SchemaValue;
  loadAction?: ActionSchema;
  loadAllData?: boolean;
  queryForm?: CrudQueryFormConfig;
  queryFormRegion?: SchemaInput;
  columns?: CrudColumnSchema[];
  empty?: SchemaInput | string;
  listMode?: 'table' | 'cards' | 'list';
  card?: SchemaInput;
  item?: SchemaInput;
  toolbar?: SchemaInput;
  listActions?: SchemaInput;
  footerToolbar?: SchemaInput;
  toolbarLayout?: SchemaObject;
  rowKey?: string;
  selection?: CrudSelectionConfig;
  selectionOwnership?: 'local' | 'controlled' | 'scope';
  selectionStatePath?: string;
  paginationOwnership?: 'local' | 'controlled' | 'scope';
  paginationStatePath?: string;
  sortOwnership?: 'local' | 'controlled' | 'scope';
  sortStatePath?: string;
  filterOwnership?: 'local' | 'controlled' | 'scope';
  filterStatePath?: string;
  pageField?: string;
  pageSizeField?: string;
  defaultParams?: Record<string, SchemaValue>;
  syncLocation?: boolean;
  autoClearSelectionOnRefresh?: boolean;
  columnSettings?: CrudColumnSettingsConfig;
  responsive?: CrudResponsiveConfig;
  autoGenerateQueryForm?: boolean | SchemaObject;
  clientMode?: CrudClientModeConfig;
  polling?: CrudPollingConfig;
  filterTogglable?: boolean | SchemaObject;
  pagination?: CrudPaginationConfig;
  quickSaveAction?: ActionSchema;
  quickSaveItemAction?: ActionSchema;
  onQuerySubmit?: ActionSchema;
  onQueryReset?: ActionSchema;
  onRowClick?: ActionSchema;
  onSelectionChange?: ActionSchema;
  onRefresh?: ActionSchema;
  onError?: ActionSchema;
  dataStatePath?: string;
}

export interface ListSchema extends BaseSchema {
  type: 'list';
  items?: SchemaValue;
  item?: SchemaInput;
  empty?: SchemaInput | string;
  selectionMode?: 'single' | 'multiple' | 'none';
  keyField?: string;
  pagination?: {
    enabled?: boolean;
    mode?: 'page' | 'infinite';
    pageSize?: number;
    pageSizeOptions?: number[];
    currentPage?: number;
    total?: number;
    hasMore?: boolean;
    showSizeChanger?: boolean;
  };
  paginationOwnership?: 'local' | 'controlled' | 'scope';
  paginationStatePath?: string;
  pageSizeStatePath?: string;
  onItemClick?: BaseSchema;
  onSelectionChange?: BaseSchema;
  onPageChange?: BaseSchema;
  onLoadMore?: BaseSchema;
}

export interface TreeSchema extends BaseSchema {
  type: 'tree';
  data?: SchemaValue;
  childrenKey?: string;
  labelField?: string;
  keyField?: string;
  node?: SchemaInput;
  empty?: SchemaInput | string;
  initiallyExpanded?: boolean | number;
  expandOnClickNode?: boolean;
  statusPath?: string;
  multiple?: boolean;
  searchable?: boolean;
  showIcon?: boolean;
  iconField?: string;
  showGuideLine?: boolean;
}

export interface ServiceSchema extends BaseSchema {
  type: 'service';
  body?: SchemaInput;
  data?: SchemaValue;
  items?: SchemaValue;
  statusPath?: string;
  empty?: SchemaInput | string;
  error?: SchemaInput | string;
  loading?: SchemaInput | string;
}

export interface PaginationSchema extends BaseSchema {
  type: 'pagination';
  currentPage?: number;
  pageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  mode?: 'simple' | 'with-page-size';
  statusPath?: string;
  onChange?: BaseSchema;
  onPageSizeChange?: BaseSchema;
}

export interface ChartSchema extends BaseSchema {
  type: 'chart';
  componentId?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title?: SchemaInput | string;
  series?: SchemaValue;
  source?: SchemaValue;
  xAxis?: { dataKey?: string; label?: string };
  yAxis?: { label?: string };
  height?: number | string;
  loading?: boolean;
  empty?: SchemaInput | string;
  legend?: boolean;
  stacked?: boolean;
  grid?: boolean;
  colors?: string[];
}

// ============================================================================
// data-source  (flux-core)
// ============================================================================

export interface DataSourceSchema extends BaseSchema {
  type: 'data-source';
  name?: string;
  mergeToScope?: boolean;
  resultMapping?: Record<string, SchemaValue>;
  statusPath?: string;
  dependsOn?: string[];
  initialData?: SchemaValue;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
  sendOn?: string;
  /** 公式派生（与 action 互斥） */
  formula?: SchemaValue;
  /** action 取数（与 formula 互斥）：action 为字符串，args 同级 */
  action?: string;
  args?: Record<string, SchemaValue>;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
  initFetch?: boolean;
  onSuccess?: ActionSchema | ActionSchema[];
  onError?: ActionSchema | ActionSchema[];
}

// ============================================================================
// Display  (flux-renderers-basic / flux-renderers-content)
// ============================================================================

export interface TextSchema extends BaseSchema {
  type: 'text';
  text?: string;
  body?: string;
  tag?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'div';
  copyable?: boolean;
  maxLine?: number;
  maxLineToggle?: boolean;
}

export interface ButtonSchema extends BaseSchema {
  type: 'button';
  label?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  disabled?: boolean | string;
  icon?: string;
  rightIcon?: string;
  loading?: boolean | string;
  tooltip?: string;
  disabledTip?: string;
  block?: boolean;
  active?: boolean | string;
}

export interface IconSchema extends BaseSchema {
  type: 'icon';
  icon?: string;
  size?: number | 'sm' | 'md' | 'lg';
  color?: string;
}

export interface BadgeSchema extends BaseSchema {
  type: 'badge';
  text?: string;
  level?: 'info' | 'success' | 'warning' | 'danger';
}

export interface LinkSchema extends BaseSchema {
  type: 'link';
  href?: string;
  target?: '_self' | '_blank' | '_parent' | '_top';
  rel?: string;
  disabled?: boolean | string;
  onClick?: ActionSchema;
}

export interface ImageSchema extends BaseSchema {
  type: 'image';
  src?: string;
  alt?: string;
  title?: string;
  preview?: boolean;
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  width?: number | string;
  height?: number | string;
  lazy?: boolean;
  onClick?: ActionSchema;
  onLoadError?: ActionSchema;
}

export interface MarkdownSchema extends BaseSchema {
  type: 'markdown';
  content?: string;
  allowHtml?: boolean;
  empty?: SchemaInput | string;
}

export interface HtmlSchema extends BaseSchema {
  type: 'html';
  content?: string;
  sanitize?: boolean;
  empty?: SchemaInput | string;
}

export interface JsonViewSchema extends BaseSchema {
  type: 'json-view';
  value?: SchemaValue;
  collapsed?: boolean | number;
  showCopy?: boolean;
  empty?: SchemaInput | string;
}

export interface AlertSchema extends BaseSchema {
  type: 'alert';
  level?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  closable?: boolean;
  title?: SchemaInput;
  body?: SchemaInput;
  actions?: SchemaInput;
  onClose?: ActionSchema;
}

export interface SpinnerSchema extends BaseSchema {
  type: 'spinner';
  size?: 'sm' | 'md' | 'lg';
}

export interface ProgressSchema extends BaseSchema {
  type: 'progress';
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
}

export interface EmptySchema extends BaseSchema {
  type: 'empty';
  title?: SchemaInput;
  description?: SchemaInput;
  image?: string;
  actions?: SchemaInput;
}

export interface CardSchema extends BaseSchema {
  type: 'card';
  title?: SchemaInput;
  header?: SchemaInput;
  body?: SchemaInput;
  footer?: SchemaInput;
  actions?: SchemaInput;
  image?: string;
  imageClassName?: string;
  variant?: 'default' | 'sm';
  onClick?: ActionSchema;
}

export interface CardsSchema extends BaseSchema {
  type: 'cards';
  items?: SchemaValue;
  columns?: number | { sm?: number; md?: number; lg?: number };
  card?: SchemaInput;
  empty?: SchemaInput | string;
  keyField?: string;
  selectionMode?: 'single' | 'multiple' | 'none';
  onItemClick?: ActionSchema;
  onSelectionChange?: ActionSchema;
}

export interface MappingSchema extends BaseSchema {
  type: 'mapping';
  value?: SchemaValue;
  map?: Record<string, SchemaValue>;
  defaultLabel?: string;
  placeholder?: string;
  item?: SchemaInput;
}

export interface StatusSchema extends BaseSchema {
  type: 'status';
  value?: SchemaValue;
  labelMap?: Record<string, SchemaValue>;
  levelMap?: Record<string, SchemaValue>;
  iconMap?: Record<string, SchemaValue>;
  placeholder?: string;
}

export interface QrCodeSchema extends BaseSchema {
  type: 'qrcode';
  value?: SchemaValue;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  foreground?: string;
  background?: string;
  onLoadError?: ActionSchema;
}

export interface CarouselSchema extends BaseSchema {
  type: 'carousel';
  items?: Array<{ image?: string; title?: string; caption?: string; body?: SchemaInput }>;
  autoPlay?: boolean;
  interval?: number;
  loop?: boolean;
  controls?: boolean;
  indicators?: boolean;
  onChange?: ActionSchema;
}

export interface AudioSchema extends BaseSchema {
  type: 'audio';
  src?: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  onLoadError?: ActionSchema;
}

export interface VideoSchema extends BaseSchema {
  type: 'video';
  src?: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  muted?: boolean;
  onLoadError?: ActionSchema;
}

// ============================================================================
// Structure Nodes  (flux-renderers-basic / flux-core)
// ============================================================================

export interface FragmentSchema extends BaseSchema {
  type: 'fragment';
  body?: SchemaInput;
  data?: Record<string, SchemaValue>;
  isolate?: boolean;
}

export interface LoopSchema extends BaseSchema {
  type: 'loop';
  items?: SchemaValue;
  body?: SchemaInput;
  empty?: SchemaInput;
  itemName?: string;
  indexName?: string;
  keyName?: string;
  itemData?: Record<string, SchemaValue>;
  keyBy?: SchemaValue;
}

export interface RecurseSchema extends BaseSchema {
  type: 'recurse';
  items?: SchemaValue;
  itemName?: string;
  indexName?: string;
  keyName?: string;
  itemData?: Record<string, SchemaValue>;
  keyBy?: SchemaValue;
  maxDepth?: number;
}

export interface ReactionSchema extends BaseSchema {
  type: 'reaction';
  watch: SchemaValue;
  dependsOn?: string[];
  when?: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
  actions: ActionSchema | ActionSchema[];
}

export interface DynamicRendererSchema extends BaseSchema {
  type: 'dynamic-renderer';
  loadAction: ActionSchema;
  body?: SchemaInput;
  autoLoad?: boolean;
}

export interface ScopeDebugSchema extends BaseSchema {
  type: 'scope-debug';
  title?: string;
  defaultExpand?: boolean;
  dataPaths?: string[];
}

// ============================================================================
// Mobile  (flux-renderers-mobile)
// ============================================================================

export interface PullRefreshSchema extends BaseSchema {
  type: 'pull-refresh';
  body?: SchemaInput;
  direction?: 'down';
  threshold?: number;
  loadingText?: string;
  pullingText?: string;
  loosingText?: string;
  successText?: string;
  successDuration?: number;
  animationDuration?: number;
  disabled?: boolean;
  onRefresh?: ActionSchema;
}

export interface InfiniteScrollSchema extends BaseSchema {
  type: 'infinite-scroll';
  body?: SchemaInput;
  distance?: number;
  disabled?: boolean;
  loadingText?: string;
  finishedText?: string;
  errorText?: string;
  immediateCheck?: boolean;
  hasMore?: boolean;
  loading?: boolean;
  error?: boolean | string;
  onLoadMore?: ActionSchema;
}

export interface SwipeCellSchema extends BaseSchema {
  type: 'swipe-cell';
  body?: SchemaInput;
  left?: SchemaInput;
  right?: SchemaInput;
  threshold?: number;
  direction?: 'left' | 'right' | 'both';
  disabled?: boolean;
  closeOnOutside?: boolean;
  onAction?: ActionSchema;
  onOpen?: ActionSchema;
  onClose?: ActionSchema;
}

export interface CountdownSchema extends BaseSchema {
  type: 'countdown';
  time?: number;
  targetTime?: number;
  format?: string;
  millisecond?: boolean;
  paused?: boolean;
  autoStart?: boolean;
  prefix?: string;
  suffix?: string;
  onFinish?: ActionSchema;
}

export type NoticeBarVariant = 'info' | 'warning' | 'success' | 'error';

export interface NoticeBarSchema extends BaseSchema {
  type: 'notice-bar';
  text?: string | string[];
  scrollable?: boolean;
  speed?: number;
  direction?: 'left' | 'right';
  loop?: boolean;
  closable?: boolean;
  icon?: string;
  variant?: NoticeBarVariant;
  onClick?: ActionSchema;
  onClose?: ActionSchema;
}

// ============================================================================
// Tree Option (input-tree / tree-select options record shape)
// ============================================================================

export interface TreeOption {
  label: string;
  value: string | number;
  children?: TreeOption[];
  disabled?: boolean;
}
