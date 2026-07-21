> Audit Status: planned
> Audit Type: open-ended
> Mission: scheduling
> Date: 2026-07-21
> Round: 2 (follows round-01 which reported F-46 through F-50)
> Source perspectives: Dead-code cleaner, contract archaeologist, React 19 enforcer, cross-boundary messenger, 10x-scale operator, abnormal-path detective

## Pre-check: Deduplication Against Round-01

Round-01 (F-46 to F-50) found: `useOfflineDetection` dead code, Gantt `createInitialStore` config capture, barcode `as any` dispatch, GanttTask/GanttLink deprecation deadlock, barcode-scanner-overlay effect start/stop instability. All 5 are distinct from this round's findings.

---

## Findings

### F-51: Gantt drag ghost is positioned at container coordinates, not bar coordinates [Certain]

**Location**: `src/gantt/hooks/use-gantt-drag.ts:25-26`

**What**: `useGanttDrag.onPointerDown` reads `e.currentTarget.getBoundingClientRect()` to position the drag ghost. The pointerdown event originates from `gantt-bars.tsx:50` where `barsEl.addEventListener('pointerdown', handler)` is bound — `barsEl` is the **container** (`.nop-gantt-bars`), not the individual bar. The inner handler calls `onBarPointerDown(e, taskId, mode)` passing the original DOM event whose `currentTarget` is the container. The ghost clone is therefore positioned at the container's top-left instead of the bar's.

**Why care**: Drag visual feedback is broken. The ghost element appears offset from the actual bar by the container's scroll/offset. Users see a phantom bar in the wrong position when dragging.

**Contrast with F-01/F-29 (prior rounds)**: Those were stubs doing nothing. This is the opposite — it runs, positions incorrectly, and produces a misleading visual result that looks like it works to a casual observer.

---

### F-52: Document-level event listeners leak on unmount during drag/link-draw/resize [Certain]

**Location**: `src/gantt/hooks/use-gantt-drag.ts:118-120`, `src/gantt/hooks/use-gantt-link-draw.ts:71-73`, `src/gantt/gantt-layout.tsx:50-53`

**What**: All three hooks register `document.addEventListener('pointermove')`, `document.addEventListener('pointerup')`, `document.addEventListener('keydown')` only during active interactions (pointerdown). They are removed in `cleanup()` called from `onPointerUp` or Escape key. But if the component unmounts while a drag/link-draw/resize is in progress:

- The useEffect cleanup in `use-gantt-drag.ts:123-127` only removes `ghostRef.current` — not the document listeners.
- The useEffect cleanup in `use-gantt-link-draw.ts:108-113` only removes `tempLine` — not the document listeners.
- `gantt-layout.tsx` has no useEffect cleanup at all for its resize handle.

**Why care**: Memory leak — stale closures hold references to the store and DOM elements. After unmount, `store.updateTask()` calls become no-ops against a destroyed store. Ghost DOM element also leaks into `document.body`.

---

### F-53: `scheduler-config.tsx` status stuck at `'scheduling'` — button permanently disabled [Certain]

**Location**: `src/gantt/components/scheduler-config.tsx:28`

**What**: `handleSchedule()` calls `setStatus('scheduling')` on line 28 and then `onScheduleAction(config)` synchronously. `setStatus` is **never called again**. The button `disabled` check (`status === 'scheduling'`) remains `true` forever. The `done`/`error` status messages (lines 95-101) are never rendered.

**Why care**: This scheduling feature is completely broken — user clicks "Schedule", button disables permanently, no feedback ever shown. The entire `SchedulerConfig` component is a dead UX surface.

---

### F-54: Kanban side effect inside `setState` updater — undo stack corruption in Strict Mode [Certain]

**Location**: `src/kanban/kanban-board.tsx:102-112`, `114-123`, `125-134`

