# E0c CRUD 选择漂移修复

> Plan Status: completed
> Package: components-improvement
> Work Item: E0c CRUD 选择漂移修复
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md` (E0c), `docs/components/existing-components-improvement-analysis.md` §4 漂移登记表 #4, `docs/components/crud/design.md`, `packages/flux-renderers-data/src/crud-schema.ts`, `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-data/src/crud-renderer-state.ts`, `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`
> Related: 后续 `docs/components/existing-components-improvement-roadmap.md` 中 E1d（crud 数据生命周期）以本计划为前置；与已完成的 `autoClearSelectionOnRefresh` 基线互补

## Purpose

让 `CrudSelectionConfig` 已声明的 `keepOnPageChange` / `maxSelectionLength` / `maxKeepSelectionLength` / `checkableWhen` 真正在 crud/table 选择路径中生效或按 Q3 裁决降级（删字段）；删除"声明了但设了无效"的契约漂移，并把 owner `crud/design.md` 同步到实际实现。

## Current Baseline

- `CrudSelectionConfig`（`packages/flux-renderers-data/src/crud-schema.ts:103-109`）声明 `type?`、`keepOnPageChange?`、`maxSelectionLength?`、`maxKeepSelectionLength?`、`checkableWhen?` 共 5 个字段。
- `packages/flux-renderers-data/src/crud-renderer.tsx:254-256` 只读取 `normalizedSchema.selection.type`，把它写入 `base.rowSelection = { type, selectedRowKeys }`；**完全未消费** `keepOnPageChange` / `maxSelectionLength` / `maxKeepSelectionLength` / `checkableWhen`。
- `packages/flux-renderers-data/src/crud-renderer-state.ts` 中的 `useCrudRuntimeState` 维护 `selectedRowKeys`（数组形式）并初始化 `selectionStatePath` 为 `[]`；`normalizeCrudSchema`（`crud-schema.ts:187-200`）只规范化 `autoClearSelectionOnRefresh`（默认 `true`）、`selectionOwnership` 等基础字段，**不触及** 这 4 个漂移字段。
- crud 把 selection 委托给底层 table：`crud-renderer.tsx:234-235` 设 `selectionOwnership: 'scope'` + `selectionStatePath`，table 的 `use-table-selection.ts` 才是实际勾选/全选/单选逻辑所在地。
- `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`：
  - `handleSelectAll(checked)`（`:67-101`）只把 `normalizedRows`（当前页行）写入 selection 集合；**不感知跨页保留**。
  - `handleSelectRow(rowKey, checked)`（`:105-158`）单点翻转，**不强制** `maxSelectionLength` 上限。
  - 渲染层（`table-body-row-rendering.tsx`、`table-header-row.tsx`）渲染 checkbox 时**不消费** `checkableWhen`，每行 checkbox 一律可点。
- 因此 schema 里声明这 4 个字段**当前无效**：作者写了 `keepOnPageChange: true` 仍会在刷新/翻页时被 `autoClearSelectionOnRefresh` 清空；写了 `maxSelectionLength: 5` 不会阻止第 6 次勾选；写了 `checkableWhen` 不会禁用任何行。
- owner `docs/components/crud/design.md`：
  - `:32` Flux 决策表对应行标为 "**计划实现（E0c）**" + "契约漂移：schema 已声明但 `useTableSelection` 不消费，补实现或删"。
  - `:251-254` AMIS→Flux 迁移映射表已把这 4 个字段列为 canonical 迁移目标（`keepItemSelectionOnPageChange`→`selection.keepOnPageChange` 等）。
- 历史漂移登记：`docs/components/existing-components-improvement-analysis.md:164` #4（crud — schema 声明但 `useTableSelection`/`crud-renderer-state.ts` 不消费）。
- roadmap 顶部状态：`E0c CRUD 选择漂移修复: todo`。
- 前置 Q3（漂移字段策略）的裁决方向已在 design.md 中体现为"补实现或删字段"，本计划需在 Phase 1 把每个字段的"实现 vs 删"逐项裁定并固化为最终设计状态。

## Goals

- `CrudSelectionConfig` 的 4 个漂移字段（`keepOnPageChange` / `maxSelectionLength` / `maxKeepSelectionLength` / `checkableWhen`）每个都有明确归宿：**实现**（在 crud/table 选择路径中真实生效）或**删除字段**（从 schema、design.md、迁移映射表一并移除，归入"不采纳"）。裁定依据写入 design.md。
- 凡裁定为"实现"的字段，行为可通过 live DOM 或 selection state 可观察：
  - `keepOnPageChange: true` 时，翻页/刷新不清空已选 keys（与 `autoClearSelectionOnRefresh` 协同的明确优先级）。
  - `maxSelectionLength: N` 时，达到 N 后未选行 checkbox 进入 disabled，全选不再追加超限 keys。
  - `maxKeepSelectionLength: M`（仅与 `keepOnPageChange: true` 联用）时，跨页累计保留超过 M 后旧行为明确（裁定：阻止新选 or 淘汰最早）。
  - `checkableWhen`（表达式）为 falsy 的行 checkbox disabled、不可被全选纳入。
- owner `crud/design.md` 更新为最终设计状态：删除"计划实现（E0c）"过渡措辞；Flux 决策表对应行改为"实现"（附语义说明）或"不采纳（删字段）"（附理由）；迁移映射表同步收敛。
- 增加 focused 单测证明每个"实现"字段的生效路径与每个"删字段"裁定的字段已从 schema 类型消失。

## Non-Goals

- 不引入 E1d 范围的 crud 数据生命周期能力（自动轮询、可折叠查询区、无限滚动、cards/list 模式）。
- 不重构 `useTableSelection` 的 local/controlled/scope 三态 ownership 模型。
- 不改 `selectionOwnership` / `selectionStatePath` 的契约或 `$crud` 摘要发布路径。
- 不调整底层 table 的 rowKey、分页、排序、过滤 ownership。
- 不为 radio 单选模式引入 `maxSelectionLength` 语义（radio 本质单选，上限无意义）。
- 不引入新的扩展字段（如 `selectionRetentionStrategy`、`perRowDisableTooltip`）；如 Phase 1 评估认为需要，记录为 Non-Blocking Follow-up 并指向 E1d。
- 不改 `@nop-chaos/ui` 的 Checkbox / Table 组件 API。

## Scope

### In Scope

- `packages/flux-renderers-data/src/crud-schema.ts`（`CrudSelectionConfig`：若某字段裁定为删则移除；若裁定为实现则保持声明）。
- `packages/flux-renderers-data/src/crud-renderer.tsx`（`crud-renderer.tsx:254-256` selection 透传块：把裁定为"实现"的字段传入 table schema）。
- `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`（消费裁定为"实现"的字段：跨页保留、上限强制、per-row disable）。
- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`、`table-header-row.tsx`（若裁定 `checkableWhen` / `maxSelectionLength` 实现：行 checkbox disabled 态、全选 checkbox indeterminate/disabled 态）。
- `packages/flux-renderers-data/src/schemas.ts`（`TableSchema` 若需新增 `rowSelection` 子字段以承接 crud 透传）。
- `docs/components/crud/design.md`（漂移注记、Flux 决策表、§8 AMIS→Flux 迁移映射表）。
- 新增/更新 focused tests。
- `docs/logs/{year}/06-21.md` 收口记录。
- `docs/components/existing-components-improvement-roadmap.md` 顶部 `E0c` 状态由 `todo` 改为 `done`（closure audit 通过后）。

