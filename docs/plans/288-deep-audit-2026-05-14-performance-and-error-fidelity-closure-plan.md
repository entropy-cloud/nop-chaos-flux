# 288 Deep Audit 2026-05-14 Performance And Error-Fidelity Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,15-security-performance.md,19-error-fidelity.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中 retained performance-observability 与 action error-fidelity defects。

## Current Baseline

- `15-01/02/04/05/07` 仍显示恢复路径 observability、summary hot-path、batch write退化、dependent revalidation invisibility、以及 formula no-op guard 缺失。
- `19-01/19-02` 仍显示 action monitor `onActionEnd` fail-safety drift 与 failure-class default observable fallback 缺失。

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
- 相关 owner docs: `docs/architecture/action-algebra-formal-spec.md`, `docs/logs/2026/05-14.md`

### Out Of Scope

- `05-*`, `06-*`
- Any retained ID not listed in `In Scope`

## Execution Plan

### Phase 1 - Runtime Performance And Observability Closure

Status: planned
Targets: `packages/word-editor-core/src/**`, `packages/flux-runtime/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `15-01/02/04/05/07` so restore-path failure observability, summary hot-path cost, batch write behavior, dependent revalidation visibility, and formula no-op guard all meet the supported baseline.
- [ ] Add or update focused tests proving the repaired performance/observability behavior.
- [ ] Update affected owner docs if the supported performance/observability contract changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained IDs `15-01/02/04/05/07` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused tests covering restore observability, batch writes, dependent revalidation, and formula no-op behavior exist and pass.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Action Error-Fidelity Closure

Status: planned
Targets: `packages/flux-action-core/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `19-01/19-02` so monitor `onActionEnd` is fail-safe and failure-class results without `onError` have a default observable failure path.
- [ ] Add or update focused tests proving the repaired action error-fidelity behavior.
- [ ] Update affected owner docs if the supported action failure contract changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained IDs `19-01/19-02` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused tests covering fail-safe `onActionEnd` and default failure observability exist and pass.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched packages, touched docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-14.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code, touched docs, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for all touched defect families has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] Affected docs/logs are updated, or `No owner-doc update required` is explicit.

## Closure Gates

- [ ] All in-scope retained performance-observability and action error-fidelity defects are fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [ ] No in-scope confirmed defect is silently deferred.
- [ ] Required focused verification exists for every touched defect family.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Pending implementation, verification, and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- None currently; fill at closure if needed.
