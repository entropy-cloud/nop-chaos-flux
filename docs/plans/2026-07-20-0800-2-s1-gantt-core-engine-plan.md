# S1 — Gantt Core Engine (Pure Logic Layer)

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/components/gantt/design.md` (§4, §11), `docs/components/roadmap-scheduling.md` (S1)
> Related: `docs/plans/2026-07-20-0800-1-s0-scheduling-infrastructure-plan.md` (prerequisite)

## Purpose

Implement Gantt's pure logic layer — store, data models, WBS, time scale, zoom, and work calendar. No React rendering. After this plan, `GanttStore` and all helper utilities exist as tested TypeScript modules, ready for the React rendering layer (S2) to consume.

## Current Baseline

- S0 infrastructure plan (prerequisite) will create `packages/flux-renderers-scheduling/` with stub files
- Gantt design doc at `docs/components/gantt/design.md` covers all required interfaces in §4 (schema), §11.1 (file structure), §11.3 (GanttStore), §12.4 (WorkCalendar)
- `roadmap-scheduling.md` S1 items (S1.1–S1.6) are all `proposed`
- Key design decisions: pure TS class store (not React), coordinate precomputation (`$x/$y/$w/$h`), flat Map storage, non-Redux

## Goals

- Implement `GanttStore`: flat `Map<ID, GanttTask>` / `Map<ID, GanttLink>` / `Map<ID, GanttResource>`, pixel coordinate precomputation, zoom level management, layout recalculation
- Implement `GanttTask`, `GanttLink`, `GanttResource`, `GanttAssignment` data models with computed properties (`$x`, `$y`, `$w`, `$h`, `$level`, `$source`, `$target`, `$p`)
- Implement WBS tree management: parent indexing, `$level`/`$branches` computation, expand/collapse filtering, lazy children placeholder
- Implement time scale engine: dual-row scale configuration (`scales[]`), six zoom units (hour/day/week/month/quarter/year), strftime format strings, smart viewport clipping
- Implement zoom engine: predefined `zoomLevels`, `cellWidth` auto-calculation, scroll anchoring, smooth zoom transitions (data only, no CSS)
- Implement WorkCalendar: global/task/resource three-level calendar, `weekHours` config (Mon–Sun), non-working day skip, holidays list, `addWorkDays`/`subtractWorkDays`/`countWorkDays` API
- All modules covered by unit tests with focused verification

## Non-Goals

- No React components, hooks, or JSX (S2 scope)
- No drag interaction or pointer events (S2 scope)
- No dependency line SVG rendering or polyline point calculation beyond store-level data (S2 scope)
- No task editor data flow (S2/S3 scope)
- No resource load histogram (S3 scope)
- No baseline/compare view data (S3 scope)

## Scope

### In Scope

- `src/gantt/gantt-store.ts` — `GanttStore` class
- `src/gantt/gantt.types.ts` — all type definitions (`GanttTask`, `GanttLink`, `GanttResource`, `GanttAssignment`, `GanttSegment`, `GanttColumn`, `GanttScale`, `GanttZoomLevel`)
- `src/gantt/gantt-utils.ts` — helper functions (task tree flatten, date diff/format, scale interval computation)
- `src/gantt/utils/date.ts` — date utility functions
- `src/gantt/utils/scale.ts` — time scale interval computation
- `src/gantt/utils/layout.ts` — pixel coordinate calculation (task → `$x`/`$y`/`$w`/`$h`)
- `src/gantt/utils/worktime.ts` — `WorkCalendar` interface and implementation, `CalendarManager` strategy pattern
- Update `src/schemas.ts` and `src/scheduling-renderer-definitions.ts` to register actual Gantt types

### Out Of Scope

- Any React component rendering
- Any drag-and-drop interaction
- Any SVG rendering or polyline computation
- S2 items (layout, grid, timeline, bars, links, scroll sync, editor, keyboard nav, visual design)
- S3 items (resource load, baselines, auto-scheduling, undo/redo, export, filter/sort, fullscreen, multi-select)

## Failure Paths

Not applicable — pure data layer with no external API contracts or auth.

## Test Strategy

档位选择：`必须自动化`

本档选择：必须自动化 — GanttStore、坐标计算、缩放引擎、WorkCalendar 都是核心算法逻辑，属于核心回归路径，必须通过 focused unit tests 覆盖。每个模块必须有验证语义（正确性断言、边界条件），不能只验证无抛出异常。

## Execution Plan

### Phase 1 — Types And GanttStore

Status: completed
Targets: `src/gantt/gantt.types.ts`, `src/gantt/gantt-store.ts`

- Item Types: `Fix | Proof`

- [x] `Fix`: Create `src/gantt/gantt.types.ts` — all type interfaces (`GanttTask`, `GanttLink`, `GanttResource`, `GanttAssignment`, `GanttSegment`, `GanttColumn`, `GanttScale`, `GanttZoomLevel`) matching design doc §4, including computed property fields (`$x`, `$y`, `$w`, `$h`, `$level`, `$source`, `$target`, `$p`)
- [x] `Fix`: Create `src/gantt/gantt-store.ts` — `GanttStore` class with:
  - `tasks: Map<ID, GanttTask>`, `links: Map<ID, GanttLink>`, `resources: Map<ID, GanttResource>`, `assignments: Map<ID, GanttAssignment>`
  - `parse(tasks, links, resources?, assignments?)`: ingest external data → fill computed properties
  - `recalcLayout()`: recompute all pixel coordinates and link polyline points
  - `updateTask(id, partial)`, `updateLink(id, partial)`
  - `getVisibleTasks()`: return visible tasks based on expand/collapse state + filters
  - `addLink(source, target, type)`, `removeLink(id)`
  - Simple event emitter (`on`/`off`/`emit`)
- [x] `Proof`: Write unit tests for:
  - Data parsing and computed property population
  - Task update propagation
  - Link add/remove
  - Event subscription

Exit Criteria:

- [x] `GanttStore` class compiles and all type interfaces are consistent with design doc §4
- [x] Unit tests verify: parse populates computed properties, updateTask recalculates dependent fields, link lifecycle works
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes

### Phase 2 — WBS Tree And Time Scale Engine

Status: completed
Targets: `src/gantt/gantt-utils.ts`, `src/gantt/utils/scale.ts`, `src/gantt/utils/date.ts`

- Item Types: `Fix | Proof`

- [x] `Fix`: Create `src/gantt/utils/date.ts` — date utility functions (diff in days, add days, format using strftime-style patterns, month/week start/end computation)
- [x] `Fix`: Create `src/gantt/utils/scale.ts` — time scale engine:
  - `computeScaleRange(tasks, startDate?, endDate?)`: determine visible date range
  - `computeScaleIntervals(scaleRange, scales, cellWidth)`: generate labeled grid cells for each scale row
  - `smartScaling(visibleRange, totalWidth)`: clip cells to visible viewport
  - Support six units: hour/day/week/month/quarter/year
- [x] `Fix`: Extend `gantt-utils.ts` with WBS tree management:
  - `flattenTree(tasks, openSet, rootTaskIds?)`: flat list with `$level`/`$branches`
  - `buildParentIndex(tasks)`: parent → children map
  - `toggleOpen(taskId)`, `expandAll()`, `collapseAll()`
  - `getVisibleDescendantCount(taskId)`: for tree-grid chevron display
- [x] `Proof`: Write unit tests for:
  - Scale range computation with various task date spreads
  - Scale interval generation for each unit type
  - Smart scaling viewport clipping
  - Tree flattening with expand/collapse states
  - Parent index building and toggle behavior

Exit Criteria:

- [x] All six zoom units produce correct grid intervals
- [x] Tree flattening correctly filters collapsed children
- [x] Unit tests verify boundary conditions (single task, no tasks, cross-year ranges)
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && pnpm test` passes for these modules

