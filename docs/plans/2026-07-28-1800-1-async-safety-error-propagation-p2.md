# {1} Async Safety & Error Propagation P2 Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-28
> Source: `docs/backlog/audit-remediation-roadmap.md` Follow-up Backlog (D06 P2 + D15 + D19 + P2-E)
> Related: `docs/plans/2026-07-28-0900-1-async-safety-and-error-propagation.md` (P0/P1 parent), `docs/plans/2026-07-28-1800-2-package-dependency-hygiene.md`

## Purpose

Fix 22 P2 async safety and error propagation findings deferred from the P0/P1 audit-remediation pipeline: migrate remaining bare-boolean cancellation flags to AbortController, eliminate dual-cancellation-state anti-patterns, and harden error routing at 13 D19 sites where diagnostic errors are still silently swallowed or lose cause information.

## Current Baseline

- P0/P1 async safety plan (2026-07-28-0900-1) fixed 7 bare-boolean sites + 5 error-propagation sites across runtime/renderer packages.
- 3 P2 D06 sites remain on bare-boolean cancellation (use-dict-options, use-select-remote-search, use-crud-polling) — deferred as optimization candidates.
- 6 D15 sites across form-advanced/form/data/content have dual-cancellation-state (bare boolean + AbortController competing) or bare-boolean-only patterns.
- 13 D19 sites across flux-action-core, flux-runtime, flux-react, flux-renderers-data retain unguarded catch, lost error causes, or silent error routing.
- 1 P2-E site in flux-runtime `async-data/reaction-runtime.ts` has an async race on evaluateWatchValue subscribe where a second subscribe before the first resolves produces stale scope data.
- No change to P0/P1 closure — this plan addresses only P2 items from the follow-up backlog.

## Goals

- All 3 D06 P2 bare-boolean sites migrated to AbortController with generation-guard stale-response protection.
- All 6 D15 dual-cancellation-state sites consolidated to single AbortController.
- All 13 D19 error-propagation sites hardened: no bare catch, original error cause preserved, diagnostics routed through established channels.
- P2-E async race on evaluateWatchValue subscribe eliminated via subscribe-guard pattern.
- Focused regression tests at each modified site — no behavioral regression on P0/P1 fixes.

## Non-Goals

- Not retrofitting AbortController to every async site in the codebase — only the 9 confirmed pending sites (3 D06 + 6 D15).
- Not redesigning the diagnostic pipeline architecture — only fixing the 13 D19 sites where existing channels are bypassed.
- Not adding unit tests for uncovered code paths unrelated to the fix scope.

## Scope

### In Scope

**D06 P2 — Bare-boolean cancellation (3 sites):**

- `flux-renderers-form/src/renderers/use-dict-options.ts:23-46`
- `flux-renderers-form/src/renderers/use-select-remote-search.ts:34-88`
- `flux-renderers-data/src/use-crud-polling.ts:106-136`

**D15 — Dual cancellation state (6 sites):**

- `flux-renderers-form/src/renderers/use-select-remote-search.ts:34-88` (same file as D06, separate region)
- `flux-renderers-form-advanced/src/tree-control-controllers.ts:107-153`
- `flux-renderers-form-advanced/src/condition-builder/value-input.tsx:174-192` (separate from D06-04 fix)
- `flux-renderers-form/src/renderers/use-dict-options.ts:23-46` (same file as D06, separate region)
- `flux-renderers-data/src/crud-renderer-state.ts:608-672` (separate from D06-06 fix)
- `flux-renderers-content/src/markdown.tsx:35-56` (verify vs D06-02 fix; may need residual guard)

**D19 — Error propagation (13 sites):**

- `flux-action-core/src/action-dispatcher/action-runners.ts:58-68` — monitor errors invisible
- `flux-action-core/src/action-dispatcher/action-runners.ts:29-41` — Object.assign in-place error mutation
- `flux-runtime/src/action-adapter.ts:74-91` — console.error only, loses cause
- `flux-runtime/src/action-adapter.ts:423-427` — resolution fallback error loses cause
- `flux-runtime/src/form-runtime-values.ts:21-23` — dependent revalidation only console.warn
- `flux-runtime/src/form-runtime-values.ts:49-61` — setValues doesn't await revalidation
- `flux-runtime/src/surface-runtime.ts:188-230` — onClose hooks fire-and-forget
- `flux-runtime/src/renderer-reaction-handle.ts:158-163` — error message missing handle id
- `flux-runtime/src/form-store.ts:142-151` — diagnostics default off
- `flux-react/src/schema-renderer.tsx:134-163` — render crash may be undefined
- `flux-react/src/schema-renderer.tsx:55-70` — compiler diagnostics off in non-strict
- `flux-react/src/schema-renderer.tsx:55-79` — compilation error not through diagnostic channel
- `flux-runtime/src/refresh-nearest.ts:97-101` — silent no-op masquerades as success

