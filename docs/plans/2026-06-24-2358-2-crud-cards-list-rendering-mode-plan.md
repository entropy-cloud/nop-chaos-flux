# CRUD Cards/List Rendering Mode (E1d Deferred Successor)

> Plan Status: completed
> Last Reviewed: 2026-06-25
> Mission: components
> Work Item: E1d deferred successor — CRUD `cards/list 模式`
> Source: `docs/components/crud/design.md` §2 L41（cards/list 模式「计划实现（E1d）」）、`docs/plans/2026-06-21-1345-2-e1d-crud-data-lifecycle-plan.md:205-210`（Deferred But Adjudicated：`cards/list 模式`，Successor Required: yes）
> Related: `docs/plans/2026-06-24-2358-1-newly-landed-renderer-responsive-followups-plan.md`（先行为 cards/list 落地响应式；本 plan 消费 cards/list renderer，不改其内部）

## Purpose

把 E1d plan 显式 deferred 的「CRUD cards/list 模式」收口：CRUD 当前硬编码以 `<TableRenderer>` 为唯一行渲染载体，本 plan 让 CRUD 能按 schema 选择以 `cards` 或 `list` renderer 渲染行集合（复用已 `done` 的 W1c `list` / W2a `cards`）。**CRUD 始终拥有 selection 与 pagination 状态**（与 table 模式同源 scope state），非 table 模式下 carrier 的原生 selection 关闭、pagination 视 carrier 能力复用或由 CRUD 承载——不要求 cards/list renderer 新增 scope-owned selection / cards pagination 能力（那是 carrier 自身增强，超出本 plan 且属 plan 1 范畴）。

## Current Baseline

> live repo 核查结论（区分「schema 声明」与「runtime 落地」，Rule 11）：

- **CRUD 当前硬编码 table 载体**：`packages/flux-renderers-data/src/crud-renderer.tsx:302-360` 构建 `tableSchema`（type:'table'），`:370-390` 组装 `tableRendererProps`，`:466-467` 渲染 `<TableRenderer {...tableRendererProps} />`。**无 `listMode` / cards/list 分支**。
- **CRUD 状态拥有机制**：selection/pagination/sort/filter 经 scope-owned state path（`crud-renderer-ownership.ts:43-61` 派生 `selectionStatePath`/`paginationStatePath` 等；`crud-renderer-state.ts:296-376` 读写）。table 模式把这些 path 透传给 table（`crud-renderer.tsx:309-316`），table runtime 完整支持（`use-table-selection.ts:16-65` scope/controlled/local 三态全 wired）。**这套「CRUD 拥有 state、carrier 透传消费」是 table 模式的既定契约。**
- **行渲染 carrier 能力（runtime 核查，非 schema 字面）：**
  - `table`：selection scope/controlled/local 三态 runtime 全落地（`use-table-selection.ts`）；pagination runtime 全落地。→ CRUD 唯一可透传 selection/pagination 的 carrier。
  - `list`（`list-renderer.tsx`）：**pagination runtime 落地**（`list-pagination.ts` 支持 `paginationOwnership: 'scope'` + `paginationStatePath`，`schemas.ts:233-238`）；**selection 仅 local**——`ListSchema`（`schemas.ts:226-247`）无 `selectionOwnership`/`selectionStatePath` 字段，`list-renderer.tsx:228` 用本地 `useState`。→ list 可复用 CRUD pagination（scope ownership），但 selection 不能透传。
  - `cards`（`cards-renderer.tsx`）：**pagination 不存在**——`CardsSchema`（`packages/flux-renderers-content/src/schemas.ts:148-167`）无 `pagination`/`paginationOwnership`/`paginationStatePath`（仅一个孤儿 `onPageChange` 事件，无 driver）；**selection 仅 local**——`CardsSchema:161-163` 声明了 `selectionOwnership`/`selectionStatePath` 但 `cards-renderer.tsx` **零引用**（`:139` 本地 `useState`），属 contract-surface-vs-semantics gap（Rule 11 教训 #6）。→ cards 既无 pagination 也无 scope-selection。
- **结论（本 plan 的可行边界）**：非 table 模式下 CRUD 必须**自持 selection**（carrier `selectionMode: 'none'`，选择经 item/card 模板内 checkbox 绑定 CRUD `selectionStatePath` 表达）；pagination 在 list 模式可复用 list runtime（scope ownership），在 cards 模式由 CRUD 自载（预切片 + footer 渲染 pagination renderer）。**不要求 cards/list renderer 新增能力。**
- **Q2 决策已裁定归属**：`crud/design.md §2 L41`「cards/list 模式 | 计划实现（E1d）」，`§4.1 L58-63`「列展示…仍以 table 为底层载体」。本 plan 的 cards/list 模式是 table 之外的**可选行渲染载体**，不替换 table 默认地位。
- **E1d deferred 依据**：`2026-06-21-1345-2-e1d-...-plan.md:205-210`「cards/list 模式 | Classification: out-of-scope improvement | Successor Required: yes | Successor Path: 主 roadmap W1c（list）/ W2a（cards）落地后」。依赖现已 `done`。
- **请求下沉约束**：CRUD 不持有请求字段；cards/list 模式复用 CRUD 已有的 `filteredRows`（来自 data-source），不引入组件级请求。

