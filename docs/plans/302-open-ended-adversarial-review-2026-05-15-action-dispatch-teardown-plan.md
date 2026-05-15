# 302 Open-Ended Adversarial Review 2026-05-15 Action Dispatch Teardown Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-01/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/301-open-ended-adversarial-review-2026-05-15-owner-routing-plan.md`

## Purpose

收口 adversarial review 确认的 debounced action dispatcher teardown terminality defect。

## Current Baseline

- The dispatcher teardown fix has already landed on the live baseline: dispatcher disposal now settles pending debounced dispatch promises with a cancellation result, and runtime disposal routes through dispatcher disposal.
- Focused regression proof has already landed in the action-core and runtime test suites, and `docs/logs/2026/05-15.md` records the landed slice plus focused verification.
- Remaining closure work for this plan is repo-level hard-gate verification, textual synchronization inside this plan, and independent closure audit.

## Goals

- Make dispatcher disposal and runtime disposal terminate pending debounced dispatches deterministically.
- Encode the teardown contract in focused proof and workspace hard-gate verification.

## Non-Goals

- 不接管其它 adversarial-review defect families。

## Scope

### In Scope

- debounced dispatcher teardown defect only

### Out Of Scope

- all other adversarial-review defects

## Execution Plan

### Phase 1 - Implement Deterministic Teardown

Status: completed
Targets: relevant action/runtime files, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Freeze the supported teardown contract: disposing a dispatcher or runtime settles pending debounced dispatch promises with an explicit cancellation outcome instead of leaving them unresolved.
- [x] Land the debounced teardown fix in the action dispatcher and runtime teardown wiring.
- [x] Add focused proof for direct dispatcher disposal and full runtime disposal while a debounced dispatch promise is pending.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Pending debounced dispatch promises terminate deterministically on disposal.
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
