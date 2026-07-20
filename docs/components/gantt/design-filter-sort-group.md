# Gantt Filter/Sort/Group Design

> Part of S3 Gantt advanced features.
> Source: `docs/components/gantt/design.md` §12 (S3.6), `docs/components/gantt/design.md` §11

## Purpose

Provide text filtering, column sorting, and task grouping capabilities for the Gantt grid, following the same patterns established by the Table component (`filterOwnership`/`sortOwnership`).

## Filter

### `filterText` Prop

- Schema field: `filterText: string`
- 300ms debounce on text change
- Matches against task `text`, `type`, and associated resource names
- Case-insensitive substring match
- Custom `filterCard?: (task: GanttTask, text: string) => boolean` override

### Scope Persistence

- `filterOwnership: 'local' | 'controlled' | 'scope'`
- `filterStatePath: string` — scope path for filter state persistence
- When `scope`, filter text persists across re-renders via scope state
- Default `local` — filter resets on unmount

## Sort

### Column-Header Sort

- Click column header to cycle: none → ascending → descending → none
- `aria-sort` attribute updates: `"none"`, `"ascending"`, `"descending"`
- Sort indicator rendered as arrow glyph (▲/▼) next to column label
- Sortable columns controlled by `GanttColumn.sortable` field

### Scope Persistence

- `sortOwnership: 'local' | 'controlled' | 'scope'`
- `sortStatePath: string` — scope path for sort state
- Sort state: `{ field: string; direction: 'asc' | 'desc' | null }`

## Group

### `groupBy` Prop

- Schema field: `groupBy?: string` (field name to group by, e.g., `'type'`, `'resourceId'`)
- Group header rows rendered above each group's task rows
- Group header shows group label + count badge
- Groups are non-nestable (single-level grouping)

### Group Rendering

- Group header row: bold text, distinct background (`bg-gray-100`), sticky
- Collapsible groups (chevron toggle, collapses all tasks in group)
- `groupBy` change resets sort state

## Implementation

File: `packages/flux-renderers-scheduling/src/gantt/components/filter-bar.tsx`

```typescript
interface FilterBarProps {
  columns: GanttColumn[];
  filterText: string;
  onFilterChange: (text: string) => void;
  sortState: { field: string; direction: 'asc' | 'desc' | null };
  onSortChange: (field: string, direction: 'asc' | 'desc' | null) => void;
  groupBy: string | undefined;
  onGroupByChange: (field: string | undefined) => void;
}
```

Filtering/sorting/grouping is applied in `GanttStore.getVisibleTasks()` by chaining: filter → sort → group, producing a `GanttTask[]` with optional group metadata.

## Debounce

- `filterText` changes debounced at 300ms (abort previous filter on rapid changes)
- Sort and group changes apply immediately (no debounce needed)

## Filter Text Input

Rendered in toolbar area (left-aligned search input) when `filterText` is present in schema.
