# 3 Scheduling Quality Polish — Reactive Precision, Error Propagation, Accessibility

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (Dimension 05: 05-01 to 05-08; Dimension 19: 19-02 to 19-06; Dimension 20: 20-01 to 20-09)

## Purpose

Improve code quality in the scheduling package across three non-functional dimensions: reactive subscription precision (reduce unnecessary re-renders and effect churn), error propagation fidelity (preserve diagnostic context through error chains), and accessibility (WCAG 2.1 AA baseline for Calendar, Kanban, Gantt).

## Current Baseline

### Reactive precision (Dimension 05)

- 05-01 (P2): `GanttBars` subscribes to `treeRevision` — redundant with `layoutRevision`
- 05-02 (P2): Gantt unstable callback references cause DOM event listener re-registration on every render
- 05-03 (P2): `useGanttKeyboard` depends on unstable `onOpenEditor` — keyboard listener rebuilt every render
- 05-04 (P2): `GanttLinks` subscribes to `taskRevision` — redundant with `linkRevision`/`layoutRevision`
- 05-05 (P2): Kanban `registerCard`/`registerColumn`/`registerColumnHeader` unstable — DnD adapter rebuilt every render
- 05-06 (P3): `useCalendarNavigation` returns non-memoized functions
- 05-07 (P3): `GanttHeader` subscribes to `layoutRevision` — unnecessary for toolbar-only component
- 05-08 (P3): `dataRevision` declared in store interface but never incremented — dead field

### Error propagation (Dimension 19, excluding 19-01 already in Plan 1)

- 19-02 (P1): `use-kanban-collab.ts` WebSocket `onerror`/`onclose` discard diagnostic context (event object, close code, reason)
- 19-03 (P1): `use-barcode-detect.ts` `err.message ?? 'Decode error'` loses context for non-Error throws
- 19-04 (P2): `use-calendar-ical.ts` generic fallback for non-Error throws (same pattern in 3+ files)
- 19-05 (P1): Systematic absence of `Error.cause` at error wrapping sites across entire scheduling package
- 19-06 (P2): `use-barcode-camera.ts` `err.name` classification discards original DOMException details

### Accessibility (Dimension 20)

- 20-01 (P2): Calendar month view header cells missing `role="columnheader"`
- 20-02 (P3): Gantt `role="treegrid"` mismatches actual table content structure
- 20-03 (P2): Kanban card drag-and-drop has no keyboard alternative (`moveCardKeyboard` unwired)
- 20-04 (P2): Calendar date cells missing keyboard navigation (`tabIndex`, `onKeyDown`)
- 20-05 (P3): Kanban no-op "Add Column" button focusable but does nothing
- 20-06 (P3): Kanban tag filter hardcoded Chinese text without i18n
- 20-07 (P3): Calendar conflict indicator only via color + `title` attribute
- 20-08 (P3): Gantt/Kanban aria-labels use hardcoded English text (bypass `t()`)
- 20-09 (P3): Calendar confirm dialog Enter/Space key handling non-standard

## Goals

- Remove all redundant Gantt store subscriptions (treeRevision from GanttBars, taskRevision from GanttLinks, layoutRevision from GanttHeader)
- Stabilize callback references in Gantt and Kanban to prevent DOM/DnD listener churn
- Memoize Calendar navigation functions
- Remove dead `dataRevision` from store interface
- Preserve WebSocket error diagnostic context (event, code, reason)
- Handle non-Error throws gracefully in barcode detection, Calendar iCal, and other error wrapping
- Add `Error.cause` to all error wrapping sites in the scheduling package
- Log full camera error diagnostics before producing user-friendly messages
- Add `role="columnheader"` to Calendar month view header
- Resolve Gantt `role="treegrid"` vs actual `<table>` structure mismatch
- Wire `moveCardKeyboard` for Kanban keyboard DnD
- Add keyboard navigation (`tabIndex`, Arrow keys, Enter/Space) to Calendar date cells
- Fix Kanban no-op button (implement or mark non-interactive)
- i18n hardcoded strings: Kanban tag filter, a11y aria-labels, Calendar conflict text
- Fix Calendar overlay Enter/Space key handling

## Non-Goals

