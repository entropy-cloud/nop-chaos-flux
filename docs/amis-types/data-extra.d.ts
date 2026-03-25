import { BaseSchema, SchemaApi, SchemaClassName, SchemaExpression } from './common';

/**
 * CRUD2BaseSchema CRUD2 基础属性
 */
export interface CRUD2BaseSchema extends BaseSchema {
  /** CRUD2 模式 */
  mode?: 'table2' | 'cards' | 'list';
  /** 数据源 */
  source?: SchemaApi;
  /** API */
  api?: SchemaApi;
  /** 快速保存 API */
  quickSaveApi?: SchemaApi;
  /** 快速保存单条 API */
  quickSaveItemApi?: SchemaApi;
  /** 保存排序 API */
  saveOrderApi?: SchemaApi;
  /** 是否静默轮询 */
  silentPolling?: boolean;
  /** 轮询间隔 */
  interval?: number;
  /** 停止轮询条件 */
  stopAutoRefreshWhen?: SchemaExpression;
  /** 加载类型 */
  loadType?: 'more' | 'reload';
  /** 每页数量 */
  perPage?: number;
  /** 是否一次性加载数据 */
  loadDataOnce?: boolean;
  /** 是否同步地址栏 */
  syncLocation?: boolean;
  /** 页码字段 */
  pageField?: string;
  /** 每页数量字段 */
  perPageField?: string;
  /** 名称 */
  name?: string;
  /** 隐藏快速保存按钮 */
  hideQuickSaveBtn?: boolean;
  /** 分页改变时自动跳转到顶部 */
  autoJumpToTopOnPagerChange?: boolean;
  /** 头部工具栏 */
  headerToolbar?: unknown[];
  /** 头部工具栏 CSS 类名 */
  headerToolbarClassName?: SchemaClassName;
  /** 底部工具栏 */
  footerToolbar?: unknown[];
  /** 底部工具栏 CSS 类名 */
  footerToolbarClassName?: SchemaClassName;
  /** 同步响应到查询 */
  syncResponse2Query?: boolean;
  /** 解析原始查询 */
  parsePrimitiveQuery?: boolean;
  /** 下拉刷新 */
  pullRefresh?: unknown;
  /** 消息配置 */
  messages?: {
    fetchSuccess?: string;
    fetchFailed?: string;
    saveSuccess?: string;
    saveFailed?: string;
  };
  /** 刷新 */
  reload?: string;
  /** 操作配置 */
  actions?: unknown[];
}

/**
 * CRUD2TableSchema CRUD2 表格模式
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/crud2
 */
export interface CRUD2TableSchema extends CRUD2BaseSchema {
  /** 指定为 crud2 渲染器 */
  type: 'crud2';
  /** CRUD2 模式 */
  mode: 'table2';
  /** 标题 */
  title?: string;
  /** 列配置 */
  columns: unknown[];
  /** 列可切换 */
  columnsTogglable?: boolean | 'auto';
  /** 行选择配置 */
  rowSelection?: {
    /** 是否可选择 */
    type?: 'checkbox' | 'radio';
    /** 选择字段 */
    keyField?: string;
    /** 是否固定选择列 */
    fixed?: boolean;
    /** 选择列宽度 */
    columnWidth?: number;
  };
  /** 展开配置 */
  expandable?: unknown;
  /** 是否固定表头 */
  sticky?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 徽标配置 */
  itemBadge?: unknown;
  /** 是否显示徽标 */
  showBadge?: boolean;
  /** 弹出容器 */
  popOverContainer?: string;
  /** 主键字段 */
  keyField?: string;
  /** 子节点字段名 */
  childrenColumnName?: string;
  /** 行 CSS 类名表达式 */
  rowClassNameExpr?: SchemaExpression;
  /** 行高 */
  lineHeight?: number;
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否显示表头 */
  showHeader?: boolean;
  /** 底部配置 */
  footer?: unknown;
  /** 是否显示选择 */
  showSelection?: boolean;
  /** 主字段 */
  primaryField?: string;
  /** 表格布局 */
  tableLayout?: 'fixed' | 'auto';
  /** 自动填充高度 */
  autoFillHeight?: boolean;
  /** 是否可以访问父级数据 */
  canAccessSuperData?: boolean;
  /** 延迟渲染 */
  lazyRenderAfter?: number;
  /** 最大保持选择数量 */
  maxKeepItemSelectionLength?: number;
  /** 翻页时保持选择 */
  keepItemSelectionOnPageChange?: boolean;
  /** 是否可选择 */
  selectable?: boolean;
  /** 是否多选 */
  multiple?: boolean;
  /** 加载配置 */
  loadingConfig?: {
    show?: boolean;
    tip?: string;
  };
}

/**
 * CRUD2CardsSchema CRUD2 卡片模式
 */
export interface CRUD2CardsSchema extends CRUD2BaseSchema {
  /** 指定为 crud2 渲染器 */
  type: 'crud2';
  /** CRUD2 模式 */
  mode: 'cards';
  /** 卡片配置 */
  card?: unknown;
  /** 每行数量 */
  columnsCount?: number;
  /** 卡片 CSS 类名 */
  itemClassName?: SchemaClassName;
}

/**
 * CRUD2ListSchema CRUD2 列表模式
 */
export interface CRUD2ListSchema extends CRUD2BaseSchema {
  /** 指定为 crud2 渲染器 */
  type: 'crud2';
  /** CRUD2 模式 */
  mode: 'list';
  /** 列表项配置 */
  listItem?: unknown;
  /** 列表项 CSS 类名 */
  itemClassName?: SchemaClassName;
}

/**
 * CRUD2Schema CRUD2 组件
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/crud2
 */
export type CRUD2Schema = CRUD2TableSchema | CRUD2CardsSchema | CRUD2ListSchema;
