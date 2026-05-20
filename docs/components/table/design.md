# Table 组件设计

## 1. 组件定位

- `table` 是结构化数据展示 renderer，用来渲染列定义、分页、选择和部分表格交互。
- 它是当前 runtime 中第一个明确采用 ownership 模型管理复杂交互状态的 data renderer。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现列定义、分页、选择、expandable、empty 区域和多类事件。
- 当前 table-heavy live baseline 还包括：left/right fixed columns、列显隐、scope-backed ordered columns、最小 move-up/move-down 排序、`columnSettings.overlay: false` 的 inline panel、以及基础 header search/filter controls。
- richer drag reorder、以及更完整的 header search/filter UX 仍在收敛阶段，文档需要优先强调现有 ownership 与 handle 基线，而不是过早承诺 AMIS 全量能力。
- `responsive.mode: 'expand'` 现已具备第一版 live baseline：在视口低于配置 `breakpoint` 时，table 保留 primary/fixed columns 于主行，把其余列移动到可展开的 detail row 中；它复用现有 expand-row 机制，而不是引入独立第二套 row detail owner。
- header search/filter 现已具备更稳定的第一版 live baseline：列头菜单支持 keyword search、option filter、active trigger state，以及按列清除当前 search/filter 的统一入口。

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
- 目标设计中，table 若需要对外暴露自身的只读交互状态摘要，也应复用 `statusPath`，而不是发明第二套外部读取命名。
- `data` 的目标语义应与其他 scope-owning 节点保持一致：初始化 table shell own scope patch。
- `rowData` 的目标语义是显式声明每个 isolated row scope 还需要哪些额外字段投影，避免 `$parentScope` 一类隐式穿透。

## 5. 字段分类

- `columns`、`pagination`、`rowSelection`、`expandable`、`data`、`rowData`: `value`
- `empty`: `value-or-region`
- 各类 `onXxx`: `event`

## 6. regions 与 slot 约定

- `empty` 是当前正式的 value-or-region slot。
- 列头、自定义单元格和扩展行内容通过 `labelRegionKey`、`cellRegionKey`、`expandedRowRegionKey` 走受控 region key 方案，而不是任意函数型 render prop。

## 7. 运行期状态归属

- 当前明确支持 `paginationOwnership`、`selectionOwnership`、`sortOwnership`、`filterOwnership`，可取 `local`、`controlled`、`scope`。
- `columnSettings.toggledColumnsStatePath` / `orderedColumnsStatePath` 现在也构成 table visible-columns / ordered-columns 的 scope owner 接入点；CRUD 等上层组合 renderer 应复用这些 path，而不是重新维护平行列状态。
- 对这些 scope-owned 列状态，显式空数组也是有效 owner 值：`[]` 表示当前没有可见列或没有保留的列顺序，不应再被 fallback defaults 覆盖。
- 展开仍是 table-local interaction state，尚未收口到独立外部可写 owner path。
- 当前 header search/filter 已有可观察的基础行为：列头菜单可驱动 keyword/filter state 并影响本地数据处理；但 richer filter source/search UX、统一 ownership 收口和更完整回归证据仍属于后续 table-heavy parity。
- 当前 header search/filter 已有可观察且更稳定的行为：列头菜单可驱动 keyword/filter state、通过 active trigger 表达当前列已有筛选，并提供按列 clear action 一次性清理 keyword + option filters。更丰富的 filter source/search UX 与 ownership 收口仍属于后续 table-heavy parity。
- table 的 `loading` 默认应视为上游 source/query owner 状态的 UI 投影，而不是 table 自己发明请求协议。
- 真正属于 table 自己的状态是 selection、pagination，以及未来的 sort/filter/inline-edit 等 interaction state。
- 当前 live baseline 下，sort/filter 与 visible-columns 已进入同一 interaction-owner 体系，只是 expand/inline-edit 仍未完全收口。
- 目标设计里，table subtree 若需要高频读取这些状态，可提供只读 `$table` 绑定；table 外部观察者仍应通过显式 `statusPath` 读取只读 summary DTO。
- table shell scope 默认继承 parent lexical scope；若声明 `data`，则在此基础上补充 table own patch。
- materialized row scopes 默认应保持 `isolate: true`。
- 如果 isolated row 仍需要少量 table/parent 数据，应通过 `rowData` 显式投影，而不是依赖 `$parentScope`。

