> Audit Status: open
> Audit Type: open-ended (Round 4)
> Mission: scheduling
> Date: 2026-07-20
> Source perspective: Cross-boundary messenger + lifecycle tracker + build-time investigator

## Pre-check: Previous round findings drift

Before reporting new issues, verified the current codebase against all 30 findings from
rounds 1-3. Multiple findings have been fixed since those rounds:

| Fixed | ID   | Issue                                                | Current status                                                 |
| ----- | ---- | ---------------------------------------------------- | -------------------------------------------------------------- |
| ✓     | F-01 | scrollToToday/scrollToTask stubs                     | gantt.tsx:121-145 — now has working `scrollLeft` manipulation  |
| ✓     | F-02 | Delete/Backspace no-op                               | use-gantt-keyboard.ts:62 — now calls `store.deleteTask()`      |
| ✓     | F-04 | `meta.disabled === undefined` as loading             | kanban-board.tsx:266 — uses `resolved.loading`, not meta       |
| ✓     | F-07 | Resource load calculation uses diffInDays × workMins | resource-load.ts:74 — correct per-day computation              |
| ✓     | F-13 | Calendar onEventCreate never fires                   | calendar.tsx:125 — now calls `events.onEventCreate?.()`        |
| ✓     | F-16 | Week view only first resource                        | calendar-week-view.tsx:61-76 — iterates ALL resources          |
| ✓     | F-18 | Cross-day lines SVG empty                            | calendar-month-view.tsx:234-237 — wired and rendering paths    |
| ✓     | F-21 | BarcodeQueue module-level singleton                  | barcode-scanner-overlay.tsx:39 — uses `useMemo()` per-instance |
| ✓     | F-24 | barcode-input readOnly never checked                 | barcode-input-renderer.tsx:104 — checks `resolved.readOnly`    |
| ✓     | F-25 | barcode-input onMount/onUnmount never dispatched     | barcode-input-renderer.tsx:27-30 — dispatches correctly        |
| ✓     | F-26 | Calendar stale closures (date/view)                  | calendar.tsx:258-266 — uses refs to avoid stale captures       |
| ✓     | F-29 | Gantt header scroll stub                             | gantt-header.tsx:38-44 — delegates to working `scrollToToday`  |

6 findings remain open or partially unresolved (see below for new manifestations of F-11, F-23).

---

## F-31: GanttStore revision is NOT bumped on `parse`, `setZoom`, or `recalcLayout` — UI never updates after schema data changes or zoom

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts`

- `parse()` (line 129): calls `this.store.setState({ tasks, links, ... })` but does NOT increment `revision`, `taskRevision`, or any counter.
- `setZoom()` (line 562): calls `this.store.setState({ currentZoom, cellWidth })` then `this.recalcLayout()`. Neither bumps `revision` or `layoutRevision`.
- `recalcLayout()` (line 273): calls `computeScaleRange()`, `computeCoordinates()`, `computeLinkPolylines()` — all three call `this.store.setState()` but none bump any revision counter.

**What**: The `gantt-context.tsx` subscription model uses `useSyncExternalStore` with revision-based snapshots:

```typescript
// gantt-context.tsx:16-22
export function useGanttStoreSnapshot(): number {
  const store = useGanttStore();
  return useSyncExternalStore(
    store.subscribe, // Zustand subscribe
    () => store.revision, // revision snapshot
  );
}
```

When `getSnapshot` returns the same number via `Object.is`, React skips re-render. Since `parse`, `setZoom`, and `recalcLayout` never bump `revision`, the `useSyncExternalStore` comparison sees no change.

**Concrete impact**:

1. **Schema data re-parse**: Gantt's useEffect (gantt.tsx:59-65) calls `store.parse()` when `resolved.tasks`/`links`/etc. change. Zustand state updates (new tasks, links) but `revision` stays same. `useGanttStoreSnapshot` subscribers see no change. The table/bars/timeline render stale data. This means any schema-driven data refresh is invisible.

2. **Zoom changes**: `handleZoomIn`/`handleZoomOut`/`handleZoomToFit` in gantt-header.tsx call `store.setZoom()`, which changes `cellWidth` and recomputes all coordinates. But `revision` doesn't change. Bars keep their original pixel positions, widths, and sizes. The Gantt view is visually stuck at the previous zoom level.

3. **Workaround masks the bug**: `updateTask()` (line 337) correctly bumps `revision`. If the user makes any task edit after zooming, that re-render "heals" the stale layout. This creates a dangerous illusion: the feature appears to work in interactive testing ("I zoomed, then edited a task, and it looked correct") but fails in programmatic or first-time-use scenarios.

**Why care**: This is a P0 functional defect. The Gantt rendering pipeline is broken at three separate entry points that together cover nearly all non-interactive data flow. The `parse` issue alone means that if the Gantt schema is loaded dynamically (API response, dialog open, tab switch), the component renders empty or stale data until the user manually triggers a task operation.

**Confidence**: Certain

---

## F-32: GanttStore EventEmitter events are entirely dead code — zero runtime subscribers

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:114-127, 530-560`

