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

| 能力                                                                                                  | 采纳                         | 不采纳     | 理由                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------- | ---------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 列定义 / 分页 / 行选择（单页 checkbox/radio）                                                         | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| 左/右固定列（fixed columns）                                                                          | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| 可展开行（expandable detail row）                                                                     | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| 单列排序（sortable，single）                                                                          | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| 列头搜索/过滤（header search-filter + active trigger + clear）                                        | **实现**                     | —          | 当前基线（首版稳定）                                                                                                                                                                                                                                                                                                         |
| 虚拟滚动（`virtualThreshold`）                                                                        | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| quick edit（inline / dialog 双保存路径 + saving feedback）                                            | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| 列显隐 + 最小上下移动（`columnSettings` visibility/order，inline/dropdown）                           | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| 响应式列折叠（`responsive.mode: 'expand'`）                                                           | **实现**                     | —          | 当前基线（首版）                                                                                                                                                                                                                                                                                                             |
| empty slot / loading / stripe / bordered                                                              | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| 事件 + 句柄（onRow/Sort/Filter/Page/Selection/Refresh + component:refresh/getSelection/setSelection） | **实现**                     | —          | 当前基线                                                                                                                                                                                                                                                                                                                     |
| 列宽拖拽 resize                                                                                       | **实现**                     | —          | amis 默认开，企业后台常规需求。表级 `columnResize` 总开关 + 列级 `resizable`/`minWidth`/`maxWidth`；本地状态（scope-level 持久化归 follow-up）。drag handle：`data-slot="table-column-resize-handle"`                                                                                                                        |
| 表头吸顶 sticky header（`affixHeader`）                                                               | **实现**                     | —          | 长表常规需求。`affixHeader: true` 应用 `position: sticky; top: 0` 到 `<TableHeader>` 行；与 `scrollHeight`/虚拟滚动容器共存                                                                                                                                                                                                  |
| 聚合行 footer（`prefixRow`/`affixRow`）                                                               | **实现**                     | —          | `prefixRow` 在数据行前渲染；`affixRow` 渲染为 `<tfoot>` 复用 `TableFooter` UI 原语。`TableSummaryRow.cells[]` 按 column name 对齐，支持 `${expr}` 求值                                                                                                                                                                       |
| 单元格合并（`combineNum` / colSpan-rowSpan）                                                          | **实现**                     | —          | 分组报表常规需求。amis 语义：前 N 列连续相同值的行合并 rowSpan；被合并 cell 不渲染。virtual 开启时退化为不合并（已在 §4/§12 标注）                                                                                                                                                                                           |
| 树表 / 嵌套子行                                                                                       | **实现**                     | —          | 当前 expandable 仅单层 detail；E1c 表级 `rowChildrenField` 触发树表模式（按该字段递归展开为带层级 flat 渲染列表）；tree toggle `data-slot="table-tree-toggle"`，行 `data-level` 缩进；不级联到 selection；与 expandable detail row 共存；与 virtual 共存时折叠分支不渲染（perf 归 §12 follow-up）                            |
| 行拖拽排序（`draggable` + `orderField`）                                                              | **实现**                     | —          | 表级 `draggable: true` + `orderField`；行首渲染 drag handle `data-slot="table-row-drag-handle"`；拖拽结束按新顺序以 `orderField` 为 key 写回（scope/local），缺 orderField 按 Failure Path `e1c-drag-no-orderField` 退化；HTML5 DnD（pointer-based drag 兜底）；与 selection/树表/多级表头共存；树表时拖动顶层行（子树整体） |
| 多列排序                                                                                              | **实现**                     | —          | 当前严格单列；`multiSort: true` 启用累积（shift-click 亦可触发），sort state 升级为 `Array<{column,direction}>`，单列时仍为 `{column,direction}` baseline                                                                                                                                                                    |
| 多级表头（嵌套表头分组）                                                                              | **实现**                     | —          | 复杂报表需求；列级 `children` 嵌套列定义，`<TableHeader>` 递归渲染分组行；body 行按叶子列渲染；resize 作用于 leaf 列；affixHeader sticky 覆盖所有分组行；与 fixed 列交叉的 pixel-perfect 对齐归 follow-up（§12）                                                                                                             |
| copyable 单元格                                                                                       | **实现**                     | —          | 列级 `copyable: true` 渲染复制按钮 `data-slot="table-cell-copy-button"`；`navigator.clipboard.writeText` 优先 + `document.execCommand('copy')` 回退 + 再失败静默 dev warn（Failure Path `e1c-copy-clipboard-denied`）；复制 = cell 渲染值文本表示                                                                            |
| popOver 单元格                                                                                        | **计划实现（E3/successor）** | —          | 单元格详情弹层；非 E1c 工作项（roadmap 未列），下调到后续 successor，见 §12                                                                                                                                                                                                                                                  |
| `showIndex` 自增索引列                                                                                | **暂不实现**                 | —          | 可由数据/列定义派生                                                                                                                                                                                                                                                                                                          |
| 浮动 `itemActions`                                                                                    | **暂不实现**                 | —          | 用 operation 列按钮表达                                                                                                                                                                                                                                                                                                      |
| `autoFillHeight`（容器填充内滚动）                                                                    | **暂不实现**                 | —          | 与上游 loading/ownership 耦合，后续按需                                                                                                                                                                                                                                                                                      |
| `lazyRenderAfter`                                                                                     | **暂不实现**                 | —          | 虚拟滚动已覆盖大表主场景                                                                                                                                                                                                                                                                                                     |
| 导出 Excel/CSV                                                                                        | —                            | **不采纳** | 后台职责，前端不做（analysis §5 / X3 §3）                                                                                                                                                                                                                                                                                    |
| amis `rowClassNameExpr`                                                                               | —                            | **不采纳** | 用 Flux 样式系统 marker class 表达行视觉态（X3 §3 样式 amis 化）                                                                                                                                                                                                                                                             |
| amis `tableLayout: 'fixed'\|'auto'`                                                                   | —                            | **不采纳** | 用样式系统控制，不开皮肤枚举（X3 §3 样式 amis 化）                                                                                                                                                                                                                                                                           |

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
  - 表级 `columnWidthsOwnership?: 'local' | 'controlled' | 'scope'` + `columnWidthsStatePath?: string`：列宽 scope-level 持久化（吸收 E1b deferred successor）。详见 §7 列宽 ownership。
  - 列级 `children?: TableColumnSchema[]`：多级表头嵌套列定义；叶子列 = 数据列。详见 §11 拆分。
  - 列级 `copyable?: boolean`：cell 旁渲染复制按钮 `data-slot="table-cell-copy-button"`。详见 §10 DOM marker。