### Phase 3 — Zoom Engine And Layout Computation

Status: completed
Targets: `src/gantt/utils/layout.ts`

- Item Types: `Fix | Proof`

- [x] `Fix`: Create `src/gantt/utils/layout.ts` — pixel coordinate computation:
  - `taskToPixels(task, scaleRange, cellWidth, taskBarHeight, rowPadding)`: compute `$x`, `$y`, `$w`, `$h`
  - `linkToPolyline(source, target, cellWidth, taskBarHeight, rowPadding)`: compute `$p` polyline points
  - `dateToPixel(date, scaleRange, cellWidth)`: date → x offset
  - `pixelToDate(x, scaleRange, cellWidth)`: x offset → date
- [x] `Fix`: Implement zoom engine within GanttStore:
  - `setZoom(zoomLevelKey)`: switch zoom level, recalculate cellWidth, reflow coordinates
  - `getAvailableZooms()`: return list of configured zoom levels
  - Scroll anchoring: after zoom change, maintain visual center date
- [x] `Proof`: Write unit tests for:
  - Task → pixel mapping with various date ranges and zoom levels
  - Link polyline point generation
  - Round-trip date ↔ pixel conversion
  - Zoom level switching and coordinate reflow
  - Scroll anchoring center date preservation

Exit Criteria:

