# S5 — Calendar Interactive (Drag, Groups, Batch, Import/Export)

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/components/calendar/design.md` (§12.1–§12.4), `docs/components/roadmap-scheduling.md` (S5, S10.2), Rule 8 obligation for S10.2 playground page
> Related: `docs/plans/2026-07-20-0800-3-s4-calendar-core-plan.md` (prerequisite), `docs/components/roadmap-scheduling.md` (S4 done, S5 proposed)

## Purpose

Add interactive features to the Calendar read-only core — drag to swap/create shifts, resource group expand/collapse, cross-day visual connectors, batch scheduling, iCal import/export, timezone selector, and print/export styles. Also create the S10.2 Calendar playground test page (deferred obligation from S4 per roadmap Rule 8). After this plan, Calendar reaches interactive v2 per design doc phasing, usable for shift swapping and schedule management.

## Current Baseline

- S4 completed: Calendar read-only core with month/week/day views, event positioning, multi-day splitting, conflict detection, row-level virtual scrolling (48px fixed rows), eventTemplate region — all tested (176 tests)
- `src/calendar/calendar.tsx`, `calendar.types.ts`, and all view components/hooks/utils exist and are wired
- `scheduling-renderer-definitions.ts` has Calendar registered with proper fields
- Design doc §12 defines v2 scope: drag interactions, resource grouping, cross-day connectors
- S10.2 (Calendar playground page) is `proposed` — S4 completed without creating it, this plan addresses the gap
- `docs/components/roadmap-scheduling.md` S5 phase is `proposed`
- Calendar design doc v2 features (§12.1–§12.4) have design sketches but no standalone design docs; S5.5 batch scheduling and S5.6/S5.7/S5.8 import/export/timezone/print need new design work

## Goals

- Implement drag to swap shifts: pointerdown select event, drag to target date/resource cell, confirmation popup, event update + `onEventChange` event (S5.1)
- Implement drag to create events: long-press/click-drag on empty cell, shift type selector, new event creation (S5.2)
- Implement resource group expand/collapse: nested `resources[].resources` hierarchy, row grouping, `open` state scope persistence (S5.3)
- Implement cross-day visual connectors: SVG/CSS arc lines between split event blocks, hover highlight (S5.4)
- Implement batch scheduling: select date range + resource range, batch set shift type, preview + confirm (S5.5)
- Implement iCal import/export: `.ics` file parsing via `ical.js`, `onImport` event, `exportToICal` imperative handle (S5.6)
- Implement timezone selector: `timezoneSelector` prop, `Intl.DateTimeFormat` display, Temporal API `ZonedDateTime` conversion where available (S5.7)
- Implement print/export styles: `@media print` stylesheet, PDF/PNG export imperative handles (S5.8)
- Implement default visual design for interactive states: loading, empty, drag ghost, hover, navigation animation (S5.9)
- Create S10.2 Calendar playground test page (roadmap Rule 8 obligation)
- All interactions covered by focused unit and integration tests

## Non-Goals

- No drag interactions that modify the Gantt component (Calendar-only)
- No server-side calendar sync or WebSocket real-time updates
- No full calendar CRUD API (import/export is file-based only; create/update/delete flow through schema events)
- No S4-level re-architecture of existing month/week/day view components (they remain as-is, enhanced only for interactivity)
- No `flux-guide/` design pattern updates (separate doc follow-up)

## Scope

### In Scope

- `src/calendar/hooks/use-calendar-drag.ts` — Drag to swap shifts (S5.1)
- `src/calendar/hooks/use-calendar-drag-create.ts` — Drag to create events (S5.2)
- `src/calendar/components/calendar-resource-group.tsx` — Resource group expand/collapse (S5.3)
- `src/calendar/utils/calendar-cross-day-lines.ts` — Cross-day visual connectors (S5.4)
- `src/calendar/components/calendar-batch-scheduler.tsx` — Batch scheduling UI (S5.5)
- `src/calendar/hooks/use-calendar-ical.ts` — iCal import/export (S5.6)
- `src/calendar/components/calendar-timezone-selector.tsx` — Timezone selector component (S5.7)
- `src/calendar/utils/calendar-print.css` — Print stylesheet (S5.8)
- `src/calendar/hooks/use-calendar-export.ts` — PDF/PNG export handles (S5.8)
- `src/styles.css` — Visual design additions for interactive states (S5.9)
- Update `src/schemas.ts` — add Calendar interactive fields to schema
- Update `src/scheduling-renderer-definitions.ts` — add new events and imperative handles
- New design docs: `docs/components/calendar/design-batch-scheduling.md`, `docs/components/calendar/design-ical.md`, `docs/components/calendar/design-export.md` (for S5.5/S5.6/S5.8 that currently have no dedicated design)
- `apps/playground/src/pages/calendar-demo.tsx` — Calendar test page (S10.2)
- Update `docs/components/roadmap-scheduling.md` S5 phase status, S10.2 status

### Out Of Scope

- Calendar S4 core rework (existing month/week/day views are stable)
- Real-time multi-user sync (would require WebSocket infrastructure)
- Calendar subscription URL parsing (RFC 5545 iCal subscription — file import/export only)
- Server-side PDF generation (client-side html2canvas only)

## Failure Paths

| Scenario                  | Trigger                                   | Behavior                                                     | Retry | User Visible                          |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------ | ----- | ------------------------------------- |
| iCal file parse failure   | Malformed `.ics` file                     | `onImportError` event with error message                     | Yes   | Toast "导入失败：文件格式错误"        |
| Drag target out of bounds | Drop outside calendar grid                | Cancel drag, no event change                                 | No    | Event snaps back to original position |
| Timezone unsupported      | User selects unsupported zone             | Fall back to UTC display with console warning                | No    | Calendar shows UTC times              |
| Batch overlap             | Batch schedule creates conflicting events | Preview shows conflict warnings in red                       | Yes   | Conflict markers in preview           |
| Missing `ical.js`         | Library not installed                     | iCal features disabled, console error, graceful fallback     | No    | Import/export buttons hidden          |
| Print large data          | 300 resources × 31 days                   | CSS `page-break` handles pagination; performance may degrade | No    | Multi-page print output               |

## Test Strategy

档位选择：`建议有测`

本档选择：建议有测 — 拖拽交互（交换/创建）和跨日连接线是核心交互路径，需写 interactions tests。iCal 解析、批量排班逻辑是算法路径，应写 unit tests。导出/打印/时区属于增强功能，优先 smoke test。

## Execution Plan

### Phase 1 — Drag Interactions (Swap Shifts, Create Events)

Status: planned
Targets: `use-calendar-drag.ts`, `use-calendar-drag-create.ts`

- Item Types: `Fix | Proof`

- [ ] `Fix`: Create `useCalendarDrag` hook for shift swapping:
  - pointerdown on existing event → start drag
  - Drag ghost: semi-transparent event block follows pointer
  - Drop zone detection: hovered cell (resourceId + date) highlighted
  - Drop confirmation: simple popup "将 {event.title} 移到 {targetDate} {targetResource}?"
  - On confirm: update event start/end via `onEventChange`
  - On cancel: revert to original position
  - Escape key cancels drag
  - Fires `onEventChange` with `{ eventId, fromResource, toResource, fromDate, toDate }`
- [ ] `Fix`: Create `useCalendarDragCreate` hook:
  - Long-press (500ms) or pointerdown+drag on empty calendar cell
  - Visual feedback: cell highlight expands as pointer moves
  - On release: show shift type selector popup (早班/中班/晚班/休假 or custom types from schema)
  - On confirm: create new event at selected position via `onEventChange`
  - Fires `onEventCreate` event
- [ ] `Fix`: Wire drag hooks into `calendar.tsx` — integrate with existing month/week/day view controllers
- [ ] `Proof`: Write integration tests for:
  - Drag swap: event moves to correct target date/resource
  - Drag swap: cancellation reverts to original position
  - Drag create: long-press creates event at correct position
  - Drag create: shift type selector appears and creates correct type
  - Escape key cancels both drag modes

Exit Criteria:

- [ ] Drag to swap shifts commits event update on confirm
- [ ] Drag to create events produces new event at correct grid position
- [ ] Both drag modes support Escape cancellation
- [ ] Integration tests pass (`pnpm --filter @nop-chaos/flux-renderers-scheduling test`)

### Phase 2 — Resource Groups And Cross-Day Connectors

Status: planned
Targets: `calendar-resource-group.tsx`, `calendar-cross-day-lines.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] `Decision`: Resource group expand/collapse interaction model:
  - Nested `resources[].resources` hierarchy (max 2 levels for v2)
  - Group row header shows group name + expand/collapse chevron
  - `open` state persisted via `statusPath` scope path
  - When collapsed, child resources hidden; parent group shows aggregated event count
  - `onGroupToggle` event fires on expand/collapse
