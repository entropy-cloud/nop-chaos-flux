# Dimension 03: API Surface & Contract Consistency

## Findings

### [D03-01] Calendar reaction `component:` key mismatch — all 4 reactions unreachable

- **File**: `scheduling-renderer-definitions.ts:159-163` vs `schemas.ts:144-147`
- **Severity**: P1
- **Evidence**: Definition keys use `component:print`, `component:exportPNG`, `component:importICal`, `component:exportToICal`. CalendarSchema has `print`, `exportPNG`, `importICal`, `exportToICal` (no prefix). Compiler's `classifyField()` matches field key exactly — `print` never matches `component:print`. All 4 calendar reactions are dead code.
- **Recommendation**: Drop `component:` prefix from definition keys to match CalendarSchema property names.

### [D03-02] BarcodeInput lifecycle hooks use `kind: 'event'` instead of `kind: 'meta'`

- **File**: `barcode-input/barcode-input-schemas.ts:30-31`
- **Severity**: P2
- **Evidence**: Gantt/Kanban/Calendar all use `kind: 'meta'` for onMount/onUnmount. Barcode only uses `kind: 'event'`.
- **Recommendation**: Change to `kind: 'meta'`.

### [D03-03] GanttSchema `body?: SchemaInput` — orphan property

- **File**: `schemas.ts:78`
- **Severity**: P3
- **Evidence**: Declared in schema but not in field definitions. No consumption in gantt.tsx.
- **Recommendation**: Remove from GanttSchema or add field definition + wire.

### [D03-04] KanbanSchema `wipStrict` — orphan property

- **File**: `schemas.ts:56`
- **Severity**: P3
- **Evidence**: Declared but no field definition. Not consumed in kanban-board.tsx.
- **Recommendation**: Wire or remove.

### [D03-05] Deprecated GanttTask/GanttLink — dead code

- **File**: `schemas.ts:5-27`
- **Severity**: P3
- **Evidence**: Not re-exported from package root. Not consumed internally.
- **Recommendation**: Remove.

### [D03-06] KanbanEvents — redundant public export

- **File**: `kanban.types.ts:33-40`, `index.ts:9`
- **Severity**: P3
- **Evidence**: Duplicates KanbanSchema event properties.
- **Recommendation**: Remove from barrel.

### [D03-07] BoardData/BoardItem internal state types exposed publicly

- **File**: `index.ts:12-13`
- **Severity**: P3
- **Evidence**: Internal representation types exported in public API.
- **Recommendation**: Review if external consumers need these.

### [D03-08] Scheduling types missing from quick-reference.md

- **File**: `docs/references/quick-reference.md`
- **Severity**: P3
- **Evidence**: No scheduling schema types or package in directory map.
- **Recommendation**: Add scheduling package entry.

### [D03-09] Reaction naming convention inconsistent

- **File**: `scheduling-renderer-definitions.ts:58-61` vs `:159-163`
- **Severity**: P3
- **Evidence**: Gantt uses short keys (zoomIn, zoomOut). Calendar uses `component:` prefix.
- **Recommendation**: Standardize on short unprefixed keys.
