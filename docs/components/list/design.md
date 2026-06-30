# List 组件设计

## 1. 组件定位

- `list` 是顺序型集合展示 renderer，用来渲染一组同构条目。
- `list` 是 **有 UI 的 collection renderer**：它有自己的视觉壳、空态与条目容器语义。
- 它不是纯结构节点；纯结构展开应使用 `loop`。

## 2. 与 AMIS 或既有产品的能力对照

- `list` 已落地于 `@nop-chaos/flux-renderers-data`，注册为 `runtime`。
- 渲染静态/已装配好的 `items`；分页与触底加载更多（infinite）作为 opt-in 能力内建（不预置请求协议，见 §9 请求下沉约束）。
- 内部实现复用与 `loop` 相同的 repeated-instance substrate，但外部 schema 契约仍保持 `list` 自己的视觉/容器语义。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'list'`
- 预期归属 `@nop-chaos/flux-renderers-data`

## 4. schema 设计

- 集合字段为 `items`、`item`、`empty`、`selectionMode`、`keyField`。
- `items` 是唯一正式集合字段。
- 分页/触底加载相关字段：`pagination`（配置对象）、`paginationOwnership`、`paginationStatePath`、`pageSizeStatePath`、`onPageChange`、`onLoadMore`（命名与同包 `crud` 对齐）。
- `list` 不需要重复暴露 `itemName` / `indexName` 这类结构字段；如果确有需要，应优先评估是否直接使用 `loop` + `container`/`card` 组合更自然。

## 5. 字段分类

- `items`: `value` 或 source-enabled value
- `item`: `region`
- `empty`: `value-or-region`
- `pagination`: `prop`（配置对象：`{ enabled, mode: 'page' | 'infinite', pageSize, pageSizeOptions, currentPage, total, hasMore, showSizeChanger }`）
- `paginationOwnership`: `prop`（`local` | `controlled` | `scope`，默认 `local`）
- `paginationStatePath` / `pageSizeStatePath`: `prop`（scope 归属下的 scope 路径）
- `onPageChange` / `onLoadMore`: `event`

## 6. regions 与 slot 约定

- `item` 是单个条目的模板 region。
- `empty` 是空态区。

## 7. 运行期状态归属

- `paginationOwnership` 三态（与 `crud`/`table` 既有 value-ownership 模式对齐）：
  - `local`（默认）：`list` 在组件内持有 `currentPage`（由 `pagination.currentPage` 播种），自行切片；经能力句柄（`gotoPage`）或触底加载改变页码时派发 `onPageChange`。
  - `controlled`：纯视图，`currentPage`/`pageSize` 完全由 `pagination.currentPage`/`pagination.pageSize` prop 驱动，`list` 不持有也不写回。
  - `scope`：`currentPage`/`pageSize` 从 `paginationStatePath`（可选 `pageSizeStatePath` 拆分 pageSize 通道）读取；`list` 自身改变页码时写回 scope。当 `paginationOwnership=scope` 但路径缺失/无值时，显式降级（按 `pagination.currentPage` 播种继续渲染）并 dev 告警，不静默崩溃。
- `currentPage` 始终 clamp 到 `[1, totalPages]`；`totalPages = ceil(total / pageSize)`（`total` 缺省时按 `items.length` 推导）。
- 选择态仍为 local controlled（`selectionMode`）；如需 scope 持久化属后续 watch-only 增强。
- `list` 即使内部复用 repeated-item instantiation，也不应把自己降格成无 UI 的结构节点；视觉壳、item 容器和空态仍属于 `list` renderer 自己。

## 8. 事件、动作与组件句柄能力

- 最小事件：`onItemClick`、`onSelectionChange`、`onPageChange`（页码变化通知，payload `{ currentPage, pageSize, totalPages, total }`）、`onLoadMore`（触底加载更多，payload `{ currentPage, pageSize, total }`）。
- 组件能力句柄：`gotoPage(page)`（改变并 clamp 页码，返回分页快照）、`getPagination()`（返回当前 `{ currentPage, pageSize, totalPages, total }`）。
- `list` 不内建分页 UI 控件（页码按钮归独立 `pagination` renderer / 宿主）；`list` 只切片展示 + 派发事件。

## 9. 数据源、表达式、导入能力接入点

- `items` 应优先接最终条目数组。
- 原始业务数据到条目视图模型的映射应尽量在 loader 完成。
- **请求下沉约束（硬约束）**：`list` 零组件级请求字段——不声明 `api`/`source`/`initFetch`/`action` 等挂载触发字段。数据加载经事件（`onLoadMore`/`onPageChange`）→ 宿主 action graph → `<data-source>` → scope `items`，`list` 只切片/展示，不自发请求。
- infinite 模式（`pagination.mode:'infinite'` + `pagination.enabled:true`）：复用同包 `useInfiniteScroll` hook 渲染触底 sentinel（`data-slot="list-infinite-sentinel"`，命名对齐 crud `crud-infinite-sentinel`）+ IntersectionObserver；触底派发 `onLoadMore`（`list` 不自发请求），由宿主推进页码并把更多条目写入 scope `items`，`list` 累计展示 `currentPage * pageSize` 条。`hasMore===false` 或 `currentPage >= totalPages` 时隐藏/禁用 sentinel。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-list` marker。
- infinite sentinel：`data-slot="list-infinite-sentinel"`；状态区 `data-slot="list-infinite-status"`（命名对齐 crud infinite marker 风格）。