**What**: `handleSetBoardData` calls `setUndoStackState()` inside `setBoardData()`'s updater function. `handleUndo`/`handleRedo` do the reverse — calling `setBoardData()` inside `setUndoStackState()`'s updater. React's `setState` updaters must be pure; nested state updates inside an updater are an anti-pattern. In React 19 Strict Mode, updaters are invoked twice, creating **duplicate undo stack entries**.

```typescript
const handleSetBoardData = (newBoard: BoardData) => {
  setBoardData((prev) => {                    // updater — must be pure
    setUndoStackState((s) => pushCommand(...)); // side effect! double in Strict Mode
    return newBoard;
  });
};
```

**Why care**: Every board mutation creates two undo entries in dev (Strict Mode), corrupting the undo history. Users navigating undo will skip one mutation per step. This is not a theoretical concern — React 19 Strict Mode double-invokes updaters by design.

---

### F-55: Kanban `filterCard` prop is completely inert — schema type mismatch [Certain]

**Location**: `scheduling-renderer-definitions.ts:84`, `kanban.types.ts:53`, `use-kanban-filter.ts:5`, `kanban-board.tsx:158`

**What**: Three-way inconsistency:

1. `scheduling-renderer-definitions.ts:84` registers `filterCard` as a `kind: 'prop'`
2. `kanban.types.ts:53` types it as `filterCard?: string`
3. `use-kanban-filter.ts:5` expects `filterCard?: (card: BoardItem, text: string) => boolean`
4. `kanban-board.tsx:158` calls `useKanbanFilter(data, searchText)` — **never passes `filterCard`**

The board component ignores the prop entirely. Even if wired, the runtime would pass a string (from JSON schema), while the hook expects a function. The `filterCard` feature is non-functional.

**Why care**: API surface lies to consumers. Setting `filterCard` in JSON has zero effect. The renderer contract promises a feature that doesn't exist.

---

### F-56: Kanban 16 registered schema props never consumed [Certain]

**Location**: `scheduling-renderer-definitions.ts:72-106` (fields registered), `kanban-board.tsx` (none referenced)

Affected: `columnsConfig`, `columnDraggable`, `columnsOrderStatePath`, `columnsOrderOwnership`, `collapsedStatePath`, `collapsedOwnership`, `kanbanOwnership`, `kanbanStatePath`, `statusPath`, `onColumnClick`, `onCardAdd`, `onCardRemove`, `filterCard`, `columnHeaderClassName`, `cardClassName`, `columnFooterClassName`.

Plus: `onMount` and `onUnmount` are declared as `kind: 'meta'` but never invoked in the component (no useEffect lifecycle dispatch).

**Why care**: 33% of the Kanban field definitions are non-functional. Consumers setting `columnsOrderStatePath`, `statusPath`, or class name props receive no visual or behavioral effect.

---

### F-57: Kanban drag-and-drop visual feedback entirely dead [Certain]

**Location**: `kanban.css:78-85`, `kanban-board.tsx:176`, `useKanbanDnd` return values

**What**: `kanban.css` defines `[data-dragging='true']` and `[data-drop-target='true']` CSS selectors for drag opacity and drop-target highlighting. But:

1. `kanban-board.tsx:176` destructures only `{ registerCard, registerColumn }` from `useKanbanDnd`, ignoring `dragState`, `dropState`, and `moveCardKeyboard`.
2. No JSX in the component tree sets `data-dragging` or `data-drop-target` attributes.

The DnD hook computes all the visual state needed, but the board component never applies it to the DOM.

**Why care**: All drag-and-drop visual feedback (card opacity on drag, column highlight on hover) is non-functional. Users see no visual indication during drag operations. The `moveCardKeyboard` accessibility feature is also unimplemented.

---

### F-58: Calendar `data-weekend="weekend"` vs CSS `data-weekend="true"` — weekend styling broken [Certain]

**Location**: `src/calendar/calendar.css:48`, `src/calendar/components/calendar-month-view.tsx:164,177`