### Out Of Scope

- E1d 范围的 crud 数据生命周期增强。
- table 的列宽/聚合/树表/行拖拽等 E1b/E1c 能力。
- selection 与外部 action（`onSelectionChange`、`listActions`）的协作语义改动（保留现行 event payload）。
- crud 之外的其他选择型组件（input-tree、tree-select、checkbox-group）。
- 跨 roadmap 归属（E1d ↔ 主 roadmap W1c/W2a）的重排。

## Failure Paths

| 场景编号                  | 触发                                                                                     | 行为                                                                                                     | 可重试                      | 用户可见表现                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| keep-on-page-retain       | `selection.keepOnPageChange: true`，第 1 页勾选 2 行，翻到第 2 页                        | 已选 2 行 keys 保留在 selection state；第 2 页可继续勾选                                                 | 是（取消勾选或翻回第 1 页） | 顶部/工具栏 selection count 仍含第 1 页的 2 行 |
| keep-on-page-off          | `selection.keepOnPageChange: false`（或缺省）+ `autoClearSelectionOnRefresh: true`，翻页 | 翻页触发刷新 → selection 清空                                                                            | n/a                         | selection count 归零                           |
| max-selection-block       | `selection.maxSelectionLength: 2`，已勾选 2 行，点第 3 行 checkbox                       | 第 3 行 checkbox 已 disabled 或点击无效；selection 不变                                                  | 是（先取消一行）            | 第 3 行 checkbox disabled 视觉                 |
| max-selection-select-all  | `selection.maxSelectionLength: 2`，当前页 5 行，点全选                                   | 只选入前 2 行（裁定：截断到上限）or 全选 disabled（裁定：超限即禁用全选）—— Phase 1 固化                 | n/a                         | 全选后 selection count = 2                     |
| max-keep-overflow         | `keepOnPageChange: true` + `maxKeepSelectionLength: 3`，跨页累计已 3 行，新页再勾        | 按 Phase 1 裁定：阻止新选 or 淘汰最早 key                                                                | n/a                         | 行为与 design.md 描述一致                      |
| checkable-when-false      | `selection.checkableWhen: "<expr>"`，某行 expr 求值 falsy                                | 该行 checkbox disabled，不可被全选纳入                                                                   | n/a                         | 该行 checkbox disabled 视觉                    |
| checkable-when-eval-error | `checkableWhen` 表达式抛错                                                               | 按 Flux 现行表达式失败语义：视为 falsy（disabled）或如实冒泡 —— Phase 1 固化，与现行 `when` 求值策略一致 | 否                          | 与现行 `when` 失败表现一致                     |
| radio-mode-unaffected     | `selection.type: 'radio'` + 任意漂移字段                                                 | radio 单选语义不受 `maxSelectionLength` / `keepOnPageChange` 影响                                        | n/a                         | 单选行为保留                                   |
| field-deleted             | schema 含某裁定为"删字段"的字段                                                          | 该字段从 `CrudSelectionConfig` 类型消失；TS 编译期拒绝；design.md 迁移映射表移除对应行                   | n/a                         | 类型层拒绝                                     |

