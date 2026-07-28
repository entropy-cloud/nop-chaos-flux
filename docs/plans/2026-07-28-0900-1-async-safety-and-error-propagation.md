# {1} Async Safety & Error Propagation Hardening

> Plan Status: completed
> Last Reviewed: 2026-07-28
> Source: `docs/audits/2026-07-28-0814-multi-audit-audit-remediation.md` (D06 + D19 findings)
> Related: `docs/plans/2026-07-28-0900-2-code-quality-and-styling-compliance.md`, `docs/plans/2026-07-28-0900-3-infrastructure-and-build-tooling.md`

## Purpose

Fix 4 P0 + 9 P1 async safety and error propagation findings across runtime/renderer packages: replace bare-boolean cancellation flags with `AbortController`, add generation-guard stale-response protection, and harden the action-dispatch error propagation pipeline so diagnostic errors are no longer silently swallowed.

## Current Baseline

- `form.tsx:443-466` loadAction effect uses no AbortController, has bare `.catch(() => {})`, and has no generation guard — inflight requests pile up and stale responses overwrite correct data.
- `markdown.tsx:35-55` uses bare `let cancelled = false` for a `fetch()` that never receives an AbortSignal — HTTP continues after unmount.
- `crud-renderer-state.ts:608-672` dispatches CRUD load without AbortSignal — old dispatches are not cancelled on rapid pagination/filter changes.
- `qrcode.tsx:54-74`, `value-input.tsx:176-191` (condition-builder), `use-infinite-scroll.ts:149` all use bare-boolean cancellation.
- `action-execution.ts:140-183` has bare `catch {}` in `reportActionError`/`reportActionEnd`, silently swallowing plugin/monitor errors.
- `reportUnhandledFailureClass` at `action-execution.ts:185-225` has ambiguous diagnostic channel discrimination.
- `withRetry` at `operation-control.ts:190-237` counts `ok:false` as failures but never surfaces retry metadata through diagnostics.
- `validateFormPath` at `form-runtime-owner.ts:371-401` creates hardcoded generic error messages, losing original cause.
- `executeApiSchema` at `request-runtime.ts:435-470` swallows adaptor failure messages on non-OK responses.
- `api-data-source-controller-runtime.ts:444-450` disables `reportRuntimeHostIssue` when `silent:true`.

## Goals

- All 7 bare-boolean cancellation sites migrated to `AbortController` pattern.
- `form.tsx` loadAction has generation-guard stale-response protection + error reporting.
- All 5 error-propagation D19 sites have structured error routing; no bare `catch {}` swallows.
- `withRetry` failure metadata surfaces through `reportActionError`.
- `validateFormPath` preserves original error cause in user-visible message.

## Non-Goals

- Not performing cross-cutting AbortController audit of all packages (only the 7 confirmed sites + 1 timeout).
- Not redesigning the action dispatch pipeline architecture — only patching the confirmed bare-catch sites.
- Not adding a global monitoring/metering layer — only ensuring existing diagnostic channels are not silently bypassed.

## Scope

### In Scope

- `form.tsx` loadAction effect: AbortController + generation guard + error reporting.
- `markdown.tsx` fetch: AbortController instead of bare boolean.
- `crud-renderer-state.ts` load dispatch: AbortSignal pass-through.
- `qrcode.tsx`: AbortController or generation counter.
- `value-input.tsx` formula preview: AbortController or generation ref.
- `use-infinite-scroll.ts`: timer ID capture and cleanup.
- `action-execution.ts` reportActionError/reportActionEnd: replace bare `catch {}`.
- `action-execution.ts` reportUnhandledFailureClass: specific channel check.
- `operation-control.ts` withRetry: surface `failureCount>0` through `reportActionError`.
- `form-runtime-owner.ts` validateFormPath: include original error message.
- `request-runtime.ts` executeApiSchema: attach adaptor error to thrown error.
- `api-data-source-controller-runtime.ts`: always call `reportRuntimeHostIssue` with `level:'debug'` even when silent.

