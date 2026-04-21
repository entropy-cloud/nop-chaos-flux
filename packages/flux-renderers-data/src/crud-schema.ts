import type { ActionSchema, BaseSchema, SchemaInput, SchemaValue } from '@nop-chaos/flux-core';

/**
 * CRUD 查询表单配置
 */
export interface CrudQueryFormConfig {
  data?: SchemaValue;
  body?: SchemaInput;
  actions?: SchemaInput;
  statusPath?: string;
  layout?: 'horizontal' | 'vertical' | 'inline';
  [key: string]: SchemaValue | SchemaInput | ActionSchema | undefined;
}

/**
 * CRUD 列配置
 * 
 * 用户可以自定义 operation 列，在 buttons 中配置按钮。
 * 按钮可以配置 `action: 'openDialog'` 和 `args` 属性来打开对话框。
 */
export interface CrudColumnSchema {
  type?: string;
  name?: string;
  label?: SchemaValue;
  cell?: SchemaInput;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: Array<{ label: string; value: string }>;
  /** operation 列的按钮，每个按钮可以配置 openDialog action */
  buttons?: SchemaInput;
  [key: string]: SchemaValue | SchemaInput | undefined;
}

/**
 * CRUD Schema
 * 
 * CRUD 是一个复合组件，组合了 queryForm、toolbar、table、bulkActions。
 * 
 * **对话框由按钮自己控制**：
 * - 在 toolbar 或 columns 的 operation 列中配置按钮
 * - 按钮使用 `action: 'openDialog'` 和 `args: {...}` 配置对话框
 * - 对话框中的表单提交成功后，通过 `reload` 属性刷新 CRUD
 * 
 * **示例**：
 * ```json
 * {
 *   "type": "crud",
 *   "source": [...],
 *   "toolbar": [{
 *     "type": "button",
 *     "label": "新增",
 *     "onClick": {
 *       "action": "openDialog",
 *       "args": {
 *         "title": "新增用户",
 *         "body": { "type": "form", ... }
 *       }
 *     }
 *   }],
 *   "columns": [
 *     { "name": "name", "label": "姓名" },
 *     {
 *       "type": "operation",
 *       "label": "操作",
 *       "buttons": [{
 *         "type": "button",
 *         "label": "编辑",
 *         "onClick": {
 *           "action": "openDialog",
 *           "args": {
 *             "title": "编辑用户",
 *             "body": { "type": "form", "data": "${record}", ... }
 *           }
 *         }
 *       }]
 *     }
 *   ]
 * }
 * ```
 */
export interface CrudSchema extends BaseSchema {
  type: 'crud';
  /** 组件名称，用于 component handle 查找 */
  name?: string;
  /** 状态摘要发布路径 */
  statusPath?: string;
  /** 查询表单配置 */
  queryForm?: CrudQueryFormConfig;
  /** 数据源，可以是数组或 data-source */
  source?: SchemaValue;
  /** 工具栏，包含新增、刷新等按钮 */
  toolbar?: SchemaInput;
  /** 批量操作按钮 */
  bulkActions?: SchemaInput;
  /** 表格列配置 */
  columns?: CrudColumnSchema[];
  /** 空数据时显示的内容 */
  empty?: SchemaInput | string;
  /** 选择模式所有权 */
  selectionOwnership?: 'local' | 'controlled' | 'scope';
  /** 选择状态路径 */
  selectionStatePath?: string;
  /** 分页所有权 */
  paginationOwnership?: 'local' | 'controlled' | 'scope';
  /** 分页状态路径 */
  paginationStatePath?: string;
  /** 排序所有权 */
  sortOwnership?: 'local' | 'controlled' | 'scope';
  /** 排序状态路径 */
  sortStatePath?: string;
  /** 筛选所有权 */
  filterOwnership?: 'local' | 'controlled' | 'scope';
  /** 筛选状态路径 */
  filterStatePath?: string;
  /** 行主键字段名 */
  rowKey?: string;
  /** 刷新后是否自动清空选择 */
  autoClearSelectionOnRefresh?: boolean;
  /** 行点击事件 */
  onRowClick?: ActionSchema;
  /** 选择变化事件 */
  onSelectionChange?: ActionSchema;
  /** 刷新事件 */
  onRefresh?: ActionSchema;
}

/**
 * CRUD 状态摘要
 * 
 * 通过 `$crud` 在子树中访问，或通过 `statusPath` 发布到 scope。
 */
export interface CrudStatusSummary {
  /** 是否正在加载 */
  loading: boolean;
  /** 是否正在刷新 */
  refreshing: boolean;
  /** 当前项目数量 */
  itemCount: number;
  /** 总数 */
  total?: number;
  /** 是否有选中项 */
  hasSelection: boolean;
  /** 选中项数量 */
  selectionCount: number;
  /** 选中的行键 */
  selectedRowKeys: string[];
}

export function normalizeCrudSchema(schema: CrudSchema): CrudSchema {
  return {
    ...schema,
    rowKey: schema.rowKey ?? 'id',
    autoClearSelectionOnRefresh: schema.autoClearSelectionOnRefresh ?? true,
    selectionOwnership: schema.selectionOwnership ?? 'local',
    paginationOwnership: schema.paginationOwnership ?? 'local',
    sortOwnership: schema.sortOwnership ?? 'local',
    filterOwnership: schema.filterOwnership ?? 'local',
  };
}

export function createDefaultCrudStatusSummary(): CrudStatusSummary {
  return {
    loading: false,
    refreshing: false,
    itemCount: 0,
    total: undefined,
    hasSelection: false,
    selectionCount: 0,
    selectedRowKeys: [],
  };
}
