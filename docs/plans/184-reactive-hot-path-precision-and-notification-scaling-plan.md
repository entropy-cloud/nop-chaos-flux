# 184 Reactive Hot-Path Precision And Notification Scaling Plan

> Plan Status: planned
> Last Reviewed: 2026-05-02
> Source: `docs/plans/165-reactive-subscription-precision-plan.md`, `docs/plans/170-field-interaction-reactivity-and-async-safety-successor-plan.md`, `docs/plans/173-adversarial-review-2-critical-findings-remediation-plan.md`, `docs/plans/182-deep-audit-full-3-mechanical-fixes-plan.md`, live code in `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/form-state.ts`, `packages/flux-react/src/node-renderer-effects.ts`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/scope-change.ts`
> Related: `docs/architecture/dependency-tracking.md`, `docs/architecture/form-validation.md`, `docs/architecture/renderer-runtime.md`

## Purpose

收口当前仍未被已关闭 follow-up 计划真正 owning 的响应式热路径残留：`requiredWhen`/`requiredUnless` 仍走整表 values 订阅，`scopeChangeHitsDependencies` 的多段路径命中仍是 O(n\*m) 双循环，`diffAndNotifyValuePaths` 仍线性扫描所有 path listener，`useNodeLifecycleActions` 仍保留 broad dependency-array 模式。

这些问题都属于同一个 owner surface：reactive precision 与 notification scaling。在 `Plan 165`、`Plan 170`、`Plan 173` 已分别收口其它子面后，这一残留需要单独计划才能诚实关闭。

## Current Baseline

- `docs/plans/165-reactive-subscription-precision-plan.md` 已完成，但其 Non-Goals 和 Follow-up 明确把 `diffAndNotifyValuePaths` 线性扫描留到后续处理。
- `docs/plans/170-field-interaction-reactivity-and-async-safety-successor-plan.md` 已完成，但其 Phase 2 明确接受了“动态 required 规则激活时仍走 full-store”的最小基线，没有继续做到真正 per-path 订阅。
- `packages/flux-react/src/field-frame.tsx` 当前动态 required 路径仍调用 `useCurrentFormState((state) => isFieldEffectivelyRequired(validationModel, name, state.values), ...)`；一旦存在 `requiredWhen` / `requiredUnless` 规则，就订阅整个 `state.values`。
- `packages/flux-react/src/form-state.ts` 的 `isFieldEffectivelyRequired(...)` 仍直接对整个 values 对象执行 `getIn(values, rule.path)`，没有暴露依赖路径提取结果给调用方。
- `packages/flux-runtime/src/scope-change.ts` 已对单段 root path 使用 `Set.has()` 快速路径，但多段路径仍回退到 `for changePath` × `for depPath` 的 `pathsOverlap(...)` 双循环。
- `packages/flux-runtime/src/form-store.ts` 的 `diffAndNotifyValuePaths(before, after)` 仍遍历 `pathListeners.keys()` 中的所有订阅路径并对每个路径执行 `getIn(before, path)` / `getIn(after, path)`。
- `packages/flux-react/src/node-renderer-effects.ts` 的 `useNodeLifecycleActions()` 仍依赖 `[input.helpers, input.lifecycleActions, input.nodeInstance]` 整体对象身份，而不是 latest-ref / effect-event 风格的稳定 dispatch path。
- `docs/architecture/dependency-tracking.md` 当前已把 collection/row translation 留作更后续的 Phase 4；本计划不拥有那一块更大的架构工作。

## Goals

- 让动态 required 计算订阅真正依赖的路径，而不是整张表的 values 快照。
- 让多段 dependency path 命中与 form-store value path 通知不再依赖全量 listener 扫描。
- 让 node lifecycle action effect 使用更稳定的 latest-value pattern，避免广义对象身份变化干扰 mount/unmount dispatch。
- 为这些热路径增加 focused regression coverage，并同步 owner docs。

## Non-Goals

- 不重做 `docs/architecture/dependency-tracking.md` Phase 4 的 row-scope translation / collection owner reconciliation。
- 不扩大到 dialog/surface hostScope 或 table/crud selector 精度工作；这些已由 `Plan 165` 收口。
- 不改变 validation owner family、submit semantics、或 broader form-validation policy。
- 不处理 `stableStringify` / api-cache 问题；那不是本计划的 reactive precision owner surface。
- 不引入全仓库范围的 React.memo 包裹策略。

## Scope

### In Scope

- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/form-state.ts`
- `packages/flux-react/src/node-renderer-effects.ts`
- `packages/flux-runtime/src/form-store.ts`
- `packages/flux-runtime/src/scope-change.ts`
- focused tests for requiredness subscriptions, scope-change matching, form-store notifications, and lifecycle actions
- `docs/architecture/form-validation.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/renderer-runtime.md`

