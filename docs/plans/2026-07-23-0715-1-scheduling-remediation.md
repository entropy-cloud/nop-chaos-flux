# 1 Scheduling Package Audit Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-23
> Source: `docs/audits/2026-07-23-0714-multi-audit-scheduling.md`
> Related: N/A

## Purpose

Resolve all 18 confirmed actionable findings (15 P2, 3 P3) from the 2026-07-23 multi-dimensional audit of `@nop-chaos/flux-renderers-scheduling`, covering Gantt, Kanban, Calendar, and BarcodeInput.

## Current Baseline

- The multi-dimensional audit (2026-07-23) identified 20 findings across 16 dimensions; 1 rejected (F20 — splice mutation), 1 not actionable (F19 — raw `<table>` justified for virtual scrolling), 18 actionable.
- All four components (Gantt, Kanban, Calendar, BarcodeInput) exist in `packages/flux-renderers-scheduling/src/` with production code.
- All renderers follow the `RendererComponentProps` contract; no P0/P1 issues exist.
- BarcodeInput has the densest cluster (5 P2 items — CSS scoping, double label, a11y, error handling).
- CSS across all components uses hardcoded hex colors instead of CSS variables.
- `quick-reference.md` has no entry for `@nop-chaos/flux-renderers-scheduling`.

## Goals

- Fix all 15 P2 findings across BarcodeInput, Gantt, Kanban, Calendar, CSS, and docs.
- Fix all 3 actionable P3 findings.
- `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && build && lint && test` passes after remediation.
- `docs/references/quick-reference.md` updated with scheduling package entry.

## Non-Goals

- F19 (raw `<table>` in Gantt grid) — justified for virtual scrolling, no change.
- F20 (splice mutation in kanban-helpers) — rejected by review (uses `structuredClone`), no change.
- Adding new features or capabilities — remediation only.
- Architectural redesign beyond the specified extractions in F15.

## Scope

### In Scope

- Fix F01–F18 as defined in the audit findings.
- Update `docs/references/quick-reference.md` with `flux-renderers-scheduling` entry.

### Out Of Scope

- Architectural changes beyond F15 extractions.
- Non-scheduling packages.
- Adding new test coverage beyond the type-contract tests specified in F17.

## Test Strategy

档位选择：`必须自动化`

Each fix targets observable behavior. Existing tests must remain green. F17 adds type-contract coverage for `BarcodeInputSchema`. Full suite runs at closure.

## Execution Plan

### Phase 1 - BarcodeInput Remediation

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/`

- Item Types: `Fix` (all items)

- [x] F03: Scope `[data-slot]` selectors under `.nop-barcode-input` prefix
- [x] F04: Resolve double label — either set `frameWrap: 'none'` in definition or remove internal `<Label>`
- [x] F05: Wire `aria-describedby` between error div and input using `useId()`
- [x] F06: Add `aria-required={!!resolved.required ?? undefined}` to input
- [x] F07: Surface scanner failure to user (e.g., `setScannerError('Camera unavailable')`)
- [x] F17: Add `BarcodeInputSchema` test cases to all three phases of `scheduling-boundary-narrowing.test.ts`
- [x] F18: Standardize `prepare-wasm.ts` naming to `*-utils.ts` convention

Exit Criteria:

- [x] BarcodeInput renders without duplicate label in DOM
- [x] Scanner failure shows user-facing message (not just `console.warn`)
- [x] `aria-describedby` and `aria-required` present on input element when field is required
- [x] CSS selectors scoped under `.nop-barcode-input` — cross-component leakage eliminated
- [x] `BarcodeInputSchema` included in all three boundary-narrowing test phases
- [x] Utils naming follows `*-utils.ts` convention
- [x] Local `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes

### Phase 2 - Error Handling & State

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/`, `packages/flux-renderers-scheduling/src/kanban/`

- Item Types: `Fix` (all items)

- [x] F08: `exportToPNG` re-throws error (or returns `Promise<{success, error?}>`) so callers can catch
- [x] F09: Kanban filter compilation error surfaces to user via state + feedback UI
- [x] F10: Add `useEffect(() => { /* reconcile _resourceOpenMap from resourcesData */ }, [resourcesData])`

Exit Criteria:

- [x] `await calendarRef.exportToPNG()` propagates errors to caller
- [x] Invalid kanban filter expression produces visible user feedback
- [x] Calendar resource open/close state stays in sync when `resourcesData` prop changes dynamically
- [x] Local `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes

### Phase 3 - API Surface, CSS Theming, Code Structure

Status: completed
Targets: Cross-component in `packages/flux-renderers-scheduling/src/`

- Item Types: `Fix` (all items)

