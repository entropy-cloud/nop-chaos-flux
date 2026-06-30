/**
 * Flux Schema 类型定义
 * 基于 packages/flux-core/src/types/ 和 flux-renderers-* 的 schemas 提取
 */

import type { BaseSchema, BoundFieldSchemaBase, SchemaInput, SchemaTpl, SchemaExpression, SchemaBoolean, ApiSchema, ActionSchema, SchemaValue } from './common';

// ============================================================================
// Page
// ============================================================================

export interface PageSchema extends BaseSchema {
  type: 'page';
  title?: SchemaTpl;
  subTitle?: SchemaTpl;
  header?: SchemaInput;
  body?: SchemaInput;
  footer?: SchemaInput;
  initApi?: ApiSchema;
  data?: Record<string, unknown>;
  className?: string;
  /** 移动端下拉刷新配置 */
  pullRefresh?: boolean | PullRefreshSchema;
}

// ============================================================================
// Container / Layout
// ============================================================================

export interface ContainerSchema extends BaseSchema {
  type: 'container';
  header?: SchemaInput;
  body?: SchemaInput;
  footer?: SchemaInput;
  title?: SchemaTpl;
}

export interface FlexSchema extends BaseSchema {
  type: 'flex';
  direction?: 'row' | 'column';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  align?: 'start' | 'center' | 'end' | 'stretch';
  wrap?: boolean;
  gap?: number | string;
  body?: SchemaInput;
}

export interface TabsSchema extends BaseSchema {
  type: 'tabs';
  tabs: Array<{
    title: SchemaTpl;
    body?: SchemaInput;
    icon?: string;
    disabled?: SchemaBoolean;
    visible?: SchemaBoolean;
  }>;
  activeKey?: string | number;
  activeKeyOwnership?: 'local' | 'controlled' | 'scope';
  activeKeyStatePath?: string;
}

export interface GridSchema extends BaseSchema {
  type: 'grid';
  columns: Array<{
    body?: SchemaInput;
    width?: number | string;
  }>;
}

export interface SeparatorSchema extends BaseSchema {
  type: 'separator';
  direction?: 'horizontal' | 'vertical';
}

// ============================================================================
// Form
// ============================================================================

export interface FormSchema extends BaseSchema {
  type: 'form';
  body?: SchemaInput[];
  submitAction?: ActionSchema;
  onSubmitSuccess?: ActionSchema;
  onSubmitError?: ActionSchema;
  onValidateError?: ActionSchema;
  data?: Record<string, unknown>;
  initApi?: ApiSchema;
  validations?: Record<string, unknown>;
  disabled?: SchemaBoolean;
}

export interface FieldsetSchema extends BaseSchema {
  type: 'fieldset';
  title?: SchemaTpl;
  body?: SchemaInput;
}

export interface InputTextSchema extends BoundFieldSchemaBase {
  type: 'input-text';
  value?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  prefix?: string;
  suffix?: string;
  /** 自动补全选项 */
  autoComplete?: string | string[];
}

export interface InputPasswordSchema extends BoundFieldSchemaBase {
  type: 'input-password';
  value?: string;
  maxLength?: number;
  minLength?: number;
  /** 显示密码 toggle */
  showRevealToggle?: boolean;
}

export interface InputEmailSchema extends BoundFieldSchemaBase {
  type: 'input-email';
  value?: string;
}

export interface InputNumberSchema extends BoundFieldSchemaBase {
  type: 'input-number';
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
}

export interface TextareaSchema extends BoundFieldSchemaBase {
  type: 'textarea';
  value?: string;
  rows?: number;
  maxLength?: number;
}

export interface SelectSchema extends BoundFieldSchemaBase {
  type: 'select';
  options?: Array<{ label: string; value: string | number; disabled?: boolean }>;
  source?: string | ApiSchema | SchemaExpression;
  multiple?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  creatable?: boolean;
  autoFill?: Record<string, SchemaExpression>;
}

export interface CheckboxSchema extends BoundFieldSchemaBase {
  type: 'checkbox';
  value?: boolean;
  option?: string;
}

export interface CheckboxGroupSchema extends BoundFieldSchemaBase {
  type: 'checkbox-group';
  options?: Array<{ label: string; value: string | number }>;
  source?: string | ApiSchema;
  multiple?: boolean;
}

export interface SwitchSchema extends BoundFieldSchemaBase {
  type: 'switch';
  value?: boolean;
}

