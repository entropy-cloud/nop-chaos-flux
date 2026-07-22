# Round 02: Contract Drift — Declared vs. Implemented Fields

> **Status**: Complete  
> **Method**: Cross-referencing `scheduling-renderer-definitions.ts` with actual component implementations  
> **Sources**: All 4 renderer entry-point files, schemas.ts, scheduling-renderer-definitions.ts

---

## Finding 2.1 — Gantt: 15 Fields Declared But Not Wired

**Where**: `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts:9-63` vs `gantt/gantt.tsx`

**What**: Cross-referencing the declaration with the implementation reveals a substantial gap between the advertised API surface and actual behavior:

| Declared field                                                              | Kind   | Status in implementation                                         |
| --------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| `body`                                                                      | region | Not rendered — `regions.body` never referenced                   |
| `empty`                                                                     | region | Not rendered — no empty state                                    |
| `loading`                                                                   | region | Not rendered — no loading state                                  |
| `onTaskClick`                                                               | event  | Not wired — grid uses `onSelectTask` prop only                   |
| `onTaskDoubleClick`                                                         | event  | Not wired — bar double-click opens editor directly               |
| `onLinkClick`                                                               | event  | Not wired — `GanttLinks` hover only, no event dispatch           |
| `onEmptyCellClick`                                                          | event  | Not wired                                                        |
| `onZoomChange`                                                              | event  | Not wired — `store.setZoom()` is called but event not dispatched |
| `onScroll`                                                                  | event  | Not wired — scroll sync never dispatches events                  |
| `draggable`                                                                 | prop   | Not read — drag unconditionally enabled                          |
| `editable`                                                                  | prop   | Not read — editing unconditionally enabled                       |
| `linkable`                                                                  | prop   | Not read — link drawing unconditionally enabled                  |
| `progressBarHeight`                                                         | prop   | Never referenced in any file                                     |
| `childrenField`                                                             | prop   | Not read — `flattenTasks` hardcodes `task.children`              |
| `initiallyExpanded`                                                         | prop   | Not read — expansion defaults to `task.open ?? true`             |
| `calendar`                                                                  | prop   | Not passed — `createInitialStore` doesn't pass to `GanttStore`   |
| `startDate` / `endDate`                                                     | prop   | Not read — never destructured from `resolved`                    |
| `toolbarClassName`, `taskBarClassName`, `editorClassName`, `emptyClassName` | prop   | Never applied to elements                                        |

Total: 15+ declared fields not implemented, and 4 className props not applied.

**Why care**: This is a **customer-facing contract drift**. Someone reading the renderer definitions (or generated documentation) would expect these props/events/regions to work. They silently do nothing — no console warning, no runtime error. The `body`, `empty`, and `loading` regions are particularly notable omissions since they're declared for every renderer.

The biggest functional gaps: `draggable`, `editable`, `linkable` being silently ignored means there is no programmatic way to disable interaction on the Gantt.

**Confidence**: Determinate

---

## Finding 2.2 — Kanban: `columnDraggable` Declared But Silently Ignored

**Where**:

- `scheduling-renderer-definitions.ts:88` — `{ key: 'columnDraggable', kind: 'prop' }`
- `kanban/kanban.types.ts:59` — `columnDraggable?: boolean`
- `kanban/kanban-board.tsx:63` — Only `draggable` is read

**What**: The schema declares `columnDraggable` as a separate prop from `draggable`, allowing independent control of column vs card drag. The code never reads `columnDraggable`. If a user sets `columnDraggable: false, draggable: true`, columns remain draggable — the configuration is silently ignored.

Additionally, 7 state-path fields are declared but never consumed:

- `columnsOrderStatePath`, `columnsOrderOwnership`
- `collapsedStatePath`, `collapsedOwnership`
- `kanbanOwnership`, `kanbanStatePath`, `statusPath`

**Why care**: `columnDraggable` is an **actual bug**, not just contract drift. A user can configure the component in a way that has no effect. The 7 state-path fields are planned-but-unwired controlled-mode support; they clutter the API surface but don't misbehave (they're simply ignored).

**Confidence**: Determinate

---

## Finding 2.3 — Calendar: `statusPath` Declared But Unwired + `exportToPrint` Missing from ImperativeHandle

**Where**:

- `scheduling-renderer-definitions.ts:154` — `{ key: 'statusPath', kind: 'prop' }`
- `calendar/calendar.tsx:32-40` — `CalendarHandle` declares `exportToPrint?: () => void`
- `calendar/calendar.tsx:167-181` — `useImperativeHandle` block does **not** include `exportToPrint`

**What**:

1. `statusPath` is registered in definitions but never read by any code in `calendar.tsx` or its hooks
2. `CalendarHandle` interface promises an `exportToPrint` method, but `useImperativeHandle` doesn't expose it — either the interface is wrong or the imperative handle is incomplete

Additionally, a group of deprecated components remain in the export surface with their events still registered:

- `CalendarTimezoneSelector` (`@deprecated Unwired`) with `onTimezoneChange` event
- `CalendarBatchScheduler` (`@deprecated Unwired`) with `onBatchSchedule` event
- `CalendarResourceGroup` (`@deprecated Unwired`) with `onGroupToggle` event
- `useCalendarICal` (`@deprecated Unwired`) with `onImport`, `onImportError` events
- `component:print`, `component:exportPNG`, `component:importICal`, `component:exportToICal` reactions are registered but `exportToPrint` is missing from the imperative handle

**Why care**: The `exportToPrint` inconsistency is a concrete contract gap — callers that use `CalendarHandle` will see `exportToPrint` in types but calling it does nothing. The deprecated wired events clutter the definition and create false expectations. The `statusPath` field being completely unread suggests controlled-mode support was planned but never implemented.

**Confidence**: Determinate

---

## Finding 2.4 — Barcode-input: onMount/onUnmount kind Mismatch

**Where**:

- `barcode-input/barcode-input-schemas.ts:30-31` — `{ key: 'onMount', kind: 'meta' }`, `{ key: 'onUnmount', kind: 'meta' }`
- `barcode-input/barcode-input.tsx:29-34` — Accesses via `events.onMount?.({})` and `events.onUnmount?.({})`

**What**: The field rules declare `onMount`/`onUnmount` as `kind: 'meta'` (meaning they should be placed in `props.meta`), but the actual renderer reads them from `props.events`. If the framework enforces the `kind` routing, these lifecycle hooks would silently fail.

**Why care**: Either the field rules should be `kind: 'event'` or the renderer should read from `props.meta`. This is a type-level inconsistency that only works if the framework doesn't enforce the routing.

**Confidence**: Likely (depends on whether the framework strictly routes by kind)

---

## Round Assessment

**Round coverage**: 4 findings, all centered on contract drift between declared and implemented behavior.

**Most impactful**: Gantt's 15+ unwired fields is the largest gap. It means roughly one-third of the declared public API for the Gantt component is non-functional. This should be the top remediation priority.

**Best follow-up direction**: Now that patterns of convention violation and contract drift are established, check for dead code and unused exports across the scheduling package.
