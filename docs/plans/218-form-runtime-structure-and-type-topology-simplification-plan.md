# 218 Form Runtime Structure And Type Topology Simplification Plan

> Plan Status: planned
> Last Reviewed: 2026-05-06
> Source: `docs/analysis/over-engineering-analysis.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/{163-core-boundary-and-validation-owner-convergence-plan.md,185-large-file-hotspot-split-plan.md,200-duplicate-code-convergence-plan.md,201-surface-family-runtime-convergence-plan.md,211-runtime-state-reactivity-and-safety-closure-plan.md,217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md}`, `docs/architecture/{form-validation.md,flux-runtime-module-boundaries.md}`, live repo re-audit of `packages/flux-runtime/src/{form-runtime.ts,form-runtime-owner.ts,form-runtime-types.ts,form-runtime-state.ts,form-runtime-owner-field-states.ts,form-runtime-lifecycle.ts,form-runtime-submit.ts,form-runtime-validation.ts,form-runtime-submit-flow.ts}`
> Related: `docs/plans/217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md`, `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md`

## Purpose

把 `form-runtime` owner family 中仍然没有被现行 active/completed plans 收口的结构性维护负担收窄成一个可执行计划：只处理 `form-runtime-types.ts` 的内部类型拓扑过深问题，不重开 `flux-core` boundary、React hook/context API、surface family、validation behavior、或 broad large-file governance。计划完成态是：`form-runtime` 内部 shared-state/types 边界更易读，且 public/runtime semantics 保持不变。

## Current Baseline

- `docs/analysis/over-engineering-analysis.md` 指出的很多条目并不能直接转成执行项：把 `FormRuntime` / `PageRuntime` / `SurfaceRuntime` 从 `flux-core` 移走、删除公开 hooks、合并多个 React contexts、或把已拆分的小文件重新并回 owner file，都会和当前 baseline 冲突。
- `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md` 已经关闭 `core -> react -> runtime` 边界问题，并明确保留 host-neutral runtime contracts 在 `packages/flux-core/src/types/runtime.ts`。
- `docs/plans/185-large-file-hotspot-split-plan.md` 与 `docs/references/refactoring-guidelines.md` 已把当前拆分基线冻结为 thin orchestrator / owner-shaped modules，而不是“为了减少文件数再把小模块并回根文件”。
- `docs/plans/200-duplicate-code-convergence-plan.md` 已明确：只有 owner 清晰、且 live repo 证据足够的重复才应抽象；“看起来相似”的 helper 或 family-specific 结构不能直接收口成 shared abstraction。
- `docs/plans/201-surface-family-runtime-convergence-plan.md` 与 `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md` 已收口 surface/runtime/reactivity 相关历史问题；它们不是本计划的 reopen target。
- `docs/plans/217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md` 当前 owning 的是 confirmed defect set，例如 async observability、widget `className`、type/lifecycle residuals、a11y、hidden-field behavior、ghost dependencies。它不拥有 `form-runtime` 内部类型拓扑治理；但本计划也不得吸收 `217` 当前在 `form-runtime-validation.ts` 上的 active defect slices。
- live repo re-audit 仍确认 `packages/flux-runtime/src/form-runtime-types.ts` 的 internal state types 通过多层 `extends` 叠加，阅读 `ManagedFormRuntimeSharedState` 需要跨越 `FormRuntimeStoreScopeState`、`FormRuntimeInitialStateSlice`、`FormRuntimeValidationRunState`、`FormRuntimeRegistrationState`、`FormRuntimeValidationState`、`FormRuntimeExternalErrorState`、`FormRuntimeChildContractState`、`FormRuntimeOwnerState` 等多个中间层。
- `docs/plans/217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md` 已记录当前 workspace 仍可能存在与本计划无关的 repo-level verification blockers；因此 `218` 的 closure 必须把 full-workspace verification 写成 “attempted and honestly recorded”，不能把 unrelated blocker 误记成本计划未完成。
- 当前 `docs/architecture/form-validation.md` 与 `docs/architecture/flux-runtime-module-boundaries.md` 描述的是 owner behavior 和 module placement，不要求必须保留当前 internal state-type layering；因此只要 public semantics 和 owner/module baseline 不变，这组 internal simplification 与 owner docs 并不冲突。

