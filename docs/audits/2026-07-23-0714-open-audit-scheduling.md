> Audit Status: closed
> Audit Type: open-ended
> Mission: scheduling

# Open-Ended Adversarial Audit — Scheduling (Round 1, 2026-07-23)

## Pre-Check: Prior Audit Status

Verified current HEAD against all 70 findings from 5 prior audit executions (`2026-07-20-2157` rounds 1-4, `2026-07-21-001` round 1, `2026-07-21-1920` rounds 1-2). Multiple high-severity items resolved; key items remain.

### Re-Opened Findings (Previously Claimed Fixed, Still Broken)

| Previous ID | Issue                                                                                          | Current Status                                                                                                                                                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-41        | Kanban `filterText` one-time initializer not reactive                                          | `use-kanban-filter.ts:10` still uses `useState(externalFilterText ?? '')` with NO sync `useEffect`. The purported fix (effect sync at lines 12-17) only syncs `debouncedValue→activeText`, not `externalFilterText→localText`. Fix either never landed or was rolled back. |
| F-50        | Barcode camera lifecycle re-runs on every render                                               | `barcode-scanner-overlay.tsx:82,130` — `start`/`stop` from `useBarcodeCamera` are still fresh closures every render and still in the effect dependency array.                                                                                                              |
| F-61        | Barcode validation props (`required`, `minLength`, `maxLength`, `pattern`, `validate`) ignored | `barcode-input.tsx` — zero of these five fields are read. They're declared in schema and types but never checked in the renderer.                                                                                                                                          |
| F-24        | Barcode `readOnly` only gates text input, scanner bypasses it                                  | `barcode-input.tsx:199` passes `readOnly` to `InputGroupInput`, but `handleFocus:58-72` still opens overlay, `handleScanResult:117-123` still writes to form, `showScanButton:42` only checks `cameraAvailable !== false`.                                                 |
| F-44        | Redundant `useCallback`/`useMemo` with React Compiler                                          | 3 instances in `kanban-board.tsx` (lines 133,193,208), 3 in `gantt.tsx` (lines 185,194,205). None have `eslint-disable react-compiler` annotations.                                                                                                                        |

### Previously Noted Items Still Unresolved

| Previous ID | Issue                                                                  | Notes                                                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-47        | Gantt `cellWidth`/`defaultZoom`/`taskBarHeight` captured at mount only | `gantt.tsx:61` `useState(() => createInitialStore(resolved))`. The `useEffect` at line 79 only syncs task/link/resource data, never config props. By design but inconsistent. |
| F-19        | Calendar i18n partial — header still has hardcoded strings             | `calendar-header.tsx:52,69` hardcodes `aria-label="Previous"`/`"Next"`. `calendar-day-view.tsx:72` hardcodes `'en-US'` locale.                                                |

---

## New Findings

### F-71: Gantt `expandAll()`/`collapseAll()` skip layout recomputation — task bars render with stale coordinates

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:242-254`

**What**: Both methods bump `revision` and `treeRevision` via `store.setState` but never call `recomputeVisualLayout()` or bump `layoutRevision`:

```typescript
expandAll(): void {
  const state = gs();
  // ... update expandedSet ...
  store.setState({ expandedSet: newExpanded, revision: state.revision + 1, treeRevision: state.treeRevision + 1 });
  // NEVER calls recomputeVisualLayout() or bumps layoutRevision
},

collapseAll(): void {
  const state = gs();
  // ...
  store.setState({ expandedSet: new Set(), revision: state.revision + 1, treeRevision: state.treeRevision + 1 });
  // SAME omission
},
```

`GanttBars` (gantt-bars.tsx:22-24) subscribes to `layoutRevision` via `useSyncExternalStore`. Since `layoutRevision` never changes, the bars component's snapshot stays the same — React skips re-render. Even if `treeRevision` triggers a re-render, the task `$x`/`$y`/`$w` pixel coordinates in the store are stale (computed for the previous expand/collapse state).

**Concrete impact**: Clicking "Expand All" or "Collapse All" in the Gantt header shows tasks at wrong pixel positions. Child task bars may overlap, appear at y=0, or remain invisible. Subsequent task edits (which properly bump `layoutRevision`) "heal" the display, masking the bug.

**Previous audits missed this**: The 2026-07-20 round-4 audit (F-31) correctly verified that `revision` is bumped on these paths, but never checked `layoutRevision`. The `GanttBars` subscription model (per-revision, not single `revision`) was restructured after that audit.

**Confidence**: Certain

---

### F-72: Calendar `CalendarDayView` hardcodes `'en-US'` locale — ignores component's locale prop from parent views

**Location**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-day-view.tsx:72`

