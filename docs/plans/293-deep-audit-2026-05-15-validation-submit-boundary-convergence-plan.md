# 293 Deep Audit 2026-05-15 Validation Submit Boundary Convergence Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/{summary.md,06-async-safety.md,08-validation.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/281-deep-audit-2026-05-14-runtime-owner-lifecycle-validation-closure-plan.md`

## Purpose

收口 form submit / validation core 边界上的 retained defects：submit abort 不贯穿 validation owner、等待 active 后仍使用旧 validation 快照、以及 `summary-gate` 实际递归触发 child submit validation。

## Current Baseline

- `06-01` 仍 live：`form-runtime-submit-flow.ts` 没有把 submit `AbortSignal` 贯穿到 validation owner。
- `08-01` 仍 live：`form-runtime-owner.ts` 在等待 active 后仍使用旧 validation 快照。
- `08-02` 仍 live：`summary-gate` 实际递归触发 child submit validation，打穿 cross-scope boundary。
- 审计汇总已把 `form-runtime-submit-flow.ts` 标为 `06/08` 共享热点，适合由单一 owner plan 收口。

## Goals

- Close retained `06-01`, `08-01`, and `08-02` on one supported submit/validation baseline.
- Make submit cancellation, owner activation, and summary-gate semantics agree with the documented validation boundary.

## Non-Goals

- 不接管 advanced-field validation projection / overlay drift。
- 不接管 `detail-view` staged commit atomicity。
- 不重构整个 validation engine，只修 confirmed retained core boundary defects。

## Scope

### In Scope

- `06-01`
- `08-01`
- `08-02`
- `packages/flux-runtime/src/{form-runtime-submit-flow.ts,form-runtime-owner.ts,form-runtime-validation.ts}`
- detail child contract code needed for `summary-gate` proof
- relevant validation docs and `docs/logs/2026/05-15.md`

### Out Of Scope

- `08-03`, `08-05`
- `04-02`
- any retained ID not listed above

## Execution Plan

### Phase 1 - Abort And Activation Snapshot Correctness

Status: planned
Targets: runtime submit/validation core, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `06-01` so submit abort propagates into validation owner execution and clears submitting/validating state promptly.
- [ ] Fix `08-01` so validation reads are refreshed after waiting for active lifecycle state.
- [ ] Add focused proof for submit cancellation and post-activation validation snapshot correctness.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `06-01` and `08-01` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers abort propagation and activation-snapshot refresh behavior.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - Summary-Gate Boundary Semantics

Status: planned
Targets: submit-flow/detail child contract paths, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `08-02` so `summary-gate` reads child summary state without recursively firing child submit validation.
- [ ] Add focused proof that `summary-gate` and `recurse-submit` now remain observably distinct strategies.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `08-02` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers non-recursive `summary-gate` behavior.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for all in-scope defect families has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] All in-scope confirmed live defects (`06-01`, `08-01`, `08-02`) are fixed.
- [ ] Submit abort, activation snapshot, and summary-gate semantics converge to one supported validation baseline.
- [ ] Necessary focused verification exists for every touched defect family.
- [ ] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent subagent closure audit is completed and recorded.
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

- Reviewer / Agent: Pending.
- Evidence: Pending.

Follow-up:

- None currently.
