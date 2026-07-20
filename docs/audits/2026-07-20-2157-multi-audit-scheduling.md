> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: scheduling

# Multi-Dimensional Audit: `@nop-chaos/flux-renderers-scheduling`

**Date**: 2026-07-20
**Package**: `packages/flux-renderers-scheduling/`
**Sub-domains**: gantt, kanban, calendar, barcode-input
**Audit Baseline**: v1 / no compatibility burden / no transitional main-path allowances

## Dimensions Executed

| Dimension | Name                                     | Agents      | Deep Rounds                     |
| --------- | ---------------------------------------- | ----------- | ------------------------------- |
| 01        | Dependency Graph & Boundaries            | 1 (initial) | 1 — zero findings after phase 1 |
| 03        | API Surface & Contract Consistency       | 1 (initial) | 1                               |
| 04        | State Ownership & Single Source of Truth | 1 (initial) | 1                               |
| 06        | Async Patterns & Cancel Safety           | 1 (initial) | 1                               |
| 09        | Renderer Contract Compliance             | 1 (initial) | 1                               |
| 10        | Styling System Compliance                | 1 (initial) | 1                               |
| 11        | UI Component Usage Compliance            | 1 (initial) | 1                               |
| 13        | Type Safety & Dynamic Boundaries         | 1 (initial) | 1                               |
| 14        | Test Coverage & Quality                  | 1 (initial) | 1                               |
| 15        | Security & Performance Red Lines         | 1 (initial) | 1                               |
| 19        | Error Propagation Fidelity               | 1 (initial) | 1                               |
| 20        | Accessibility (WCAG)                     | 1 (initial) | 1                               |

**Total Agents**: 12 (12 initial audits, no deep-dive rounds needed as agents independently produced comprehensive reports)

---

## Deep-Dive Statistics

| Dimension | Initial Findings | Deep Round 2 | Deep Round 3 | Total Pre-Review |
| --------- | ---------------- | ------------ | ------------ | ---------------- |
| 01        | 7                | —            | —            | 7                |
| 03        | 9                | —            | —            | 9                |
| 04        | 11               | —            | —            | 11               |
| 06        | 12               | —            | —            | 12               |
| 09        | 12               | —            | —            | 12               |
| 10        | 10               | —            | —            | 10               |
| 11        | 16               | —            | —            | 16               |
| 13        | 1                | —            | —            | 1                |
| 14        | 18               | —            | —            | 18               |
| 15        | 12               | —            | —            | 12               |
| 19        | 13               | —            | —            | 13               |
| 20        | 24               | —            | —            | 24               |
| **Total** | **145**          | **0**        | **0**        | **145**          |

Deep-dive rounds were not needed — each dimension agent independently performed comprehensive coverage of the entire `src/` tree.

---

## Review Statistics

| Category                                             | Count   |
| ---------------------------------------------------- | ------- |
| Pre-review total                                     | 145     |
| Retained                                             | 116     |
| Downgraded                                           | 20      |
| Dismissed (calibration pattern / no actionable risk) | 9       |
| **Final retained**                                   | **116** |

---

## P0 Findings (Critical — must fix)

| #     | Dim | File                                                | Summary                                                                                                 |
| ----- | --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P0-01 | 20  | `gantt/gantt-bars.tsx:77-113`                       | Gantt bars have no keyboard accessibility for drag/resize — keyboard-only users cannot schedule tasks   |
| P0-02 | 20  | `calendar/hooks/use-calendar-drag.ts:141-148`       | Calendar event drag-and-drop has no keyboard alternative — keyboard-only users cannot reschedule events |
| P0-03 | 20  | `kanban/kanban-column-header.tsx:68-70`             | Kanban column drag handle not keyboard focusable — column reordering blocked for keyboard users         |
| P0-04 | 20  | `barcode-input/barcode-scanner-overlay.tsx:142-148` | Barcode scanner overlay has no focus trap and no dialog role — keyboard focus can escape modal          |
| P0-05 | 20  | `calendar/calendar.tsx:274-343,345-411`             | Calendar overlays (type selector, confirm dialog) lack focus trap and aria-modal                        |

## P1 Findings (High priority)

