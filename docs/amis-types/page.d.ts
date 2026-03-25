import { BaseSchema, SchemaApi, SchemaClassName, SchemaExpression, SchemaTpl } from './common';

/**
 * Page 页面渲染器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/page
 */
export interface PageSchema extends BaseSchema {
  /** 指定为 page 渲染器 */
  type: 'page';
  /** 页面标题 */
  title?: SchemaTpl;
  /** 页面副标题 */
  subTitle?: SchemaTpl;
  /** 页面描述提示 */
  remark?: unknown;
  /** 内容区域 */
  body?: unknown;
  /** 内容区 CSS 类名 */
  bodyClassName?: SchemaClassName;
  /** 边栏区域 */
  aside?: unknown;
  /** 边栏是否允许拖动 */
  asideResizor?: boolean;
  /** 边栏内容是否粘住 */
  asideSticky?: boolean;
  /** 边栏位置 */
  asidePosition?: 'left' | 'right';
  /** 边栏最小宽度 */
  asideMinWidth?: number;
  /** 边栏最大宽度 */
  asideMaxWidth?: number;
  /** 边栏区 CSS 类名 */
  asideClassName?: SchemaClassName;
  /** 自定义样式表 */
  css?: Record<string, unknown>;
  /** 移动端样式表 */
  mobileCSS?: Record<string, unknown>;
  /** 页面初始数据 */
  data?: Record<string, unknown>;
  /** Header 容器 CSS 类名 */
  headerClassName?: SchemaClassName;
  /** 初始化 API */
  initApi?: SchemaApi;
  /** 是否初始加载 */
  initFetch?: boolean;
  /** 初始加载条件表达式 */
  initFetchOn?: SchemaExpression;
  /** 消息配置 */
  messages?: {
    fetchSuccess?: string;
    fetchFailed?: string;
    saveSuccess?: string;
    saveFailed?: string;
  };
  /** 组件名称 */
  name?: string;
  /** 工具栏区域 */
  toolbar?: unknown;
  /** 工具栏 CSS 类名 */
  toolbarClassName?: SchemaClassName;
  /** 轮询间隔 */
  interval?: number;
  /** 是否静默轮询 */
  silentPolling?: boolean;
  /** 停止轮询条件 */
  stopAutoRefreshWhen?: SchemaExpression;
  /** 是否显示错误信息 */
  showErrorMsg?: boolean;
  /** CSS 变量 */
  cssVars?: unknown;
  /** 默认展示区域 */
  regions?: Array<'aside' | 'body' | 'toolbar' | 'header'>;
  /** 下拉刷新配置 */
  pullRefresh?: {
    disabled?: boolean;
    pullingText?: string;
    loosingText?: string;
  };
  /** 加载配置 */
  loadingConfig?: {
    show?: boolean;
    root?: string;
  };
}
