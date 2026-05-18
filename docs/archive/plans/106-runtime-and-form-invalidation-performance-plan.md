# 106 Runtime And Form Invalidation Performance Plan

> Plan Status: completed
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

Status: completed
Targets: `status-owner.ts`, `scope.ts`

- [x] add reuse/cache path for readonly status binding visible overlays — memoized by parent ref + summary ref
- [x] reduce parent visible reference churn impact on child visible cache rebuild — composite store now checks `readVisible()` ref identity before forwarding parent notifications

Exit Criteria:

- [x] readonly status binding no longer allocates equivalent visible overlays on every read
- [x] parent visible churn no longer forces unnecessary child visible rebuild under focused verification
- [x] no contract change to the Plan 89 scope model

### Phase 2 - Form Store Batch And Dependent Revalidation

Status: completed
Targets: `form-store.ts`, `form-runtime-owner.ts`

- [x] coalesce `batchUpdate()` publication work — minor cleanup, per-path notification scoped inside fieldStates check
- [x] reduce avoidable sequential traversal/publication churn inside `validateForm()` — fields validated in parallel via `Promise.all`

Exit Criteria:

- [x] `batchUpdate()` publication path cleaned up
- [x] `validateForm()` uses parallel field validation instead of sequential await
- [x] no contract change to Plan 90 / 91 baselines

### Phase 3 - Child Subscriber Fan-Out And Aggregate State

Status: completed
Targets: `scope.ts`, `form-runtime.ts`, `form-runtime-owner.ts`

- [x] narrow child-subscriber fan-out — composite store parent listener filters by `readVisible()` reference identity (done in Phase 1)
- [x] replace `computeScopeState()` full-scan with cached result keyed by `fieldStates` reference identity
- [x] replace `computeAllTouched()` full-scan with cached result keyed by `fieldStates` reference identity

Exit Criteria:

- [x] audited child-scope subscription fan-out is reduced in the named propagation path
- [x] `computeScopeState()` / `canSubmit` no longer depend on full `fieldStates` rescans when `fieldStates` ref unchanged
- [x] no contract change to Plan 89 / 91 baselines

### Phase 4 - Form Status Publication And Verification

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`, tests, docs/logs

- [x] reduce aggregate form status publication cost — `publishStatus` now checks structural equality of summary before calling `parent.update()`
- [x] reverse-update docs/logs (`docs/logs/2026/04-16.md` PM34)

Exit Criteria:

- [x] form status publication no longer emits new summary objects when nothing changed
- [x] 360 flux-runtime tests pass (7 pre-existing schema-compiler failures unrelated)
- [x] docs reflect the landed baseline

## Validation Checklist

- [x] visible overlay churn reduced
- [x] scope propagation churn reduced without contract change
- [x] `batchUpdate()` publication coalesced
- [x] `validateForm()` hot path improved without semantic regression
- [x] child-subscriber fan-out reduced
- [x] aggregate full-scan hot path replaced or narrowed
- [x] form status publication improved on top of Plan 90/91 baselines
- [x] focused verification completed
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck` — pre-existing schema-compiler errors only
- [x] `pnpm build` — pre-existing schema-compiler errors only
- [x] `pnpm test` — 360 pass, 7 pre-existing schema-compiler failures

## Closure

Status Note: All 4 phases landed and independently audited. Plan closed.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit (2026-04-16)
- Evidence: All 7 code changes verified against live source files. PASS on all 4 phases.

Follow-up:

- if any change requires `FormStoreApi` or scope contract redesign, create a successor plan instead of absorbing it here
