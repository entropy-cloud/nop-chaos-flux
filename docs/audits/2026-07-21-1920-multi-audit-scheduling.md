> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: scheduling
> Baseline: v1 / no compatibility burden / no transitional main-path allowances
> Date: 2026-07-22
> Remediation Plans: docs/plans/2026-07-22-1-scheduling-critical-fixes.md, docs/plans/2026-07-22-2-scheduling-contract-drift.md, docs/plans/2026-07-22-3-scheduling-quality-polish.md
> Prior audit: `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (closed), `docs/audits/2026-07-20-2157-multi-audit-scheduling.md` (planned), `docs/audits/2026-07-21-1920-open-audit-scheduling.md` (closed)

# Multi-Dimensional Audit Report: `scheduling` Mission (Round 2)

## Scope

- **Target package**: `@nop-chaos/flux-renderers-scheduling` (`packages/flux-renderers-scheduling/`)
- **Components audited**: Gantt, Kanban, Calendar, BarcodeInput
- **New dimensions covered**: 05 (Reactive precision), 06 (Async safety), 19 (Error propagation), 20 (Accessibility)
- **Re-audited prior findings**: 10 prior issues verified against live code
- **Automated tools consumed**: `pnpm check:audit-suspects`, `pnpm check:audit-reactive-render-reads`, `pnpm check:audit-async-failure-paths`, `pnpm check:audit-performance-suspects`
- **Execution model**: Shared prefix + dimension body → sub-agent (initial pass) → no iterative deep-dive needed (single-pass per dimension was sufficient given prior audit coverage) → verification against live code

## Prior Remediation Verification

10 prior findings from earlier audits were verified against current live code:

| Prior ID        | Issue                                              | Status            | Notes                                                                                 |
| --------------- | -------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| S01-01 / S13-01 | BarcodeInput `form.store.getState()` direct access | **FIXED**         | Now uses `useCurrentForm`, `useCurrentFormState` — no direct store access             |
| S01-02          | Internal Gantt type re-exports in root index.ts    | **FIXED**         | `GanttTaskData`/`GanttLinkData` removed from barrel exports                           |
| S14-01          | Gantt hooks <30% test coverage                     | **FIXED**         | 42 tests across 4 hook files: drag(10), keyboard(16), link-draw(10), scroll(6)        |
| F-51            | `gantt-search.ts` dead code                        | **FIXED**         | File deleted from source tree                                                         |
| F-52            | `multi-select.tsx` dead component                  | **FIXED**         | File deleted from source tree                                                         |
| F-54            | Zero standard flux-react hooks used                | **FIXED**         | All 4 renderers now use `useRendererRuntime`, `useRenderScope` etc.                   |
| F-55            | 6 missing CSS class definitions                    | **FIXED**         | All 6 selectors now defined in respective CSS files                                   |
| 02-01           | calendar.tsx >500 lines                            | **FIXED**         | Now 424 lines — extracted CalendarOverlay and other sub-components                    |
| 07-02           | GanttStore never disposed on unmount               | **FIXED**         | `destroy()` method added, called in gantt.tsx useEffect cleanup                       |
| 17-01           | Undo pattern FIXME comment                         | **STILL_PRESENT** | FIXME in `kanban-undo-stack.ts:42-46` about snapshot-vs-command undo still unresolved |

**Summary**: 9/10 prior findings remediated. Outstanding: the documented undo pattern divergence.

---

## Dimension 05: Reactive Subscription Precision

### [维度05-01] GanttBars subscribes to redundant `treeRevision`

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:13-17`
- **证据片段**:
  ```tsx
  export function GanttBars({ ... }: GanttBarsProps) {
    const store = useGanttStore();
    useGanttTaskSnapshot();
    useGanttLayoutSnapshot();
    useGanttTreeSnapshot();        // <-- redundant subscription
    const tasks = store.getVisibleTasks();
  ```
- **严重程度**: P2
- **订阅位置**: `useGanttTreeSnapshot()` in GanttBars render function
- **订阅范围**: `store.state.treeRevision`
- **实际需要**: Bars rendering depends on task coordinates (`$x`, `$y`, `$w`, `$h`) computed by `computeCoordinates()` which is triggered by `layoutRevision`
- **重渲染频率**: Every expand/collapse (`toggleOpen`/`expandAll`/`collapseAll`) triggers both `treeRevision` and `layoutRevision` simultaneously
- **现状**: `GanttBars` already re-renders via `useGanttLayoutSnapshot()` on every layout change. The `treeRevision` subscription provides zero additional re-renders — it is pure overhead.
- **风险**: Minimal per-se, but adds unnecessary `store.subscribe` callback registration cost and misleads readers about data dependencies.
- **建议**: Remove `useGanttTreeSnapshot()` from GanttBars — `layoutRevision` already covers all visible task coordinate changes.
- **误报排除**: Confirmed by reading `toggleOpen` implementation (gantt-store.ts:206) which calls `computeComputedPropertiesInternal()` → `computeCoordinates()` → updates `layoutRevision`.