| #     | Dim | File                                                                        | Summary                                                                                                                     |
| ----- | --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| P1-01 | 01  | `package.json`                                                              | Phantom dependency: `@nop-chaos/flux-renderers-form` declared but never imported in any source file                         |
| P1-02 | 01  | `package.json`, `barcode-input/utils/prepare-wasm.ts`                       | `@zxing/library` in dependencies but never imported as JS module — only CDN string reference                                |
| P1-03 | 03  | `scheduling-renderer-definitions.ts:10-55,107-141`                          | `onMount`/`onUnmount` declared in Gantt and Calendar schemas but missing from fields array — dead contract                  |
| P1-04 | 03  | `scheduling-renderer-definitions.ts:51-54,137-140`, `gantt/gantt.tsx:62-82` | All 8 reaction fields (`zoomIn`, `component:print`, etc.) are declared but never consumed via `props.reactions` — dead code |
| P1-05 | 04  | `kanban/kanban-board.tsx:54`                                                | `boardData` local state duplicates `resolved.data` with no re-sync mechanism — stale data after mount                       |
| P1-06 | 04  | `barcode-input/barcode-input-renderer.tsx:16`                               | `inputValue` local state duplicates form store value with no initial read — pre-populated forms show empty field            |
| P1-07 | 04  | `kanban/kanban.types.ts:60-68`, `schemas.ts:158-161`                        | All ownership/statePath schema fields are dead code — never read by any runtime logic                                       |
| P1-08 | 04  | `gantt/gantt.tsx:50`                                                        | `GanttStore` initialized once from resolved props, ignores all subsequent updates — chart becomes permanently stale         |
| P1-09 | 06  | `barcode-input/barcode-scanner-overlay.tsx:76-97`                           | Scanner async init continues after effect cleanup — stale callbacks fire after dismiss                                      |
| P1-10 | 06  | `barcode-input/hooks/use-barcode-detect.ts:57-98`                           | Detection poll captures stale `enabled` closure — one extra cycle after toggle                                              |
| P1-11 | 06  | `gantt/components/filter-bar.tsx:33-43`                                     | FilterBar debounce timer leaks on unmount — setState on unmounted component                                                 |
| P1-12 | 09  | `gantt/gantt.tsx:92`                                                        | Gantt root div does not import `cn()` and does not merge `meta.className` — consumer styling silently dropped               |
| P1-13 | 09  | `barcode-input/barcode-input-renderer.tsx:16,26-31`                         | BarcodeInputRenderer dual-state mirror — `inputValue` and `form.setValue()` create parallel source of truth                 |
| P1-14 | 10  | `apps/playground/src/styles.css`                                            | Missing scheduling CSS import in playground — 379 lines of CSS (nop-gantt, nop-kanban, nop-calendar styles) never applied   |
| P1-15 | 10  | `calendar/calendar.tsx:249-411`                                             | Pervasive inline styles with hardcoded colors in calendar drag ghost, type selector, confirm dialog                         |
| P1-16 | 10  | `calendar/components/calendar-batch-scheduler.tsx:100-329`                  | Entire CalendarBatchScheduler uses raw inline styles — no `cn()`, no `@nop-chaos/ui` imports                                |
| P1-17 | 10  | `calendar/components/calendar-timezone-selector.tsx:67-141`                 | CalendarTimezoneSelector uses raw inline styles exclusively with imperative style mutations                                 |
| P1-18 | 14  | `calendar/` (12 source files)                                               | Calendar subdomain massive coverage gap — all 6 view components and 4 hooks untested                                        |
| P1-19 | 19  | `kanban/hooks/use-kanban-collab.ts:64`                                      | WebSocket connection failure completely silent — no console output, at cross-package boundary                               |
| P1-20 | 20  | `gantt/gantt-layout.tsx:55-57`                                              | Layout resize handle not keyboard accessible — `cursor-col-resize` with pointer only                                        |
| P1-21 | 20  | `calendar/components/calendar-month-view.tsx:157-165`                       | Calendar grid cells lack semantic roles (`role="grid"`/`role="gridcell"`)                                                   |
| P1-22 | 20  | All 4 sub-domains                                                           | No `aria-live` regions for dynamic content changes anywhere                                                                 |
| P1-23 | 20  | `calendar/components/calendar-batch-scheduler.tsx:209-215`                  | Batch scheduler radio inputs hidden from accessibility tree via `display: none`                                             |
| P1-24 | 20  | `kanban/hooks/use-kanban-dnd.ts:91-118`                                     | Kanban card DnD has no keyboard path — cards focusable but cannot be moved via keyboard                                     |
| P1-25 | 20  | `barcode-input/barcode-scanner-overlay.tsx:167-174`                         | Barcode scanner video element lacks accessible name — `aria-label` missing                                                  |
| P1-26 | 20  | `kanban/components/kanban-activity-log.tsx:90-94`                           | Kanban activity log side panel missing dialog semantics — no `role="dialog"`, no focus trap                                 |
| P1-27 | 20  | `gantt/hooks/use-gantt-link-draw.ts:13-74`                                  | Gantt link-draw interaction pointer-only, no keyboard initiation                                                            |