## Goals

- 收窄 `form-runtime` internal state/type topology，让共享状态边界不再依赖过深的 `extends` 链才能读懂。
- 在不改变 `FormRuntime` / `ValidationScopeRuntime` / submit / hidden-field / owner lifecycle baseline 的前提下，改善 `form-runtime` owner family 的局部可维护性。
- 为结构性调整补上 focused verification，并诚实记录与 `217` 等相邻计划的边界。

## Non-Goals

- 不把 `packages/flux-core/src/types/runtime.ts` 中的 runtime contracts 迁移到 `flux-runtime`。
- 不删除或弱化 `packages/flux-react/src/hooks.ts` 的公开 hook surface。
- 不合并 `packages/flux-react/src/contexts.ts` 中的 multiple Provider baseline。
- 不把 `packages/flux-runtime/src/form-runtime-*.ts` 重新回并成单一大文件，只因为其中部分文件较短。
- 不做 repo-wide 大文件治理，也不以 `500+ lines` 作为本计划的直接 owner surface。
- 不处理 `217` 当前 active scope 中的 defect slices，尤其是 `form-runtime-validation.ts` 的 hidden-field behavior、validation accessibility、或其它 05-06 confirmed defect。
- 不把 `isLifecycleTransitional` 这类两处局部 helper 的机械去重包装成 owner-level 工作；如果未来还有更多 live evidence，再单独裁定。
- 不引入 `createCoreBase`、新的 shared package、或 broader duplicate sweep。

## Scope

### In Scope

- `packages/flux-runtime/src/form-runtime-types.ts`
- directly touched type-only consumers in `packages/flux-runtime/src/` if import or local alias updates are required by the regrouping
- directly affected focused tests for `form-runtime`
- `docs/architecture/form-validation.md` only if the final internal regrouping changes stable owner/module wording
- `docs/architecture/flux-runtime-module-boundaries.md` only if module ownership wording changes
- `docs/logs/2026/05-06.md`

### Out Of Scope

- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-react/src/{hooks.ts,contexts.ts,schema-renderer.tsx}`
- `packages/flux-runtime/src/surface-runtime.ts`
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- behavior changes in `packages/flux-runtime/src/{form-runtime.ts,form-runtime-owner.ts,form-runtime-lifecycle.ts,form-runtime-submit.ts}`
- designer/report/spreadsheet core abstractions
- `packages/flux-runtime/src/async-data/api-cache.ts`
- `packages/flux-runtime/src/projected-scope-store.ts`
- `packages/flux-core/src/{schema-diagnostics/manifest.ts,types/renderer-plugin.ts}`
- repo-wide comparator/shallow-equality convergence
- any change already owned by plans `163`, `185`, `200`, `201`, `211`, or active plan `217`

## Execution Plan

### Phase 1 - Re-Audit Internal Topology And Freeze The Narrow Owner Surface

Status: planned
Targets: `packages/flux-runtime/src/form-runtime-types.ts`, directly touched type-only consumers, this plan

- Item Types: `Decision | Proof`

- [ ] [Decision] Re-audit every internal state/type layer in `form-runtime-types.ts` and explicitly classify it as `keep`, `merge`, `rename`, or `delete`.
- [ ] [Decision] Freeze the cut line against active neighbors: this plan owns internal topology simplification only and must not absorb `217` defect fixes or reopen `163/185/200/201/211` adjudications.
- [ ] [Proof] Record the live before-state in this plan using repo-observable anchors, not the raw wording from `over-engineering-analysis.md`.

Exit Criteria:

- [ ] The exact in-scope type/topology items are frozen and auditable.
- [ ] The boundary against plan `217` and prior completed plans is explicitly recorded.
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Flatten Form Runtime Internal State Types

Status: planned
Targets: `packages/flux-runtime/src/form-runtime-types.ts`, directly touched type-only consumers, focused tests

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Replace the current deep internal `extends` chain with a smaller set of owner-facing internal state groups whose composition is readable without traversing most of the file.
- [ ] [Fix] Limit consumer edits to type-only or import-only adaptation; behavior changes in validation/submit/lifecycle paths remain out of scope.
- [ ] [Decision] Preserve any intermediate grouping that still carries real ownership meaning; do not force an arbitrary `2-3 interfaces only` target if live code becomes less clear.
- [ ] [Proof] Add or update focused tests that prove `form-runtime` behavior is unchanged after the internal type regrouping.

Exit Criteria:

- [ ] `form-runtime-types.ts` no longer relies on the current multi-hop relay chain from `FormRuntimeRegistrationState` through `FormRuntimeValidationState` / `FormRuntimeOwnerState` to explain shared owner state.
- [ ] Public/runtime semantics remain unchanged under focused proof.
- [ ] `docs/architecture/form-validation.md` and/or `docs/architecture/flux-runtime-module-boundaries.md` are updated only if stable ownership wording changes; otherwise explicitly record `No owner-doc update required`.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: in-scope runtime files, focused tests, this plan

- Item Types: `Proof | Decision`

- [ ] [Proof] Run focused verification for the regrouped internal state topology.
- [ ] [Proof] Attempt required workspace verification after code changes land, and record unrelated blockers honestly if they remain external to this plan.
- [ ] [Decision] Perform an independent closure audit that re-checks this plan against `over-engineering-analysis.md` and confirms only the justified narrow slice was taken.

Exit Criteria:

- [ ] Focused verification exists for all landed in-scope changes.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are attempted and honestly recorded, including any unrelated baseline blocker adjudication.
- [ ] Independent closure audit confirms no remaining plan-owned work in this narrow owner surface.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] Every in-scope topology item is fixed, or moved to explicit successor ownership with recorded reasoning.
- [ ] No in-scope item is silently downgraded into a broad “future over-engineering cleanup” bucket.
- [ ] The overlap with plans `163`, `185`, `200`, `201`, `211`, and `217` remains explicitly adjudicated.
- [ ] Focused verification exists for the internal state regrouping.
- [ ] Affected owner docs are synced to the live baseline, or each phase records why `No owner-doc update required` remains correct.
- [ ] Independent closure audit is completed and recorded below.
- [ ] `pnpm typecheck` attempted and recorded honestly
- [ ] `pnpm build` attempted and recorded honestly
- [ ] `pnpm lint` attempted and recorded honestly
- [ ] `pnpm test` attempted and recorded honestly

## Deferred But Adjudicated

### Broad `form-runtime` File Reshaping Beyond The Confirmed Internal Topology Slice

- Classification: `watch-only residual`
- Why Not Blocking Closure: current baseline explicitly prefers owner-shaped modules and thin orchestrators over “fewer files”; broader file-count or layout arguments do not become in-scope unless a live owner defect is separately confirmed.
- Successor Required: no

### Repo-Wide Over-Engineering Sweep

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: the source analysis mixes confirmed maintainability issues, optimization ideas, and recommendations that conflict with the current baseline; this plan intentionally owns only the one narrow slice that survived live re-audit.
- Successor Required: no

### Baseline-Conflicting Suggestions From `over-engineering-analysis.md`

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: moving runtime contracts out of `flux-core`, deleting public hooks, merging contexts, or merging owner-shaped small files back into larger files would conflict with current completed plans and refactoring guidance, so they are explicitly excluded rather than treated as silent leftovers.
- Successor Required: no

## Non-Blocking Follow-ups

- If future live evidence shows comparator duplication, designer-core base extraction, `api-cache` simplification, or manifest/plugin pruning are real owner defects, open separate owner-scoped plans instead of expanding this plan.

## Closure

Status Note: _(to be filled when plan is completed)_

Closure Audit Evidence:

- Reviewer / Agent: _(to be filled)_
- Evidence: _(to be filled)_

Follow-up:

- no remaining plan-owned work once this narrow slice is closed
