> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: scheduling

# Multi-Dimensional Audit: `flux-renderers-scheduling`

## Scope

- **Package**: `packages/flux-renderers-scheduling` (Gantt, Kanban, Calendar, BarcodeInput)
- **Dimensions executed**: 01 (dependency), 04 (state ownership), 21 (display/positioning), 22 (integration wiring), 23 (test effectiveness)
- **Execution**: 5 parallel round-1 sub-agents, single-pass deep-dive per dimension
- **Date**: 2026-07-22
- **Review status**: Preliminary — findings require independent review before remediation

## Summary

| Dimension                    | Findings | P0    | P1     | P2     | P3     |
| ---------------------------- | -------- | ----- | ------ | ------ | ------ |
| 01 — Dependency & boundaries | 7        | 0     | 2      | 2      | 3      |
| 04 — State ownership         | 14       | 0     | 3      | 6      | 5      |
| 21 — Display & positioning   | 20       | 0     | 4      | 11     | 5      |
| 22 — Integration wiring      | 15       | 0     | 2      | 6      | 7      |
| 23 — Test effectiveness      | 15       | 0     | 6      | 5      | 4      |
| **Total**                    | **71**   | **0** | **17** | **30** | **24** |

## Cross-Cutting Patterns

1. **Timezone UTC/local mismatch** — appears in D21 (6 findings) and D23 (1 finding). ISO date strings parsed as UTC midnights, but local-time getters used for day-of-week, month, year arithmetic. Causes off-by-one in weekend marking, today-marker, and week/month boundaries for users in negative UTC offsets.
2. **Unwired schema fields** — D04 (kanban ownership), D22 (6 Gantt events never fire, 2 Calendar reactions unwired, 5 Calendar events never fire, 3 kanban fields declared but unused). Schema type declares fields that the renderer never reads.
3. **Over-mocked integration tests** — D23 (Gantt root test mocks all sub-components, Calendar root test mocks all 9 hooks, DnD test mocks DnD adapter as no-op). No integration test exercises the real component wiring.
4. **State mutation before event notification** — D04 (Gantt store mutation precedes event dispatch; no rollback path).

---

# Dimension 01: Dependency Graph & Package Boundaries

## Findings

### [D01-01] flux-runtime violates allowed-dependency constraint (Rule c)

- **File**: `packages/flux-runtime/package.json:15-19`
- **Severity**: P1
- **Evidence**:
  ```json
  "dependencies": {
    "@nop-chaos/flux-action-core": "workspace:*",
    "@nop-chaos/flux-compiler": "workspace:*",
    "@nop-chaos/flux-formula": "workspace:*",
    "@nop-chaos/flux-core": "workspace:*"
  }
  ```
- **Current State**: Rule (c) states flux-runtime "can only depend on flux-core and flux-formula" but AGENTS.md documents layer chain as `flux-core -> flux-formula -> flux-compiler -> flux-action-core -> flux-runtime`, making the extra deps architecturally correct.
- **Risk**: Audit rules contradict documented architecture; automated boundary checks would flag false positives.
- **Recommendation**: Align audit rule (c) with AGENTS.md — allow flux-runtime to depend on all layers below it.

### [D01-02] flux-renderers-form-advanced depends on sibling renderer packages

- **File**: `packages/flux-renderers-form-advanced/package.json:15-29`
- **Severity**: P1
- **Evidence**: Depends on `flux-renderers-data`, `flux-renderers-content`, `flux-renderers-form`.
- **Current State**: Inter-renderer coupling creates implicit dependency ordering. Rule (e) does not explicitly permit cross-renderer deps.
- **Risk**: If sibling renderer changes its public API, form-advanced breaks. Creates circular-risk chain.
- **Recommendation**: Document allowed inter-renderer dep patterns, or extract shared types into flux-core.

### [D01-03] flux-code-editor (non-renderer) depends on flux-renderers-form

- **File**: `packages/flux-code-editor/package.json:20-45`
- **Severity**: P2
- **Evidence**: Production code imports `formFieldChromeRules` from `@nop-chaos/flux-renderers-form`.
- **Current State**: Inverts intended layering direction.
- **Recommendation**: Move code-editor into flux-renderers-\* family, or extract shared rules upward.

### [D01-04] flux-i18n test imports from ui/src/ across package boundary

