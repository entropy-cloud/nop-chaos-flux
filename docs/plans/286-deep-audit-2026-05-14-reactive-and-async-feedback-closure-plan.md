# 286 Deep Audit 2026-05-14 Reactive And Async Feedback Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,05-reactive-precision.md,06-async-safety.md}`
> Related: `docs/plans/279-resolved-boolean-props-contract-plan.md`, `docs/plans/280-open-ended-adversarial-review-2026-05-14-remediation-plan.md`, `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`, `docs/plans/284-deep-audit-2026-05-14-test-hard-gate-and-coverage-closure-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中 retained reactive precision defects 与不属于 Plan `280` 的 async failure-feedback defects。

## Current Baseline

- `05-02/03/04/05` 仍显示 host broad subscription、nested changed-path precision 丢失、non-form requiredness 欠订阅、以及 broad page refresh subscription。
- `05-06` 不在本计划内：它与 `09-08` 指向同一 `inspector-shell-renderer` root-identity defect，由 Plan `282` owning。
- `06-01/04/05/06/07/08/09/10` 仍显示 stale-drop vs true abort、console-only failure、resolved failure ignored、以及 fire-and-forget dispatch failure 丢失。
- `06-02` 不在本计划内：它位于 `detail-view.tsx` 同一 renderer surface，Plan `280` 已接管该 surface 的 active execution ownership。
- Plan `279` 已接管 boolean-like prop normalization；本计划不在 renderer 侧补充 boolean coercion。
- Plan `284` 已接管 retained hotspot omnibus test assets 的拆分与迁移；本计划新增 focused proof 时必须落到新的 owner-aligned test files，而不是继续扩张旧 hotspot 文件。

## Goals

- Close retained reactive precision defects from dimension `05`.
- Close retained async failure-feedback defects from dimension `06` that are not owned by Plan `280`.

## Non-Goals

- 不接管 `05-06` / `09-08` duplicated root identity defect；该项由 Plan `282` owning。
- 不接管 `06-02` 或任何 Plan `280` defect family。
- 不吸收 `15-*` / `19-*`；它们由 Plan `288` owning。

## Scope

### In Scope

- `05-02/03/04/05`
- `06-01/04/05/06/07/08/09/10`
- 相关 owner docs: `docs/architecture/renderer-runtime.md`, `docs/logs/2026/05-14.md`

### Out Of Scope

- `05-06` owned by Plan `282`
- `06-02` and all Plan `280` surfaces
- `15-*`, `19-*`
- Any retained ID not listed in `In Scope`

## Execution Plan

### Phase 1 - Reactive Precision Closure

Status: planned
Targets: `packages/flux-react/src/**`, `packages/flux-renderers-form/src/**`, `packages/flux-renderers-basic/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `05-02/03/04/05` so host broad subscriptions, nested changed-path precision loss, non-form requiredness drift, and broad page refresh subscriptions no longer remain on supported paths.
- [ ] Add or update focused tests proving the repaired reactive publication precision in new owner-aligned test files when the old hotspot files are still being split by Plan `284`.
- [ ] Update affected owner docs if the supported reactive baseline changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained IDs `05-02/03/04/05` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused tests covering changed-path publication, requiredness dependency tracking, and broad subscription removal exist in owner-aligned package suites and pass.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Async Failure-Feedback Closure

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/**`, `packages/flow-designer-renderers/src/**`, `packages/report-designer-renderers/src/**`, `packages/flux-renderers-form/src/**`, `packages/flux-code-editor/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `06-01/04/05/06/07/08/09/10` so async failure handling is user-visible where required, stale requests are cancelled or honestly sequenced, and resolved failure results are not silently ignored.
- [ ] Add or update focused tests proving the repaired async failure-feedback behavior in new owner-aligned test files when the old hotspot files are still being split by Plan `284`.
- [ ] Update affected owner docs if the supported async/failure-feedback contract changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained IDs `06-01/04/05/06/07/08/09/10` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused tests covering async sequencing, failure visibility, resolved-failure handling, and stale-request behavior exist in owner-aligned package suites and pass.
- [ ] No fix in this phase duplicates Plan `279` boolean normalization or Plan `280` defect ownership.
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
- [ ] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plans `279`, `280`, `282`, or `284`.
- [ ] Affected docs/logs are updated, or `No owner-doc update required` is explicit.

## Closure Gates

- [ ] All in-scope retained reactive and async failure-feedback defects are fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
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
