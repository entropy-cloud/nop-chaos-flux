# 423 UX 设计合规性修复计划（2026-05-21 审查）

> Plan Status: completed
> Last Reviewed: 2026-05-21
> Source: `docs/analysis/2026-05-21-ux-audit/summary.md`, `docs/analysis/2026-05-21-ux-audit/review.md`
> Related: `docs/plans/405-ux-audit-2026-05-19-remediation-plan.md`, `docs/references/ui-interaction-review-checklist.md`, `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`, `docs/components/dynamic-renderer/design.md`, `docs/components/crud/design.md`, `docs/components/table/design.md`, `docs/architecture/surface-owner.md`, `docs/architecture/value-adaptation-and-detail-field.md`

## Purpose

基于 `docs/analysis/2026-05-21-ux-audit/` 的 4 轮迭代发现 + 独立复核，收口本轮确认保留的 6 个 MEDIUM UX 缺陷和 2 个 LOW 便捷性缺口，使树搜索、异步 pending 反馈、CRUD 空状态能力和 detail/drawer 退出路径达到一致、可见、可验证的当前基线。

## Current Baseline

- `docs/analysis/2026-05-21-ux-audit/summary.md` 已确认 8 个修复目标：6 个 MEDIUM、2 个 LOW，均已完成独立复核，无驳回项。
- 与 `docs/plans/405-ux-audit-2026-05-19-remediation-plan.md` 相比，本轮问题不再集中在删除按钮、focus-visible 或分页组件替换，而是集中在未统一收敛的异步反馈和空状态表达。
- 当前 live gap 可按 4 个结果面归类：
  1. `tree-controls.tsx` 的 searchable tree 缺少“无结果空态”和“清空查询”两个基础微交互。
  2. `dynamic-renderer.tsx`、`detail-surface.tsx`、`detail-view.tsx`、`detail-field.tsx`、`table-quick-edit-cell.tsx` 的不同异步阶段缺少统一且可见的 pending 反馈。
  3. `crud-renderer.tsx` 会把 rich empty content 压平成纯文本，导致 CRUD 与 Table 的空状态能力不一致。
  4. `detail-surface.tsx` 的 drawer 模式缺少稳定可见的头部关闭入口。
- 本计划起草前的 live-repo 预检已确认 `pnpm typecheck`、`pnpm build`、`pnpm lint` 通过；该结论来自 2026-05-21 审查执行前验证，而非 audit summary 文本本身。
- 本计划保持为单个 owner plan，不再拆成多个 micro-plan；但每个 Phase 必须在同一 plan 内明确自己的结果面、proof 义务和 owner doc，同步避免“一个 plan 过宽”与“plan 个数过多”两类历史问题。
- 当前 owner-doc 基线按结果面先行裁定如下：
  1. tree searchable 微交互 -> `docs/components/input-tree/design.md`、`docs/components/tree-select/design.md`
  2. `dynamic-renderer` loading feedback -> `docs/components/dynamic-renderer/design.md`
  3. detail-family pending feedback -> `docs/architecture/value-adaptation-and-detail-field.md`
  4. table quick-edit saving feedback -> `docs/components/table/design.md`
  5. CRUD rich empty content -> `docs/components/crud/design.md` 与 `docs/components/table/design.md`
  6. drawer close affordance -> `docs/architecture/surface-owner.md` 与 `docs/components/drawer/design.md`
- `docs/references/ui-interaction-review-checklist.md` 只作为 cross-cutting reference 候选更新，不再替代 owner doc adjudication。

## Goals

- 修复本轮复核保留的 6 个 MEDIUM 问题。
- 修复本轮复核降级但仍保留的 2 个 LOW 问题。
- 为 searchable tree 建立完整的“无结果 / 清空查询”基础交互。
- 为 detail / quick-edit / dynamic renderer 建立统一的可见 pending 反馈基线。
- 让 CRUD 保留与 Table 一致的 richer empty content 表达能力。
- 为 drawer/detail surface 提供稳定可见的关闭入口，并将相关规范写回当前 owner doc / reference baseline。

## Non-Goals

