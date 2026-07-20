# Table 组件设计

## 1. 组件定位

- `table` 是结构化数据展示 renderer，用来渲染列定义、分页、选择和部分表格交互。
- 它是当前 runtime 中第一个明确采用 ownership 模型管理复杂交互状态的 data renderer。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。Flux 按 `existing-components-improvement-analysis.md` §0.2 原则裁决：命名对齐 shadcn/ui、请求下沉 data-source + action、前端不做导出、不学 amis 散落条件属性与皮肤枚举。逐项决定见下决策表。
- 当前已实现列定义、分页、选择、expandable、empty 区域和多类事件。
- 当前 table-heavy live baseline 还包括：left/right fixed columns、列显隐、scope-backed ordered columns、最小 move-up/move-down 排序、`columnSettings.overlay: false` 的 inline panel、以及基础 header search/filter controls。
- richer drag reorder、以及更完整的 header search/filter UX 仍在收敛阶段，文档需要优先强调现有 ownership 与 handle 基线，而不是过早承诺 AMIS 全量能力。
- `responsive.mode: 'expand'` 现已具备第一版 live baseline：在视口低于配置 `breakpoint` 时，table 保留 primary/fixed columns 于主行，把其余列移动到可展开的 detail row 中；它复用现有 expand-row 机制，而不是引入独立第二套 row detail owner。
- header search/filter 现已具备更稳定的第一版 live baseline：列头菜单支持 keyword search、option filter、active trigger state，以及按列清除当前 search/filter 的统一入口。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action、前端不做导出、不学 amis 散落条件属性与皮肤枚举（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                                                                  | 采纳                     | 不采纳     | 理由                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 列定义 / 分页 / 行选择（单页 checkbox/radio）                                                         | **实现**                 | —          | 当前基线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 左/右固定列（fixed columns）                                                                          | **实现**                 | —          | 当前基线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 可展开行（expandable detail row）                                                                     | **实现**                 | —          | 当前基线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 单列排序（sortable，single）                                                                          | **实现**                 | —          | 当前基线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 列头搜索/过滤（header search-filter + active trigger + clear）                                        | **实现**                 | —          | 当前基线（首版稳定）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 虚拟滚动（`virtualThreshold`）                                                                        | **实现**                 | —          | 当前基线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| quick edit（per-row save — 行级 draft + 操作列保存按钮）                                              | **实现**                 | —          | 当前基线：行级 `useRowQuickEditDraft` 共享 draft，每行一个保存按钮（操作列），替代 per-cell 保存按钮                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 列显隐 + 最小上下移动（`columnSettings` visibility/order，inline/dropdown）                           | **实现**                 | —          | 当前基线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 响应式列折叠（`responsive.mode: 'expand'`）                                                           | **实现**                 | —          | 当前基线（首版）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| empty slot / loading / stripe / bordered                                                              | **实现**                 | —          | 当前基线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 事件 + 句柄（onRow/Sort/Filter/Page/Selection/Refresh + component:refresh/getSelection/setSelection） | **实现**                 | —          | 当前基线                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 列宽拖拽 resize                                                                                       | **实现**                 | —          | amis 默认开，企业后台常规需求。表级 `columnResize` 总开关 + 列级 `resizable`/`minWidth`/`maxWidth`；本地状态（scope-level 持久化归 follow-up）。drag handle：`data-slot="table-column-resize-handle"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 表头吸顶 sticky header（`affixHeader`）                                                               | **实现**                 | —          | 长表常规需求。`affixHeader: true` 应用 `position: sticky; top: 0` 到 `<TableHeader>` 行；与 `scrollHeight`/虚拟滚动容器共存                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 聚合行 footer（`prefixRow`/`affixRow`）                                                               | **实现**                 | —          | `prefixRow` 在数据行前渲染；`affixRow` 渲染为 `<tfoot>` 复用 `TableFooter` UI 原语。`TableSummaryRow.cells[]` 按 column name 对齐，支持 `${expr}` 求值                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 单元格合并（`combineNum` / colSpan-rowSpan）                                                          | **实现**                 | —          | 分组报表常规需求。amis 语义：前 N 列连续相同值的行合并 rowSpan；被合并 cell 不渲染。virtual 开启时退化为不合并（已在 §4/§12 标注）。配套 `combineFromIndex?: number`（合并起始列，与 `combineNum` 同级，schema 暴露对齐 amis）。列级 `headerAlign`/`vAlign`/`classNameExpr`、表级 `showHeader` 均已 schema 暴露对齐 amis 配置面（typecheck）                                                                                                                                                                                                                                                                                                                                                      |
| 树表 / 嵌套子行                                                                                       | **实现**                 | —          | 当前 expandable 仅单层 detail；E1c 表级 `rowChildrenField` 触发树表模式（按该字段递归展开为带层级 flat 渲染列表）；tree toggle `data-slot="table-tree-toggle"`，行 `data-level` 缩进；不级联到 selection；与 expandable detail row 共存；与 virtual 共存时折叠分支不渲染（perf 归 §12 follow-up）                                                                                                                                                                                                                                                                                                                                                                                                 |
| 行拖拽排序（`draggable` + `orderField`）                                                              | **实现**                 | —          | 表级 `draggable: true` + `orderField`；行首渲染 drag handle `data-slot="table-row-drag-handle"`；拖拽结束按新顺序以 `orderField` 为 key 写回（scope/local），缺 orderField 按 Failure Path `e1c-drag-no-orderField` 退化；HTML5 DnD（pointer-based drag 兜底）；与 selection/树表/多级表头共存；树表时拖动顶层行（子树整体）                                                                                                                                                                                                                                                                                                                                                                      |
| 点击行切换选中（`rowSelection.toggleOnRowClick`）                                                     | **实现**                 | —          | amis `checkOnItemClick`；点击行（排除交互控件）切换 `rowSelection` 选中；`maxSelectionLength` 已满不触发；仅在实际 toggle 时 `preventDefault`（改进 amis）；自定义 `onRowClick` 链式追加；行 marker `data-row-toggleable="true"`（`cursor: pointer`）。CRUD 通过 `selection.toggleOnRowClick` 透传到底层 table                                                                                                                                                                                                                                                                                                                                                                                    |
| 多列排序                                                                                              | **实现**                 | —          | 当前严格单列；`multiSort: true` 启用累积（shift-click 亦可触发），sort state 升级为 `Array<{column,direction}>`，单列时仍为 `{column,direction}` baseline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 多级表头（嵌套表头分组）                                                                              | **实现**                 | —          | 复杂报表需求；列级 `children` 嵌套列定义，`<TableHeader>` 递归渲染分组行；body 行按叶子列渲染；resize 作用于 leaf 列；affixHeader sticky 覆盖所有分组行；与 fixed 列交叉的 pixel-perfect 对齐归 follow-up（§12）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| copyable 单元格                                                                                       | **实现**                 | —          | 列级 `copyable: true` 渲染复制按钮 `data-slot="table-cell-copy-button"`；`navigator.clipboard.writeText` 优先 + `document.execCommand('copy')` 回退 + 再失败静默 dev warn（Failure Path `e1c-copy-clipboard-denied`）；复制 = cell 渲染值文本表示                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| popOver 单元格                                                                                        | **实现（E3 successor）** | —          | 列级 `popOver: { trigger?, placement?, icon?, content?, title?, showOnOverflow?, onEmpty?, emptyText? }`（inline 对象），`content` 经 columns deepField 内部编译为 nestedRegion（key `columns.<i>.popOver.content` → `popOver.contentRegionKey`，params `['record','index']`，isolate）。触发图标 `data-slot="table-cell-popover-trigger"` + `@nop-chaos/ui` Popover（Base UI portal，复用 a11y/escape/outside-click）浮层 `data-slot="table-cell-popover-content"`。`trigger` 缺省 `'click'`（a11y/移动端友好），可选 `'hover'`；`placement` 缺省 `'top'`；`showOnOverflow` 缺省 `false`；`onEmpty: 'hide'\|'show'`（缺省 `'hide'`）。E1c 显式下调到本 successor（roadmap 未列 popOver），见 §12 |
| `showIndex` 自增索引列                                                                                | **暂不实现**             | —          | 可由数据/列定义派生                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 浮动 `itemActions`                                                                                    | **暂不实现**             | —          | 用 operation 列按钮表达                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `autoFillHeight`（容器填充内滚动）                                                                    | **实现**                 | —          | ResizeObserver 监听父容器，计算视口剩余高度填充（参照 amis Table2 算法，改进：visibility 重试用 rAF；`true` = 自动计算，`{ height: N }` = 固定高度，`{ maxHeight: N }` = 最大高度）。与 `affixHeader` 共存：容器内 sticky 表头而非禁用（改进 amis 互斥行为）。loading true→false 时重新测量                                                                                                                                                                                                                                                                                                                                                                                                       |
| `lazyRenderAfter`                                                                                     | **暂不实现**             | —          | 虚拟滚动已覆盖大表主场景                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 导出 Excel/CSV                                                                                        | —                        | **不采纳** | 后台职责，前端不做（analysis §5 / X3 §3）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| amis `rowClassNameExpr`                                                                               | —                        | **不采纳** | 用 Flux 样式系统 marker class 表达行视觉态（X3 §3 样式 amis 化）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| amis `tableLayout: 'fixed'\|'auto'`                                                                   | —                        | **不采纳** | 用样式系统控制，不开皮肤枚举（X3 §3 样式 amis 化）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## 3. Flux 中的 renderer/type 定义

- `type: 'table'`
- `category: 'data'`
- `sourcePackage: '@nop-chaos/flux-renderers-data'`
- 当前 fields: `empty` 为 `value-or-region`；`onRowClick`、`onSortChange`、`onFilterChange`、`onPageChange`、`onSelectionChange`、`onRefresh` 为 `event`

## 4. schema 设计

- 关键字段包括 `columns`、`pagination`、`rowSelection`、`expandable`、`empty`、`loading`、`data`、`rowData`。
- 当前已落地 `paginationOwnership`、`selectionOwnership`、`paginationStatePath`、`selectionStatePath`。
- `columnSettings` 当前 live 语义是：`enabled` 打开列管理入口，`toggledColumnsStatePath` / `orderedColumnsStatePath` 可接入 scope owner，`overlay: false` 时以内联面板渲染，未声明或非 `false` 时使用 dropdown overlay；`draggable` 仍未落地，不应误读为 live drag-sort。
- `responsive` 不再只是 schema surface：`mode: 'expand'` 已接通首版 more-columns baseline，`breakpoint` 控制激活阈值，`expandTrigger: 'row'` 可让整行打开 detail row。更完整的 responsive parity（例如 richer trigger/layout 策略）仍待后续收敛。
- E1b 列宽/聚合/合并字段：
  - 表级 `columnResize?: boolean`（总开关，缺省按列 `resizable` 推导：任一列 `resizable: true` 即开），`columnResize: false` 全表禁用 drag handle。
  - 列级 `resizable?: boolean`、`minWidth?: number`、`maxWidth?: number`：列宽 drag 约束，状态为组件 local（卸载丢失），scope-level 持久化归 follow-up。
  - 表级 `affixHeader?: boolean`：滚动容器（`scrollHeight` 或虚拟滚动容器）内 `position: sticky; top: 0` 表头吸顶。无滚动容器时无副作用。
  - 表级 `prefixRow?: TableSummaryRow`（顶部）+ `affixRow?: TableSummaryRow`（底部）：聚合行声明，`TableSummaryRow = { cells: Array<{ column: string; value: SchemaInput | string; align?: 'left'|'center'|'right' }> }`。cells 按 `column` name 对齐，缺失列渲染空 `<td>`。`prefixRow` 渲染在 `<thead>` 之后的 `<tbody>` 前部 summary 行（不与 `header` region 混用），`affixRow` 渲染为 `<tfoot>`（复用 `TableFooter` UI 原语），均位于 `<Table>` 内部、对齐列宽。聚合 value 支持 `${expr}` 透传到 row/table scope 求值，本表不做独立聚合引擎。
  - 表级 `combineNum?: number`：amis 语义，前 N 列做连续相同值行合并（rowSpan）；被合并的 cell 不重复渲染。combine 作用在数据行（`prefixRow`/`affixRow` 不参与合并）。combine + virtual 组合存在限制：rowSpan 跨越的行可能未渲染（虚拟化裁剪），故 virtual 开启时 combine 退化为 per-row 计算（不跨虚拟裁剪），design.md §12 标注。
- E1c 高级能力字段（已落地）：
  - 表级 `multiSort?: boolean`：多列排序总开关，缺省 false（严格单列，向后兼容）。详见 §7 sort ownership。
  - 表级 `draggable?: boolean` + `orderField?: string`：行拖拽排序。drag handle `data-slot="table-row-drag-handle"`；排序按 `orderField` 写回。详见 §7 行排序 ownership。
  - 表级 `rowChildrenField?: string`（默认 `children`）：树表模式，按该字段递归展开为带层级 flat 渲染列表。详见 §7 树表 ownership。
  - 表级 `childrenSource?: ActionSchema`：树表模式下的懒加载子节点来源。节点展开时若无同步子节点且声明了 `childrenSource`，dispatch 配置的 action（scope 含 `record`/`rowKey`）。结果缓存复用。详见 §7 树表 ownership。
  - 表级 `columnWidthsOwnership?: 'local' | 'controlled' | 'scope'` + `columnWidthsStatePath?: string`：列宽 scope-level 持久化（吸收 E1b deferred successor）。详见 §7 列宽 ownership。
  - 列级 `children?: TableColumnSchema[]`：多级表头嵌套列定义；叶子列 = 数据列。详见 §11 拆分。
  - 列级 `copyable?: boolean`：cell 旁渲染复制按钮 `data-slot="table-cell-copy-button"`。详见 §10 DOM marker。
  - 列级 `popOver?: TableCellPopOverConfig`（E3 successor）：cell 详情弹层。inline 对象形态，与 `expandable: {...}` / `rowSelection: {...}` 一致；底层 `@nop-chaos/ui` Popover（Base UI portal）。形态裁定（Phase 1 Decision A）：
    ```ts
    interface TableCellPopOverConfig {
      trigger?: 'click' | 'hover'; // 缺省 'click'（a11y/移动端）
      placement?:
        | 'top'
        | 'right'
        | 'bottom'
        | 'left'
        | 'top-start'
        | 'top-end'
        | 'bottom-start'
        | 'bottom-end'
        | 'left-start'
        | 'left-end'
        | 'right-start'
        | 'right-end'; // 缺省 'top'（对齐 Popover `side` 词表）
      icon?: string; // Lucide icon name，缺省 info 图标
      content?: BaseSchema[]; // schema 数组，编译期提取为 nestedRegion（与 cell/buttons 同形），由 `popOver.contentRegionKey` 引用
      title?: string; // 浮层标题，可选（`data-slot="table-cell-popover-title"`）
      showOnOverflow?: boolean; // 缺省 false（始终显示图标）；true = 仅文本截断（scrollWidth > clientWidth）时显示
      onEmpty?: 'hide' | 'show'; // 缺省 'hide'（row value 为 undefined/null/'' 时不渲染图标）
      emptyText?: string; // onEmpty:'show' 且 row value 空 时浮层显示的兜底文本
    }
    ```
    content 渲染裁定（Phase 1 Decision B）：采用 nestedRegion-under-columns 形态（与 `buttons`/`cell`/`body` 同形）。`popOver.content` 在 `data-renderer-definitions.ts` columns deepField normalize 阶段由 `normalizeTableColumns` 调 `extractNestedSchemaRegions` 提取为 region（key `columns.<i>.popOver.content`，params `['record','index']`，isolate:true），结果存于 `popOver.contentRegionKey`。live repo 无运行时编译 inline schema 先例，模式 A（renderer 内部编译）不可行。详见 §6 region 约定、§10 DOM marker、§12 风险。
- 目标设计中，table 若需要对外暴露自身的只读交互状态摘要，也应复用 `statusPath`，而不是发明第二套外部读取命名。
- `data` 的目标语义应与其他 scope-owning 节点保持一致：初始化 table shell own scope patch。
- `rowData` 的目标语义是显式声明每个 isolated row scope 还需要哪些额外字段投影，避免 `$parentScope` 一类隐式穿透。

## 5. 字段分类

- `columns` 支持普通静态数组和 `"${expr}"` 表达式字符串（动态列）。动态列在编译期跳过 deep-field 区域提取（`normalizeTableColumns` 遇非数组原样返回）。运行期求值结果必须是合法 `TableColumnSchema[]`；不合法时 fallback 到上次有效列 + dev warning。动态列的 label 和 cell 使用纯字符串显示（不编译为 region），不支持自定义 `cell`/`buttons`/`body` 区域。
- `pagination`、`rowSelection`、`expandable`、`data`、`rowData`: `value`
- `columnResize`、`affixHeader`、`prefixRow`、`affixRow`、`combineNum`：`value`（声明式 schema surface，非 region/event）
- `multiSort`、`draggable`、`orderField`、`rowChildrenField`、`childrenSource`、`columnWidthsOwnership`、`columnWidthsStatePath`：`value`（E1c 声明式 schema surface）
- `columns` 现支持 `"${expr}"` 表达式字符串：编译期检测为非数组时跳过 deep-field 区域提取；运行期求值，结果必须是合法 `TableColumnSchema[]`；不合法时保留上次有效列 + dev warning。参见 §4 动态列。
- 列级 `popOver`（含 `trigger`/`placement`/`icon`/`content`/`title`/`showOnOverflow`/`onEmpty`/`emptyText`）：`value`（E3 successor 声明式 schema surface；`content` 子字段在编译期提取为 nestedRegion，运行时通过 `popOver.contentRegionKey` 引用，参见 §6）
- `empty`: `value-or-region`
- 各类 `onXxx`: `event`

## 6. regions 与 slot 约定

- `empty` 是当前正式的 value-or-region slot。
- 列头、自定义单元格和扩展行内容通过 `labelRegionKey`、`cellRegionKey`、`expandedRowRegionKey` 走受控 region key 方案，而不是任意函数型 render prop。
- E3 popOver content region：列级 `popOver.content`（schema 数组）在编译期由 `normalizeTableColumns` 调 `extractNestedSchemaRegions` 提取为 region，key 形如 `columns.<i>.popOver.content`，params `['record','index']`，`isolate: true`。提取后 `popOver.content` 字段被删除，由 `popOver.contentRegionKey`（string）引用，与 `cellRegionKey`/`buttonsRegionKey` 同形。浮层渲染时调 `parentProps.regions[contentRegionKey].render({ scope: rowScope, bindings: { record, index } })`。try/catch 失败降级（Failure Path `popover-content-region-fail`，参考 select option-template 失败路径）→ 浮层显示 `String(rowValue)` + console.warn。

## 7. 运行期状态归属

- 当前明确支持 `paginationOwnership`、`selectionOwnership`、`sortOwnership`、`filterOwnership`，可取 `local`、`controlled`、`scope`。
- `sortStatePath` / `filterStatePath` 的 live DTO 已与 CRUD 摘要读取保持一致：sort 使用 `{ column, direction }`，filter 使用 `{ [column]: { filters?: string[]; keyword?: string } }`。
- `columnSettings.toggledColumnsStatePath` / `orderedColumnsStatePath` 现在也构成 table visible-columns / ordered-columns 的 scope owner 接入点；CRUD 等上层组合 renderer 应复用这些 path，而不是重新维护平行列状态。
- 对这些 scope-owned 列状态，显式空数组也是有效 owner 值：`[]` 表示当前没有可见列或没有保留的列顺序，不应再被 fallback defaults 覆盖。
- 展开是 table-local interaction state，按裁定 (b) 显式文档化为 local-only（detail 展开 + 树表展开均不收口到独立外部可写 owner path，无 `expandOwnership`/`expandStatePath`）。CRUD refresh 不再因 keyed remount 重置表格（见 AUDIT-02 compile-once 委托），故 local 展开态按 rowKey 在 source 重建后保持；若未来需要跨组件观察/写入展开态，属独立 successor（非当前 gap）。
- **E1b 列宽 resize 状态**：当前是 table-local interaction state（`useColumnResize` 在组件内维护 `Record<string, number>`，卸载即丢）。scope-level 持久化（`columnWidthsOwnership`/`columnWidthsStatePath`）随 E1c 一并收口（吸收 E1b deferred successor），`controlled` 经 `onWidthsChange` hook option 通道通知上层（只读上游 + G10 告警），见 §12 列宽 ownership。
- **E1c 多列 sort ownership**：`multiSort: true`（或 shift-click）时 sort state 从 `{column,direction}` 升级为 `Array<{column,direction}>`；scope 模式下写入数组；`sortOwnership: 'controlled'` 上层未提供时退化为单列本地推导（Failure Path `e1c-multi-sort-controlled-missing`）。事件 payload：单列模式 `sort` 为 `{column,direction}` 对象（向后兼容）；多列模式 `sort` 与 `sortEntries` 同为 `Array<{column,direction}>`。表头点击累积优先级序号徽标 `data-slot="table-sort-badge"`。
- **E1c 树表展开 ownership**：树表 children 行展开态为 table-local interaction state（与 expandable detail row 一致，裁定 (b) local-only，不级联到 selection，无 `expandOwnership`/`expandStatePath`）。
- **E1c 行排序 ownership**：行拖拽排序结果按 `orderField` 写回，优先通过 scope owner path（不在 table 内发请求）；缺 `orderField` 时按 Failure Path `e1c-drag-no-orderField` 退化。drag handle（`role="button"` + `tabIndex:0`）键盘可激活：ArrowUp/ArrowDown 沿与鼠标 drop 相同的 commit 路径重排（H6/WCAG 2.1 SC 4.1.2/2.1.1）；handle 的 `onClick` 调 `stopPropagation`，无移动 click 不冒泡到 `onRowClick`/`expandRowByClick`（H19/T8）。`scope` 误配（缺 `orderStatePath`）发 dev 告警（H12，镜像列宽 hook）。
- **E1c 列宽 scope-level 持久化**：`columnWidthsOwnership: 'scope'` + `columnWidthsStatePath` 时 resize 结果写 `Record<columnName, width>` 到 scope；拖动期间经 transient overlay 提供实时反馈，`pointerup` 持久化的是**拖到**的宽度（非拖动前），缺 path 时按 Failure Path `e1c-widths-scope-no-path` 退化为 local。`controlled` 为只读上游：resize handle 不在本地落宽，需经 `onWidthsChange` 通道（`useColumnResize` 的 hook option，镜像 `useRowDragSort.onReorder`）把变更通知上层；`controlled && !onWidthsChange` 时发 G10 式 dev 告警（与 drag-sort 同通道），handle 不静默假死。window pointer 监听器由 React 生命周期（unmount effect teardown）拥有，并监听 `pointercancel`，中途卸载/触屏滚动接管不泄漏监听器、不卡 `activeResizeRef`。
- 当前 header search/filter 已有可观察的基础行为：列头菜单可驱动 keyword/filter state 并影响本地数据处理；但 richer filter source/search UX、统一 ownership 收口和更完整回归证据仍属于后续 table-heavy parity。
- 当前 header search/filter 已有可观察且更稳定的行为：列头菜单可驱动 keyword/filter state、通过 active trigger 表达当前列已有筛选，并提供按列 clear action 一次性清理 keyword + option filters。更丰富的 filter source/search UX 与 ownership 收口仍属于后续 table-heavy parity。
- row-level `onRowClick` / `expandRowByClick` 现已具备与鼠标一致的 Enter/Space 键盘激活路径；交互行保持原生 table row 语义，不改写成 fake button role。
- table 的 `loading` 默认应视为上游 source/query owner 状态的 UI 投影，而不是 table 自己发明请求协议。
- 真正属于 table 自己的状态是 selection、pagination，以及未来的 sort/filter/inline-edit 等 interaction state。
- 当前 live baseline 下，sort/filter 与 visible-columns 已进入同一 interaction-owner 体系。
- quick-edit 当前 live baseline 已从 per-cell save 升级为 **per-row save** 范式：行级 `useRowQuickEditDraft` 管理整行 draft，所有 quickEdit 字段共享同一 `draftRecordRef`；操作列（`type: 'operation'`）自动渲染保存/取消按钮。保存触发 `quickSaveItemAction` 发整行 record。
- 覆盖 inline 与 dialog 双保存路径，保持 visible saving feedback：保存中禁用按钮 + spinner + saving text。
- `empty` 继续保持 `value-or-region` contract；上层 `crud` 传入 richer empty content 时，table live path 必须原样渲染该内容。
- 目标设计里，table subtree 若需要高频读取这些状态，可提供只读 `$table` 绑定；table 外部观察者仍应通过显式 `statusPath` 读取只读 summary DTO。
- table shell scope 默认继承 parent lexical scope；若声明 `data`，则在此基础上补充 table own patch。
- materialized row scopes 默认应保持 `isolate: true`。
- 如果 isolated row 仍需要少量 table/parent 数据，应通过 `rowData` 显式投影，而不是依赖 `$parentScope`。

### B3.1 裁定（行身份 / 数据收缩钳制 / 列路径 / 选择边界）

> 来源：`docs/plans/2026-06-26-0520-1-b31-table-row-identity-pagination-clamp-sort-selection-plan.md`。下列裁定与 live code 一致，非叙事。

- **T5 render-time 分页钳制（已落地，P0）**：table 在渲染期把用于切片（client `paginateTableData`）与对外暴露的 `currentPage` 钳制到 `[1, totalPages]`，`totalPages = max(1, ceil(resolvedSourceRows / pageSize))`。镜像 list renderer（`list-pagination.ts` 的 `currentPage = enabled ? clampPage(resolvedPage, totalPages) : 1`）。效果：删行 / 批量动作使总行数收缩到 `< (currentPage-1)*pageSize` 时，自动落到末页（非空），不卡空页。该钳制是纯渲染期派生（不回写 scope/local state），故 `$crud.pagination.currentPage` 等外部摘要仍读 owner 原值；server-side 的「钳制后页码进入下次请求」属请求 owner（data-source / action）职责，table 仅经组件句柄暴露钳制后的展示页。filter-path 的旧「强制 page 1」已收敛为同一钳制语义（`clampPage(currentPage, …)`），保持单一 clamp 语义。
- **T6 列路径 path-binder 裁定（裁定 A，已落地）**：sort comparator、cell 显示、header filter、combine 全部由 bracket access（`record[column.name]`）升级为 `getIn(record, column.name)` path binder，使 dotted/nested 列名（如 `metadata.updatedAt`）在 sort 与 display 共享同一解析路径。裁定依据 blast-radius 审计：in-repo/playground 无任何 **table 列** 依赖字面含点键（命中 `record.status` / `record.name` 均为 quick-edit dialog 内 form 字段名，非 table 列），故升级零回归。flat 列名行为不变（`getIn(record, 'name')` === `record.name`）。
  - **T2 边界（out-of-scope）**：字面含点 / 符号字段名（如字面键 `"a.b"`、`"hello-world"`）经 bracket-key 转义解析属独立设计面，T6 升级 `getIn` 后此类字面键会被当作 nested 路径解析（返回 undefined），归 B7（P2 backlog）。
- **T8 click dispatch 优先级（已落地，显式化）**：选择格、展开按钮、tree toggle、operation/drag cell、copyable、popOver、quick-edit 触发点均在自身 `onClick` 调 `event.stopPropagation()`，故 checkbox / popOver / copyable / quick-edit 点击不冒泡到行 `onRowClick`；纯 cell 点击才触发 `onRowClick` + `expandRowByClick`。键盘（Enter/Space）与鼠标一致。
- **T3 pageSize 不变量（已落地，显式化）**：`handlePageChange(page)` 写回时始终携带**当前** `pageSize`（local `setLocalCurrentPage(page)` 不触碰 pageSize；scope `update(path, { currentPage, pageSize })`），pageSize 独立解析、从不被默认值覆盖。翻页不会踩 pageSize。

### B3.3 裁定（树表 lazy-children / 聚合重对齐 / fixed+选择 / hover-focus 渲染 / 跨页选择）

> 来源：`docs/plans/2026-06-26-0830-1-b33-table-advanced-tree-aggregate-perf-plan.md`。下列裁定与 live code 一致，非叙事。

- **T11 树表 lazy-children（已实现，`childrenSource`）**：table 树模式现支持 per-node on-expand 懒加载（镜像 `input-tree`/`tree-select` 的 `childrenSource` 模式）。表级 `childrenSource?: ActionSchema` 声明懒加载动作；展开无同步子节点（`record[rowChildrenField]` 不存在）的树节点时，dispatch 该 action，scope 含 `record`/`rowKey`。结果缓存于 `LazyChildrenState` Map，后续展开复用。加载态显示 spinner（`animate-spin`），失败显示 error 图标 + tooltip。`useTableLazyChildren`（`use-table-lazy-children.ts`）管理 per-node 生命周期。`useTableTree` 接受 `lazyChildrenMap` 参数驱动 `flattenTreeRows` 整合懒加载子节点。后退：无 `childrenSource` 时行为不变（预加载 flatten）。验证：`table-t11-lazy-children.test.tsx`。
- **T18 summary 运行时切列重对齐（已落地，显式化）**：`TableSummaryRowView`（`table-summary-row.tsx`）遍历传入 `columns`（= `effectiveMainColumns`，经 `use-table-visible-columns.ts` 的 `tableColumns` `useMemo` 派生）。运行时 `toggleColumn` 触发可见列重算 → summary 响应式重对齐到当前可见叶列（隐藏列不再产生 spacer cell）。B3.3 T18 锚（`table-b33-advanced-boundary.test.tsx`）：列 A/B/C 中 B 运行时 toggle hidden → summary 由 3 cell（B 空）重对齐为 2 cell（A/C），无残留 B spacer。
- **T9 fixed-left + 选择列组合（已落地，显式化）**：`createFixedColumnLayout`（`fixed-columns.ts`）：有左固定数据列时，选择控制列前置 offset 0、宽 `CONTROL_COLUMN_WIDTH=40`、sticky `left:0`；首个左固定数据列 offset = 40（无 expand 列）或 80（expand+选择合成）。选择控制列 sticky 行为属当前基线：选择列 `data-slot="table-select-cell"` sticky `left:0`，其后左固定数据列 sticky `left:40px`（纯选择列变体）。B3.3 T9 锚（`table-b33-advanced-boundary.test.tsx`）：`rowSelection` + `fixed:'left'` 数据列（无 expand）→ 选择列 `left:0`、数据列 `left:40px`。多级表头 + fixed 列 pixel-perfect 对齐仍归 follow-up（见 §12）。
- **T29 hover/focus 行本地渲染契约（已落地，显式化）**：`DataRowView` 无 hover/focus state——交互样式纯 CSS（`table-body-row-rendering.tsx` 行 className `focus-visible:ring-2 …`，`data-interactive`/`data-striped` 静态属性），hover/focus 触发**零** React commit、零兄弟行重渲染。行级 `React.memo`（`table-body-row-rendering.tsx` `MemoizedDataRow`）+ 稳定 row-scope（`use-table-row-scope-cache.ts`）进一步保证父级重渲染时未变行不重渲染。B3.3 T29 锚（`table-b33-advanced-boundary.test.tsx`）：`<Profiler>` 计 commit，focus/mouseOver 中间行 cell → commit 计数不变（CSS-only）。**附带 Non-Blocking Follow-up**（非本信号）：`handleSelectRow` 的 `useCallback` 依赖 `selectedRowKeys`（`use-table-selection.ts`），选择变更使 `onSelectRow` identity 变 → 破坏所有行 memo → 选一行重渲染兄弟行。此为 selection-cascade 性能项，归 B7 perf backlog。
- **T10 `setSelection` 跨页 + `keepOnPageChange`（已落地，显式化）**：`component:setSelection` → `setSelectionExternal`（`use-table-selection.ts`）原样写 keys。`keepOnPageChange: true` 时跳过 render-time pruner → 跨页 key（如 page 2 的 `k99`）保留；`false`（默认）时按 `currentRowKeySet` prune → `k99` 剪除。B3.3 T10 锚（`table-b33-advanced-boundary.test.tsx`）：`setSelection(['k1','k99'])` + `keepOnPageChange:true` → `{k1,k99}`（count=2）；`false` → `{k1}`（k99 剪除）。`crud/design.md` §7.1 已文档化 `keepOnPageChange` 语义。**H21（已落地）**：`handleSelectAll` 在 `keepOnPageChange:true` 下对全量已知 key（hook 接收的 `treeFlattenedData` 全量数据集）校验存在性——已删除行的 phantom key 不再进入 selectAll 的 selection state / payload；真实跨页行（存在于数据集）在 check 时保留。锚：`table-selection-phantom-prune.test.tsx`。

### 选择 / 拖拽 / 点号 等价收敛（2026-06-27，plan `2026-06-27-1030-1-…`）

> 来源：`docs/plans/2026-06-27-1030-1-table-selection-drag-dotted-path-render-equivalence-convergence-plan.md`。下列为对既有契约（ownership 三态、T6 path-binder、T10 prune）的**完成性收口**，非语义改写。

- **selection 三通道等价（M-01 / G7，已落地）**：`handleSelectRow`/`handleSelectAll` 的 payload `baseSet` 统一取自 render-time pruner 干净化后的 `selectedRowKeys`，不再读脏的 `localSelectedRowKeys`。删行后再勾选存活行时，`onSelectionChange` payload 与 `api.selectedRowKeys` 展示值、内部 `localSelectedRowKeys` 三者一致——无幻影 key 回灌；且净化后 `selectedRowKeys` 引用跨渲染稳定（无逐渲染 Set 重分配风暴）。锚：`table-selection-invariants.test.tsx`（payload 无幻影 + 引用稳定）。`selectionOwnership` 三态语义不变。
- **tree 子行可选（G2，已落地）**：`table-renderer.tsx` 将 `useTableTree` 上提至 `useTableSelection` 之前，selection 的 `currentRowKeySet` / `handleSelectAll` / `allSelected` 遍历源改取扁平行集 `treeFlattenedData`（非顶层 `filteredData`）。展开父行后真实嵌套子行（经 `flattenTreeRows`）可勾选且持久；select-all 覆盖扁平可见行（含子行）。非树表为 no-op（`useTableTree` 原样回传输入）。selection 仍不级联（仅按渲染行逐 key 切换）。锚：`table-tree-selection-child-selectable.test.tsx`（经真实 schema renderer）。
- **响应式展开行点号列（M-04，已落地）**：`table-expanded-row.tsx` 响应式隐藏列值由 `record[column.name]` 升级为 `getIn(record, column.name)`，与 T6 cell-显示 path-binder 同源（`responsive.mode:'expand'` 窄屏隐藏列展开行现可解析 `user.address` 类点号列名）。锚：`table-dotted-column-paths.test.tsx`。
- **列等价 memo 覆盖 chrome 字段（G6，已落地）**：`areColumnsRenderEquivalent`（`table-flattened-items.ts`，`MemoizedDataRow` 闸门）在原 `name/type/width/fixed/*RegionKey/popOver` 之外新增 `quickEdit`/`quickEditBodyRegionKey`/`copyable`，使运行时仅切换这些字段的列 schema 变更能触发 cell chrome 重渲染。锚：`table-data-and-layout.test.tsx`。
- **controlled 拖拽可观测（G10，已落地）**：`use-row-drag-sort.ts` 在 `enabled && ownership==='controlled' && !onReorder` 时发 dev 告警（与缺 `orderField` 同通道），原先的静默空操作变为可观测；controlled 受控语义不变（不在本地持久落序，`onReorder?.()` 通知父端）。锚：`table-row-drag-sort-persist.test.tsx`。

## 8. 事件、动作与组件句柄能力

- 当前事件已覆盖行点击、排序、过滤、分页、选择和刷新。
- `onPageChange` 的 live payload 现已回到统一 supported 语义：若分页 UI 触发来自真实交互事件，则 handler 会收到原始 UI event，同时 `evaluationBindings` / semantic payload 始终包含 `type: 'table:page-change'` 与 `{ page, pageSize, pagination }` 摘要。
- `onSelectionChange`、`onSortChange`、`onFilterChange` 现在也遵循同一事件上下文模型：handler 会收到 semantic `event`、`scope` 和 `evaluationBindings`，其中 payload 分别稳定发布 `type: 'table:selection-change'`、`type: 'table:sort-change'`、`type: 'table:filter-change'`，避免只靠临时 scope 注入读取交互状态。
- 当前组件句柄基线是 `component:refresh`、`component:getSelection`、`component:setSelection`。
- quick-edit save contracts 是 action props，不是 event fields：`quickSaveAction` / `quickSaveItemAction` 由 quick-edit cell 直接 dispatch 到 row scope。
- `component:refresh` 触发的是 table instance capability；如果表格显示 loading，优先读取其上游 query/source owner 状态，而不是假设 table 自己就是请求 owner。

## 9. 数据源、表达式、导入能力接入点

- 表格数据应由上游 scope、loader 或 `data-source` 注入为最终 rows。
- 表格不负责请求协议本身，但可通过 `onRefresh` 与 source runtime 协作。
- `rowData` 若存在，推荐在“table shell lexical scope + 当前 row-local roots（如 `record`、`index`）”的上下文中求值，再写入 isolated row scope。
- `rowData` 的实现应由 row owner 一次求值并按 `rowKey` 缓存/增量同步；不要把它做成每个 cell 都重新求值的宽对象。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-table` marker。
- 表格视觉壳应复用 `@nop-chaos/ui` Table 体系；排序、选择和空态等状态通过稳定 marker 与 `data-*` 表达。
- E1c DOM marker（已落地）：
  - 行拖拽 handle：`data-slot="table-row-drag-handle"`（仅 `draggable: true` 时渲染于行首）。
  - copyable 单元格复制按钮：`data-slot="table-cell-copy-button"`（仅列级 `copyable: true` 时渲染于 cell 旁）。
  - 树表行层级：`data-level` 属性 + 缩进 class（非硬编码 px）。
- E3 popOver DOM marker（已落地）：
  - 触发图标：`data-slot="table-cell-popover-trigger"`（仅列级 `popOver` 声明且通过 `showOnOverflow` / `onEmpty` 门控时渲染于 cell 旁，与 `table-cell-copy-button` 相邻）。`aria-label` 默认「View details」（i18n key `flux.table.viewDetails`），键盘可达（Tab focus + Enter/Space，Popover 原生支持）。
  - 浮层内容：`data-slot="table-cell-popover-content"`（PopoverContent 根节点；Base UI portal 化，不在 row DOM 内）。Esc 关闭 / 外部点击关闭由 Popover 原生支持。
  - 浮层标题：`data-slot="table-cell-popover-title"`（`popOver.title` 声明时渲染于浮层顶部）。
  - 空态兜底：`data-slot="table-cell-popover-empty"`（`onEmpty: 'show'` 且 row value 空 时浮层渲染 `emptyText`）。

## 11. 实现拆分建议

- 列归一化、ownership 状态桥接、selection 句柄和分页 UI 拆分为独立模块。
- `table` renderer 本身更适合作为 orchestration shell：负责拼装列、行、slot、handle、responsive 分支和 `@nop-chaos/ui` Table 结构，而不是继续把分页、选择、排序、过滤、展开、列显隐再塞回一个巨型 view 文件。
- 对 `table` 这类复杂 renderer，首选拆分方向是 shared hooks / helpers，而不是再抽一个新的本地 headless controller：例如 `useTablePagination`、`useTableSelection`、`useTableSort`、`useTableFilter`、`useTableExpand`、`useTableVisibleColumns` 这类 capability 维度的 hook 更符合当前 owner 模型。
- 只有当某个局部子特性重新出现"同一文件混合 dirty/open/save/restore/keyboard/derived label + JSX"这类控件级行为复杂度时，才考虑局部 controller hook；不要把整个 `table` 重新包装成一个新的 renderer-local headless system。
- **quick-edit per-row draft**：`useRowQuickEditDraft`（`table-renderer/use-row-quick-edit-draft.ts`）是符合 owner 模型的 capability hook——管理整行 draft 状态，通过 `RowQuickEditDraftContext` 提供给 `TableQuickEditCell` 和 `RowQuickEditSaveBar`。
- 纯数据处理应继续优先放在 helper 层，例如行数据处理、固定列布局、responsive 列拆分和 repeated-template id 解析；如果 helper 已经足够解决复杂度，就不要再追加 hook 抽象。
- 如果未来需要进一步下沉复杂度，更可能正确的方向是 table family shared runtime/helper 收敛，而不是在 `table-renderer.tsx` 之上再发明第二层通用 controller 协议。
- 拆分判断应遵循 `docs/references/renderer-implementation-guidelines.md`：对 `table` 这类 orchestration renderer，优先保留薄 shell + shared hooks/helpers 的结构，不机械追求 local headless 化。
- **E1b capability 模块（已落地）**：
  - `useColumnResize`（`table-renderer/use-column-resize.ts`）：列宽 local 状态管理 + min/max clamp + pointer drag handler。能力维度 hook，符合 owner 模型。
  - `combine-cells`（`table-renderer/combine-cells.ts`）：纯 helper，按 amis `combineNum` 语义计算 rowSpan plan；virtual 开启时退化为 no-merge plan。
  - `table-summary-row`（`table-renderer/table-summary-row.tsx`：聚合行渲染组件，cells 按 column name 对齐，cell value 支持 `${expr}` 经 `helpers.evaluate` 求值。`prefixRow` 渲染为独立 `<TableBody>`（位于 thead 后、数据行前）；`affixRow` 渲染为 `<TableFooter>` 复用 UI 原语。
- **E1c capability 模块（已落地）**：
  - `use-table-tree`（`table-renderer/use-table-tree.ts`）：树表行模型，按 `rowChildrenField` 递归 flat 化、循环引用防护、层级缩进。
  - `use-row-drag-sort`（`table-renderer/use-row-drag-sort.ts`）：行拖拽排序，按 `orderField` 写回。
  - `copy-to-clipboard`（`table-renderer/copy-to-clipboard.ts`）：剪贴板 helper，`navigator.clipboard.writeText` 优先 + `document.execCommand('copy')` 回退。
  - 多级表头：`table-header-tree.ts` 提供 `extractLeafColumns`/`computeHeaderRows`/`hasNestedColumns` helper；`table-header-row.tsx` 在 `hasNestedColumns(columns)` 为 true 时切到 `NestedTableHeaderRows` 多行渲染（group cell `data-slot="table-head-group"` + colSpan=rowSpan 计算；leaf cell 复用 flat 渲染原语 + sort/filter/resize）；body 行按 `extractLeafColumns(columns)` 渲染；selection/expand 控制列 `rowSpan={groupDepth}` 跨所有表头行。

## 12. 风险、取舍与后续阶段

- 表格是复杂状态最容易失控的组件，需要持续坚持 ownership 模型。
- 列级渲染定制必须控制边界，避免引回任意 React 函数 slot。
- `columnSettings` 容易在"字段已声明"与"完整 parity 已完成"之间产生误读；当前只应把 visibility/order/inline-vs-overlay entry 当作 live baseline。
- `responsive` 已有首版窄屏列折叠/展开 UX，但仍不是完整 parity；后续应继续收敛 richer trigger/layout 细节，而不是把当前第一版 baseline 误写成终态。
- **E1b 列宽 resize + ownership**：列宽 resize 状态支持 `columnWidthsOwnership: 'local' | 'controlled' | 'scope'` + `columnWidthsStatePath`（E1c 收口 E1b deferred successor）。`scope` 时 resize 结果写 `columnWidthsStatePath`（`Record<columnName, width>`），重挂载恢复；缺 path 退化为 local（Failure Path `e1c-widths-scope-no-path`）；`controlled` 只读上游；`local`（默认）保持 E1b baseline（卸载即丢）。`columnResize` 总开关与列级 `resizable`/`minWidth`/`maxWidth` 是当前 live baseline，drag handle 使用 `data-slot="table-column-resize-handle"`。
- **E1b combineNum + virtual 共存限制**：`combineNum` 合并基于连续行相同值计算 rowSpan，被合并 cell 不重复渲染。虚拟滚动裁剪窗口外的行不会被渲染，跨窗口的 rowSpan 会断裂。因此 `virtualEnabled: true` 时 combinePlan 退化为不合并（每行独立 span=1），避免行高/jump 错乱；如需合并请关闭虚拟滚动（避免 `virtualThreshold` 触发）。design.md §4 已标注。
- **E1c 多列 sort + column resize 共存**：多列 sort state 与 resize widths 分属不同 ownership（sort vs columnWidths），无 schema surface 冲突；但多列 sort 与 `affixHeader`/虚拟滚动共存时需保证表头 sort 指示徽标在 sticky/virtual 容器内仍可见。
- **E1c 树表 + 虚拟滚动限制**：树表 + virtual 时裁剪可能跨折叠分支，首版保证正确性（折叠分支不渲染），perf 归 follow-up（Deferred But Adjudicated）。
- **E1c 树表 lazy-children 边界（DESIGN-ACK-NOT-IMPL，见 §7 B3.3 T11）**：树表当前仅消费预加载 `rowChildrenField` 子节点（递归 flatten + 本地展开 Set）；per-node lazy / on-expand fetch **未实现**，记为 candidate future（镜像 `input-tree` `childrenSource`，用户交互驱动 pattern #3，successor 归 B7 或独立 feature plan）。这是 feature 缺口非「已声称属性」，不阻塞当前边界债 closure。
- **E1c 多级表头 + fixed 列 pixel 边界**：多级表头 + `fixed: 'left'/'right'` 子列首版保证渲染正确，固定列与多级表头交叉的 pixel-perfect 对齐归 follow-up（Deferred But Adjudicated）。
- **E3 popOver 单元格（已实现）**：E1c 显式下调到本 successor 的「cell 详情弹层」能力已落地。形态：列级 `popOver: { trigger?, placement?, icon?, content?, title?, showOnOverflow?, onEmpty?, emptyText? }` inline 对象（裁定 A），底层 `@nop-chaos/ui` Popover（Base UI portal），`content` 经 columns deepField 内 nestedRegion 提取（裁定 B，与 `buttons`/`cell`/`body` 同形）。风险与共存点：
  - **虚拟滚动 portal 共存**：浮层由 Base UI Portal 渲染到 document.body，不在 row DOM 内。虚拟滚动裁剪 row 时，已打开浮层不受 row 卸载影响（portal 独立）；但 Base UI 在 trigger 卸载时会自动 unmount 浮层（与 Radix 行为对齐，Phase 1 抽查确认），故裁剪 trigger row 后浮层自动关闭，下次状态正确。
  - **fixed 列 z-index**：`fixed: 'left'/'right'` 列同时声明 `popOver` 时，浮层走 Base UI Portal（z-index 高于 fixed 列），浮层在 fixed 列之上可见。
  - **与 copyable icon 共存**：列同时声明 `copyable: true` 与 `popOver` 时，两触发图标在 cell 内相邻渲染（先 copy 后 popover），各自 marker 与 a11y label 独立，互不干扰。
  - **showOnOverflow 性能**：首版 `useLayoutEffect` 每次 resize/重绘判定 `scrollWidth > clientWidth`；虚拟滚动行数有限，预期可接受。大规模 table 性能问题归后续 follow-up。
  - **content-region-fail 降级**（Failure Path `popover-content-region-fail`）：region 渲染抛错时浮层降级为 `String(rowValue)` + console.warn（参考 select option-template 失败路径）。
  - **onEmpty 门控**（Failure Path `popover-on-empty-row-value`）：row value 为 `undefined`/`null`/`''` 时按 `popOver.onEmpty`（缺省 `'hide'`）门控：`'hide'` 不渲染触发图标，`'show'` 渲染图标 + 浮层显示 `emptyText`（或「No content」i18n 兜底）。
  - **showOnOverflow 首次渲染 false-negative**（Failure Path `popover-showonoverflow-false-negative`）：ref 首次挂载前判定为不显示，下次重绘/resize 再判定（useLayoutEffect 监听）。极少数情况下图标延迟出现，属可观测预期行为。
  - **Base UI portal 行为差异**：Base UI Popover portal 在 trigger row 卸载/裁剪时自动关闭浮层（与 Radix 行为对齐）；Phase 1 已抽查实际行为一致，无需补充显式 unmount 逻辑。
- **E1c copyable 单元格剪贴板降级**：`navigator.clipboard.writeText` 拒绝时回退 `document.execCommand('copy')`，再失败静默 + dev warn（Failure Path `e1c-copy-clipboard-denied`）。

## 13. 响应式行为

引用 `docs/architecture/mobile-responsive-baseline.md`（M0 基线 + M0.1 基础设施 §4.3 CardStack）。

| 断点              | 行为                                                                                                             | 实现方式                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 768px (mobile)  | 表格切到 `responsive.mode: 'expand'` 卡片堆叠布局：primary 列保留为表格行，其余列折叠为可展开的 card-like detail | `useIsBelowResponsiveBreakpoint()`（JS `window.innerWidth` + resize）+ `splitResponsiveColumns()` 切分 primary/hidden 列；hidden 列在 expand detail row 内以 `table-responsive-expanded-item` card 渲染 |
| ≥ 768px (desktop) | 完整表格列（行为不变）                                                                                           | hidden 列回退为空，`responsiveExpandActive = false`                                                                                                                                                     |

### M1b 评估结论（裁定 A）

M1b 评估现有 `responsive.mode: 'expand'` 在移动端的 card 布局：**裁定 (A) — 现有 expand 已满足移动端需求**，仅做视觉增强。理由：

- expand 模式已在 E1b/E1c 验证（`splitResponsiveColumns` 正确切分 primary/hidden 列，expand detail row 渲染 hidden 列为 label-value card）。
- mobile 不需要独立的 `responsive.mode: 'card'`（纯卡片堆叠，无表格行）——会引入更大 scope 且与现有 expand 语义重叠。`responsive.mode: 'card'` 记为 Non-Blocking Follow-up，待未来有明确场景再评估。

### M1b mobile 视觉增强（已落地）

- expand detail row 容器加 `nop-safe-bottom`（M0.1a）适配 notch；mobile 额外加 `p-2` padding（`sm:p-1` 收窄）。
- 每个 hidden 列 card（`table-responsive-expanded-item`）加 `nop-hairline nop-hairline--bottom`（M0.1b）做 0.5px 分隔线；mobile padding 提升到 `py-3`（`sm:py-2`）适配触摸目标（baseline §3）。
- 表格根节点发布 `data-responsive-expand="true"` marker（仅 mobile + `mode: 'expand'` 激活时），便于 e2e / 调试识别当前在 mobile card 布局。

### schema 字段

```typescript
interface TableResponsiveConfig {
  mode?: 'table' | 'expand'; // 默认 'table'；'expand' 启用窄屏列折叠
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | number; // 默认 'md' (768)
  expandTrigger?: 'button' | 'row'; // 默认 'button'；'row' 允许整行点击展开
  defaultExpanded?: boolean; // 默认 false；true 时 mobile 默认展开所有 detail row
}
```

### 触摸适配

- 触摸目标：expand/collapse 按钮复用 ui 默认尺寸；mobile card 内 label-value padding `py-3` 满足 baseline §3。
- 手势：expand 通过按钮点击或整行点击（`expandTrigger: 'row'`）；无 swipe 手势（表格行内容多样，swipe 易误触）。
- 软键盘：表格内通常无 input；quick-edit 场景归 E1c quickEdit 路径。
