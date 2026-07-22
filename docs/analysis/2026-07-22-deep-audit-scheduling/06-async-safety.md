# Dimension 06: Async Patterns & Cancellation Safety

## Findings

### [D06-01] useKanbanCollab missing backoff + stale callback closure

- **File**: `kanban/hooks/use-kanban-collab.ts:34,46,56-58,95-101`
- **Severity**: P1
- **Evidence**: Fixed 3s reconnect timer with no backoff/jitter/cap. Stale `onMessage` closure on socket when callback changes. Timer not guarded against unmount.
- **Recommendation**: Implement exponential backoff, abort old socket on effect deps change.

### [D06-02] scheduler-config unreferenced timeout promise leak

- **File**: `gantt/components/scheduler-config.tsx:41-43`
- **Severity**: P2
- **Evidence**: `Promise.race` with 30s timeout — no `clearTimeout` on success path. Timer callback fires rejection on settled promise.
- **Recommendation**: Replace with timer-clear pattern.

### [D06-03] useBarcodeDetect race window in poll loop

- **File**: `barcode-input/hooks/use-barcode-detect.ts:99-106`
- **Severity**: P2
- **Evidence**: Race between `signal.aborted` check and `setTimeout` assignment in poll loop. Timer can fire after cleanup.
- **Recommendation**: Guard setTimeout with ref check.

### [D06-04] useBarcodeTorch error swallowed

- **File**: `barcode-input/hooks/use-barcode-torch.ts:36-38,56-59`
- **Severity**: P3
- **Evidence**: Empty catch in capability detection, error surfaced only via console.error.
- **Recommendation**: Extract error message at minimum.

### [D06-05] Dead `|| 'Unknown error'` fallback

- **Files**: `gantt-compact.tsx:56`, `kanban-export.ts:57`
- **Severity**: P3
- **Evidence**: `String(err) || 'Unknown error'` — String(err) always truthy.
- **Recommendation**: Remove dead fallback.

### [D06-06] scanNow camera-check error not surfaced

- **File**: `barcode-input/barcode-input.tsx:153-161`
- **Severity**: P3
- **Evidence**: Camera check error logged but not returned to caller.
- **Recommendation**: Propagate error in return value.

### [D06-07] useGanttDrag stale DOM element reference

- **File**: `gantt/hooks/use-gantt-drag.ts:77,158-160`
- **Severity**: P3
- **Evidence**: Captured `originalBar` DOM element may be detached after re-render.
- **Recommendation**: Use data-task-id query selector.

### [D06-08] useBarcodeCamera state update after unmount

- **File**: `barcode-input/hooks/use-barcode-camera.ts:40,82-85`
- **Severity**: P3
- **Evidence**: `setState` in `stop()` can fire after unmount.
- **Recommendation**: Add mountedRef guard in stop().