- 不重构 `tree-controls`、`detail-view`、`crud-renderer`、`table-quick-edit` 的整体架构或状态所有权。
- 不引入新的设计系统组件或全局主题机制。
- 不把本计划扩展为全仓库所有 searchable 输入、所有 pending 按钮的一次性治理；本计划只覆盖 2026-05-21 审查命中的 in-scope live defects。
- 不处理 2026-05-19 审查中已 deferred 的 `input-number` suffix/stepper 布局问题或其他历史 residual。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
- `packages/flux-renderers-basic/src/dynamic-renderer.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-data/src/crud-renderer.tsx`
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`
- 受影响文件的 focused tests
- `docs/components/input-tree/design.md`
- `docs/components/tree-select/design.md`
- `docs/components/dynamic-renderer/design.md`
- `docs/components/crud/design.md`
- `docs/components/table/design.md`
- `docs/components/drawer/design.md`
- `docs/architecture/surface-owner.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/references/ui-interaction-review-checklist.md`（仅作为 cross-cutting reference，非 owner doc 替代）
- `docs/logs/` 对应日期收口记录

### Out Of Scope

- 新增完全通用的 async button primitive
- CRUD / Table 的分页、删除按钮、focus-visible 等已在 2026-05-19 队列中收口的问题
- 新的 e2e 场景扩展，除非执行中证明现有单测无法诚实覆盖变更
- 与本轮 findings 无关的视觉 polish

## Execution Plan

### Phase 1 - Tree 搜索微交互收口

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/tree-controls.tsx`, focused tests under `packages/flux-renderers-form-advanced/src/**`, `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`

- Item Types: `Fix | Proof`

- [x] 为 searchable `TreeOptionList` 增加“零结果”空状态，避免搜索命中为空时直接留白。
- [x] 为 tree 搜索输入增加可见 clear affordance，并确认键盘与 pointer 路径都可恢复到空查询状态。
- [x] 更新 `docs/components/input-tree/design.md` 和 `docs/components/tree-select/design.md`，写明 searchable tree family 的零结果空态与 clear affordance 当前基线。
- [x] 如本次修复沉淀出跨组件通用规则，再同步 `docs/references/ui-interaction-review-checklist.md`；该 reference 更新不能替代前述 owner doc 更新。
- [x] 补充 focused tests，覆盖 searchable tree 的 query filtering、zero-results rendering、clear interaction。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] searchable tree 在零结果时显示明确空态而非空白面板。
- [x] searchable tree 在 query 非空时提供可发现的 clear affordance，清空后列表恢复。
- [x] focused tests 覆盖零结果和 clear 交互。
- [x] `docs/components/input-tree/design.md` 和 `docs/components/tree-select/design.md` 已同步 searchable tree 当前交互基线；若另补 cross-cutting reference，也已同步完成。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - 异步 Pending 反馈统一

Status: completed
Targets: `packages/flux-renderers-basic/src/dynamic-renderer.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`, `docs/components/dynamic-renderer/design.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/components/table/design.md`

- Item Types: `Fix | Decision | Proof`

- [x] 为 `dynamic-renderer` 增加内建 loading UI，明确区分 loading / schema-ready / error 三个可见状态。
- [x] 为 `detail-surface` 的 confirming 按钮补充 `Spinner` 或等价的强可见 pending 反馈。
- [x] 为 `detail-view` / `detail-field` 的异步打开阶段增加统一的 open-pending 反馈，并裁定采用“trigger pending”还是“surface 先开再加载”的单一基线。
- [x] 为 `table-quick-edit-cell` 的 saving 状态增加可见保存反馈，覆盖 inline / dialog 两条路径。
- [x] 更新 `docs/components/dynamic-renderer/design.md`，写明 renderer-owned loading state 的可见反馈基线。
- [x] 更新 `docs/architecture/value-adaptation-and-detail-field.md`，写明 detail-family 的 open-pending / confirm-pending 当前交互基线。
- [x] 更新 `docs/components/table/design.md`，写明 quick-edit saving feedback 的当前基线。
- [x] 如本次修复沉淀出跨组件通用 async interaction 规则，再同步 `docs/references/ui-interaction-review-checklist.md`；该 reference 更新不能替代前述 owner doc 更新。
- [x] 补充 focused tests，证明上述 pending UI 在关键状态切换中可见且不会破坏原有提交/打开语义。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `dynamic-renderer`、`detail-surface`、`detail-view` / `detail-field`、`table-quick-edit` 的相关 async 阶段均具备明确可见的 pending 反馈。
- [x] `detail-view` 与 `detail-field` 采用同一套异步打开反馈策略，不再分叉。
- [x] `docs/components/dynamic-renderer/design.md`、`docs/architecture/value-adaptation-and-detail-field.md`、`docs/components/table/design.md` 已分别同步对应子结果面的当前基线。
- [x] focused tests 覆盖至少一条 dynamic loading、一条 detail open pending、一条 detail confirm pending、一条 quick-edit saving 路径。
- [x] 如需补充 cross-cutting rule，`docs/references/ui-interaction-review-checklist.md` 也已同步；如无需补充，日志中已记录“不需要额外 reference update”的裁定理由。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - CRUD richer empty state 收口

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, focused tests under affected data-renderer packages, `docs/components/crud/design.md`, `docs/components/table/design.md`