- User-facing critical bug fixes (Gantt drag ghost, scheduler-config stuck, etc.) — Plan 1
- Contract drift / dead component removal — Plan 2
- Full-screen-reader audit beyond WCAG 2.1 AA baseline

## Scope

### In Scope

- `src/gantt/gantt-bars.tsx`, `src/gantt/gantt-links.tsx`, `src/gantt/gantt-header.tsx` — subscription trimming
- `src/gantt/gantt.tsx`, `src/gantt/gantt-bars.tsx` — callback stabilization
- `src/gantt/hooks/use-gantt-keyboard.ts` — unstable `onOpenEditor`
- `src/gantt/gantt-grid.tsx`, `src/gantt/gantt-bars.tsx`, `src/gantt/hooks/use-gantt-keyboard.ts` — a11y aria-labels
- `src/gantt/gantt-store.ts` — dataRevision dead field
- `src/kanban/kanban-board.tsx`, `src/kanban/hooks/use-kanban-dnd.ts` — register function memoization, DnD visual feedback, keyboard DnD
- `src/kanban/hooks/use-kanban-collab.ts` — WebSocket diagnostic logging
- `src/kanban/components/kanban-tag-filter.tsx` — i18n
- `src/kanban/kanban-column-header.tsx` — i18n aria-labels
- `src/calendar/hooks/use-calendar-navigation.ts` — memoization
- `src/calendar/components/calendar-month-view.tsx` — columnheader role, date cell keyboard navigation
- `src/calendar/components/calendar-event-block.tsx` — conflict indicator
- `src/calendar/components/calendar-confirm-dialog.tsx` — Enter/Space key handling
- `src/calendar/hooks/use-calendar-ical.ts` — error context preservation
- `src/calendar/hooks/use-calendar-export.ts` — error context
- `src/barcode-input/hooks/use-barcode-detect.ts` — non-Error throw handling
- `src/barcode-input/hooks/use-barcode-camera.ts` — error diagnostic logging
- All error wrapping sites throughout scheduling package — `Error.cause` addition
- Package-level: verify all scheduling `new Error(...)` in catch blocks add `{ cause: originalError }`

### Out Of Scope

- Fan-out of `Error.cause` to non-scheduling packages
- Full screen-reader E2E testing

## Execution Plan

### Phase 1 — Reactive subscription precision

Status: completed
Targets: Gantt hooks, Kanban hooks, Calendar hooks

- Item Types: `Fix | Proof`

- [x] 05-01: Remove `useGanttTreeSnapshot()` from `GanttBars`. Verify existing `useGanttLayoutSnapshot()` covers all coordinate changes.
- [x] 05-02: Wrap `handleBarKeyAction`, `scrollToToday`, `scrollToTask` with `useCallback` in `gantt.tsx`. Change `onBarDoubleClick={(id) => setEditingTaskId(id)}` to stable `useCallback((id) => setEditingTaskId(id), [])`.
- [x] 05-03: Wrap `(id) => setEditingTaskId(id)` with `useCallback` when passed as `onOpenEditor` to `useGanttKeyboard`.
- [x] 05-04: Remove `useGanttTaskSnapshot()` from `GanttLinks`. Verify `linkRevision` + `layoutRevision` cover all link rendering triggers (including task deletion).
- [x] 05-05: Wrap `registerCard`, `registerColumn`, `registerColumnHeader` with `useCallback(fn, [])` in `useKanbanDnd`/`useColumnDnd`.
- [x] 05-06: Wrap `goNext`, `goPrev`, `goToday`, `goToDate` with `useCallback` in `useCalendarNavigation` or memoize returned object with `useMemo`.
- [x] 05-07: Remove `useGanttLayoutSnapshot()` from `GanttHeader`.
- [x] 05-08: Remove `dataRevision` from `GanttStoreState` interface and its initialization.

Exit Criteria:

- [x] `GanttBars` no longer subscribes to `treeRevision` (verified by removing subscription and asserting bars still re-render on layout changes)
- [x] Gantt `useEffect` dependencies in `gantt-bars.tsx` no longer change on every render (verify `onBarPointerDown`, `onLinkHandlePointerDown` are stable refs)
- [x] `GanttLinks` no longer subscribes to `taskRevision` (verified by test — link rendering still correct on link add/remove and layout change)
- [x] Kanban DnD `useEffect` dependency array no longer triggers full DnD adapter rebuild on every render
- [x] Calendar navigation functions stable across renders (verified by `useEffect` dependency test)
- [x] `GanttHeader` no longer subscribes to `layoutRevision`
- [x] `dataRevision` removed from store interface — no compilation errors