- **File**: `packages/flux-i18n/src/i18n-contract.test.ts:13`
- **Severity**: P2
- **Evidence**: Dynamic `import('../../ui/src/lib/i18n.js')` bypasses ui package exports field.
- **Current State**: Encapsulation breach — test depends on ui package internal file structure.
- **Recommendation**: Export `./lib/i18n` from ui's package.json exports, or move test into ui package.

### [D01-05] flux-renderers-content missing flux-formula devDependency

- **File**: `packages/flux-renderers-content/package.json:38-47`
- **Severity**: P3
- **Evidence**: 6 test files import from `@nop-chaos/flux-formula` but it's not in devDependencies.
- **Recommendation**: Add `"@nop-chaos/flux-formula": "workspace:*"` to devDependencies.

### [D01-06] flux-bundle reads CSS from sibling src/ directories

- **File**: `packages/flux-bundle/src/index.test.tsx:22-23`
- **Severity**: P3
- **Evidence**: `readFileSync('../flux-react/src/default-spacing.css', ...)` bypasses dist/ exports.
- **Recommendation**: Read from dist/ paths or copy fixtures.

### [D01-07] Rule (c) contradicts documented architecture

- **File**: Audit rules vs AGENTS.md layer chain
- **Severity**: P3 (documentation)
- **Current State**: AGENTS.md explicitly shows flux-runtime consuming flux-action-core and flux-compiler.
- **Recommendation**: Update audit rule (c) to match AGENTS.md.

### Scheduling Package Dependency Assessment

**`flux-renderers-scheduling` dependency compliance: CLEAN**

- Dependencies: `flux-core`, `flux-i18n`, `flux-react`, `ui`, `@atlaskit/pragmatic-drag-and-drop`, `@tanstack/react-virtual`, `zustand`
- No dependency on `flux-runtime`, `flux-formula`, `flux-compiler`, `flux-action-core`
- No dependency on any other renderer package
- No internal path imports found in any source file
- External dependencies (Atlassian DnD, TanStack Virtual, zustand) are legitimate for scheduling components
- All `@nop-chaos/*` imports use public package names

---

# Dimension 04: State Ownership & Single Source of Truth

## Findings

### [D04-01] Kanban boardData never re-synced with props.data

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:61-68`
- **Severity**: P1
- **Evidence**:
  ```tsx
  const rawData = resolved.data as BoardData | undefined;
  const [boardData, setBoardData] = useState<BoardData>(rawData ?? fallbackBoard);
  // No useEffect to re-sync when rawData changes
  ```
- **Current State**: `boardData` initialized from `resolved.data` at mount, never re-synced. Local mutations accumulate on a fork.
- **Risk**: If `resolved.data` changes externally, boardData permanently diverges from canonical source. Navigate away and return → all local mutations lost.
- **Dual-State Detail**: `resolved.data` (schema props) vs `boardData` (local useState).
- **Recommendation**: Add sync effect with fingerprint guard (like gantt's dataFingerprintRef), or make kanban fully uncontrolled with proper ownership model.

### [D04-02] Kanban schema declares ownership/statePath fields but never implements them

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:61-68` vs `kanban.types.ts:61-69`
- **Severity**: P1
- **Evidence**: `columnsOrderStatePath`, `columnsOrderOwnership`, `collapsedStatePath`, `collapsedOwnership`, `kanbanOwnership`, `kanbanStatePath`, `statusPath` all declared in schema but never read in component.
- **Current State**: Schema fields declare intent for controlled/scope mode, but renderer has no code path for these modes. User writing `"kanbanOwnership": "scope"` is silently ignored.
- **Recommendation**: Implement three-state ownership (local/controlled/scope) or remove misleading fields.

### [D04-03] Gantt store mutation before event notification — cannot reject/undo

- **File**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts:96-136` and `use-gantt-link-draw.ts:66`
- **Severity**: P1
- **Evidence**:
  ```ts
  store.updateTask(task.id, changes); // Store mutated FIRST
  onCommit?.(task.id, changes); // Event fires AFTER mutation
  ```
- **Current State**: Drag handlers mutate Zustand store synchronously during pointer events, then fire `onCommit`. Event handler has no opportunity to cancel/undo.
- **Risk**: If external handler (server validation) rejects the change, store is already dirty. No rollback path.
- **Recommendation**: Invert flow: fire event first (async), commit store on success. Or add `revertTask` to store.

### [D04-04] Kanban undo: full BoardData snapshot duplication

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:97-108`, `kanban-undo-stack.ts:92-93`
- **Severity**: P2
- **Evidence**: Each mutation creates 3 copies of BoardData: new board, snapshot (after structuredClone), prevBoardRef. Stack size up to 1000.
- **Risk**: Memory bloat on large boards. structuredClone on every mutation.
- **Recommendation**: Use command-based undo (store delta) instead of full-snapshot.