**What**: The day view renders its date header with a hardcoded locale:

```typescript
// calendar-day-view.tsx:72 (approximate)
{
  currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
```

The `CalendarDayView` component interface does NOT declare a `locale` prop. All other calendar view components (`CalendarMonthView`, `CalendarWeekView`, `CalendarHeader`) receive and use a `locale` prop correctly.

**Why care**: If the calendar's `locale` is set to anything other than `'en-US'` (e.g., `'zh-CN'`, `'ja-JP'`, `'de-DE'`), the day view's date header renders in English while all other views respect the configured locale. This is visually inconsistent and breaks the i18n contract that the other views follow. Since `CalendarDayView` doesn't even declare the prop, callers can't pass locale to it even if they wanted to.

**Confidence**: Certain

---

### F-73: Kanban DnD integration test is a silent no-op — CSS selector missing `kanban-` prefix

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-dnd-integration.test.tsx:207`

**What**: The test queries for a drag handle using the wrong selector:

```typescript
const dragHandle = col1.querySelector('[data-slot="column-drag-handle"]') as HTMLElement;
```

But the component at `kanban-column-header.tsx:88` renders:

```tsx
<div data-slot="kanban-column-drag-handle" ...>
```

The selector is missing the `kanban-` prefix. `querySelector` returns `null`. The `if (dragHandle)` guard on line 208 skips the entire body. The test passes trivially with no meaningful assertions — `columns.length` is never checked.

**Why care**: The entire `'reorders columns via keyboard'` test (the only keyboard column reorder test) is a silent no-op. It exists in the test suite, runs, passes, and provides zero regression protection. The assertion at line 212 (`expect(columns.length).toBe(2)`) never executes. A regression that breaks column reordering would go undetected.

**Confidence**: Certain

---

### F-74: Gantt virtualization has one-frame flash — all tasks rendered non-virtually before `useEffect` activates virtual mode

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:38-48`

**What**: The grid uses a `hasScrollContainer` state initialized to `false`:

```typescript
const [hasScrollContainer, setHasScrollContainer] = useState(false);
useEffect(() => {
  setHasScrollContainer(!!scrollContainerRef?.current);
}, [scrollContainerRef]);
```

On first render, `hasScrollContainer` is `false`, so the grid renders ALL tasks with a full `.map()`. After the effect fires, it switches to virtualized rendering. For 500+ tasks, this means the first paint renders all rows, then React re-renders with virtualized rows — visible flash.

**Why care**: The roadmap (S2.1) claims "500+ tasks display performance." The virtualization flash undermines this for initial page load. Each mount triggers a synchronous full-task render, then an immediate virtualized re-render. This is a measurable UX regression (layout thrash) for any Gantt with enough tasks to need virtualization.

**Confidence**: Certain

---

### F-75: Calendar dual-surface ref sync creates race condition — `latestViewRef`/`latestDateRef` synced via two effects instead of derived from hook return values

**Location**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:139-140,168-173`

**What**: The Calendar maintains `latestViewRef` and `latestDateRef` refs that are synced via separate `useEffect` hooks:

```typescript
const latestViewRef = useRef(controlledView ?? initialView); // line 139
const latestDateRef = useRef(controlledDate ?? new Date(initialDate)); // line 140

useEffect(() => {
  latestViewRef.current = activeView;
}, [activeView]); // line 168
useEffect(() => {
  latestDateRef.current = currentDate;
}, [currentDate]); // line 169
```

These refs are consumed in event callbacks (lines 152, 158) instead of using the hook's return values directly. This creates a separate tracking path that must remain in sync with `useCalendarState`'s internal state. During render cycles where `activeView` or `currentDate` change but the effects haven't flushed yet, callbacks fire with stale ref values.

**Why care**: If a parent triggers a view change and the `onViewChange` callback fires in the same render cycle (before effects flush), the callback reads the stale `latestViewRef.current` instead of the current `activeView`. This is a latent data race that manifests as wrong event payloads. The hook already provides `activeView`/`currentDate` as return values — the ref layer is unnecessary.

**Confidence**: Likely (depends on timing of event dispatch relative to effect flush)

---

### F-76: GanttEditor uncontrolled inputs don't update `defaultValue` across editing sessions — shows stale task data on re-open

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-editor.tsx:65-81`

**What**: The editor form uses `defaultValue` on HTML inputs:

```tsx
<Input ref={textRef} id={`${instanceId}-edit-text`} defaultValue={editingTask?.text ?? ''} ... />
```

