> Audit Status: open
> Audit Type: open-ended (Round 1)
> Mission: scheduling
> Date: 2026-07-20
> Source perspective: Contract archaeologist + malicious input + cross-boundary messenger

## F-01: Gantt `scrollToToday`/`scrollToTask` imperative handles are stubs

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:73-81`

**What**: The `useImperativeHandle` exposes `scrollToToday` and `scrollToTask` to callers (via
`component:scrollToToday`/`component:scrollToTask` reactions). Both methods only call
`store.emit('change')` without implementing any scrolling logic. `scrollToTask` receives a
`taskId` parameter, looks up the task, then emits change — it never scrolls.

```typescript
scrollToToday: () => {
  store.emit('change');       // doesn't scroll
},
scrollToTask: (taskId) => {
  const task = store.tasks.get(taskId);
  if (task) {
    store.emit('change');     // doesn't scroll
  }
},
```

**Why care**: The schema declares `scrollToToday` and `scrollToTask` as reaction fields
(`scheduling-renderer-definitions.ts:52-54`). Callers invoke these expecting the viewport to
scroll. The imperative handle API promises scroll behavior but delivers a no-op. This is a silent
contract violation: the schema and the imperative API both claim functionality that doesn't exist.

The previous multi-audit (Dim09 P2) caught "11 declared Gantt events never wired" but missed
that even the wired reactions (`scrollToToday`/`scrollToTask`) are broken — they're wired to
stubs.

**Confidence**: Certain

---

## F-02: Gantt keyboard `Delete`/`Backspace` passes empty update — a silent no-op

**Location**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts:58-63`

**What**: The keyboard handler for `Delete`/`Backspace` calls:

```typescript
store.updateTask(selectedTaskId, {});
```

`updateTask` (gantt-store.ts:259) does `Object.assign(task, rest)` where `rest` is `{}` — a no-op.
It then recalculates layout and emits 'change', but no mutation occurred. The intent (delete the
task) is clear from the code context, but the implementation does nothing.