- [ ] `Fix`: Create `calendar-resource-group.tsx`:
  - Renders nested resource rows with indentation
  - Group header row: name, collapse chevron, sub-resource count
  - Expand/collapse updates resource visibility in parent `CalendarState`
  - Works with virtual scrolling: group header = virtual row, child resources = sub-rows
- [ ] `Fix`: Create `calendar-cross-day-lines.ts` (utils):
  - For split multi-day events (identified by `eventId` + `is-split`), render SVG arc line connecting adjacent day blocks
  - Arc: `<path>` with quadratic bezier curve between day-block centers
  - Hover: highlight the entire multi-day event chain
  - Configurable via `showCrossDayLines` prop (default true)
- [ ] `Fix`: Wire resource grouping into `calendar-month-view.tsx` — support nested resource rows
- [ ] `Fix`: Wire cross-day lines into `calendar-month-view.tsx` — render SVG overlay on month matrix
- [ ] `Proof`: Write integration tests for:
  - Group expand/collapse toggles child resource visibility
  - Cross-day SVG lines appear between split event blocks
  - Hover on any split block highlights the full event chain

Exit Criteria:

- [ ] Resource group collapse hides child rows, expand shows them
- [ ] Group state persists through view switches (scope path)
- [ ] Cross-day connectors render between split multi-day event blocks
- [ ] Hover on connector highlights full event chain
- [ ] Integration tests pass (`pnpm --filter @nop-chaos/flux-renderers-scheduling test`)