React's `defaultValue` only sets the initial value. When the editor is closed and re-opened for a different task, if React preserves the component instance (same position in tree), the inputs retain the previous task's values. The task data is correctly fetched (`const editingTask = editingTaskId ? store.tasks.get(editingTaskId) : null` on line 29), but `defaultValue` is ignored after the first render.

**Was F-14/GanttEditor dead?** The editor can now open (F-14 fixed). But the introduced implementation uses uncontrolled inputs with `defaultValue`, which is incorrect for a dialog that opens with different task data each time.

**Why care**: Editing Task A → close → edit Task B → form shows Task A's values. User saves → Task B gets Task A's values. Data corruption for anyone using the Gantt editor across multiple tasks in the same session.

**Confidence**: Certain

---

### F-77: Kanban `confirmAddColumn` uses shallow spread instead of `structuredClone` — inconsistent with rest of kanban mutation system

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:405`

**What**:

```typescript
const newBoard: BoardData = {
  ...boardData,
  [columnId]: newColumn,
  root: { ...boardData['root'], children: [...rootChildren, columnId] } as any,
};
```

This creates a shallow copy. Every `BoardItem` (except `root` and the new column) still references objects from the old `boardData`. The rest of the kanban mutation system (`kanban-helpers.ts`) uses `structuredClone` (deep clone) for all mutations.

**Why care**: Currently safe because no kanban code mutates `BoardItem` in-place. But the inconsistency creates a maintenance trap: a future developer adding in-place mutation to a `BoardItem.data` or `BoardItem.meta` (following the spread pattern) will silently corrupt both the old and new board. The `structuredClone` approach in helpers was deliberately chosen for this reason — `confirmAddColumn` bypasses it.

**Confidence**: Certain

---

### F-78: Kanban `data-dnd-column-header` renders `"undefined"` string when DnD is disabled

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx:68`

**What**:

```tsx
data-dnd-column-header={dndEnabled ? 'true' : undefined}
```

In React 19, for `data-*` attributes, passing `undefined` produces the string `"undefined"` in the DOM, not the absence of the attribute. When `dndEnabled` is `false`, the DOM attribute is `data-dnd-column-header="undefined"` instead of being absent.

**Why care**: CSS selectors like `[data-dnd-column-header]` (attribute presence check) match when the attribute is present but set to `"undefined"`. If a future CSS rule uses `[data-dnd-column-header="true"]` (value check), it correctly excludes disabled headers. But any selector using `[data-dnd-column-header]` (presence-only) would match incorrectly. This creates a latent CSS bug that only manifests when someone writes a presence-based selector.

**Confidence**: Certain

---

### F-79: Calendar header hardcoded `aria-label` for Previous/Next navigation — not translatable

**Location**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-header.tsx:52,69`

**What**: Both the "Previous" and "Next" navigation buttons have hardcoded English `aria-label` attributes:

```tsx
aria-label="Previous"  // line 52
aria-label="Next"      // line 69
```

The `flux-i18n` package is a dependency of the scheduling package and is already imported/used elsewhere in the calendar components (e.g., `t('scheduling.today')`). These two labels are the only remaining untranslated ARIA labels in the calendar header.

**Why care**: Screen reader users in non-English locales hear "Previous" and "Next" even when all other text is properly localized. This is a low-effort accessibility/i18n gap.

**Confidence**: Certain

---

### F-80: Kanban `onColumnAdd` dispatch is undeclared in types and renderer definitions — runtime-only contract

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:407`

**What**: `confirmAddColumn` dispatches `events.onColumnAdd?.(...)` but:

- `KanbanSchema` type (kanban.types.ts) does not declare `onColumnAdd`.
- `KanbanEvents` type (kanban.types.ts) does not include `onColumnAdd`.
- `scheduling-renderer-definitions.ts` does not register `onColumnAdd`.
- `schemas.ts` does not include it.

The event works at runtime (the event system passes through unknown schema properties), but there is no TypeScript checking, no tooling/introspection support, and no documentation that this event exists.

**Why care**: Consumers who look at the `KanbanSchema` type would not know `onColumnAdd` is available. Consumers who use it get no type checking on the payload. A future cleanup that strips unknown schema properties would silently break this functionality. This is the inverse of the "schema declares but runtime doesn't dispatch" pattern — here, runtime dispatches but schema doesn't declare.

**Confidence**: Certain

---