## 8. 事件、动作与组件句柄能力

- 当前事件已覆盖行点击、排序、过滤、分页、选择和刷新。
- `onPageChange` 的 live payload 现已回到统一 supported 语义：若分页 UI 触发来自真实交互事件，则 handler 会收到原始 UI event，同时 `evaluationBindings` / semantic payload 始终包含 `type: 'table:page-change'` 与 `{ page, pageSize, pagination }` 摘要。
- 当前组件句柄基线是 `component:refresh`、`component:getSelection`、`component:setSelection`。
- `component:refresh` 触发的是 table instance capability；如果表格显示 loading，优先读取其上游 query/source owner 状态，而不是假设 table 自己就是请求 owner。

## 9. 数据源、表达式、导入能力接入点

- 表格数据应由上游 scope、loader 或 `data-source` 注入为最终 rows。
- 表格不负责请求协议本身，但可通过 `onRefresh` 与 source runtime 协作。
- `rowData` 若存在，推荐在“table shell lexical scope + 当前 row-local roots（如 `record`、`index`）”的上下文中求值，再写入 isolated row scope。
- `rowData` 的实现应由 row owner 一次求值并按 `rowKey` 缓存/增量同步；不要把它做成每个 cell 都重新求值的宽对象。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-table` marker。
- 表格视觉壳应复用 `@nop-chaos/ui` Table 体系；排序、选择和空态等状态通过稳定 marker 与 `data-*` 表达。

## 11. 实现拆分建议

- 列归一化、ownership 状态桥接、selection 句柄和分页 UI 拆分为独立模块。
- `table` renderer 本身更适合作为 orchestration shell：负责拼装列、行、slot、handle、responsive 分支和 `@nop-chaos/ui` Table 结构，而不是继续把分页、选择、排序、过滤、展开、列显隐再塞回一个巨型 view 文件。
- 对 `table` 这类复杂 renderer，首选拆分方向是 shared hooks / helpers，而不是再抽一个新的本地 headless controller：例如 `useTablePagination`、`useTableSelection`、`useTableSort`、`useTableFilter`、`useTableExpand`、`useTableVisibleColumns` 这类 capability 维度的 hook 更符合当前 owner 模型。
- 只有当某个局部子特性重新出现“同一文件混合 dirty/open/save/restore/keyboard/derived label + JSX”这类控件级行为复杂度时，才考虑局部 controller hook；不要把整个 `table` 重新包装成一个新的 renderer-local headless system。
- 纯数据处理应继续优先放在 helper 层，例如行数据处理、固定列布局、responsive 列拆分和 repeated-template id 解析；如果 helper 已经足够解决复杂度，就不要再追加 hook 抽象。
- 如果未来需要进一步下沉复杂度，更可能正确的方向是 table family shared runtime/helper 收敛，而不是在 `table-renderer.tsx` 之上再发明第二层通用 controller 协议。
- 拆分判断应遵循 `docs/references/renderer-implementation-guidelines.md`：对 `table` 这类 orchestration renderer，优先保留薄 shell + shared hooks/helpers 的结构，不机械追求 local headless 化。

## 12. 风险、取舍与后续阶段

- 表格是复杂状态最容易失控的组件，需要持续坚持 ownership 模型。
- 列级渲染定制必须控制边界，避免引回任意 React 函数 slot。
- `columnSettings` 容易在“字段已声明”与“完整 parity 已完成”之间产生误读；当前只应把 visibility/order/inline-vs-overlay entry 当作 live baseline。
- `responsive` 已有首版窄屏列折叠/展开 UX，但仍不是完整 parity；后续应继续收敛 richer trigger/layout 细节，而不是把当前第一版 baseline 误写成终态。