### [D04-05] Gantt selectedTaskId/editingTaskId as React state outside Zustand store

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:60-61`
- **Severity**: P2
- **Current State**: Selection state is React useState, threaded via props. Not in GanttStore.
- **Risk**: Adding features like "highlight selected task in header" requires prop-drilling. Gantt context provides store access to all nested components; selection state bypasses it.
- **Recommendation**: Move selectedTaskId into GanttStore state.

### [D04-06] Gantt useState(() => createInitialStore(resolved)) semantic misuse

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:63`
- **Severity**: P3
- **Current State**: useState used only for lazy initializer, setter never called. Confusing pattern.
- **Recommendation**: Replace with useRef or useMemo with empty deps.

### [D04-07] Gantt scrollLeft stored outside Zustand store

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:29,68-69`
- **Severity**: P3
- **Current State**: `scrollLeft` is a plain class property, not in Zustand state. Deliberate optimization but undocumented.
- **Recommendation**: Add doc comment explaining design decision.

### [D04-08] Gantt JSON.stringify fingerprint on every render

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:78-85`
- **Severity**: P2
- **Evidence**: Full JSON.stringify of tasks/links/resources on every render where references change.
- **Risk**: Blocks main thread for large datasets.
- **Recommendation**: Use structural shallow comparison or mutation timestamp hash.

### [D04-09] Kanban full DnD listener re-registration on every boardData change

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:371-409`
- **Severity**: P2
- **Evidence**: `boardData` in effect dependency triggers full teardown and re-setup of all DnD listeners on every mutation.
- **Risk**: O(n) querySelector + tear-down/setup on each card move. Perceptible lag.
- **Recommendation**: Move DnD registration into subcomponents, or use mutation-observer approach.

### [D04-10] BarcodeScannerOverlay BarcodeQueue + queueItems double-source

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:46-50`
- **Severity**: P2
- **Evidence**: Imperative BarcodeQueue class holds canonical data; React state queueItems manually synced after every mutation.
- **Risk**: Fragile mirror pattern — future mutation added to class without corresponding setQueueItems call would show stale UI.
- **Recommendation**: Convert BarcodeQueue to Zustand vanilla store or add subscription mechanism.

### [D04-11] Calendar latestViewRef/latestDateRef sync chain

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:131-132,160-165`
- **Severity**: P3
- **Current State**: Two useEffects sync activeView/currentDate into refs for stale-closure workaround. One-tick delay between state change and ref update.
- **Recommendation**: Inline ref writes in setCurrentDate/setActiveView, or restructure callbacks.

### [D04-12] GanttStore class vs established functional factory pattern

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:26-44`
- **Severity**: P3
- **Current State**: Class wraps StoreApi internally. Exposes subscribe but no getSnapshot. Getters return different Map reference on every call.
- **Recommendation**: Add getSnapshot() method or refactor to functional factory.

### [D04-13] useGanttDrag/useCalendarDrag stale callback closures

- **File**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts:19-22`, `calendar/hooks/use-calendar-drag.ts:43-44`
- **Severity**: P2
- **Current State**: onCommit/onEventChange captured in pointer event closures without refs. If callback identity changes, handlers use stale version.
- **Recommendation**: Use ref pattern (onCommitRef) consistent with eventsRef used elsewhere.

### [D04-14] BarcodeInput cameraAvailable focus race condition

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:53-66`
- **Severity**: P3
- **Current State**: Async camera check + focus/blur interaction not fully synchronized. Overlay can open after input has lost focus.
- **Recommendation**: Add abort signal or mounted ref check in async path.

---

# Dimension 21: Display & Positioning Correctness

## Findings

### [D21-01] diffInDays uses local getters on UTC-based Date objects

- **File**: `packages/flux-renderers-scheduling/src/gantt/utils/date.ts:4-7`
- **Severity**: P1
- **Category**: timezone / positioning-algorithm
- **Evidence**:
  ```ts
  function diffInDays(a: Date, b: Date): number {
    const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()); // local getters
    const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  ```
- **Current State**: UTC-midnight dates are passed, but local getters extract year/month/date. In negative UTC offsets, dates roll back by one day causing off-by-one in scale-range and task positions.
- **Recommendation**: Use `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` consistently.

### [D21-02] isWeekend uses local getDay() on UTC dates

