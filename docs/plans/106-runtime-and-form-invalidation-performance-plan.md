# 106 Runtime And Form Invalidation Performance Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 5.1-5.10 and 6.2, `docs/architecture/performance-design-requirements.md`, `docs/architecture/form-validation.md`, `docs/architecture/api-data-source.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/89-scope-visible-view-and-materialization-refactor-plan.md`, `docs/plans/90-form-store-per-path-subscription-plan.md`, `docs/plans/91-form-field-state-normalization-refactor-plan.md`

## Purpose

在不重开 Plan 89 / 90 / 91 语义基线的前提下，收口 runtime scope propagation、form-store invalidation、status publication、以及 aggregate-state hot path 的 confirmed performance defects。

## Current Baseline

- readonly status binding visible overlay 仍无 cache。
- parent visible reference churn 仍会级联 child visible cache rebuild。
- `batchUpdate()` 与 dependent revalidation 仍存在 per-path / per-dependent fan-out。
- `validateForm()` 仍以 sequential field traversal 为主。
- form aggregate/status publication 仍残留全量扫描路径。
- `validateForm()` 仍以 sequential field traversal 为主，且 child-scope subscriber fan-out / changed-root propagation 仍偏宽。
- `computeScopeState()` / `canSubmit` 仍依赖全量 `fieldStates` 扫描；对应修复需要明确落在现有 baseline 上，而不是重设计 field-state shape。
- data-source lookup、ignored-root normalization、以及 result-mapping allocation 已移交 Plan 110；本计划不再拥有这些 API-adjacent runtime surfaces。
- Plan 89 已定义 scope model；Plan 90 已定义 per-path subscription；Plan 91 已定义 normalized `fieldStates` baseline。

## Goals

- 优化 invalidation/publication 成本，而不改变 Plan 89 / 90 / 91 的 contract。
- 收敛 visible overlay rebuild 与 broad scope propagation。
- 让 form-store batch 与 dependent revalidation 走真正 coalesced publish。
- 关闭 `validateForm()` sequential traversal、child subscriber fan-out、以及 aggregate full-scan 这三类仍未收口的 confirmed defects。

## Non-Goals

- 不重设计 Plan 89 的 `readOwn` / `readVisible` / `materializeVisible` / overlay semantics。
- 不重设计 Plan 90 的 `FormStoreApi` / projected-store subscription contract。
- 不重设计 Plan 91 的 normalized `fieldStates` shape。

## Scope

### In Scope

- `packages/flux-runtime/src/status-owner.ts`
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-runtime/src/form-store.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- tests/docs/logs

### Out Of Scope

- scope API redesign
- form-store API redesign
- normalized `fieldStates` redesign
- data-source lookup / polling / request-runtime / cache-retention work (Plan 110 owner)

## Execution Plan

### Phase 1 - Visible Overlay And Scope Propagation

Status: planned
Targets: `status-owner.ts`, `scope.ts`

- [ ] add reuse/cache path for readonly status binding visible overlays
- [ ] reduce parent visible reference churn impact on child visible cache rebuild

Exit Criteria:

- [ ] readonly status binding no longer allocates equivalent visible overlays on every read
- [ ] parent visible churn no longer forces unnecessary child visible rebuild under focused verification
- [ ] no contract change to the Plan 89 scope model

### Phase 2 - Form Store Batch And Dependent Revalidation

Status: planned
Targets: `form-store.ts`, `form-runtime-owner.ts`

- [ ] coalesce `batchUpdate()` publication work
- [ ] coalesce dependent revalidation publication work
- [ ] reduce avoidable sequential traversal/publication churn inside `validateForm()` while preserving semantics

Exit Criteria:

- [ ] `batchUpdate()` no longer outer-notifies once per changed path in the audited hot path
- [ ] dependent revalidation no longer publishes once per dependent field
- [ ] `validateForm()` keeps contract semantics while no longer relying on the audited sequential field-validation traversal baseline
- [ ] no contract change to Plan 90 / 91 baselines

### Phase 3 - Child Subscriber Fan-Out And Aggregate State

Status: planned
Targets: `scope.ts`, `form-runtime.ts`, `form-runtime-owner.ts`

- [ ] narrow child-subscriber fan-out by carrying enough change metadata to skip unrelated child scopes earlier
- [ ] replace audited `computeScopeState()` / `canSubmit` full-scan hot path with incremental aggregate tracking on top of the existing normalized field-state baseline

Exit Criteria:

- [ ] audited child-scope subscription fan-out is reduced in the named propagation path
- [ ] `computeScopeState()` / `canSubmit` no longer depend on full `fieldStates` rescans in the audited hot path
- [ ] no contract change to Plan 89 / 91 baselines

### Phase 4 - Form Status Publication And Verification

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`, tests, docs/logs

- [ ] reduce aggregate form status publication cost on top of the existing Plan 90/91 baseline
- [ ] add/update focused tests and reverse-update docs/logs

Exit Criteria:

- [ ] form status publication no longer depends on avoidable full-scan hot paths in the audited scenario
- [ ] focused tests cover scope invalidation, form batch publish, and aggregate-state behavior
- [ ] docs reflect the landed baseline

## Validation Checklist

- [ ] visible overlay churn reduced
- [ ] scope propagation churn reduced without contract change
- [ ] `batchUpdate()` publication coalesced
- [ ] dependent revalidation publication coalesced
- [ ] `validateForm()` hot path improved without semantic regression
- [ ] child-subscriber fan-out reduced
- [ ] aggregate full-scan hot path replaced or narrowed
- [ ] form status publication improved on top of Plan 90/91 baselines
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after all in-scope invalidation/performance defects are closed without reopening Plan 89, 90, or 91 contract work.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if any change requires `FormStoreApi` or scope contract redesign, create a successor plan instead of absorbing it here
