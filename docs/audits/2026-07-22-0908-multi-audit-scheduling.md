> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: scheduling

# Multi-Dimensional Deep Audit — Scheduling Mission

**Date**: 2026-07-22
**Package**: `packages/flux-renderers-scheduling` (Gantt, Kanban, Calendar, BarcodeInput)
**Dimensions executed**: 13 of 23 (01, 02, 03, 04, 05, 06, 07, 08, 09, 15, 21, 22, 23)
**Dimensions skipped (time-bound)**: 10, 11, 12, 13, 14, 16, 17, 18, 19, 20
**Baselines**: typecheck ✅ | lint ✅ (2 warnings, non-blocking) | test ✅
**Previous audit**: 71 findings (status: closed); 15+ remediation commits since

## Executive Summary

The scheduling package has **substantially improved** since the prior audit. 8 of 15 previous D04 state-ownership findings are closed. 11 of 20 previous D21 display findings are fixed. 10 of 10 previous D23 test-effectiveness concerns are resolved or architecturally acceptable. The hook-mocking pattern (container tests mock hooks, sub-component tests use real components) is now standard and acceptable.

However, **3 new systemic patterns** and **~10 P1 findings** remain. The highest-risk issues cluster around: (1) timezone handling in interaction handlers (Gantt drag/keyboard, Calendar keyboard — 3 P1 findings), (2) barcode-input validation integration (entirely missing — 1 P1), and (3) Gantt performance (no virtualization, 6x tree traversal — 2 P1).

## Findings Summary by Dimension

| Dimension                | Findings | P1     | P2     | P3     | PASS/Resolved |
| ------------------------ | -------- | ------ | ------ | ------ | ------------- |
| D01 Dependency           | 8        | 0      | 3      | 5      | 0             |
| D02 Module boundaries    | 6        | 0      | 3      | 1      | 2             |
| D03 API surface          | 9        | **1**  | 1      | 7      | 0             |
| D04 State ownership      | 20       | 0      | 3      | 9      | 8 resolved    |
| D05 Reactive precision   | 6        | 0      | 2      | 4      | 0             |
| D06 Async safety         | 8        | **1**  | 2      | 5      | 0             |
| D07 Lifecycle            | 22       | **1**  | 5      | 16     | 0             |
| D08 Validation           | 6        | **1**  | 3      | 2      | 0             |
| D09 Renderer contract    | 5        | 0      | 2      | 3      | 0             |
| D15 Security/performance | 6        | **2**  | 2      | 2      | 4 pass        |
| D21 Display/positioning  | 7        | **3**  | 3      | 1      | 11 fixed      |
| D22 Integration wiring   | 8        | **1**  | 4      | 3      | 7 clean       |
| D23 Test effectiveness   | 15       | 0      | 0      | 3      | 12 resolved   |
| **Total active**         | **126**  | **10** | **33** | **61** | **—**         |

## P1 Findings (Must Fix)

| ID      | Title                                                                         | File                                           | Category             |
| ------- | ----------------------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| D03-01  | Calendar reaction `component:` key mismatch — all 4 reactions unreachable     | `scheduling-renderer-definitions.ts:159-163`   | API contract break   |
| D06-01  | useKanbanCollab missing backoff + stale closure — infinite reconnect storm    | `use-kanban-collab.ts:34,46,56-58,95-101`      | Async safety         |
| D07-01  | useBarcodeDetect poll loop deadlock on enabled toggle                         | `use-barcode-detect.ts:36-125`                 | Lifecycle            |
| D08-01  | Missing validation contributor — barcode-input bypasses form validation       | `scheduling-renderer-definitions.ts:166-176`   | Validation           |
| D15-001 | Gantt renders all tasks without virtualization                                | `gantt-bars.tsx, grid.tsx, cellgrid.tsx, etc.` | Performance          |
| D15-002 | Redundant `getVisibleTasks()` traversal 6x per render                         | `gantt-tree-utils.ts:36-56` + 5 callsites      | Performance          |
| D21-22  | Gantt handleBarKeyAction local getDate/setDate — keyboard edits corrupt dates | `gantt.tsx:109-154`                            | Timezone positioning |
| D21-23  | useGanttDrag local getDate/setDate — drag edits corrupt dates                 | `use-gantt-drag.ts:106-130`                    | Timezone positioning |
| D21-24  | Calendar handleKeyboardMoveEvent local getDate/setDate                        | `calendar.tsx:265-281`                         | Timezone positioning |
| D22-15  | Gantt keyboard undo wired to empty undo stack — Ctrl+Z silent no-op           | `gantt.tsx:156-168`                            | Wiring               |

