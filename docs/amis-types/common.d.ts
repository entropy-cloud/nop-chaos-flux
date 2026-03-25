/**
 * AMIS JSON Schema 精简 TypeScript 类型定义
 * 基于 amis@6.13.0
 */

// ============================================================================
// 基础类型
// ============================================================================

/** CSS 类名，支持字符串或条件对象 */
export type SchemaClassName = string | Record<string, boolean | string>;

/** 表达式字符串，语法 ${xxx} */
export type SchemaExpression = string;

/** 模板字符串，支持 ${xxx} 或 <%= xxx %> */
export type SchemaTpl = string;

/** API 配置 */
export type SchemaApi = string | BaseApiObject;

/** API 对象配置 */
export interface BaseApiObject {
  /** API 地址 */
  url: string;
  /** 请求方式 */
  method?: 'get' | 'post' | 'put' | 'delete' | 'patch';
  /** 请求数据 */
  data?: Record<string, unknown>;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 数据适配器 */
  adaptor?: string;
  /** 请求发送前适配器 */
  requestAdaptor?: string;
  /** 是否自动刷新 */
  autoRefresh?: boolean;
  /** 轮询间隔 */
  interval?: number;
  /** 是否静默请求 */
  silent?: boolean;
}

/** 选项配置 */
export interface Option {
  /** 显示文本 */
  label: string;
  /** 选项值 */
  value: string | number | boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 禁用提示 */
  disabledTip?: string;
  /** 子选项 */
  children?: Option[];
  /** 是否可见 */
  visible?: boolean;
  /** 描述信息 */
  description?: string;
  /** 延迟加载 */
  defer?: boolean;
}

/** 事件动作配置 */
export interface ListenerAction {
  /** 动作类型 */
  actionType: string;
  /** 动作配置 */
  args?: Record<string, unknown>;
  /** 防抖配置 */
  debounce?: {
    wait?: number;
    maxWait?: number;
    leading?: boolean;
    trailing?: boolean;
  };
  /** 阻止后续动作 */
  preventDefault?: boolean;
  /** 停止冒泡 */
  stopPropagation?: boolean;
  /** 执行条件 */
  expression?: string;
}

/** 事件配置 */
export interface OnEvent {
  [eventName: string]: {
    actions: ListenerAction[];
    weight?: number;
    debounce?: {
      wait?: number;
      maxWait?: number;
      leading?: boolean;
      trailing?: boolean;
    };
  };
}

/** 编辑器配置 */
export interface EditorSetting {
  /** 组件行为 */
  behavior?: string;
  /** 组件名称 */
  displayName?: string;
  /** 假数据 */
  mock?: unknown;
}

// ============================================================================
// 基础 Schema 接口
// ============================================================================

/** 组件基础属性 */
export interface BaseSchema {
  /** 组件唯一 id，用于设计器定位 */
  $$id?: string;
  /** CSS 类名 */
  className?: SchemaClassName;
  /** 引用定义 */
  $ref?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否禁用表达式 */
  disabledOn?: SchemaExpression;
  /** 是否隐藏 (已废弃，使用 visible) */
  hidden?: boolean;
  /** 是否隐藏表达式 (已废弃，使用 visibleOn) */
  hiddenOn?: SchemaExpression;
  /** 是否显示 */
  visible?: boolean;
  /** 是否显示表达式 */
  visibleOn?: SchemaExpression;
  /** 组件唯一 id，用于日志采集 */
  id?: string;
  /** 事件动作配置 */
  onEvent?: OnEvent;
  /** 是否静态展示 */
  static?: boolean;
  /** 是否静态展示表达式 */
  staticOn?: SchemaExpression;
  /** 静态展示空值占位 */
  staticPlaceholder?: string;
  /** 静态展示类名 */
  staticClassName?: SchemaClassName;
  /** 静态展示 Label 类名 */
  staticLabelClassName?: SchemaClassName;
  /** 静态展示 Value 类名 */
  staticInputClassName?: SchemaClassName;
  /** 静态展示 Schema */
  staticSchema?: unknown;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 编辑器配置 */
  editorSetting?: EditorSetting;
  /** 是否使用移动端 UI */
  useMobileUI?: boolean;
  /** 测试 id */
  testid?: string;
}

