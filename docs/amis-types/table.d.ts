import { BaseSchema, SchemaApi, SchemaClassName, SchemaExpression } from './common';

/**
 * TableSchema 表格
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/table
 */
export interface TableSchema extends BaseSchema {
  /** 指定为 table 渲染器 */
  type: 'table' | 'static-table';
  /** 表格标题 */
  title?: string;
  /** 表格数据源 */
  source?: string;
  /** 列配置 */
  columns?: TableColumn[];
  /** 是否显示序号 */
  showIndex?: boolean;
  /** 是否可选择 */
  selectable?: boolean;
  /** 多选 */
  multiple?: boolean;
  /** 选择配置 */
  rowSelection?: {
    type?: 'checkbox' | 'radio';
    keyField?: string;
    selections?: unknown[];
  };
  /** 主键字段 */
  primaryField?: string;
  /** 是否固定表头 */
  affixHeader?: boolean;
  /** 是否固定列 */
  affixColumns?: boolean;
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
  /** 表头 CSS 类名 */
  headerClassName?: SchemaClassName;
  /** 单元格 CSS 类名 */
  cellClassName?: SchemaClassName;
  /** 行 CSS 类名 */
  rowClassName?: SchemaClassName | SchemaExpression;
  /** 行样式 */
  rowClassNameExpr?: string;
  /** 是否可拖拽排序 */
  draggable?: boolean;
  /** 拖拽排序 API */
  itemDraggableOn?: string;
  /** 是否可调整列宽 */
  resizable?: boolean;
  /** 默认列宽 */
  defaultColumnWidth?: number;
  /** 空数据提示 */
  placeholder?: string;
  /** 是否文本模式 */
  text?: boolean;
  /** 数据为空时提示 */
  autoFillHeight?: boolean;
  /** 分页配置 */
  pager?: unknown;
  /** 每页条数 */
  perPage?: number;
  /** 列排序 */
  orderBy?: string;
  /** 排序方向 */
  orderDir?: 'asc' | 'desc';
  /** 加载配置 */
  loadingConfig?: {
    show?: boolean;
    root?: string;
  };
  /** 测试 id */
  testIdBuilder?: unknown;
}

/**
 * TableColumn 表格列配置
 */
export interface TableColumn {
  /** 列标题 */
  label: string;
  /** 列字段名 */
  name?: string;
  /** 列唯一标识 */
  key?: string;
  /** 列宽 */
  width?: number | string;
  /** 最小宽度 */
  minWidth?: number | string;
  /** 固定列 */
  fixed?: 'left' | 'right';
  /** 列对齐 */
  align?: 'left' | 'center' | 'right';
  /** 表头对齐 */
  headerAlign?: 'left' | 'center' | 'right';
  /** 列类型 */
  type?: string;
  /** 列 CSS 类名 */
  className?: SchemaClassName;
  /** 表头 CSS 类名 */
  headerClassName?: SchemaClassName;
  /** 是否可排序 */
  sortable?: boolean;
  /** 是否可筛选 */
  filterable?: unknown;
  /** 是否可复制 */
  copyable?: boolean | {
    content?: string;
    copy?: string;
    successText?: string;
    failedText?: string;
  };
  /** 格式化 */
  format?: string;
  /** 前缀 */
  prefix?: string;
  /** 后缀 */
  suffix?: string;
  /** 占位符 */
  placeholder?: string;
  /** 快速编辑 */
  quickEdit?: unknown;
  /** 静态展示 */
  static?: boolean;
  /** 断行 */
  breakWord?: boolean;
  /** 详情配置 */
  innerStyle?: unknown;
  /** 子列 */
  children?: TableColumn[];
  /** TPL 模板 */
  tpl?: string;
  /** 自定义渲染器 */
  [key: string]: unknown;
}

/**
 * CRUDSchema CRUD 增删改查
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/crud
 */
export interface CRUDSchema extends BaseSchema {
  /** 指定为 crud 渲染器 */
  type: 'crud';
  /** 数据 API */
  api?: SchemaApi;
  /** 初始化数据 API */
  initApi?: SchemaApi;
  /** 数据域 */
  data?: Record<string, unknown>;
  /** 模式 */
  mode?: 'table' | 'cards' | 'list';
  /** 表格配置 */
  columns?: TableColumn[];
  /** 列表配置 */
  cards?: unknown;
  /** 列表配置 */
  list?: unknown;
  /** 工具栏 */
  toolbar?: unknown[];
  /** 底部工具栏 */
  footerToolbar?: unknown[];
  /** 过滤器 */
  filter?: unknown;
  /** 默认参数 */
  defaultParams?: Record<string, unknown>;
  /** 每页条数 */
  perPage?: number;
  /** 是否静态 */
  static?: boolean;
  /** 主键字段 */
  primaryField?: string;
  /** 排序字段 */
  orderBy?: string;
  /** 排序方向 */
  orderDir?: 'asc' | 'desc';
  /** 保存排序 API */
  saveOrderApi?: SchemaApi;
  /** 快速保存 API */
  quickSaveApi?: SchemaApi;
  /** 快速保存单条 API */
  quickSaveItemApi?: SchemaApi;
  /** 拖拽排序 */
  draggable?: boolean;
  /** 拖拽排序 API */
  itemDraggableOn?: string;
  /** 是否可选择 */
  selectable?: boolean;
  /** 选择配置 */
  selection?: unknown;
  /** 是否自动刷新 */
  autoGenerateFilter?: boolean;
  /** 隐藏快速编辑提交按钮 */
  hideQuickSaveBtn?: boolean;
  /** 停止自动刷新条件 */
  stopAutoRefreshWhen?: string;
  /** 表格 CSS 类名 */
  tableClassName?: SchemaClassName;
  /** 卡片 CSS 类名 */
  cardClassName?: SchemaClassName;
  /** 列表 CSS 类名 */
  listClassName?: SchemaClassName;
  /** 空数据提示 */
  placeholder?: string;
  /** 同步数据到地址栏 */
  syncLocation?: boolean;
  /** 分页模式 */
  pageField?: string;
  /** 每页条数字段 */
  perPageField?: string;
  /** 总数字段 */
  totalField?: string;
  /** 数据字段 */
  itemsField?: string;
  /** 消息配置 */
  messages?: {
    fetchFailed?: string;
    fetchSuccess?: string;
    saveFailed?: string;
    saveSuccess?: string;
  };
}