- **Files**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-date-utils.ts:45-47`, `src/gantt/gantt-cellgrid.tsx:32`
- **Severity**: P1
- **Category**: timezone
- **Evidence**: `date.getDay()` used on UTC-midnight dates. In UTC-5, Monday midnight maps to local Sunday → `getDay()` returns 0.
- **Recommendation**: Replace with `getUTCDay()`.

### [D21-03] Today marker off by one day in negative timezones

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-markers.tsx:21-23`
- **Severity**: P1
- **Category**: timezone / positioning-algorithm
- **Evidence**: `dateToPixel(new Date(), ...)` — `new Date()` is local time, scaleRange.start is UTC-midnight. `diffInDays` with mixed local/UTC dates gives off-by-one result.
- **Recommendation**: Construct today as UTC midnight: `new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))`.

### [D21-04] pixelToDate potential precision loss

- **File**: `packages/flux-renderers-scheduling/src/gantt/utils/layout.ts:26-31`
- **Severity**: P2
- **Category**: positioning-algorithm
- **Evidence**: Fractional day offset from `x / cellWidth` passed to `setUTCDate` which truncates fractional part.
- **Recommendation**: Use millisecond-precision arithmetic: `new Date(scaleRange.start.getTime() + days * 86400000)`.

### [D21-05] Gantt missing loading state

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:190-251`
- **Severity**: P2
- **Category**: empty-state
- **Current State**: `resolved.loading` never checked — Gantt always renders full chart immediately. `loading` region declared in definitions but not wired.
- **Recommendation**: Add loading guard before main render.

### [D21-06] Gantt empty region not rendered

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:190-251`
- **Severity**: P2
- **Category**: empty-state
- **Current State**: `empty` region declared in definitions but never read in component.
- **Recommendation**: Add empty-state check after loading check.

### [D21-07] Calendar maxConcurrent: 0 silently treated as 4

- **File**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-layout-utils.ts:100`
- **Severity**: P2
- **Category**: positioning-algorithm
- **Current State**: `maxConcurrent: 0` interpreted as default 4. Events beyond cap silently dropped.
- **Recommendation**: Treat `<= 0` as unbounded.

### [D21-08] Calendar month view no "+N more" overflow indicator

- **File**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-layout-utils.ts:118-133`
- **Severity**: P2
- **Category**: render-structure
- **Current State**: Excess events beyond maxConcurrent silently discarded with no visual indicator.
- **Recommendation**: Show "+N more" chip when events exceed maxConcurrent.

### [D21-09] Calendar cross-day lines use hardcoded 48px row height

- **File**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:283-300`
- **Severity**: P2
- **Category**: positioning-algorithm
- **Evidence**: `y: ri * 48` hardcoded; actual row height may vary per virtual item size.
- **Recommendation**: Derive cell positions from actual rendered row heights.

### [D21-10] Calendar week/day event filter relies on string date match

- **File**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:67-69`
- **Severity**: P2
- **Category**: timezone / positioning-algorithm
- **Current State**: String comparison of date portions; does not account for timezone differences in ISO datetime strings with time components.
- **Recommendation**: Apply consistent parseISODate on both sides, or document date-only requirement.

### [D21-11] Calendar isToday boundary correctness

- **File**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-date-utils.ts:49-53`
- **Severity**: P2
- **Category**: timezone
- **Current State**: Correct for date-only calendars. For UTC dates near midnight in positive timezones, today highlight may not match local perception.
- **Recommendation**: Document timezone assumption.

### [D21-12] Calendar loading state has no default fallback

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:372-377`
- **Severity**: P2
- **Category**: empty-state
- **Current State**: Loading region renders only if provided; otherwise falls through to full calendar UI with zero events.
- **Recommendation**: Add default skeleton fallback like Kanban does.

### [D21-13] allocateConcurrentWidths fails to detect date-only overlaps

