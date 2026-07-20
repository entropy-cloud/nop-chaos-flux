# Gantt Export Design (PDF/PNG/Excel)

> Part of S3 Gantt advanced features.
> Source: `docs/components/gantt/design.md` §12 (S3.5)

## Purpose

Provide PDF, PNG, and Excel export capabilities for the Gantt chart, allowing users to capture the timeline view for reports and share task data in spreadsheet format.

## Export Types

### PDF Export

- `component:exportPdf` imperative handle
- Uses `html2canvas` to capture Gantt root element → render to canvas → `jsPDF` addPage
- Parameters: `{ fileName?: string, scale?: number, orientation?: 'landscape' | 'portrait' }`
- Default scale: 2 (Retina quality), default orientation: landscape
- Captures full timeline width (including overflow), not just visible viewport
- Loading overlay during capture; error toast on failure

### PNG Export

- `component:exportPng` imperative handle
- Uses `html2canvas` → canvas.toBlob → download
- Parameters: `{ fileName?: string, scale?: number }`
- Default scale: 2 (Retina), fallback to 1x for large DOM
- Captures visible viewport by default, full-width optional

### Excel Export

- `component:exportExcel` imperative handle
- Uses `sheetjs` (`xlsx`) to collect visible task data with computed columns
- Parameters: `{ fileName?: string, includeComputed?: boolean }`
- Collects: id, text, start, end, duration, progress, type, predecessors, resources
- Creates workbook with single sheet, auto-width columns, header row styled
- Links exported as source→target strings

## Implementation

File: `packages/flux-renderers-scheduling/src/gantt/components/export-handles.tsx`

```typescript
interface ExportHandles {
  exportPdf: (opts?: ExportOptions) => Promise<void>;
  exportPng: (opts?: ExportOptions) => Promise<void>;
  exportExcel: (opts?: ExportOptions) => Promise<void>;
}
```

Export handles are wired through `useImperativeHandle` on the Gantt component, extending the existing `GanttHandle` interface.

## Error Handling

| Scenario                                     | Behavior                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| html2canvas fails on large DOM (>5000 nodes) | Catch error; show toast "Export failed: DOM too large"; fall back to server export |
| Browser blocks download (no user gesture)    | Queue export on next user gesture; show "Click again to download"                  |
| sheetjs workbook generation fails            | Catch error; show toast "Export failed: data error"; log to console                |

## Dependencies

- `html2canvas` — not yet in package.json, needs to be added
- `jspdf` — not yet in package.json, needs to be added
- `xlsx` (sheetjs) — not yet in package.json, needs to be added

All marked as optional peer/dev dependencies since export is an advanced feature and not all deployments need it.

## Loading States

- During capture: semi-transparent overlay with spinner and "Generating export..."
- Success: toast notification "Export complete"
- Error: toast with error message + retry button
