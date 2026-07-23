> Audit Status: open
> Audit Type: open-ended
> Mission: scheduling

# Open-Ended Adversarial Audit — Scheduling (Round 2, 2026-07-23)

## Pre-Check: Round-01 Fix Verification

Verified current HEAD against all 19 findings from round-01. Multiple critical issues resolved; focus this round shifts to test quality, cross-package contract, and latent API-surface inconsistencies.

### Verified Fixed (12 items)

| Round-01 ID | Issue                                                              | Resolution Evidence                                                                                                                               |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------- |
| F-71        | Gantt `expandAll()`/`collapseAll()` skip `recomputeVisualLayout()` | `gantt-store.ts:245-263` — both now call `recomputeVisualLayout()` + bump `layoutRevision`                                                        |
| F-72        | Calendar DayView hardcodes `'en-US'` locale                        | `calendar-day-view.tsx:36` — now accepts `locale` prop, line 73 uses `locale`                                                                     |
| F-73        | Kanban DnD test wrong selector `[data-slot="column-drag-handle"]`  | `kanban-dnd-integration.test.tsx:207` — now uses `[data-slot="kanban-column-drag-handle"]`                                                        |
| F-76        | GanttEditor `defaultValue` stale across editing sessions           | `gantt-editor.tsx:58` — `key={editingTaskId}` forces remount on task switch                                                                       |
| F-77        | Kanban `confirmAddColumn` shallow spread                           | `kanban-board.tsx:408` — now uses `structuredClone`                                                                                               |
| F-78        | `data-dnd-column-header` renders `"undefined"` string              | `kanban-column-header.tsx:59,84` — uses `dndEnabled                                                                                               |     | undefined` |
| F-79        | Calendar header hardcoded `aria-label`                             | `calendar-header.tsx:52,69` — now uses `t('scheduling.previous')` / `t('scheduling.next')`                                                        |
| F-80        | `onColumnAdd` dispatch undeclared in types/definitions             | `scheduling-renderer-definitions.ts:100` — now registered as `{ key: 'onColumnAdd', kind: 'event' }`                                              |
| F-81        | Barcode queue submitted-duplicates silent swallow                  | `barcode-queue.ts:26-36` — now creates `duplicate` entry for `submitted` items                                                                    |
| F-82        | `resetWasmPromise()` clears ALL URLs                               | `barcode-input.tsx:215-216` — now passes `resolved.wasmUrl`; `prepare-wasm.ts:43` — deletes only `DEFAULT_WASM_URL` when no arg                   |
| F-61        | Barcode validation props ignored                                   | `barcode-input.tsx:110-136` — `validateScanResult` checks `required`/`minLength`/`maxLength`/`pattern`/`validate`, called from `handleScanResult` |
| F-24        | Barcode `readOnly` bypassed by scanner                             | `barcode-input.tsx:60,85,150` — all scan paths now check `resolved.readOnly`                                                                      |

### Previously Reported, Still Unresolved (5 items)

| Previous ID | Issue                                                | Current Evidence                                                                                                                                                                     |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-41        | Kanban `filterText` stale initializer                | `use-kanban-filter.ts:10-14` — sync `useEffect` exists but only provides best-effort sync after first render                                                                         |
| F-50        | Camera lifecycle effect unstable `start`/`stop` deps | `barcode-scanner-overlay.tsx:134` — deps `[open, wasmUrl, stop, start]` still present; `start`/`stop` from `useBarcodeCamera` may be unstable per render                             |
| F-44        | Redundant `useCallback` (6 instances)                | `kanban-board.tsx:136` (setBoardData), `gantt.tsx:190,199,210` (scrollToToday, scrollToTask, handleZoomChange) — none have `eslint-disable react-compiler` annotations               |
| F-47        | Gantt config props captured at mount only            | `gantt.tsx:61` — `useState(() => createInitialStore(resolved))` captures `cellWidth`/`defaultZoom`/`taskBarHeight` at mount; effect at line 81-87 only syncs task/link/resource data |
| F-83        | Coverage thresholds lowered from 80% to 50-63%       | `vitest.config.ts:10-14` — rationale comment added, thresholds remain at reduced levels                                                                                              |

---

## New Findings (Round 2)

### F-84: Gantt `createInitialStore` double-parses all tasks/links on mount — wasteful for large datasets

**Location**: `gantt.tsx:44-49` (in `createInitialStore`) and `gantt.tsx:81-87` (mount effect)

**What**: The Gantt component parses task/link data **twice** on every mount:

1. **`createInitialStore`** (line 44-48): `s.parse(taskData, linkData, resourceData, assignmentData)` is called inside the `useState(() => createInitialStore(resolved))` initializer at line 61. This populates the store with all tasks, links, etc.

2. **Mount effect** (lines 81-87): A second `store.parse(data.tasks ?? [], data.links ?? [], ...)` call guarded by `initCalledRef` to ensure it runs only once.

Both parse the full same dataset from the same `resolved` props. The `initCalledRef` guard prevents infinite re-runs but does not prevent the initial double-parse.

**Why care**: For large Gantt datasets (hundreds to thousands of tasks), `store.parse` calls `flattenTasks` (O(N)), builds the parent index (O(N)), calls `computeLevels`/`computeBranchInfo`/`computeSourceTarget` (O(N) each), and then `recomputeVisualLayout` which calls `computeScaleRangeInternal` (O(N)) and `computeCoordinates` (O(N \* M) for layout) and `computeLinkPolylinesInternal` (O(L)). All of this runs twice on mount. For 1000 tasks with links, this doubles the initial render cost.

**Root cause**: `createInitialStore` was designed to populate the store with parsed data, but the `useEffect` at lines 81-87 was added later (to re-parse when schema changes) without removing the initial parse inside `createInitialStore`. The two mechanisms are redundant.

**Confidence**: Certain

---

### F-85: `gantt-editor.test.tsx` "should render without crashing" is a zero-assertion test — passes regardless of component behavior

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-editor.test.tsx:19-20`

**What**:

```typescript
it('should render without crashing', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttEditor store={store} />);
    expect(container).toBeTruthy();
});
```

`render()` from `@testing-library/react` always returns a `container` that is truthy. If the component threw during rendering, `render()` itself would throw before any assertion executes. The test provides zero regression value.

**Why care**: This test file contains only 4 tests. Having 25% of them be a no-op undermines the file's credibility as a safety net. A future change that silently breaks the GanttEditor would still pass this test.

**Severity**: P2 (test quality)

**Confidence**: Certain

---

### F-86: `gantt-components.test.tsx` "should show tree indent based on $level" — test name promises indent coverage, test body only checks row count

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-components.test.tsx:57-65`

**What**:

```typescript
it('should show tree indent based on $level', () => {
    const store = createStore([
      { id: 'p1', text: 'Parent', start: '2026-01-01', end: '2026-01-10' },
      { id: 'c1', text: 'Child', start: '2026-01-02', end: '2026-01-08', parent: 'p1' },
    ], []);
    const { container } = render(<GanttGrid store={store} />);
    const rows = container.querySelectorAll('[data-slot="gantt-grid-row"]');
    expect(rows.length).toBe(2);
});
```

The test asserts `rows.length === 2` — which proves that the renderer outputs two rows, not that any tree indent is applied. It never checks `style.paddingLeft`, `className`, `aria-level`, or any indentation-related DOM property. A regression that removes tree indent entirely would pass.

**Why care**: The misleading test name creates a false sense of tree-indent coverage. Anyone reviewing test results would believe grid-tree-indentation is tested, when it isn't. This is more dangerous than missing coverage because it actively misleads.

**Severity**: P1 (false positive)

**Confidence**: Certain

---

### F-87: `gantt.test.tsx` loading state test never verifies loading UI — only checks container class that exists in ALL states

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt.test.tsx:71-76`

**What**:

```typescript
it('should render loading state with skeleton when loading prop is set', () => {
  const { container } = render(
    React.createElement(Gantt, {
      ...baseProps,
      props: { loading: true, tasks: [], links: [] } as any,
    }),
  );
  expect(container.querySelector('.nop-gantt')).toBeTruthy();
});
```

The assertion `.nop-gantt` exists — this class is always present on the container regardless of the `loading` state. The test never checks for a `Skeleton`, spinner, or any loading indicator. Same pattern exists in `gantt.integration.test.tsx:75-83`.

**Why care**: If a regression causes the loading state to render a blank div instead of skeletons, both tests pass. The "loading state" is not actually tested — only the steady-state container class is verified. This is a systemic pattern across 2 of the 3 gantt test files.

**Severity**: P2 (test quality — false confidence)

**Confidence**: Certain

---

### F-88: `kanban-renderer.test.tsx` `data-dragging` test exercises DOM API, not component behavior

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-renderer.test.tsx:259-267`

**What**: The test manually calls `cardEl.setAttribute('data-dragging', 'true')` then asserts the attribute is present. This verifies that the browser DOM's `setAttribute`/`removeAttribute` work — which is guaranteed by the platform. It does NOT test that the Kanban component sets or clears `data-dragging` in response to drag interaction.