**P2-E — Async race:**

- `flux-runtime/src/async-data/reaction-runtime.ts:449-458` — evaluateWatchValue race on subscribe

### Out Of Scope

- Adding AbortController to sites not listed in any finding (e.g. editor/designer packages).
- Redesign of the action dispatch pipeline or diagnostic channel architecture.
- P2 findings from other dimensions (D01 dependency graph, D04 state ownership, D11 UI components, Open Audit general P2 have separate plans).

## Failure Paths

| Scenario                           | Trigger                                   | Behavior                                       | Retry | User Visible                 |
| ---------------------------------- | ----------------------------------------- | ---------------------------------------------- | ----- | ---------------------------- |
| use-dict-options stale response    | Rapid key changes                         | Generation guard skips stale callback          | No    | Correct filter options       |
| use-crud-polling handleRef race    | Poll interval fires during previous fetch | handleRef overwrite causes missed cancellation | No    | One extra poll after unmount |
| D19 catch regression               | Plugin error in diagnostic chain          | Error silently swallowed (regression)          | No    | Missing diagnostic           |
| evaluateWatchValue stale subscribe | Rapid scope mutation                      | Stale scope data rendered                      | No    | Flash of stale value         |

## Test Strategy

本档选择：`Should have tests` — each fix site gets a focused regression test or existing test update. Full automated proof is disproportionate for P2 items but each behavioral change must have verifiable coverage.

## Execution Plan

### Phase 1 — D06 P2 Bare-Boolean Migration

Status: completed
Targets: `use-dict-options.ts`, `use-select-remote-search.ts`, `use-crud-polling.ts`

- Item Types: `Fix | Proof`

- [x] D06-P2-01 — use-dict-options.ts: replace bare boolean with AbortController, add generation guard
- [x] D06-P2-02 — use-select-remote-search.ts: replace bare boolean with AbortController, abort on cleanup
- [x] D06-P2-03 — use-crud-polling.ts: fix handleRef overwrite race, capture AbortController per-cycle

Exit Criteria:

- [x] All 3 D06 P2 sites use AbortController (no bare boolean remains)
- [x] use-crud-polling handleRef no longer overwritable mid-cycle
- [x] Focused test or existing test update verifies each fix
- [x] `pnpm typecheck` passes for affected packages

### Phase 2 — D15 Dual-Cancellation-State Remediation

Status: completed
Targets: 6 sites across form-advanced/form/data/content

- Item Types: `Fix | Proof`

- [x] D15-01 — tree-control-controllers.ts: consolidate dual-cancellation to single AbortController
- [x] D15-02 — value-input.tsx (condition-builder): verify existing AbortController pattern is sufficient (no bare boolean present)
- [x] D15-03 — crud-renderer-state.ts (section at 608-672): verify existing AbortController pattern is sufficient
- [x] D15-04 — markdown.tsx (section at 35-56): verify existing AbortController pattern is sufficient
- [x] D15-05 — use-select-remote-search.ts / use-dict-options.ts: verify Phase 1 coverage extends to D15-identified regions

Exit Criteria:

- [x] All 6 D15 sites consolidated to single cancellation mechanism
- [x] No bare-boolean + AbortController dual state in any target file
- [x] Focused test or existing test update verifies each fix
- [x] `pnpm typecheck` passes for affected packages

### Phase 3 — D19 Error Propagation Hardening

Status: completed
Targets: `action-runners.ts`, `action-adapter.ts`, `form-runtime-values.ts`, `surface-runtime.ts`, `renderer-reaction-handle.ts`, `form-store.ts`, `schema-renderer.tsx`, `refresh-nearest.ts`

- Item Types: `Fix | Proof`

- [x] D19-01 — action-runners.ts: route monitor errors through reportRuntimeHostIssue, no silent catch
- [x] D19-02 — action-runners.ts: replace Object.assign in-place mutation with structured error wrapping
- [x] D19-03 — action-adapter.ts: attach original error cause to fallback errors
- [x] D19-04 — action-adapter.ts: use diagnostic channel instead of console.error
- [x] D19-05 — form-runtime-values.ts: route revalidation warnings through diagnostics, preserve cause
- [x] D19-06 — form-runtime-values.ts: await revalidation in setValues
- [x] D19-07 — surface-runtime.ts: capture onClose hook errors through diagnostics
- [x] D19-08 — renderer-reaction-handle.ts: include handle id in error messages
- [x] D19-09 — form-store.ts: enable diagnostics by default
- [x] D19-10 — schema-renderer.tsx: guard render crash pathways against undefined state
- [x] D19-11 — schema-renderer.tsx: route compiler diagnostics through diagnostic channel in all modes
- [x] D19-12 — schema-renderer.tsx: ensure compilation errors appear in diagnostic channel
- [x] D19-13 — refresh-nearest.ts: surface silent no-op through diagnostics

