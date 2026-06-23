# Pagination 组件设计

## 1. 组件定位

- `pagination` 是独立分页交互 renderer，用来表达页码切换、每页条数切换与外部分页状态同步。
- 它是一个 `Interaction Owner`，不是 `table` 或 `list` 的私有子协议。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `pagination`，但正式 Flux 契约应收敛到当前页、总数、页大小和 ownership，而不是继续沿用 `activePage`、`lastPage` 等历史双语义字段。
- `pagination-wrapper` 不保留为独立 canonical type，分页组合应由 `pagination` 加上集合 renderer 完成。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'pagination'`
- 预期归属 `@nop-chaos/flux-renderers-data`
- 组件性质：`category: 'data'`

## 4. schema 设计

- 建议正式字段为 `currentPage`、`pageSize`、`total`、`pageSizeOptions`、`mode`、`pageOwnership`、`pageStatePath`、`statusPath`。
- 是否显示输入框、总数和页面大小切换应作为明确布尔值，而不是依赖 layout 字符串拼装。

## 5. 字段分类

- `currentPage`、`pageSize`、`total`、`pageSizeOptions`、`mode`、`pageOwnership`、`pageStatePath`、`statusPath`: `value`
- `onChange`、`onPageSizeChange`: `event`

## 6. regions 与 slot 约定

- `pagination` 首版不需要开放自由 regions。
- 文案和布局变化应优先通过明确字段或底层 UI primitive props 映射承接。

## 7. 运行期状态归属

- 当前页与页大小属于 `pagination` 自己的交互状态。
- 外部若需要读取摘要，应通过 `statusPath` 发布只读 summary DTO。
- **边界归一裁定（W2a 落地）**：`currentPage` 超出 `Math.ceil(total/pageSize)` 时归一到末页；`currentPage < 1` 归一到第 1 页。`onChange` 携带归一后的 `currentPage`。
- **页大小变更裁定（W2a 落地）**：`onPageSizeChange` 触发时**重置 `currentPage` 到第 1 页**——避免新页大小下出现空页（如从 pageSize=10/page=3 切到 pageSize=20，旧 page=3 在新分页下不存在）。同时 `onChange` 也会以归一后的 `{ currentPage: 1, pageSize: next }` 上报，保证下游刷新只触发一次实际数据请求。
- `statusPath` summary 形状：`{ kind: 'pagination', currentPage, pageSize, total, totalPages, canGoNext, canGoPrev }`。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onChange`、`onPageSizeChange`。
- 推荐句柄为 `component:setPage`、`component:setPageSize`、`component:resetPage`。

## 9. 数据源、表达式、导入能力接入点

- `pagination` 不拥有请求协议；它只维护分页交互轴。
- 查询或列表刷新应由外部 action / source 根据分页状态显式执行。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-pagination` marker。
- 视觉层复用 `@nop-chaos/ui` Pagination primitive，不在 renderer 内硬编码布局类。

## 11. 实现拆分建议

- 分页状态桥接、UI primitive 适配、外部状态摘要发布分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是再次把分页请求字段映射和数据请求协议塞回组件自身。
- 第二个风险是让 `table.pagination` 和独立 `pagination` 演化成两套不兼容语义。