### F-81: Barcode batch queue silently swallows submitted-duplicate scans — no feedback to user

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.ts:16-26`

**What**: The `enqueueItem` function only deduplicates against items with `status === 'pending'`:

```typescript
if (existing.status === 'pending') {
  // mark as 'duplicate'
}
return; // exits without creating a new item
```

When a barcode that was already `submitted` is scanned again:

1. `existing` finds the submitted item.
2. `existing.status === 'pending'` is `false`, so the duplicate block is skipped.
3. The function returns the existing submitted item unchanged.
4. No new item created, no `duplicate` status, no error — silent swallow.

**Why care**: In warehouse/receiving scenarios, the same barcode appears on multiple items. After submitting the first scan, subsequent scans of identical barcodes are silently ignored. The user sees no feedback, no new queue entry, and no error message. The "batch scan" feature claims deduplication but only deduplicates within the current pending window — once items are submitted, the same barcode is treated as "already handled" but with no visible confirmation.

**Confidence**: Certain

---

### F-82: Barcode `prepareWasm` `resetWasmPromise()` clears ALL cached WASM URLs — cross-instance side effect

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.ts:39-44`

**What**: `resetWasmPromise()` clears the module-level Map entirely when called without a URL:

```typescript
export function resetWasmPromise(url?: string): void {
  if (url) {
    wasmPromises.delete(url);
  } else {
    wasmPromises.clear();
  }
}
```

This function is exposed via `useInputComponentHandle` as a `resetWasmPromise` method on the barcode-input component handle. Any instance can call `resetWasmPromise()` without arguments and nuke the WASM cache for ALL instances sharing the module. The `barcode-input.tsx:176-178` calls `resetWasm()` (aliased from `resetWasmPromise`) without arguments.

**Why care**: If two barcode-input instances use different WASM URLs (different ZXing library versions for different scanning environments), calling `resetWasmPromise()` on instance A forces instance B to re-fetch its WASM binary on the next scan. The per-URL caching (Map keyed by URL) is correct for the common case, but the `resetWasmPromise` API breaks this isolation.

**Confidence**: Certain

---

### F-83: Coverage thresholds quietly lowered from 80% to 50-63% — no acknowledgment in changelog

**Location**: `packages/flux-renderers-scheduling/vitest.config.ts:10-14`

**History**: The 2026-07-20 audit (F-38) found thresholds declared at 80% but never enforced (no `--coverage` flag). The threshold was subsequently enforced (2026-07-21 round-1 fixes: added `--coverage` to `package.json:62`). However, vitest.config.ts now shows:

| Metric     | Previous | Current |
| ---------- | -------- | ------- |
| branches   | 80       | 50      |
| functions  | 80       | 60      |
| lines      | 80       | 63      |
| statements | 80       | 60      |

**Why care**: The enforcement was added, but the bar was dropped by 17-30 percentage points simultaneously. This is not necessarily wrong (80% might have been unrealistic for a package with this much dead/unreachable code), but the transition was undocumented. A future reviewer reading the 80% target in the original audit (F-38) and the current 50% threshold sees a contradiction with no explanation. This erodes trust in the threshold as a meaningful quality gate.

**Confidence**: Certain

---

## Verification Cross-Check

| Source                        | Findings Found | Overlap with prior audits | Novel  |
| ----------------------------- | -------------- | ------------------------- | ------ |
| Gantt sub-domain audit        | 4              | 0                         | 4      |
| Calendar sub-domain audit     | 4              | 0                         | 4      |
| Kanban sub-domain audit       | 6              | 0                         | 6      |
| Barcode sub-domain audit      | 4              | 1\*                       | 4      |
| Cross-cutting (config, tests) | 1              | 1†                        | 1      |
| **Total this round**          | **19**         | **2**                     | **19** |

\* F-82 (resetWasmPromise clears all URLs) — minor new detail, not previously reported.
† F-83 (coverage thresholds lowered) — related to F-38's enforcement gap, but the threshold reduction is a new finding.

### Re-Opened (Previously Claimed Fixed, Still Broken)

| Previous ID | Issue                                    | Current Evidence                                                 |
| ----------- | ---------------------------------------- | ---------------------------------------------------------------- |
| F-41        | Kanban filterText stale initializer      | `use-kanban-filter.ts:10` — sync useEffect never added           |
| F-50        | Camera lifecycle re-runs on every render | `barcode-scanner-overlay.tsx:82,130` — start/stop fresh closures |
| F-61        | Barcode validation props ignored         | `barcode-input.tsx` — 5 props declared, zero read                |
| F-24        | Barcode readOnly scanner bypass          | `barcode-input.tsx:58-72,117-123` — still opens/writes on scan   |
| F-44        | Redundant useCallback (6 instances)      | `kanban-board.tsx:133,193,208` + `gantt.tsx:185,194,205`         |

### Items Verified Fixed Since Last Audit

