# Dimension 21: Display & Positioning Correctness

## Fixed Findings (11 of 20 previous)

| Previous ID | Issue                           | Status                             |
| ----------- | ------------------------------- | ---------------------------------- |
| D21-01      | diffInDays local getters        | FIXED: UTC getters used            |
| D21-02      | isWeekend local getDay          | FIXED: getUTCDay()                 |
| D21-03      | Today marker off by one         | FIXED: UTC-midnight construction   |
| D21-04      | pixelToDate precision loss      | FIXED: ms-precision                |
| D21-05      | Gantt missing loading state     | FIXED: skeleton fallback           |
| D21-06      | Gantt empty region              | FIXED: totalTaskCount check        |
| D21-07      | maxConcurrent:0 treated as 4    | FIXED: maps to Infinity            |
| D21-08      | No +N more overflow             | FIXED: overflow chip rendered      |
| D21-12      | Calendar no loading skeleton    | FIXED: skeleton with animate-pulse |
| D21-17      | Gantt cell-grid getDay          | FIXED: getUTCDay()                 |
| D21-18      | Calendar getWeekStartEnd getDay | FIXED: getUTCDay()                 |

## Remaining/New Findings

### [D21-21] Gantt scrollToToday uses raw `new Date()`

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:170-177`
- **Severity**: P2
- **Category**: timezone
- **Evidence**: `const today = new Date()` passed to `dateToPixel`. In negative UTC offsets near midnight, scroll target diverges from today marker.
- **Recommendation**: Construct UTC-midnight: `new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))`.

### [D21-22] Gantt handleBarKeyAction uses local getDate/setDate

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:109-154`
- **Severity**: P1
- **Category**: timezone
- **Evidence**: `newStart.setDate(newStart.getDate() - 1)` on UTC-midnight Date objects. Affects ALL 6 keyboard task date adjustments.
- **Risk**: Direct user-facing data corruption — keyboard edits produce wrong dates for non-UTC users.
- **Recommendation**: Replace with `getUTCDate()`/`setUTCDate()`.

### [D21-23] useGanttDrag uses local getDate/setDate

- **File**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts:106-130`
- **Severity**: P1
- **Category**: timezone
- **Evidence**: `newStart.setDate(newStart.getDate() + dayDelta)` on UTC-midnight dates. All 3 drag modes affected.
- **Risk**: Every mouse-driven drag repositioning corrupts dates for non-UTC users.
- **Recommendation**: Replace with `getUTCDate()`/`setUTCDate()`.

### [D21-24] Calendar handleKeyboardMoveEvent uses local getDate/setDate

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:265-281`
- **Severity**: P1
- **Category**: timezone
- **Evidence**: `newStart.setDate(newStart.getDate() - dayDelta)` on UTC-midnight dates.
- **Risk**: Calendar keyboard event repositioning produces wrong dates in non-UTC timezones.
- **Recommendation**: Replace with `getUTCDate()`/`setUTCDate()`.

### [D21-25] allocateConcurrentWidths ignores maxConcurrent

- **File**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-time-utils.ts:83`
- **Severity**: P2
- **Category**: positioning
- **Evidence**: `_maxConcurrent` parameter accepted as underscore-prefix unused. Week/day views ignore the limit. Month view correctly respects it.
- **Risk**: Users configuring `maxConcurrent` find it works in month but ignored in week/day.
- **Recommendation**: Wire `_maxConcurrent` into allocation logic.

### [D21-26] Cross-day lines averaged cell height

- **File**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:307-327`
- **Severity**: P2
- **Category**: positioning
- **Evidence**: `y: ri * (svgH / displayResources.length)` assumes uniform row height. Currently works (48px default) but fragile.
- **Recommendation**: Derive from actual virtual item `start` positions.

### [D21-27] Redundant empty-state message still present

- **File**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:373-377`
- **Severity**: P3
- **Category**: empty-state
- **Evidence**: Inner "no schedule data" duplicates outer guard in `calendar.tsx`.
- **Recommendation**: Remove inner block.

## CSS Interactive Feedback Selectors — ALL VERIFIED CLEAN

17 selectors across Gantt/Calendar/Kanban CSS files are all present and correct.

## Summary

| ID     | Finding                                                | Severity |
| ------ | ------------------------------------------------------ | -------- |
| D21-21 | Gantt scrollToToday raw new Date()                     | P2       |
| D21-22 | Gantt handleBarKeyAction local getDate/setDate         | **P1**   |
| D21-23 | useGanttDrag local getDate/setDate                     | **P1**   |
| D21-24 | Calendar handleKeyboardMoveEvent local getDate/setDate | **P1**   |
| D21-25 | allocateConcurrentWidths ignores maxConcurrent         | P2       |
| D21-26 | Cross-day lines averaged cell height                   | P2       |
| D21-27 | Redundant empty-state message                          | P3       |