- **File**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-time-utils.ts:95-110`
- **Severity**: P2
- **Category**: positioning-algorithm
- **Current State**: `lastEnd <= eventStart` puts back-to-back same-midnight events in same column. Date-only events always start=end=midnight, so all same-day events share one column.
- **Recommendation**: Add detection of time-component absence (date-only events always overlap).

### [D21-14] Milestone $w set to full cellWidth despite diamond rendering

- **File**: `packages/flux-renderers-scheduling/src/gantt/utils/layout.ts:45`, `gantt-bars.tsx:95-98`
- **Severity**: P3
- **Category**: special-element
- **Current State**: Milestones get $w = cellWidth minimum, but diamond rendering ignores $w entirely. Misleading value for downstream consumers.
- **Recommendation**: Set $w = 0 for milestones.

### [D21-15] Baseline deviation label may overflow above SVG viewport

- **File**: `packages/flux-renderers-scheduling/src/gantt/components/baseline-bars.tsx:62-63`
- **Severity**: P3
- **Category**: render-structure
- **Current State**: Label placed at `Math.min(task.$y, by) - 4` — for row 0, this is `-4`, clipped above SVG viewport.
- **Recommendation**: Clamp label y to minimum of 8px.

### [D21-16] Gantt grid height = 0 when no tasks — today marker line invisible

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-markers.tsx:17-19`, `gantt-cellgrid.tsx:17`
- **Severity**: P3
- **Category**: render-structure / empty-state
- **Current State**: `totalHeight = tasks.length * 40 = 0` when no tasks. Grid and today marker line are invisible.
- **Recommendation**: Default to minimum height (400px) when no tasks.

### [D21-17] Gantt cell-grid weekend check uses getDay() instead of getUTCDay()

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-cellgrid.tsx:32`
- **Severity**: P1
- **Category**: timezone
- **Evidence**: `cell.start.getDay()` on UTC-midnight dates. Same UTC/local mismatch as D21-02.
- **Recommendation**: Use `getUTCDay()`.

### [D21-18] Calendar getWeekStartEnd uses local getDay() for week arithmetic

- **File**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-date-utils.ts:11-18`
- **Severity**: P2
- **Category**: timezone
- **Current State**: `date.getDay()` used for week start calculation on UTC-midnight dates. Off-by-one in negative timezones.
- **Recommendation**: Use `getUTCDay()`, `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`.

### [D21-19] Kanban data-drop-target selector — PASS (markers match)

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban.css:83-85`
- **Assessment**: Selector correctly matches column root element where `data-drop-target` is set. No issue.

### [D21-20] Redundant "no schedule data" in month view

- **File**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:347-350`
- **Severity**: P3
- **Category**: empty-state
- **Current State**: Inner view shows "no schedule data" only when resources empty (not when both events and resources empty). Redundant with outer guard in calendar.tsx.
- **Recommendation**: Remove inner block or align conditions.

---

# Dimension 22: Integration Wiring & Operability

## Findings

### [D22-01] Gantt: 6 events declared but never fired

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`
- **Severity**: P1
- **Category**: event
- **Evidence**: `onTaskClick`, `onTaskDoubleClick`, `onLinkClick`, `onEmptyCellClick`, `onZoomChange`, `onScroll` declared in scheduling-renderer-definitions.ts but no firing sites in gantt.tsx. Grid double-click opens inline editing without firing event.
- **User-Visible Symptom**: Schema authors wiring these actions find they never execute, no error.
- **Recommendation**: Add firing calls at appropriate interaction points.

### [D22-02] Gantt: loading and empty regions declared but never consumed

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`
- **Severity**: P2
- **Category**: region
- **Current State**: `loading` and `empty` regions registered (scheduling-renderer-definitions.ts:41-42) but gantt.tsx has no code path checking them.
- **Recommendation**: Implement loading/empty fallback matching calendar/kanban patterns.

### [D22-03] Kanban: onMount/onUnmount events never fired

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`
- **Severity**: P2
- **Category**: event
- **Current State**: Kanban lifecycle events declared (lines 102-103) but no useEffect fires them. Calendar and Gantt both implement mount/unmount.
- **Recommendation**: Add mount useEffect identical to calendar/gantt pattern.

### [D22-04] Calendar: 5 events declared but never fired

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`
- **Severity**: P1
- **Category**: event
- **Evidence**: `onBatchSchedule`, `onImport`, `onImportError`, `onTimezoneChange`, `onGroupToggle` — no firing sites. Associated props (`batchScheduling`, `timezoneSelector`, `statusPath`) also unused in render tree.
- **User-Visible Symptom**: Schema authors wiring these actions find they never fire.
- **Recommendation**: Implement features or remove declarations. Add `@reserved` comments if planned.