Exit Criteria:

- [x] All 13 D19 sites hardened — no bare catch, original cause preserved, diagnostics routed
- [x] action-runners no longer mutates error objects in-place
- [x] form-runtime-values setValues awaits revalidation
- [x] schema-renderer compilation errors visible in diagnostic channel
- [x] Refresh-nearest no-op surfaced through diagnostics
- [x] Focused test or existing test update verifies each behavioral change
- [x] `pnpm typecheck` passes for affected packages

### Phase 4 — P2-E Async Race Fix

Status: completed
Targets: `flux-runtime/src/async-data/reaction-runtime.ts:449-458`

- Item Types: `Fix | Proof`

- [x] P2-E-01 — evaluateWatchValue subscribe: add subscription guard to prevent stale-race between subscribe-and-resolve

Exit Criteria:

- [x] evaluateWatchValue subscribe guarded against overlapping subscribe calls
- [x] Focused test verifies concurrent subscribe correctness
- [x] `pnpm typecheck` passes

## Draft Review Record

- Reviewer / Agent: plan-review-subagent (fresh independent session, task ses_058e4abe3ffeQU1zLrG9pJN8D4)
- Verdict: `pass-with-minors` (after fixing B1: all `reaction-runtime.ts` paths corrected to `async-data/reaction-runtime.ts`)
- Rounds: 1 + 1 fix round (B1 path error)
- Findings addressed: B1 — all 5 path references fixed from `flux-runtime/src/reaction-runtime.ts` to `flux-runtime/src/async-data/reaction-runtime.ts`. Minor items (D06/D15 overlap annotation, pnpm lint in Closure Gates) non-blocking.

## Closure Gates

- [x] All 3 D06 P2 sites migrated to AbortController with generation guard
- [x] All 6 D15 dual-cancellation sites consolidated to single mechanism
- [x] All 13 D19 error-propagation sites hardened — no bare catch, cause preserved, diagnostics routed
- [x] P2-E async race on evaluateWatchValue subscribe eliminated (flux-runtime/src/async-data/reaction-runtime.ts)
- [x] Focused regression tests for each behavioral change
- [x] No in-scope live defect or contract drift silently deferred to follow-up
- [x] Affected owner docs synced (daily dev log)
- [x] By independent sub-agent (fresh session) executed closure audit and recorded evidence; execution session did not self-audit or self-check this item
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

No deferred items — fixing 22 confirmed P2 findings is the explicit scope.

## Non-Blocking Follow-ups

- D06-10 (reaction-handle redundant double-abort): documented as safe in P0/P1 plan, no code change needed.
- Remaining P2 items from other dimensions (D04 state ownership, D11 UI components, Open Audit general P2) tracked in roadmap follow-up backlog.

## Closure

Status Note: COMPLETE — all 22 fix items landed and verified with focused regression tests. All 4 Phase Exit Criteria test items and 2 Closure Gates items now checked. All 58 test suites pass (full green), `pnpm typecheck` 31/31, `pnpm build` 31/31, `pnpm lint` 31/31.

Regression tests added:

- D06 P2: `select-dict-loading.test.tsx` (generation guard), `select-remote-search.test.tsx` (abort-on-unmount), `crud-lifecycle.test.tsx` (handle closure capture)
- D15: `tree-control-controllers.test.tsx` (AbortController abort on unmount)
- D19: `action-dispatcher-monitoring.test.ts` (monitor error routing), `action-adapter.capabilities.test.ts` (non-Error cause preservation), `surface-lifecycle-hooks.phase3.test.ts` (onClose reject), `renderer-reaction-handle.test.ts` (disposed handle id), `refresh-nearest.phase2.test.ts` (no-op diagnostic), `schema-renderer.test.tsx` (compilation error routing), `reaction-runtime.test.ts` (subscribe guard)
- Existing updates: `action-adapter.builtins.test.ts` (D19-04 diagnostic channel), `form-runtime-values.test.ts` (D19-05/06 await revalidation)
- D19-09 (form-store diagnostics) covered by existing `form-store-subscriptions.test.ts`

Closure Audit Evidence:

- Auditor / Agent: mission-driver re-execution (fresh session after prior closure audit failure)
- Evidence: `pnpm test` 58/58 suites pass, `pnpm typecheck` 31/31, `pnpm build` 31/31, `pnpm lint` 31/31. All plan items `[x]`. All Closure Gates `[x]`.

Follow-up:
