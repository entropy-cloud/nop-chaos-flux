# 1 Scheduling Critical Bug Fixes

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: `docs/audits/2026-07-21-1920-open-audit-scheduling.md` (F-51/F-52/F-53/F-54/F-58/F-59/F-62/F-63), `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (06-001/06-002/06-003/06-004/06-005/06-006/06-007)

## Purpose

Fix all confirmed user-facing functional defects in the scheduling package (Gantt, Kanban, Calendar, BarcodeInput) that cause broken visual feedback, permanent UI lock, data loss, or unhandled rejections. These are independent per-component fixes bundled because they share the same owner package (`flux-renderers-scheduling`) and verification baseline (same `pnpm test` suite).

## Current Baseline

- All 20 findings (F-51 to F-70) from open-audit confirmed `Certain` or `Likely` against live code.
- 6 findings from multi-audit Dimension 06 (P1/P2) confirmed against live code.
- `pnpm typecheck`/`build`/`lint`/`test` all pass at baseline.
- Deep overlap: F-53 = 06-001, F-62 = 06-002, F-63 = 06-006 = 19-01 (same defect reported by both audits).

## Goals

- Gantt drag ghost positioned at correct bar coordinates (F-51)
- Document-level event listeners cleaned up on unmount mid-drag/link-draw/resize (F-52)
- SchedulerConfig status recovers from `scheduling` after action completes (F-53/06-001)
- Kanban undo stack not corrupted by React 19 Strict Mode double-invocation (F-54)
- Calendar month view weekend styling applied correctly (F-58)
- Calendar `isToday()` uses UTC comparison matching calendar date construction (F-59)
- BarcodeInput scanner retry works after abort/reopen cycle (F-62/06-002)
- BarcodeInput async handlers have proper error catching (F-63/06-006/19-01)
- Calendar PNG export has cancellation and concurrency guard (06-003)
- Gantt export module-level flag has timeout guard (06-004)
- Barcode `detectWithSkewRetry` accepts AbortSignal (06-005)
- `exportToPdf` AbortSignal test coverage added (06-007)

## Non-Goals

- Schema/contract drift (Kanban/Calendar unconsumed props, BarcodeInput validation props) — Plan 2
- Reactive subscription precision (unnecessary revision subscriptions, unstable callbacks) — Plan 3
- Error propagation fidelity (WebSocket, Error.cause, non-Error throws) — Plan 3
- Accessibility — Plan 3
- Dead component removal — Plan 2

## Scope

### In Scope

- `src/gantt/hooks/use-gantt-drag.ts` — ghost positioning, listener cleanup
- `src/gantt/hooks/use-gantt-link-draw.ts` — listener cleanup
- `src/gantt/gantt-layout.tsx` — resize listener cleanup
- `src/gantt/components/scheduler-config.tsx` — status recovery
- `src/gantt/components/export-handles.tsx` — timeout guard
- `src/gantt/components/export-handles.test.ts` — AbortSignal test for exportToPdf
- `src/kanban/kanban-board.tsx` — setState updater purity
- `src/calendar/components/calendar-month-view.tsx` — data-weekend attribute
- `src/calendar/utils/calendar-date-utils.ts` — isToday UTC
- `src/calendar/hooks/use-calendar-export.ts` — cancellation/concurrency guard
- `src/barcode-input/barcode-input.tsx` — error catching, scan click safety
- `src/barcode-input/utils/prepare-wasm.ts` — promise cache abort handling
- `src/barcode-input/utils/barcode-detector-utils.ts` — AbortSignal param
- `src/barcode-input/hooks/use-barcode-detect.ts` — AbortSignal plumbing

### Out Of Scope

- Kanban `filterCard` prop wiring (Plan 2)
- Calendar unconsumed props/events (Plan 2)
- BarcodeInput validation schema props (Plan 2)
- Reactive subscription precision (Plan 3)
- Error propagation non-Error throws / Error.cause (Plan 3)
- Accessibility (Plan 3)

## Execution Plan

### Phase 1 — Gantt drag ghost + listener leaks

Status: completed
Targets: `use-gantt-drag.ts`, `use-gantt-link-draw.ts`, `gantt-layout.tsx`

- Item Types: `Fix`

- [x] F-51: Fix `useGanttDrag.onPointerDown` to position ghost at bar coordinates (not container). Pass bar element's rect to ghost positioning logic.
- [x] F-52: Add `useEffect` cleanup for document-level `pointermove`/`pointerup`/`keydown` listeners in `use-gantt-drag.ts`, `use-gantt-link-draw.ts`, and `gantt-layout.tsx` resize handles.
- [x] F-52: Add test simulating unmount during active drag and asserting no window listeners remain.

Exit Criteria:

- [x] Drag ghost appears at correct bar position (verified by focused test or manual assertion)
- [x] Unmounting mid-drag/link-draw/resize cleans up all document listeners (verified by listener-count test)

### Phase 2 — SchedulerConfig status recovery + export safety

Status: completed
Targets: `scheduler-config.tsx`, `export-handles.tsx`, `export-handles.test.ts`

- Item Types: `Fix | Proof`

- [x] F-53/06-001: Add async status recovery to `handleSchedule` — catch scheduling errors, timeout after configurable duration, set `done`/`error` status. Fix: `onScheduleAction` returns `Promise<void>` or add `callback` pattern.
- [x] 06-004: Add `AbortSignal.timeout(60000)` to `exportToPng`/`exportToPdf`/`exportToExcel` in `export-handles.tsx`. Add guard timer in `finally` to auto-reset after timeout.
- [x] 06-007: Add AbortSignal cancellation test for `exportToPdf`.

Exit Criteria:

- [x] Schedule button no longer permanently disabled after click (status transitions to `done`/`error`)
- [x] Export functions auto-reset export guard after timeout
- [x] `exportToPdf` AbortSignal test exists and passes

### Phase 3 — Kanban setState purity

Status: completed
Targets: `kanban-board.tsx`

- Item Types: `Fix`

- [x] F-54: Extract `setUndoStackState` calls from inside `setBoardData`/`setUndoStackState` updater functions. Use `useEffect` or call both setters independently.

Exit Criteria:

- [x] Kanban undo stack entries are not duplicated in React 19 Strict Mode (verified by focused test with `React.StrictMode` wrapper)

### Phase 4 — Calendar weekend + isToday + export

Status: completed
Targets: `calendar-month-view.tsx`, `calendar-date-utils.ts`, `use-calendar-export.ts`

- Item Types: `Fix | Proof`

- [x] F-58: Change `data-weekend` JSX attribute from `weekendIndicator` (string `'weekend'`) to `weekendIndicator === 'weekend' ? 'true' : undefined` matching Gantt's pattern.
- [x] F-58: Add test verifying `data-weekend` attribute renders as `"true"` for weekend days, undefined for weekdays.
- [x] F-59: Change `isToday` to compare UTC dates: `isSameDay(date, startOfToday(/* UTC */))` or construct a UTC `new Date()`.
- [x] F-59: Write focused test verifying `isToday` correctness across timezone boundaries with mock timezone.
- [x] 06-003: Add `useRef` exporting guard, AbortSignal + timeout to `exportToPNG`. Wrap `toBlob` in Promise for try/catch. Add concurrency guard.

Exit Criteria:

- [x] Weekend styling renders with `data-weekend="true"` matching CSS selector
- [x] `isToday` produces correct results across timezone boundaries (verified by test with mock timezone)
- [x] Calendar export has abort/timeout/concurrency guard and does not leak blob URLs

### Phase 5 — BarcodeInput scanner retry + error handling + AbortSignal

Status: completed
Targets: `prepare-wasm.ts`, `barcode-input.tsx`, `barcode-detector-utils.ts`, `use-barcode-detect.ts`

- Item Types: `Fix | Proof`

- [x] F-62/06-002: Check `signal?.aborted` at `prepareWasm` entry. Clear cached promise entry on abort or error, or automatically call `resetWasmPromise()` on overlay close.
- [x] F-62/06-002: Write test verifying scanner recovery after abort-then-retry cycle.
- [x] F-63/06-006/19-01: Add try/catch to `handleScanClick`. Replace `.catch(() => {})` with error logging (e.g. `console.warn`).
- [x] 06-005: Add optional `AbortSignal` parameter to `detectWithSkewRetry`, check at each retry iteration.
- [x] Verify `use-barcode-detect.ts` poll function passes signal through to `detectWithSkewRetry`.

Exit Criteria:

- [x] Scanner recovers after close-reopen cycle without page refresh (verified by test)
- [x] `handleScanClick` has try/catch — no unhandled rejections on camera permission denial
- [x] `detectWithSkewRetry` accepts and respects AbortSignal

## Failure Paths

N/A — each fix is localized to one component; no cross-component or API-contract changes. Pure internal fixes.

## Test Strategy

档位选择：`必须自动化`

Every fix either (a) has a focused test added, or (b) is already covered by an existing test that needs correction. F-52, F-54, F-58, F-59, 06-007 require new tests. F-51 may require a simulated pointer-event test. F-53/06-001 requires testing async status recovery. F-62 requires testing abort-then-retry cycle.

## Closure Gates

- [x] All 11 in-scope confirmed live defects (F-51/F-52/F-53/F-54/F-58/F-59/F-62/F-63 + 06-003/06-004/06-005) fixed and verified
- [x] Focused verification (test or manual check) confirms each fix addresses the root cause, not just symptoms
- [x] No confirmed live defect from the in-scope set silently downgraded to deferred/follow-up
- [x] Affected owner docs updated: No owner-doc update required — all fixes are internal component behavior, no public contract/API/schema changes
- [x] By independent sub-agent (fresh session) executed closure-audit completed with evidence recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test` (scheduling package + full suite)

## Draft Review Record

- Reviewer / Agent: `openCode review agent` (fresh session, Mission Driver review)
- Verdict: `pass`
- Rounds: 1
- Findings addressed:
  - Minor: Phase 4 added explicit Proof items for tests implied in Exit Criteria
  - Minor: Phase 5 added explicit Proof items for tests implied in Exit Criteria

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

None.

## Closure

Status Note: completed — all 5 phases executed and verified. 665 tests pass across the scheduling package. `pnpm typecheck`, `pnpm build`, and `pnpm lint` (0 errors, 1 pre-existing warning) all green.

Closure Audit Evidence: Independent closure audit (fresh sub-agent session, Mission Driver). Verified all 12 fix items landed with real non-stub code via live code inspection (grep/read across 15+ source files and all corresponding test files). pnpm typecheck 56/56 ✓, pnpm build 30/30 ✓, pnpm lint 0 errors ✓, pnpm test — scheduling 665/665 ✓, full suite 56/56 ✓. Anti-hollow check passed (no empty bodies, no return-null placeholders, no swallowed exceptions). Deferred honesty confirmed (Deferred section: None). All 9 Closure Gates now [x].

Follow-up: None — all in-scope defects fixed per exit criteria.
