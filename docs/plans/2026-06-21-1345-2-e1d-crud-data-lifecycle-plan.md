# E1d CRUD 数据生命周期

> Plan Status: active
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E1d 行 L99）、`docs/components/crud/design.md`（§2 Flux 决策表 L38-41 标 `计划实现（E1d）`）、live-repo audit（`crud-renderer.tsx`、`crud-renderer-state.ts`、`crud-schema.ts`、`TableRenderer`、`source-registry.ts`）
> Related: E0c CRUD 选择漂移修复（done，前置）、X4 data-source 请求层增强（**硬前置**，本 plan 不能在 X4 完成前启动）、X5 design.md Flux 决策表（done）、Q2 crud 模式归属（已裁定：cards/list 模式归主 roadmap W1c/W2a，本 plan 不实施）、Q5 跨 roadmap 重叠归属（同 Q2 裁定）

## Purpose

把 roadmap 工作项 **E1d crud 数据生命周期** 从 `todo` 推进到 `done`：为 `crud` 补齐 **轮询刷新（走 data-source interval）**、**可折叠查询区**、**无限滚动分页** 三组数据生命周期相关能力。design.md §2 Flux 决策表 L38-40 已为这些能力裁定 Flux 决策；L41 cards/list 模式经 Q2 裁定**归主 roadmap W1c/W2a**，本 plan 不实施。

**X4 硬前置说明**：E1d 的"轮询刷新走 data-source `interval`"与"显式刷新动作"需要 X4 落地的 `component:refresh` capability 与 lifecycle event 契约才能干净集成；若 X4 未完成，本 plan 必须保持 `planned` 不能启动。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Schema**：`CrudSchema`（`packages/flux-renderers-data/src/crud-schema.ts:118-163`）字段含 `queryForm`/`source`/`columns`/`paginationOwnership`/`clientMode` 等。**无** `polling` 配置、**无** `filterTogglable`（或同义命名）、**无** `infiniteScroll` 模式。`CrudQueryFormConfig`（L9-24）字段含 `data`/`body`/`actions`/`layout`/`mode`/`syncLocation`/`defaultParams`/`parsePrimitiveQuery`，**无** 折叠态字段。
- **Renderer**：`crud-renderer.tsx`（413 行）已落地查询/分页/排序/选择/工具栏主闭环。`useCrudRuntimeState` 管理 query/pagination/sort/filter/selection owner state。刷新走 `onRefresh` 回调到 `refreshSource` action（runtime-owned，按 targetId 寻址）。**无** 内置轮询、**无** 查询区折叠、**无** 无限滚动。
- **Pagination**：`TableSchema.pagination`（`schemas.ts:116-122`）字段含 `enabled`/`currentPage`/`pageSize`/`pageSizeOptions`/`showSizeChanger`。**无** `mode: 'pages' | 'infinite'` 区分。
- **Data-source 集成**：CRUD 当前不直接消费 data-source renderer；上游通过 `source: ${users}` 表达式把数据注入 scope，CRUD 从 scope 读。轮询需求需要 CRUD 与 data-source 协作（通过 `component:refresh` capability 调用上游 data-source，或经 `$crud.statusPath` 暴露轮询状态）。
- **design.md**：§2 L38 自动轮询标 `计划实现（E1d）：走 data-source interval`；L39 可折叠查询区 `计划实现（E1d）`；L40 无限滚动 `计划实现（E1d）`；L41 cards/list 模式 `计划实现（E1d）：依赖主 roadmap W1c（list）/ W2a（cards）`。§9 L302 服务端分页标 `未实现完整请求 owner baseline`。
- **测试**：`crud-query-and-pagination.test.tsx`、`crud-binding-and-status.test.tsx`、`data-crud-request-owned.test.tsx` 已覆盖查询提交/分页/状态发布/source 消费。**无** 轮询/折叠查询/无限滚动测试。

## Goals

