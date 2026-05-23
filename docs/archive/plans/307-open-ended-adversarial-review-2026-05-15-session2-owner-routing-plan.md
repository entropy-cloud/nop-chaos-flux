# 307 Open-Ended Adversarial Review 2026-05-15 Session2 Owner Routing Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/{round-01.md,round-02.md,round-03.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/308-open-ended-adversarial-review-2026-05-15-s2-scope-adaptor-isolation-breach-plan.md`, `docs/plans/309-open-ended-adversarial-review-2026-05-15-s2-form-validation-race-safety-plan.md`, `docs/plans/310-open-ended-adversarial-review-2026-05-15-s2-source-prop-lifecycle-plan.md`, `docs/plans/311-open-ended-adversarial-review-2026-05-15-s2-import-action-security-plan.md`, `docs/plans/312-open-ended-adversarial-review-2026-05-15-s2-error-boundary-robustness-plan.md`, `docs/plans/313-open-ended-adversarial-review-2026-05-15-s2-table-rendering-integrity-plan.md`, `docs/plans/314-open-ended-adversarial-review-2026-05-15-s2-compilation-duplicate-id-detection-plan.md`

## Purpose

Split the 14 adversarial-review findings from session 2 (2026-05-15 afternoon) into single-surface owner plans, giving each confirmed live defect exactly one honest active owner path. This is the meta-routing plan analogous to Plan `301` for session 1.

## Current Baseline

- `docs/analysis/2026-05-15-open-ended-adversarial-review-02/summary.md` records 14 findings across 3 rounds.
- These findings span scope isolation, form validation, resource lifecycle, import/action security, error boundaries, table rendering, and compilation safety.
- Successor plans `308`-`314` now explicitly own each grouped result surface.
- The remaining work for this routing plan is closure-audit evidence only, not additional owner assignment.

### Owner Matrix

| Finding | Defect Family                                                       | Owner Plan |
| ------- | ------------------------------------------------------------------- | ---------- |
| 1       | Scope adaptor isolation breach (`createAdaptorScopeView.ownKeys()`) | 308        |
| 2       | Form `validateForm` parallel race with concurrent validation        | 309        |
| 3       | Source prop subscriptions leak on `hasSourceProps` transition       | 310        |
| 4       | Shared `existingStore` no owner isolation                           | 309        |
| 5       | `__xui_actions__` namespace hijack via import race                  | 311        |
| 6       | Import `$`-prefix built-in binding override                         | 311        |
| 7       | `String(Symbol())` crash in error boundary fallback                 | 312        |
| 8       | Runtime `dispose()` no in-flight action abort                       | 311        |
| 9       | `hasSourceProps` BFS infinite loop on circular ref                  | 310        |
| 10      | Duplicate `rowKey` silent scope aliasing                            | 313        |
| 11      | Full-table re-render on quick-edit keystroke                        | 313        |
| 12      | `CompiledCidState.duplicateIds` dead code                           | 314        |
| 13      | Row scopes evicted without disposal                                 | 313        |
| 14      | Quick-edit draft destroyed by record reference change               | 313        |

### Result Surface Partition Rationale

The grouping follows surface-adjacency and structural coupling:

- **308**: Standalone scope-isolation Proxy trap bug. Not coupled with other findings.
- **309**: Both findings involve form validation store state integrity under concurrency and shared ownership. Finding 2 (race) and Finding 4 (shared store) interact — fixing the store's owner isolation may affect the race surface, and vice versa.
- **310**: Both findings are in the same file (`use-node-source-props.ts`). Finding 3 (lifecycle leak on `hasSourceProps` transition) and Finding 9 (circular ref freeze) are distinct bugs in the same function and are best fixed together.
- **311**: Three findings share the import/action dispatch security perimeter. Finding 5 (namespace hijack), Finding 6 (`$`-prefix override), and Finding 8 (no abort signal on dispose) trace to different code paths but all relate to what happens when untrusted schema or lifecycle events cross the action dispatch boundary.
- **312**: Single finding — error boundary fallback crashes on Symbol input.
- **313**: All four findings trace to the table row scope cache and quick-edit controller. Fixing the row-local invalidation (Finding 11) and scope disposal (Finding 13) both require changes to `use-table-row-scope-cache.ts`.
- **314**: Single finding — `CompiledCidState` tracking fields declared but never wired.

## Goals

- Give each adversarial-review finding from session 2 exactly one honest active owner plan.
- Split by result surface, not by bundle convenience.
- Ensure no finding is left ownerless or multiply-owned.

## Non-Goals

- No direct code remediation in this plan.
- No change to the technical baseline of the 14 findings.

## Scope

### In Scope

- The 14 findings recorded in `docs/analysis/2026-05-15-open-ended-adversarial-review-02/summary.md`
- Successor plans `308`-`314`
- This routing decision and its audit evidence

### Out Of Scope

- Direct code implementation for any defect
- Session 1 adversarial-review findings (owned by Plans `302`-`306`)

## Execution Plan

### Phase 1 - Route Each Finding To One Owner Plan

Status: completed
Targets: this plan, successor plan files, `docs/logs/2026/05-15.md`

- Item Types: `Decision | Fix | Proof`

- [x] Verify each of the 14 findings maps to exactly one successor plan.
- [x] Record the owner matrix in this plan.
- [x] Ensure each successor plan file exists and is named consistently.
- [x] Record routing decision in `docs/logs/2026/05-15.md`.

Exit Criteria:

- [x] Every adversarial-review finding has exactly one explicit owner plan.
- [x] No plan owns findings from different result surfaces that are not explicitly justified as coupled.
- [x] No successor plan overlaps with another on the same finding.
- [x] No owner-doc update required beyond this routing record; technical owner-doc changes, if any, live in successor plans.
- [x] `docs/logs/2026/05-15.md` includes routing notes.

### Phase 2 - Independent Closure Audit

Status: completed
Targets: this plan, successor plans, `docs/logs/2026/05-15.md`

- Item Types: `Proof | Fix | Decision`

- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, the successor plans, and the adversarial-review analysis.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Independent closure audit confirms no finding remains ownerless or multiply owned.
- [x] No owner-doc update required beyond this routing plan; any live baseline doc changes are owned by successor plans.
- [x] `docs/logs/2026/05-15.md` is updated with the closure-audit result.

## Closure Gates

Doc-only routing plan: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are not applicable and are intentionally omitted per `docs/plans/00-plan-authoring-and-execution-guide.md`.

- [x] All in-scope adversarial-review findings have exactly one explicit active owner plan.
- [x] No in-scope finding is silently deferred or left under a too-broad umbrella owner.
- [x] Independent closure audit confirms no remaining routing blocker.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

None currently.

## Closure

Status Note: Completed. The 14 session-2 adversarial-review findings are now explicitly partitioned across Plans `308`-`314`, and an independent closure audit confirmed there is no ownerless or multiply-owned result surface in this routing set.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d55494a0ffezbTX12M7bSc3jb`
- Evidence: Independent closure audit re-read the session-2 analysis summary, Plan `307`, successor Plans `308`-`314`, and `docs/logs/2026/05-15.md`. It confirmed the exact owner matrix `308=1`, `309=2,4`, `310=3,9`, `311=5,6,8`, `312=7`, `313=10,11,13,14`, `314=12`, found no overlap or ownerless finding, and only required closure-sync of this plan/log before completion.

Follow-up:

- No remaining plan-owned execution work.