### [维度05-02] Gantt unstable callback chain causes effect re-execution in GanttBars

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:130,207` → `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:21-52`
- **证据片段**:
  ```tsx
  // gantt.tsx — unstable inline arrow functions passed as props:
  <GanttBars
    onBarPointerDown={onDragPointerDown}
    onBarDoubleClick={(id) => setEditingTaskId(id)} // unstable: new fn every render
    onBarKeyAction={handleBarKeyAction} // unstable: defined in render
  />
  ```
  ```tsx
  // gantt-bars.tsx — useEffect depends on unstable props:
  useEffect(() => {
    const barsEl = barsRef.current;
    if (!barsEl) return;
    const handler = (e: PointerEvent) => { ... };
    barsEl.addEventListener('pointerdown', handler);
    return () => barsEl.removeEventListener('pointerdown', handler);
  }, [onBarPointerDown, onLinkHandlePointerDown]);     // new refs every render → effect re-run
  ```
- **严重程度**: P2
- **订阅位置**: gantt.tsx render body → gantt-bars.tsx `useEffect` dependency
- **订阅范围**: `onBarDoubleClick`, `onBarKeyAction`, `onDragPointerDown` as effect dependencies
- **实际需要**: Callbacks only needed during user interaction. Effect dependencies should be stable references.
- **重渲染频率**: Every Gantt render (task move, resize, zoom, expand/collapse) removes and re-adds DOM event listeners via effect cleanup/re-run.
- **现状**: `onDragPointerDown` from `useGanttDrag` is not `useCallback`-wrapped. `handleBarKeyAction` is defined inline in render. `onBarDoubleClick` is an inline arrow. All are unstable references causing unnecessary DOM event listener churn.
- **风险**: In medium-to-large Gantt charts, frequent effect re-runs cause noticeable DOM manipulation overhead.
- **建议**: Wrap `handleBarKeyAction`, `scrollToToday`, `scrollToTask` with `useCallback`. Change `onBarDoubleClick={(id) => setEditingTaskId(id)}` to a stable `handleDoubleClick = useCallback((id) => setEditingTaskId(id), [])`.
- **误报排除**: Not React Compiler memoization — these are effect dependencies that directly control DOM listener re-registration. The compiler cannot stabilize inline arrow functions passed as props to downstream useEffect deps.

### [维度05-03] `useGanttKeyboard` depends on unstable `onOpenEditor`

- **文件**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts:87`
- **证据片段**:
  ```tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      /* ... */
    };
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, store, selectedTaskId, onSelectTask, onOpenEditor, onUndo]);
  ```
  Caller (gantt.tsx:126):
  ```tsx
  useGanttKeyboard({
    containerRef,
    onOpenEditor: (id) => setEditingTaskId(id), // unstable
  });
  ```
- **严重程度**: P2
- **订阅位置**: `useGanttKeyboard` hook `useEffect` dependency
- **订阅范围**: `onOpenEditor` as effect dependency
- **实际需要**: `onOpenEditor` only called when user presses Enter — should not trigger listener rebuild
- **重渲染频率**: Every Gantt render
- **现状**: `onOpenEditor` is an inline arrow function `(id) => setEditingTaskId(id)`, creating a new reference each render. This causes the `keydown` event listener to be torn down and re-added on every Gantt render.
- **风险**: Keyboard event listener churn; potential brief focus/aria state loss during listener swap.
- **建议**: Use `useCallback` to stabilize: `useCallback((id) => setEditingTaskId(id), [])`. `containerRef`, `store`, `selectedTaskId`, `onSelectTask` (React state setter), and `onUndo` are already stable.
- **误报排除**: Not a React Compiler concern — this is a raw DOM `addEventListener` that must be stable for performance.