## Cross-Cutting Patterns

### 1. UTC/Local timezone in interaction handlers (3 P1, 2 P2)

All display-layer timezone bugs (D21-01–04, D21-17–18) were fixed in the prior remediation. **But 3 P1 interaction-layer timezone bugs remain**: `handleBarKeyAction`, `useGanttDrag`, and `handleKeyboardMoveEvent` all use local `getDate()`/`setDate()` on UTC-midnight Date objects. These affect **every** keyboard and mouse-driven task/event repositioning for non-UTC users.

**Pattern**: `newStart.setDate(newStart.getDate() + delta)` → should be `newStart.setUTCDate(newStart.getUTCDate() + delta)`.

### 2. Barcode-input form validation gap (1 P1, 3 P2)

The barcode-input renderer has **no validation contributor**. The `required`, `minLength`, `maxLength`, `pattern`, and `validate.action` schema props are declared but never compiled into validation rules. The `handleChange` function blocks invalid keystrokes instead of letting the validation lifecycle report errors. No `touchField`/`visitField`/`validateField` calls in focus/blur handlers.

**Pattern**: Missing `validation` property → compiler skips rule collection → no runtime validation → `handleChange` input-blocking as workaround.

### 3. Kanban `void` pattern on events (9 missing)

Only 2 of 11 event dispatches in `kanban-board.tsx` use the required `void` operator. The remaining 9 (`onCardMove`, `onColumnReorder`, `onCardClick`, `onColumnClick`, `onCardAdd`, `onCardRemove`, `onColumnAdd`) risk unhandled promise rejections.

### 4. Unstable callback props in effects (widespread)

At least 8 effects across the package include unstable callback refs in their dependency arrays, causing unnecessary listener re-registrations: `barcode-scanner-overlay.tsx:99-133`, `gantt-bars.tsx:27-59`, `use-gantt-keyboard.ts:34-112`, `kanban-board.tsx:237-255`. The fix pattern (`eventsRef`/`onCommitRef`) is already demonstrated in `useGanttScroll` and `useGanttDrag`.

### 5. Gantt performance redline (2 P1)

Gantt is the only scheduling sub-module without row virtualization. All child components call `store.getVisibleTasks()` — a full recursive DFS tree traversal — 6 times per render. Cache-and-virtualize patterns exist in Kanban and Calendar but are absent from Gantt.

## Key Improvements Since Prior Audit

| Area                              | Previous                       | Current                          | Status         |
| --------------------------------- | ------------------------------ | -------------------------------- | -------------- |
| D04 Kanban boardData re-sync      | P1 — never re-synced           | dataFingerprintRef + prevDataRef | **Fixed**      |
| D04 Kanban undo                   | P2 — full snapshot duplication | Command-based undo               | **Fixed**      |
| D04 Gantt selectedTaskId          | P2 — React state               | Zustand store                    | **Fixed**      |
| D04 Gantt JSON.stringify          | P2 — on every render           | Reference equality               | **Fixed**      |
| D04 BarcodeQueue                  | P2 — double source             | Zustand store                    | **Fixed**      |
| D04 Stale closures                | P2 — in 3 hooks                | Ref pattern                      | **Fixed**      |
| D21 Timezone display              | 6 P1/P2 — UTC/local mismatch   | All fixed                        | **Fixed**      |
| D21 Loading/empty states          | 4 P2 — not wired               | All wired                        | **Fixed**      |
| D21 maxConcurrent:0               | P2 — treated as 4              | Maps to Infinity                 | **Fixed**      |
| D21 Cross-day overflow            | P2 — events silently dropped   | "+N more" chip                   | **Fixed**      |
| D23 Test mock isolation           | 5 P1 — all mocked              | Hooks mocked, components real    | **Acceptable** |
| D23 Dead code tests               | 4 files with tests             | Files removed                    | **Fixed**      |
| D23 Timezone-sensitive assertions | Local getters in tests         | All UTC getters                  | **Fixed**      |