## P2 Findings (Medium priority — representative sample)

| #     | Dim | File                                                       | Summary                                                                                                             |
| ----- | --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| P2-01 | 01  | `package.json`                                             | `html2canvas`, `jspdf`, `xlsx`, `ical.js` as hard deps but used only via dynamic import — should be optional        |
| P2-02 | 03  | `scheduling-renderer-definitions.ts:10-55`                 | Gantt schema properties (`childrenField`, `className` fields) missing from fields array — dead surface              |
| P2-03 | 03  | `scheduling-renderer-definitions.ts:107-141`               | Calendar ownership fields (`viewOwnership`, `dateStatePath`, etc.) missing from fields array                        |
| P2-04 | 03  | `scheduling-renderer-definitions.ts:149`                   | `as any` cast on BarcodeInputRenderer component registration — defeats type safety at registration boundary         |
| P2-05 | 04  | `calendar/hooks/use-calendar-state.ts:35-36`               | Calendar date/view not re-synced from initial props — uncontrolled path ignores prop updates                        |
| P2-06 | 04  | `kanban/kanban-board.tsx:56`                               | `collapsedMap` purely local while schema declares `collapsedStatePath`/`collapsedOwnership`                         |
| P2-07 | 06  | `calendar/hooks/use-calendar-ical.ts:31-103`               | iCal import/export no unmount guard — stale callbacks after navigation                                              |
| P2-08 | 06  | `gantt/components/export-handles.tsx:12-84`                | Gantt export operations lack concurrency guard — double-click runs two full rendering pipelines                     |
| P2-09 | 06  | `barcode-input/utils/prepare-wasm.ts:5-17`                 | WASM fetch failure permanently cached — no retry mechanism                                                          |
| P2-10 | 06  | `calendar/hooks/use-calendar-drag-create.ts:136-152`       | Long-press timer survives unmount — pointer listeners leak on unmounted component                                   |
| P2-11 | 09  | `gantt/gantt.tsx:43`                                       | All 11 declared Gantt events never wired — dead contract                                                            |
| P2-12 | 09  | `gantt/gantt.tsx:27-39`                                    | Gantt `createInitialStore` uses `Record<string, unknown>` with `as` casts — bypasses type safety                    |
| P2-13 | 10  | `src/styles.css`                                           | Pervasive hardcoded color literals (hex values) instead of CSS variables                                            |
| P2-14 | 10  | `src/styles.css:25-376`                                    | Bare `[data-slot]` selectors not scoped under root marker classes — ~70% of selectors leak                          |
| P2-15 | 11  | `kanban/kanban-board.tsx:265`                              | Raw `<input>` for search instead of `<Input>` from `@nop-chaos/ui`                                                  |
| P2-16 | 11  | `kanban/kanban-board.tsx:337`                              | Raw `<button>` for "Add column" inconsistent with sibling `<Button>` usage                                          |
| P2-17 | 11  | `kanban/kanban-column.tsx:178`                             | Raw `<button>` for "Add card" should be `<Button variant="ghost">`                                                  |
| P2-18 | 11  | `gantt/components/scheduler-config.tsx:48,60`              | Raw `<select>`/`<option>` should be `<NativeSelect>`                                                                |
| P2-19 | 11  | `calendar/components/calendar-batch-scheduler.tsx:141,148` | Raw `<input type="date">` should be `<Input type="date">`                                                           |
| P2-20 | 11  | `calendar/components/calendar-batch-scheduler.tsx:297,310` | Raw `<button>` should be `<Button>`                                                                                 |
| P2-21 | 14  | `src/gantt/hooks/` (4 hook files)                          | All 4 Gantt interaction hooks (drag, keyboard, link-draw, scroll) have zero test coverage                           |
| P2-22 | 14  | `src/gantt/gantt.tsx`, `src/calendar/calendar.tsx`         | Main renderer component files have no dedicated tests                                                               |
| P2-23 | 14  | `vitest.config.ts`                                         | 80% coverage thresholds likely unmet, especially for calendar subdomain (~43% file-level)                           |
| P2-24 | 14  | (N/A)                                                      | No integration/e2e tests for drag-and-drop interactions across sub-domains                                          |
| P2-25 | 15  | `gantt/components/critical-path.ts:81-96`                  | O(n^2) backward pass — scans all edges for each vertex                                                              |
| P2-26 | 15  | `calendar/utils/calendar-layout-utils.ts:154-165`          | O(n^2) conflict detection — full pairwise comparison                                                                |
| P2-27 | 15  | `gantt/components/resource-load.ts:45-93`                  | Triple-nested loop in resource load calculation (O(n^3) pattern)                                                    |
| P2-28 | 15  | `kanban/kanban-column.tsx:142,158`                         | `cardIds.indexOf()` in render hot path — O(n) per card = O(k\*n) per column                                         |
| P2-29 | 19  | `kanban/hooks/use-kanban-collab.ts:47`                     | WebSocket message parse error loses original error — only generic message logged                                    |
| P2-30 | 19  | `barcode-input/hooks/use-barcode-torch.ts:53`              | Torch toggle failure completely silent — state reset without diagnostic                                             |
| P2-31 | 19  | `kanban/utils/kanban-export.ts:52`                         | Dynamic import failure silently returns null — misleading caller error                                              |
| P2-32 | 19  | `calendar/hooks/use-calendar-export.ts:39`                 | Calendar export catch replaces original error with hardcoded "not available" message — hides CORS/security failures |
| P2-33 | 19  | `calendar/hooks/use-calendar-ical.ts:24`                   | Dynamic import of `ical.js` failure completely silent                                                               |
| P2-34 | 20  | `gantt/gantt-grid.tsx:103-108`                             | Gantt expand/collapse toggles missing `aria-expanded`                                                               |
| P2-35 | 20  | `kanban/components/kanban-tag-filter.tsx:31-44`            | Tag filter buttons missing `aria-pressed`                                                                           |
| P2-36 | 20  | `kanban/kanban-board.tsx:265-270`                          | Kanban search input missing associated label                                                                        |
| P2-37 | 20  | `gantt/hooks/use-gantt-keyboard.ts:88-98`                  | Gantt grid rows ARIA managed via fragile DOM querySelector — inconsistent with React render                         |
| P2-38 | 20  | `gantt/components/scheduler-config.tsx:80-98`              | Scheduler config error/success messages not linked to controls via `aria-describedby`                               |
| P2-39 | 20  | `kanban/kanban-column.tsx:90-101`                          | Kanban column containers lack `aria-label` for screen reader context                                                |
| P2-40 | 20  | `calendar/components/calendar-month-view.tsx:165-167`      | Calendar weekend/today states use color-only indicators                                                             |
| P2-41 | 20  | `calendar/components/calendar-day-view.tsx:63-71`          | Calendar day-view time slots have no accessible labels                                                              |