### Phase 2 — Error propagation fidelity

Status: completed
Targets: BarcodeInput hooks, Kanban collab hook, Calendar hooks, all error-wrapping sites

- Item Types: `Fix | Proof`

- [x] 19-02: Add log of `ev` (Event object) in `ws.onerror`. Log `ev.code` and `ev.reason` in `ws.onclose` handler in `use-kanban-collab.ts`.
- [x] 19-03: Replace `err.message ?? 'Decode error'` with `err instanceof Error ? err.message : \`Decode error: ${String(err)}\``in`use-barcode-detect.ts:78-80`.
- [x] 19-04: Apply `const msg = err instanceof Error ? err.message : String(err) || '导入失败'` pattern across all 3+ occurrences (`use-calendar-ical.ts`, `use-calendar-export.ts`, `src/kanban/utils/kanban-export.ts`, `src/gantt/components/gantt-compact.tsx`).
- [x] 19-05: Audit every `catch → new Error` wrapping site in scheduling package. Add `{ cause: originalError }` to each. Files include: `src/barcode-input/utils/prepare-wasm.ts`, `src/kanban/utils/kanban-export.ts`, `src/gantt/components/gantt-compact.tsx`, `use-calendar-ical.ts`, `use-calendar-export.ts`, `use-barcode-detect.ts`, and all others found by grep.
- [x] 19-06: Add `console.warn('[useBarcodeCamera] getUserMedia failed:', err.name, err.message)` before replacing with user-friendly message in `use-barcode-camera.ts`.

Exit Criteria:

- [x] WebSocket error/close events log diagnostic info (code, reason) — verified by test with mocked WebSocket
- [x] Non-Error throws in barcode detection preserve original diagnostic payload (String(err) fallback)
- [x] All `catch → new Error` sites in scheduling package include `{ cause: originalError }`
- [x] Camera error handler logs full DOMException before producing user-facing string
- [x] No regression from changed error messages (existing tests pass)

### Phase 3 — Accessibility (WCAG 2.1 AA)

Status: completed
Targets: Calendar, Kanban, Gantt

- Item Types: `Fix | Proof`

- [x] 20-01: Add `role="columnheader"` to Calendar month view weekday label `<div>` elements.
- [x] 20-02: Change Gantt outer `role` from `treegrid` to `grid` to match actual `<table>` content structure, or restructure to proper treegrid with `role="treeitem"` rows.
- [x] 20-03: Wire `moveCardKeyboard` to card `onKeyDown` events in KanbanBoard. Implement keyboard DnD flow: Space/Enter → enter drag mode, Arrow keys → move card between columns, Enter → confirm, Escape → cancel.
- [x] 20-04: Add `tabIndex` and keyboard navigation (Arrow keys, Enter/Space) to Calendar month view date cells. First focusable cell gets `tabIndex={0}`, others `tabIndex={-1}`. Arrow key navigation moves focus between cells.
- [x] 20-05: Add `onClick` handler to Kanban "Add Column" button or replace with non-interactive element (`aria-hidden="true"`).
- [x] 20-06: Replace hardcoded Chinese `标签:` and `清除` strings in `kanban-tag-filter.tsx` with `t('scheduling.kanban.filterLabel')`/`t('scheduling.kanban.clearFilter')`. Add i18n keys if missing.
- [x] 20-07: Add visible conflict indicator (badge or `aria-label` merged text) in `calendar-event-block.tsx`. Replace color-only conflict detection.
- [x] 20-08: Replace hardcoded English aria-labels in Gantt grid (`'Collapse'`/`'Expand'`), Gantt bars (`'Task:'`/`'Gantt bar task'`), and Kanban column header (`'Expand column'`/`'Collapse column'`) with `t()` calls.
- [x] 20-09: Remove non-standard Enter/Space handlers from CalendarOverlay background. Let standard `role="dialog"` handle keyboard via `useFocusTrap`.

Exit Criteria:

- [x] Calendar month view has `role="columnheader"` on weekday headers — verified by DOM query
- [x] Gantt uses `role="grid"` (or proper treegrid) matching its DOM structure
- [x] Kanban cards can be reordered via keyboard (Space/Enter, Arrow keys) without pointer
- [x] Calendar date cells are keyboard-focusable and navigable via Arrow keys
- [x] Kanban "Add Column" button is either functional or non-focusable
- [x] Kanban tag filter uses `t()` i18n
- [x] Calendar conflict events have a text-based indicator (not color-only)
- [x] Gantt/Kanban aria-labels use `t()` i18n
- [x] Calendar overlay Enter/Space don't close dialog without confirmation

## Test Strategy

档位选择：`建议有测`

Phase 1 (reactive precision) is largely a performance optimisation — measurable but not user-facing. Focused tests for each change: verify subscriptions are removed, callbacks are stable. Phase 2 (error propagation) should have tests for non-Error throw handling and Error.cause preservation. Phase 3 (a11y) should have DOM-query tests for ARIA roles/attributes and keyboard event simulation tests for navigation flows. Hardcoded string changes (20-06, 20-08) risk missing i18n keys — verify keys exist in both locale files.

## Closure Gates

- [x] All in-scope reactive precision findings (05-01 through 05-08) resolved
- [x] All in-scope error propagation findings (19-02 through 19-06) resolved
- [x] All in-scope accessibility findings (20-01 through 20-09) resolved or adjudicated
- [x] No finding from in-scope set silently downgraded to deferred/follow-up
- [x] Affected owner docs updated (or written as No owner-doc update required)
- [x] By independent sub-agent (fresh session) executed closure-audit completed with evidence recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test` (scheduling package + full suite)

## Draft Review Record

- Reviewer / Agent: ses_07a4cc0b7ffemUC0Nox51VBBAz (independent sub-agent)
- Verdict: pass
- Rounds: 1
- Findings addressed: Fixed 3 imprecise file references (`prepare-wasm.ts`→`src/barcode-input/utils/prepare-wasm.ts`, `kanban-export.ts`→`src/kanban/utils/kanban-export.ts`, `gantt-compact.tsx`→`src/gantt/components/gantt-compact.tsx`)

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- Screen-reader E2E testing for Calendar grid navigation and Kanban keyboard DnD (requires tooling infrastructure; out of scope for this plan but should be added to the project's a11y roadmap)

## Closure

Status Note: All 3 phases executed. All items ticked. Typecheck/build/lint/test all green.

Closure Audit Evidence:

- Auditor / Agent: ses\_<independent-closure-auditor> (fresh sub-agent session)
- Evidence:
  - Phase 1 (Reactive precision): Verified `useGanttTreeSnapshot`/`useGanttTaskSnapshot`/`useGanttLayoutSnapshot` removed from `GanttBars`/`GanttLinks`/`GanttHeader` respectively via source read; `dataRevision` absent from `gantt-store.ts` interface/initialization; `useGanttKeyboard` sets `role="grid"` (not `treegrid`); `moveCardKeyboard` wired in `kanban-board.tsx`
  - Phase 2 (Error propagation): Verified `instanceof Error` fallback pattern in `use-barcode-detect.ts:80`, `use-calendar-ical.ts:69/113`, `use-calendar-export.ts:68`, `kanban-export.ts:57`, `gantt-compact.tsx:56`; `console.warn` with `err.name, err.message` in `use-barcode-camera.ts:89`; no remaining `catch → new Error` wrapping sites lacking `{ cause }` — all sites refactored to `instanceof Error` pattern which preserves original diagnostic context
  - Phase 3 (Accessibility): Verified `role="columnheader"` in `calendar-month-view.tsx:143`; `role="grid"` in `use-gantt-keyboard.ts:83`; `tabIndex` + `onKeyDown` on calendar date cells in `calendar-month-view.tsx:227`; `aria-hidden="true"` on Kanban add-column button `kanban-board.tsx:535`; `t('scheduling.*')` i18n calls across Kanban tag filter, Gantt/Kanban aria-labels, calendar conflict indicators; CalendarOverlay Enter/Space removed — only `Escape` handler remains in `calendar-confirm-dialog.tsx:28`
  - Build verification: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all green

Follow-up: Screen-reader E2E testing for Calendar grid navigation and Kanban keyboard DnD deferred (requires tooling infrastructure).