**Why care**: A user pressing Delete on a selected Gantt task expects the task to be removed. The
keyboard handler appears to work (it's wired, no crash) but silently does nothing. User
frustration when the task never disappears. No error is logged. This is a P0-quality usability
defect masked by working-looking code.

The existing multi-audit found P0 accessibility keyboard issues (P0-01: Gantt bars no keyboard
accessibility for drag/resize), but didn't catch the functional keyboard handler that exists but
is broken.

**Confidence**: Certain

---

## F-03: KanbanBoard `handleUndo` has a stale closure race condition

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:86-96`

**What**: `handleUndo` captures `boardData` from the outer closure:

```typescript
const handleUndo = useCallback(() => {
  setUndoStackState((s) => {
    const currentBoard = boardData; // captured from closure, may be stale
    const result = undoStack(currentBoard, s);
    if (result) {
      setBoardData(result.board);
      return result.stack;
    }
    return s;
  });
}, [boardData]);
```

When `handleUndo` fires, `boardData` has been captured by the `useCallback` closure. The
`setUndoStackState` functional updater is called with the latest stack state, but `boardData`
inside is from the render cycle when `handleUndo` was created. Since `handleUndo` is recreated
only when `[boardData]` changes, and between re-renders `boardData` might have been mutated by
drag-and-drop operations (which go through `handleSetBoardData`), there's a window where the
undo stack holds the correct board snapshot but the undo function reads stale `boardData`.

The `undoStack` function (kanban-undo-stack.ts:43) actually ignores the `currentBoard` parameter
entirely (see F-09 below), so the stale closure doesn't cause wrong undo results — but it means
the `currentBoard` variable is dead code. If anyone later tries to fix the undo function to use
`currentBoard`, the stale closure will cause subtle bugs.

**Why care**: This is a ticking time bomb. Currently safe because `undoStack` ignores the
parameter, but the code misleads maintainers into thinking `boardData` is being used. The next
refactor that "cleans up" the undo function will silently introduce an undo bug.

**Confidence**: Likely (the actual impact is dormant due to dead parameter — see F-09)

---

## F-04: KanbanBoard loading condition treats `meta.disabled === undefined` as loading

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:233`

**What**:

```typescript
if (resolved.loading || meta.disabled === undefined) {
```

In Flux's renderer contract (`docs/references/quick-reference.md`), `meta.disabled` is an
optional boolean — when not explicitly set by the runtime, it defaults to `undefined`. This
means any Kanban board that has:

- `resolved.loading` = `false` (or undefined, i.e., not loading)
- `meta.disabled` = `undefined` (the default state for non-disabled)

…will enter the loading branch and display the skeleton UI forever.

**Why care**: A non-loading, non-disabled Kanban board with default meta renders loading
skeleton. The correct check should be `resolved.loading` only, or `meta.disabled !== false && meta.disabled !== true && resolved.loading`. This is a semantic contract violation that makes
Kanban unusable without explicitly setting `meta.disabled`.

Impact: If any schema that includes Kanban doesn't explicitly set `disabled: false`, the board
will never display data — it shows a forever-pulsing skeleton. The bug affects every Kanban
instance in non-form, non-disabled contexts.

**Confidence**: Certain

---

## F-05: `useGanttStoreSnapshot` has coarse subscription — misses content-only changes

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-context.tsx:11-13`

**What**: The snapshot function returns only the task count:

```typescript
function ganttStoreSnapshot(store: GanttStore) {
  return store.getVisibleTasks().length;
}
```

This means `useSyncExternalStore` compares a number. If task progress is updated (e.g., user
drags a progress bar), or task text is edited, but the visible task count doesn't change, React
skips re-rendering. The UI stays stale.

Simultaneously, ALL store mutations emit the generic `'change'` event (gantt-store.ts:370-372),
which triggers ALL components using `useGanttStoreSnapshot` to subscribe to the same event. There
is no per-path subscription (progress vs text vs position vs visibility).

**Why care**: Two problems:

1. Content-only updates (progress, text, link changes) invisible to React — user edits appear
   to have no effect.
2. Coarse re-render of entire Gantt subtree on any change — zoom change re-renders grid, bars,
   links, markers, and editors simultaneously.

The previous multi-audit flagged "GanttStore created once from resolved props — ignores
subsequent updates" (P1-08, Dim04-04) but did NOT flag the coarse subscription / missed-update
pattern. This is a different bug: even if the store were re-synced, the React components wouldn't
re-render for content-only changes.

**Confidence**: Certain

---

## F-06: Two fundamentally different undo systems in the same package

**Locations**:

- `packages/flux-renderers-scheduling/src/gantt/undo-stack.ts` — Command pattern
- `packages/flux-renderers-scheduling/src/kanban/utils/kanban-undo-stack.ts` — Snapshot pattern

**What**: Gantt uses a Command-pattern `UndoStack` class:

- Stores `Command` objects with `execute()`/`undo()`/`redo()` methods
- Memory: stores only the delta (taskId + before/after values)
- Supports `mergeable()` for coalescing consecutive same-task edits

Kanban uses a snapshot-based functional approach:

- Stores full `boardSnapshot` copies for every command
- Memory: O(full board × stack depth) — each 1000-capacity entry stores deep-cloned BoardData
- Does NOT support command merging in the stack (ignores `shouldMerge` entirely)

**Why care**:

1. **Memory impact**: With Kanban's 1000-entry undo stack, each entry stores a deep clone of the
   entire BoardData (all columns, cards, metadata). For a board with 20 columns × 200 cards,
   each snapshot is significant. 1000 snapshots is serious memory pressure.
2. **Inconsistent user experience**: Gantt undo coalesces rapid same-task edits into single
   undo steps. Kanban does not. A user rapidly editing a card's fields in Gantt gets one undo
   step; in Kanban, every keystroke fills the stack.
3. **Architecture coherence**: Two different undo paradigms in the same package, with no shared
   abstraction. A third renderer (Calendar) has no undo at all.

**Confidence**: Certain

---

## F-07: `resource-load.ts` work-minute calculation has structural correctness bug

**Location**: `packages/flux-renderers-scheduling/src/gantt/components/resource-load.ts:73-76`

**What**:

```typescript
const taskDurMins = diffInDays(taskEnd, taskStart) * workMins;
...
totalUnits += (units / 100) * taskDurMins;
```

`workMins` is the work minutes available on `currentDate` (a single day). `diffInDays` returns
total days in the task's duration. Multiplying gives `total_days × workMins_of_today`, which
assumes every day has the same work minutes as today and the resource works on the task for
every one of those days.

But the loop already iterates day-by-day (`for (let d = 0; d < totalDays; d++`). The per-day
contribution should be proportional to the overlap between the task and that single day, not
the total task duration. The code effectively computes a week of work as "5 days × today's work
minutes" every day, grossly overcounting.

**Correct approach**: For each day, the contribution is `(units / 100) * workMins_of_day` for
the portion of the day the task covers. Since we don't have hourly granularity, a reasonable
simplification is `(units / 100) * workMins_of_day` (full day's allocation) — but NOT multiplied
by `diffInDays(taskEnd, taskStart)` which is a per-task once constant.

**Why care**: Resource load charts will show wildly inflated values. For a 10-day task on a
resource working 8h days, each day reports `10 * 480 = 4800` minutes of work instead of `480`.
The load bar is always red/overloaded regardless of actual assignment. This makes the entire
resource load visualization useless.

The existing multi-audit (P2-27, Dim15) flagged "Triple-nested loop in resource load calculation
(O(n^3) pattern)" as a performance issue but did NOT flag the structural correctness bug that
makes the output numerically wrong.

**Confidence**: Certain

---

## F-08: Calendar `useCalendarState` declares controlled-mode parameters never used by Calendar component

**Location**:

- Declaration: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-state.ts:12-13`
- Call site: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:134-144`

**What**: `useCalendarState` accepts `controlledDate` and `controlledView` parameters that
support a controlled component pattern (external owner controls date/view via props). The hook
implementation correctly uses them (lines 38-39):

```typescript
const currentDate = controlledDate ?? internalDate;
const activeView = controlledView ?? internalView;
```

But the Calendar component never passes these parameters:

```typescript
const { currentDate, dateRange, setCurrentDate, setActiveView } = useCalendarState({
  initialDate,
  initialView: activeView,
  firstDayOfWeek,
  onDateChange: ...,
  onViewChange: ...,
});
```

**Why care**: The hook's API surface includes controlled-mode support (the schema declares
`dateStatePath`/`viewStatePath`/`dateOwnership`/`viewOwnership`), but the Calendar component
ignores it. If a consumer tries controlled mode (e.g., synchronizing calendar view with an
external date picker), it silently fails — the initial date is used, and subsequent external
updates are ignored.

The existing multi-audit (P2-03, Dim03) flagged that `viewOwnership`/`viewStatePath`/etc. schema
fields are missing from the fields array (dead contract), but didn't notice that even if they
were wired, the Calendar component doesn't pass them to the hook.

**Confidence**: Certain

---

## F-09: `kanban-undo-stack.ts` `undo`/`redo` functions accept unused `currentBoard` parameter

**Location**: `packages/flux-renderers-scheduling/src/kanban/utils/kanban-undo-stack.ts:43-63`

**What**: Both `undo` and `redo` accept `currentBoard: BoardData` as the first argument, but
neither function references it:

```typescript
export function undo(currentBoard: BoardData, stack: UndoStack): ... {
  // currentBoard is NEVER used — function reads command.boardSnapshot directly
  ...
  return { board: deepCloneBoard(command.boardSnapshot), stack: ... };
}
```

The call site (kanban-board.tsx:87-89) passes `boardData`:

```typescript
const currentBoard = boardData;
const result = undoStack(currentBoard, s);
```

This creates the misleading impression that `currentBoard` affects the undo result. Combined
with the stale closure in F-03, this is a double trap: maintainers think `boardData` matters
for undo, and also think the closure provides the current value.

**Why care**: Dead parameter with no indication it's unused. TypeScript cannot detect this
(happily compiles). The `BoardData` parameter is always cloned unnecessarily (passed but never
read). Fix: remove the first parameter from both functions.

**Confidence**: Certain

---

## F-10: GanttStore is a vanilla EventEmitter, not a Zustand store — framework convention violation

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts` (entire file)

**What**: `AGENTS.md` explicitly states the project convention: "Zustand vanilla stores (not
React context stores). Use `use-sync-external-store` for React subscriptions."

The GanttStore is a plain TypeScript class with a manual EventEmitter pattern (`on`/`off`/`emit`)
and a `Map`-based listener system. It integrates with React via ad-hoc `GanttStoreContext` +
`useSyncExternalStore`, but the underlying store is a vanilla class, not a Zustand store.

The GanttContext provider is an ad-hoc React context (`gantt-context.tsx:4`) — which AGENTS.md
says "NEVER" to create for data that hooks already provide. The entire Gantt sub-domain has
~30+ source files all depending on this context.

**Why care**:

1. **Maintainability**: Future developers will expect Zustand stores when they see "store" naming.
   The GanttStore looks like a Zustand store but it's not — no Zustand devtools, no Zustand
   `subscribe`, no Zustand `setState`/`getState` API.
2. **Debugging**: Zustand stores get automatic devtools integration. The GanttStore's manual
   event system is invisible to debug tools.
3. **Subscription model**: Zustand's `useStore` provides per-selector subscription. The
   EventEmitter only supports whole-store subscription (see F-05).
4. **Ad-hoc context**: `GanttStoreContext` violates AGENTS.md's "NEVER create ad-hoc React
   contexts or prop-drilling chains." The context is required because the store isn't a proper
   Zustand store that could be accessed through the standard hooks.

The existing multi-audit (Dim04) noted that "Ad-hoc React context only in Gantt (GanttStoreContext)
— accepted per Calibration Pattern 8." But accepting the context doesn't make the underlying
store design a Zustand-compliant architecture decision, and doesn't address the missing per-path
subscription.

**Confidence**: Certain

---

## F-11: Gantt stores emit `'change'` on every operation causing entire subtree to re-render

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:370-372` and all callers

**What**: Every store mutation calls `this.emit('change')` after the operation. `'change'` is the
only event all Gantt React components subscribe to (via `ganttStoreSubscribe` in
`gantt-context.tsx:6-9`).

For example, `updateTask` (line 276-277):

```typescript
this.emit('taskChange', { id });
this.emit('change');
```

And `toggleOpen` (line 316):

```typescript
this.emit('change');
```

And `addLink` (line 349):

```typescript
this.emit('change');
```

Every single state mutation — whether it's selecting a task, editing text, zooming, collapsing,
dragging — re-renders GanttBars, GanttGrid, GanttLinks, GanttMarkers, GanttTimeScale,
GanttCellGrid, and GanttHeader simultaneously.

**Why care**: This is a systemic scaling bottleneck. The Gantt performance baseline claims
"500 tasks + 2000 dependencies, 60fps scrolling + drag" (roadmap-scheduling.md:373). With the
current coarse subscription, every pixel of drag movement re-renders the entire Gantt tree —
bars, grid rows, links, markers, timescale. Combined with the non-Zustand EventEmitter (F-10),
there's no path-based optimization possible without a complete rewrite of the subscription layer.

The existing multi-audit (P2-12, Dim15) flagged `GanttStore in-place mutation` as a performance
concern, but the coarse re-render is a separate, arguably more impactful issue.

**Confidence**: Certain

---

## F-12: Critical path backward pass has O(n × m) complexity where `m = total edges`

**Location**: `packages/flux-renderers-scheduling/src/gantt/components/critical-path.ts:81-96`

**What**: The backward pass iterates over all nodes in reverse topological order, and for each
node, scans ALL adjacency list entries to find predecessors:

```typescript
for (const id of sorted.slice().reverse()) {
  const lf = latestFinish.get(id) ?? projectEnd;
  ...
  for (const [srcId, edges] of adj) {       // scans entire adj for each node
    for (const edge of edges) {               // scans all edges of each source
      if (edge.target === id) {              // finds "my predecessors"
```

This is O(N × M) where N = node count and M = total edges. A standard CPM backward pass is
O(N + M) using a reversed adjacency list. The existing audit (P2-25, Dim15) flagged "O(n^2)
backward pass — scans all edges for each vertex" but characterized it as O(n^2). For a dense
graph where M ≈ N², the existing description is correct. For a sparse graph (M ≈ N), this is
O(N²) unnecessarily.

But beyond complexity: the existing audit didn't notice that this implementation also misses a
correctness detail. The backward pass should process nodes in reverse topological order AND use
a predecessors list (reverse adj). Scanning the forward adjacency for each node to find
predecessors means the backward `latestFinish` propagation is not deterministic — when a node
has multiple successors, the predecessor's `latestFinish` gets overwritten by the last successor
processed rather than taking the minimum of all successors' constraints.

**Why care**: For dense Gantt charts with many dependencies, the critical path computation is
unnecessarily slow AND potentially incorrect (the backward pass effectively uses last-writer-wins
for predecessor `latestFinish` when multiple successors constrain the same predecessor). This can
highlight wrong tasks as "critical" or miss actual critical tasks.

**Confidence**: Likely for the correctness concern; Certain for the complexity concern.

---

## F-13: Calendar's `handleDragCreateEvent` only fires `onEventChange` but never `onEventCreate`

**Location**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:102-119`

**What**: When a user creates a new event via drag-to-create, `handleDragCreateEvent` fires
`events.onEventChange?.({ event: newEvent, type: 'create' })` — it uses the `onEventChange`
event handler with a `type: 'create'` discriminator. But the schema declares a separate
`onEventCreate` event (schemas.ts:166), and the renderer-definitions.ts lists `onEventCreate`
as an event field (line 127). The `onEventCreate` handler is never called.

**Why care**: Schema consumers who attach logic to `onEventCreate` (expecting it to fire on
new event creation) will find it never fires. They must instead listen to `onEventChange` and
inspect the `type` field. This is a contract mismatch between schema declaration and runtime
behavior. The existing audit (P1-03, Dim03) flagged `onMount`/`onUnmount` as dead schema
fields but missed `onEventCreate` which is wired in the schema but not in the runtime.

**Confidence**: Certain

---

## Summary of Round 1 Findings

| ID   | Severity | File                                  | Issue                                                                         |
| ---- | -------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| F-01 | P0       | gantt.tsx:73-81                       | scrollToToday/scrollToTask imperative handles are stubs — no scrolling        |
| F-02 | P0       | use-gantt-keyboard.ts:62              | Delete/Backspace calls updateTask({}) — no-op instead of delete               |
| F-03 | P1       | kanban-board.tsx:86-96                | handleUndo stale closure over boardData — dormant due to dead param           |
| F-04 | P1       | kanban-board.tsx:233                  | `meta.disabled === undefined` treated as loading — breaks non-disabled boards |
| F-05 | P1       | gantt-context.tsx:12-13               | Coarse snapshot (task count only) misses content-only changes                 |
| F-06 | P1       | undo-stack.ts vs kanban-undo-stack.ts | Two inconsistent undo systems in one package                                  |
| F-07 | P1       | resource-load.ts:73                   | work-minute calculation uses `totalDays × todayMinutes` — gross overcount     |
| F-08 | P2       | use-calendar-state.ts vs calendar.tsx | Controlled-mode parameters declared but never passed by Calendar              |
| F-09 | P2       | kanban-undo-stack.ts:43-63            | undo/redo accept unused `currentBoard` parameter — dead code                  |
| F-10 | P2       | gantt-store.ts                        | GanttStore is vanilla EventEmitter, not Zustand — convention violation        |
| F-11 | P2       | gantt-store.ts + gantt-context.tsx    | `emit('change')` on every op re-renders entire Gantt subtree                  |
| F-12 | P2       | critical-path.ts:81-96                | O(N×M) backward pass + potential correctness issue with predecessor overwrite |
| F-13 | P2       | calendar.tsx:102-119                  | Event creation fires onEventChange but never onEventCreate                    |

**Total this round**: 13 new findings (3 P0, 5 P1, 5 P2)

These 13 findings were NOT covered by the previous 116-item multi-audit. The previous audit
focused on accessibility (20 items), styling (10 items), and async patterns (12 items). The
gaps found here are in:

- **Functional correctness** (F-01, F-02, F-04, F-07, F-13): behaviors that appear to work
  but silently do nothing or compute wrong results
- **Architecture conventions** (F-06, F-10): patterns that diverge from project standards
- **Stale closure / dead code** (F-03, F-08, F-09): parameters and logic that are declared
  but unused, creating traps for future maintainers
- **Reactivity model** (F-05, F-11): subscription granularity that causes both missed updates
  and excessive re-renders