## High-Frequency Files (appearing in 3+ dimension reports)

| File                                               | Dimensions         | Issues                                                              |
| -------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| `scheduling-renderer-definitions.ts`               | 03, 09, 13         | Missing field rules, unused regions, type casts                     |
| `kanban/kanban-board.tsx`                          | 04, 09, 11, 15, 20 | Dual-state boardData, raw HTML, redundant useCallback, missing a11y |
| `gantt/gantt.tsx`                                  | 04, 09, 15, 03     | className not merged, events unwired, store stale, reactions unused |
| `barcode-input/barcode-input-renderer.tsx`         | 04, 06, 09, 11     | Dual-state inputValue, async cancellation, raw HTML, as any casts   |
| `calendar/calendar.tsx`                            | 09, 10, 20, 06     | Inline styles, overlays no focus trap, raw HTML                     |
| `calendar/components/calendar-batch-scheduler.tsx` | 10, 11, 20         | 100% inline styles, raw HTML everywhere, radio hidden from a11y     |
| `gantt/components/filter-bar.tsx`                  | 04, 06, 11         | Debounce timer leak, raw HTML, stale closure                        |

## Cross-Dimension Patterns

| Pattern                              | Dimensions Involved | Description                                                                                                                                                                                             |
| ------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dead schema contract**             | 03, 04              | Multiple schema fields declared but never wired: ownership/statePath fields, reaction fields, onMount/onUnmount, className props. The schema promises behavior the implementation cannot deliver.       |
| **Dual-state pattern**               | 04, 09              | Three out of four renderers (Kanban, Barcode, Gantt) maintain local state duplicating store/scope data with no sync path. Calendar also has a similar pattern in useCalendarState.                      |
| **DnD without keyboard alternative** | 20, 06              | Kanban card DnD, kanban column drag, Gantt bar drag/resize, Gantt link-draw, and calendar DnD all lack keyboard alternatives. This is the single largest accessibility gap.                             |
| **Hardcoded styling bypass**         | 10, 11              | Calendar sub-domain (batch-scheduler, timezone-selector, main calendar.tsx overlays) uses 100% inline styles with hardcoded colors — completely bypasses the styling system.                            |
| **Async lifecycle gaps**             | 06, 19              | Barcode scanner init, detection poll, debounce timer, calendar drag-create timer, and WebSocket connection all have unmount/cancellation issues. Error propagation is also weakest in these same paths. |

