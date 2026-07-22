# Calendar iCal Import/Export Design

> Part of S5 Calendar interactive enhancements.
> Source: `docs/components/calendar/design.md` §12.6

## Purpose

Allow schedule import from `.ics` files (email attachments, external system exports) and export to `.ics` for sharing.

## Import Flow

1. User clicks "导入" button in calendar toolbar
2. File picker opens (accept `.ics`)
3. File read via `FileReader` as text
4. Parsed by `ical.js` → `CalendarEvent[]`
5. `onImport` event fires with parsed events
6. On parse error, `onImportError` event fires with error message

## Export Flow

1. User clicks "导出" button in calendar toolbar
2. `CalendarEvent[]` serialized to iCal format via `ical.js`
3. Blob created and downloaded as `calendar-export.ics`

## iCal.js Dependency

- Listed in roadmap cross-cutting table as optional peer dependency
- If `ical.js` is not installed, import/export buttons are disabled with tooltip "请安装 ical.js"
- Detection: try `import('ical.js')` dynamic import; if fails, feature disabled

## Implementation

Hook: `useCalendarICal` (removed 2026-07-22 — marked `@deprecated`, deleted as part of Calendar P2/P3 residual fixes. The `component:importICal` / `component:exportToICal` reactions remain declared in the renderer definition for future wiring.)

```typescript
interface UseCalendarICalResult {
  importFromICal: (file: File) => Promise<void>;
  exportToICal: (events: CalendarEvent[], filename?: string) => Promise<void>;
  isAvailable: boolean;
}
```

- `isAvailable` — reflects whether `ical.js` was successfully loaded
- `importFromICal` — reads file, parses, calls `onImport`
- `exportToICal` — serializes, creates Blob, triggers download

## Error Handling

| Scenario                | User Visible                   |
| ----------------------- | ------------------------------ |
| Malformed `.ics` file   | Toast "导入失败：文件格式错误" |
| `ical.js` not installed | Import/export buttons hidden   |
| Export with 0 events    | Toast "没有可导出的排班数据"   |
