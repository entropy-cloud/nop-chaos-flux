import { BaseSchema, SchemaApi, SchemaClassName, SchemaTpl } from './common';

/**
 * TaskItem 任务项配置
 */
export interface TaskItem {
  /** 任务键值，请唯一区分 */
  key?: string;
  /** 任务名称 */
  label?: string;
  /** 当前任务状态，支持 html */
  remark?: string;
  /** 任务状态 */
  status?: 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * TasksSchema 任务组件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/tasks
 */
export interface TasksSchema extends BaseSchema {
  /** 指定为 tasks 渲染器 */
  type: 'tasks';
  /** 操作按钮 CSS 类名 */
  btnClassName?: SchemaClassName;
  /** 操作按钮文字 */
  btnText?: string;
  /** 用来获取任务状态的 API */
  checkApi?: SchemaApi;
  /** 检测间隔，默认 3s */
  interval?: number;
  /** 任务列表 */
  items?: TaskItem[];
  /** 名称 */
  name?: string;
  /** 操作列说明 */
  operationLabel?: string;
  /** 重试 API */
  reSubmitApi?: SchemaApi;
  /** 备注列说明 */
  remarkLabel?: string;
  /** 重试按钮 CSS 类名 */
  retryBtnClassName?: SchemaClassName;
  /** 重试按钮文字 */
  retryBtnText?: string;
  /** 状态列说明 */
  statusLabel?: string;
  /** 状态显示对应的类名配置 */
  statusLabelMap?: string[];
  /** 状态显示对应的文字显示配置 */
  statusTextMap?: string[];
  /** 提交任务使用的 API */
  submitApi?: SchemaApi;
  /** 表格 CSS 类名 */
  tableClassName?: SchemaClassName;
  /** 任务名称列说明 */
  taskNameLabel?: string;
  /** 初始状态码 */
  initialStatusCode?: number;
  /** 就绪状态码 */
  readyStatusCode?: number;
  /** 加载状态码 */
  loadingStatusCode?: number;
  /** 可重试状态码 */
  canRetryStatusCode?: number;
  /** 完成状态码 */
  finishStatusCode?: number;
  /** 错误状态码 */
  errorStatusCode?: number;
  /** 加载配置 */
  loadingConfig?: unknown;
}

/**
 * WordsSchema 文字组件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/words
 */
export interface WordsSchema extends BaseSchema {
  /** 指定为 words 渲染器 */
  type: 'words';
  /** 展示限制，为0时也无限制 */
  limit?: number;
  /** 展开按钮文字 */
  expendButtonText?: string;
  /** 展开按钮配置 */
  expendButton?: unknown;
  /** 收起按钮文字 */
  collapseButtonText?: string;
  /** 收起按钮配置 */
  collapseButton?: unknown;
  /** tags数据 */
  words?: string | string[];
  /** 是否使用tag的方式展示 */
  inTag?: boolean | unknown;
  /** 分割符 */
  delimiter?: string;
  /** 标签模板 */
  labelTpl?: string;
}

/**
 * ExpandableSchema 可展开配置
 */
export interface ExpandableSchema {
  /** 对应渲染器类型 */
  type?: string;
  /** 对应数据源的key值 */
  keyField?: string;
  /** 行是否可展开表达式 */
  expandableOn?: string;
  /** 展开行自定义样式表达式 */
  expandedRowClassNameExpr?: string;
  /** 已展开的key值 */
  expandedRowKeys?: Array<string | number>;
  /** 已展开的key值表达式 */
  expandedRowKeysExpr?: string;
}

/**
 * MultilineTextSchema 多行文本
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/multiline-text
 */
export interface MultilineTextSchema extends BaseSchema {
  /** 指定为 multiline-text 渲染器 */
  type: 'multiline-text';
  /** 最大行数 */
  maxLineCount?: number;
  /** 文本内容 */
  text?: SchemaTpl;
  /** 展开按钮文字 */
  expendButtonText?: string;
  /** 收起按钮文字 */
  collapseButtonText?: string;
  /** 是否默认展开 */
  defaultCollapsed?: boolean;
}

/**
 * SubFormControl 子表单控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/subform
 */
export interface SubFormControlSchema extends BaseSchema {
  /** 指定为 subform 渲染器 */
  type: 'subform';
  /** 子表单配置 */
  form?: unknown;
  /** 按钮文字 */
  btnLabel?: string;
  /** 按钮样式 */
  btnLevel?: 'link' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'light' | 'dark' | 'info';
  /** 表单字段名 */
  name?: string;
  /** 标签 */
  label?: string;
  /** 是否可多选 */
  multiple?: boolean;
  /** 是否内嵌模式 */
  embed?: boolean;
  /** 子表单模式 */
  subFormMode?: 'normal' | 'horizontal' | 'inline';
  /** 子表单水平布局 */
  subFormHorizontal?: {
    left?: number;
    right?: number;
    leftFixed?: 'xs' | 'sm' | 'md' | 'lg' | number;
  };
}

/**
 * FieldSetControl 字段集
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/fieldset
 */
export interface FieldSetControlSchema extends BaseSchema {
  /** 指定为 fieldset 渲染器 */
  type: 'fieldset';
  /** 标题 */
  title?: string;
  /** 子内容 */
  body?: unknown[];
  /** 是否可折叠 */
  collapsable?: boolean;
  /** 是否默认折叠 */
  collapsed?: boolean;
  /** 标题 CSS 类名 */
  headerClassName?: SchemaClassName;
  /** 内容 CSS 类名 */
  bodyClassName?: SchemaClassName;
}

/**
 * GroupControl 表单分组
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/group
 */
export interface GroupControlSchema extends BaseSchema {
  /** 指定为 group 渲染器 */
  type: 'group';
  /** 子表单项 */
  body?: unknown[];
  /** 列模式 */
  mode?: 'horizontal' | 'vertical' | 'inline';
  /** 列间距 */
  gap?: 'xs' | 'sm' | 'normal' | 'md' | 'lg';
  /** 方向 */
  direction?: 'horizontal' | 'vertical';
}

/**
 * InputGroupControl 输入组
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/input-group
 */
export interface InputGroupControlSchema extends BaseSchema {
  /** 指定为 input-group 渲染器 */
  type: 'input-group';
  /** 子表单项 */
  body?: unknown[];
  /** 标签 */
  label?: string;
  /** 字段名 */
  name?: string;
}

/**
 * SwitchContainerSchema 开关容器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/switch-container
 */
export interface SwitchContainerSchema extends BaseSchema {
  /** 指定为 switch-container 渲染器 */
  type: 'switch-container';
  /** 规则配置 */
  rules?: Array<{
    /** 表达式 */
    expression?: string;
    /** 内容 */
    body?: unknown;
  }>;
  /** 默认内容 */
  defaultBody?: unknown;
}

/**
 * PasswordSchema 密码展示
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/password
 */
export interface PasswordSchema extends BaseSchema {
  /** 指定为 password 渲染器 */
  type: 'password';
  /** 密码值 */
  value?: string;
  /** 是否可复制 */
  copyable?: boolean;
  /** 是否显示/隐藏切换 */
  toggle?: boolean;
  /** 密码模式 */
  mode?: 'text' | 'password';
}

/**
 * JsonSchemaEditorControl JSON Schema 编辑器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/json-schema-editor
 */
export interface JsonSchemaEditorControlSchema extends BaseSchema {
  /** 指定为 json-schema-editor 渲染器 */
  type: 'json-schema-editor';
  /** 是否显示根节点 */
  showRootInfo?: boolean;
  /** JSON Schema */
  value?: unknown;
  /** 是否允许定义 */
  allowDefinition?: boolean;
  /** 是否允许配置 */
  allowSettings?: boolean;
  /** 是否显示高级配置 */
  showAdvancedSettings?: boolean;
}

/**
 * ListControl 列表控件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/list
 */
export interface ListControlSchema extends BaseSchema {
  /** 指定为 list 渲染器 */
  type: 'list';
  /** 选项列表 */
  options?: unknown[];
  /** 选项数据源 */
  source?: SchemaApi;
  /** 标签字段 */
  labelField?: string;
  /** 值字段 */
  valueField?: string;
  /** 图片字段 */
  imageField?: string;
  /** 描述字段 */
  descField?: string;
  /** 是否可搜索 */
  searchable?: boolean;
}