export interface RadioGroupSchema extends BoundFieldSchemaBase {
  type: 'radio-group';
  options?: Array<{ label: string; value: string | number }>;
  source?: string | ApiSchema;
}

export interface InputDateSchema extends BoundFieldSchemaBase {
  type: 'input-date' | 'input-datetime' | 'input-time';
  value?: string;
  format?: string;
  min?: string;
  max?: string;
}

export interface DateRangeSchema extends BoundFieldSchemaBase {
  type: 'date-range';
  value?: [string, string];
  format?: string;
  min?: string;
  max?: string;
}

export interface InputMonthSchema extends BoundFieldSchemaBase {
  type: 'input-month';
  value?: string;
  format?: string;
}

export interface InputQuarterSchema extends BoundFieldSchemaBase {
  type: 'input-quarter';
  value?: string;
}

export interface InputYearSchema extends BoundFieldSchemaBase {
  type: 'input-year';
  value?: string;
  format?: string;
}

export interface MarkdownEditorSchema extends BoundFieldSchemaBase {
  type: 'markdown-editor';
  value?: string;
}

// ============================================================================
// Advanced Form Fields
// ============================================================================

export interface ComboSchema extends BoundFieldSchemaBase {
  type: 'combo';
  items?: SchemaInput[];
  multiple?: boolean;
  addable?: boolean;
  removable?: boolean;
  draggable?: boolean;
  minLength?: number;
  maxLength?: number;
  scaffold?: Record<string, unknown>;
  flat?: boolean;
  typeSwitchable?: boolean;
  forms?: SchemaInput[];
}

export interface InputTreeSchema extends BoundFieldSchemaBase {
  type: 'input-tree';
  options?: TreeOption[];
  source?: string | ApiSchema;
  multiple?: boolean;
  clearable?: boolean;
  draggable?: boolean;
}

export interface TreeSelectSchema extends BoundFieldSchemaBase {
  type: 'tree-select';
  options?: TreeOption[];
  source?: string | ApiSchema;
  multiple?: boolean;
  clearable?: boolean;
}

export interface TransferSchema extends BoundFieldSchemaBase {
  type: 'transfer';
  source?: string | ApiSchema;
  targetKeys?: string[];
  titles?: [string, string];
}

export interface ConditionBuilderSchema extends BoundFieldSchemaBase {
  type: 'condition-builder';
  source?: ApiSchema;
  fields?: Array<{
    name: string;
    label: string;
    type: string;
    operators?: string[];
  }>;
}

export interface InputFileSchema extends BoundFieldSchemaBase {
  type: 'input-file';
  accept?: string;
  maxSize?: number;
  maxCount?: number;
  multiple?: boolean;
}