- 目标设计中，table 若需要对外暴露自身的只读交互状态摘要，也应复用 `statusPath`，而不是发明第二套外部读取命名。
- `data` 的目标语义应与其他 scope-owning 节点保持一致：初始化 table shell own scope patch。
- `rowData` 的目标语义是显式声明每个 isolated row scope 还需要哪些额外字段投影，避免 `$parentScope` 一类隐式穿透。

## 5. 字段分类

- `columns`、`pagination`、`rowSelection`、`expandable`、`data`、`rowData`: `value`
- `columnResize`、`affixHeader`、`prefixRow`、`affixRow`、`combineNum`：`value`（声明式 schema surface，非 region/event）
- `multiSort`、`draggable`、`orderField`、`rowChildrenField`、`columnWidthsOwnership`、`columnWidthsStatePath`：`value`（E1c 声明式 schema surface）
- `empty`: `value-or-region`
- 各类 `onXxx`: `event`

## 6. regions 与 slot 约定

- `empty` 是当前正式的 value-or-region slot。
- 列头、自定义单元格和扩展行内容通过 `labelRegionKey`、`cellRegionKey`、`expandedRowRegionKey` 走受控 region key 方案，而不是任意函数型 render prop。

## 7. 运行期状态归属

- 当前明确支持 `paginationOwnership`、`selectionOwnership`、`sortOwnership`、`filterOwnership`，可取 `local`、`controlled`、`scope`。
- `sortStatePath` / `filterStatePath` 的 live DTO 已与 CRUD 摘要读取保持一致：sort 使用 `{ column, direction }`，filter 使用 `{ [column]: { filters?: string[]; keyword?: string } }`。
- `columnSettings.toggledColumnsStatePath` / `orderedColumnsStatePath` 现在也构成 table visible-columns / ordered-columns 的 scope owner 接入点；CRUD 等上层组合 renderer 应复用这些 path，而不是重新维护平行列状态。
- 对这些 scope-owned 列状态，显式空数组也是有效 owner 值：`[]` 表示当前没有可见列或没有保留的列顺序，不应再被 fallback defaults 覆盖。
- 展开仍是 table-local interaction state，尚未收口到独立外部可写 owner path。
- **E1b 列宽 resize 状态**：当前是 table-local interaction state（`useColumnResize` 在组件内维护 `Record<string, number>`，卸载即丢）。scope-level 持久化（`columnWidthsOwnership`/`columnWidthsStatePath`）随 E1c 一并收口（吸收 E1b deferred successor），见 §7 列宽 ownership。
- **E1c 多列 sort ownership**：`multiSort: true`（或 shift-click）时 sort state 从 `{column,direction}` 升级为 `Array<{column,direction}>`；scope 模式下写入数组；`sortOwnership: 'controlled'` 上层未提供时退化为单列本地推导（Failure Path `e1c-multi-sort-controlled-missing`）。事件 payload：单列模式 `sort` 为 `{column,direction}` 对象（向后兼容）；多列模式 `sort` 与 `sortEntries` 同为 `Array<{column,direction}>`。表头点击累积优先级序号徽标 `data-slot="table-sort-badge"`。
- **E1c 树表展开 ownership**：树表 children 行展开态为 table-local interaction state（与 expandable detail row 一致，不级联到 selection）。
- **E1c 行排序 ownership**：行拖拽排序结果按 `orderField` 写回，优先通过 scope owner path（不在 table 内发请求）；缺 `orderField` 时按 Failure Path `e1c-drag-no-orderField` 退化。
- **E1c 列宽 scope-level 持久化**：`columnWidthsOwnership: 'scope'` + `columnWidthsStatePath` 时 resize 结果写 `Record<columnName, width>` 到 scope；缺 path 时按 Failure Path `e1c-widths-scope-no-path` 退化为 local。
- 当前 header search/filter 已有可观察的基础行为：列头菜单可驱动 keyword/filter state 并影响本地数据处理；但 richer filter source/search UX、统一 ownership 收口和更完整回归证据仍属于后续 table-heavy parity。
- 当前 header search/filter 已有可观察且更稳定的行为：列头菜单可驱动 keyword/filter state、通过 active trigger 表达当前列已有筛选，并提供按列 clear action 一次性清理 keyword + option filters。更丰富的 filter source/search UX 与 ownership 收口仍属于后续 table-heavy parity。
- row-level `onRowClick` / `expandRowByClick` 现已具备与鼠标一致的 Enter/Space 键盘激活路径；交互行保持原生 table row 语义，不改写成 fake button role。
- table 的 `loading` 默认应视为上游 source/query owner 状态的 UI 投影，而不是 table 自己发明请求协议。
- 真正属于 table 自己的状态是 selection、pagination，以及未来的 sort/filter/inline-edit 等 interaction state。
- 当前 live baseline 下，sort/filter 与 visible-columns 已进入同一 interaction-owner 体系，只是 expand/inline-edit 仍未完全收口。
- quick-edit 当前 live baseline 已覆盖 inline 与 dialog 两条保存路径的 visible saving feedback：保存中既会禁用重复提交，也会显示 spinner + saving text，而不是只通过 disabled 态暗示 pending。
- `empty` 继续保持 `value-or-region` contract；上层 `crud` 传入 richer empty content 时，table live path 必须原样渲染该内容。
- 目标设计里，table subtree 若需要高频读取这些状态，可提供只读 `$table` 绑定；table 外部观察者仍应通过显式 `statusPath` 读取只读 summary DTO。
- table shell scope 默认继承 parent lexical scope；若声明 `data`，则在此基础上补充 table own patch。
- materialized row scopes 默认应保持 `isolate: true`。
- 如果 isolated row 仍需要少量 table/parent 数据，应通过 `rowData` 显式投影，而不是依赖 `$parentScope`。

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

