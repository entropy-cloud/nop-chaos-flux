# S5 — Calendar Interactive (Drag, Groups, Batch, Import/Export)

> Plan Status: completed
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

Status: completed
Targets: `use-calendar-drag.ts`, `use-calendar-drag-create.ts`

- Item Types: `Fix | Proof`

- [x] `Fix`: Create `useCalendarDrag` hook for shift swapping
- [x] `Fix`: Create `useCalendarDragCreate` hook
- [x] `Fix`: Wire drag hooks into `calendar.tsx` — integrate with existing month/week/day view controllers
- [x] `Proof`: Write integration tests for drag swap, drag create, escape cancellation

Exit Criteria:

- [x] Drag to swap shifts commits event update on confirm
- [x] Drag to create events produces new event at correct grid position
- [x] Both drag modes support Escape cancellation
- [x] Integration tests pass (`pnpm --filter @nop-chaos/flux-renderers-scheduling test`)

### Phase 2 — Resource Groups And Cross-Day Connectors

Status: completed
Targets: `calendar-resource-group.tsx`, `calendar-cross-day-lines.ts`

- Item Types: `Fix | Decision | Proof`

- [x] `Decision`: Resource group expand/collapse interaction model
- [x] `Fix`: Create `calendar-resource-group.tsx`
- [x] `Fix`: Create `calendar-cross-day-lines.ts` (utils)
- [x] `Fix`: Wire resource grouping into `calendar-month-view.tsx`
- [x] `Fix`: Wire cross-day lines into `calendar-month-view.tsx`
- [x] `Proof`: Write integration tests for resource groups and cross-day lines

Exit Criteria:

- [x] Resource group collapse hides child rows, expand shows them
- [x] Group state persists through view switches (scope path)
- [x] Cross-day connectors render between split multi-day event blocks
- [x] Hover on connector highlights full event chain
- [x] Integration tests pass (`pnpm --filter @nop-chaos/flux-renderers-scheduling test`)

### Phase 3 — Batch Scheduling, iCal Import/Export

Status: completed
Targets: `calendar-batch-scheduler.tsx`, `use-calendar-ical.ts`, design docs

- Item Types: `Fix | Decision | Proof`

- [x] `Decision`: iCal library — adopt `ical.js`
- [x] `Fix`: Create design docs for batch scheduling, iCal, and export
- [x] `Fix`: Create `calendar-batch-scheduler.tsx`
- [x] `Fix`: Create `useCalendarICal` hook
- [x] `Fix`: Wire batch scheduler and iCal into calendar main component as optional features
- [x] `Proof`: Write unit tests for batch scheduling, iCal, and conflict detection

Exit Criteria:

- [x] Batch scheduler creates events for correct date × resource cells
- [x] Batch preview highlights conflicts
- [x] iCal import parses `.ics` to `CalendarEvent[]` correctly
- [x] iCal export produces valid `.ics` download
- [x] If `ical.js` is missing, import/export buttons gracefully disabled
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && pnpm test` passes

### Phase 4 — Timezone, Print/Export, Visual Design, Playground

Status: completed
Targets: `calendar-timezone-selector.tsx`, `calendar-print.css`, `use-calendar-export.ts`, `src/styles.css`, `apps/playground/src/pages/calendar-demo.tsx`

- Item Types: `Fix | Proof | Follow-up`

- [x] `Fix`: Create `calendar-timezone-selector.tsx`:
  - Dropdown with common timezones (generated via `Intl.supportedValuesOf('timeZone')`)
  - Applies timezone offset to displayed event times
  - Uses `Intl.DateTimeFormat` for localized formatting
  - Where Temporal API ZonedDateTime is available (modern browsers), use for conversion; fall back to manual offset calculation
  - Fires `onTimezoneChange` event
- [x] `Fix`: Create `calendar-print.css`:
  - `@media print` styles: hide navigation/controls, full-width calendar grid
  - Print-friendly colors (remove interactive colors, use gray tones)
  - Page break: after each resource group or every ~50 rows
- [x] `Fix`: Create `useCalendarExport` hook:
  - `exportToPrint()`: `window.print()` (triggers browser print dialog)
  - `exportToPNG()`: html2canvas screenshot of calendar root element → Blob download
  - Both wired as imperative handles: `component:print`, `component:exportPNG`
- [x] `Fix`: Visual design additions in `src/styles.css` (S5.9):
  - Drag ghost: semi-transparent event block with shadow for swap/create
  - Drag-over cell highlight: outline `2px dashed #3b82f6`
  - Navigation animation: month/week/day switch slide/fade transition 250ms ease
  - Hover: grid cell hover outline + brightness adjustment
  - Loading skeleton: row height 48px × 7 column pulse animation
  - Empty state: "暂无排班数据" centered
  - Cross-day connector line styles (stroke, stroke-width, hover highlight)
