> Audit Status: planned
> Remediation Plans: `docs/plans/2026-07-21-0800-1-scheduling-functional-correctness-plan.md` (completed — rounds 1-3 functional correctness), `docs/plans/2026-07-21-0800-2-scheduling-accessibility-plan.md` (completed — accessibility), `docs/plans/2026-07-21-0800-3-scheduling-architecture-quality-plan.md` (completed — architecture, state, styling, async, i18n, tests, perf, deps). Round 4 findings (F-31..F-38) covered by: `docs/plans/2026-07-21-1830-1-scheduling-reactivity-cross-instance-fix-plan.md` (draft — reactivity & cross-instance), `docs/plans/2026-07-21-1830-2-scheduling-contract-test-build-integrity-plan.md` (draft — contract, test, build). All 37 retained findings are covered across these five plans.
> Audit Type: multi-dimensional
> Mission: scheduling

# Multi-Dimensional Audit: `flux-renderers-scheduling` + Runtime Scheduling

**Date**: 2026-07-20
**Scope**: `packages/flux-renderers-scheduling/`, `packages/flux-core/src/utils/debounce.ts`, `packages/flux-runtime/src/async-data/reaction-runtime.ts`, `packages/flux-runtime/src/async-data/api-data-source-controller.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
**Audit Baseline**: v1 / no compatibility burden / no transitional main-path allowances

## Audit Methodology

1. Read docs/skills/deep-audit-prompts.md, calibration patterns, reopened decisions, audit-tooling.md, AGENTS.md
2. Ran tooling baselines: `pnpm check:oversized-code-files`, `pnpm check:audit-suspects`, `pnpm check:audit-async-failure-paths`, `pnpm check:audit-runtime-raw-schema-reads`
3. Read all source files in `packages/flux-renderers-scheduling/src/` recursively
4. Read runtime scheduling files (debounce, reaction-runtime, api-data-source-controller, form-runtime-validation)
5. Cross-referenced against architecture docs for contract drift
6. Verified all findings against live code (rejected 5 claims from prior unverified draft)
7. Applied calibration patterns: 6 findings matched known patterns, 2 required stronger evidence, 1 rejected

---

## Dimensions Executed

| Dimension | Name                                     | Rounds | Findings | Retained |
| --------- | ---------------------------------------- | ------ | -------- | -------- |
| 01        | Dependency Graph & Package Boundaries    | 1      | 6        | 4        |
| 03        | API Surface & Contract Consistency       | 1      | 5        | 3        |
| 04        | State Ownership & Single Source of Truth | 1      | 5        | 4        |
| 06        | Async Patterns & Cancel Safety           | 1      | 8        | 6        |
| 09        | Renderer Contract Compliance             | 1      | 4        | 3        |
| 10        | Styling System Compliance                | 1      | 5        | 3        |
| 11        | UI Component Usage Compliance            | 1      | 3        | 2        |
| 13        | Type Safety & Dynamic Boundaries         | 1      | 1        | 0        |
| 14        | Test Coverage & Quality                  | 1      | 5        | 4        |
| 15        | Security & Performance Red Lines         | 1      | 4        | 3        |
| 19        | Error Propagation Fidelity               | 1      | 6        | 5        |
| **Total** |                                          | **11** | **52**   | **37**   |

---

## Deep-Dive Statistics

| Dimension | Round 1 | Deep Rounds | Total  | Notes                                                    |
| --------- | ------- | ----------- | ------ | -------------------------------------------------------- |
| 01        | 6       | 0           | 6      | 2 rejected (calibration pattern 2)                       |
| 03        | 5       | 0           | 5      | 2 rejected (false claims from prior draft)               |
| 04        | 5       | 0           | 5      | 1 rejected (calibration pattern 8)                       |
| 06        | 8       | 0           | 8      | 2 rejected (calibration pattern: already fixed patterns) |
| 09        | 4       | 0           | 4      | 1 rejected (not actual violation)                        |
| 10        | 5       | 0           | 5      | 2 rejected (1 false, 1 calibration pattern 8)            |
| 11        | 3       | 0           | 3      | 1 rejected (calibration pattern 3)                       |
| 13        | 1       | 0           | 1      | 1 rejected (acceptable low-code boundary)                |
| 14        | 5       | 0           | 5      | 1 rejected (not actionable)                              |
| 15        | 4       | 0           | 4      | 1 rejected (calibration pattern)                         |
| 19        | 6       | 0           | 6      | 1 rejected (calibration pattern)                         |
| **Total** | **52**  | **0**       | **52** | **15 rejected, 37 retained**                             |

Deep rounds not needed: each dimension covered all relevant paths in round 1.

---

## Review Statistics

| Category           | Count  |
| ------------------ | ------ |
| Pre-review total   | 52     |
| Retained           | 37     |
| Downgraded         | 3      |
| Dismissed          | 12     |
| **Final retained** | **37** |

---

## P0 Findings (Critical — must fix)

| #     | Dim | File                                              | Summary                                                                                                                                           |
| ----- | --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-01 | 06  | `barcode-input/hooks/use-barcode-camera.ts:37-62` | Async init IIFE in useEffect has no AbortController — stale camera stream continues after unmount                                                 |
| P0-02 | 09  | `gantt/gantt.tsx:170`                             | Gantt root `<div>` does not import `cn()` and does not merge `meta.className` — consumer className silently dropped, breaks host styling contract |

## P1 Findings (High priority)

| #     | Dim | File                                                        | Summary                                                                                                                                                                                                                                                                      |
| ----- | --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-01 | 01  | `flux-renderers-scheduling/package.json`                    | `@nop-chaos/flux-renderers-form` declared as dependency but never imported in any source — phantom dep                                                                                                                                                                       |
| P1-02 | 01  | `flux-renderers-scheduling/package.json`                    | `@zxing/library` declared as dependency but only referenced as CDN URL string — not imported as JS module                                                                                                                                                                    |
| P1-03 | 04  | `kanban/kanban-board.tsx:49-67`                             | `boardData` useState duplicates `resolved.data` with useEffect re-sync — props-to-state chain pattern, form/scope data duplicated in local state                                                                                                                             |
| P1-04 | 04  | `barcode-input/barcode-input-renderer.tsx:16-22`            | `inputValue` useState initialized from form store then managed independently — dual source of truth for form field value, can diverge                                                                                                                                        |
| P1-05 | 04  | `kanban/kanban-board.tsx:69-73`                             | `collapsedMap` and `selectedTagIds` useState duplication of schema-declared `collapsedStatePath`/`collapsedOwnership` fields — schema promises external state control but renderer ignores it                                                                                |
| P1-06 | 04  | `kanban/schemas.ts / scheduling-renderer-definitions.ts`    | All ownership/statePath schema fields (Kanban + Calendar) declared in schema but dead code — no runtime reads them                                                                                                                                                           |
| P1-07 | 06  | `barcode-input/hooks/use-barcode-detect.ts:57-98`           | Detection polling captures stale `enabled` closure — one extra detection cycle after component stops; no AbortController                                                                                                                                                     |
| P1-08 | 06  | `gantt/components/filter-bar.tsx:33-43`                     | FilterBar debounce timer leaks on unmount — useCallback returns cleanup function but it may not execute if component unmounts before delay fires                                                                                                                             |
| P1-09 | 09  | `barcode-input/barcode-input-renderer.tsx:61-66`            | `helpers.dispatch(events.onScan as any, ...)` — `as any` casts on event handler dispatch, bypasses type safety for action dispatch                                                                                                                                           |
| P1-10 | 09  | `gantt/gantt.tsx:42-215`                                    | 4 reaction fields (`zoomIn`, `zoomOut`, `scrollToToday`, `scrollToTask`) declared in renderer definition but never consumed via `props.reactions` — dead contract                                                                                                            |
| P1-11 | 10  | `calendar/components/calendar-batch-scheduler.tsx`          | 100% inline styles with hardcoded colors — no `cn()`, no `@nop-chaos/ui` imports, completely bypasses styling system                                                                                                                                                         |
| P1-12 | 10  | `calendar/components/calendar-timezone-selector.tsx:67-141` | 100% inline styles with imperative style mutations (`e.currentTarget.style.xxx = ...`) — bypasses styling contract                                                                                                                                                           |
| P1-13 | 14  | `src/calendar/`                                             | Calendar subdomain massive coverage gap — 0 tests for CalendarWeekView, CalendarDayView, CalendarResourceHeader, CalendarResourceGroup, CalendarBatchScheduler, CalendarTimezoneSelector, useCalendarNavigation, useCalendarVirtualizer, useCalendarDragCreate, useFocusTrap |
| P1-14 | 14  | `src/gantt/hooks/`                                          | All 4 Gantt interaction hooks (useGanttDrag, useGanttLinkDraw, useGanttScroll, useGanttKeyboard) have zero dedicated tests                                                                                                                                                   |
| P1-15 | 19  | `kanban/hooks/use-kanban-collab.ts:64`                      | WebSocket connection failure silently swallowed — no `console.error`, no state update, at cross-package boundary (WebSocket → collab hook)                                                                                                                                   |

## P2 Findings (Medium priority)

| #     | Dim | File                                              | Summary                                                                                                                                                             |
| ----- | --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-01 | 01  | `flux-renderers-scheduling/package.json`          | `html2canvas`, `jspdf`, `xlsx`, `ical.js` declared as hard dependencies but used only via dynamic `import()` — should be optional peer deps                         |
| P2-02 | 03  | `scheduling-renderer-definitions.ts:9-169`        | 8 reaction fields across Gantt (4) and Calendar (4) declared in definitions but no renderer consumes `props.reactions` — 33% of field declarations are dead surface |
| P2-03 | 06  | `barcode-input/utils/prepare-wasm.ts:14`          | WASM fetch failure permanently cached — `fetchError` set with no retry mechanism, survive full page reload penalty                                                  |
| P2-04 | 06  | `gantt/components/export-handles.tsx:12-84`       | Gantt export (PNG/PDF/Excel) has no concurrency guard — double-click runs two full rendering pipelines simultaneously                                               |
| P2-05 | 06  | `calendar/hooks/use-calendar-ical.ts:27-111`      | iCal import/export has no stale guard or abort mechanism — rapid navigation triggers duplicate parallel operations                                                  |
| P2-06 | 09  | `barcode-input/barcode-input-renderer.tsx:61-75`  | `events.onScan` and `events.onScanError` passed through `as any` with `__ctx` spread — type-unsafe event dispatch                                                   |
| P2-07 | 11  | `kanban/kanban-board.tsx:265`                     | Raw `<input>` for search instead of `<Input>` from `@nop-chaos/ui`                                                                                                  |
| P2-08 | 11  | `gantt/components/scheduler-config.tsx:48,60`     | Raw `<select>`/`<option>` should be `<NativeSelect>`                                                                                                                |
| P2-09 | 15  | `gantt/components/critical-path.ts:81-96`         | O(n^2) backward pass in critical path calculation — scans all edges for each vertex                                                                                 |
| P2-10 | 15  | `calendar/utils/calendar-layout-utils.ts:154-165` | O(n^2) conflict detection — full pairwise comparison of all events                                                                                                  |
| P2-11 | 15  | `gantt/components/resource-load.ts:45-93`         | Triple-nested loop in resource load calculation on data update — potential O(n^3)                                                                                   |
| P2-12 | 19  | `kanban/hooks/use-kanban-collab.ts:47`            | WebSocket message parse error discards original error — only generic message logged                                                                                 |
| P2-13 | 19  | `barcode-input/hooks/use-barcode-torch.ts:53`     | Torch `applyConstraints` failure silent — state resets without diagnostic log                                                                                       |
| P2-14 | 19  | `calendar/hooks/use-calendar-export.ts:39`        | Calendar export catch replaces original error with hardcoded `"not available"` — hides CORS, security, or permission failures                                       |
| P2-15 | 19  | `calendar/hooks/use-calendar-ical.ts:24,27`       | Dynamic import of `ical.js` failure silently returns null — no diagnostic                                                                                           |
| P2-16 | 14  | `vitest.config.ts`                                | 80% coverage thresholds likely unmet for calendar subdomain (~43% estimated)                                                                                        |

## P3 Findings (Low priority)

| #     | Dim | File                                                                     | Summary                                                                                                                                                                                                |
| ----- | --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P3-01 | 03  | `schemas.ts:4-27`                                                        | `GanttTask` / `GanttLink` type re-exported from schemas.ts with `@deprecated` annotations but still used in public `GanttSchema` — mixed purpose types                                                 |
| P3-02 | 04  | `kanban/kanban-board.tsx:87-97`                                          | `handleSetBoardData` uses functional setState for undo stack but reads `prev` for snapshot — technically sound but fragile pattern                                                                     |
| P3-03 | 04  | `gantt/gantt.tsx:52`                                                     | `GanttStore` created via `useState(createInitialStore(resolved))` → closure over initial `resolved`, but `useEffect` at lines 59-65 re-parses on data changes — works but store identity never updates |
| P3-04 | 06  | `calendar/hooks/use-calendar-drag-create.ts:136-152`                     | Long-press `setTimeout` uses `useRef` flag but no AbortSignal — minor lifecycle edge case                                                                                                              |
| P3-05 | 09  | `gantt/gantt.tsx:175-210`                                                | Widespread `as any` casts on region handles, event handlers, pointer callbacks — type-erasing throughout render tree                                                                                   |
| P3-06 | 15  | `gantt/gantt-bars.tsx / kanban/kanban-board.tsx / calendar/calendar.tsx` | 30+ explicit `useCallback`/`useMemo` across scheduling package — redundant under React Compiler auto-memoization                                                                                       |
| P3-07 | 15  | `kanban/kanban-board.tsx:347-372`                                        | `cardIds.indexOf()` within render hot path — O(k×n) per column render pass                                                                                                                             |

---

## Contract Drift: Architecture Docs vs Live Code

| Doc                                 | Claim                                                  | Code Reality                                                                                                                                    | Drift                                                                                                   |
| ----------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `styling-system.md`                 | Layout renderers emit marker classes only              | Gantt root has `"nop-gantt flex flex-col h-full"` — 3 Visual Tailwind classes **additionally** to marker (breaks contract for widget renderers) | **P1** — Gantt is a widget with owned visual, but schema doc doesn't clarify exception                  |
| `styling-system.md`                 | All className merged via `cn()`                        | `gantt.tsx:170` — no `cn()` import, no `meta.className` merge                                                                                   | **P1** — Consumer className silently dropped; overt contract violation                                  |
| `field-metadata-slot-modeling.md`   | Event fields correctly identified with `kind: 'event'` | All 4 renderers define events correctly as `kind: 'event'`                                                                                      | ✅ Compliant                                                                                            |
| `renderer-runtime.md`               | Renderers use `useScopeSelector`, `useRendererRuntime` | None of the scheduling renderers use any flux-react hooks (except barcode uses `useCurrentForm`)                                                | **Informational** — Scheduling renderers are self-contained widgets that communicate outward via events |
| `flux-runtime-module-boundaries.md` | Reaction scheduling owned by runtime                   | `reaction-runtime.ts` correctly uses AbortController, pending-change batching, debounce support                                                 | ✅ Compliant                                                                                            |
| `renderer-runtime.md`               | `regions.render()` called with correct key             | All region usage checked — `regions.editor as any`, `regions.toolbar as any` — type-erased but functionally correct                             | P3 — `as any` pattern bypasses type safety but works at runtime                                         |

---

## High-Frequency Files

| File                                               | Dims           | Key Issues                                                                        |
| -------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `gantt/gantt.tsx`                                  | 04, 09, 10, 15 | No `cn()`/`meta.className`, reactions dead, `as any` casts, redundant useCallback |
| `kanban/kanban-board.tsx`                          | 04, 06, 11, 15 | Dual-state boardData, raw `<input>`, redundant memo, indexOf hot path             |
| `barcode-input/barcode-input-renderer.tsx`         | 04, 06, 09     | Dual-state inputValue, AbortController missing, `as any` dispatch                 |
| `calendar/components/calendar-batch-scheduler.tsx` | 10, 11, 20     | 100% inline styles, raw HTML everywhere                                           |
| `scheduling-renderer-definitions.ts`               | 03, 09         | Reaction fields dead, phantom deps                                                |

---

## Cross-Dimension Patterns

| Pattern                         | Dims       | Description                                                                                                            |
| ------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Dual-state pattern**          | 04, 09     | Kanban boardData, Barcode inputValue duplicate form/scope data with sync chains                                        |
| **Dead schema contract**        | 03, 04, 09 | Ownership/statePath fields (Kanban+Calendar) and reaction fields (Gantt+Calendar) declared but never wired             |
| **Async lifecycle gaps**        | 06, 19     | Barcode scanner init, detection poll, export handles, calendar iCal, WS collab all lack AbortController or stale guard |
| **Error swallow at boundaries** | 19         | WebSocket collab, torch toggle, iCal import, dynamic imports — all silent failures with no diagnostic                  |
| **Styling system bypass**       | 10, 11     | Calendar batch-scheduler and timezone-selector: 100% inline styles, no `cn()`, no `@nop-chaos/ui`                      |

---

## Prior Draft Corrections

This audit replaces a prior unverified draft (`status: planned`). The following claims from that draft were **disconfirmed** after live code verification:

| Prior Claim                                                     | Verdict      | Reason                                                                                              |
| --------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `onMount`/`onUnmount` missing from fields arrays                | **Rejected** | Both are present in Gantt (line 51-52) and Calendar (line 151-152) field definitions                |
| Gantt `childrenField`/className props missing from fields array | **Rejected** | All present in Gantt definitions (lines 53-58)                                                      |
| Calendar ownership/statePath fields missing from fields array   | **Rejected** | All present in Calendar definitions (lines 145-149)                                                 |
| Playground missing scheduling CSS import                        | **Rejected** | `apps/playground/src/styles.css:7` has `@import '@nop-chaos/flux-renderers-scheduling/styles.css';` |
| GanttStore ignores subsequent updates (permanently stale)       | **Rejected** | `useEffect` at `gantt.tsx:59-65` re-parses on `resolved.tasks` changes                              |

---

## Final Retained Items Summary

| Severity  | Count  | Action                                                                              |
| --------- | ------ | ----------------------------------------------------------------------------------- |
| P0        | 2      | Must fix — AbortController missing, consumer className dropped                      |
| P1        | 15     | High priority — dual-state deps, phantom deps, dead schema contracts, coverage gaps |
| P2        | 16     | Medium priority — O(n²) perf, inline styles, error swallowing                       |
| P3        | 7      | Low priority — redundant memo, `as any` patterns, minor edge cases                  |
| **Total** | **37** |                                                                                     |

## Verdict

The `flux-renderers-scheduling` package and related runtime scheduling code have 2 P0 and 15 P1 retained findings. The most impactful issues are:

1. **Barcode camera init lacks AbortController** (P0-01) — stale async operations after component unmount
2. **Gantt root className silently dropped** (P0-02) — breaks host styling contract
3. **Dual-state patterns in Kanban and Barcode** (P1-03, P1-04) — local state duplicates canonical data sources
4. **Calendar subdomain is the weakest module** — coverage gap (P1-13), styling bypass (P1-11, P1-12), silent error path (P2-14, P2-15)
5. **WebSocket collab error handling** (P1-15, P2-12) — cross-boundary silent failures in kanban collaboration

Runtime scheduling code (debounce, reaction-runtime, api-data-source-controller) is well-structured: proper AbortController usage, pending-change batching, and error propagation. No issues found in those files.

Prior draft (`planned` status) contained 5 factual errors that were corrected during this audit.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