### [维度05-04] GanttLinks subscribes to unnecessary `taskRevision`

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-links.tsx:12-14`
- **证据片段**:
  ```tsx
  export function GanttLinks({ className }: GanttLinksProps) {
    const store = useGanttStore();
    useGanttLinkSnapshot();
    useGanttLayoutSnapshot();
    useGanttTaskSnapshot();    // <-- only renders link SVGs — doesn't read task data
  ```
  Render output:
  ```tsx
  const links = Array.from(store.links.values());
  ```
- **严重程度**: P2
- **订阅位置**: `useGanttTaskSnapshot()` in GanttLinks
- **订阅范围**: `store.state.taskRevision` — task data changes (text, start, end, progress)
- **实际需要**: GanttLinks only needs `store.links` (relationships + `$p` polyline coordinates) which are covered by `linkRevision` and `layoutRevision`
- **重渲染频率**: Every task edit (move, resize, text edit, progress update) triggers GanttLinks re-render even though link layout hasn't changed
- **现状**: GanttLinks renders SVG polylines for dependency links. Task data changes cannot affect link rendering (link coordinates derive from task positions, covered by layoutRevision).
- **风险**: In Gantt charts with many dependency links, every task edit forces unnecessary SVG re-render.
- **建议**: Remove `useGanttTaskSnapshot()`. When a task is deleted, the store's `deleteTask` removes associated links and increments `linkRevision`, so GanttLinks correctly re-renders on task deletion.
- **误报排除**: `useGanttLayoutSnapshot()` is required (zoom/scroll changes link polyline coordinates). `useGanttLinkSnapshot()` is required (link add/remove). `useGanttTaskSnapshot()` is not needed.

### [维度05-05] Kanban DnD `register*` functions unstable → adapter rebuild on every render

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:283` + hooks
- **证据片段**:

  ```tsx
  // kanban-board.tsx — effect depends on unstable registration functions:
  useEffect(() => {
    el.querySelectorAll('[data-dnd-card]').forEach((cardEl) => {
      cleanups.push(registerCard(cardEl as HTMLElement, cardId, colId, idx));
    });
    return () => cleanups.forEach((fn) => fn());
  }, [draggable, registerCard, registerColumn, registerColumnHeader]);
  // ^^^ all 3 are new function references every render

  // use-kanban-dnd.ts — returns non-memoized functions:
  return { dragState, dropState, registerCard, registerColumn, moveCardKeyboard };
  ```

- **严重程度**: P2
- **订阅位置**: `kanban-board.tsx` useEffect dependency array
- **订阅范围**: `registerCard`, `registerColumn`, `registerColumnHeader` function references
- **实际需要**: Registration functions only need re-execution when board structure changes (column/card add/remove/reorder)
- **重渲染频率**: Every KanbanBoard render (even just button hover, input focus/blur) causes effect re-run, traversing the entire DOM tree, detroying and recreating all @atlaskit/pragmatic-drag-and-drop adapters.
- **现状**: `useKanbanDnd` and `useColumnDnd` return `register*` functions that are created anew each hook call. The effect depends on them, causing full DnD adapter teardown and rebuild on every render.
- **风险**: For large Kanban boards (hundreds of cards), each render triggers O(n) DOM queries + adapter creation/destruction, causing perceptible jank.
- **建议**: Wrap `registerCard`, `registerColumn`, `registerColumnHeader` with `useCallback(fn, [])` — none of them depend on closure variables beyond the parameters passed at call time.
- **误报排除**: The DOM query within the effect is necessary (DnD adapters need real DOM elements). But the adapters themselves should remain stable when no board structure has changed.

### [维度05-06] `useCalendarNavigation` returns non-memoized functions

- **文件**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-navigation.ts`
- **证据片段**:
  ```tsx
  export function useCalendarNavigation(options: CalendarNavigationOptions) {
    const { currentDate, activeView, onDateChange } = options;
    const goNext = () => {
      /* ... uses currentDate, activeView, onDateChange ... */
    };
    const goPrev = () => {
      /* ... */
    };
    const goToday = () => {
      /* ... */
    };
    const goToDate = (date: Date) => {
      /* ... */
    };
    return { goNext, goPrev, goToday, goToDate };
  }
  ```
- **严重程度**: P3
- **现状**: All four navigation functions recreated every render. Passed to CalendarHeader as `navigation` prop.
- **风险**: If CalendarHeader ever uses `React.memo`, this would break memoization. Currently no `React.memo` on CalendarHeader so impact is minor.
- **建议**: Wrap with `useCallback` or memoize the returned object with `useMemo`.
- **误报排除**: Low severity — no measurable performance impact given CalendarHeader's trivial render cost.

### [维度05-07] GanttHeader subscribes to unnecessary `layoutRevision`

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:15`
- **证据片段**:
  ```tsx
  export function GanttHeader({ toolbarRegion, className, onScrollToToday }: GanttHeaderProps) {
    const store = useGanttStore();
    useGanttLayoutSnapshot();
    // Only reads store in click handlers, not in render
    const handleZoomIn = () => {
      const zooms = store.getAvailableZooms();
      // ...
    };
  ```
- **严重程度**: P3
- **现状**: Header is a toolbar — no layout-dependent render output. It subscribes solely to be reactive to layout changes, but only uses store data in user-initiated click handlers.
- **风险**: Minimal — Header DOM is cheap to re-render. But violates "subscribe only what you render" principle.
- **建议**: Remove `useGanttLayoutSnapshot()` from GanttHeader.
- **误报排除**: Confirm by reading render output — Header renders only buttons and toolbar region, no coordinate/layout data.

### [维度05-08] GanttStore `dataRevision` is a dead field — declared but never incremented

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:22`
- **证据片段**:
  ```ts
  interface GanttStoreState {
    revision: number;
    taskRevision: number;
    linkRevision: number;
    treeRevision: number;
    layoutRevision: number;
    dataRevision: number;
    // ...
  }
  ```
  Initialized as `dataRevision: 0`. No method in the store increments it. No component subscribes to it.
- **严重程度**: P3
- **现状**: Dead field in the store interface — declared, initialized, but never modified or subscribed to.
- **风险**: Maintenance confusion — future developer may try to use `dataRevision` believing it carries meaning.
- **建议**: Remove `dataRevision` from the store interface, or wire it to the intended semantics (increment on underlying data source change).
- **误报排除**: Not used in any subscription, so no runtime impact. Purely a code quality issue.

---

## Dimension 06: Async Safety & Cancellation

### [维度06-001] `scheduler-config.tsx` scheduling button status permanently stuck on `'scheduling'`

- **文件**: `packages/flux-renderers-scheduling/src/gantt/components/scheduler-config.tsx:20-40`
- **证据片段**:
  ```tsx
  const [status, setStatus] = useState<'idle' | 'scheduling' | 'done' | 'error'>('idle');
  const handleSchedule = () => {
    if (hasInvalidConstraint) return;
    setStatus('scheduling');
    setErrorMsg('');
    const config = { direction, constraintType, constraintDate };
    if (onScheduleAction) {
      onScheduleAction(config); // synchronous call — no await, no promise handling
    }
    // No code to setStatus('done') or setStatus('error') based on result
  };
  // Button: disabled={status === 'scheduling'}
  ```
- **严重程度**: P1
- **问题类别**: 竞态 (state never recovers)
- **异步操作**: `onScheduleAction(config)` — likely an async scheduling operation (may trigger server call)
- **竞态场景**: User clicks "Reschedule" → status='scheduling' → button disabled → `onScheduleAction` called synchronously → it returns (possibly a promise that resolves later) → status never transitions back → button permanently disabled
- **用户可见故障**: After clicking the scheduling button, the button is permanently disabled showing "scheduling..." text. User cannot retry. No success/failure feedback.
- **现状**: `status` set to `'scheduling'` atomically. The state machine has no transition path back to `'idle'`, `'done'`, or `'error'`. The component has no mechanism to learn about the scheduling operation's outcome.
- **风险**: Functional blocker — scheduling button becomes permanently unresponsive.
- **建议**: Either (A) make `onScheduleAction` return `Promise<void>` and use async/await with try/catch, or (B) have the parent manage and pass status as a prop. Add timeout protection.
- **误报排除**: Not a false positive — test file only verifies initial button disable, never recovery.

### [维度06-002] `prepare-wasm.ts` WASM promise cache doesn't respect AbortSignal — retry permanently fails after abort

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.ts:24-33`
- **证据片段**:

  ```ts
  const wasmPromises = new Map<string, Promise<void>>();

  export function prepareWasm(wasmUrl?: string, signal?: AbortSignal): Promise<void> {
    const url = wasmUrl ?? DEFAULT_WASM_URL;
    if (!wasmPromises.has(url)) {
      wasmPromises.set(
        url,
        (async () => {
          const response = await fetchWithRetry(url, MAX_RETRIES, signal); // signal from FIRST call only
          await response.arrayBuffer();
        })(),
      );
    }
    return wasmPromises.get(url)!; // returns cached promise regardless of current signal
  }
  ```

- **严重程度**: P1
- **问题类别**: 取消安全 (cached promise poisoned by abort)
- **异步操作**: WASM binary fetch (with retry), called from BarcodeScannerOverlay's useEffect
- **竞态场景**: User opens scanner → `prepareWasm(url, signal1)` creates and caches promise → closes scanner → signal1 aborted → fetch cancelled, promise rejects → re-opens scanner → `prepareWasm(url, signal2)` returns **same already-rejected cached promise** → error shown to user
- **用户可见故障**: After first open-close cycle, scanner shows "camera error" on subsequent attempts. Must refresh page to recover.
- **现状**: `wasmPromises` Map caches by URL only. Signal is not part of the cache key. Aborted promise is permanently stored.
- **风险**: Repeatable user-facing failure on normal scanner open-close flow.
- **建议**: Check `signal?.aborted` at function entry and return rejected promise immediately. Better: clear cached promise on abort or on overlay close via `resetWasmPromise()`.
- **误报排除**: `resetWasmPromise` exists but is never automatically called on overlay close.

### [维度06-003] `use-calendar-export.ts` PNG export has no cancellation, no concurrency guard, no timeout

- **文件**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:20-53`
- **证据片段**:
  ```tsx
  const exportToPNG = async (element?: HTMLElement | null, fileName = 'calendar-export.png') => {
    setExportError(null);
    const target = element ?? calendarRef?.current;
    if (!target) return;
    try {
      const html2canvas = (window as any).html2canvas;
      const canvas = await html2canvas(target, { scale: 2, ... });
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) { setExportError('Failed to generate PNG image'); return; }
        // download logic in callback — runs after component may have unmounted
      }, 'image/png');
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'PNG export failed');
    }
  };
  ```
- **严重程度**: P1
- **问题类别**: 取消安全 / 竞态
- **异步操作**: `html2canvas()` full-DOM rendering + `canvas.toBlob()` callback
- **竞态场景**: User clicks export twice → two parallel `html2canvas()` calls → second `setExportError(null)` clears first's error → `toBlob` callback fires after unmount → `URL.createObjectURL` leaked. If first render fails, error may be overwritten by second's success.
- **用户可见故障**: Rapid-clicking export may show wrong status or cause memory leak (blob URLs). Large calendar export cannot be cancelled.
- **现状**: No AbortSignal, no concurrency guard, no timeout. `toBlob` callback operates on potentially unmounted component.
- **风险**: Memory leak from orphaned blob URLs. Stale state updates after unmount.
- **建议**: Add `exporting` ref guard, AbortSignal + timeout, wrap `toBlob` in Promise for proper try/catch.
- **误报排除**: Compare with `export-handles.tsx` (Gantt) which has AbortSignal + `exportingFlag` guard. Calendar export lacks any protection.

### [维度06-004] `export-handles.tsx` module-level boolean guard has no timeout — permanent lock if html2canvas hangs

- **文件**: `packages/flux-renderers-scheduling/src/gantt/components/export-handles.tsx:3`
- **证据片段**:

  ```ts
  let exportingFlag = false;  // module-level boolean guard

  export async function exportToPng(element, options) {
    if (exportingFlag) return;      // silent ignore
    exportingFlag = true;
    try {
      await html2canvas(element, ...);  // may hang on complex DOM
    } finally {
      exportingFlag = false;
    }
  }
  // exportToPdf, exportToExcel also share same exportingFlag
  ```

- **严重程度**: P2
- **问题类别**: 竞态 / 取消安全
- **异步操作**: Dynamic import + html2canvas DOM rendering
- **竞态场景**: User clicks "Export PNG" → `exportingFlag = true` → html2canvas hangs (cross-origin image, large DOM) → `finally` never executes → `exportingFlag` permanently `true` → all exports silently blocked
- **用户可见故障**: All export functionality (PNG/PDF/Excel) permanently dead. No user feedback. Must refresh.
- **现状**: Module-level boolean (P5 prohibited pattern for bare boolean flags), no timeout, shared across all export functions.
- **风险**: Any html2canvas hang permanently blocks all exports.
- **建议**: Make concurrency guard per-export-function. Add timeout via `AbortSignal.timeout(60000)`. Add guard timer in `finally` to auto-reset after timeout.
- **误报排除**: Test file covers signal abort and null element, but not html2canvas hang scenario.

### [维度06-005] `detectWithSkewRetry` doesn't accept AbortSignal — can't cancel during retry loop

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-detector-utils.ts:46-77`
- **证据片段**:
  ```ts
  export async function detectWithSkewRetry(
    detect: (source: HTMLCanvasElement) => Promise<BarcodeDetectResult[]>,
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ): Promise<BarcodeDetectResult | null> {
    // No AbortSignal parameter
    const results = await detect(canvas);
    if (results.length > 0) return results[0];
    for (const angle of SKEW_ANGLES) {
      // up to 8 retries
      const skewedResults = await detect(canvas); // can't be cancelled mid-loop
    }
  }
  ```