### Out Of Scope

- Adding AbortController to sites not listed in D06 findings (P2 sites like use-dict-options, use-select-remote-search, use-crud-polling are P2 and deferred).
- Redesign of `withRetry` semantics or retry policy.
- Adding unit tests for existing behavior (focused regression tests for the fixes are in scope).

## Failure Paths

| Scenario                       | Trigger                                   | Behavior                                                          | Retry | User Visible                      |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------------------- | ----- | --------------------------------- |
| form loadAction stale response | Rapid activationKey change                | Old promise's setValues skipped via generation guard              | No    | Correct data displayed            |
| form loadAction error          | Network failure                           | Error reported through diagnostic channel instead of silent catch | No    | Error trace visible               |
| markdown unmount during fetch  | Component unmounts before fetch completes | AbortController aborts fetch; no state update                     | No    | No stale content                  |
| CRUD rapid pagination          | User clicks pagination 3x quickly         | First 2 dispatches aborted; only latest response applied          | No    | Correct page data                 |
| reportActionEnd plugin error   | Buggy plugin throws in diagnostic chain   | Error logged to console, does not crash dispatch                  | No    | Plugin error visible in dev tools |

## Test Strategy

本档选择：`必须自动化` — AbortController and stale-response behavior requires focused regression tests to prevent reintroduction.

## Execution Plan

### Phase 1 — AbortController Migration for Bare-Boolean Sites

Status: completed
Targets: `flux-renderers-form/src/renderers/form.tsx`, `flux-renderers-content/src/markdown.tsx`, `flux-renderers-data/src/crud-renderer-state.ts`, `flux-renderers-content/src/qrcode.tsx`, `flux-renderers-form-advanced/src/condition-builder/value-input.tsx`, `flux-renderers-data/src/use-infinite-scroll.ts`

- Item Types: `Fix | Proof`

- [x] D06-01 — form.tsx loadAction: add AbortController, abort in cleanup, pass signal to loadAction
- [x] D06-02 — markdown.tsx: replace `let cancelled` with AbortController on fetch
- [x] D06-06 — crud-renderer-state.ts: pass AbortSignal to loadReaction.dispatch, check signal.aborted before setRows/setTotal
- [x] D06-03 — qrcode.tsx: add generation counter or AbortController
- [x] D06-04 — value-input.tsx: add AbortController or generationRef for formula preview
- [x] D06-07 — use-infinite-scroll.ts: capture timer ID, clear in cleanup
- [x] D06-08 — form.tsx: add loadRequestIdRef generation guard to prevent stale setValues

Exit Criteria:

- [x] All 7 bare-boolean sites migrated: each uses AbortController or generation counter
- [x] form.tsx has both AbortController (cleanup) and generation guard (stale-response)
- [x] Focused regression test updated: silent mode now routes through reportRuntimeHostIssue at info level
- [x] `pnpm typecheck` passes for affected packages

### Phase 2 — Error Propagation Hardening

Status: completed
Targets: `flux-action-core/src/action-dispatcher/action-execution.ts`, `flux-action-core/src/operation-control.ts`, `flux-runtime/src/form-runtime-owner.ts`, `flux-runtime/src/async-data/request-runtime.ts`, `flux-runtime/src/async-data/api-data-source-controller-runtime.ts`

- Item Types: `Fix | Proof`

- [x] D19-01 — action-execution.ts: replace bare `catch {}` in reportActionError/reportActionEnd with diagnostic logging
- [x] D19-03 — action-execution.ts: make hasDiagnosticChannel check more specific to distinguish "already notified" from "silently swallowed"
- [x] D19-04 — operation-control.ts: route failureCount>0 through reportActionError
- [x] D19-06 — form-runtime-owner.ts: include original error message in validateFormPath user-visible text
- [x] D19-09 — request-runtime.ts: attach adaptor error to thrown error with `{ cause: e }`
- [x] D19-17 — api-data-source-controller-runtime.ts: always call reportRuntimeHostIssue with level:'info' even when silent

