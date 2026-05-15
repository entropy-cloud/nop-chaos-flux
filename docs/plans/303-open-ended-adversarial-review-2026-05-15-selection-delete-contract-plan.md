# 303 Open-Ended Adversarial Review 2026-05-15 Selection Delete Contract Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-01/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/301-open-ended-adversarial-review-2026-05-15-owner-routing-plan.md`

## Purpose

收口 Flow Designer `deleteSelection` 不尊重 selected set 的 adversarial-review defect。

## Current Baseline

- The selected-set delete fix has already landed on the live baseline: `deleteSelection` now removes the selected set instead of only the active singleton, and the public action-provider route is restored to the same command path.
- Focused regression proof has already landed in the Flow Designer renderer test suite, and `docs/logs/2026/05-15.md` records the landed slice plus focused verification.
- Remaining closure work for this plan is repo-level hard-gate verification, textual synchronization inside this plan, and independent closure audit.

## Goals

- Make delete-selection semantics honor the selected set.
- Encode the delete contract in focused proof and workspace hard-gate verification.

## Non-Goals

- 不接管其它 adversarial-review defect families。

## Scope

### In Scope

- selected-set delete contract only

### Out Of Scope

- all other adversarial-review defects

## Execution Plan

### Phase 1 - Implement Selected-Set Delete Contract

Status: completed
Targets: relevant flow-designer files, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Freeze the supported delete contract: `deleteSelection` removes the selected set rather than only the active singleton.
- [x] Land the selected-set delete fix across the command-adapter/provider path.
- [x] Add focused proof for selected-node, selected-edge, and mixed selected-set deletion semantics.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] `deleteSelection` honors selected-set semantics.
- [x] Focused proof exists and passes.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` is updated.

### Phase 2 - Verification And Closure Audit

Status: planned
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phase 1.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for the in-scope defect family has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] All in-scope confirmed live defects are fixed.
- [ ] All in-scope confirmed contract drifts are converged.
- [ ] Behavior and contract results are achieved.
- [ ] Necessary focused verification is completed.
- [ ] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Implementation is landed and Phase 1 is complete. Remaining work is full hard-gate verification and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: Pending.
- Evidence: Pending.

Follow-up:

- None currently.