- Item Types: `Fix | Proof`

- [x] 修复 `crud-renderer` 对 `emptyContent` 的字符串化收窄，保留 richer empty content 能力并与 table 路径对齐。
- [x] 更新 `docs/components/crud/design.md` 和 `docs/components/table/design.md`，写明 CRUD -> Table 路径下 richer empty content 的当前契约。
- [x] 如本次修复沉淀出跨组件 empty-state 规则，再同步 `docs/references/ui-interaction-review-checklist.md`；该 reference 更新不能替代前述 owner doc 更新。
- [x] 补充 focused tests，证明 CRUD richer empty content 可透传。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] CRUD 不再把 non-string `emptyContent` 压平成默认纯文本，rich empty content 可在 live code path 中透传。
- [x] focused tests 覆盖 rich empty content 透传。
- [x] `docs/components/crud/design.md` 与 `docs/components/table/design.md` 已同步 richer empty state baseline；若另补 cross-cutting reference，也已同步完成。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Drawer 退出路径收口

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`, focused tests under affected form-advanced packages, `docs/architecture/surface-owner.md`, `docs/components/drawer/design.md`

- Item Types: `Fix | Proof`

- [x] 为 `detail-surface` drawer 模式增加可见头部关闭入口，并验证与现有 footer close/cancel 行为不冲突。
- [x] 更新 `docs/architecture/surface-owner.md` 与 `docs/components/drawer/design.md`，写明 drawer family 的稳定可见关闭入口当前基线。
- [x] 如本次修复沉淀出跨组件 surface exit 规则，再同步 `docs/references/ui-interaction-review-checklist.md`；该 reference 更新不能替代前述 owner doc 更新。
- [x] 补充 focused tests，证明 drawer close affordance 可渲染且不破坏关闭语义。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] drawer 模式有稳定可见的头部关闭按钮，且与既有 `onOpenChange` / footer close 行为兼容。
- [x] focused tests 覆盖 drawer close affordance。
- [x] `docs/architecture/surface-owner.md` 与 `docs/components/drawer/design.md` 已同步 drawer close affordance baseline；若另补 cross-cutting reference，也已同步完成。
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 - 闭环验证与收口审计准备

Status: completed
Targets: `docs/logs/{year}/{month}-{day}.md`, final verification evidence across affected packages

- Item Types: `Decision | Proof | Follow-up`

- [x] 复核前四个 Phase 的 live behavior、tests 和文档同步结果，确认不存在遗漏的 plan-owned work。
- [x] 记录 plan 执行与 closure audit 证据到对应 `docs/logs/` 条目。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] 前四个 Phase 的 owner-doc obligations 已在各 Phase 内完成，不再遗留到 closure 阶段。
- [x] `docs/logs/` 记录了实施结果、验证命令和 closure audit 证据。
- [x] No additional successor plan required for any in-scope confirmed live defect.
- [x] No owner-doc update required；本 Phase 只做 proof / log / closure-audit 准备，不改变 live baseline 或 owner behavior。
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 2026-05-21 审查保留的 6 个 MEDIUM 和 2 个 LOW 均已完成明确裁定，不存在静默降级
- [x] searchable tree、async pending feedback、CRUD richer empty state、drawer close affordance 的行为结果已达成
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline；如另有 cross-cutting reference 更新，也已完成
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

无。当前 8 个 findings 均为已确认的 in-scope live defects / UX gaps，不在计划起草阶段做 deferred 裁定。

## Non-Blocking Follow-ups

- 若执行中发现多个组件需要共享 async pending primitive，但该抽象不是当前 findings closure 的必需前提，可作为后续优化项单列 successor plan。

## Closure

Status Note: 所有 4 个结果面均已在 live code、focused tests 和 owner docs 中收口；workspace verification 与独立 closure audit 均已完成，无剩余 plan-owned work。

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1b80011e5ffeFL43pAvvetYt9z`
- Evidence: 初次 closure audit 发现 drawer close proof 不足；补充 `packages/flux-renderers-form-advanced/src/detail-view/detail-field-basic.test.tsx` 的 header close-path focused assertion 后，结合 `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` 全绿，可关闭本计划。

Follow-up:

- no remaining plan-owned work