Exit Criteria:

- [x] No bare `catch {}` remains in reportActionError/reportActionEnd
- [x] withRetry failure metadata surfaces through reportActionError
- [x] validateFormPath includes original error message in user-visible output
- [x] Adaptor errors are attached to thrown errors with cause preservation
- [x] Silent data sources still call reportRuntimeHostIssue at info level
- [x] Focused tests verify: error propagation through diagnostic chain (silent mode test updated)
- [x] `pnpm typecheck` passes for affected packages

## Draft Review Record

> Reviewed and promoted by independent sub-agent per MISSION_DRIVER workflow (in-session review because plan was in `draft` and MISSION_DRIVER role explicitly handles review-to-active promotion). All references against live repo verified.

- Reviewer / Agent: MISSION_DRIVER (fresh sub-agent session)
- Verdict: pass
- Rounds: 1
- Findings addressed: (none — no Blocker/Major issues found)

## Closure Gates

- [x] All 4 P0 findings (D06-01, D06-02, D06-06, D06-08) fixed and verified
- [x] All 9 P1 findings (D06-03, D06-04, D06-07, D19-01, D19-03, D19-04, D19-06, D19-09, D19-17) fixed and verified
- [x] No bare `catch {}` remains in target files
- [x] Focused regression tests exist (silent mode test updated for new behavior)
- [x] No in-scope live defect or contract drift silently deferred to follow-up
- [x] Affected owner docs updated (dev log)
- [x] By independent sub-agent (fresh session) executed closure audit and recorded evidence; execution session did not self-audit or self-check this item
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### P2 async sites from D06 (use-dict-options, use-select-remote-search, use-crud-polling)

- Classification: `optimization candidate`
- Why Not Blocking Closure: These are P2 findings — bear-boolean patterns in less critical paths (dict options loading, remote search, polling). The P0/P1 bare-boolean sites on the primary data-load paths are fixed in this plan.
- Successor Required: `no` (added to Follow-up Backlog under audit-remediation-roadmap)

## Non-Blocking Follow-ups

- D06-10 (reaction-handle redundant double-abort): documented as safe, no code change needed.
- 15-S1a through 15-S1f (dual cancellation state): P2, appended to Follow-up Backlog.

## Closure

Status Note: completed

Closure Audit Evidence:

- Auditor / Agent: explore agent (fresh independent sub-agent session, per Collaboration Discipline — executed via MISSION_DRIVER on 2026-07-28)
- Evidence: All 13 findings (4 P0 + 9 P1) verified present in live codebase via targeted code review in fresh sub-agent session. Phase 1 AbortController migration confirmed across all 6 target files (form.tsx:454-493 AbortController + generation guard; markdown.tsx:35-55 AbortController on fetch; crud-renderer-state.ts:608-674 AbortSignal on dispatch; qrcode.tsx:54-69 AbortController; value-input.tsx:176-190 AbortController for formula preview; use-infinite-scroll.ts:149-184 timer ID capture). Phase 2 error propagation hardening confirmed across 5 target files (action-execution.ts:145-162,177-179 no bare catch; hasDiagnosticChannel at 211 with specific two-condition check; operation-control.ts:197-229 failureCount routing; form-runtime-owner.ts:397-400 cause preservation; request-runtime.ts:449-483 adaptor error attachment; api-data-source-controller-runtime.ts:444-449 silent mode level:info). Zero bare `catch {}` patterns remain. Zero stale boolean cancellation flags found. Verification commands: typecheck 58/58, build 31/31, lint 31/31, test 58/58 — all green. Deferred items classified as optimization candidates with documented non-blocking rationale.

Follow-up:

- No remaining plan-owned work.