- `CrudSchema` 新增字段：`polling?: CrudPollingConfig`（封装 data-source interval 协作）、`filterTogglable?: boolean | CrudFilterToggleConfig`（查询区折叠）、`pagination.mode?: 'pages' | 'infinite'`（分页模式扩展）。
- `CrudQueryFormConfig` 新增字段：`defaultCollapsed?: boolean`、`collapsedLabel?`/`expandedLabel?`（折叠/展开按钮文案）。
- `CrudRenderer` 消费三组能力：
  - 轮询：通过 `useRendererRuntime()` 找到上游 data-source registration（按 `polling.sourceId` 或 nearest data-source in scope），调用 `controller.start()`/`stop()` 启停；interval 由 data-source 自身配置，CRUD 不重造。
  - 可折叠查询区：`queryForm` 区域支持折叠态（默认展开），折叠时只显示一行摘要 + 触发按钮；展开时显示完整表单。
  - 无限滚动：`pagination.mode: 'infinite'` 时，table 底部 IntersectionObserver 触发 next-page 加载；累计合并 rows；隐藏标准分页栏。
- `pagination.mode` 缺省 `'pages'`（现行行为）；`mode: 'infinite'` 与 `clientMode.loadDataOnce` 协同（前端已有全部数据时禁用 infinite 触发）。
- crud renderer definition 的 `propContracts` + `fields` 补齐新字段声明。
- design.md §2 Flux 决策表 L38-40 翻 `实现`；§6.1 顶层字段补 `polling`/`filterTogglable`/`pagination.mode`；§7 运行期状态归属补轮询启停与 infinite 累计说明。
- focused 单测覆盖 polling 启停、折叠查询区展开/折叠、infinite scroll 触发条件。

## Non-Goals

- 不实施 cards/list 模式 —— Q2 已裁定归主 roadmap W1c（list）/ W2a（cards）；design.md §2 L41 注明依赖，本 plan 不实施，保留为 deferred。
- 不在 CRUD 内部直接配置 `interval`/`stopWhen` —— design.md §2 L38 明确 `走 data-source interval`；CRUD 只消费上游 data-source（按 `sourceId` 寻址或 nearest），不重造请求层。
- 不重构 `refreshSource` action API —— E1d 复用既有 refresh 路径，仅在 CRUD 层添加 polling orchestration。
- 不实施 `syncLocation`（URL 同步查询参数）—— design.md §2 L42 已标 `不采纳`（偏路由/宿主导航职责）。
- 不实施 `autoGenerateQueryForm` —— design.md §2 L44 标 `暂不实现（DESIGN-ACK-NOT-IMPL）`，与本 plan 不相互阻塞。
- 不实施 `clientMode.matchFunc` —— design.md §2 L43 标 `暂不实现（DESIGN-ACK-NOT-IMPL）`。
- 不实施列拖拽排序 —— design.md §2 L45 标 `暂不实现`，依赖 table E1c（done 但 draggable 仍 deferred）。

## Scope

### In Scope

- `CrudSchema` 新增 `polling`/`filterTogglable` + `pagination.mode` 三组字段
- `CrudQueryFormConfig` 新增 `defaultCollapsed`/`collapsedLabel`/`expandedLabel`
- `CrudRenderer` 实现 polling orchestration（启停上游 data-source）+ 可折叠查询区 + infinite scroll 触发
- `TableRenderer`/crud renderer 定义层支持 `pagination.mode: 'infinite'`
- crud renderer definition `propContracts` + `fields` 补齐
- design.md §2/§6/§7/§9 同步
- focused 单测

### Out Of Scope

- cards/list 模式（归主 roadmap W1c/W2a）
- CRUD-owned interval/stopWhen 配置（走 data-source）
- `syncLocation` URL 同步
- `autoGenerateQueryForm` / `matchFunc` / 列拖拽（独立 deferred）

## Failure Paths