**What**: CSS selector reads `[data-weekend='true']`, but JSX emits `data-weekend={weekendIndicator || undefined}` where `weekendIndicator` is the string `'weekend'` (line 164: `'weekend' : ''`). The CSS rule never matches.

Contrast with Gantt where `gantt-cellgrid.tsx:44` correctly emits `data-weekend={isWeekend ? 'true' : undefined}` matching `gantt.css:53` which also uses `true`.

**Why care**: Weekend background styling is completely non-functional in Calendar month view. The code demonstrates the correct pattern (Gantt) was implemented 2 files away but Calendar did not follow it.

---

### F-59: Calendar `isToday()` uses local time for dates that are UTC — near-midnight date mismatch [Certain]

**Location**: `src/calendar/utils/calendar-date-utils.ts:49-51`

```typescript
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date()); // new Date() is local time
}
```

Calendar dates are constructed with `Date.UTC()` calls throughout the view layer. Comparing a UTC date (e.g., 2026-07-22T00:00:00.000Z which is 2026-07-21 in UTC-5) against `new Date()` (local time) will produce wrong results for users near midnight.

**Why care**: `isToday()` determines visual highlighting (`todayIndicator`, `aria-current="date"`, `bg-blue-50` ring). Users in negative UTC offsets near midnight will see "today" highlighting on the wrong date.

---

### F-60: Calendar 15+ registered schema props/events never consumed [Certain]

**Location**: `scheduling-renderer-definitions.ts:108-158` (Calendar fields), `calendar/calendar.tsx` (implementation)

Unconsumed props: `timezoneSelector`, `batchScheduling`, `viewOwnership`, `viewStatePath`, `dateOwnership`, `dateStatePath`, `statusPath`, `showCrossDayLines`, `maxConcurrent`, `eventClassName`, `emptyClassName`.

Unconsumed events: `onBatchSchedule`, `onImport`, `onImportError`, `onTimezoneChange`, `onGroupToggle`, `loadAction`.

Unconsumed regions: `loading`, `empty`, `body`.

Unconsumed reactions: `component:print`, `component:exportPNG`, `component:importICal`, `component:exportToICal`.

Corresponding dead components: `CalendarBatchScheduler`, `CalendarTimezoneSelector`, `CalendarResourceGroup`, `CalendarResourceHeader`, `useCalendarICal`, `useCalendarExport`.

**Why care**: ~25% of Calendar's schema contract is non-functional. Components exist (`CalendarBatchScheduler.tsx`, `CalendarTimezoneSelector.tsx`) with full test suites but are never instantiated. This represents significant dead code weight (~15KB estimated).

---

### F-61: BarcodeInput ignores validation schema props — form validation bypassed [Certain]

**Location**: `barcode-input/barcode-input-schemas.ts:3-16`, `barcode-input/barcode-input.tsx`

Unconsumed: `required`, `trimContents`, `minLength`, `maxLength`, `pattern`, `validate`, `continuousScan`.

**Why care**: A `barcode-input` field inside a form accepts any value, regardless of `required`, `pattern`, or `minLength`/`maxLength` constraints declared in the schema. Form validation is silently bypassed.

---

### F-62: `prepareWasm` caches rejected promise — scanner permanently dead after abort [Certain]

**Location**: `src/barcode-input/utils/prepare-wasm.ts:24-33`

```typescript
const wasmPromises = new Map<string, Promise<void>>();

export function prepareWasm(wasmUrl?: string, signal?: AbortSignal): Promise<void> {
  const url = wasmUrl ?? DEFAULT_WASM_URL;
  if (!wasmPromises.has(url)) {
    wasmPromises.set(
      url,
      (async () => {
        const response = await fetchWithRetry(url, MAX_RETRIES, signal);
        await response.arrayBuffer();
      })(),
    );
  }
  return wasmPromises.get(url)!; // cached — even if rejected
}
```

If the first fetch fails (aborted via signal, network error, 404), the rejected promise is cached forever. All subsequent calls with the same URL return the already-rejected promise. A `resetWasmPromise()` function exists but is only exposed through a component handle that consumers must know to call.