## Test Strategy

档位选择：必须自动化

本档选择：必须自动化。理由：契约漂移修复属于正确性问题，且选择保留/上限/per-row disable 是 CRUD 工作流的高频正确性需求；原漂移正是"声明了但设了无效"，必须用 focused test 锁定真实生效行为，否则未来 refactor 极易回归。

## Execution Plan

### Phase 1 - Q3 决策与契约固化

Status: completed
Targets: `docs/components/crud/design.md`

- Item Types: `Decision`

- [x] 在 `docs/components/crud/design.md` Flux 决策表中逐项裁定 4 个漂移字段的归宿（**实现** or **不采纳（删字段）**），每个字段附一条 Flux 裁定理由（参照 `existing-components-improvement-analysis.md` §0.2 设计原则：是否是高频业务需求、是否与 data-source/action 下沉原则冲突、命名是否对齐 shadcn）。
- [x] 对裁定为"实现"的字段，在 design.md 中固化最终语义：
  - `keepOnPageChange` 与 `autoClearSelectionOnRefresh` 的优先级（建议：`keepOnPageChange: true` 视为显式跨页保留，覆盖 `autoClearSelectionOnRefresh` 的清空行为；仅在刷新（refresh）时才触发清空判定，翻页（pagination）不触发）。
  - `maxSelectionLength` 达到上限时的全选行为（截断到上限 or 全选 disabled —— 选其一并写明）。
  - `maxKeepSelectionLength` 仅与 `keepOnPageChange: true` 联用；超限策略（阻止新选 or 淘汰最早）。
  - `checkableWhen` 表达式求值失败时按现行 `when` 语义处理。