- **严重程度**: P3
- **问题类别**: 取消安全
- **异步操作**: Native BarcodeDetector API calls (50-200ms each) × up to 8 retries
- **现状**: Caller (`use-barcode-detect.ts` poll function) checks `signal.aborted` before and after calling this function, but the retry loop itself cannot be interrupted.
- **风险**: Low — detection is fast (<1s total). Component unmount wastes at most 1s of CPU.
- **建议**: Add optional `AbortSignal` parameter, check at each iteration.
- **误报排除**: Architecture gap — the only async function in the barcode pipeline without AbortSignal propagation.

### [维度06-006] `barcode-input.tsx` `.catch(() => {})` empty catch block

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:60,131`
- **证据片段**:
  ```ts
  checkCameraAvailability()
    .then((result) => {
      setCameraAvailable(result.isAvailable);
      if (result.isAvailable) setOverlayOpen(true);
    })
    .catch(() => {}); // empty catch — swallows all errors
  ```
- **严重程度**: P3
- **问题类别**: 异常吞掉
- **现状**: `checkCameraAvailability` internally never rejects (has its own catch). The outer `.catch(() => {})` is dead code but establishes a dangerous pattern.
- **风险**: If `checkCameraAvailability` ever changes to reject, or if the `.then()` callback throws (e.g., `setOverlayOpen` on unmounted component), the error is silently swallowed with zero diagnostic output.
- **建议**: Remove redundant `.catch(() => {})` or add logging: `.catch((err) => console.warn('[barcode-input] camera check:', err))`.
- **误报排除**: Project has documented historical failures from similar empty-catch patterns (see bugs/07-submit-concurrent-guard.md).

### [维度06-007] `export-handles.test.ts` missing AbortSignal test for `exportToPdf`

- **文件**: `packages/flux-renderers-scheduling/src/gantt/components/export-handles.test.ts:71-76`
- **证据片段**:
  ```ts
  describe('exportToPdf', () => {
    it('returns early when element is null', async () => {
      /* ... */
    });
    // Missing: test for AbortSignal cancellation
  });
  ```
- **严重程度**: P3
- **问题类别**: 取消安全 (test gap)
- **现状**: `exportToPng` and `exportToExcel` both have AbortSignal tests. `exportToPdf` is missing one.
- **风险**: Low — PDF export logic is similar to PNG. But gap means future refactoring could break abort without test detection.
- **建议**: Add AbortSignal test for `exportToPdf`, consistent with `exportToPng` test pattern.
- **误报排除**: Test gap, not production defect.

---

## Dimension 19: Error Propagation Fidelity

### [维度19-01] `barcode-input.tsx` `.catch(() => {})` silently swallows camera availability errors

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:60,131`
- **证据片段**:
  ```ts
  checkCameraAvailability()
    .then((result) => {
      setCameraAvailable(result.isAvailable);
      if (result.isAvailable) setOverlayOpen(true);
    })
    .catch(() => {});
  ```
