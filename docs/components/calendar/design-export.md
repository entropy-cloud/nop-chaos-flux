# Calendar Print/Export Design

> Part of S5 Calendar interactive enhancements.
> Source: `docs/components/calendar/design.md` §12.8

## Purpose

Provide printable calendar layout and image export for physical shift schedules and reporting.

## Print Stylesheet

File: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-print.css`

- `@media print` rules:
  - Hide navigation header, toolbar buttons, scrollbars
  - Full-width calendar grid with no overflow clipping
  - Grayscale colors for events (remove bright interactive colors)
  - Page break after each resource group or every ~50 rows
  - Font size bump for readability on paper
  - Print margins: 0.5in all sides

## PNG Export

- Uses `html2canvas` to capture calendar root element as image
- `component:exportPNG` imperative handle
- Parameters: `{ fileName?: string, scale?: number }`
- Default scale: 2 (Retina quality)
- Download as PNG Blob

## Print Export

- `component:print` imperative handle — calls `window.print()`
- Browser print dialog appears
- Print stylesheet applied automatically via `@media print`

## Implementation

Hook: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts`

```typescript
interface UseCalendarExportResult {
  exportToPrint: () => void;
  exportToPNG: (element?: HTMLElement | null, fileName?: string) => Promise<void>;
}
```

## Error Handling

- `html2canvas` not available: export PNG silently fails (button does nothing)
- Print dialog cancelled by user: no action needed
- Large calendar (300+ resources): print may paginate across multiple pages
