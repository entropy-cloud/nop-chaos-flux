# 288 Deep Audit 2026-05-14 Performance And Error-Fidelity Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,15-security-performance.md,19-error-fidelity.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中 retained performance-observability 与 action error-fidelity defects。

## Current Baseline

- 已落地 partial slice：`packages/word-editor-core/src/document-io.ts`, `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`, `packages/flux-action-core/src/action-dispatcher/{action-runners.ts,action-execution.ts}` 已收口 `15-01`, `15-04`, `15-07`, `19-01`, `19-02`，并有 focused regression proof。
- 当前 live baseline 已补齐 retained runtime gaps：`packages/flux-runtime/src/form-store.ts` 维护增量 summary counters，`packages/flux-runtime/src/form-runtime-status.ts` 不再为 `$form` summary 每次全量扫描 `fieldStates`，`packages/flux-runtime/src/status-owner.ts` 也不再通过 `JSON.stringify(...)` 为 readonly summary binding 生成版本键，而 `packages/flux-runtime/src/form-runtime-values.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-array.ts`, `packages/flux-runtime/src/runtime-owned-factories.ts` 现已把 dependent revalidation failure 提升到 owner-level diagnostics sink。

## Goals

- Close retained performance-observability defects from dimension `15`.
- Close retained action error-fidelity defects from dimension `19`.

## Non-Goals

- 不吸收 reactive precision 或 async failure-feedback defects；它们由 Plan `286` owning。
- 不接管 Plan `279` 或 Plan `280` scopes。

## Scope

### In Scope

- `15-01/02/04/05/07`
- `19-01/19-02`
- 相关 owner docs: `docs/architecture/form-validation.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/logs/2026/05-14.md`

### Out Of Scope

- `05-*`, `06-*`
- Any retained ID not listed in `In Scope`

## Execution Plan

### Phase 1 - Runtime Performance And Observability Closure

Status: completed
Targets: `packages/word-editor-core/src/**`, `packages/flux-runtime/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `15-01/02/04/05/07` so restore-path failure observability, summary hot-path cost, batch write behavior, dependent revalidation visibility, and formula no-op guard all meet the supported baseline.
- [x] Add or update focused tests proving the repaired performance/observability behavior.
- [x] Update affected owner docs if the supported performance/observability contract changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained IDs `15-01/02/04/05/07` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused tests covering restore observability, batch writes, dependent revalidation, and formula no-op behavior exist and pass.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Action Error-Fidelity Closure

Status: completed
Targets: `packages/flux-action-core/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `19-01/19-02` so monitor `onActionEnd` is fail-safe and failure-class results without `onError` have a default observable failure path.
- [x] Add or update focused tests proving the repaired action error-fidelity behavior.
- [x] Update affected owner docs if the supported action failure contract changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained IDs `19-01/19-02` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused tests covering fail-safe `onActionEnd` and default failure observability exist and pass.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, touched docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-14.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code, touched docs, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all touched defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] Affected docs/logs are updated, or `No owner-doc update required` is explicit.

## Closure Gates

- [x] All in-scope retained performance-observability and action error-fidelity defects are fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [x] No in-scope confirmed defect is silently deferred.
- [x] Required focused verification exists for every touched defect family.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. The final retained runtime gaps `15-02` and `15-05` are now closed on the live baseline: `$form` status summaries read incrementally maintained counters instead of rescanning `fieldStates`, readonly summary bindings no longer use `JSON.stringify(...)` versioning on the supported path, and dependent revalidation failures now surface through the runtime owner diagnostics sink while preserving focused proof plus full workspace verification.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d68897d6ffeDVLIclXmSIE6Ny`
- Evidence: Independent closure audit re-read this plan, linked analysis, touched runtime/docs files, and the final verification outputs. It confirmed `15-02` and `15-05` are now closed in live code, including the final `status-owner.ts` readonly binding versioning fix, focused runtime plus `flux-react` scope proof pass, and workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` are green with Turbo reporting `49 successful, 49 total`.

Follow-up:

- No remaining plan-owned work.