### [D22-05] Calendar: component:importICal and component:exportToICal reactions declared but no implementation

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`
- **Severity**: P2
- **Category**: handle
- **Current State**: Two reactions declared (lines 160-161). CalendarHandle does not expose them. No iCal code exists anywhere.
- **User-Visible Symptom**: Calling via ref → runtime error (undefined not a function).
- **Recommendation**: Implement or remove.

### [D22-06] Calendar: component:print reaction not exposed in useImperativeHandle

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:178`
- **Severity**: P3
- **Category**: handle
- **Current State**: `useCalendarExport` returns `exportToPrint` function, but it's not wired into useImperativeHandle. `exportToPrint` exists in CalendarHandle interface but not in implementation.
- **Recommendation**: Add `exportToPrint: calendarExport.exportToPrint` to imperative handle.

### [D22-07] Kanban: 9 ownership/statePath fields declared but never consumed

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`
- **Severity**: P2
- **Category**: ownership
- **Evidence**: `columnsOrderStatePath`, `columnsOrderOwnership`, `collapsedStatePath`, `collapsedOwnership`, `kanbanOwnership`, `kanbanStatePath`, `statusPath` — all in schema type and renderer definition, zero consumption in component.
- **Recommendation**: Implement three-state branching or remove.

### [D22-08] Kanban: columnsConfig field declared but never consumed

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`
- **Severity**: P3
- **Category**: prop
- **Current State**: `columnsConfig` prop registered but never read; only `configMap` is used.
- **Recommendation**: Consume or remove; align naming between configMap and columnsConfig.

### [D22-09] Kanban: columnDraggable prop declared but only draggable used

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:63`
- **Severity**: P3
- **Category**: wiring
- **Current State**: `columnDraggable` never read; column drag controlled solely by `draggable` flag.
- **Recommendation**: Consume independently or remove.

### [D22-10] Gantt: body region declared but never consumed

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`
- **Severity**: P3
- **Category**: region
- **Current State**: `body` region registered but never checked. Calendar has body region delegation (calendar.tsx:390-393).
- **Recommendation**: Implement body region delegation or remove.

### [D22-11] Calendar: resources[].resources and resources[].open declared but not consumed

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:362-364`
- **Severity**: P2
- **Category**: wiring
- **Current State**: Nested resource tree fields declared. Resources used flat — children never expanded. `open` property never read.
- **Recommendation**: Implement recursive resource tree renderer or flatten at consumption point.

### [D22-12] Kanban: no controlled data mode — boardData initialized once

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:68`
- **Severity**: P2
- **Category**: ownership
- **Current State**: Unlike Gantt (dataFingerprintRef) and Calendar (controlledView/controlledDate), Kanban only reads `resolved.data` at mount. No sync effect.
- **Recommendation**: Add sync effect or controlled mode guard.

### [D22-13] Calendar: exportToPrint in interface but missing from useImperativeHandle

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:39`, `use-calendar-export.ts:6`
- **Severity**: P3
- **Category**: handle
- **Current State**: TypeScript allows `handle.exportToPrint` but at runtime it's undefined.
- **Recommendation**: Wire into imperative handle.

### [D22-14] scheduling-renderer-definitions.test.ts tests registration only, not actual consumption

- **File**: `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.test.ts:41-93`
- **Severity**: P3
- **Category**: fallback
- **Current State**: Field consumption test is identity check — hardcoded set mirrors definitions, doesn't verify component code consumes fields.
- **Recommendation**: Supplement with programmatic consumption verification (AST or integration tests).

### [D22-15] Gantt keyboard undo shortcut unwired — onUndo exists in hook but not passed

- **File**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts:10`, `gantt.tsx:144-149`
- **Severity**: P3
- **Category**: interaction-closure
- **Current State**: `useGanttKeyboard` accepts `onUndo` callback, handles Ctrl+Z. But gantt.tsx calls it without passing `onUndo`. Undo stack module (undo-stack.ts) exists but never imported.
- **Recommendation**: Wire onUndo from undo-stack.ts to useGanttKeyboard.

---

# Dimension 23: Test Effectiveness & False Green

## Findings

### [D23-01] Gantt root test mocks EVERY sub-component and hook — pure shell verification

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.test.tsx:1-121`
- **Severity**: P1
- **Category**: boundary-mock
- **Evidence**: All internal sub-components (GanttHeader, GanttLayout, GanttEditor, GanttStoreProvider) and all hooks (useGanttDrag, useGanttLinkDraw, useGanttScroll, useGanttKeyboard) mocked. Only verifies `<div className="nop-gantt">` exists.
- **Current State**: A bug in any internal component would pass tests undetected.
- **Recommendation**: Add integration test with real sub-components and real store.

### [D23-02] Calendar root test mocks ALL 9 hooks — wiring bugs invisible

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.test.tsx:1-187`
- **Severity**: P1
- **Category**: boundary-mock
- **Evidence**: All hooks mocked (useCalendarState fixed return, useCalendarDrag, useCalendarNavigation, etc.). Event flow driven by manual mock call, not real interaction.
- **Current State**: Regression in any calendar hook would pass tests.
- **Recommendation**: Write integration test without hook mocks using real state and minimal events.