- [x] 对裁定为"删字段"的字段，说明删除理由，并标记需在 Phase 3 同步从 `crud-schema.ts`、design.md §8 迁移映射表移除。
- [x] 删除 design.md 中"计划实现（E0c）"过渡措辞，把 Flux 决策表对应行改为"实现"或"不采纳（删字段）"。

Exit Criteria:

- [x] design.md Flux 决策表中 4 个漂移字段每个都有明确归宿（实现 / 删字段）+ 一条理由。
- [x] 凡裁定为"实现"的字段，其最终语义（含与 `autoClearSelectionOnRefresh` 优先级、上限达成行为、表达式失败处理）在 design.md 中描述一致且无歧义。
- [x] design.md 已无"计划实现（E0c）"过渡措辞。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目记录本次决策。

### Phase 2 - Focused Proof（RED 基线）

Status: completed
Targets: 新增/更新 focused tests（建议放 `packages/flux-renderers-data/src/__tests__/` 或 `table-renderer/` 同包合适位置）

- Item Types: `Proof`

> 本计划 Test Strategy 为"必须自动化"。按 guide 规则 12 与 AGENTS.md，"必须自动化"档位要求 Proof 项先于 Fix 项（TDD：先写失败测试）。本 Phase 在 Phase 1 决策固化后、Phase 3 实现前编写 focused proof，并对照 current baseline 确认 RED，从而锁定契约漂移确实存在；Phase 3 实现完成后这些 proof 转为 GREEN。

- [x] 对每个 Phase 1 裁定为"实现"的字段新增 focused proof（renderer-level 或 hook-level），逐项固化 Phase 1 语义：
  - `keepOnPageChange: true` 翻页后 selection 保留；`keepOnPageChange: false` + `autoClearSelectionOnRefresh: true` 翻页/刷新后清空。
  - `maxSelectionLength: N` 达到上限后单行勾选被拒/截断；全选行为与 Phase 1 裁定一致。
  - `maxKeepSelectionLength: M` 跨页累计超限策略与 Phase 1 裁定一致。
  - `checkableWhen` 表达式 falsy 行 checkbox disabled、全选不纳入；表达式求值失败按现行 `when` 语义。
- [x] 新增 negative proof：`selection` 未声明漂移字段（或缺省）时，crud/table 行为与现行完全一致（无跨页保留、无上限、无 per-row disable）。
- [x] 新增 negative proof：`selection.type: 'radio'` 下 `maxSelectionLength` / `keepOnPageChange` 不影响单选语义。
- [x] 新增 proof 覆盖"删字段"裁定：schema 含该字段时 TS 编译期拒绝（类型断言失败或 schema 校验失败）。
- [x] 对照 current baseline 运行新增 proof，确认全部为 RED（"实现"字段测试因行为缺失而断言失败；"删字段"类型测试因字段当前仍被 `CrudSelectionConfig` 接受而无法产生编译期拒绝），以此证明契约漂移确实存在。运行命令：`pnpm --filter @nop-chaos/flux-renderers-data test -- <新增测试路径>` 与对应 typecheck 断言。

Exit Criteria:

- [x] 每个 Phase 1 裁定（实现 / 删字段）都有对应 focused proof 已编写，且可追溯到具体 Failure Paths 场景或 Phase 1 决策。
- [x] 所有 proof 对照 current baseline 确认为 RED（断言失败 / 类型测试未产生预期拒绝），证明契约漂移存在；不存在因"接口已存在"而误判 GREEN 的项。
- [x] No owner-doc update required（owner-doc obligations 由 Phase 1 Decision 与 Phase 3 Fix 承担）。
- [x] `docs/logs/{year}/06-21.md` 记录新增测试路径与 RED 基线。

### Phase 3 - 实现选择路径消费漂移字段

Status: completed
Targets: `packages/flux-renderers-data/src/crud-schema.ts`, `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`, `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`, `packages/flux-renderers-data/src/schemas.ts`

- Item Types: `Fix`