- **严重程度**: P2
- **类别**: 错误吞没
- **影响**: If the `.then()` callback throws (React setState on unmounted component, or future refactoring error), the exception is completely silenced with zero console output.
- **现状**: `checkCameraAvailability` is well-guarded internally, so the `.catch()` is currently dead code. But it establishes a pattern that makes future debugging extremely difficult.
- **风险**: Silent failures in the scan-open flow that cannot be diagnosed without a debugger.
- **建议**: Replace with `.catch((err) => console.error('[barcode-input] camera availability error:', err))`.
- **误报排除**: Project history documents that similar empty `.catch()` patterns caused "data source permanent stall, form value silent loss" (see bugs/07).

### [维度19-02] `use-kanban-collab.ts` WebSocket `onerror` and `onclose` discard diagnostic context

- **文件**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-collab.ts:60-63`
- **证据片段**:
  ```ts
  ws.onerror = () => {
    // ignores Event object
    if (signal.aborted) return;
    console.error('[kanban-collab] WebSocket connection error'); // hardcoded string
    updateStatus('disconnected');
  };
  ws.onclose = (ev) => {
    // receives CloseEvent but ignores ev.code, ev.reason
    // ...only checks ev.wasClean boolean
  };
  ```
- **严重程度**: P1
- **类别**: 诊断禁用
- **影响**: WebSocket `Event` and `CloseEvent` contain browser-provided diagnostics (network error type, close code, close reason). Ignoring them means connection failures cannot be diagnosed from logs.
- **现状**: Error event object discarded. Onclose code/reason never logged.
- **风险**: When collaboration fails in production, ops and devs have zero actionable diagnostic information.
- **建议**: Log the event object: `console.error('[kanban-collab] WebSocket error:', ev)`. Log `ev.code` and `ev.reason` in the close handler.
- **误报排除**: WebSocket Event objects may be information-poor in some browsers, but including them is always better than a hardcoded string.

### [维度19-03] `use-barcode-detect.ts` `err.message ?? 'Decode error'` loses context for non-Error throws

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.ts:78-80`
- **证据片段**:
  ```ts
  } catch (err: any) {
    if (signal.aborted) return;
    setError(err.message ?? 'Decode error');
  }
  ```
- **严重程度**: P1
- **类别**: 错误替换
- **影响**: If BarcodeDetector throws a non-Error value (`throw "CameraNotFound"`, `throw { code: 403 }`), `err.message` is `undefined`, falling through to generic `'Decode error'`. Original diagnostic payload lost. The `onScanError?.(detect.error)` callback also receives this context-free value.
- **现状**: Only `.message` is extracted. Non-Error throws degrade to uninformative string.
- **风险**: Root cause of detection failures cannot be determined from error reports.
- **建议**: Use `String(err)` fallback: `setError(err instanceof Error ? err.message : \`Decode error: ${String(err)}\`)`.
- **误报排除**: Defensive coding assumption that `catch` error is always an Error instance — a known anti-pattern.

### [维度19-04] `use-calendar-ical.ts` generic fallback messages for non-Error throws

- **文件**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-ical.ts:68-69,112-113`
- **证据片段**:
  ```ts
  } catch (err) {
    console.error('[useCalendarICal] importFromICal failed:', err);
    const msg = err instanceof Error ? err.message : '导入失败：文件格式错误';
    onImportError?.(msg);
  }
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: Non-Error throws (e.g., string from ical.js) produce hardcoded Chinese fallback message. `onImportError` callback sees a useless string.
- **现状**: Same `err instanceof Error ? err.message : 'generic'` pattern appears in multiple scheduling files (use-calendar-export.ts:50, gantt-compact.tsx:56, kanban-export.ts:57).
- **风险**: Import errors show generic "文件格式错误" instead of the actual parse error, confusing users and blocking self-diagnosis.
- **建议**: Preserve diagnostic payload: `const msg = err instanceof Error ? err.message : String(err) || '导入失败'`.
- **误报排除**: Systemic pattern — three occurrences of the same anti-pattern across the package.