## 11. 实现拆分建议

- 集合迭代、item region 渲染和空态处理分开实现。

## 12. 风险、取舍与后续阶段

- 最主要风险是再次引入“列表 + 私有模板协议”的双轨模型，需要坚持单一 `items` 字段原则。
- 第二个风险是把 `list` 与 `loop` 混成一类：`loop` 负责无 UI 的结构展开，`list` 负责有 UI 的集合展示，二者不应互相吞并。

## 13. 响应式行为

> 实现落地于「新落地 renderer 响应式 successor」plan（`docs/plans/2026-06-24-2358-1-newly-landed-renderer-responsive-followups-plan.md`）。引用 M0 移动端基线（`docs/architecture/mobile-responsive-baseline.md`，断点 768px）与 M0.1 hairline 工具（`nop-hairline`，baseline §10.2）。

- **分隔线迁移（M0.1 successor）**：根节点 `divide-y divide-border`（1px border 分隔）已迁移到逐项 `nop-hairline nop-hairline--bottom`（M0.1b `::after` 伪元素 + transform scale 0.5px 高 DPI 细线）。最后一个条目不输出底边（与 `divide-y` 的「条目之间」语义等价）。根节点保留外层 `rounded-md border border-border` 圆角边框。颜色经 `--nop-hairline-color`（默认 `hsl(var(--border))`）主题化，桌面/移动一致。
- **小屏触摸滚动**：`list` 消费 `useIsMobile()`（阈值 768px）。小屏（< 768px）下：
  - 根容器补 `touch-pan-y`（Tailwind，`touch-action: pan-y`），保证纵向触摸滚动流畅；
  - 条目纵向 padding 从桌面 `py-2` 提升到 `py-3`，增强触摸目标高度。
  - 桌面（≥ 768px）维持 `py-2`、无 `touch-pan-y`（视觉与交互零回归）。
- **marker**：根节点 `.nop-list`（含空态根）在小屏增 `data-responsive="narrow"`（桌面缺省不输出，与 crud/chart/table 范式对齐）。
- **小屏单列**：`list` 本身就是单列堆叠，M4b「小屏单列」诉求天然满足；本节只补触摸滚动体验 + hairline 迁移 + 响应式 marker，不改变集合/分页/选择核心逻辑（§7–§9 不动）。
- **schema 透明**：无新 schema 字段、无 `mobileUI` 标志位、无 `*-mobile` 组件。移动分支完全在 renderer 内部由 `useIsMobile()` 决定。
