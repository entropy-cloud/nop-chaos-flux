# Dimension 22: Integration Wiring & Operability

## Verified Clean

| Item                                                                             | Component             | Status       |
| -------------------------------------------------------------------------------- | --------------------- | ------------ |
| onTaskClick/onTaskDoubleClick/onLinkClick/onEmptyCellClick/onZoomChange/onScroll | Gantt                 | ALL FIRING   |
| loading/empty regions                                                            | Gantt/Calendar/Kanban | ALL CONSUMED |
| onMount/onUnmount                                                                | Kanban                | FIRING       |
| exportToPrint in useImperativeHandle                                             | Calendar              | WIRED        |
| columnsConfig consumed                                                           | Kanban                | VERIFIED     |
| kanbanOwnership/kanbanStatePath                                                  | Kanban                | CONSUMED     |
| columnDraggable                                                                  | Kanban                | CONSUMED     |
| controlled data sync                                                             | Kanban                | CORRECT      |
| body region                                                                      | Gantt                 | NOT WIRED    |

## Findings

### [D22-04] Calendar 4 events declared but never fire

- **Files**: `scheduling-renderer-definitions.ts:139-144`, `calendar.tsx`
- **Severity**: P2
- **Category**: event
- **Evidence**: `onBatchSchedule`, `onImport`, `onImportError`, `onTimezoneChange` declared with `@reserved` comments. Zero invocation code.
- **Recommendation**: Remove field definitions until implementation is ready.

### [D22-05] Calendar component:importICal/exportToICal not implemented

- **Files**: `scheduling-renderer-definitions.ts:162-163`, `calendar.tsx:181-196`
- **Severity**: P2
- **Category**: reaction
- **Evidence**: Marked `@reserved`. No code path exists.
- **Recommendation**: Remove until implemented or add stub.

### [D22-08] Kanban statusPath declared but never consumed

- **File**: `kanban.types.ts:69`, `scheduling-renderer-definitions.ts:99`
- **Severity**: P3
- **Category**: prop
- **Evidence**: `statusPath` in schema but zero references in `kanban-board.tsx`.
- **Recommendation**: Implement or remove.

### [D22-10] Gantt body region not consumed

- **File**: `schemas.ts:78`, `gantt.tsx`
- **Severity**: P3
- **Category**: region
- **Evidence**: `body` exists in `GanttSchema` but not in field definitions. Not registered or consumed.
- **Recommendation**: Add to field definitions and wire in layout, or remove from schema.

### [D22-11] Calendar resources[].open initial-only; group toggle unwired

- **File**: `calendar.tsx:407-425`
- **Severity**: P2
- **Category**: event
- **Evidence**: `resources[].open` read for initial state. `_handleGroupToggle` defined but never bound to any UI. `onGroupToggle` cannot fire.
- **Recommendation**: Wire toggle UI or remove.

### [D22-13] Calendar exportToPrint name mismatch vs component:print reaction

- **File**: `calendar.tsx:193`, `scheduling-renderer-definitions.ts:159`
- **Severity**: P2
- **Category**: handle
- **Evidence**: Handle method named `exportToPrint` but reaction key is `component:print`. Framework may expect `print`.
- **Recommendation**: Rename or verify framework mapping.

### [D22-14] BarcodeInput onMount/onUnmount kind mismatch

- **File**: `barcode-input/barcode-input-schemas.ts:30-31`
- **Severity**: P3
- **Category**: kind
- **Evidence**: barcode uses `kind: 'event'` for lifecycle hooks; Gantt/Kanban/Calendar all use `kind: 'meta'`.
- **Recommendation**: Change to `kind: 'meta'`.

### [D22-15] Gantt keyboard undo wired to empty undo stack

- **Files**: `gantt.tsx:156-168`, `hooks/use-gantt-keyboard.ts:90-96`, `undo-stack.ts`
- **Severity**: P1
- **Category**: handle/undo
- **Evidence**: Ctrl+Z triggers `undoStackRef.current.undo()` but zero `.push()` calls exist. Silent no-op.
- **Recommendation**: Push commands after every store mutation.

## Summary

| ID     | Finding                                 | Severity |
| ------ | --------------------------------------- | -------- |
| D22-04 | Calendar 4 events not firing            | P2       |
| D22-05 | Calendar iCal reactions not implemented | P2       |
| D22-08 | Kanban statusPath unused                | P3       |
| D22-10 | Gantt body region not consumed          | P3       |
| D22-11 | Calendar resources[].open initial-only  | P2       |
| D22-13 | Calendar exportToPrint name mismatch    | P2       |
| D22-14 | BarcodeInput lifecycle kind mismatch    | P3       |
| D22-15 | Gantt keyboard undo empty stack         | **P1**   |