### [D23-03] BarcodeScannerOverlay mocks both barcode hooks — detection pipeline never tested

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.test.tsx:1-204`
- **Severity**: P2
- **Category**: boundary-mock
- **Current State**: Detection result simulated via mock return value. Real detection pipeline (camera → detector → result → scan callback) never exercised.
- **Recommendation**: Keep camera mocks but test real useBarcodeDetect logic with mock BarcodeDetector API.

### [D23-04] Gantt visual states test is tautological — tests hardcoded HTML

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-visual-states.test.tsx:1-75`
- **Severity**: P1
- **Category**: tautological
- **Evidence**: Renders hand-crafted `<div className="nop-gantt-skeleton">` and asserts that class exists. No actual component imported.
- **Current State**: Inflates coverage metrics without regression protection. Zero real component exercised.
- **Recommendation**: Delete file and replace with tests rendering real components in loading/empty states.

### [D23-05] Gantt Editor test exercises the store, not the editor component

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-editor.test.tsx:1-84`
- **Severity**: P2
- **Category**: tautological
- **Current State**: Tests call `store.updateTask()` directly. "Revert to original on cancel" test never performs cancel. Only one test actually renders GanttEditor.
- **Recommendation**: Remove store-level test duplication; add DOM interaction tests for editor.

### [D23-06] Kanban DnD integration test mocks all DnD adapters as no-ops

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-dnd-integration.test.tsx:1-153`
- **Severity**: P1
- **Category**: boundary-mock
- **Evidence**: `draggable`, `dropTargetForElements`, `monitorForElements` mocked to no-op functions. Despite "integration" name, no drag sequence is tested.
- **Current State**: Only verifies column/card data-\* attributes exist. Drag start, drop, reorder never tested at component level.
- **Recommendation**: Use `@atlaskit/pragmatic-drag-and-drop` test utilities for real drag sequences.

### [D23-07] Dead code tests: CalendarResourceGroup, CalendarResourceHeader, KanbanWipBadge, useKanbanCollab

- **Files**: `calendar-resource-group.test.tsx`, `calendar-resource-header.test.tsx`, `kanban-wip-badge.test.tsx`, `use-kanban-collab.test.ts`
- **Severity**: P2
- **Category**: dead-code-test
- **Evidence**: All four modules are explicitly documented as deprecated/unwired or have zero production imports.
- **Current State**: Tests exercise unreachable code. A refactor breaking these modules produces test failure but no user-facing bug.
- **Recommendation**: Wire into production path or remove (code + tests).

### [D23-08] Timezone-sensitive date tests in date.test.ts

- **File**: `packages/flux-renderers-scheduling/src/gantt/utils/date.test.ts:52-67,148-157`
- **Severity**: P1
- **Category**: timezone-sensitive
- **Evidence**: 7 assertion sites use local-time getters (`getDay()`, `getMonth()`, `getFullYear()`) on UTC-midnight returns. Fail in negative UTC offsets.
- **Current State**: Tests pass in UTC CI but break for developers in Americas timezones. No TZ env var in vitest config.
- **Recommendation**: Replace all local getters with UTC getters in test assertions.

### [D23-09] Calendar getMonthStartEnd test misses sub-minute boundary

- **File**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-date-utils.test.ts:28-31`
- **Severity**: P3
- **Category**: frozen-defect
- **Current State**: Asserts `getUTCHours() === 23` and `getUTCMinutes() === 59` but not seconds/milliseconds. Permissive of both 23:59:00 and 23:59:59.
- **Recommendation**: Add explicit seconds/milliseconds assertion.

### [D23-10] useKanbanCollab test: stub-level with no WebSocket — tests existence only

- **File**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-collab.test.ts:1-38`
- **Severity**: P2
- **Category**: tautological
- **Current State**: Tests initial state (disconnected), function existence, and setState works. No WebSocket mock, no connect/disconnect lifecycle tested.
- **Recommendation**: Add WebSocket mock or remove (dead code).

### [D23-11] useKanbanColumnResize: 2 tests with zero assertions

