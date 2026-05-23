# 312 Open-Ended Adversarial Review 2026-05-15 Session2 Error Boundary Robustness Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/round-02.md` (Finding 3, global Finding 7)
> Related: `docs/plans/307-open-ended-adversarial-review-2026-05-15-session2-owner-routing-plan.md`

## Purpose

Fix the live error-boundary robustness gap in `renderErrorMessage()` in `node-error-boundary.tsx`: fallback coercion for non-Error throw values is not total, so values such as `Object.create(null)` can make the fallback renderer throw and cascade a single-node failure into a broader tree crash. The original adversarial review framed this as a Symbol case, but the live runtime already handles `String(Symbol(...))`; this plan closes the real still-live coercion gap while retaining Symbol regression proof.

Note: A second adjacent gap (runtime/page/surface creation in `schema-renderer.tsx` outside any error boundary) was identified during exploratory analysis but is NOT part of the formal adversarial-review findings. It is recorded as a Non-Blocking Follow-up below and not owned by this plan.

## Current Baseline

- `packages/flux-react/src/node-error-boundary.tsx:26-33` currently uses plain `String(error ?? '')` for non-Error values. In the live JS runtime, `String(Symbol('boom'))` is already safe, but `String(Object.create(null))` throws `TypeError: Cannot convert object to primitive value`. If that happens while rendering a node fallback, the secondary throw can escape the node boundary and broaden the failure domain.
- `packages/flux-react/src/__tests__/error-boundary.test.tsx` had coverage for `Error`, string, and null values, but no test covered Symbol fallback rendering, null-prototype/non-coercible thrown values, or suppression of fallback-render cascades through `SchemaRootErrorBoundary`.
- Both `NodeErrorBoundary` (line 128-131) and `SchemaRootErrorBoundary` (line 91-92) use `console.error()` to log caught errors. No structured error reporting or telemetry path.

## Goals

- `renderErrorMessage()` must survive any JavaScript value (including `Symbol`, `Object.create(null)`, `undefined`, number, etc.) without throwing.
- Preserve the existing Symbol-safe behavior with explicit regression proof while closing the still-live non-coercible object fallback gap.

## Non-Goals

- No changes to the error boundary architecture (no replacement of class-based `Component` boundaries).
- No addition of structured error reporting infrastructure (console.error is sufficient for the current fix).
- No changes to `NodeErrorBoundary`'s retry mechanism or visual design.
- No wrapping of runtime/page/surface creation under error boundary (out of scope for this finding; recorded as follow-up).

## Scope

### In Scope

- `renderErrorMessage()` total safe-string coercion for non-Error throw values.
- Focused regression tests for Symbol rendering and non-coercible fallback values.

### Out Of Scope

- Runtime/page/surface creation under error boundary (not a formal adversarial-review finding; recorded as Non-Blocking Follow-up).
- Adding `AbortSignal` or root cancel tokens to action dispatch (Finding 8, owned by Plan 311).
- Cycle detection in `hasSourceProps` BFS (Finding 9, owned by Plan 310).
- Import/action security perimeter fixes (Findings 5, 6, owned by Plan 311).
- Any other error-boundary architectural changes beyond the identified gap.

## Execution Plan

### Phase 1 - Fix `renderErrorMessage` Safe String Coercion

Status: completed
Targets: `packages/flux-react/src/node-error-boundary.tsx`

- Item Types: `Fix`

- [x] Replace `String(error ?? '')` with a safe conversion that guarantees fallback rendering survives `symbol` values and non-coercible object values while preserving the current fallback behavior for ordinary `Error`/string cases.
- [x] Record the broader coercion hardening in `docs/logs/2026/05-15.md` as the actual live closure surface for this plan.

Exit Criteria:

- [x] `renderErrorMessage(Symbol('boom'))` still returns a non-throwing string (for example `"Symbol(boom)"`).
- [x] `renderErrorMessage(Object.create(null), 'Render error')` falls back without throwing.
- [x] Existing tests continue to pass without modification.
- [x] New regression tests verify fallback rendering does not cascade through `SchemaRootErrorBoundary` for Symbol or non-coercible thrown values.
- [x] No owner-doc update required (behavioral fix internal to error-boundary module; existing architecture docs do not describe `renderErrorMessage` contract).
- [x] `docs/logs/2026/05-15.md` updated.

### Phase 2 - Regression Tests and Verification

Status: completed
Targets: `packages/flux-react/src/__tests__/error-boundary.test.tsx`

- Item Types: `Fix | Proof`

- [x] Add test: root fallback rendering with `Symbol('boom')` remains non-throwing.
- [x] Add test: `SchemaRootErrorBoundary` + `NodeErrorBoundary` cascade — a Symbol-throwing child within `NodeErrorBoundary` is caught by `NodeErrorBoundary` and stays at the node-level fallback.
- [x] Add test: a non-coercible thrown value such as `Object.create(null)` does not propagate from node fallback render into `SchemaRootErrorBoundary`.
- [x] Record the broader coercion hardening in the daily log as the actual closure surface, not as optional defense-in-depth.

Exit Criteria:

- [x] All new tests pass.
- [x] Existing tests in `error-boundary.test.tsx` remain green.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm test --filter @nop-chaos/flux-react` passes.
- [x] `pnpm lint` passes.
- [x] `No owner-doc update required` — this phase is proof-only and does not change the supported architecture contract.
- [x] `docs/logs/2026/05-15.md` updated.

## Closure Gates

- [x] `renderErrorMessage()` no longer throws on Symbol input and no longer escalates the recorded fallback crash.
- [x] All focused regression tests are in place and passing.
- [x] No in-scope defect silently deferred to follow-up.
- [x] Independent closure audit confirms the plan-owned fix is complete.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- **Wrap runtime/page/surface creation under error boundary in `schema-renderer.tsx`**: The exploratory analysis identified that `createRendererRuntime`, `createPageRuntime`, and `createSurfaceRuntime` execute outside `SchemaRootErrorBoundary`, meaning a failure during runtime creation crashes the entire `SchemaRenderer`. This was NOT part of the formal adversarial-review findings and is intentionally excluded from this plan's scope. Classification: `out-of-scope improvement`. When pursued, it will require careful analysis of the `queueMicrotask` dispose sequence to avoid regressions.

## Closure

Status Note: Closed after correcting the plan framing to the actual live coercion gap, landing total-safe fallback rendering for non-`Error` throw values in `renderErrorMessage()`, preserving Symbol-safe behavior with explicit regression proof, and confirming on an independent audit that no in-scope execution debt remains.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d5293138ffeDOVweeoD0IHurU`
- Evidence: Independent closure audit re-read Plan `312`, `docs/logs/2026/05-15.md`, `packages/flux-react/src/node-error-boundary.tsx`, and `packages/flux-react/src/__tests__/error-boundary.test.tsx`, and confirmed that the plan-owned live defect was the non-total fallback coercion gap for non-`Error` throws rather than a Symbol-only crash, that the `Object.create(null)` escalation path is closed with Symbol regression proof retained, and that no in-scope work remains.

Follow-up:

- Runtime/page/surface creation still occurs outside `SchemaRootErrorBoundary` in `schema-renderer.tsx`, but that adjacent improvement was explicitly adjudicated as an `out-of-scope improvement` for this plan and remains tracked only under `Non-Blocking Follow-ups`.
