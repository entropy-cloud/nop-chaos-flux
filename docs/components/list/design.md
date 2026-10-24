# List 组件设计

## 1. 组件定位

- `list` 是顺序型集合展示 renderer，用来渲染一组同构条目。
- `list` 是 **有 UI 的 collection renderer**：它有自己的视觉壳、空态与条目容器语义。
- 它不是纯结构节点；纯结构展开应使用 `loop`。

## 2. 与 AMIS 或既有产品的能力对照

- `list` 已落地于 `@nop-chaos/flux-renderers-data`，注册为 `runtime`。
- 渲染静态/已装配好的 `items`；分页与触底加载更多（infinite）作为 opt-in 能力内建（不预置请求协议，见 §9 请求下沉约束）。
- 内部实现复用与 `loop` 相同的 repeated-instance substrate，但外部 schema 契约仍保持 `list` 自己的视觉/容器语义。
- **拖拽重排（arc-component-gap G6，2026-10-24）**：条目拖拽重排能力。**落点裁决：能力扩展，不新增 type**——决策表：

| 候选                                                              | 裁决     | 理由                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) `list` 能力扩展 `reorderable` + `onReorder`                   | **采纳** | list 已是"有 UI 的 collection renderer"，条目容器/handle 挂点天然存在；**复用的是 `use-row-drag-sort.ts` 的 DnD 约定**（HTML5 DnD + 键盘 + handle 交互模式），非直接 import——底座与 table 耦合（TableRowEntry 类型、`table-row-drag-handle` slot、ownership 写回通道），G6I 抽取通用逻辑或按约定平行实现，零新依赖；独立 type 仅差异在"可重排"，无独立契约边界 |
| (b) 独立 type `reorderable-list`（对齐 Arc ReorderableList 命名） | 拒绝     | type 增殖需 matrix human gate；与 list 契约 90% 重合（items/item/empty/分页/选择全部共享）；跨容器排序需求出现时再评估独立 type（当前无场景）                                                                                                                                                                                                                  |

- 命名裁定：roadmap 暂定名 `reorderMode` 改为 **`reorderable?: boolean`**（直接语义肯定式 boolean，与 `showStrength`/`clearable`/`split` 三先例同族；`reorderMode` 暗示多模式枚举，首版仅 handle 拖拽一种交互，无需模式轴）。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'list'`
- 预期归属 `@nop-chaos/flux-renderers-data`

## 4. schema 设计

- 集合字段为 `items`、`item`、`empty`、`selectionMode`、`keyField`。
- `items` 是唯一正式集合字段。
- 分页/触底加载相关字段：`pagination`（配置对象）、`paginationOwnership`、`paginationStatePath`、`pageSizeStatePath`、`onPageChange`、`onLoadMore`（命名与同包 `crud` 对齐）。
- `list` 不需要重复暴露 `itemName` / `indexName` 这类结构字段；如果确有需要，应优先评估是否直接使用 `loop` + `container`/`card` 组合更自然。
- **重排字段（G6 新增）**：

```typescript
interface ListSchema {
  // …既有字段…
  /** 拖拽重排开关（默认 false 零变化）：true 时每个条目渲染拖拽 handle，拖放后派发 onReorder */
  reorderable?: boolean;
}
```

- 无 `orderField`/`statePath`/`ownership`——`list` 是展示型 collection（数据归 scope），重排结果经 `onReorder` 事件交宿主写回（§9 请求下沉约束同构：list 不自写数据）。与 `table` 行拖拽的 ownership/statePath 通道差异系数据归属不同（table 行归表单/表格 owner，list 条目归外部 scope）。
- **前置门控（G6D 裁决）**：`reorderable: true` 要求——(1) **稳定 key**：条目键经 `keyField` 稳定可辨；keyField 缺失导致回退 `item:${index}` 索引键时**重排禁用 + dev 告警**（索引键随重排漂移，payload keys 语义失效）；(2) **非 page 分页**：`pagination.enabled && mode==='page'` 时重排禁用 + dev 告警（切片写回会静默覆盖其余页数据）；(3) **非 windowing**：虚拟窗口启用时重排禁用 + dev 告警（HTML5 DnD 跨窗口边缘行为不可靠）。三种门控降级均为整体禁用 handle 输出，零部分可用态。

## 5. 字段分类

- `items`: `value` 或 source-enabled value
- `item`: `region`
- `empty`: `value-or-region`
- `pagination`: `prop`（配置对象：`{ enabled, mode: 'page' | 'infinite', pageSize, pageSizeOptions, currentPage, total, hasMore, showSizeChanger }`）。现状注记（R2-2b 复核 D-3，2026-09-24）：page 模式**不内建分页 UI**（设计裁定见本文 §分页，页码归独立 pagination renderer/宿主）；`showSizeChanger` 当前**零消费**（死配置，schema 无诊断），与 infinite 模式有内建 footer 不对称。
- `paginationOwnership`: `prop`（`local` | `controlled` | `scope`，默认 `local`）
- `paginationStatePath` / `pageSizeStatePath`: `prop`（scope 归属下的 scope 路径）
- `onPageChange` / `onLoadMore`: `event`
- `reorderable`: `prop`（boolean，默认 false）；`onReorder`: `event`（G6）

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
- **`onReorder`（G6）**：拖放落地后派发一次，payload `{ type: 'list:reorder', items: nextItems, keys: nextKeys }`（nextItems 为**当前渲染集合**重排后的条目数组——前置门控保证渲染集合即完整数据集或累计集，可整体写回；nextKeys 为对应稳定键序）。宿主经 setValue/数据链写回 scope `items`；list 不自写数据。重排视觉过程态（dragging/over）为组件 local UI state。**键盘重排派发语义：ArrowUp/ArrowDown 每次移动逐次 commit 并逐次派发 `onReorder`**（与底座逐次 commit 同构）。handle 点击不触发条目选择（stopPropagation，防 §7 选择态误触发）。与 `combo`/`input-table` 的边界：二者是表单字段编辑器（条目数组归表单 owner，内建上移/下移），list 重排是展示型 collection 的事件化重排（宿主决定写回），三者不重叠。
- `list` 不内建分页 UI 控件（页码按钮归独立 `pagination` renderer / 宿主）；`list` 只切片展示 + 派发事件。

## 9. 数据源、表达式、导入能力接入点

- `items` 应优先接最终条目数组。
- 原始业务数据到条目视图模型的映射应尽量在 loader 完成。
- **请求下沉约束（硬约束）**：`list` 零组件级请求字段——不声明 `api`/`source`/`initFetch`/`action` 等挂载触发字段。数据加载经事件（`onLoadMore`/`onPageChange`）→ 宿主 action graph → `<data-source>` → scope `items`，`list` 只切片/展示，不自发请求。
- infinite 模式（`pagination.mode:'infinite'` + `pagination.enabled:true`）：复用同包 `useInfiniteScroll` hook 渲染触底 sentinel（`data-slot="list-infinite-sentinel"`，命名对齐 crud `crud-infinite-sentinel`）+ IntersectionObserver；触底派发 `onLoadMore`（`list` 不自发请求），由宿主推进页码并把更多条目写入 scope `items`，`list` 累计展示 `currentPage * pageSize` 条。`hasMore===false` 或 `currentPage >= totalPages` 时隐藏/禁用 sentinel。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-list` marker。
- infinite sentinel：`data-slot="list-infinite-sentinel"`；状态区 `data-slot="list-infinite-status"`（命名对齐 crud infinite marker 风格）。
- **重排（G6）**：条目拖拽 handle `data-slot="list-item-drag-handle"`（命名对齐 `table-row-drag-handle`）；拖拽中条目 `data-dragging="true"`、放置目标条目 `data-drag-over="true"`（**命名对齐 table 行拖拽既有 `data-dragging`/`data-drag-over`**，跨渲染器测试选择器复用）。`reorderable=false`（缺省）时零新 DOM。