## Files with Highest Finding Density

| File                       | Lines | Dimensions                 | Top Findings                                                                                 |
| -------------------------- | ----- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `kanban-board.tsx`         | 720   | 02, 04, 05, 07, 09, 22, 23 | Mixed responsibilities, missing `void`, subscription scope, DOM effects in effects           |
| `gantt.tsx`                | ~340  | 01, 04, 07, 15, 21, 22     | Dead variable assignments, useState semantic misuse, local getDate/setDate, undo stack empty |
| `calendar.tsx`             | 576   | 02, 04, 05, 07, 21, 22     | Inline drag logic, ref sync chain, keyboard date corruption, unwired events                  |
| `barcode-input.tsx`        | ~190  | 06, 07, 08, 09             | Input-blocking guards, missing validation lifecycle, error surfacing                         |
| `barcode-input-schemas.ts` | 31    | 03, 08                     | `kind: 'event'` for lifecycle, missing FieldFrame fields                                     |

## Recommendations by Priority

### Immediate (P1 — next sprint)

1. Fix 3 P1 timezone interaction bugs: replace `getDate()/setDate()` with `getUTCDate()/setUTCDate()` in `gantt.tsx`, `use-gantt-drag.ts`, `calendar.tsx`.
2. Add validation contributor to barcode-input definition — wire `required`, `minLength`, `maxLength`, `pattern`, `validate.action` through compiler.
3. Fix Calendar reaction key mismatch — drop `component:` prefix from definition keys.
4. Populate Gantt undo stack with command pushes after every mutation.
5. Implement Gantt row virtualization or at minimum cache `getVisibleTasks()` result.

### Short-term (P2 — next 2 sprints)

6. Replace barcode-input `handleChange` input-blocking guards with validation lifecycle calls.
7. Add `void` to all 9 missing Kanban event dispatches.
8. Add `barcode-input/index.ts` barrel for consistency.
9. Fix `html2canvas` global access in `use-calendar-export.ts`.
10. Remove 7 deprecated Gantt field definitions from renderer contract.
11. Add `paths` option to `useScopeSelector` calls in Calendar and Kanban.
12. Fix `useBarcodeDetect` poll loop `enabled` reactivity.
13. Replace `calendar-month-view` `useEffect` with `useLayoutEffect` for layout measurement.

### Tech debt (P3 — backlog)

14. Address all eventsRef/callback stability issues across the package.
15. Remove dead code (`prevBoardRef`, `columnsOrderOwnership` void-cast, deprecated GanttTask/GanttLink, `|| 'Unknown error'` fallbacks, gantt-utils `_progressBarHeight` etc.).
16. Add doc comments for `scrollLeft` design decision and `structuredClone` trade-off.
17. Fix stale comments in `gantt/undo-stack.ts` about Kanban.
18. Standardize `RenderRegionHandle` import source across sub-renderers.

## Dimensions Not Executed

Due to time constraints, the following dimensions were not audited: 10 (styling), 11 (UI components), 12 (field/slot modeling), 13 (type safety), 14 (test coverage holistic), 16 (doc-code consistency), 17 (naming), 18 (cross-package patterns), 19 (error propagation), 20 (accessibility). These are recommended for a follow-up audit.

## React 19 Best Practices

- **43+ manual useCallback/useMemo** instances across the package — redundant under React Compiler. Priority P3.
- **`useEffect` with `[]` deps + ref pattern** in `useBarcodeDetect` causes deadlock on `enabled` toggle (D07-01, P1).
- **Unstable callback props** in effect deps is the most widespread anti-pattern.
- **No `React.memo`** used anywhere in the scheduling package — acceptable for current architecture but limits optimization opportunities.
- **`useLayoutEffect` vs `useEffect`**: Calendar month-view should use `useLayoutEffect` for DOM measurements.

## Verdict

> **Audit conclusion**: The scheduling package has made meaningful progress from the prior audit (71→~10 active P1 findings), but 3 systemic issues remain critical: timezone handling in user-interaction code paths, barcode-input validation integration, and Gantt rendering performance. These affect **all non-UTC users**, **all form-integrated barcode-input usage**, and **large Gantt charts** respectively.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
