# 305 Open-Ended Adversarial Review 2026-05-15 Owner Publication Path Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-01/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/301-open-ended-adversarial-review-2026-05-15-owner-routing-plan.md`

## Purpose

收口 non-form owner-renderer `statusPath` structural contract drift。

## Current Baseline

- `docs/analysis/2026-05-15-open-ended-adversarial-review-01/round-02.md` recorded the original drift: docs still described owner `statusPath` as a static structural path while live non-form renderers such as `page`, `tabs`, `tree`, and workbench-host pages already classified it as a resolved prop.
- Plan `306` now closes the form-specific branch of that split separately: form `statusPath` / `valuesPath` are owned as dynamic rerouting publication paths with replacement disposal, so this plan no longer owns any form publication semantics.
- Live baseline for this plan now converges on the non-form side: renderer-owned `statusPath` fields stay on the resolved-prop path, and when the resolved target changes the owner clears the old publication target and republishes through the new one.

## Goals

- Converge non-form owner-renderer publication-path semantics to one supported baseline.
- Keep form publication-path semantics out of this plan so the form surface has one owner in Plan `306`.

## Non-Goals

- 不接管 form publication replacement lifecycle。
- 不接管 form `statusPath` / `valuesPath` contract choice。

## Scope

### In Scope

- non-form owner-renderer `statusPath` contract only

### Out Of Scope

- form `statusPath` / `valuesPath` semantics and replacement lifecycle, owned by Plan `306`
- all other adversarial-review defects

## Execution Plan

### Phase 1 - Converge Non-Form Owner Publication Contract

Status: completed
Targets: relevant renderer/compiler/docs/tests

- Item Types: `Fix | Proof | Decision`

- [x] Freeze one supported baseline for non-form owner-renderer `statusPath` semantics as dynamic resolved-prop publication paths rather than structural-only raw-schema fields.
- [x] Explicitly record that form `statusPath` / `valuesPath` semantics are excluded from this plan and owned by Plan `306`.
- [x] Land the non-form owner publication-path contract convergence in renderer metadata, compiler validation, and focused proof: `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx` now proves dynamic page rerouting clears `ui.a` and republishes to `ui.b`, and also proves `page` and `tabs` `statusPath` fields compile/resolve as normal prop fields instead of static structural paths.
- [x] Update affected owner docs: `docs/architecture/field-binding-and-renderer-contract.md` now narrows the structural-only `statusPath` rule to `data-source.statusPath`, and `docs/architecture/action-interaction-state.md` now records the current non-form owner baseline (`page`, `tabs`, `tree`, workbench-host pages) as resolved-prop `statusPath` surfaces that must clear old targets on reroute.

Exit Criteria:

- [x] One supported non-form owner-renderer `statusPath` baseline exists in docs/code/tests.
- [x] Focused proof exists and passes.
- [x] The boundary excluding form `statusPath` / `valuesPath` semantics is explicit and non-conflicting with Plan `306`.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` is updated.

### Phase 2 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phase 1: `pnpm exec vitest run src/__tests__/basic-page-layout-structure.test.tsx` passed in `packages/flux-renderers-basic` (`19` tests).
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land. All four passed on the workspace baseline, and the final `pnpm test` Turbo run reported `49 successful, 49 total`.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output. Subagent `ses_1d5877daaffe8HHyacntujU9iX` first confirmed the live non-form semantics had converged, the form/non-form boundary with Plan `306` was explicit, and the focused proof plus workspace verification were sufficient, but it found two text-consistency blockers: this plan still showed the closure audit as pending and `docs/logs/2026/05-15.md` still listed Plan `305` among remaining open plans.
- [x] Fix the blocking closure-audit finding before marking this plan completed by syncing this plan's closure state and removing the stale open-plan reference from `docs/logs/2026/05-15.md`.

Exit Criteria:

- [x] Focused verification for the in-scope defect family has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker and no same-surface ownership ambiguity with Plan `306`.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects are fixed.
- [x] All in-scope confirmed contract drifts are converged.
- [x] Behavior and contract results are achieved.
- [x] Necessary focused verification is completed.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. The live baseline now converges non-form owner `statusPath` semantics on one supported contract: renderer-owned `statusPath` fields such as `page`, `tabs`, `tree`, and workbench-host pages are resolved through normal prop evaluation instead of static structural reads, and rerouting must clear the old publication target before republishing to the new one. Form publication semantics remain explicitly excluded here and are owned by Plan `306`. Independent closure audit re-read the live plan/docs/tests and verified there is no remaining plan-owned blocker after the final text-consistency sync.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1d5877daaffe8HHyacntujU9iX`
- Evidence: Initial audit found only text-consistency blockers: this plan still left the closure-audit items unchecked and `docs/logs/2026/05-15.md` still listed Plan `305` as open. The same audit also confirmed the underlying semantic work was landed: non-form owners already converge on resolved-prop `statusPath` semantics with reroute cleanup, the focused `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx` proof passes, the form boundary remains explicitly owned by Plan `306`, and the saved workspace verification output at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2a6b7b93001hCs1b1gv3CvJwS` shows `49 successful, 49 total`. After the text sync, no remaining plan-owned blocker remained.

Follow-up:

- None currently.