## Positive Findings

| File                                                                 | Pattern                         | Notes                                                                            |
| -------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| `gantt/components/export-handles.tsx`                                | Error propagation               | Logs original error + re-throws — reference pattern for all async error handling |
| `barcode-input/hooks/use-barcode-camera.ts`                          | Session counter + error mapping | Correct session counter stale guard with user-friendly error messages            |
| `kanban/kanban-helpers.test.ts`                                      | Immutability tests              | Every mutation function verified with deep-equality check                        |
| `gantt/gantt-utils.test.ts`                                          | Test naming                     | Clear "given/when/then" naming — should be replicated                            |
| `kanban/hooks/use-kanban-filter.ts`                                  | Debounce cleanup                | Proper setTimeout cleanup in useEffect                                           |
| `src/` (all files)                                                   | No BEM naming                   | No `__` separators found — consistent with styling contract                      |
| Module-level type safety                                             | `@ts-ignore`/`@ts-expect-error` | Zero occurrences across the entire package                                       |
| `barcode-input/hooks/use-barcode-detect.ts`, `use-barcode-camera.ts` | Error preservation              | Original error name/message used for user-friendly categorization                |

## Verdict

> **Audit Status**: open
> **Overall**: The `flux-renderers-scheduling` package has significant gaps in three areas: (1) **Accessibility** — 5 P0 findings block keyboard-only users from core interaction models; (2) **Async lifecycle management** — multiple dangling timers, stale closures, and silent error swallowing; (3) **Renderer contract compliance** — Gantt renderer has a P1 className merge violation and 4 P2 contract issues including completely unwired events and reactions. The **best** area is type safety (Dim13 — only 1 minor P3 finding), and the **Calendar sub-domain** is the weakest across nearly every dimension (styling bypass, coverage gap, accessibility, state management). **Immediate remediation** should focus on the 5 P0 accessibility blockers and the 5 P1 state ownership/dual-state issues. Use the detailed per-dimension sections below for prioritized remediation planning.

---

## Dimension 01: Dependency Graph & Boundaries

### Findings

- Dim01-1 (P1): `@nop-chaos/flux-renderers-form` declared in package.json but never imported in any source file — phantom dependency
- Dim01-2 (P1): `@zxing/library` declared as dependency but only referenced as CDN URL string — not imported as JS module
- Dim01-3 (P2): `html2canvas` declared as hard dependency but used only via dynamic `import()` — should be optional peer dep
- Dim01-4 (P2): `jspdf` and `xlsx` same pattern — hard deps used only via dynamic import
- Dim01-5 (P2): `ical.js` same pattern
- Dim01-6 (P3): `barcode-input` sub-domain is a form field renderer misplaced in scheduling package — creates domain confusion
- Dim01-7 (P3): `@nop-chaos/flux-react` only used by barcode-input (useCurrentForm) — would become unused if barcode-input is moved

