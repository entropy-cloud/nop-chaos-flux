# 266 Deep Audit 2026-05-13 Async Lifecycle Owner Successor Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-12-deep-audit-full/final-review-results-06-10.md`, `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`
> Related: `docs/plans/255-deep-audit-2026-05-12-async-lifecycle-follow-up-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live async, cancellation, stale-settlement, and lifecycle hygiene findings that remained after Plan 255 re-audited its retained set and moved unresolved work into explicit successor ownership.

## Current Baseline

- Plan 255 no longer owns active execution; it closed after adjudicating its retained async/lifecycle set and moving the still-live subset here.
- The remaining work spans flow designer async UI feedback, spreadsheet/report async command failure handling, object/detail field stale-settlement paths, and runtime lifecycle hygiene.
- Plan 267 now additionally routes the 2026-05-13 retained async/lifecycle set here, including `06-01`, `06-02`, `06-03`, `06-04`, `07-04`, `07-05`, `07-07`, and `08-01`.
- Live re-audit on 2026-05-13 confirms `06-01`, `06-03`, `06-04`, `07-05`, and `07-07` are fixed; `06-02` no longer reproduces; `08-01` was already closed earlier; and the carried legacy set (`06-05`, `06-07`, `06-09`, `06-10`, `06-11`, `06-12`, `06-14`, `06-15`, `06-17`) plus `07-04` still require real execution ownership here.

## Goals

- Re-audit the retained async/lifecycle findings against live code and focused tests.
- Separate direct user-visible failure-path fixes from lower-grade lifecycle hygiene work.
- Land closure-ready slices with proof and owner-doc updates where the supported baseline changes.

## Non-Goals

- Re-open Plan 255 items already adjudicated as no longer live.
- Absorb reactive-precision, styling/theme, or public-surface narrowing work.

## Scope

### In Scope

- Legacy carried async/lifecycle set: `06-05`, `06-07`, `06-09`, `06-10`, `06-11`, `06-12`, `06-14`, `06-15`, `06-17`
- 2026-05-13 retained set routed by Plan 267: `06-01`, `06-02`, `06-03`, `06-04`, `07-04`, `07-05`, `07-07`, `08-01`

### Out Of Scope

- Findings routed to Plans 254 and 256-265

## Execution Plan

### Phase 1 - Re-audit Async Failure Paths

Status: planned
Targets: `packages/flux-runtime/src/*`, `packages/flux-react/src/render-nodes.tsx`, `packages/report-designer-renderers/src/*`

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit the 2026-05-13 routed async/lifecycle set `06-01`, `06-02`, `06-03`, `06-04`, `07-04`, `07-05`, `07-07`, `08-01` against the live repo.
- [ ] Group the surviving 2026-05-13 issues by direct-fix slices versus longer-lived lifecycle hygiene work.
- [ ] Record the chosen owner and proof path for every 2026-05-13 routed ID before touching the carried legacy backlog.

Exit Criteria:

- [ ] Every 2026-05-13 routed retained ID has an explicit live-owner decision.
- [ ] User-visible failure-path fixes are separated from lower-grade hygiene work.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Re-audit Carried Legacy Async Backlog

Status: planned
Targets: `packages/flow-designer-renderers/src/*`, `packages/flux-renderers-data/src/*`, `packages/flux-renderers-form-advanced/src/*`, `packages/spreadsheet-renderers/src/*`, `packages/word-editor-renderers/src/*`

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit the carried legacy async/lifecycle set `06-05`, `06-07`, `06-09`, `06-10`, `06-11`, `06-12`, `06-14`, `06-15`, `06-17` after the 2026-05-13 routed set has an execution path.
- [ ] Group the surviving legacy issues by direct-fix slices versus longer-lived lifecycle hygiene work.
- [ ] Record the chosen owner and proof path for every carried legacy ID.

Exit Criteria:

- [ ] Every carried legacy retained ID has an explicit live-owner decision.
- [ ] Legacy async slices are separated from the 2026-05-13 priority set.
- [ ] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope retained findings are adjudicated.
- [ ] No confirmed live async/lifecycle defect is silently deferred.
- [ ] Each deferred slice has explicit successor ownership or a landed fix.
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

Status Note: partially re-audited. Several routed async items are already fixed or no longer live, but the carried legacy backlog and `07-04` still block closure.

Closure Audit Evidence:

- Reviewer / Agent: independent baseline re-audit subagent `ses_1ded2dc6effe0GAdgIfbShDxak`
- Evidence: re-audit confirmed the landed runtime fixes for `06-01`, `06-03`, `06-04`, `07-05`, and `07-07`, but found the carried legacy async/lifecycle set still live and noted that `render-nodes.tsx` still uses queue-microtask fragment-scope gating for `07-04`.

Follow-up:

- Remaining execution required for the carried legacy async/lifecycle backlog and `07-04`.