- [x] `Fix`: Update `src/schemas.ts` — add interactive Calendar fields
- [x] `Fix`: Update `src/scheduling-renderer-definitions.ts` — add new events and imperative handles
- [x] `Fix`: Create `apps/playground/src/pages/calendar-demo.tsx`
- [x] `Proof`: Write integration tests for timezone, print, export
- [x] `Follow-up`: Update `docs/components/roadmap-scheduling.md` — S5 phase to `done`, S10.2 to `done`
- [x] `Follow-up`: Update `docs/logs/2026/07-20.md` with S5 completion summary

Exit Criteria:

- [x] Timezone selector changes displayed event times correctly
- [x] Print styles render clean calendar layout
- [x] Export PNG creates downloadable file (mocked in test)
- [x] New schema fields and events registered in definitions
- [x] Calendar playground page (S10.2) renders with interaction demos
- [x] `roadmap-scheduling.md` S5 items show `done` status

## Draft Review Record

> Final review pass by independent sub-agent (ses_08095af0dffeI4jYABFUJlciLK). All references verified against live repo.

- Reviewer / Agent: fresh sub-agent (ses_08095af0dffeI4jYABFUJlciLK)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: Removed redundant full-repo verification (`pnpm typecheck && pnpm build && pnpm test`) from Phase 4 Exit Criteria per Minimum Rule 18 (full checks belong in Closure Gates only). One minor issue remains: the `src/` path convention is package-relative (implicitly `packages/flux-renderers-scheduling/`); document-level path disambiguation could be clearer but is not blocking.

## Closure Gates

- [x] Drag swap shifts: event moves to correct target date/resource on confirm
- [x] Drag create events: long-press creates correct event type at correct position
- [x] Resource group expand/collapse: nested resources show/hide correctly, state persists
- [x] Cross-day connectors: SVG arcs render between split multi-day event blocks
- [x] Batch scheduling: correct (resource, date) events created, conflicts previewed
- [x] iCal import/export: valid `.ics` parse/serialize round-trip works
- [x] Timezone selector: event display times adjust correctly
- [x] Print styles: `@media print` produces clean calendar layout
- [x] Export PNG: generates downloadable Blob
- [x] Default visual design: loading/empty/hover/drag-ghost/nav-animation states render
- [x] S10.2 Calendar playground page renders interactive calendar with all demos
- [x] New design docs created for batch scheduling, iCal, and export
- [x] Calendar renderer definitions updated with new events and handles
- [x] `roadmap-scheduling.md` S5 phase and S10.2 updated
- [x] No deferred live defects or contract drifts in scope
- [x] Affected owner docs synced (schemas.ts, definitions, new design docs)
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

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

Status Note: All phases executed and verified. typecheck, build, lint, and test all pass (285 tests, 26 test files). See `docs/logs/2026/07-20.md` for full test counts.

Closure Audit Evidence:

- Auditor / Agent: Independent closure auditor (fresh session)
- Evidence:
  - All 4 phases Status: completed, all Exit Criteria `[x]`
  - All execution items verified live: Phase 1 (drag hooks + tests), Phase 2 (resource group + cross-day + tests), Phase 3 (batch scheduler, iCal, design docs + tests), Phase 4 (timezone selector, print CSS, export hook, visual CSS, playground, schema/definitions)
  - Anti-hollow check: All non-placeholder implementations — no empty bodies or `return null` stubs
  - 5-point consistency: Plan Status `completed` = all Phase Status `completed` = all Exit Criteria `[x]` = all Closure Gates `[x]` = docs/logs/2026/07-20.md records S5 completion
  - Deferred honesty: iCal subscription (out-of-scope improvement) and Temporal polyfill (optimization candidate) — both properly classified, no in-scope live defect hidden
  - Docs sync: roadmap-scheduling.md S5/S10.2 → done, new design docs (batch-scheduling, ical, export) created
  - Verdict: approved (all checks pass)

Follow-up:

- S5 completion closes Calendar v2 scope. Calendar v3 (not planned in current roadmap) would cover batch conflict resolution and advanced timezone scenarios.
