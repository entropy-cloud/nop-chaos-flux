# Calendar Batch Scheduling Design

> Part of S5 Calendar interactive enhancements.
> Source: `docs/components/calendar/design.md` §12.5

## Purpose

Allow schedule managers to assign shift types to multiple resources over a date range in one operation instead of editing each cell individually.

## UI Flow

1. **Date Range Selector**: Start date + End date pickers (native date inputs)
2. **Resource Multi-Select**: Checkbox list of all resources; "Select All" / "Deselect All" toggles
3. **Shift Type Picker**: Radio group of configured shift types (早班/中班/晚班/休假 or custom types from schema)
4. **Preview Grid**: Shows selected resources × dates matrix with chosen shift type color fill
   - Existing events shown in their original colors
   - Conflict cells (existing event) shown with red overlay + warning icon
   - "此单元格已有排班" tooltip on hover
5. **Confirm Button**: Applies batch: creates events for each (resource, date) cell via `onBatchSchedule` event
   - Cells with conflicts are skipped (preserve existing data)
   - Summary shown: "将创建 N 条排班，跳过 M 条冲突"

## Constraints

- Max 100 cells per batch: if dateRange × resourceCount > 100, show warning "批量操作最多支持 100 个单元格" and require narrower selection
- Cannot batch across different resource groups (resources must all be at same hierarchy level)
- Conflicts are never overwritten; user must resolve conflicts individually

## Schema Integration

New CalendarSchema fields:

- `batchScheduling?: boolean` — show batch scheduling button (default false)

New events:

- `onBatchSchedule: ActionSchema` — fires with payload `{ resources: string[], dateRange: { start: string, end: string }, shiftType: string }`

## Implementation

Component: `CalendarBatchScheduler` (removed 2026-07-22 — marked `@deprecated`, deleted as part of Calendar P2/P3 residual fixes. The `onBatchSchedule` event remains declared in the renderer definition for future wiring.)

- Renders inside a modal/popover triggered from calendar toolbar
- Uses native `<input type="date">` for date range
- Uses checkbox list for resource selection
- Uses radio buttons for shift type
- Preview grid renders inline with simple CSS grid
- Confirm button disabled when no resources, no dates, or no shift type selected