**Why care**: User opens scanner → WASM fails to load (e.g., network blip) → closes scanner → reopens → scanner silently fails again because the cached promise is already rejected. The scanner is permanently dead until the page is reloaded or consumer calls `resetWasmPromise()`.

---

### F-63: `handleScanClick` async event handler has no catch — unhandled rejection [Certain]

**Location**: `src/barcode-input/barcode-input.tsx:72-80`

```typescript
const handleScanClick = async () => {
  scanOnFocusOpenedRef.current = false;
  if (cameraAvailable === null) {
    const result = await checkCameraAvailability();
    setCameraAvailable(result.isAvailable);
    if (!result.isAvailable) return;
  }
  setOverlayOpen(true);
  // no try/catch — if checkCameraAvailability() rejects, it's an unhandled rejection
};
```

`checkCameraAvailability()` calls `getUserMedia()` which can reject with `NotAllowedError`, `NotFoundError`, or `NotReadableError`. React does not catch async rejections from DOM event handlers.

**Why care**: Unhandled promise rejection in production. On some browsers this triggers the global `unhandledrejection` event, causing noisy error reporting and potentially crashing the page.

---

### F-64: Critical path algorithm ignores work calendar — calculates in calendar days [Likely]

**Location**: `src/gantt/components/critical-path.ts:119-121`

```typescript
function diffMs(end: string, start: string): number {
  return new Date(end).getTime() - new Date(start).getTime();
}
```

The Gantt supports work calendars (`WorkCalendar` in `worktime.ts`) but the critical path calculation ignores them entirely. Lag is multiplied by `86400000` (calendar ms per day) without considering working-day semantics.

**Why care**: Critical path durations are wrong when non-working days (weekends, holidays) are configured. Tasks that appear on the critical path may have slack in real working-day terms.

---

### F-65: Resource load average uses misleading denominator [Likely]

**Location**: `src/gantt/components/resource-load.ts:84`

```typescript
const avgTotalLoad = totalDaysWithWork > 0 ? totalLoadSum / totalDaysWithWork : 0;
```

Divides by `totalDaysWithWork` (days where `unitLoad > 0`) instead of `totalDays`. A resource working 100% on 1 day out of 100 shows 100% average load instead of 1%.

**Why care**: Resource load metric misleading for capacity planning. A lightly used resource with one busy day appears fully loaded.

---

### F-66: Type duplication with drift between `schemas.ts` and `gantt.types.ts` [Certain]

**Location**: `src/schemas.ts:29-67`, `src/gantt/gantt.types.ts:60-97`

`GanttResource`, `GanttAssignment`, `GanttColumn`, `GanttScale`, `GanttZoomLevel` are duplicated between the two files with type drift:

- `schemas.ts` `GanttResource.id: string` vs `gantt.types.ts` `GanttResource.id: GanttId` (= `string | number`)
- `gantt.types.ts` `GanttResource` has extra `calendar?: string` field
- `GanttSchema` uses `GanttTaskData` from `gantt.types.ts` for tasks/links but its own copies for resources/assignments

**Why care**: Consumers reading `GanttSchema.resources[].id` see `string` but the runtime store expects `string | number`. Latent type safety hole.

---

### F-67: `BaselineBars` component is dead — never imported [Certain]

**Location**: `src/gantt/components/baseline-bars.tsx` (entire file, 30+ lines)

Exported component with full test coverage, but never imported anywhere in the codebase. The baseline data (`GanttTaskData.baselines`) is stored in task data but never visually rendered.

**Why care**: 2.5 KB dead component. Stale feature — if someone adds baseline rendering, they'll find this component but it may be out of sync with the current layout system.

---

### F-68: Kanban undo stack hard-codes all mutations as `'moveCard'` [Certain]

**Location**: `src/kanban/kanban-board.tsx:105`