- [x] F01: Change Gantt `onMount`/`onUnmount` from `kind: 'meta'` to `kind: 'event'`
- [x] F02: Replace all hardcoded hex colors with CSS variables (`var(--color-background)`, `var(--color-muted)`, etc.)
- [x] F11: Remove deprecated dead code: `useKanbanCollab`, `useKanbanAdder`, `GanttCompact` files and exports
- [x] F13: Add structural comparison (e.g., `shallowEqual`) or narrow selector for Kanban `useScopeSelector`
- [x] F15: Extract shared ownership hook (`useCalendarOwnership`); split Kanban toolbar/column-adder into separate files
- [x] F16: Replace `GanttStore` `as unknown as new (...)` with factory function or add JSDoc explaining the assertion

Exit Criteria:

- [x] Gantt `onMount`/`onUnmount` consistently use `kind: 'event'` matching Kanban, Calendar, and BarcodeInput
- [x] All CSS files use `var(--color-*)` — zero hardcoded hex colors
- [x] `useKanbanCollab`, `useKanbanAdder`, `GanttCompact` no longer exported from barrel index
- [x] Kanban board re-renders only when actually-referenced scope data changes
- [x] `kanban-board.tsx` under 600 lines; `calendar.tsx` under 450 lines
- [x] GanttStore uses factory function or has accurate `new (config?) => GanttStoreApi` type
- [x] Local `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes

### Phase 4 - Performance & Documentation

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-layout-utils.ts`, `docs/references/quick-reference.md`

- Item Types: `Fix` (all items)

- [x] F12: Add `flux-renderers-scheduling` entry to Package Directory Map in `quick-reference.md` (after `flux-renderers-layout`, before `ui`)
- [x] F14: Replace `overlapping.includes()` with `overlappingSet: Set<CalendarEvent>` for O(1) lookups

Exit Criteria:

- [x] `quick-reference.md` Package Directory Map includes `| flux-renderers-scheduling | @nop-chaos/flux-renderers-scheduling | 7 |`
- [x] `detectConflicts` uses `Set<CalendarEvent>` instead of array for conflict deduplication
- [x] Local `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes

## Draft Review Record

- Reviewer / Agent: mission_driver_review_20260723
- Verdict: `pass`
- Rounds: 1
- Findings addressed: No Blocker/Major issues found. Minor observations noted (Phase Exit Criteria include local typecheck per Rule 18 exception; Phase 3 Exit Criteria only verify de-exportation but execution items include file removal; F18 covers `prepare-wasm.ts` but `barcode-queue.ts` also deviates from `*-utils.ts` convention per audit).

## Closure Gates

- [x] All 15 in-scope P2 findings fixed (F01–F13, F15, F16)
- [x] All 3 in-scope P3 findings fixed (F14, F17, F18)
- [x] All Phase Exit Criteria satisfied — no in-scope item remains unchecked
- [x] No findings silently downgraded to deferred or follow-up
- [x] `docs/audits/2026-07-23-0714-multi-audit-scheduling.md` status updated to `closed`
- [x] `docs/references/quick-reference.md` synced to live baseline
- [x] By independent sub-agent (fresh session) executed closure-audit completed and recorded
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck`
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling build`
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling lint`
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling test`

## Deferred But Adjudicated

No deferred items — all actionable findings are in-scope and non-deferrable.

## Non-Blocking Follow-ups

No follow-ups — all findings addressed in-scope.

## Closure

Status Note: All 18 actionable findings fixed (15 P2 + 3 P3). `typecheck && build && lint && test` all pass.

Closure Audit Evidence:

- Auditor / Agent: closure_auditor_20260723 (independent fresh session)
- Evidence: Live code verification via grep/glob/read confirmed all 18 findings landed. F01: scheduling-renderer-definitions.ts:45-46 onMount/onUnmount kind:'event'. F02: zero hardcoded hex colors in runtime CSS (calendar-print.css media-print whites excluded). F03: barcode-input.css scoped under .nop-barcode-input. F05/F06: aria-describedby/aria-required on barcode-input.tsx:244-245. F07: scannerError state + render at barcode-input.tsx:105/277-279. F08: exportToPNG re-throws at use-calendar-export.ts:70. F09: filterError state + alert at kanban-board.tsx:137/246/510-515. F10: resourceOpenMap useEffect at calendar.tsx:275-284. F11: useKanbanCollab/useKanbanAdder/GanttCompact files absent. F12: quick-reference.md:29. F13: shallowEqual in kanban-board.tsx:61. F14: overlappingSet Set<CalendarEvent> at calendar-layout-utils.ts:190. F15: use-calendar-ownership.ts + split kanban-toolbar/column-adder. F16: createGanttStore factory at gantt-store.ts:44. F17: BarcodeInputSchema in all 3 boundary-narrowing test phases. F18: prepare-wasm-utils.ts. 592-line kanban-board.tsx ≤ 600, 432-line calendar.tsx ≤ 450. Phase Exit Criteria, Closure Gates, five-point consistency all verified.

Follow-up:

- No remaining plan-owned work.
