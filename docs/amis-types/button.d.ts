import { BaseSchema, SchemaApi, SchemaClassName, SchemaTpl } from './common';

/**
 * ButtonSchema 按钮
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/action
 */
export interface ButtonSchema extends BaseSchema {
  /** 指定为 button/action 渲染器 */
  type: 'button' | 'action' | 'submit' | 'reset';
  /** 按钮文字 */
  label?: SchemaTpl;
  /** 按钮图标 */
  icon?: string;
  /** 图标位置 */
  iconPosition?: 'left' | 'right';
  /** 按钮样式 */
  level?: 'info' | 'success' | 'warning' | 'danger' | 'link' | 'primary' | 'dark' | 'light' | 'secondary';
  /** 按钮大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 是否为块级按钮 */
  block?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 禁用表达式 */
  disabledOn?: string;
  /** 是否可见 */
  visible?: boolean;
  /** 可见表达式 */
  visibleOn?: string;
  /** 提示信息 */
  tooltip?: string;
  /** 提示位置 */
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left';
  /** 确认文案 */
  confirmText?: string;
  /** 动作类型 */
  actionType?: 'submit' | 'reset' | 'button' | 'dialog' | 'drawer' | 'ajax' | 'link' | 'url' | 'copy' | 'reload' | 'email' | 'close' | 'print' | 'toast' | 'email' | 'jump';
  /** 对话框配置 */
  dialog?: unknown;
  /** 抽屉配置 */
  drawer?: unknown;
  /** API 配置 */
  api?: SchemaApi;
  /** 链接地址 */
  link?: string;
  /** 打开方式 */
  blank?: boolean;
  /** 目标组件名 */
  target?: string;
  /** 关闭时刷新组件 */
  reload?: string;
  /** 表单提交后跳转 */
  redirect?: string;
  /** 复制内容 */
  copy?: string;
  /** 消息文案 */
  toastText?: string;
  /** Toast 位置 */
  toastPosition?: 'top-right' | 'top-center' | 'top-left' | 'bottom-center' | 'bottom-left' | 'bottom-right' | 'center';
  /** 发送条件 */
  sendOn?: string;
  /** 是否显示加载 */
  loading?: boolean;
  /** CSS 类名 */
  btnClassName?: SchemaClassName;
  /** 激活态 CSS 类名 */
  activeClassName?: SchemaClassName;
  /** 对齐方式 */
  align?: 'left' | 'right' | 'center';
}

/**
 * ButtonGroupSchema 按钮组
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/button-group
 */
export interface ButtonGroupSchema extends BaseSchema {
  /** 指定为 button-group 渲染器 */
  type: 'button-group';
  /** 按钮集合 */
  buttons?: ButtonSchema[];
  /** 按钮 CSS 类名 */
  btnClassName?: SchemaClassName;
  /** 激活态 CSS 类名 */
  btnActiveClassName?: SchemaClassName;
  /** 按钮级别 */
  btnLevel?: string;
  /** 激活态按钮级别 */
  btnActiveLevel?: string;
  /** 是否垂直排列 */
  vertical?: boolean;
  /** 是否平铺 */
  tiled?: boolean;
  /** 按钮大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * ButtonToolbarSchema 工具栏
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/button-toolbar
 */
export interface ButtonToolbarSchema extends BaseSchema {
  /** 指定为 button-toolbar 渲染器 */
  type: 'button-toolbar';
  /** 按钮集合 */
  buttons?: ButtonSchema[];
  /** 对齐方式 */
  align?: 'left' | 'right' | 'center';
}

/**
 * DropdownButtonSchema 下拉按钮
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/dropdown-button
 */
export interface DropdownButtonSchema extends BaseSchema {
  /** 指定为 dropdown-button 渲染器 */
  type: 'dropdown-button';
  /** 按钮文字 */
  label?: SchemaTpl;
  /** 按钮图标 */
  icon?: string;
  /** 按钮级别 */
  level?: 'info' | 'success' | 'warning' | 'danger' | 'link' | 'primary' | 'dark' | 'light';
  /** 按钮大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 下拉菜单 */
  buttons?: ButtonSchema[];
  /** 菜单对齐 */
  align?: 'left' | 'right';
  /** 触发方式 */
  trigger?: 'click' | 'hover';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否隐藏 */
  hideCaret?: boolean;
}
