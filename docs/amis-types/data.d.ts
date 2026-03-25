import { BaseSchema, SchemaApi, SchemaClassName, SchemaTpl } from './common';

/**
 * TableSchema2 新表格
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/table2
 */
export interface TableSchema2 extends BaseSchema {
  /** 指定为 table2 渲染器 */
  type: 'table2';
  /** 表格标题 */
  title?: string;
  /** 表格数据源 */
  source?: string;
  /** 列配置 */
  columns?: unknown[];
  /** 主键字段 */
  primaryField?: string;
  /** 是否固定表头 */
  affixHeader?: boolean;
  /** 是否固定列 */
  sticky?: boolean;
  /** 表格大小 */
  size?: 'sm' | 'md';
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否显示斑马纹 */
  stripe?: boolean;
  /** 是否显示表头 */
  showHeader?: boolean;
  /** 表格 CSS 类名 */
  tableClassName?: SchemaClassName;
  /** 行 CSS 类名 */
  rowClassName?: SchemaClassName;
  /** 是否可拖拽排序 */
  draggable?: boolean;
  /** 是否可调整列宽 */
  resizable?: boolean;
  /** 是否可选择 */
  selectable?: boolean;
  /** 多选 */
  multiple?: boolean;
  /** 选择配置 */
  rowSelection?: unknown;
  /** 空数据提示 */
  placeholder?: string;
  /** 分页配置 */
  pager?: unknown;
}

/**
 * ListSchema 列表
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/list
 */
export interface ListSchema extends BaseSchema {
  /** 指为 list 渲染器 */
  type: 'list' | 'static-list';
  /** 列表标题 */
  title?: SchemaTpl;
  /** 列表数据源 */
  source?: string;
  /** 列表项配置 */
  listItem?: unknown;
  /** 列表项字段 */
  listFields?: unknown[];
  /** 主键字段 */
  primaryField?: string;
  /** 是否可选择 */
  selectable?: boolean;
  /** 多选 */
  multiple?: boolean;
  /** 分页配置 */
  pager?: unknown;
  /** 每页条数 */
  perPage?: number;
  /** 占位符 */
  placeholder?: string;
  /** 列表 CSS 类名 */
  listClassName?: SchemaClassName;
  /** 无数据提示 */
  noResult?: SchemaTpl;
}

/**
 * CardsSchema 卡片组
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/cards
 */
export interface CardsSchema extends BaseSchema {
  /** 指定为 cards 渲染器 */
  type: 'cards';
  /** 卡片组标题 */
  title?: SchemaTpl;
  /** 卡片组数据源 */
  source?: string;
  /** 卡片配置 */
  card?: unknown;
  /** 主键字段 */
  primaryField?: string;
  /** 是否可选择 */
  selectable?: boolean;
  /** 多选 */
  multiple?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 分页配置 */
  pager?: unknown;
  /** 每页条数 */
  perPage?: number;
  /** 占位符 */
  placeholder?: string;
  /** 卡片 CSS 类名 */
  cardClassName?: SchemaClassName;
  /** 列数 */
  columnsCount?: number;
  /** 间距 */
  gap?: number | string;
  /** Masonry 瀑布流 */
  masonryLayout?: boolean;
}

/**
 * CardSchema 单卡片
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/card
 */
export interface CardSchema extends BaseSchema {
  /** 指定为 card 渲染器 */
  type: 'card';
  /** 卡片标题 */
  header?: unknown;
  /** 卡片内容 */
  body?: unknown;
  /** 卡片底部 */
  footer?: unknown;
  /** 卡片操作 */
  actions?: unknown[];
  /** 是否可选择 */
  selectable?: boolean;
  /** 是否可多选 */
  multiple?: boolean;
  /** 选中字段 */
  checkOnItemClick?: boolean;
  /** 主键字段 */
  primaryField?: string;
  /** 卡片 CSS 类名 */
  cardClassName?: SchemaClassName;
  /** 媒体区 */
  media?: unknown;
}

/**
 * NavSchema 导航
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/nav
 */
export interface NavSchema extends BaseSchema {
  /** 指定为 nav 渲染器 */
  type: 'nav';
  /** 导航链接集合 */
  links?: NavItemSchema[];
  /** 导航模式 */
  mode?: 'inline' | 'float' | 'collapse' | 'tabs' | 'stacked';
  /** 数据源 */
  source?: SchemaApi;
  /** 默认展开 */
  defaultOpenNode?: string;
  /** 是否可折叠 */
  collapsed?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 保存排序 API */
  saveOrderApi?: SchemaApi;
  /** 是否可添加 */
  addApi?: SchemaApi;
  /** 添加按钮文案 */
  addBtnLabel?: string;
  /** 是否可编辑 */
  editApi?: SchemaApi;
  /** 是否可删除 */
  deleteApi?: SchemaApi;
  /** 导航项 CSS 类名 */
  itemBadge?: unknown;
  /** 更多操作 */
  overflow?: unknown;
}

/**
 * NavItemSchema 导航项
 */
