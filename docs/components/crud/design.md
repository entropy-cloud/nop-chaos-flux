# CRUD 组件设计

## 1. 组件定位

- `crud` 是面向业务数据工作流的复合 renderer，用来把查询表单、数据加载、表格展示、工具栏动作、列表级动作、行操作和列管理组织成一个稳定的 schema 契约。
- `crud` 继续采用 Flux 当前 owner 分层，不把 `table`、`form`、`dialog`、`data-source` 重新揉成一个黑盒 owner。
- 当前 live baseline 已补齐 CRUD 主工作流的最小闭环：queryForm -> refresh params summary、`$crud` 摘要发布、header/footer toolbar blocks、selection-aware listActions、operation 列回归验证，以及 left/right fixed columns 的 table-level live behavior。

## 2. 设计目标

1. 覆盖 AMIS `crud` 的高频业务能力面，包括 operation 列、查询过滤、列排序、列显隐、固定列、响应式展开、列表级动作、批量操作模式、顶部/底部工具栏、前端一次性加载模式、快速编辑入口等。
2. 保持 Flux 自己的命名和 owner 语义，避免把 AMIS 的历史字段名原样复制为最终 DSL。
3. 提供一套简单、稳定、可文档化的 AMIS -> Flux 迁移映射。
4. 将尚未完全实现的能力明确标注为“契约已定义 / 运行时待补齐”，避免文档制造假已完成基线。

## 3. 非目标

- 不保留 AMIS 的字符串脚本事件、`actionType` 风格事件协议、`xxxApi` 顶层命名作为 Flux 正式命名。
- 不在本轮把 `crud` 运行时一次性扩成巨型实现。
- 不把 `crud` 定义成新的请求 owner；请求仍由 `source`、`data-source` 或 action 承担。

## 4. 核心原则

### 4.1 CRUD 是工作流壳，不是第二个 Table

- 查询表单仍是 `form` 语义。
- 列展示、排序、筛选、选择、展开、分页仍以 `table` 为底层载体。
- 对话框和抽屉仍由按钮自己通过 action 打开。
- `crud` 负责的是这些子能力的组合协作和迁移友好 authoring 面。

### 4.2 Operation 列继续由用户声明

- 用户在 `columns` 中自行声明 `type: 'operation'` 列。
- 行操作按钮继续写在 `columns[].buttons`。
- 不引入 `rowActions -> operation 列` 的隐式 lowering。

### 4.3 优先支持“简单迁移”，不是“字段原样克隆”

- Flux 正式字段使用 `queryForm`、`toolbar`、`footerToolbar`、`rowKey`、`pageSizeField`、`columnSettings` 等命名。
- 对应 AMIS 的 `filter`、`headerToolbar`、`footerToolbar`、`primaryField`、`perPageField`、`columns-toggler` 能稳定映射过来。
- 迁移示例里允许通过 `migrationHints` 记录原始 AMIS 来源，方便工具链和人工核对，但它不是运行时依赖。

## 5. 组件边界

`crud` 负责：

- 查询区与列表刷新协作
- 顶部/底部工具栏布局与列表级动作入口
- 列管理、字段选择、列顺序、固定列、响应式展开这类 CRUD authoring 高频能力的统一入口
- 通过 `$crud` / `statusPath` 暴露只读摘要，供内外部消费

`crud` 不负责重新定义：

- 表单验证规则
- 数据请求协议
- dialog/drawer surface 生命周期
- 单元格渲染原语

## 6. 正式 Schema 设计

### 6.1 顶层字段

核心字段：

- `name`
- `statusPath`
- `queryForm`
- `source`
- `toolbar`
- `footerToolbar`
- `toolbarLayout`
- `listActions`
- `columns`
- `empty`
- `rowKey`
- `selectionOwnership` / `selectionStatePath`
- `paginationOwnership` / `paginationStatePath`
- `sortOwnership` / `sortStatePath`
- `filterOwnership` / `filterStatePath`
- `selection`
- `pageField` / `pageSizeField`
- `defaultParams`
- `syncLocation`
- `columnSettings`
- `responsive`
- `autoGenerateQueryForm`
- `clientMode`
- `quickSaveAction` / `quickSaveItemAction`
- `migrationHints`
- `onQuerySubmit` / `onQueryReset` / `onRowClick` / `onSelectionChange` / `onRefresh`