## 11. 实现拆分建议

- 列归一化、ownership 状态桥接、selection 句柄和分页 UI 拆分为独立模块。
- `table` renderer 本身更适合作为 orchestration shell：负责拼装列、行、slot、handle、responsive 分支和 `@nop-chaos/ui` Table 结构，而不是继续把分页、选择、排序、过滤、展开、列显隐再塞回一个巨型 view 文件。
- 对 `table` 这类复杂 renderer，首选拆分方向是 shared hooks / helpers，而不是再抽一个新的本地 headless controller：例如 `useTablePagination`、`useTableSelection`、`useTableSort`、`useTableFilter`、`useTableExpand`、`useTableVisibleColumns` 这类 capability 维度的 hook 更符合当前 owner 模型。
- 只有当某个局部子特性重新出现"同一文件混合 dirty/open/save/restore/keyboard/derived label + JSX"这类控件级行为复杂度时，才考虑局部 controller hook；不要把整个 `table` 重新包装成一个新的 renderer-local headless system。
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
- **E1c 多级表头 + fixed 列 pixel 边界**：多级表头 + `fixed: 'left'/'right'` 子列首版保证渲染正确，固定列与多级表头交叉的 pixel-perfect 对齐归 follow-up（Deferred But Adjudicated）。
- **E1c popOver 单元格**：非 E1c 工作项（roadmap 未列），已下调到 E3 P2 / successor；本 baseline 不实现。
- **E1c copyable 单元格剪贴板降级**：`navigator.clipboard.writeText` 拒绝时回退 `document.execCommand('copy')`，再失败静默 + dev warn（Failure Path `e1c-copy-clipboard-denied`）。