- [x] Task pixel coordinates change proportionally across zoom levels
- [x] Link polylines connect task start/end edges correctly
- [x] Round-trip conversion is idempotent within pixel precision
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && pnpm test` passes

### Phase 4 — WorkCalendar Engine

Status: completed
Targets: `src/gantt/utils/worktime.ts`

- Item Types: `Fix | Proof`

- [x] `Fix`: Create `WorkCalendar` interface:
  - `isWorkingDay(date)`, `addWorkDays(from, days)`, `subtractWorkDays(from, days)`, `countWorkDays(from, to)`, `getWorkMinutes(date)`
- [x] `Fix`: Create concrete `DefaultWorkCalendar` implementation:
  - `weekHours: Record<number, number>` (0=Sun … 6=Sat)
  - `holidays: Set<string>` (ISO date strings)
  - `extraWorkDays: Set<string>` (make-up work days)
- [x] `Fix`: Create `CalendarManager` strategy class:
  - `registerCalendar(id, calendar)`, `getCalendar(id?)`: three-level lookup (resource → task → global)
- [x] `Fix`: Integrate WorkCalendar into GanttStore:
  - Store accepts `calendars` in `parse()`
  - `updateTask()` recalculates dates if WorkCalendar is available
- [x] `Proof`: Write unit tests for:
  - Working day detection with custom week hours
  - Holiday and extra-work-day handling
  - `addWorkDays`/`subtractWorkDays` with non-working day skips
  - `countWorkDays` across weekends and holidays
  - CalendarManager three-level fallback logic
  - Integration: store auto-aligns dates through WorkCalendar

Exit Criteria:

- [x] `WorkCalendar` correctly skips weekends and holidays in date arithmetic
- [x] Three-level calendar lookup falls back as: resource → task → global
- [x] Unit tests cover edge cases (all-weekend schedule, consecutive holidays, month boundaries)
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && pnpm test` passes

## Draft Review Record

> Independently reviewed per `docs/plans/00-plan-authoring-and-execution-guide.md` Plan Review Rule.

- Reviewer / Agent: fresh sub-agent session (plan-review, 2026-07-20)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: Blocker=0, Major=0. Minor: Phase exit criteria include `pnpm test` (acceptable per package-local context). Non-Goals `§beyond store-level data` phrasing marginally ambiguous but internally consistent.

## Closure Gates