**Compliance**: Package.json exports aligned with index.ts. No internal path imports. No circular dependencies. All tsconfig correct. 2 phantom deps (P1), 4 optional-vs-hard mismatch (P2), 2 domain misalignment (P3).

## Dimension 03: API Surface & Contract Consistency

### Findings

- Dim03-01 (P1): `onMount`/`onUnmount` declared in GanttSchema and CalendarSchema but missing from `fields` arrays — silent dead contract
- Dim03-02 (P2): GanttSchema declares `childrenField`, `initiallyExpanded`, `toolbarClassName`, `taskBarClassName`, `editorClassName`, `emptyClassName` — none in fields array
- Dim03-03 (P2): CalendarSchema declares `viewOwnership`, `viewStatePath`, `dateOwnership`, `dateStatePath`, `statusPath` — none in fields array
- Dim03-04 (P3): KanbanSchema declares `wipStrict`, `filterTags` — not in fields array
- Dim03-05 (P2): `BarcodeInputRenderer as any` cast in renderer registration — defeats type safety
- Dim03-06 (P3): `schedulingRendererDefinitions` array exported alongside `registerSchedulingRenderers` — unnecessary surface
- Dim03-07 (P1): All 8 reaction fields across Gantt (4) and Calendar (4) declared but never consumed via `props.reactions` — dead code
- Dim03-08 (P2): Type name collision: `GanttTask`/`GanttLink` in schemas.ts vs gantt.types.ts with different shapes
- Dim03-09 (P3): Calendar uses `component:` prefix in reaction keys vs Gantt camelCase — inconsistent naming

**Public API surface**: 17 exports. 12 needed, 5 potentially removable. Calendar/index.ts barrel correctly not re-exported from main barrel.

## Dimension 04: State Ownership & Single Source of Truth

### Findings

- Dim04-01 (P1): Kanban `boardData` (useState) duplicates `resolved.data` — no re-sync, stale after mount
- Dim04-02 (P1): Barcode `inputValue` (useState) duplicates form store — pre-populated forms show empty
- Dim04-03 (P1): All ownership/statePath schema fields (Kanban + Calendar) are dead code — never wired
- Dim04-04 (P1): GanttStore created once from resolved props — ignores subsequent updates, permanently stale
- Dim04-05 (P2): Calendar state hook date/view not re-synced when initial props change
- Dim04-06 (P2): Kanban `collapsedMap` purely local while schema declares collapsedStatePath (dead)
- Dim04-07 (P3): GanttEditor open/editingTaskId disconnected from parent selectedTaskId — editor unreachable via keyboard
- Dim04-09 (P3): useKanbanColumnResize stale closure during resize gesture
- Dim04-10 (P3): useKanbanFilter localText not re-synced from externalFilterText
- Dim04-11 (P3): useCalendarDrag dual state between ref and useState
- Dim04-12 (P3): filter-bar useEffect+setState sync chain could use derived value

**Clean patterns**: undoStackState, activityLogOpen, dragState/dropState (transient UI), camera/local states in barcode hooks (per Calibration Pattern 8).

## Dimension 06: Async Patterns & Cancel Safety

### Findings

- Dim06-1 (P1): Barcode scanner overlay init async IIFE continues asynchronously after effect cleanup — no AbortSignal
- Dim06-2 (P1): Detection poll `enabled` closure stale — one extra cycle after toggle, no AbortController
- Dim06-3 (P1): Gantt FilterBar debounce timer via `useCallback` return (not useEffect cleanup) — timer fires after unmount
- Dim06-4 (P2): Calendar iCal import/export — no stale guard, no concurrency key, parallel calls duplicate
- Dim06-5 (P2): Gantt export handles (PNG/PDF/Excel) — no concurrency guard, no AbortSignal
- Dim06-6 (P2): prepareWasm permanently caches rejected promise — no retry mechanism
- Dim06-7 (P2): Calendar drag-create long-press setTimeout survives unmount — pointer listeners leak
- Dim06-8 (P2): Barcode camera session counter fragile — correct but no AbortSignal propagation
- Dim06-9 (P3): Torch toggle silently swallows applyConstraints errors
- Dim06-10 (P3): Kanban board PNG export lacks cancel mechanism
- Dim06-11 (P3): Calendar export silently fails when html2canvas is absent
- Dim06-12 (P3): Kanban WebSocket reconnection edge case (minor)