**What**: The `GanttStore` has a manual EventEmitter (`Map<string, Set<EventHandler>>` with `on`/`off`/`emit`) that dispatches 8 specific event types: `dataChange`, `taskChange`, `linkChange`, `treeChange`, `layoutChange`, `linkAdd`, `linkDelete`, `taskDelete`.

The `gantt-context.tsx` uses `store.subscribe` (Zustand's built-in subscribe) for all React reactivity. A grep for `store.on(` across all non-test files in the scheduling package returns exactly zero results. The only subscribers are in test files (`gantt-store.test.ts`, `gantt-components.test.tsx`).

The store's `emit()` calls (lines 530-560) are pure dead code in production — no event handler is ever registered.

**Why care**: This is 8 event dispatch points that execute for every store mutation (every task update, link operation, toggle, data reload) with zero effect. The overhead is trivial per call, but the code is misleading — a future maintainer reading `emitTaskChange(id)` might reasonably assume some external system listens for task change notifications, which is false. Additionally, the EventEmitter pattern duplicates the already-existing Zustand subscription system, adding ~20 lines of unnecessary infrastructure.

Combined with F-31: the EventEmitter `emitLayoutChange`/`emitDataChange` was likely intended to trigger UI updates, but nobody subscribes. The revision counter was likely intended for the same purpose, but key paths forget to bump it.

**Confidence**: Certain

---

## F-33: GanttEditor form inputs use global `id` attributes — breaks with multiple Gantt instances

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-editor.tsx:63,67,71,75,79`

**What**: Five form inputs use hardcoded DOM `id` attributes:

```tsx
<Input ref={textRef} id="edit-text" ... />
<Input ref={startRef} id="edit-start" type="date" ... />
<Input ref={endRef} id="edit-end" type="date" ... />
<Input ref={durationRef} id="edit-duration" type="number" ... />
<Input ref={progressRef} id="edit-progress" type="number" ... />
```

And `handleSave` reads them via DOM queries:

```tsx
const textInput = document.getElementById('edit-text') as HTMLInputElement;
```

HTML `id` must be unique per page. Two Gantt charts (e.g., dashboard with "My Tasks" and "Team Tasks") cause `document.getElementById` to return the first element, not the instance's own input. Editing a task in Gantt B silently reads and saves values from Gantt A's form.

**Why care**: Reported as F-23 in Round 2. Remains unfixed. The GanttEditor is now FUNCTIONAL (F-14 was fixed), so this latent bug becomes live: anyone using the Gantt in a multi-instance context gets data corruption silently.

**Confidence**: Certain

---

## F-34: `calendar-print.css` is never imported by any file — zero effective CSS

**Location**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-print.css`

**What**: This 78-line CSS file defines comprehensive print styles for the calendar (hide controls, grayscale events, page breaks, etc.). But:

1. No `.ts`/`.tsx` file in the repository imports it.
2. The build script (`package.json` line 56) only copies `src/styles.css` to `dist/styles.css`.
3. The `package.json` sideEffects only lists `*.css` — but the file is never imported, so bundlers won't include it.

**Why care**: The `component:print` reaction is declared in `scheduling-renderer-definitions.ts:153` and the `useCalendarExport` hook presumably handles print functionality. But even if the print logic works correctly, the CSS that makes print output usable (hiding controls, grayscaling, page breaks) is never loaded. The print feature is wired but produces unstyled output.

**Confidence**: Certain

---

## F-35: Calendar `onEventCreate` AND `onEventChange` both fire on event creation — double event / contractual ambiguity

**Location**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:125-127`

**What**: `handleDragCreateEvent` fires both events for a single creation:

```typescript
events.onEventCreate?.({ event: newEvent }); // line 125
events.onEventChange?.({ event: newEvent, type: 'create' }); // line 126
```

The schema declares both `onEventCreate` and `onEventChange` as separate `kind: 'event'` fields. A consumer who handles both events (e.g., "log all event changes" + "track new events") receives the same create event twice. A consumer who only subscribes to `onEventChange` with a `type: 'create'` discriminator works, but receives it once — until someone "fixes" the double-fire by removing `onEventChange` for creates, breaking the discriminator-based consumer.

**Why care**: This creates a contractual ambiguity: which event is the authoritative channel for new events? The schema declares two separate events but the runtime conflates them. This is a cross-boundary contract violation between schema definition and runtime behavior.

**Confidence**: Certain

---

## F-36: Calendar test for onMount/onUnmount has zero assertions — false confidence

**Location**: `packages/flux-renderers-scheduling/src/calendar/calendar.test.tsx:118-125`

**What**:

```typescript
it('should call onMount and onUnmount events', () => {
  const onMount = vi.fn();
  const onUnmount = vi.fn();
  const { unmount } = render(
    <Calendar {...baseProps} events={{ onMount, onUnmount } as any} />,
  );
  unmount();
});
```

The test creates mock functions, renders the Calendar, unmounts it — but NEVER asserts that `onMount` was called, `onUnmount` was called, or that they were called with the expected arguments. The test passes trivially regardless of whether the lifecycle events fire.

**Why care**: This is a test that exists only to satisfy a coverage checkbox. It provides a false sense of lifecycle event coverage. If `onMount`/`onUnmount` stops being dispatched (e.g., after a refactor that moves the effect), this test still passes. Combined with the vitest config's `--passWithNoTests` flag, the scheduling package has no automated guardrail against lifecycle regressions.

**Confidence**: Certain

---

## F-37: `prepareWasm` module-level singleton silently ignores per-instance WASM URL changes

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.ts:24-37`

**What**: The `prepareWasm` function caches its result in a module-level `wasmPromise`:

```typescript
let wasmPromise: Promise<void> | null = null;

export function prepareWasm(wasmUrl?: string): Promise<void> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const url = wasmUrl ?? DEFAULT_WASM_URL;
      ...
    })();
  }
  return wasmPromise;
}
```

Once the first call establishes the promise with URL `A`, ALL subsequent calls reuse that same promise — even if called with URL `B`. The `wasmUrl` parameter is only read on the very first invocation.

\*\*Why care `resetWasmPromise()` exists (line 35) but is never called from any component lifecycle. If two barcode-input instances on the same page use different WASM endpoints (e.g., different ZXing versions for different scanning environments), the second instance silently uses the first instance's URL. Additionally, in test environments, the cached promise persists across test runs, causing flaky cross-test interference.

**Confidence**: Certain

---

## F-38: Coverage thresholds declared at 80% but never enforced via test runner

**Location**: `packages/flux-renderers-scheduling/vitest.config.ts:10-15`

**What**: The vitest config specifies:

```typescript
thresholds: {
  branches: 80,
  functions: 80,
  lines: 80,
  statements: 80,
},
```

But the `package.json` test script is:

```
"test": "vitest run --passWithNoTests"
```

There is NO `--coverage` flag. Vitest coverage thresholds are only enforced when running with `--coverage`. Without it, the thresholds are dead config — they're parsed but never evaluated.

**Why care**: This is a configuration contract violation. The config declares "80% coverage is required" but the test command never checks it. Someone reading `vitest.config.ts` reasonably assumes coverage is enforced. A PR that reduces coverage from 79% to 40% passes `pnpm test` without warning. The gap between declared intent and actual behavior creates a maintenance trap: when someone eventually adds `--coverage`, the tests will fail unexpectedly with no prior signal.

The `--passWithNoTests` flag further compounds this: even if a coverage run were set up, empty test files would silently pass.

**Confidence**: Certain

---

## Summary of Round 4 Findings

| ID   | Severity | File                               | Issue                                                                      |
| ---- | -------- | ---------------------------------- | -------------------------------------------------------------------------- |
| F-31 | P0       | gantt-store.ts + gantt-context.tsx | revision NOT bumped on parse/setZoom/recalcLayout — UI never updates       |
| F-32 | P2       | gantt-store.ts:530-560             | EventEmitter events have zero runtime subscribers — dead code              |
| F-33 | P1       | gantt-editor.tsx:63-79             | `document.getElementById()` breaks with multiple Gantt instances           |
| F-34 | P2       | calendar/utils/calendar-print.css  | 78-line print CSS never imported — effective dead CSS                      |
| F-35 | P2       | calendar.tsx:125-127               | onEventCreate + onEventChange both fire on create — contract ambiguity     |
| F-36 | P2       | calendar.test.tsx:118-125          | Lifecycle test creates mocks but never asserts — zero verification         |
| F-37 | P2       | prepare-wasm.ts:24-37              | Module-level singleton ignores per-instance URL parameter changes          |
| F-38 | P2       | vitest.config.ts + package.json    | 80% coverage thresholds declared but never enforced (no `--coverage` flag) |

**Total this round**: 8 new findings (1 P0, 1 P1, 6 P2)

### Cross-Round Context

This round prioritized areas NOT covered in rounds 1-3:

- Build-time/config issues (F-34, F-38)
- Store reactivity correctness (F-31, F-32)
- Test assertion quality (F-36)
- Cross-instance state leaks (F-33, F-37)
- Schema/runtime contract consistency (F-35)

### Code Improvement Since Rounds 1-3

Notable: at least 12 of 30 previous findings have been fixed between the rounds and current
HEAD. The fixes span all sub-domains (Gantt, Calendar, Kanban, Barcode) and show active
maintenance. However, P0 bug F-31 (revision not bumped on key paths) remains the most
consequential remaining issue — it affects the entire Gantt reactivity model and was missed
by previous audits because the `gantt-context.tsx` now provides per-revision subscriptions
(which looked like the reactivity was fixed), while the actual revision increment logic in
`gantt-store.ts` had gaps that were never tested.

### Blindness Self-Assessment

What this round likely missed:

1. **E2E test execution**: Did not run the actual test suite to check which tests pass/fail.
2. **Performance benchmarks**: No runtime measurement of Gantt rendering cost.
3. **Bundle size analysis**: No analysis of whether tree-shaking correctly removes dead code.
4. **Cross-package type-level correctness**: Did not verify `RendererComponentProps<GanttSchema>` type narrowing works at runtime.
5. **Security audit**: Did not probe XSS vectors in task/event text rendering.
6. **Accessibility audit**: Did not re-verify keyboard navigation correctness after the earlier fixes.

Best starting point for next round: E2E test execution (confirm which findings actually produce visible failures) + performance profiling of the Gantt store reactivity model.