### 6.2 列字段

`columns[]` 在 `table` 现有列定义基础上扩展下列迁移关键字段：

- `fixed: 'left' | 'right'`
- `hidden`
- `toggled`
- `align`
- `sortable`
- `searchable: boolean | SchemaInput`
- `filterable: boolean | { options, source, searchable, searchConfig, multiple }`
- `quickEdit: boolean | { mode, body, saveImmediately }`
- `buttons`

这使 Flux `crud` 在设计层可覆盖 AMIS 中最常见的：

- operation 列
- left/right fixed columns
- header quick search / filter
- quick edit
- columns toggler 所需的列显隐基础元数据

### 6.3 工具栏与列表动作建模

Flux 不复制 AMIS 的字符串数组工具栏协议作为正式契约，但要覆盖其能力：

- `listActions`: 列表级动作集合，包括新增、刷新、导出，以及依赖 selection 的批量动作
- `toolbar`: 顶部 region
- `footerToolbar`: 底部 region
- `toolbarLayout`: 对分页、统计、批量操作、每页数量切换等标准块做结构化声明

对迁移工具而言：

- `headerToolbar` -> `toolbar` 和 `listActions`
- `footerToolbar` -> `footerToolbar`
- `columns-toggler` -> `columnSettings`

批量操作不再是单独 canonical 字段：

- 依赖 selection 的操作直接写进 `listActions`
- 是否禁用、显示哪些统计、传哪些 id，统一通过 `$crud.hasSelection`、`$crud.selectedRowKeys`、`$crud.selectionCount` 表达
- `bulkActions` 只适合作为迁移别名或 authoring sugar，不应进入最终 canonical schema

### 6.4 查询区建模

Flux 统一用 `queryForm` 表达 AMIS 的 `filter` / `autoGenerateFilter`：

- 显式查询表单 -> `queryForm.body`
- 自动生成查询区 -> `autoGenerateQueryForm`
- 地址栏同步 -> `syncLocation`
- Query 原始类型解析 -> `queryForm.parsePrimitiveQuery`

当前 live runtime 仍未实现 `syncLocation`。是否需要它取决于 CRUD 查询状态是否必须进入页面级导航语义，例如刷新后保留筛选、浏览器前进/后退恢复查询、或复制 URL 分享同一列表视图。若没有这类明确产品需求，建议保持 deferred，避免把 CRUD query owner 扩展成 route/location owner。

### 6.5 前端一次性加载模式

AMIS 的 `loadDataOnce`、`loadDataOnceFetchOnFilter`、`matchFunc` 在 Flux 里收敛为：

```ts
clientMode: {
  loadDataOnce?: boolean;
  fetchOnFilter?: boolean;
  filterOnAllColumns?: boolean;
  matchFunc?: SchemaValue;
}
```

这比零散顶层字段更容易扩展，也更符合 Flux 复合配置风格。

当前 live runtime 已落地 `loadDataOnce` / `fetchOnFilter` 的第一版语义，但仍未实现 `matchFunc`。`matchFunc` 只有在仓库需要一条明确的“自定义前端记录匹配”契约时才值得收口，例如多字段联合匹配、非默认字符串匹配规则、或业务自定义 record/query 布尔判定。若当前没有这类明确需求，建议继续 deferred，避免在 CRUD 本地过滤之上过早引入更宽的匹配契约。

## 7. 运行期状态归属

- 查询提交状态 -> `queryForm` 内部 `form`
- 列表加载/刷新/错误 -> `source` owner
- 表格分页/排序/筛选/选择/展开 -> 底层 `table`
- table visible-columns / ordered-columns -> 底层 `table` column-settings owner state
- dialog/drawer 开合 -> 对应 surface owner
- quick edit 提交 -> 显式 action 或后续表格编辑 owner