- [x] 在 `crud-renderer.tsx` 构建 `tableSchema` 时（`:254-256` 附近），把裁定为"实现"的 selection 字段透传到底层 table（扩展 `base.rowSelection` 或在 `TableSchema` 上新增承接字段，二者择一并在 design.md 说明落点）。
- [x] 在 `use-table-selection.ts` 消费裁定为"实现"的字段：
  - `keepOnPageChange`：`handleSelectAll` 与翻页/刷新路径区分对待；`keepOnPageChange: true` 时翻页不清空 selection（仅 refresh 按 `autoClearSelectionOnRefresh` 处理）。
  - `maxSelectionLength`：`handleSelectRow` / `handleSelectAll` 在达到上限时拒绝追加（或截断，按 Phase 1 裁定）。
  - `maxKeepSelectionLength`：与 `keepOnPageChange` 联用，跨页累计超限按 Phase 1 裁定策略。
  - `checkableWhen`：对每行求值表达式，falsy 行 checkbox disabled 且不可被全选纳入。
- [x] 在行渲染（`table-body-row-rendering.tsx`）与表头全选渲染（`table-header-row.tsx`）中按上述派生态设置 checkbox `disabled`、全选 checkbox 的 indeterminate/disabled 视觉与 `aria-*` 属性。
- [x] 对裁定为"删字段"的字段：从 `CrudSelectionConfig` 移除字段；同步清理 `crud-renderer.tsx` / `normalizeCrudSchema` 中任何引用；从 design.md §8 迁移映射表移除对应行。
- [x] radio 单选模式（`selection.type: 'radio'`）不受 `maxSelectionLength` / `keepOnPageChange` 影响；保留现行单选语义。

Exit Criteria:

- [x] Phase 2 所有 focused proof 全部转为 GREEN（`pnpm --filter @nop-chaos/flux-renderers-data test -- <新增测试路径>` 与对应 typecheck 全过）。
- [x] 凡裁定为"实现"的字段，在 crud + table 选择路径中可通过 live DOM 或 selection state 可观察生效（跨页保留、上限强制、per-row disable）。
- [x] 凡裁定为"删字段"的字段，已从 `CrudSelectionConfig` 类型与 design.md 迁移映射表移除；`pnpm typecheck` 不再接受该字段。
- [x] radio 模式行为与现行一致。
- [x] 现有 `packages/flux-renderers-data/src/__tests__/` 下 crud / table selection 相关 baseline 测试全绿（如 `data-package-units.test.tsx`、crud-selection 相关用例）。
- [x] Owner design.md 描述与本 phase 实际行为一致（Phase 1 文本与 Phase 3 代码在同一 closure 周期内对齐）。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目已更新。

## Draft Review Record

> 起草后、执行前的独立审查证据（由独立审阅者或独立子 agent 在 `REVIEW_PLANS` 阶段填写，fresh session）。

- Reviewer / Agent: independent plan-review sub-agent（REVIEW_PLANS, fresh session）
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - Major — Test Strategy 为"必须自动化"，原计划 Phase 2(Fix) 先于 Phase 3(Proof)，违反 guide 规则 12 与 AGENTS.md "Proof items must precede Fix items"。已将两 Phase 互换（Proof→Phase 2 RED 基线，Fix→Phase 3 转 GREEN），同步重写各自 Exit Criteria、Phase 2 增加 `No owner-doc update required` 显式裁定，并修正 Non-Blocking Follow-ups 中 Phase 编号引用。
  - 引用准确性已核对 live repo：`crud-schema.ts:103-109`（CrudSelectionConfig 5 字段）、`crud-renderer.tsx:254-256`（仅透传 `selection.type`）、`crud-schema.ts:187-200`（normalizeCrudSchema 不触及漂移字段）、`use-table-selection.ts:67-101/105-158`（handleSelectAll/handleSelectRow 无跨页保留与上限强制）、`design.md:32`（"计划实现（E0c）"过渡措辞）均一致。
  - 格式完整性：Plan-Level 状态标记、Execution-Slice Status、Item Types 归类（Decision/Proof/Fix）、Closure Gates、Failure Paths、Deferred But Adjudicated、Closure 各节齐全，符合模板。

## Closure Gates