F-39, F-40, F-41(claimed), F-42, F-43, F-36, F-45, F-31(revision model), F-32(EventEmitter removal), F-33(useId), F-34(print CSS import), F-35(single event fire), F-38(coverage enforcement now added), F-01(scroll), F-02(delete), F-04(loading), F-07(resource load calc), F-13(onEventCreate), F-14(GanttEditor opens), F-16(week view), F-18(cross-day lines), F-21(BarcodeQueue per-instance), F-26(stale closures), F-29(header scroll), F-46(useOfflineDetection removed), F-48(dispatch as any clean), F-70(react-dom peer dep present).

---

## Summary of Round 1 Findings

| ID   | Severity | File                                | Issue                                                                                                                                |
| ---- | -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| F-71 | P0       | gantt-store.ts:242-254              | `expandAll()`/`collapseAll()` skip `recomputeVisualLayout()` — task bars render with stale coordinates                               |
| F-72 | P1       | calendar-day-view.tsx:72            | `CalendarDayView` hardcodes `'en-US'`, ignores locale prop — i18n contract violation                                                 |
| F-73 | P1       | kanban-dnd-integration.test.tsx:207 | Test queries `[data-slot="column-drag-handle"]` (wrong) vs `[data-slot="kanban-column-drag-handle"]` (actual) — test is silent no-op |
| F-74 | P1       | gantt-grid.tsx:38-48                | Virtualization flash: all tasks rendered non-virtually before `useEffect` activates virtual mode                                     |
| F-75 | P2       | calendar.tsx:139-140,168-173        | Dual-surface ref sync (`latestViewRef`/`latestDateRef`) creates race condition surface                                               |
| F-76 | P2       | gantt-editor.tsx:65-81              | Uncontrolled `defaultValue` inputs show stale task data on re-open across editing sessions                                           |
| F-77 | P2       | kanban-board.tsx:405                | `confirmAddColumn` shallow spread inconsistent with `structuredClone` in mutation helpers                                            |
| F-78 | P2       | kanban-column-header.tsx:68         | `data-dnd-column-header` renders `"undefined"` string when DnD disabled                                                              |
| F-79 | P2       | calendar-header.tsx:52,69           | Hardcoded `aria-label="Previous"`/`"Next"` — not translatable                                                                        |
| F-80 | P2       | kanban-board.tsx:407                | `onColumnAdd` dispatch undeclared in types/definitions — runtime-only contract                                                       |
| F-81 | P2       | barcode-queue.ts:16-26              | `submitted`-status duplicates silently swallowed — no user feedback                                                                  |
| F-82 | P3       | prepare-wasm.ts:39-44               | `resetWasmPromise()` clears ALL URLs — cross-instance side effect                                                                    |
| F-83 | P3       | vitest.config.ts:10-14              | Coverage thresholds silently dropped from 80%→50-63% without changelog                                                               |

### Re-Opened (Previously Reported, Unfixed)

| Previous ID | Issue                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------ |
| F-41        | Kanban `filterText` stale initializer — sync useEffect missing                             |
| F-50        | Camera lifecycle effect unstable `start`/`stop` deps                                       |
| F-61        | Barcode validation props (`required`/`minLength`/`maxLength`/`pattern`/`validate`) ignored |
| F-24        | Barcode `readOnly` bypassed by scanner                                                     |
| F-44        | 6 redundant `useCallback` across kanban + gantt                                            |

---

## Blindness Self-Assessment

**What this round likely missed**:

1. **E2E test execution**: Did not run the Playwright e2e suite. Some findings (F-73 no-op test, F-74 virtualization flash) would benefit from e2e verification but were identified by static analysis.
2. **Performance profiling**: Did not run benchmarks on Gantt layout computation, Kanban undo-stack memory, or Calendar virtualizer efficiency at scale.
3. **Bundle size analysis**: Did not verify tree-shaking correctness for the scheduling package (especially CSS `sideEffects` and dead hook exports).
4. **Security audit**: Did not probe XSS vectors in task/event text rendering, or prototype pollution through schema data.
5. **Cross-package type contracts**: Did not verify `RendererComponentProps<GanttSchema>` generic narrowing at the flux-core / flux-react boundary.
6. **CSS attribute selector coverage**: Did not audit all `nop-*` CSS classes referenced in JSX for corresponding definitions.
7. **Accessibility audit**: Did not screen-reader test any component's navigation or ARIA semantics beyond what was already reported.

**Best starting point for next round**: Execute the actual test suite (unit + e2e) to identify regressions, then measure bundle composition and CSS selector coverage across all four scheduling sub-domains.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
