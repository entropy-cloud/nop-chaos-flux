import { BaseSchema, SchemaApi, SchemaClassName, SchemaExpression } from './common';

/**
 * Form 表单渲染器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form
 */
export interface FormSchema extends BaseSchema {
  /** 指定为 form 渲染器 */
  type: 'form';
  /** 表单标题 */
  title?: string;
  /** 按钮集合，固定在底部显示 */
  actions?: unknown[];
  /** 表单项集合 */
  body?: unknown;
  /** 初始数据 */
  data?: Record<string, unknown>;
  /** 是否开启调试 */
  debug?: boolean;
  /** 初始化 API */
  initApi?: SchemaApi;
  /** 异步初始化 API */
  initAsyncApi?: SchemaApi;
  /** 初始化完成字段 */
  initFinishedField?: string;
  /** 轮询间隔 */
  initCheckInterval?: number;
  /** 是否初始加载 */
  initFetch?: boolean;
  /** 初始加载条件 */
  initFetchOn?: SchemaExpression;
  /** 轮询间隔 */
  interval?: number;
  /** 是否静默轮询 */
  silentPolling?: boolean;
  /** 停止轮询条件 */
  stopAutoRefreshWhen?: SchemaExpression;
  /** 本地缓存 key */
  persistData?: string;
  /** 缓存白名单 */
  persistDataKeys?: string[];
  /** 提交后清空缓存 */
  clearPersistDataAfterSubmit?: boolean;
  /** 提交 API */
  api?: SchemaApi;
  /** 反馈配置 */
  feedback?: unknown;
  /** 异步提交 API */
  asyncApi?: SchemaApi;
  /** 轮询间隔 */
  checkInterval?: number;
  /** 完成字段 */
  finishedField?: string;
  /** 提交后重置 */
  resetAfterSubmit?: boolean;
  /** 提交后清空 */
  clearAfterSubmit?: boolean;
  /** 表单模式 */
  mode?: 'normal' | 'inline' | 'horizontal' | 'flex';
  /** 列数 */
  columnCount?: number;
  /** 水平布局 */
  horizontal?: {
    left?: number;
    right?: number;
    leftFixed?: 'xs' | 'sm' | 'md' | 'lg' | number;
  };
  /** 自动聚焦 */
  autoFocus?: boolean;
  /** 消息配置 */
  messages?: {
    validateFailed?: string;
    validateSuccess?: string;
  };
  /** 主键字段 */
  primaryField?: string;
  /** 提交后跳转 */
  redirect?: string;
  /** 提交后刷新 */
  reload?: string;
  /** 改变时提交 */
  submitOnChange?: boolean;
  /** 初始化时提交 */
  submitOnInit?: boolean;
  /** 提交按钮文本 */
  submitText?: string;
  /** 目标组件 */
  target?: string;
  /** 是否用 panel 包裹 */
  wrapWithPanel?: boolean;
  /** 是否固定底部按钮 */
  affixFooter?: boolean;
  /** 页面离开提示 */
  promptPageLeave?: boolean;
  /** 禁用回车提交 */
  preventEnterSubmit?: boolean;
  /** 组合校验规则 */
  rules?: Array<{
    rule: string;
    message: string;
    name?: string | string[];
  }>;
  /** 调试配置 */
  debugConfig?: {
    levelExpand?: number;
    enableClipboard?: boolean;
    iconStyle?: 'square' | 'circle' | 'triangle';
    quotesOnKeys?: boolean;
    sortKeys?: boolean;
    ellipsisThreshold?: number | false;
  };
}
