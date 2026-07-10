/**
 * Flux JSON Schema 精简 TypeScript 类型定义
 * 基于 packages/flux-core/src/types/ 提取
 */

// ============================================================================
// 基础类型
// ============================================================================

/** 原始值 */
export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/** Schema 值 */
export type SchemaValue = Primitive | SchemaObject | ReadonlyArray<SchemaValue> | SchemaValue[];

/** Schema 对象 */
export interface SchemaObject {
  [key: string]: SchemaValue;
}

/** 表达式字符串，语法 ${xxx} */
export type SchemaExpression = string;

/** 模板字符串，支持 ${xxx} */
export type SchemaTpl = string;

/** 容器排版模式 */
export type FrameWrapMode = boolean | 'label' | 'group' | 'none';

/** API 配置 */
export interface ApiSchema extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  selection?: string;
  responseAdaptor?: string;
  requestAdaptor?: string;
}

/** 选项配置 */
export interface Option {
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
  children?: Option[];
}

/** 布尔条件 */
export type SchemaBoolean = boolean | string;

/** 区域输入 (子节点数组) */
export type SchemaInput = BaseSchema | BaseSchema[];

/** Schema 节点 (所有组件的联合) */
export type SchemaNode = Record<string, unknown> & { type: string };

/** Field Remark */
export interface FieldRemarkSchema {
  icon?: string;
  content: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: ('click' | 'hover' | 'focus')[];
}

/** XUI Import 配置 */
export interface XuiImportSpec {
  from: string;
  as: string;
  options?: Record<string, SchemaValue>;
}

/** Operation Control 配置 */
export interface OperationControlConfig {
  timeout?: number;
  retry?: {
    times: number;
    delay?: number;
    strategy?: 'fixed' | 'exponential';
    maxDelay?: number;
  };
  debounce?: number;
  throttle?: number;
  cacheTTL?: number;
  cacheKey?: string;
  dedup?: 'cancel-previous' | 'parallel' | 'ignore-new';
}

// ============================================================================
// Action 系统
// ============================================================================

/** Action Schema (声明式动作描述) */
export type ActionSchema = ActionShapeFields & { action: string };

/** 内置 Toast 消息配置，用于 ajax/submit 自动反馈 */
export interface MessagesConfig {
  success?: string;
  failed?: string;
}

/** Action 基础字段 */
export interface ActionShapeFields {
  action?: string;
  _targetCid?: number;
  _targetTemplateId?: string;
  targetId?: string;
  componentId?: string;
  componentName?: string;
  dialogId?: string;
  surfaceId?: string;
  args?: Record<string, SchemaValue>;
  control?: OperationControlConfig;
  timeout?: number;
  retry?: OperationControlConfig['retry'];
  debounce?: number;
  when?: boolean | string;
  preventDefault?: boolean | string;
  stopPropagation?: boolean | string;
  parallel?: ActionSchema[];
  continueOnError?: boolean;
  messages?: MessagesConfig;
  confirmText?: string;
  then?: ActionSchema | ActionSchema[];
  onError?: ActionSchema | ActionSchema[];
  onSettled?: ActionSchema | ActionSchema[];
}

/** Ajax 请求动作 */
export interface AjaxActionSchema extends ActionShapeFields {
  action: 'ajax';
  args: ApiSchema;
}

/** 表单提交动作 */
export interface SubmitFormActionSchema extends ActionShapeFields {
  action: 'submitForm';
}

/** 打开弹窗动作 */
export interface OpenDialogActionSchema extends ActionShapeFields {
  action: 'openDialog';
  args: Record<string, SchemaValue>;
}

/** 打开抽屉动作 */
export interface OpenDrawerActionSchema extends ActionShapeFields {
  action: 'openDrawer';
  args: Record<string, SchemaValue>;
}

/** 关闭弹窗动作 */
export interface CloseDialogActionSchema extends ActionShapeFields {
  action: 'closeDialog';
}

/** 关闭抽屉动作 */
export interface CloseDrawerActionSchema extends ActionShapeFields {
  action: 'closeDrawer';
}

/** 关闭 surface 动作 */
export interface CloseSurfaceActionSchema extends ActionShapeFields {
  action: 'closeSurface';
  surfaceId?: string;
}

/** 刷新表格动作 */
export interface RefreshTableActionSchema extends ActionShapeFields {
  action: 'refreshTable';
}

/** 刷新数据源动作 */
export interface RefreshSourceActionSchema extends ActionShapeFields {
  action: 'refreshSource';
  targetId: string;
}

/** 设置值动作 */
export interface SetValueActionSchema extends ActionShapeFields {
  action: 'setValue';
  args: { path?: string; value: SchemaValue };
}

/** 批量设置值动作 */
export interface SetValuesActionSchema extends ActionShapeFields {
  action: 'setValues';
  args: { path?: string; values: Record<string, SchemaValue> };
}

/** Toast 通知动作 */
export interface ShowToastActionSchema extends ActionShapeFields {
  action: 'showToast';
  args: { level?: SchemaValue; message?: SchemaValue };
}

/** 确认对话框动作 */
export interface ConfirmActionSchema extends ActionShapeFields {
  action: 'confirm';
  args: { message?: SchemaValue; title?: SchemaValue };
}

/** 警告对话框动作 */
export interface AlertActionSchema extends ActionShapeFields {
  action: 'alert';
  args: { message?: SchemaValue; title?: SchemaValue };
}

/** 导航动作 */
export interface NavigateActionSchema extends ActionShapeFields {
  action: 'navigate';
  args: { url?: SchemaValue; replace?: SchemaValue; back?: SchemaValue };
}

/** 组件实例方法动作 */
export interface ComponentActionSchema extends ActionShapeFields {
  action: `component:${string}`;
  args?: Record<string, SchemaValue>;
}

/** 命名空间动作 */
export interface NamespacedActionSchema extends ActionShapeFields {
  action: `${string}:${string}`;
  args?: Record<string, SchemaValue>;
}

// ============================================================================
// Base Schema
// ============================================================================

/** 所有组件的基础 Schema */
export interface BaseSchema extends SchemaObject {
  type: string;
  id?: string;
  name?: string;
  label?: string;
  title?: string | SchemaInput;
  className?: string;
  frameClassName?: string;
  classAliases?: Record<string, string>;
  when?: boolean | string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  testid?: string;
  frameWrap?: FrameWrapMode;
  validateOn?: string | string[];
  showErrorOn?: string | string[];
  onMount?: ActionSchema | ActionSchema[];
  onUnmount?: ActionSchema | ActionSchema[];
  'xui:imports'?: XuiImportSpec[];
}

/** 表单字段基础 Schema */
export interface BoundFieldSchemaBase extends BaseSchema {
  name: string;
  readOnly?: boolean | string;
  required?: boolean | string;
  mode?: 'normal' | 'horizontal';
  labelAlign?: 'top' | 'left' | 'right' | 'inherit';
  labelWidth?: string | number;
  hint?: string;
  description?: string;
  remark?: FieldRemarkSchema;
  labelRemark?: FieldRemarkSchema;
}

/** 表单项 Schema (兼容旧名) */
export type FormFieldSchema = BoundFieldSchemaBase;
