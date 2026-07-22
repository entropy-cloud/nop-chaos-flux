# Dimension 23: Test Effectiveness & False Green

## Overall Status: SUBSTANTIALLY RESOLVED

8 of 10 specified dimensions fully resolved. 2 findings in "partially addressed/acceptable" state (standard container/hook separation).

## Detailed Assessment

### [D23-01] Gantt hook mocking (container test) — ACCEPTABLE

- **File**: `gantt.test.tsx:6-35`
- **Severity**: P3 (acceptable pattern)
- **Category**: boundary-mock
- **Evidence**: 5 hooks mocked at module level (flux-react, drag, link-draw, scroll, keyboard). BUT sub-components (GanttHeader, GanttGrid, GanttBars, etc.) are tested as real in `gantt-components.test.tsx`. Standard container/hook separation pattern.
- **Recommendation**: No action required.

### [D23-02] Calendar hook mocking (container test) — ACCEPTABLE

- **File**: `calendar.test.tsx:6-89`
- **Severity**: P3 (acceptable pattern)
- **Category**: boundary-mock
- **Evidence**: 8 hooks mocked. But view sub-components tested real in separate files. Same pattern as Gantt.
- **Recommendation**: No action required.

### [D23-03] Barcode hardware hooks mocked — ACCEPTABLE

- **File**: `barcode-scanner-overlay.test.tsx`
- **Severity**: P3 (acceptable pattern)
- **Category**: boundary-mock
- **Evidence**: Camera, detect, torch hooks necessarily mocked (require hardware). Rest of component tested real.
- **Recommendation**: No action required.

### [D23-04] Gantt visual-states test — RESOLVED

- File `gantt-visual-states.test.tsx` no longer exists. **CLOSED.**

### [D23-05] Gantt editor test — RESOLVED

- `gantt-editor.test.tsx` imports real components, tests DOM output with real store. **CLOSED.**

### [D23-06] Kanban DnD integration test — RESOLVED

- No DnD adapter mocks. Keyboard DnD tests exercise real behavior. **CLOSED.**

### [D23-07] Dead code tests — RESOLVED

- CalendarResourceGroup, CalendarResourceHeader, KanbanWipBadge source+test files removed. useKanbanCollab has no test. **CLOSED.**

### [D23-08] Timezone-sensitive date tests — RESOLVED

- **File**: `gantt/utils/date.test.ts`
- All assertions use UTC getters exclusively. TZ env robustness test covers 3 timezones. **CLOSED.**

### [D23-09] Calendar getMonthStartEnd test — Previously P3

- Now has proper seconds/milliseconds assertion. **CLOSED.**

### [D23-10] useKanbanCollab test — RESOLVED

- No test exists (source is dead code). **CLOSED.**

### [D23-11] Zero-assertion tests — RESOLVED

- `use-kanban-column-resize.test.ts`: All 11 tests have meaningful assertions. **CLOSED.**

### [D23-12] CalendarEventBlock mocked in view tests — RESOLVED

- Month/week/day view tests use real `CalendarEventBlock`. **CLOSED.**

### [D23-13] Misleading test title — RESOLVED

- Test titles in `use-gantt-keyboard.test.ts` correctly describe assertions. **CLOSED.**

### [D23-14] Keyboard interaction tests — RESOLVED

- `gantt-interactions.test.ts` no longer contains store-level test duplication. **CLOSED.**

### [D23-15] Calendar navigation tests assert "called with" — RESOLVED

- `use-calendar-navigation.test.ts` asserts actual date offsets. **CLOSED.**

## Summary

| ID     | Finding                       | Severity | Status     |
| ------ | ----------------------------- | -------- | ---------- |
| D23-01 | Gantt hook mocking            | P3       | Acceptable |
| D23-02 | Calendar hook mocking         | P3       | Acceptable |
| D23-03 | Barcode hardware hooks mocked | P3       | Acceptable |
| D23-04 | Gantt visual-states test      | N/A      | RESOLVED   |
| D23-05 | Gantt editor test             | N/A      | RESOLVED   |
| D23-06 | Kanban DnD integration test   | N/A      | RESOLVED   |
| D23-07 | Dead code tests               | N/A      | RESOLVED   |
| D23-08 | Timezone-sensitive tests      | N/A      | RESOLVED   |
| D23-09 | getMonthStartEnd test         | N/A      | RESOLVED   |
| D23-10 | useKanbanCollab test          | N/A      | RESOLVED   |
| D23-11 | Zero-assertion tests          | N/A      | RESOLVED   |
| D23-12 | CalendarEventBlock mocked     | N/A      | RESOLVED   |
| D23-13 | Misleading test title         | N/A      | RESOLVED   |
| D23-14 | Keyboard interaction tests    | N/A      | RESOLVED   |
| D23-15 | Calendar nav tests            | N/A      | RESOLVED   |