```typescript
type: 'moveCard',  // always — even for column reorder, card add/remove
```

The undo command type is hard-coded to `'moveCard'` regardless of what actually changed. The type is exported metadata for consumers to examine undo history.

**Why care**: Undo stack metadata is semantically wrong — column reorders and adds appear as card moves. Any consumer inspecting undo history sees meaningless command types.

---

### F-69: Kanban `deepCloneBoard` only shallow-clones nested `data`/`meta` — undo snapshot corruption [Likely]

**Location**: `src/kanban/kanban-undo-stack.ts:97-104`, `src/kanban/kanban-helpers.ts:3-10`

Both `deepCloneBoard` and `cloneBoard` do `{ ...item, data: { ...item.data }, meta: { ...item.meta } }`. For nested values within `data` or `meta` (e.g., `data.tags: [{ id, text, color }]`), the clone shares references.

**Why care**: Any external mutation of nested objects within card `data`/`meta` after an undo snapshot corrupts the undo state. If a collaborator updates `card.data.tags[0].text`, all snapshots sharing that reference tree are mutated.

---

### F-70: `Missing react-dom` peer dependency [Low]

**Location**: `package.json:29-35`

`react-dom` is not declared as a peer dependency. The package exports React components that render to DOM (Gantt, Kanban, Calendar, BarcodeInput). Standard practice for React DOM component libraries is to peer-depend on both `react` and `react-dom`.

---

## Cross-Round Summary

| Round          | Findings              | Novel  | Overlap with prior |
| -------------- | --------------------- | ------ | ------------------ |
| Round-01       | 5 (F-46 to F-50)      | 5      | 0                  |
| **This round** | **20 (F-51 to F-70)** | **20** | **0**              |

### Key Patterns Detected

1. **Massive contract drift (3 sub-domains)**: Calendar (~15 unused props), Kanban (16 unused props + missing lifecycle), BarcodeInput (7 validation props ignored). The renderer definitions file promises far more than the components deliver. ~25-33% of each component's schema contract is non-functional.

2. **Dead-but-tested components (3 sub-domains)**: `BaselineBars`, `CalendarBatchScheduler`, `CalendarTimezoneSelector`, `CalendarResourceGroup`, `CalendarResourceHeader`, `useCalendarICal`, `useCalendarExport`. Each has a test file but zero production imports. ~15 KB of dead renderer code.

3. **setState updater impurity pattern** (Kanban): Undo stack nested inside updater — React 19 Strict Mode creates double entries. This is the exact class of bug the React 19 docs warn about.

4. **CSS/JSX attribute mismatch** (Calendar `data-weekend`): A bug class where one file (Gantt) gets it right and a sibling file (Calendar) gets it wrong 2 directories away, suggesting no shared CSS convention was enforced.

---

## Overall Assessment

The scheduling package has strong test coverage in isolated units but suffers from systemic contract drift between the schema definitions and their actual wiring. The dead component pattern (fully implemented and tested but never instantiated) suggests features were built speculatively or migrated away without removing the old implementation. The worst bugs are user-visible: Gantt drag ghost at wrong coordinates (F-51), Scanner WASM permanent failure (F-62), SchedulerConfig permanent disable (F-53), and Calendar weekend styling broken (F-58).

### Blindness Self-Assessment

1. **E2E test execution**: Did not run the test suite — some findings may have existing test coverage.
2. **Performance profiling**: Did not profile Kanban undo memory at 1000 cards, Gantt store cascading setState, or Calendar virtualizer efficiency.
3. **Security**: Did not probe XSS vectors through task/event text rendering or prototype pollution through schema data.
4. **Accessibility**: Did not screen-reader-test keyboard navigation patterns or ARIA semantics.
5. **Internationalization**: Did not verify locale handling beyond the Calendar `isToday()` timezone bug.
6. **Next round starting point**: E2E test execution to surface which findings produce visible failures, followed by security audit of schema-driven rendering (task/event `text` and `title` fields).