### Phase 3 — Batch Scheduling, iCal Import/Export

Status: planned
Targets: `calendar-batch-scheduler.tsx`, `use-calendar-ical.ts`, design docs

- Item Types: `Fix | Decision | Proof`

- [ ] `Decision`: iCal library — adopt `ical.js` (already listed in roadmap cross-cutting table). Handle `ical.js` as optional peer dependency: if missing, import/export buttons disabled with tooltip "请安装 ical.js".
- [ ] `Fix`: Create design docs for batch scheduling, iCal, and export:
  - `docs/components/calendar/design-batch-scheduling.md` — UI flow: date range selector + resource multi-select + shift type picker + preview grid + confirm
  - `docs/components/calendar/design-ical.md` — import: file picker → `ical.js` parse → `onImport` event with `CalendarEvent[]`; export: `CalendarEvent[]` → `ical.js` serialize → download `.ics`
  - `docs/components/calendar/design-export.md` — print stylesheet (`@media print`), PDF via `window.print()`, PNG via html2canvas; imperative handles: `component:print`, `component:exportPNG`
- [ ] `Fix`: Create `calendar-batch-scheduler.tsx`:
  - Date range selector (start date + end date)
  - Resource multi-select (checkboxes from resource list)
  - Shift type picker (dropdown/radio from configured types)
  - Preview grid: shows selected resources × dates with chosen shift type color
  - "确认" button applies batch: creates events for each (resource, date) cell
  - Conflict detection: cells with existing events shown in red in preview
  - Fires `onBatchSchedule` event