### [维度19-05] Systematic absence of `Error.cause` across the package

- **文件**: Entire `packages/flux-renderers-scheduling/src/` (confirmed via grep for `cause:` — zero matches)
- **证据片段**: Representative examples:
  ```ts
  // prepare-wasm.ts:21
  throw lastErr instanceof Error ? lastErr : new Error(`Failed to load...`);
  // kanban-export.ts:37
  throw new Error('Canvas toBlob failed');
  // All catch → new Error sites: no { cause: originalError }
  ```
- **严重程度**: P1
- **类别**: 诊断禁用
- **影响**: Every `catch → new Error` wrapper in the scheduling package discards the original exception. In ES2022+ environments where `Error.cause` is supported, this prevents error aggregation tools (Sentry, Datadog RUM) from displaying the full error chain.
- **现状**: Zero `{ cause: originalError }` usages. This contradicts the project's own architecture guidance (`docs/architecture/action-scope-and-imports.md` which requires preserving original errors).
- **风险**: All wrapped errors lose their root-cause chain. Troubleshooting requires console-level debugging.
- **建议**: Use `new Error('wrapper message', { cause: originalError })` at all error wrapping sites.
- **误报排除**: `Error.cause` is ES2022 standard. tsconfig `target`/`lib` in the project supports it (confirmed by other ES2022+ features used across the codebase).

### [维度19-06] `use-barcode-camera.ts` `err.name` classification discards original DOMException details

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-camera.ts:87-94`
- **证据片段**:
  ```ts
  } catch (err: any) {
    if (signal.aborted) return;
    const message = err.name === 'NotAllowedError'
      ? 'Camera permission denied'
      : err.name === 'NotFoundError'
        ? 'No camera found'
        : `Camera error: ${err.message}`;
    setState({ isActive: false, error: message });
  }
  ```
- **严重程度**: P2
- **类别**: 诊断禁用
- **影响**: Even for recognized `err.name` cases, the original DOMException (name, code, stack) is replaced with a hardcoded user-facing string. Unrecognized errors (e.g., `NotReadableError`, `OverconstrainedError`) lose their specific name.
- **现状**: User-friendly messages replace all diagnostic detail. The original error name, code, and stack are discarded.
- **风险**: When `getUserMedia` fails with a less common error, the UI shows `Camera error: ${err.message}` but loses the error name and stack. Diagnostic value for rare hardware/browser issues is minimal.
- **建议**: Log the full error before replacing for UI: `console.warn('[useBarcodeCamera] getUserMedia failed:', err.name, err.message)`.
- **误报排除**: User-friendly UI messages are correct; discarding ALL diagnostic information is not.

---

## Dimension 20: Accessibility (WCAG 2.1 AA)

### [维度20-01] Calendar month view header cells missing `role="columnheader"`

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:91-99`
- **证据片段**:
  ```tsx
  <div role="row" className="flex">
    <div className="flex flex-1">
      {headerCells} {/* weekday labels rendered as plain <div> without role="columnheader" */}
    </div>
  </div>
  ```
  Compare: calendar-week-view.tsx correctly uses `role="columnheader"` on its header cells.
- **严重程度**: P2
- **WCAG 准则**: 1.3.1 Info and Relationships; 4.1.2 Name, Role, Value
- **影响**: Screen reader grid navigation mode cannot associate data cells with column headers in month view.
- **现状**: Month view header cells lack `role="columnheader"`. Week view has it — inconsistency.
- **风险**: NVDA/JAWS grid navigation shortcuts (Ctrl+Alt+Arrow) may not function correctly in month view.
- **建议**: Add `role="columnheader"` to weekday label `<div>` elements, matching week view pattern.
- **误报排除**: `role="grid"` container requires proper grid structure: `role="row"` → `role="columnheader"` for header row, `role="gridcell"` for data cells.

### [维度20-02] Gantt `role="treegrid"` doesn't match actual table content structure

- **文件**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts:82` + `gantt-grid.tsx:62-141`
- **证据片段**:

  ```tsx
  // use-gantt-keyboard.ts sets outer role
  el.setAttribute('role', 'treegrid');

  // gantt-grid.tsx renders standard HTML <table>
  <table className="w-full border-collapse table-fixed">
    <thead><tr><th>WBS</th><th>Task Name</th>...</tr></thead>
    <tbody>
      <tr role="row" aria-selected={...}>
        <td>...</td>
      </tr>
    </tbody>
  </table>
  ```

- **严重程度**: P3
- **WCAG 准则**: 4.1.2 Name, Role, Value
- **影响**: `treegrid` role expects `role="treeitem"` children with `aria-level`, `aria-setsize`, `aria-posinset`. The actual content is a standard table with `role="row"` and `<td>`. Screen readers may interpret inconsistently.
- **现状**: `role="treegrid"` on outer container but inner structure is a standard HTML table. The expand/collapse toggle is handled by separate buttons, not by the treegrid ARIA pattern.
- **风险**: VoiceOver/NVDA may enter treegrid navigation mode but cannot use expected expand/collapse keyboard shortcuts.
- **建议**: Change to `role="grid"` to match actual table semantics, or restructure to proper `role="treegrid"` with `role="treeitem"` rows and `aria-expanded`.
- **误报排除**: Mismatch between declared ARIA role and actual DOM structure.

### [维度20-03] Kanban card drag-and-drop has no keyboard alternative

- **文件**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.ts:146-167` + `kanban-board.tsx:176-195`
- **证据片段**:

  ```tsx
  // useKanbanDnd defines moveCardKeyboard but it's never connected to UI
  const moveCardKeyboard = (boardData, cardId, fromColumnId, toColumnId, fromIndex, toIndex) => { ... };
  return { dragState, dropState, registerCard, registerColumn, moveCardKeyboard };

  // kanban-board.tsx destructures — note moveCardKeyboard is not used:
  const { registerCard, registerColumn } = useKanbanDnd({...});
  ```

- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard
- **影响**: Keyboard-dependent users cannot reorder cards. All DnD interactions require pointer (mouse/touch).
- **现状**: `moveCardKeyboard` function exists but is never wired to card keyboard events. Column reordering has keyboard support (ArrowLeft/ArrowRight on column header), but card-level DnD does not.
- **风险**: WCAG 2.1.1 violation — interactive drag-and-drop must have a keyboard-accessible alternative.
- **建议**: Connect `moveCardKeyboard` to card `onKeyDown` (Space/Enter to enter drag mode, Arrow keys to move, Enter to confirm, Escape to cancel).
- **误报排除**: @atlaskit/pragmatic-drag-and-drop does not provide built-in keyboard alternatives. This is a genuine gap.

### [维度20-04] Calendar date cells missing keyboard navigation

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:167-208`
- **证据片段**:
  ```tsx
  <div
    role="gridcell"
    aria-label={...}
    data-slot="calendar-cell"
    data-date={dateStr}
    onPointerDown={(pe) => handleCellPointerDown(dateStr, resource.id, pe)}
    // missing: tabIndex, onKeyDown
  >
  ```
- **严重程度**: P2
- **WCAG 准则**: 2.1.1 Keyboard
- **影响**: Calendar date cells are not keyboard-focusable. The only focusable elements are event blocks within cells. Users cannot navigate between empty dates, select dates, or interact with the date grid via keyboard.
- **现状**: Month view grid cells have `role="gridcell"` but no `tabIndex` or keyboard event handlers. Week view has the same issue.
- **风险**: Keyboard users cannot navigate to empty dates or select dates for event creation.
- **建议**: Add `tabIndex={0}` on the first focusable cell and `tabIndex={-1}` on others, implement ArrowKey navigation between cells, and Enter/Space to select/activate a date.
- **误报排除**: Grid cells are interactive (via pointerdown for drag-create). Making them keyboard-accessible requires explicit tabIndex and keyboard handlers.

### [维度20-05] Kanban no-op "Add Column" button is focusable but does nothing

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:397-404`
- **证据片段**:
  ```tsx
  <Button
    variant="outline"
    className="flex items-center gap-1 px-3 py-2 ..."
    // No onClick handler!
  >
    {t('scheduling.kanban.addColumn')}
  </Button>
  ```
- **严重程度**: P3
- **WCAG 准则**: 2.1.1 Keyboard; 4.1.2 Name, Role, Value
- **影响**: Button appears in tab order, has a label saying "Add Column", but pressing Enter/Space does nothing.
- **现状**: Visual placeholder with no connected functionality.
- **风险**: Keyboard users are misled by a focusable element that performs no action.
- **建议**: Either implement `onClick` with a callback, or replace with a non-interactive placeholder (`aria-hidden="true"` or plain `<div>`).
- **误报排除**: This is a feature gap manifested as an a11y issue — `<Button>` without `onClick` is semantically incorrect.

### [维度20-06] Kanban tag filter hardcoded Chinese text without i18n

- **文件**: `packages/flux-renderers-scheduling/src/kanban/components/kanban-tag-filter.tsx:27,48-55`
- **证据片段**:
  ```tsx
  <span className="text-xs text-gray-500 mr-1">标签:</span>  {/* hardcoded Chinese */}
  <button type="button" onClick={...}>
    清除  {/* hardcoded Chinese */}
  </button>
  ```
- **严重程度**: P3
- **WCAG 准则**: 3.1.1 Language of Page; 3.1.2 Language of Parts
- **影响**: If the page language is not Chinese, screen readers pronounce these characters with incorrect phonemes per the page's `lang` declaration.
- **现状**: Two strings hardcoded in Chinese. Rest of the scheduling package uses `t()` from `@nop-chaos/flux-i18n`. This file doesn't import `t()`.
- **风险**: Language inconsistency for screen reader users in non-Chinese locales.
- **建议**: Import `t` from `@nop-chaos/flux-i18n` and use `t('scheduling.kanban.filterLabel')`, `t('scheduling.kanban.clearFilter')`.
- **误报排除**: Only two strings in the scheduling package are hardcoded in Chinese — all others use `t()`. This is an inconsistency, not a systematic pattern.

### [维度20-07] Calendar conflict indicator only via color + `title` attribute

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-event-block.tsx:116`
- **证据片段**:
  ```tsx
  data-overlap={overlap ? 'true' : undefined}
  className={cn('...', overlap && 'ring-2 ring-red-500', ...)}
  title={overlap ? '时间冲突' : event.title}
  ```
- **严重程度**: P3
- **WCAG 准则**: 1.4.1 Use of Color
- **影响**: Red ring is the only visual indicator of time conflicts. The `title` attribute is accessible only on hover/focus and not reliably announced by all screen readers.
- **现状**: Visual-only conflict indication (red border). `title` attribute provides a hover-only text alternative, but is hardcoded Chinese.
- **风险**: Low-vision or color-blind users may not perceive the red border as a conflict indicator.
- **建议**: Add visible text indicator (e.g., "Conflict" badge) or merge into `aria-label`.
- **误报排除**: `title` attribute is not a WCAG-sufficient text alternative — it requires hover/focus and is inconsistently announced.

### [维度20-08] Gantt/Kanban aria-labels use hardcoded English text

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:109`, `gantt-bars.tsx:133`, `kanban-column-header.tsx:92`
- **证据片段**:
  ```tsx
  // gantt-grid.tsx
  aria-label={`${store.isOpen(task.id) ? 'Collapse' : 'Expand'} task ${task.text}`}
  // gantt-bars.tsx
  aria-label={task.text ? `Task: ${task.text}` : `Gantt bar task`}
  // kanban-column-header.tsx
  aria-label={collapsed ? 'Expand column' : 'Collapse column'}
  ```