/** 表单控件基础属性 */
export interface FormBaseControl extends BaseSchema {
  /** 标签文本 */
  label?: string;
  /** 标签对齐方式 */
  labelAlign?: 'left' | 'right';
  /** 标签宽度 */
  labelWidth?: number | string;
  /** 标签溢出处理 */
  labelOverflow?: 'ellipsis' | 'unset';
  /** 标签 CSS 类名 */
  labelClassName?: SchemaClassName;
  /** 字段名称 */
  name?: string;
  /** 额外字段名 */
  extraName?: string;
  /** 备注信息 */
  remark?: unknown;
  /** 标签备注 */
  labelRemark?: unknown;
  /** 提示信息 */
  hint?: string;
  /** 值改变时提交 */
  submitOnChange?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 只读表达式 */
  readOnlyOn?: SchemaExpression;
  /** 改变时验证 */
  validateOnChange?: boolean;
  /** 描述信息 */
  description?: string;
  /** 描述信息 (别名) */
  desc?: string;
  /** 描述 CSS 类名 */
  descriptionClassName?: SchemaClassName;
  /** 展示模式 */
  mode?: 'normal' | 'horizontal' | 'inline';
  /** 水平布局配置 */
  horizontal?: {
    left?: number;
    right?: number;
    leftFixed?: 'xs' | 'sm' | 'md' | 'lg' | number;
  };
  /** 内联模式 */
  inline?: boolean;
  /** 输入框 CSS 类名 */
  inputClassName?: SchemaClassName;
  /** 占位符 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 验证错误信息 */
  validationErrors?: Record<string, string>;
  /** 验证规则 */
  validations?: Record<string, unknown> | string;
  /** 默认值 */
  value?: unknown;
  /** 隐藏时清除值 */
  clearValueOnHidden?: boolean;
  /** 验证 API */
  validateApi?: SchemaApi;
  /** 自动填充 */
  autoFill?: unknown;
  /** 初始化自动填充 */
  initAutoFill?: boolean;
  /** 行号 */
  row?: number;
  /** 是否静态展示 */
  static?: boolean;
  /** 静态展示表达式 */
  staticOn?: SchemaExpression;
  /** 表单项大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'full';
}

/** 选项控件属性 */
export interface FormOptionsSchema extends FormBaseControl {
  /** 选项列表 */
  options?: Option[];
  /** 选项数据源 */
  source?: SchemaApi;
  /** 是否默认选中第一个 */
  selectFirst?: boolean;
  /** 初始化时是否加载 */
  initFetch?: boolean;
  /** 初始化加载条件 */
  initFetchOn?: SchemaExpression;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否支持全选 */
  checkAll?: boolean;
  /** 是否拼接值 */
  joinValues?: boolean;
  /** 拼接分隔符 */
  delimiter?: string;
  /** 值是否换行 */
  valuesNoWrap?: boolean;
  /** 是否提取值 */
  extractValue?: boolean;
  /** 是否可清除 */
  clearable?: boolean;
  /** 重置值 */
  resetValue?: unknown;
  /** 延迟加载字段 */
  deferField?: string;
  /** 延迟加载 API */
  deferApi?: SchemaApi;
  /** 新增 API */
  addApi?: SchemaApi;
  /** 新增表单配置 */
  addControls?: unknown[];
  /** 新增弹窗 */
  addDialog?: unknown;
  /** 是否可新增 */
  creatable?: boolean;
  /** 新增按钮文本 */
  createBtnLabel?: string;
  /** 是否可编辑 */
  editable?: boolean;
  /** 编辑 API */
  editApi?: SchemaApi;
  /** 编辑表单配置 */
  editControls?: unknown[];
  /** 编辑弹窗 */
  editDialog?: unknown;
  /** 是否可删除 */
  removable?: boolean;
  /** 删除 API */
  deleteApi?: SchemaApi;
  /** 删除确认文本 */
  deleteConfirmText?: string;
  /** 数据源改变时清除值 */
  clearValueOnSourceChange?: boolean;
}
