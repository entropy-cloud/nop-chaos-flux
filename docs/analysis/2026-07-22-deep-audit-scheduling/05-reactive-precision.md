# Dimension 05: Reactive Subscription Precision

## Findings

### [D05-01] Calendar useScopeSelector without explicit paths

- **File**: `calendar.tsx:105-111,113-119`
- **Severity**: P2
- **Evidence**: Two `useScopeSelector` calls for scope view/date without `paths` option. Subscribes to full scope changes.
- **Recommendation**: Add `paths: [viewStatePath]` and `paths: [dateStatePath]`.

### [D05-02] Kanban useScopeSelector without explicit paths

- **File**: `kanban-board.tsx:80-89,91-100`
- **Severity**: P2
- **Evidence**: Two `useScopeSelector` calls for board data/collapsed state without `paths` option.
- **Recommendation**: Add `paths: [kanbanStatePath]` and `paths: [collapsedStatePath]`.

### [D05-03] GanttTimeScale unnecessary useGanttTreeSnapshot()

- **File**: `gantt-timescale.tsx:11-13`
- **Severity**: P3
- **Evidence**: Subscribes to tree snapshot (expand/collapse) but time scale only needs layout data.
- **Recommendation**: Remove `useGanttTreeSnapshot()`.

### [D05-04] BarcodeScannerOverlay useSyncExternalStore with unstable snapshot

- **File**: `barcode-scanner-overlay.tsx:52-54`
- **Severity**: P3
- **Evidence**: `getAllItems` returns new array reference on every store change. Non-hot path.
- **Recommendation**: Accept current behavior.

### [D05-05] Gantt inline columnRegions object on every render

- **File**: `gantt.tsx:272-274`
- **Severity**: P3
- **Evidence**: `Object.fromEntries(columnNames.map(...))` creates new object every render.
- **Recommendation**: Memoize if grid performance becomes concern.

### [D05-06] BaselineBars not memoized

- **File**: `gantt.tsx:320-322`
- **Severity**: P3
- **Evidence**: Multiple BaselineBars instances in .map() with no memo.
- **Recommendation**: Wrap in React.memo.