## 11. 实现拆分建议

- 集合迭代、item region 渲染和空态处理分开实现。

## 12. 风险、取舍与后续阶段

- 最主要风险是再次引入“列表 + 私有模板协议”的双轨模型，需要坚持单一 `items` 字段原则。
- 第二个风险是把 `list` 与 `loop` 混成一类：`loop` 负责无 UI 的结构展开，`list` 负责有 UI 的集合展示，二者不应互相吞并。
- **重排（G6）**：宿主忘写 `onReorder` 回写链时拖拽仅视觉生效、数据回弹（下拉回原序）——属 schema 编排错误，list 不做兜底自写（坚持 §9 约束）；首版不做跨容器拖拽；page 分页下重排被前置门控禁用（§4），重排仅覆盖无分页或 infinite 累计集场景；跨页重排归后续 demand。

## 13. 响应式行为

> 实现落地于「新落地 renderer 响应式 successor」plan（`docs/plans/2026-06-24-2358-1-newly-landed-renderer-responsive-followups-plan.md`）。引用 M0 移动端基线（`docs/architecture/mobile-responsive-baseline.md`，断点 768px）与 M0.1 hairline 工具（`nop-hairline`，baseline §10.2）。

- **分隔线迁移（M0.1 successor）**：根节点 `divide-y divide-border`（1px border 分隔）已迁移到逐项 `nop-hairline nop-hairline-bottom`（M0.1b `::after` 伪元素 + transform scale 0.5px 高 DPI 细线）。最后一个条目不输出底边（与 `divide-y` 的「条目之间」语义等价）。根节点保留外层 `rounded-md border border-border` 圆角边框。颜色经 `--nop-hairline-color`（默认 `hsl(var(--border))`）主题化，桌面/移动一致。
- **小屏触摸滚动**：`list` 消费 `useIsMobile()`（阈值 768px）。小屏（< 768px）下：
  - 根容器补 `touch-pan-y`（Tailwind，`touch-action: pan-y`），保证纵向触摸滚动流畅；
  - 条目纵向 padding 从桌面 `py-2` 提升到 `py-3`，增强触摸目标高度。
  - 桌面（≥ 768px）维持 `py-2`、无 `touch-pan-y`（视觉与交互零回归）。
- **marker**：根节点 `.nop-list`（含空态根）在小屏增 `data-responsive="narrow"`（桌面缺省不输出，与 crud/chart/table 范式对齐）。
- **小屏单列**：`list` 本身就是单列堆叠，M4b「小屏单列」诉求天然满足；本节只补触摸滚动体验 + hairline 迁移 + 响应式 marker，不改变集合/分页/选择核心逻辑（§7–§9 不动）。
- **schema 透明**：无新 schema 字段、无 `mobileUI` 标志位、无 `*-mobile` 组件。移动分支完全在 renderer 内部由 `useIsMobile()` 决定。

## V12b 行为契约补记（plan 485）

- 加载失败提供 retry（与 crud-infinite-scroll-area 同构），失败态不再只有纯文本。