**Why care**: This is a test that exercises the test setup (mocked DOM), not the component. If the Kanban drag-visual code is completely removed, this test still passes. It provides zero regression protection.

**Severity**: P2 (test quality — false positive)

**Confidence**: Certain

---

### F-89: `kanban-dnd-integration.test.tsx` column reorder test has `if (dragHandle)` guard — silent skip on structural change

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-dnd-integration.test.tsx:202-214`

**What**: The test guards its body with `if (dragHandle)`:

```typescript
it('reorders columns via keyboard', () => {
  const col1 = container.querySelector('[data-column-id="col1"]') as HTMLElement;
  const dragHandle = col1.querySelector('[data-slot="kanban-column-drag-handle"]') as HTMLElement;
  if (dragHandle) {
    fireEvent.keyDown(dragHandle, { key: 'ArrowRight' });
    const columns = container.querySelectorAll('[data-slot="kanban-column"]');
    expect(columns.length).toBe(2); // ← always 2 in fixture, unchanged by reorder
  }
});
```

The `if` guard means a missing drag handle silently skips all assertions. The sole assertion `columns.length === 2` is a tautology — the fixture always has 2 columns, and reordering doesn't change the count. The test never verifies that the column order actually changed.

**Why care**: Currently passes because the selector is now correct (F-73 fix). But the `if` guard provides zero safety margin against future structural changes. If someone renames the drag handle selector, the test silently becomes a no-op.

**Severity**: P2 (test quality — fragile pattern)

**Confidence**: Certain

---

### F-90: Gantt event payloads use non-standard underscore-prefixed property names — undocumented API contract

**Location**: `gantt.tsx:90-94,240-248`

**What**: Several Gantt event dispatches use underscore-prefixed keys in their payload objects, inconsistent with CamelCase conventions used by Kanban and Calendar:

| Event               | Payload Shape                         |
| ------------------- | ------------------------------------- |
| `onTaskDragEnd`     | `{ _taskId, changes }`                |
| `onLinkDragEnd`     | `{ _sourceId, _targetId, _linkType }` |
| `onTaskClick`       | `{ _taskId }`                         |
| `onTaskDoubleClick` | `{ _taskId }`                         |
| `onLinkClick`       | `{ _linkId }`                         |

Compare Kanban's `onCardMove: { cardId, fromColumnId, toColumnId, fromIndex, toIndex }` and Calendar's `onEventChange: { eventId, fromResource, toResource, fromDate, toDate, event }`.

The underscore prefix is unusual for a public API. Nothing in `GanttSchema` types or documentation specifies the payload shape. Consumers must reverse-engineer it from source.

**Why care**: Three problems: (1) no discoverability — `GanttSchema.onTaskClick?: ActionSchema` gives zero info about arguments; (2) inconsistency across scheduling sub-domains; (3) underscore prefix signals "private" but these are the public API.

**Confidence**: Certain

---

## Summary

This round found **7 new issues** (F-84 through F-90). The highest concentration is in **test quality** (5 of 7 findings). One cross-cutting API contract issue (F-90) spans all Gantt event payloads.

### By severity

| Severity | Count | Findings                                    |
| -------- | ----- | ------------------------------------------- |
| P1       | 1     | F-86 (misleading test name, false positive) |
| P2       | 5     | F-85, F-87, F-88, F-89, F-90                |
| P3       | 1     | F-84 (performance, double-parse)            |

### Resolution accounting

| Category                          | Count                            |
| --------------------------------- | -------------------------------- |
| Round-01 items now verified fixed | 12 of 19                         |
| Round-01 items still unresolved   | 5 (F-41, F-44, F-47, F-50, F-83) |
| New findings this round           | 7 (F-84 through F-90)            |

---

## Blindness Self-Assessment

**What this round likely missed**:

1. **Security**: Did not probe XSS vectors through task/event text content, or prototype pollution via schemas.
2. **Accessibility**: Did not screen-reader test any component despite known gaps (Calendar header, Kanban DnD).
3. **E2E**: Did not run the Playwright suite. Several test-quality findings would benefit from e2e cross-checks.
4. **Bundle composition**: Did not analyze chunks for dead CSS or unused exports in `index.ts`.
5. **Performance benchmarking**: Did not profile the Gantt O(N) layout pass or the Kanban undo-stack memory growth at 1000+ snapshots.
6. **Cross-package type narrowing at runtime**: The `scheduling-boundary-narrowing.test.ts` is compile-time only. Actual runtime behavior under dynamic schema input is untested.

**Best starting point for next round**: Execute the full test suite, then focus on a11y and security — the two areas with the highest unexamined risk across all four scheduling sub-domains.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
