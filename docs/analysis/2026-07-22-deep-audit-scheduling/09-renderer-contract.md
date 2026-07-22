# Dimension 09: Renderer Contract Compliance

## Scores

| Renderer     | Score | Key Issues                               |
| ------------ | ----- | ---------------------------------------- |
| Gantt        | B     | Ad-hoc context, non-standard store model |
| Kanban       | C     | Missing `void` on 9/11 event calls       |
| Calendar     | A     | Minor non-standard ref pattern           |
| BarcodeInput | A     | Minor eventsRef pattern                  |

## Findings

### [D09-01] Gantt ad-hoc React context (GanttStoreProvider)

- **File**: `gantt/gantt-context.tsx:12-16`
- **Severity**: P2
- **Evidence**: `createContext<GanttStore | null>(null)` — violates AGENTS.md "NEVER create ad-hoc React contexts" mandate. Documented rationale (deeply nested tree).
- **Recommendation**: Accept as documented deviation or refactor to standard Zustand subscription.

### [D09-02] Kanban missing `void` on 9/11 event calls

- **File**: `kanban/kanban-board.tsx:315,328,335,355,364,371,375,384,396,419`
- **Severity**: P2
- **Evidence**: Only 2 of 11 event dispatches use `void` operator. Missing: onCardMove, onColumnReorder, onCardClick, onColumnClick, onCardAdd, onCardRemove, onColumnAdd.
- **Recommendation**: Prepend `void` to all event handler calls.

### [D09-03] Calendar non-standard ref pattern

- **File**: `calendar/calendar.tsx:60`
- **Severity**: P3
- **Evidence**: Uses `props.ref` instead of `forwardRef`. Works in React 19 but inconsistent.
- **Recommendation**: Consider forwardRef for consistency.

### [D09-04] Kanban mount effect uses [events] dep instead of eventsRef

- **File**: `kanban/kanban-board.tsx:167-170`
- **Severity**: P3
- **Recommendation**: Use eventsRef pattern like Gantt/Calendar.

### [D09-05] BarcodeInput mount effect uses [events] dep

- **File**: `barcode-input/barcode-input.tsx:27-32`
- **Severity**: P3
- **Recommendation**: Use eventsRef pattern.