## Goals

- CRUD 支持 schema 选择行渲染载体：`table`（默认，零回归）/ `cards` / `list`。
- 非表模式下 CRUD 自持 selection（经模板 checkbox 绑定 `selectionStatePath`，`$crud` 摘要/listActions 仍生效），pagination 按载体能力复用（list runtime）或 CRUD 自载（cards）。
- table 模式行为与改动前逐字节一致（默认路径零回归）。
- crud/design.md §2 L41 翻转为「实现」+ §4.1 补 carrier 边界说明；E1d deferred 补 Closure Note。
- playground 演示页 + e2e + focused 单测交付。

## Non-Goals

- 不修改 table renderer 本身（table 模式零回归）。
- 不修改 cards/list renderer 内部能力（响应式归 plan 1；selection scope-ownership / cards pagination 增强是 carrier 自身 contract，**显式不在本 plan**——本 plan 通过模板表达选择，不要求 carrier 新增 scope-selection）。
- 不重构 CRUD 的查询/轮询/分页生命周期（E1d 已 `done`）。
- 不引入 CRUD 组件级请求字段（请求下沉不变）。
- 不实现 operation 列在 cards/list 模式的自动 lowering（cards/list 用模板表达行内容；见 Deferred）。
- 不处理 D1a（host bridge 稳定性裁定，仍 deferred）。

## Scope

### In Scope

- `CrudSchema` 新增行渲染载体选择字段 + cards/list 模式所需 region 声明（`card`/`item` 模板）。
- `crud-renderer.tsx` 增加 listMode 分支：`cards`/`list` 模式构建对应 schema 并渲染 renderer；CRUD 自持 selection（carrier `selectionMode:'none'` + 模板 checkbox 绑定 `selectionStatePath`）；list 模式复用 list runtime pagination（scope ownership），cards 模式 CRUD 预切片 + footer 渲染 pagination。
- crud/design.md §2 翻转 + §4.1 补 carrier 边界 + 字段语义。
- focused 单测（table 零回归 + cards 派生 + list 派生 + selection 同源 state path）+ e2e + playground 演示页。

### Out Of Scope

- table/cards/list renderer 内部改动。
- CRUD 查询/轮询/infinite 生命周期改动（E1d done）。
- carrier scope-owned selection / cards pagination 能力增强（若后续需要，独立 carrier plan）。

## Failure Paths

> 不适用：本计划是纯前端渲染层集成（CRUD 壳 → 行渲染载体选择），无 API 契约/鉴权/外部集成。失败路径 = table 默认回归 / selection 状态错乱 → 由 focused 单测守住（table 零回归 + cards/list selection 经模板读写同一 `selectionStatePath`）。

## Test Strategy

档位选择：建议有测

本档选择：建议有测。理由：一般功能增强（CRUD 行渲染载体扩展），非鉴权/对外 API。selection/pagination 正确性是核心回归路径，已有 scope-owned state 机制兜底；proof 项含三模式 focused 单测 + e2e。不选「必须自动化」因不涉及流式反压/公开 API 契约。

## Execution Plan

### Phase 1 - 行渲染载体选择契约设计 + carrier 能力裁定固化

Status: completed
Targets: `packages/flux-renderers-data/src/crud-schema.ts`（CrudSchema，`:133`）、`docs/components/crud/design.md`

- Item Types: `Decision | Fix`

- [x] **Decision**：裁定字段形态——(A) `listMode?: 'table' | 'cards' | 'list'`（缺省 'table'）+ 复用各 renderer 既有 region 名（cards→`card`、list→`item`）；优先 (A)（与已落地 cards/list schema 契约对齐，不引入新抽象）。在 design.md §2/§4.1 记录裁定。
- [x] **Decision**：固化 carrier 能力边界（写入 design.md §4.1，作为非 table 模式实现依据）：selection 在所有非 table 模式由 CRUD 自持（carrier `selectionMode:'none'`，模板 checkbox 绑定 `selectionStatePath`）；pagination 在 list 模式复用 list runtime（`paginationOwnership:'scope'`），在 cards 模式 CRUD 预切片 + footer 渲染。**不改 cards/list renderer。**
- [x] **Fix**：CrudSchema 新增 `listMode` 字段 + 文档注释；design.md §2 L41「计划实现（E1d）」→「实现」并补字段语义 + §4.1 补 carrier 边界（§4.1 L58-63 已述 table 为载体，此处补「cards/list 为可选载体，selection/pagination 所有权裁定见下」）。