| 场景                   | 触发                                                            | 行为                                                                                 | 可重试 | 用户可见表现                                         |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------- |
| polling-no-source      | `polling.enabled: true` 但找不到上游 data-source                | warning log；轮询禁用；CRUD 仍按 `onRefresh` 正常工作                                | 是     | 无轮询发生；console warning                          |
| polling-source-stopped | 用户显式停止轮询（经 toolbar action 调 `component:cancel`）     | data-source.controller.stop()；in-flight 请求 abort                                  | 是     | `statusPath.refreshing` 转 false；后续需手动 refresh |
| filter-collapsed       | `filterTogglable: true, defaultCollapsed: true`                 | queryForm 初始折叠；展开按钮可见；点击展开显示完整表单                               | 是     | 查询区显示一行摘要 + "展开" 按钮                     |
| infinite-no-more       | `pagination.mode: 'infinite'` 且当前页是最后一页                | IntersectionObserver 仍触发但 next-page 返回空数组；不追加；不发请求                 | 是     | 底部"没有更多"                                       |
| infinite-load-error    | infinite 触发但 next-page fetch 失败                            | 错误经 `statusPath` 发布；不追加空行；保留已加载页                                   | 是     | 列表底部"加载失败，点击重试"                         |
| clientMode+infinite    | `clientMode.loadDataOnce: true` + `pagination.mode: 'infinite'` | infinite 触发器禁用（前端已有全部数据，无 next-page 请求）；显示标准"已加载全部"提示 | 是     | 列表底部"已加载全部 N 条"                            |

## Test Strategy

档位选择：`必须自动化`

本档选择：`必须自动化`。E1d 改动 CRUD 数据生命周期（polling/infinite），涉及数据正确性与状态发布契约，是后续业务消费的硬基线。Infinite scroll 的"何时触发/何时停止/与 clientMode 协同"是契约性结果，需要 Proof-before-Fix 顺序。Polling 启停属于 capability contract surface（依赖 X4 的 `component:cancel`），必须锁定。

## Execution Plan

### Phase 1 - Schema + Definition 契约（Proof-first RED）

Status: planned
Targets: `packages/flux-renderers-data/src/crud-schema.ts`、`packages/flux-renderers-data/src/schemas.ts`、`packages/flux-renderers-data/src/__tests__/crud-lifecycle.test.tsx`（新建）

- Item Types: `Fix | Proof`

- [ ] `CrudSchema` 扩展：`polling?: CrudPollingConfig`（`{ enabled?: boolean | string; sourceId?: string; stopWhen?: string }`）、`filterTogglable?: boolean | CrudFilterToggleConfig`（`{ defaultCollapsed?: boolean; collapsedLabel?: string; expandedLabel?: string }`）
- [ ] `TableSchema.pagination`（`schemas.ts:116-122`）扩展：`mode?: 'pages' | 'infinite'`（缺省 `'pages'`）；同步 `CrudSchema.pagination`（若独立声明）或经 table 透传
- [ ] `CrudQueryFormConfig` 扩展：`defaultCollapsed?: boolean`、`collapsedLabel?: string`、`expandedLabel?: string`
- [ ] crud renderer definition `propContracts` 补 `polling`（shape `'object'`）/`filterTogglable`（shape `'object'`）；`fields` 补 `{ key: 'polling', kind: 'prop' }`、`{ key: 'filterTogglable', kind: 'prop' }`、`{ key: 'pagination.mode', kind: 'prop' }`
- [ ] **Proof RED**：新建 `crud-lifecycle.test.tsx`，先写失败用例：
  - [ ] polling 启动：`polling.enabled: true` → mount 后上游 data-source.controller.start 被调用
  - [ ] polling 停止：unmount 或 `polling.enabled` 转 false → controller.stop 被调用
  - [ ] polling sourceId 寻址：`polling.sourceId: 'explicit-id'` → 只启动该 id 对应 data-source
  - [ ] filterTogglable 折叠：`filterTogglable: true, defaultCollapsed: true` → 初始折叠，展开按钮可见
  - [ ] filterTogglable 展开：点击展开按钮 → queryForm 完整显示
  - [ ] infinite scroll 触发：`pagination.mode: 'infinite'` + 滚动到底部 → 触发 next-page 加载
  - [ ] infinite + clientMode 协同：`clientMode.loadDataOnce: true` → infinite 不触发 next-page（已有全部数据）
  - [ ] infinite 最后一页：到达 last page → 不再触发加载

Exit Criteria:

- [ ] RED 测试 8 用例全部 fail
- [ ] `pnpm typecheck` 通过
- [ ] `scripts/check-finite-prop-contracts.mjs` 通过（`pagination.mode` 是 finite-union `'pages' | 'infinite'`，需加入 curated list）
- [ ] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 2 - Polling orchestration 实现