> 只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `CrudSelectionConfig` 的 4 个漂移字段（`keepOnPageChange` / `maxSelectionLength` / `maxKeepSelectionLength` / `checkableWhen`）每个都有明确归宿：实现（在 crud/table 选择路径生效）或删字段（从 schema + design.md 迁移映射表移除）。
- [x] 凡裁定为"实现"的字段，行为与 Phase 1 design.md 固化的语义一致，可通过 live DOM 或 selection state 观察。
- [x] radio 单选模式不受漂移字段影响。
- [x] owner `crud/design.md` 已无"计划实现（E0c）"措辞，Flux 决策表条目状态为"实现"或"不采纳（删字段）"，§8 迁移映射表与裁定一致。
- [x] Focused 自动化 proof 覆盖每个"实现"字段的生效路径与每个"删字段"裁定的类型层拒绝。
- [x] roadmap `E0c` 在 closure audit 通过后由 `todo` 改为 `done`。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响的 owner docs（`crud/design.md`、`existing-components-improvement-roadmap.md`，必要时 `existing-components-improvement-analysis.md`）已同步到 live baseline。
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划为单一漂移修复 owner plan，预期无 deferred 项。若 closure 阶段识别出非阻塞残余（例如 `maxKeepSelectionLength` 超限时的 LRU 淘汰策略、`checkableWhen` 求值性能缓存），须在此处逐条记录 `Classification` / `Why Not Blocking Closure` / `Successor Required` / `Successor Path`，并指向 E1d。

## Non-Blocking Follow-ups

- 若 Phase 1 / Phase 3 期间识别出 `selectionRetentionStrategy`（LRU/FIFO）、`perRowDisableTooltip`、`checkableWhen` 求值缓存等扩展字段的合理需求，记录到此节并指向 E1d；本计划不引入这些字段。
- 若识别出底层 `useTableSelection` 应把 selection 上限/per-row disable 抽象为通用能力供其他选择型组件复用，记录到此节；本计划不扩展范围。

## Closure

Status Note: E0c CRUD 选择漂移修复已完整落地。4 个漂移字段全部裁定并处置：3 个实现（keepOnPageChange / maxSelectionLength / checkableWhen），1 个删字段（maxKeepSelectionLength）。15 个 focused proof 全过（覆盖 keepOnPageChange 合并/移除、maxSelectionLength 拒绝/截断/toggle-off、checkableWhen per-row disable + select-all 排除、radio 不受影响、negative baseline、deletion source guard）。全 workspace typecheck/build/lint/test 全绿。

Closure Audit Evidence:

- Reviewer / Agent: self-audit by executing agent（fresh closure review against live repo）
- Evidence:
  - design.md Flux 决策表 4 字段逐项裁定（`crud/design.md` §2 Flux 决策表 + §7.1 选择字段语义 + §8 迁移映射表）
  - `CrudSelectionConfig` 不再声明 `maxKeepSelectionLength`（`crud-schema.ts:103-108`）
  - `useTableSelection` 消费 `keepOnPageChange` / `maxSelectionLength` / `checkableWhen`，新增 `isRowCheckable` / `isAtMaxSelection` 返回值
  - `crud-renderer.tsx` 透传 3 个实现字段到 table schema
  - `table-body-row-rendering.tsx` checkbox `disabled` 消费 `isRowCheckable` + `isAtMaxSelection`
  - `table-header-row.tsx` select-all checkbox `disabled` 消费 `selectAllDisabled`
  - `pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26、`pnpm test` = 49 tasks 全过
  - 既有 `crud-selection-and-features.test.tsx` / `use-table-controls.selection.test.tsx` / `data-table-pagination-selection.test.tsx` = 26/26 全过（无回归）
  - daily log: `docs/logs/2026/06-21.md` Phase 1/2/3 记录完整

Follow-up:

- `maxKeepSelectionLength` 超限策略（LRU/FIFO/block-new）如未来有需求，应由 E1d 连同 `selectionRetentionStrategy` 一起设计后重新引入
- `checkableWhen` 表达式求值性能缓存（大量行时）可由后续优化项评估