export interface InputImageSchema extends BoundFieldSchemaBase {
  type: 'input-image';
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

export interface TagListSchema extends BoundFieldSchemaBase {
  type: 'tag-list';
  value?: string[];
  placeholder?: string;
}

export interface KeyValueSchema extends BoundFieldSchemaBase {
  type: 'key-value';
  value?: Record<string, string>;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export interface ArrayEditorSchema extends BoundFieldSchemaBase {
  type: 'array-editor';
  items?: SchemaInput[];
  addable?: boolean;
  removable?: boolean;
  draggable?: boolean;
  scaffold?: Record<string, unknown>;
}

export interface ObjectFieldSchema extends BoundFieldSchemaBase {
  type: 'object-field';
  body?: SchemaInput[];
}

export interface ArrayFieldSchema extends BoundFieldSchemaBase {
  type: 'array-field';
  items?: SchemaInput[];
  addable?: boolean;
  removable?: boolean;
  draggable?: boolean;
  scaffold?: Record<string, unknown>;
}

export interface VariantFieldSchema extends BoundFieldSchemaBase {
  type: 'variant-field';
  variants?: Array<{ label: string; value: string; body?: SchemaInput }>;
}

export interface DetailFieldSchema extends BoundFieldSchemaBase {
  type: 'detail-field';
  label?: SchemaTpl;
}

export interface DetailViewSchema extends BaseSchema {
  type: 'detail-view';
  body?: SchemaInput[];
}

export interface EditorSchema extends BoundFieldSchemaBase {
  type: 'editor';
  language?: string;
  minimap?: boolean;
}

export interface InputTableSchema extends BoundFieldSchemaBase {
  type: 'input-table';
  columns?: Array<{
    name?: string;
    label?: SchemaTpl;
    type?: string;
    width?: number | string;
  }>;
  addable?: boolean;
  removable?: boolean;
  draggable?: boolean;
}

export interface PickerSchema extends BoundFieldSchemaBase {
  type: 'picker';
  source?: string | ApiSchema;
  multiple?: boolean;
  columns?: Array<{
    name?: string;
    label?: string;
  }>;
}

// ============================================================================
// Data Display
// ============================================================================

export interface TableSchema extends BaseSchema {
  type: 'table';
  columns: Array<{
    name?: string;
    label?: SchemaTpl;
    type?: string;
    width?: number | string;
    sortable?: boolean;
    searchable?: boolean;
    body?: SchemaInput;
  }>;
  source?: string | ApiSchema | SchemaExpression;
  data?: Record<string, unknown>;
  pagination?: { page?: number; perPage?: number } | false;
  selectable?: boolean;
  selectedRowKeys?: string[];
}

export interface CrudSchema extends BaseSchema {
  type: 'crud';
  api?: ApiSchema;
  columns: TableSchema['columns'];
  toolbar?: SchemaInput[];
  footerToolbar?: SchemaInput[];
  perPage?: number;
  syncLocation?: boolean;
}

export interface ListSchema extends BaseSchema {
  type: 'list';
  items?: SchemaInput[];
  source?: string | ApiSchema | SchemaExpression;
  itemSchema?: Record<string, unknown>;
}

export interface ChartSchema extends BaseSchema {
  type: 'chart';
  source?: string | ApiSchema | SchemaExpression;
  config?: Record<string, unknown>;
}

export interface PaginationSchema extends BaseSchema {
  type: 'pagination';
  total?: number;
  perPage?: number;
  currentPage?: number;
}

export interface TreeSchema extends BaseSchema {
  type: 'tree';
  options?: TreeOption[];
  source?: string | ApiSchema;
  nodeTemplate?: SchemaInput;
}

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
  /** 公式派生数据源 */
  formula?: SchemaValue;
  /** Action 数据源 */
  action?: string;
  args?: Record<string, SchemaValue>;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
  /** 是否自动初始化请求，默认 true */
  initFetch?: boolean;
  /** 请求成功后的动作 */
  onSuccess?: SchemaValue;
  /** 请求失败后的动作 */
  onError?: SchemaValue;
}

export interface ServiceSchema extends BaseSchema {
  type: 'service';
  api?: ApiSchema;
  data?: Record<string, unknown>;
  body?: SchemaInput;
}

// ============================================================================
// Dialog / Drawer
// ============================================================================

export interface DialogSchema extends BaseSchema {
  type: 'dialog';
  title?: SchemaTpl;
  body?: SchemaInput;
  data?: Record<string, unknown>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnEsc?: boolean;
  closeOnOverlay?: boolean;
}

export interface DrawerSchema extends BaseSchema {
  type: 'drawer';
  title?: SchemaTpl;
  body?: SchemaInput;
  data?: Record<string, unknown>;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// Display
// ============================================================================

export interface TextSchema extends BaseSchema {
  type: 'text';
  text?: SchemaTpl;
  placeholder?: string;
}

export interface ButtonSchema extends BaseSchema {
  type: 'button';
  label?: SchemaTpl;
  level?: 'default' | 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: SchemaBoolean;
  onClick?: ActionSchema;
}

export interface ButtonGroupSchema extends BaseSchema {
  type: 'button-group';
  buttons?: SchemaInput[];
}

export interface DropdownButtonSchema extends BaseSchema {
  type: 'dropdown-button';
  label?: SchemaTpl;
  level?: 'default' | 'primary' | 'secondary' | 'danger';
  buttons?: Array<{ label: string; onClick?: ActionSchema }>;
}

export interface IconSchema extends BaseSchema {
  type: 'icon';
  icon?: string;
}

export interface BadgeSchema extends BaseSchema {
  type: 'badge';
  count?: number | SchemaExpression;
  dot?: boolean;
  level?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export interface ImageSchema extends BaseSchema {
  type: 'image';
  src?: SchemaTpl;
  alt?: string;
  fallback?: string;
}

export interface MarkdownSchema extends BaseSchema {
  type: 'markdown';
  content?: SchemaTpl;
}

export interface HtmlSchema extends BaseSchema {
  type: 'html';
  html?: SchemaTpl;
}

export interface LinkSchema extends BaseSchema {
  type: 'link';
  href?: SchemaTpl;
  body?: SchemaInput;
}

export interface AlertSchema extends BaseSchema {
  type: 'alert';
  level?: 'info' | 'success' | 'warning' | 'error';
  title?: SchemaTpl;
  body?: SchemaInput;
  showIcon?: boolean;
  closable?: boolean;
}

export interface SpinnerSchema extends BaseSchema {
  type: 'spinner';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export interface ProgressSchema extends BaseSchema {
  type: 'progress';
  value?: number | SchemaExpression;
  max?: number;
  level?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export interface EmptySchema extends BaseSchema {
  type: 'empty';
  description?: SchemaTpl;
  image?: string;
}

export interface CardSchema extends BaseSchema {
  type: 'card';
  header?: SchemaInput;
  body?: SchemaInput;
  footer?: SchemaInput;
  title?: SchemaTpl;
}

export interface CardsSchema extends BaseSchema {
  type: 'cards';
  items?: SchemaInput[];
  source?: string | ApiSchema;
  itemSchema?: Record<string, unknown>;
}

export interface MappingSchema extends BaseSchema {
  type: 'mapping';
  value?: SchemaValue;
  map?: Record<string, string>;
}

export interface StatusSchema extends BaseSchema {
  type: 'status';
  value?: SchemaValue;
  map?: Record<string, { label: string; color?: string }>;
}

export interface JsonViewSchema extends BaseSchema {
  type: 'json-view';
  value?: SchemaValue;
}

export interface QrcodeSchema extends BaseSchema {
  type: 'qrcode';
  value?: string;
  size?: number;
}

export interface CarouselSchema extends BaseSchema {
  type: 'carousel';
  items?: SchemaInput[];
  autoPlay?: boolean;
  interval?: number;
}

export interface AudioSchema extends BaseSchema {
  type: 'audio';
  src?: SchemaTpl;
  autoPlay?: boolean;
  controls?: boolean;
}

export interface VideoSchema extends BaseSchema {
  type: 'video';
  src?: SchemaTpl;
  poster?: string;
  autoPlay?: boolean;
  controls?: boolean;
}

// ============================================================================
// Layout Components
// ============================================================================

export interface CollapseSchema extends BaseSchema {
  type: 'collapse';
  items: Array<{
    title: SchemaTpl;
    body?: SchemaInput;
    disabled?: SchemaBoolean;
  }>;
  defaultActiveKeys?: (string | number)[];
  accordion?: boolean;
}

export interface StepsSchema extends BaseSchema {
  type: 'steps';
  steps: Array<{
    title: SchemaTpl;
    description?: SchemaTpl;
  }>;
  current?: number;
  status?: 'wait' | 'process' | 'finish' | 'error';
}

export interface TimelineSchema extends BaseSchema {
  type: 'timeline';
  items: Array<{
    content?: SchemaInput;
    timestamp?: string;
    color?: string;
  }>;
}

export interface WizardSchema extends BaseSchema {
  type: 'wizard';
  steps: Array<{
    title: SchemaTpl;
    body?: SchemaInput;
  }>;
  current?: number;
  submitAction?: ActionSchema;
  onSubmitSuccess?: ActionSchema;
  onSubmitError?: ActionSchema;
}

// ============================================================================
// Structure Nodes
// ============================================================================

export interface FragmentSchema extends BaseSchema {
  type: 'fragment';
  body?: SchemaInput;
  data?: Record<string, unknown>;
  isolate?: boolean;
}

export interface LoopSchema extends BaseSchema {
  type: 'loop';
  items?: SchemaExpression | unknown[];
  itemName?: string;
  indexName?: string;
  body?: SchemaInput;
  empty?: SchemaInput;
}

export interface RecurseSchema extends BaseSchema {
  type: 'recurse';
  items?: SchemaExpression;
  body?: SchemaInput;
}

export interface ReactionSchema extends BaseSchema {
  type: 'reaction';
  watch?: string | string[];
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
  /** 是否自动触发 loadAction，默认 true */
  autoLoad?: boolean;
}

export interface ScopeDebugSchema extends BaseSchema {
  type: 'scope-debug';
}

// ============================================================================
// Mobile Components
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
// Tree Option
// ============================================================================

export interface TreeOption {
  label: string;
  value: string | number;
  children?: TreeOption[];
  disabled?: boolean;
}