Status: planned
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`、`packages/flux-renderers-data/src/crud-renderer-state.ts`

- Item Types: `Fix`

- [ ] 新增 `useCrudPolling(props, { runtime, scope })` hook：解析 `polling.enabled`（支持 expression string）+ `polling.sourceId`（缺省时寻找 nearest data-source in scope）；truthy → mount 后调用 `registration.controller.start()`，unmount 或 falsy 转 true 时调用 `controller.stop()`
- [ ] `CrudRenderer` 接入 `useCrudPolling`；不直接消费 data-source interval/stopWhen（由 data-source 自身配置）
- [ ] toolbar 暴露 polling 控制入口（design.md §6.3 风格的 `listActions` block）：默认不暴露，需用户显式声明 `{ type: 'polling-toggle' }` toolbar item 才显示开关按钮
- [ ] polling 状态发布到 `$crud.refreshing`（既有 status summary 已含 `refreshing` 字段，无需扩 schema）

Exit Criteria:

- [ ] Phase 1 RED 用例 1-3（polling 启停 + sourceId 寻址）转 green
- [ ] `pnpm --filter @nop-chaos/flux-renderers-data test` 全过
- [ ] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 3 - 可折叠查询区 + 无限滚动 实现

Status: planned
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`、`packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`、`packages/flux-renderers-data/src/table-renderer/`（infinite scroll hook）

- Item Types: `Fix`

- [ ] 可折叠查询区：`filterTogglable` truthy 时，queryForm region 外包 collapsible 容器；折叠态显示一行摘要（active filter count + "展开"按钮）；展开态显示完整 queryForm + "折叠"按钮；按钮文案来自 `collapsedLabel`/`expandedLabel`（缺省走 i18n）
- [ ] 折叠态 state owner：默认 local（`React.useState`）；若 queryForm 提供 `collapsedStatePath`，走 scope-owned（本 plan 不强制扩 schema 字段，沿用 local state，未来按需扩展）
- [ ] 无限滚动：`pagination.mode === 'infinite'` 时，table 底部 sentinel `<div>` 经 `IntersectionObserver` 触发 next-page；累计合并 rows 到 `paginationState.loadedRows`（新建 owner state path，或复用 source append）
- [ ] 隐藏标准分页栏：`mode === 'infinite'` 时，toolbar layout 的 `pagination` block 不渲染（其他 block 不受影响）
- [ ] clientMode 协同：`clientMode.loadDataOnce === true` 时，infinite 触发器始终禁用（不发 next-page 请求）；显示"已加载全部 N 条"
- [ ] error 重试：next-page fetch 失败时，底部显示"加载失败，点击重试"，点击重新触发 next-page

Exit Criteria:

- [ ] Phase 1 RED 用例 4-8（折叠 + infinite + clientMode 协同 + last page）转 green
- [ ] `pnpm --filter @nop-chaos/flux-renderers-data test` 全过
- [ ] `pnpm typecheck` + `pnpm build` 通过
- [ ] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 4 - Owner-Doc Sync + Roadmap

Status: planned
Targets: `docs/components/crud/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/logs/2026/06-21.md`、`docs/components/amis-baseline-matrix.md`

- Item Types: `Follow-up`

- [ ] `crud/design.md` §2 决策表 L38 自动轮询行翻 `实现`（注明走 data-source interval + CRUD orchestrates 启停）
- [ ] design.md §2 L39 可折叠查询区行翻 `实现`
- [ ] design.md §2 L40 无限滚动行翻 `实现`
- [ ] design.md §2 L41 cards/list 模式行保持 `计划实现（E1d）：依赖主 roadmap W1c（list）/ W2a（cards）` —— 显式注明本 plan 不实施，归主 roadmap；写入 `Deferred But Adjudicated` 引用
- [ ] design.md §6.1 顶层字段：补 `polling`/`filterTogglable`/`pagination.mode`
- [ ] design.md §6.4 查询区建模：补 `filterTogglable`/`defaultCollapsed` 字段说明
- [ ] design.md §7 运行期状态归属：补 polling 启停状态发布 + infinite 累计合并 owner state 说明
- [ ] design.md §9 特性对比列表：服务端分页行更新（仍标 `未实现完整请求 owner`，注明 infinite 已实现但完整 server-owner 仍 deferred）
- [ ] `existing-components-improvement-roadmap.md` E1d `todo`→`done`（L48）；Last Updated 改 `2026-06-21 (E1d done)`
- [ ] `amis-baseline-matrix.md` crud 行 retained 决策无变化（No update required — 全部为新增能力）
- [ ] `docs/logs/2026/06-21.md` 新增 E1d 收口条目