- **File**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-column-resize.test.ts:49-55,74-81`
- **Severity**: P3
- **Category**: tautological
- **Current State**: Tests call functions under test but never assert side effects. Pass trivially.
- **Recommendation**: Add assertions for state change and callback invocation.

### [D23-12] Coverage gap: Calendar view tests mock CalendarEventBlock — event positioning never validated

- **Files**: `calendar-month-view.test.tsx`, `calendar-week-view.test.tsx`, `calendar-day-view.test.tsx`
- **Severity**: P1
- **Category**: coverage-ineffective
- **Current State**: CalendarEventBlock mocked in all 3 view tests. Event positioning, splitting, coloring, overlap detection never exercised at component level.
- **Recommendation**: Remove event block mock in at least one test per view, pass real events.

### [D23-13] Misleading test title: "separate ArrowLeft/ArrowRight semantics" tests neither

- **File**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.test.ts:118-132`
- **Severity**: P3
- **Category**: tautological
- **Current State**: Title promises both ArrowLeft (collapse) and ArrowRight (expand). Only ArrowLeft dispatched. Only verifies toggleOpen NOT called. ArrowRight behavior untested.
- **Recommendation**: Add ArrowRight case or rename test.

### [D23-14] "Keyboard interaction" tests call store directly, not through keyboard

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-interactions.test.ts:131-148`
- **Severity**: P3
- **Category**: tautological
- **Current State**: Tests in "gantt-interactions" call `store.updateTask()` directly — no keyboard event simulated. Duplicates coverage from gantt-store.test.ts.
- **Recommendation**: Remove store-level tests from interaction test file.

### [D23-15] Calendar navigation tests assert "called" but not "called with correct value"

- **File**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-navigation.test.ts:30-46`
- **Severity**: P2
- **Category**: tautological
- **Current State**: Week/day navigation tests assert `toHaveBeenCalled()` but do not verify date offset. If goNext() advances 2 weeks instead of 1, test passes.
- **Recommendation**: Assert actual date offset from mock calls.

---

## Scheduling Package Health Assessment

### Strengths

- **Clean dependency isolation**: No internal path imports, no runtime/formula/compiler deps, no renderer cross-deps.
- **State management diversity documented**: Each renderer has explicit rationale (zustand for gantt, hooks for calendar, useState+imperative for kanban).
- **Comprehensive test infrastructure**: 60 test files across the package.
- **Schema definitions well-structured**: Full field metadata with proper kind classification (prop/event/region/reaction/meta).

### Key Risks (P1)

| ID                 | Finding                                          | Category | User Impact                                                                  |
| ------------------ | ------------------------------------------------ | -------- | ---------------------------------------------------------------------------- |
| D04-01             | Kanban boardData never re-synced with props.data | State    | Local mutations lost on re-navigation; silent data fork                      |
| D04-03             | Gantt store mutation before event, no rollback   | State    | Cannot reject/undo server-rejected changes                                   |
| D21-01/02/03/17    | UTC/local timezone mismatch (4 findings)         | Display  | Weekend marking, today marker, date positions off by 1 in negative timezones |
| D22-01             | Gantt 6 events never fire                        | Wiring   | `onTaskClick`, `onScroll`, etc. silently no-op                               |
| D22-04             | Calendar 5 events never fire                     | Wiring   | `onBatchSchedule`, `onImport`, etc. silently no-op                           |
| D23-01/02/04/06/12 | Over-mocked/false-green tests (5 findings)       | Testing  | Bugs in real component logic undetected by test suite                        |

### Architectural Observations

1. **Three distinct state management strategies** coexist for one package — Gantt (Zustand class), Calendar (hooks, no store), Kanban (useState + imperative). While each has documented rationale, this diversity creates maintenance burden and inconsistent patterns for developers extending the package.

2. **Schema-to-implementation gap**: ~20 fields declared across renderer definitions have zero consumption in component code. The `scheduling-renderer-definitions.test.ts` safety check uses a hardcoded whitelist that mirrors definitions rather than verifying actual consumption.

3. **Testing strategy relies heavily on mock isolation**: Root-level component tests universally mock away all internal logic. This provides high "coverage" numbers but low defect detection — the exact pattern identified in the deep-audit blind-spot analysis (docs/bugs/71-\*).

4. **Timezone handling is inconsistently UTC/local**: The package uses UTC-based date math via ISO strings (correct), but local-time getters for day-of-week, month, and year operations (incorrect). The test suite uses local getters in assertions, masking the issue in UTC CI.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