- [ ] `Fix`: Create `useCalendarICal` hook:
  - `importFromICal(file: File)`: reads file → `ical.js` parse → `CalendarEvent[]` → `onImport` event
  - `exportToICal(events, filename)`: `CalendarEvent[]` → `ical.js` serialize → Blob download
  - Error handling: malformed file → `onImportError` event
- [ ] `Fix`: Wire batch scheduler and iCal into calendar main component as optional features
- [ ] `Proof`: Write unit tests for:
  - Batch scheduling: correct (resource, date) pairs generated for given range
  - iCal parse: valid `.ics` produces correct `CalendarEvent[]`
  - iCal serialize: `CalendarEvent[]` → valid `.ics` string (round-trip)
  - Conflict detection in batch preview

Exit Criteria:

- [ ] Batch scheduler creates events for correct date × resource cells
- [ ] Batch preview highlights conflicts
- [ ] iCal import parses `.ics` to `CalendarEvent[]` correctly
- [ ] iCal export produces valid `.ics` download
- [ ] If `ical.js` is missing, import/export buttons gracefully disabled
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && pnpm test` passes

### Phase 4 — Timezone, Print/Export, Visual Design, Playground

Status: planned
Targets: `calendar-timezone-selector.tsx`, `calendar-print.css`, `use-calendar-export.ts`, `src/styles.css`, `apps/playground/src/pages/calendar-demo.tsx`

- Item Types: `Fix | Proof | Follow-up`

- [ ] `Fix`: Create `calendar-timezone-selector.tsx`:
  - Dropdown with common timezones (generated via `Intl.supportedValuesOf('timeZone')`)
  - Applies timezone offset to displayed event times
  - Uses `Intl.DateTimeFormat` for localized formatting
  - Where Temporal API ZonedDateTime is available (modern browsers), use for conversion; fall back to manual offset calculation
  - Fires `onTimezoneChange` event
- [ ] `Fix`: Create `calendar-print.css`:
  - `@media print` styles: hide navigation/controls, full-width calendar grid
  - Print-friendly colors (remove interactive colors, use gray tones)
  - Page break: after each resource group or every ~50 rows
- [ ] `Fix`: Create `useCalendarExport` hook:
  - `exportToPrint()`: `window.print()` (triggers browser print dialog)
  - `exportToPNG()`: html2canvas screenshot of calendar root element → Blob download
  - Both wired as imperative handles: `component:print`, `component:exportPNG`
- [ ] `Fix`: Visual design additions in `src/styles.css` (S5.9):
  - Drag ghost: semi-transparent event block with shadow for swap/create
  - Drag-over cell highlight: outline `2px dashed #3b82f6`
  - Navigation animation: month/week/day switch slide/fade transition 250ms ease
  - Hover: grid cell hover outline + brightness adjustment
  - Loading skeleton: row height 48px × 7 column pulse animation
  - Empty state: "暂无排班数据" centered
  - Cross-day connector line styles (stroke, stroke-width, hover highlight)
- [ ] `Fix`: Update `src/schemas.ts` — add interactive Calendar fields: `showCrossDayLines`, `timezoneSelector`, `resources[].resources` (nested), `resources[].open`, `batchScheduling`, `onEventCreate`, `onEventChange`, `onBatchSchedule`, `onImport`, `onImportError`, `onTimezoneChange`, `onGroupToggle`
- [ ] `Fix`: Update `src/scheduling-renderer-definitions.ts` — add new events and imperative handles (`component:print`, `component:exportPNG`, `component:importICal`, `component:exportToICal`)
- [ ] `Fix`: Create `apps/playground/src/pages/calendar-demo.tsx`:
  - Schema-driven `calendar` renderer with 10+ resources and events across 2 months
  - View switch (month/week/day), date navigation
  - Interactive demo: drag swap shift, drag create event, batch schedule, iCal import/export buttons
  - Register to playground domain route `scheduling-calendar`
  - Add navigation card to `home-page.tsx`