Exit Criteria:

- [ ] design.md §2 L38-40 无残留 `计划实现（E1d）`（仅 L41 cards/list 保留）
- [ ] roadmap E1d 标为 `done`
- [ ] daily log 含 E1d 条目
- [ ] `docs/architecture/api-data-source.md`（若存在）— 检查 CRUD 与 data-source 协作章节是否需补 polling orchestration 说明；若无需更新，显式写 `No architecture doc update required`

## Draft Review Record

- Reviewer / Agent: REVIEW_PLANS fresh session (2026-06-21)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 无 Blocker / 无 Major。格式完整、Exit Criteria 可观测、scope 边界清晰、引用经 live repo 核对（CrudSchema @ crud-schema.ts:118、CrudQueryFormConfig @ crud-schema.ts:9、TableSchema.pagination @ schemas.ts:116-122、design.md §2 L38-41、scripts/check-finite-prop-contracts.mjs、docs/architecture/api-data-source.md 均存在且一致）。Test Strategy=必须自动化 与 Phase 1 Proof-first RED 顺序符合 guide rule 12。Phase 1-3 显式写明 `No owner-doc update required（design.md 更新在 Phase 4）` 符合 rule 17。Minor（不阻塞）：粗粒度 toolbar polling-toggle 默认值、infinite scroll owner-state-path 命名留待实现期裁定。

## Closure Gates

- [ ] X4 data-source 请求层增强 plan 已 `completed`（硬前置）
- [ ] `CrudSchema`/`CrudQueryFormConfig`/`TableSchema.pagination` 新字段全部定义且 propContracts/fields 接线
- [ ] `useCrudPolling` 正确启停上游 data-source（含 sourceId 寻址 + expression-gated enabled）
- [ ] 可折叠查询区正确切换折叠/展开（含 defaultCollapsed + 按钮 文案）
- [ ] 无限滚动正确触发 next-page（含 clientMode 协同禁用 + last page 停止 + error 重试）
- [ ] focused 单测覆盖全部 8 用例
- [ ] design.md §2/§6/§7/§9 同步到 live baseline
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### cards/list 模式（依赖主 roadmap W1c/W2a）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Q2 裁定（roadmap L99 引用）"等主 roadmap list/cards 落地后作为集成"。design.md §2 L41 + §9 L305 已注明 cards/list 是独立 renderer（`cards`/`list`），不是 CRUD 内部模式。E1d 的数据生命周期（polling/filterTogglable/infinite）独立于 cards/list 模式 —— 后者是"如何渲染行"，前者是"如何获取/刷新数据"。
- Successor Required: yes
- Successor Path: 主 roadmap W1c（list）/ W2a（cards）落地后，独立集成 plan 处理"CRUD 与 cards/list renderer 协作"。

### `clientMode.matchFunc`

- Classification: `optimization candidate`
- Why Not Blocking Closure: design.md §2 L43 + §6.5 L196 已注明 `matchFunc` 是"前端自定义匹配函数"，只有在仓库需要明确"自定义 record/query 布尔判定"时才值得收口。当前 `loadDataOnce` + `fetchOnFilter` 基线满足大部分本地过滤需求。
- Successor Required: no
- Successor Path: 归 E3 P2 评估。

### `syncLocation` URL 同步查询参数

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §2 L42 + §6.4 L179 已裁定 `不采纳`（偏路由/宿主导航职责，不在组件）。此条已由 design.md 显式拒绝，本 plan 不重新评估。
- Successor Required: no
- Successor Path: 若未来路由 owner 落地，独立评估。

## Non-Blocking Follow-ups

- 列拖拽排序（`draggable`）依赖 table E1c draggable，归主 roadmap（design.md §2 L45）。
- `autoGenerateQueryForm` runtime 实现 deferred（design.md §2 L44）。
- toolbar polling-toggle block 当前默认不暴露，需用户显式声明；归后续 schema style guide 评估默认值。

## Closure

Status Note: <<完成或关闭时填写：为什么这个 plan 可以关闭>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- <<或者明确写 no remaining plan-owned work>>
