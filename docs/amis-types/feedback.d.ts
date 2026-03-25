import { BaseSchema, SchemaApi, SchemaClassName, SchemaTpl } from './common';

/**
 * AlertSchema 提示框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/alert
 */
export interface AlertSchema extends BaseSchema {
  /** 指定为 alert 渲染器 */
  type: 'alert';
  /** 提示标题 */
  title?: SchemaTpl;
  /** 提示内容 */
  body?: unknown;
  /** 提示级别 */
  level?: 'info' | 'success' | 'warning' | 'danger' | 'error';
  /** 是否可关闭 */
  showCloseButton?: boolean;
  /** 图标 */
  icon?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
}

/**
 * DialogSchema 对话框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/dialog
 */
export interface DialogSchema extends BaseSchema {
  /** 指定为 dialog 渲染器 */
  type: 'dialog';
  /** 对话框标题 */
  title?: SchemaTpl;
  /** 对话框内容 */
  body?: unknown;
  /** 对话框大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 是否可关闭 */
  closeOnEsc?: boolean;
  /** 点击遮罩关闭 */
  closeOnOutside?: boolean;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 操作按钮 */
  actions?: unknown[];
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 表单名称 */
  name?: string;
  /** 数据域 */
  data?: Record<string, unknown>;
  /** 初始化 API */
  initApi?: SchemaApi;
  /** 提交 API */
  api?: SchemaApi;
  /** 异步提交 API */
  asyncApi?: SchemaApi;
  /** 提交后刷新 */
  reload?: string;
  /** 提交后跳转 */
  redirect?: string;
  /** 消息配置 */
  messages?: {
    fetchFailed?: string;
    fetchSuccess?: string;
    saveFailed?: string;
    saveSuccess?: string;
  };
}

/**
 * DrawerSchema 抽屉
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/drawer
 */
export interface DrawerSchema extends BaseSchema {
  /** 指定为 drawer 渲染器 */
  type: 'drawer';
  /** 抽屉标题 */
  title?: SchemaTpl;
  /** 抽屉内容 */
  body?: unknown;
  /** 抽屉大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 抽屉宽度 */
  width?: number | string;
  /** 抽屉高度 */
  height?: number | string;
  /** 抽屉位置 */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** 是否可关闭 */
  closeOnEsc?: boolean;
  /** 点击遮罩关闭 */
  closeOnOutside?: boolean;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 操作按钮 */
  actions?: unknown[];
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 表单名称 */
  name?: string;
  /** 数据域 */
  data?: Record<string, unknown>;
  /** 初始化 API */
  initApi?: SchemaApi;
  /** 提交 API */
  api?: SchemaApi;
  /** 提交后刷新 */
  reload?: string;
  /** 提交后跳转 */
  redirect?: string;
}

/**
 * Toast 提示
 */
export interface ToastSchema {
  /** 提示内容 */
  body: SchemaTpl;
  /** 提示级别 */
  level?: 'info' | 'success' | 'warning' | 'error';
  /** 显示位置 */
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-center' | 'bottom-left' | 'bottom-right' | 'center';
  /** 显示时长 (ms) */
  timeout?: number;
}

/**
 * SpinnerSchema 加载中
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/spinner
 */
export interface SpinnerSchema extends BaseSchema {
  /** 指定为 spinner 渲染器 */
  type: 'spinner';
  /** 加载提示文案 */
  tip?: string;
  /** 加载图标尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 加载图标 */
  icon?: string;
  /** 是否显示 */
  show?: boolean;
  /** 包裹组件 */
  spinnerClassName?: SchemaClassName;
  /** 延迟显示 */
  delay?: number;
  /** 遮罩配置 */
  overlay?: boolean;
}

/**
 * RemarkSchema 备注
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/remark
 */
export interface RemarkSchema extends BaseSchema {
  /** 指定为 remark 渲染器 */
  type: 'remark';
  /** 备注内容 */
  content?: SchemaTpl;
  /** 触发方式 */
  trigger?: 'click' | 'hover';
  /** 提示位置 */
  placement?: 'top' | 'right' | 'bottom' | 'left';
  /** 提示标题 */
  title?: string;
  /** 图标 */
  icon?: string;
  /** 样式 */
  shape?: 'circle' | 'square';
}

/**
 * TooltipWrapperSchema 提示包裹
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/tooltip-wrapper
 */
export interface TooltipWrapperSchema extends BaseSchema {
  /** 指定为 tooltip-wrapper 渲染器 */
  type: 'tooltip-wrapper';
  /** 提示内容 */
  tooltip?: SchemaTpl;
  /** 子内容 */
  body?: unknown;
  /** 触发方式 */
  trigger?: 'click' | 'hover' | 'focus';
  /** 提示位置 */
  placement?: 'top' | 'right' | 'bottom' | 'left';
  /** 提示标题 */
  title?: string;
  /** 内容样式 */
  style?: React.CSSProperties;
  /** 包裹组件 */
  wrapperComponent?: string;
}