当前 live baseline 中，`crud-renderer.tsx` 不再自己维护另一套 query/column-settings bridge 逻辑：

- query submit/reset 继续通过 query-form component handle + owner state path 收口
- table pagination/sort/filter/selection/visible-columns 继续通过内部 `table` 的 scope-owned state path 收口
- CRUD 只把这些 owner 结果聚合成 `$crud` / `statusPath` 只读摘要，而不在 renderer 主体里重新发明第二套交互 state owner

`crud.statusPath` 和 `$crud` 暴露的是只读摘要：

```ts
interface CrudStatusSummary {
  loading: boolean;
  refreshing: boolean;
  itemCount: number;
  total?: number;
  hasSelection: boolean;
  selectionCount: number;
  selectedRowKeys: string[];
  query?: Record<string, unknown>;
  pagination?: { currentPage?: number; pageSize?: number };
  sort?: { field?: string; order?: 'asc' | 'desc' };
  filters?: Record<string, unknown>;
  visibleColumnNames?: string[];
}
```

`visibleColumnNames` 的 live baseline 已接线到与内部 `table` 相同的 `columnSettings.toggledColumnsStatePath` / `orderedColumnsStatePath`，因此 CRUD footer/toolbar/statusPath 读取到的是同一份列可见性 owner 结果，而不是 renderer-local 推测值。

## 8. AMIS 迁移映射

| AMIS 字段 | Flux 正式字段 | 说明 |
| --- | --- | --- |
| `api` | `source` | canonical 迁移目标统一收敛到 `source`；当前 live baseline 已证明数组型 `source` 与上游 source-result object（如 `{ items, total }`）工作流，请求 owner 协作仍属后续范围 |
| `filter` | `queryForm` | 查询表单统一映射 |
| `autoGenerateFilter` | `autoGenerateQueryForm` | 自动生成查询区 |
| `headerToolbar` | `toolbar` | 顶部工具栏 region |
| `footerToolbar` | `footerToolbar` | 底部工具栏 region |
| `bulkActions` | `listActions` | 批量动作降级为列表级动作中的 selection-aware 普通 action |
| `primaryField` | `rowKey` | 行唯一键 |
| `pageField` | `pageField` | 分页页码参数名 |
| `perPageField` | `pageSizeField` | 每页数量参数名 |
| `columnsTogglable` / `columns-toggler` | `columnSettings` | 列选择/列排序入口 |
| `keepItemSelectionOnPageChange` | `selection.keepOnPageChange` | 跨页保留勾选 |
| `maxItemSelectionLength` | `selection.maxSelectionLength` | 当前页最大勾选数 |
| `maxKeepItemSelectionLength` | `selection.maxKeepSelectionLength` | 跨页保留时的最大勾选数 |
| `itemCheckableOn` | `selection.checkableWhen` | 可勾选条件 |
| `loadDataOnce` | `clientMode.loadDataOnce` | 前端一次性加载 |
| `loadDataOnceFetchOnFilter` | `clientMode.fetchOnFilter` | 查询后是否重新请求 |
| `matchFunc` | `clientMode.matchFunc` | 前端匹配函数 |
| `quickSaveApi` | `quickSaveAction` | 批量 quick edit 保存 |
| `quickSaveItemApi` | `quickSaveItemAction` | 单条即时保存 |
| `itemAction` | `onRowClick` 或 operation 列按钮 | 推荐落到显式 row action |

## 9. 特性对比列表

