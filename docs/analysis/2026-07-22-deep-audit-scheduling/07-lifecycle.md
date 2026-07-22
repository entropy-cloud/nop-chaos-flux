# Dimension 07: Lifecycle & Side Effect Ownership

## High Severity

### [D07-01] useBarcodeDetect poll loop deadlock on enabled toggle

- **File**: `barcode-input/hooks/use-barcode-detect.ts:36-125`
- **Severity**: P1
- **Evidence**: `useEffect` with `[]` deps reads `optionsRef.current?.enabled`. If enabled=false at mount, poll never starts. If enabled changes to false, poll continues forever.
- **Recommendation**: Add enabled as direct dep or use key-based remount.

### [D07-02] calendar-month-view useEffect for DOM layout — should be useLayoutEffect

- **File**: `calendar/components/calendar-month-view.tsx:300-305`
- **Severity**: P2
- **Evidence**: `getBoundingClientRect()` + `setSvgPixelDims` in useEffect causes visible flicker on page load/resize.
- **Recommendation**: Replace with `useLayoutEffect` or ResizeObserver.

### [D07-03] useKanbanCollab WebSocket lifecycle race condition

- **File**: `kanban/hooks/use-kanban-collab.ts:87-126`
- **Severity**: P2
- **Evidence**: `connectImpl` uses local AbortController, disconnect sets `abortRef.current`. Race between connect/disconnect effects when deps change.
- **Recommendation**: Fix before re-enabling deprecated hook.

## Medium Severity

### [D07-04] BarcodeScannerOverlay unstable callback props cause effect re-runs

- **File**: `barcode-input/barcode-scanner-overlay.tsx:99-133,158-162`
- **Severity**: P2
- **Evidence**: `onScanError`, `onScan`, `onClose`, `onSubmitForm` in effect deps — all unstable references. Camera stops/restarts on every parent render.
- **Recommendation**: Use ref wrapper pattern for all callback props.

### [D07-05] GanttBars pointer/double-click listeners re-attached on every render

- **File**: `gantt/gantt-bars.tsx:27-59,79-91`
- **Severity**: P2
- **Recommendation**: Ref-wrapper all callbacks.

### [D07-06] useGanttKeyboard re-attaches listener on callback changes

- **File**: `gantt/hooks/use-gantt-keyboard.ts:34-112`
- **Severity**: P2
- **Evidence**: Deps include unstable callbacks. `eslint-disable` on line 110.
- **Recommendation**: Ref-wrapper all callbacks.

### [D07-07] Kanban keyboard undo/redo re-attached on every boardData change

- **File**: `kanban/kanban-board.tsx:237-255`
- **Severity**: P3
- **Recommendation**: Ref-wrapper handleUndo/handleRedo.

### [D07-08] GanttLayout pointer event listener not cleaned on unmount during drag

- **File**: `gantt/gantt-layout.tsx:66-70`
- **Severity**: P3
- **Recommendation**: Reset cursor/user-select in cleanup with safe fallback.

### [D07-09] useBarcodeTorch check deferred to next effect cycle

- **File**: `barcode-input/hooks/use-barcode-torch.ts:21-41`
- **Severity**: P3
- **Recommendation**: Move check to start() after stream ready.

### [D07-10] useKanbanCollab reconnectTimer may fire after unmount

- **File**: `kanban/hooks/use-kanban-collab.ts:52-58,103-126`
- **Severity**: P3
- **Recommendation**: Check signal.aborted in setTimeout callback.

### [D07-11] useCalendarDragCreate long-press timer not cleaned on unmount

- **File**: `calendar/hooks/use-calendar-drag-create.ts:139-146`
- **Severity**: P3
- **Recommendation**: Check mounted state before setting timer.

### [D07-12] BarcodeInputRenderer onMount/onUnmount via [events] dep

- **File**: `barcode-input/barcode-input.tsx:27-32`
- **Severity**: P3
- **Evidence**: Events dep causes re-run on every render. Missing eventsRef pattern.
- **Recommendation**: Use eventsRef pattern like Gantt.

### [D07-13] KanbanBoard DOM attribute effects should be render-time

- **File**: `kanban/kanban-board.tsx:498-520`
- **Severity**: P3
- **Evidence**: Effects use querySelectorAll + setAttribute for drop/drag state. Should be in render.
- **Recommendation**: Move to KanbanColumn/KanbanCard JSX.