Exit Criteria:

- [x] CrudSchema 新增 `listMode` 字段（live repo 可见）
- [x] crud/design.md §2 L41 翻转为「实现」+ §4.1 补 cards/list carrier 边界 + selection/pagination 所有权裁定

### Phase 2 - CRUD listMode 分支实现（selection 自持 + pagination 按载体）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] **Fix**：`crud-renderer.tsx` 按 `listMode` 分支（在 `tableSchema` 构建处 L302）：
  - `list` 模式：构建 list schema（`items: filteredRows`、`item` region、`selectionMode:'none'`、`pagination` + `paginationOwnership:'scope'` + `paginationStatePath` 复用 CRUD 的、`keyField`）；渲染 `<ListRenderer>`。
  - `cards` 模式：构建 cards schema（`items`: CRUD 预切片到当前页的 `filteredRows`、`card` region、`selectionMode:'none'`、`keyField`）；CRUD footer 渲染 pagination renderer（复用已落地 W2a `pagination`）；渲染 `<CardsRenderer>`。
  - `table` 模式：保持现有 `tableSchema` 不变。
- [x] **Fix**：selection 在非 table 模式由 CRUD 自持——`selectedRowKeys` 仍经 `selectionStatePath` 读写（`crud-renderer-state.ts` 已有）；card/item 模板示例含 checkbox 绑定 `$crud` selection（playground 演示 + design.md 文档）；`$crud` 摘要 / listActions（selection-aware）因读同一 scope state 而继续生效。
- [x] **Proof**：focused 单测覆盖——table 模式 `tableSchema`/`tableRendererProps` 与改动前逐字段一致（零回归）；list 模式 schema 派生正确（`paginationOwnership:'scope'` + `selectionMode:'none'`）；cards 模式预切片正确（items = 当前页 slice）；三模式 selection 读写同一 `selectionStatePath`。

Exit Criteria:

- [x] listMode='list' 渲染 `<ListRenderer>` 且 pagination 复用 CRUD scope state（`paginationOwnership:'scope'`）、`selectionMode:'none'`（focused 单测）
- [x] listMode='cards' 渲染 `<CardsRenderer>` 且 items 为 CRUD 预切片、footer 渲染 pagination、`selectionMode:'none'`（focused 单测）
- [x] listMode='table'（缺省）模式与改动前逐字段一致（零回归单测）
- [x] 三模式 selection 读写同一 `selectionStatePath`（focused 单测）
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-data typecheck`）——本 Phase 改公共契约（CrudSchema），后续 Phase 3 立即依赖

### Phase 3 - playground 演示页 + e2e + owner-doc 收口

Status: completed
Targets: `apps/playground/src/`、`apps/playground/src/route-model.ts`/`App.tsx`、`tests/e2e/`、`docs/components/crud/design.md`

- Item Types: `Fix | Proof`

- [x] **Fix**：playground 演示页展示同一数据集的三种 listMode（table/cards/list）切换，cards/list 模板含 selection checkbox 绑定 `$crud.selection`，含可观测 testid。
- [x] **Fix**：路由注册到 playground。
- [x] **Proof**：e2e 覆盖 listMode 切换 + cards/list 模式下选择（经模板 checkbox）+ 分页交互（程序化断言，不靠截图）。
- [x] **Fix**：E1d plan `2026-06-21-1345-2-e1d-...-plan.md:205-210` Deferred But Adjudicated 补 Closure Note 指向本 plan。

Exit Criteria:

- [x] playground 演示页可访问且路由已注册（live repo 可见三模式 testid + 路由条目）
- [x] e2e 全绿（listMode 切换 + cards/list 选择/分页交互）
- [x] E1d deferred 项补 Closure Note

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅子 agent 填写。

- Reviewer / Agent: opencode plan-review（fresh general subagent，round 1 + round 2 复审）
- Verdict: `pass-with-minors`（round 1 `revised`，round 2 prior-Blocker `resolved`）
- Rounds: 2
- Findings addressed: (Blocker→resolved) round 1 发现 Phase 2「复用 cards/list scope-owned selection/pagination」前提不成立——cards selection 仅 local useState（schema 声明 selectionOwnership 但 runtime 零引用）、cards 无 pagination 字段、list selection 仅 local；已重写为可行方案：CRUD 自持 selection（carrier `selectionMode:'none'` + 模板 checkbox 绑定 `selectionStatePath`）、list 复用 runtime pagination（scope ownership）、cards 预切片 + footer pagination renderer，不改 cards/list renderer，Current Baseline 区分 schema 声明 vs runtime 落地（Rule 11）。(Minor→fixed) §5→§4.1 归属订正、selectionMode↔selectionOwnership 术语订正、CrudSchema 位置订正为 crud-schema.ts:133、CardsSchema 补包名限定。引用准确性逐条经 live repo 核对通过。

## Closure Gates

- [x] CRUD 支持 table/cards/list 三种行渲染载体，table 缺省零回归
- [x] 非表模式 selection 由 CRUD 自持（同一 `selectionStatePath`，carrier `selectionMode:'none'`，模板 checkbox 表达），`$crud` 摘要/listActions 继续生效
- [x] list 模式 pagination 复用 list runtime（scope ownership）；cards 模式 CRUD 预切片 + footer pagination
- [x] 不修改 cards/list renderer（carrier 内部能力增强显式 Out Of Scope）
- [x] crud/design.md §2 翻转 + §4.1 carrier 边界 + 字段语义同步到 live baseline
- [x] E1d deferred 项补 Closure Note 指向本 plan
- [x] playground 演示页 + e2e 交付
- [x] 必要 focused verification 已完成（三模式单测 + selection 同源 state）
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### operation 列在 cards/list 模式下的自动 lowering

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: cards/list 模式用 `item`/`card` region 模板表达行内容，operation 等价物由模板内 `button` 表达。table 模式的 operation 列自动 lowering 到 cards/list 属 feature 级设计，非本 plan 的 contract closure 必需项。Q2 决策已裁定 cards/list 是独立 renderer，不强制与 table operation 列语义一一对应。
- Successor Required: no
- Successor Path: 若后续业务出现高频「operation 列在 cards/list 模式自动等价」需求，独立评估。

### carrier scope-owned selection / cards pagination 能力增强

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 通过模板 checkbox + CRUD 自持 state 表达非表模式 selection，cards 预切片表达 pagination，**不依赖** carrier 新增 scope-selection/cards-pagination 能力。若后续希望 cards/list 原生支持 scope-owned selection（消除模板 checkbox 样板），属 carrier 自身 contract 增强，独立 carrier plan 处理（cards `selectionOwnership` 已 schema-declared 但 runtime-ignored 的 gap 也归该 carrier plan 收口）。
- Successor Required: no
- Successor Path: 独立 carrier 增强 plan（cards/list scope-owned selection runtime 落地 + cards pagination 字段）。

## Non-Blocking Follow-ups

- cards/list 模式下的列设置（`columnSettings`）等价物：cards/list 用模板而非列，columnSettings 不直接适用；若需列可见性控制影响模板，归后续评估。

## Closure

Status Note: E1d deferred 的「CRUD cards/list 模式」已收口。CRUD 按 `listMode` 选择 `table`（缺省零回归）/ `cards` / `list` 行渲染载体；carrier 经 `helpers.render` 按 type 解析渲染（避免与 `flux-renderers-content` 产生包级硬依赖）；非 table 模式 selection 由 CRUD 自持（`toggleSelection` capability 写同一 `selectionStatePath`），pagination 按载体承载（list 复用 runtime scope 分页；cards 预切片 + footer 分页）。未修改 cards/list renderer。carrier 经 React Compiler memoize 不重渲染的问题用 keyed-wrapper remount 解决（non-blocking follow-up：reactive 非重渲染优化）。

Closure Audit Evidence:

- Auditor / Agent: opencode closure-audit（fresh general subagent session `ses_1050ab6f2ffelFITR5iie9SbcS`，不复用执行者上下文）
- Verdict: `approved`（plan 可标 `completed`）
- Evidence: 独立核对 live repo——Phase 1-3 exit criteria 逐条成立（CrudSchema.listMode 缺省 'table'、table 代码路径逐字节零回归、carrier `selectionMode:'none'`、cards 预切片 / list `paginationOwnership:'scope'`、carrier 经 `helpers.render` type 解析无跨包 import、未修改 cards/list renderer、deferred 两项诚实 non-blocking、文本一致性 OK）；executor 报告的验证输出经独立复跑确认（data typecheck/lint/test + playground typecheck 全过）。Minor 发现已处理：`toggleSelection` capability contract 已补入 `componentCapabilityContracts`（M2）、daily log 已写（M3）。
- Daily log: `docs/logs/2026/06-25.md`（CRUD cards/list 渲染模式 entry）。

Follow-up:

- Non-blocking：carrier keyed-remount 在 pagination/selection 变更时强制重挂载——功能正确但非最优；后续可调研让经 `helpers.render` 嵌套的 carrier 子树对 CRUD-owned scope state 做 reactive（非重渲染）更新（消除 keyed remount）。
- Non-blocking（plan Deferred 已裁定）：operation 列到 cards/list 模式的自动 lowering；carrier scope-owned selection / cards pagination 原生能力增强（消除模板 selection 样板）。两者均 `Successor Required: no`，见 `Deferred But Adjudicated`。