### Out Of Scope

- collection/row root translation work from `docs/architecture/dependency-tracking.md` Phase 4
- report/word/designer host page reactive precision
- generic form renderer refactors outside the in-scope hot paths
- async request/cache concerns unrelated to these subscriptions and notifications

## Execution Plan

### Phase 1 - Remove Whole-Store Requiredness Subscription

Status: planned
Targets: `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/form-state.ts`, focused tests, `docs/architecture/form-validation.md`

- [ ] Extract an explicit dependency-path helper for `requiredWhen` / `requiredUnless` rules from the compiled validation field metadata.
- [ ] Replace the current full-values subscription in `FieldFrame` with path-targeted reads that subscribe only to the requiredness dependency paths for the active field.
- [ ] Preserve the existing fast path for unconditional `required` and for fields with no dynamic required rules.
- [ ] Add focused tests proving unrelated field writes no longer wake the required-indicator path while actual dependency writes still recompute correctly.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Dynamic requiredness no longer depends on whole-form `state.values` subscription in the supported path.
- [ ] Focused tests prove unrelated writes do not retrigger requiredness recomputation for in-scope cases.
- [ ] `docs/architecture/form-validation.md` is updated to describe the final dynamic-required subscription baseline.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Scale Dependency Matching And Value-Path Notifications

Status: planned
Targets: `packages/flux-runtime/src/scope-change.ts`, `packages/flux-runtime/src/form-store.ts`, focused tests, `docs/architecture/dependency-tracking.md`

- [ ] Replace the current multi-segment `scopeChangeHitsDependencies` nested-loop path overlap check with an indexed or prefix-aware strategy that scales with the actual changed/dependent path sets.
- [ ] Replace `diffAndNotifyValuePaths` full listener scanning with path-aware notification/indexing for exact, ancestor, and descendant listeners in the common `setValue` / `batchUpdate` paths.
- [ ] Preserve conservative behavior for wildcard/replace cases and keep the public `subscribeToPath(...)` API unchanged.
- [ ] Add focused regression tests covering multi-segment overlap correctness and path notification correctness for exact, ancestor, and descendant subscriptions.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Multi-segment dependency matching no longer relies on O(n\*m) pairwise scans in the supported path.
- [ ] Form-store path notifications no longer require scanning every subscribed path after each value update in the supported path.
- [ ] Existing subscription semantics remain correct for exact, ancestor, descendant, and wildcard-style cases covered by tests.
- [ ] `docs/architecture/dependency-tracking.md` is updated to the final matching/notification baseline.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Stabilize Lifecycle Action Effect Wiring

Status: planned
Targets: `packages/flux-react/src/node-renderer-effects.ts`, focused tests, `docs/architecture/renderer-runtime.md`

- [ ] Move `useNodeLifecycleActions()` to a latest-ref / effect-stable pattern so lifecycle dispatch does not depend on broad object-identity arrays.
- [ ] Ensure mount dispatch still runs once per mounted node instance and unmount dispatch still uses the latest helper/action references without accidental resubscribe churn.
- [ ] Add focused tests covering helper/lifecycle object identity changes and node-instance replacement boundaries.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `useNodeLifecycleActions()` no longer relies on the broad dependency-array pattern that triggered the original follow-up note.
- [ ] Focused tests prove lifecycle dispatch semantics remain correct across identity churn and unmount.
- [ ] `docs/architecture/renderer-runtime.md` is updated to the final lifecycle-effect baseline.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Verification And Closure Audit

Status: planned
Targets: in-scope packages, focused tests, this plan

- [ ] Run focused verification for requiredness subscriptions, dependency matching, value-path notification, and lifecycle action behavior.
- [ ] Run required workspace verification after code changes land.
- [ ] Perform an independent closure audit.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Focused verification is recorded for each landed slice.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining in-scope reactive hot-path residuals owned by this plan.
- [ ] `docs/logs/` 对应日期条目已更新。

## Validation Checklist

> **关闭条件**：只有本 section 所有条目及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [ ] Dynamic requiredness uses dependency-path subscription instead of whole-store subscription in the in-scope path.
- [ ] Multi-segment dependency matching is no longer O(n\*m) in the in-scope implementation path.
- [ ] Form-store value-path notifications no longer scan every path listener in the in-scope implementation path.
- [ ] Lifecycle action dispatch uses a stable latest-value pattern.
- [ ] Relevant docs are updated to the final baseline.
- [ ] Focused verification is complete.
- [ ] Independent closure audit is complete and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending execution.

Closure Audit Evidence:

- Reviewer / Agent: TBD
- Evidence: TBD

Follow-up:

- Collection/row root translation from `docs/architecture/dependency-tracking.md` Phase 4 remains out of scope and should get its own owner plan only if it becomes active work.
- Otherwise, no remaining plan-owned work.