**P5 Violations**: `use-barcode-detect.ts` uses bare boolean flag (`activeRef`) instead of AbortController. `barcode-scanner-overlay.tsx` useEffect async IIFE has no AbortController.

## Dimension 09: Renderer Contract Compliance

### Findings

- KanbanBoard (B): Region handle type casts (P2), Chinese text fallback (P3)
- **Gantt (C)**: **P1** — className not merged (missing `cn()` import), no `meta.className`; **P2** — 11 declared events never wired; **P2** — 4 reaction fields not consumed via `reactions` prop; **P2** — 4 unused region declarations; **P2** — typed prop access via `as` casts
- Calendar (B): Raw HTML in overlays (P2 — overlaps Dim10), unused region declarations (P3)
- BarcodeInputRenderer (**B** downgraded for P1): **P1** — dual-state mirror (overlaps Dim04-02); P2 — event handler `as any` casts; P2 — `as any` component registration (overlaps Dim03-05)

**Cross-cutting**: Ad-hoc React context only in Gantt (GanttStoreContext) — accepted per Calibration Pattern 8. No direct Flux store access in any renderer.

## Dimension 10: Styling System Compliance

### Findings

- Dim10-1 (P1): Playground missing `@import` of scheduling CSS — 379 lines of CSS (nop-gantt, nop-kanban, nop-calendar, drag ghosts, transitions) never loaded
- Dim10-2 (P1): Calendar.tsx pervasive inline styles with hardcoded colors — drag ghost, type selector overlay, confirm dialog
- Dim10-3 (P1): CalendarBatchScheduler — 100% inline styles, no `cn()`, no `@nop-chaos/ui`
- Dim10-4 (P1): CalendarTimezoneSelector — 100% inline styles, imperative style mutations via `e.currentTarget.style`
- Dim10-5 (P2): styles.css has 12+ hardcoded color literals (hex values, rgba) instead of CSS variables
- Dim10-6 (P2): Gantt SVG elements hardcode fill/stroke colors — milestone diamond, arrowhead, link hover
- Dim10-7 (P2): ~70% of `[data-slot]` selectors are bare/unscoped — leak outside scheduling subtree
- Dim10-8 (P3): Kanban CSS has redundant class selectors alongside data-slot attributes
- Dim10-9 (P3): Hardcoded px values for structural spacing (HOUR_HEIGHT, rowHeight)
- Dim10-10 (P3): Calendar event block hardcodes `color: '#fff'` — doesn't adapt to dark themes

**Positive**: All main renderers use `cn()` and `data-slot` on root elements (except Gantt — Dim09 P1). No BEM naming. No React ThemeProvider dependency. Gantt geometry correctly uses inline styles only for dynamic runtime data.

## Dimension 11: UI Component Usage Compliance

### Findings (actionable)

- P2 (6): `<input>` in Kanban search → `<Input>`; `<button>` add column/card → `<Button>`; `<select>` scheduler config → `<NativeSelect>`; `<input type="date">` batch scheduler → `<Input>`; `<button>` batch scheduler cancel/confirm → `<Button>`
- P3 (10): Checkbox/radio/label batch scheduler, collapse toggle, activity log close, sort toggle, group-by select, group toggle, timezone selector, calendar overlays
- Exempted (5): Gantt grid tables, inline grid editor, resource-load grid — high-performance host surfaces

**Compliance**: No `@radix-ui`/`@base-ui` bypass. All `@nop-chaos/ui` imports via correct entry point.

## Dimension 13: Type Safety & Dynamic Boundaries

### Findings

- Dim13-1 (P3): `undo-stack.ts` uses `as any` for `UpdateTaskCommand` payloads where `Partial<GanttTaskData>` is already imported — but code is unwired (no production call path)

**Zero**: `@ts-ignore`, `@ts-expect-error`, `as unknown as X as Y` chains in production code. All 57 `any` occurrences are acceptable low-code patterns (schema data, third-party bridges, browser API gaps, catch blocks).

## Dimension 14: Test Coverage & Quality

### Findings