- [x] `GanttStore` with flat Map storage, coordinate precomputation, zoom management, and event emitter exists and is tested
- [x] Task/link/resource data models with all computed properties are typed and tested
- [x] WBS tree flattening with expand/collapse filtering works and is tested
- [x] Time scale engine produces correct intervals for all six zoom units and is tested
- [x] Pixel coordinate mapping (task → `$x`/`$y`/`$w`/`$h`, link → `$p`, round-trip date↔pixel) is tested
- [x] Zoom engine switches levels, reflows coordinates, anchors scroll center, and is tested
- [x] WorkCalendar with three-level fallback, `addWorkDays`/`subtractWorkDays`/`countWorkDays` is tested
- [x] No deferred live defects or contract drifts in scope
- [x] Affected owner docs synced (schemas.ts updated, definitions registered)
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### WorkCalendar — temporal-duration edge cases for multi-timezone projects

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: WorkCalendar operates on ISO dates only (no time-of-day precision). Multi-timezone duration calculation and daylight-saving transitions are out of scope for S1; the ERP scheduling use case operates within a single timezone per resource.
- Successor Required: `no`

## Non-Blocking Follow-ups

- `src/gantt/utils/worktime.ts` could be extracted to a shared `flux-core` utility if Kanban or Calendar components need similar calendar logic. Decision deferred until at least two consumers exist.
- GanttStore snapshot serialization (for `component:getState` handle) — not needed until S2 when the handle bridge is implemented.

## Closure

Status Note: All 4 phases completed. 114 unit tests pass. GanttStore, types, WBS tree, time scale engine (6 zoom units), layout computation (date↔pixel round-trip, task→pixel, link polyline), zoom with scroll anchoring, and WorkCalendar with three-level fallback are implemented and tested. S1 complete, ready for S2 rendering layer.

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session (mission-driver closure-audit, 2026-07-20)
- Evidence:
  - Phase 1 (Types + GanttStore): `src/gantt/gantt.types.ts` (85 lines, all interfaces + computed properties), `src/gantt/gantt-store.ts` (400 lines, full store class). Tests: 114/114 pass (7 test files). `GanttStore` with flat Maps, parse, recalcLayout, updateTask, link lifecycle, event emitter verified.
  - Phase 2 (WBS + Time Scale): `src/gantt/utils/date.ts` (diff/addDays/format/unit boundaries), `src/gantt/utils/scale.ts` (scale range, 6-unit intervals, smart scaling), `src/gantt/gantt-utils.ts` (flattenTree, parent index, toggle/expand/collapse). Tests confirm all six zoom units, tree flattening with expand/collapse, cross-year boundaries.
  - Phase 3 (Zoom + Layout): `src/gantt/utils/layout.ts` — date↔pixel round-trip (idempotent), task→pixels with minimum width, link polyline generation, zoom switching with scroll anchoring.
  - Phase 4 (WorkCalendar): `src/gantt/utils/worktime.ts` — DefaultWorkCalendar (isWorkingDay, addWorkDays, subtractWorkDays, countWorkDays), CalendarManager three-level fallback (resource→task→global). Integration with GanttStore updateTask via duration.
  - Full verification: `pnpm typecheck` (56/56), `pnpm build` (30/30), `pnpm lint` (30/30), `pnpm test` (114/114, 7 files).
  - Docs sync: `src/schemas.ts` updated with Gantt/Kanban/Calendar schemas. `src/scheduling-renderer-definitions.ts` with 3 renderer definitions. `docs/components/roadmap-scheduling.md` S1 items all `done`. `docs/logs/2026/07-20.md` updated with S1 completion.
  - Deferred items honest: WorkCalendar multi-timezone is `out-of-scope improvement` (valid classification). No live defects or contract drifts hidden.
  - Anti-hollow: All functions have real implementations (no empty bodies, no `return null` placeholders, no swallowed errors). All exports wired through `src/gantt/index.ts`.

Follow-up:

- S1 completion is prerequisite for S2 (Gantt rendering layer). See `docs/plans/2026-07-20-0800-2-s1-gantt-core-engine-plan.md` and future S2 plan.