- [ ] `Proof`: Write integration tests for:
  - Timezone selector changes event display times
  - Print stylesheet doesn't break layout
  - Export PNG trigger (mock html2canvas)
  - Calendar playground page renders without errors
- [ ] `Follow-up`: Update `docs/components/roadmap-scheduling.md` — S5 phase to `done`, S10.2 to `done`
- [ ] `Follow-up`: Update `docs/logs/2026/07-20.md` with S5 completion summary

Exit Criteria:

- [ ] Timezone selector changes displayed event times correctly
- [ ] Print styles render clean calendar layout
- [ ] Export PNG creates downloadable file (mocked in test)
- [ ] New schema fields and events registered in definitions
- [ ] Calendar playground page (S10.2) renders with interaction demos
- [ ] `roadmap-scheduling.md` S5 items show `done` status

## Draft Review Record

> Final review pass by independent sub-agent (ses_08095af0dffeI4jYABFUJlciLK). All references verified against live repo.

- Reviewer / Agent: fresh sub-agent (ses_08095af0dffeI4jYABFUJlciLK)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: Removed redundant full-repo verification (`pnpm typecheck && pnpm build && pnpm test`) from Phase 4 Exit Criteria per Minimum Rule 18 (full checks belong in Closure Gates only). One minor issue remains: the `src/` path convention is package-relative (implicitly `packages/flux-renderers-scheduling/`); document-level path disambiguation could be clearer but is not blocking.

## Closure Gates

- [ ] Drag swap shifts: event moves to correct target date/resource on confirm
- [ ] Drag create events: long-press creates correct event type at correct position
- [ ] Resource group expand/collapse: nested resources show/hide correctly, state persists
- [ ] Cross-day connectors: SVG arcs render between split multi-day event blocks
- [ ] Batch scheduling: correct (resource, date) events created, conflicts previewed
- [ ] iCal import/export: valid `.ics` parse/serialize round-trip works
- [ ] Timezone selector: event display times adjust correctly
- [ ] Print styles: `@media print` produces clean calendar layout
- [ ] Export PNG: generates downloadable Blob
- [ ] Default visual design: loading/empty/hover/drag-ghost/nav-animation states render
- [ ] S10.2 Calendar playground page renders interactive calendar with all demos
- [ ] New design docs created for batch scheduling, iCal, and export
- [ ] Calendar renderer definitions updated with new events and handles
- [ ] `roadmap-scheduling.md` S5 phase and S10.2 updated
- [ ] No deferred live defects or contract drifts in scope
- [ ] Affected owner docs synced (schemas.ts, definitions, new design docs)
- [ ] By independent sub-agent (fresh session) closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### iCal Subscription URL Parsing

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: iCal subscription (periodic fetch from URL) requires server-side infrastructure. S5 scoped to local file import/export only, covering the ERP use case of exporting schedules and importing spreadsheets/email attachments.
- Successor Required: `no`

### Temporal API Polyfill For Broader Browser Support

- Classification: `optimization candidate`
- Why Not Blocking Closure: Timezone conversion falls back to `Intl.DateTimeFormat` when Temporal is unavailable. Full Temporal ZonedDateTime adoption is a future enhancement once browser support matures. No current browser gaps block the timezone selector feature.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Accessibility upgrades for drag interactions (WAI-ARIA drag roles, keyboard reorder alternative) — deferred per design doc §12.
- S4 deferred component-level rendering integration tests — candidates for a future test-enhancement sweep across scheduling components.
- html2canvas export quality tuning (large calendars may produce clipped PNGs) — known limitation, workaround is print → PDF.

## Closure

Status Note: TBD

Closure Audit Evidence: TBD

Follow-up:

- S5 completion closes Calendar v2 scope. Calendar v3 (not planned in current roadmap) would cover batch conflict resolution and advanced timezone scenarios.