export interface NavItemSchema {
  /** 导航标签 */
  label: SchemaTpl;
  /** 导航链接 */
  to?: SchemaTpl;
  /** 链接目标 */
  target?: string;
  /** 图标 */
  icon?: string;
  /** 是否展开 */
  unfolded?: boolean;
  /** 是否激活 */
  active?: boolean;
  /** 激活条件 */
  activeOn?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 子导航 */
  children?: NavItemSchema[];
  /** 是否可拖拽 */
  draggable?: boolean;
}

/**
 * PaginationSchema 分页
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/pagination
 */
export interface PaginationSchema extends BaseSchema {
  /** 指定为 pagination 渲染器 */
  type: 'pagination';
  /** 当前页 */
  activePage?: number;
  /** 总页数 */
  lastPage?: number;
  /** 每页条数 */
  perPage?: number;
  /** 总条数 */
  total?: number;
  /** 分页模式 */
  mode?: 'simple' | 'normal';
  /** 最大显示页码数 */
  maxButtons?: number;
  /** 是否显示每页条数切换 */
  showPerPage?: boolean;
  /** 是否显示总条数 */
  showPageInput?: boolean;
  /** 每页条数选项 */
  perPageAvailable?: number[];
  /** 分页布局 */
  layout?: string[];
  /** 分页 CSS 类名 */
  className?: SchemaClassName;
}

/**
 * PaginationWrapperSchema 分页包裹
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/pagination-wrapper
 */
export interface PaginationWrapperSchema extends BaseSchema {
  /** 指定为 pagination-wrapper 渲染器 */
  type: 'pagination-wrapper';
  /** 分页组件 */
  body?: unknown;
  /** 数据源 */
  source?: string;
  /** 每页条数 */
  perPage?: number;
  /** 分页配置 */
  pager?: unknown;
}

/**
 * SearchBoxSchema 搜索框
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/search-box
 */
export interface SearchBoxSchema extends BaseSchema {
  /** 指定为 search-box 渲染器 */
  type: 'search-box';
  /** 搜索占位符 */
  placeholder?: string;
  /** 是否可搜索 */
  mini?: boolean;
  /** 搜索图标 */
  searchImediately?: boolean;
  /** 搜索字段名 */
  name?: string;
  /** 清除按钮 */
  clearable?: boolean;
  /** 是否增强样式 */
  enhance?: boolean;
  /** 是否可自定义 */
  defaultData?: Record<string, unknown>;
  /** 搜索 API */
  searchApi?: SchemaApi;
  /** 是否显示搜索按钮 */
  isDebounce?: boolean;
  /** 搜索按钮样式 */
  loading?: boolean;
  /** 按钮文字 */
  label?: string;
}

/**
 * SliderSchema 滑块
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/form/range
 */
export interface SliderSchema extends BaseSchema {
  /** 指定为 slider 渲染器 */
  type: 'slider';
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
  /** 是否显示步长刻度 */
  showSteps?: boolean;
  /** 是否显示输入框 */
  showInput?: boolean;
  /** 滑块类型 */
  mode?: 'horizontal' | 'vertical';
  /** 单位 */
  unit?: string;
  /** 标记 */
  marks?: Record<number, string | { style?: React.CSSProperties; label?: string }>;
  /** 是否范围选择 */
  multiple?: boolean;
  /** 滑块 CSS 类名 */
  className?: SchemaClassName;
}

/**
 * TimeLine 时间轴
 */
export interface TimeLineSchema extends BaseSchema {
  /** 指定为 timeline 渲染器 */
  type: 'timeline';
  /** 时间轴项 */
  items?: Array<{
    time?: SchemaTpl;
    title?: SchemaTpl;
    detail?: SchemaTpl;
    icon?: string;
    color?: string;
    type?: 'dot' | 'solid';
  }>;
  /** 时间轴模式 */
  mode?: 'left' | 'right' | 'alternate';
  /** 时间轴方向 */
  direction?: 'horizontal' | 'vertical';
  /** 是否反转 */
  reverse?: boolean;
}

/**
 * ServiceSchema 服务
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/service
 */
export interface ServiceSchema extends BaseSchema {
  /** 指定为 service 渲染器 */
  type: 'service';
  /** 子内容 */
  body?: unknown;
  /** 数据 API */
  api?: SchemaApi;
  /** WebSocket 地址 */
  ws?: string;
  /** 数据域 */
  data?: Record<string, unknown>;
  /** 轮询间隔 */
  interval?: number;
  /** 是否静默轮询 */
  silentPolling?: boolean;
  /** 停止轮询条件 */
  stopAutoRefreshWhen?: string;
  /** 初始化数据源 */
  schemaApi?: SchemaApi;
  /** 初始化数据源 */
  initFetch?: boolean;
  /** 初始化数据源条件 */
  initFetchOn?: SchemaExpression;
  /** 消息配置 */
  messages?: {
    fetchFailed?: string;
    fetchSuccess?: string;
  };
}

import { SchemaExpression } from './common';
