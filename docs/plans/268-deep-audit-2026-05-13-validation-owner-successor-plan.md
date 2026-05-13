# 268 Deep Audit 2026-05-13 Validation Owner Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/plans/267-deep-audit-2026-05-13-priority-remediation-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/266-deep-audit-2026-05-13-async-lifecycle-owner-successor-plan.md`

## Purpose

Own the retained validation-owner and projected-validation contract findings that require a dedicated execution slice outside the umbrella routing plan.

## Current Baseline

- Plan 267 routes `04-03`, `08-02`, `08-03`, and `08-04` here.
- These items all concern validation owner identity, projected validation reach, and hidden-branch participation semantics.
- They are still-live retained findings and cannot remain under generic follow-up ownership.
- Live re-audit on 2026-05-13 confirms `08-02` and `08-04` are already fixed, `04-03` remains live, and `08-03` no longer belongs here because the current owner-contract/public-surface question is already routed to Plan 263.

## Goals

- Re-audit the four retained IDs against live code and docs.
- Land the smallest safe contract fixes with focused proof.
- Update owner docs if supported validation behavior changes.

## Non-Goals

- Re-open async/lifecycle items already owned by Plan 266.
- Absorb accessibility, test-gate, or doc-plan hygiene work.

## Scope

### In Scope

- `04-03`, `08-02`, `08-03`, `08-04`

### Out Of Scope

- Findings owned by Plans 262, 264, 265, 266, 269, 270, and 271

## Execution Plan

### Phase 1 - Re-audit Validation Owner Contracts

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/{variant-field/variant-field.tsx,detail-view/projected-validation-runtime.ts}`, validation docs/tests

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit each retained ID against the live baseline.
- [ ] Land the first closure-ready validation-owner fixes with focused regression proof.
- [ ] Update relevant owner docs or record `No owner-doc update required`.

Exit Criteria:

- [ ] Every in-scope retained ID has a live-owner decision.
- [ ] Any landed fix has focused proof.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope retained findings are adjudicated.
- [ ] No confirmed validation-owner defect is silently deferred.
- [ ] Remaining work has explicit successor ownership or landed fixes.
- [ ] Independent closure audit is completed and recorded with evidence.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None yet.

## Non-Blocking Follow-ups

None yet.

## Closure

Status Note: partially re-audited. `08-02` and `08-04` are already fixed, but `04-03` remains live and `08-03` ownership text needs correction before this plan can close.

Closure Audit Evidence:

- Reviewer / Agent: independent baseline re-audit subagent `ses_1ded2dc6effe0GAdgIfbShDxak`
- Evidence: re-audit confirmed projected validation scoping and hidden-branch clearing are fixed, but `variant-field` still prioritizes `userSelectedKey` over owner-derived matches for `04-03`, and `08-03` should be removed from this plan's live scope in favor of its existing successor ownership under Plan 263.

Follow-up:

- Remaining execution required for `04-03` plus scope cleanup for the stale `08-03` ownership entry.