- **严重程度**: P3
- **WCAG 准则**: 3.1.1 Language of Page
- **影响**: In non-English locales, screen reader users hear English aria-label text while the surrounding UI uses the configured language.
- **现状**: Hardcoded English strings in aria-labels. The project has `@nop-chaos/flux-i18n` for internationalization.
- **风险**: Incomplete localization for users relying on screen readers.
- **建议**: Replace with `t('scheduling.gantt.collapseTask', { name: task.text })`, `t('scheduling.kanban.collapseColumn')`, etc.
- **误报排除**: aria-label text is document content and should respect the page's language declaration.

### [维度20-09] Calendar confirm dialog Enter/Space key handling non-standard

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-confirm-dialog.tsx:27-28` + CalendarOverlay
- **证据片段**:
  ```tsx
  // CalendarOverlay background handles Enter/Space to close:
  onKeyDown={(e) => {
    if (e.key === 'Escape') onEscape();
    if (e.key === 'Enter' || e.key === ' ') onClick();   // Space closes dialog without confirmation
  }}
  ```
- **严重程度**: P3
- **WCAG 准则**: 2.1.2 No Keyboard Trap; 4.1.2 Name, Role, Value
- **影响**: Pressing Space anywhere in the overlay closes the dialog, potentially losing unsaved confirmation choices.
- **现状**: Non-standard keyboard mapping on a non-modal overlay. The `useFocusTrap` is correctly implemented for the inner confirm dialog.
- **风险**: Accidental dialog dismissal by pressing Space key.
- **建议**: Remove Enter/Space handlers from the overlay background — standard `role="dialog"` with `aria-modal="true"` handles keyboard correctly via `useFocusTrap` alone.
- **误报排除**: @nop-chaos/ui's Dialog component provides correct keyboard handling out of the box. Custom CalendarOverlay reimplements this pattern with incorrect key mappings.

---

## Summary

### Prior Remediation Status

- 9 of 10 prior findings: **FIXED** ✓
- 1 remaining: FIXME comment in `kanban-undo-stack.ts:42-46` about undo pattern divergence

### New Findings (this round)

| Dimension               | Findings | P1    | P2     | P3     | Key focus areas                                                                                 |
| ----------------------- | -------- | ----- | ------ | ------ | ----------------------------------------------------------------------------------------------- |
| 05 (Reactive precision) | 8        | 0     | 5      | 3      | Gantt revision subscriptions, unstable callback references, Kanban DnD adapter churn            |
| 06 (Async safety)       | 7        | 3     | 1      | 3      | scheduler-config permanent lock, WASM cache poisoned by abort, export cancellation, empty catch |
| 19 (Error propagation)  | 6        | 3     | 3      | 0      | WebSocket diagnostic loss, non-Error throw handling, missing Error.cause, error detail discard  |
| 20 (Accessibility WCAG) | 9        | 0     | 3      | 6      | Calendar grid ARIA, Kanban keyboard DnD, date navigation, i18n of aria-labels                   |
| **Total**               | **30**   | **6** | **12** | **12** |                                                                                                 |

### P1 Findings (highest priority)

| ID     | File                     | Issue                                                                      |
| ------ | ------------------------ | -------------------------------------------------------------------------- |
| 06-001 | `scheduler-config.tsx`   | Schedule button status permanently stuck on 'scheduling'                   |
| 06-002 | `prepare-wasm.ts`        | WASM promise cache fails after AbortSignal abort; retry permanently broken |
| 06-003 | `use-calendar-export.ts` | PNG export has no cancellation, no concurrency guard, no timeout           |
| 19-02  | `use-kanban-collab.ts`   | WebSocket error/close events discard diagnostic context (code, reason)     |
| 19-03  | `use-barcode-detect.ts`  | `err.message ?? 'Decode error'` loses context for non-Error throws         |
| 19-05  | Entire package           | Systematic absence of `Error.cause` at error wrapping sites                |

### Cross-Cutting Patterns

1. **Reactive subscription over-broadness** (Dimension 05): Gantt components subscribe to revision counters they don't need (GanttBars → treeRevision, GanttLinks → taskRevision, GanttHeader → layoutRevision). These are inexpensive individually but indicate a pattern where "subscribe to everything" was the default.

2. **Unstable callback references causing effect churn** (Dimension 05): Three separate effect dependency chains in Gantt and Kanban suffer from non-memoized callback references causing DOM event listener and DnD adapter rebuild on every render.

3. **Cancellation architecture gaps** (Dimension 06): The package has multiple valid AbortController patterns but three critical gaps: scheduler-config recovery, WASM promise caching, and calendar export cancellation.

4. **`err instanceof Error ? .message : fallback` anti-pattern** (Dimension 19): This pattern appears in at least 3 files (use-calendar-ical, use-calendar-export, kanban-export, gantt-compact). Non-Error throws silently degrade to generic messages.

5. **ARIA role/structure mismatches in Calendar grid** (Dimension 20): Month view lacks `role="columnheader"`, date cells lack keyboard navigation. Week view has both — indicating a gap in the month view implementation.

### Verification Baseline

- `pnpm typecheck` — pass ✓
- `pnpm build` — pass ✓
- `pnpm lint` — pass ✓
- `pnpm test` — 613/613 scheduling tests pass ✓ (per daily log)
- Automated suspects: No scheduling-specific suspects flagged by current tooling

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