- Dim14-2 (P1): Calendar subdomain massive gap — 12 source files zero tests (all 6 view components, 4 hooks)
- Dim14-1 (P2), Dim14-3 (P2): Gantt hooks (4) and main renderer files untested
- Dim14-15 (P2): 80% coverage thresholds likely unmet for calendar
- Dim14-16 (P2): No integration/e2e DnD tests for kanban/gantt/calendar
- Dim14-4 through Dim14-13 (P3): 10 test quality issues — assertion-less tests, misleading names, fragile assertions, factory duplication
- Dim14-17, Dim14-18: Positive — exemplar test naming (gantt-utils), thorough immutability checks

**Coverage by sub-domain**: barcode-input ~90%, kanban ~83%, gantt ~52%, calendar ~43%, total ~61%

## Dimension 15: Security & Performance Red Lines

### Security

- **No violations**: Zero `eval()`/`new Function()` — covered by lint. Camera access properly gated behind user gesture. WASM loaded from pinned version with overridable URL. No security red lines found.

### Performance

- P2 (5): O(n^2) critical path backward pass; O(n^2) calendar conflict detection; O(n^3) resource load calculation; cardIds.indexOf() in render hot path; GanttStore in-place mutation
- P3 (5): Kanban-helpers in-place mutation; widespread redundant useCallback/useMemo (30+ files); React.memo on KanbanCard; useBarcodeCamera session counter fragility; CDN WASM without integrity hash

### React 19 Compliance

- P3: Widespread redundant `useCallback`/`useMemo` (30+ files across package) — React Compiler handles automatic memoization
- P3: `React.memo(KanbanCard)` redundant under Compiler
- P3: `useBarcodeCamera` session counter could use `useEffectEvent`

## Dimension 19: Error Propagation Fidelity

### Findings

- Dim19-1 (P1): WebSocket connection failure completely silent — no `console.error`, at cross-package boundary
- Dim19-2 (P2): WS message parse error loses original error — generic message only
- Dim19-4 (P2): Torch toggle failure silent — state reset without logging
- Dim19-5 (P2): Kanban export dynamic import failure returns null silently — caller error message misleading
- Dim19-6 (P2): Calendar export catch replaces original error with hardcoded "not available" message — hides CORS/security failures
- Dim19-8 (P2): Calendar iCal dynamic import failure completely silent
- Dim19-3, Dim19-7, Dim19-9, Dim19-12, Dim19-13 (P3): 5 minor swallowed errors (torch capability, timezone formatting, fullscreen, iCal, barcode detection)

**Positive patterns**: `export-handles.tsx` (log + re-throw), `use-barcode-camera.ts` (preserve original error with user-friendly mapping).

## Dimension 20: Accessibility (WCAG 2.1 AA)

### Findings

- **P0 (5)**: Gantt bars keyboard inaccessibility; Calendar DnD no keyboard alternative; Kanban column drag handle not focusable; Barcode overlay no focus trap; Calendar overlays no focus trap/modal
- **P1 (9)**: Gantt layout resize handle; Calendar grid cells no semantic roles; No aria-live anywhere; Batch scheduler radios hidden from tree; Kanban card DnD no keyboard path; Barcode video no name; Activity log no dialog semantics; Link-draw pointer-only; Gantt expand/collapse no aria-expanded
- **P2 (10)**: Color-only indicators (event overlap, weekend/today, gantt toggles), missing labels (search input, columns, day-view), missing ARIA states (aria-pressed, aria-describedby), fragile DOM ARIA management
- **P3 (2)**: "Add column" raw button, color dot no label

**Distribution**: ~55% keyboard operability (2.1.1), ~25% ARIA semantics (4.1.2), ~20% color/sensory (1.4.1, 1.3.1).

---

## Final Retained Items Summary

| Severity  | Count   | Action Required                                                                   |
| --------- | ------- | --------------------------------------------------------------------------------- |
| P0        | 5       | Must fix — keyboard accessibility blocks core interactions                        |
| P1        | 27      | High priority — dual-state data loss, phantom deps, CSS not loaded, coverage gaps |
| P2        | 43      | Medium priority — O(n^2) perf, inline colors, dead schema contracts               |
| P3        | 41      | Low priority — redundant memo, test quality, minor edge cases                     |
| **Total** | **116** |                                                                                   |

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