| 能力 | AMIS CRUD | Flux 当前运行时 | Flux 本次契约基线 |
| --- | --- | --- | --- |
| operation 列按钮 | 已支持 | 已支持 | 已覆盖 |
| 行点击动作 | 已支持 | 已支持 | 已覆盖 |
| 查询表单 | 已支持 | 已支持基础版（submit/reset 已接入 CRUD query summary） | 已覆盖 |
| 自动生成查询区 | 已支持 | 未实现 | 已定义 |
| 顶部/底部工具栏 | 已支持 | 已支持 header/footer region + 标准 toolbar blocks 基础版 | 已覆盖 |
| 列表级动作 | 已支持 | 已支持基础版 | 已覆盖 |
| 批量操作 | 已支持 | 可由 `listActions + $crud selection` 表达 | 已覆盖 |
| 列排序 | 已支持 | table 已有基础 sort state | 已覆盖 |
| 列头快速搜索 | 已支持 | 已支持基础版：header search input + active-state trigger + clear action | 已覆盖基础版 |
| 列头快速过滤 | 已支持 | 已支持基础版：header filter menu/state + active-state trigger + clear action | 已覆盖基础版 |
| 左/右固定列 | 已支持 | 已支持 table/crud live sticky columns 基础版 | 已覆盖 |
| 多列时的字段选择 | 已支持 | 已支持基础版（列显隐 + 最小列顺序调整，`overlay: false` inline panel 已落地） | 已覆盖基础版 |
| 列拖拽排序 | 已支持 | 未实现（当前为非拖拽的最小上下移动；`draggable` 仍属后续） | 已定义 |
| 响应式更多列展开 | 已支持 | 已支持基础版：`responsive.mode: 'expand'` 会在低于 `breakpoint` 时把次要列移入 expandable detail row | 已覆盖基础版 |
| 服务端分页 | 已支持 | 未实现完整请求 owner baseline；当前支持消费上游 source-result object（如 `{ items, total }`）并通过 `onRefresh -> refreshSource` 回到上游请求 owner | 已定义 |
| 前端一次性加载分页/过滤 | 已支持 | 已支持基础版：`loadDataOnce` / `fetchOnFilter` | 已覆盖基础版 |
| quick edit | 已支持 | 已支持基础版：inline / custom body / local dialog quick-edit + quick save bridge | 已覆盖基础版 |
| 动态列 | 已支持 | 部分可通过 source 注入 | 已覆盖设计入口 |
| 地址栏同步查询参数 | 已支持 | 未实现，且当前阶段显式 deferred | 已定义 |

说明：

- “当前运行时”反映仓库当前代码状态。
- “本次契约基线”表示已经进入正式设计和 TypeScript schema，可作为后续实现与迁移工具的依据。
- 当前仍未完成或显式 deferred 的 table-heavy / editing-heavy 能力包括更完整的 `columnSettings` parity（尤其是 `draggable` 和持久化策略；`overlay: false` inline panel 已落地）、richer responsive expansion parity、更丰富的 header search/filter source/search UX、`syncLocation` / primitive query parsing、`matchFunc`，以及更完整的 API/request-owned `source` 驱动 CRUD workflow（当前已落地 source-result consumption、upstream refresh cooperation、quickEdit baseline 与 `clientMode.loadDataOnce` / `fetchOnFilter` 基线），不应误读为已全部落地。

## 10. 迁移策略

建议迁移器遵循下面顺序：

1. 直接保留 `type: 'crud'` 和 `columns`。
2. 将 `api` 转成 `source`。
3. 将 `filter` / `autoGenerateFilter` 转成 `queryForm` / `autoGenerateQueryForm`。
4. 将 `headerToolbar` / `footerToolbar` 转成 `toolbar` / `footerToolbar`，并把动作类块归并到 `listActions`。
5. 将 `primaryField` 转成 `rowKey`。
6. 将 `columns-toggler`、`columnsTogglable` 提炼到 `columnSettings`。
7. 将 `loadDataOnce` 相关字段提炼到 `clientMode`。
8. 将 `quickSaveApi` / `quickSaveItemApi` 转成 action 形式。

## 11. 最小示例

```json
{
  "type": "crud",
  "rowKey": "id",
  "source": "${users}",
  "columns": [
    { "name": "name", "label": "姓名" },
    {
      "type": "operation",
      "label": "操作",
      "buttons": [
        { "type": "button", "label": "查看" }
      ]
    }
  ]
}
```

## 12. 关联示例

- `docs/components/crud/example.json`
- `docs/components/crud/migration-example.json`

## 13. 关联文档

- `docs/components/table/design.md`
- `docs/components/form/design.md`
- `docs/components/dialog/design.md`
- `docs/components/data-source/design.md`
- `docs/architecture/action-interaction-state.md`
