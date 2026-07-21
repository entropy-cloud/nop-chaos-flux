# 2 Scheduling Contract Drift & Dead Code

> Plan Status: active
> Last Reviewed: 2026-07-22
> Source: `docs/audits/2026-07-21-1920-open-audit-scheduling.md` (F-55/F-56/F-57/F-60/F-61/F-64/F-65/F-66/F-67/F-68/F-69/F-70), `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (prior-remediation residual: kanban-undo-stack FIXME)

## Purpose

Align the scheduling package's registered schema contracts (renderer definitions, types, CSS selectors) with actual renderer behavior. Eliminate dead API surface, dead components, type drift between duplicated type definitions, and the documented FIXME residual from prior remediation.

## Current Baseline

- F-55: Kanban `filterCard` prop registered as `kind: 'prop'`, typed as `string` in definition, expected as `(card, text) => boolean` by hook, never passed to hook by board. Three-way contract failure.
- F-56: 16 Kanban schema props/events registered but never consumed by component body (~33% of Kanban field definitions).
- F-57: Kanban DnD `data-dragging`/`data-drop-target` CSS selectors defined but never applied to DOM. `moveCardKeyboard` never wired to keyboard events.
- F-60: 15+ Calendar schema props/events never consumed. 7 dead components (`CalendarBatchScheduler`, `CalendarTimezoneSelector`, `CalendarResourceGroup`, `CalendarResourceHeader`, `useCalendarICal`, `useCalendarExport`) with full test suites but zero production imports.
- F-61: BarcodeInput ignores `required`, `trimContents`, `minLength`, `maxLength`, `pattern`, `validate`, `continuousScan` — form validation bypassed for barcode fields.
- F-64: Critical path algorithm ignores work calendar — uses calendar days.
- F-65: Resource load average divides by `totalDaysWithWork` instead of `totalDays` — misleading metric.
- F-66: `GanttResource`/`GanttAssignment`/`GanttColumn`/`GanttScale`/`GanttZoomLevel` duplicated between `schemas.ts` and `gantt.types.ts` with type drift (e.g. `id: string` vs `id: string | number`).
- F-67: `BaselineBars` component (~2.5 KB) never imported anywhere. Dead code with full test coverage.
- F-68: Kanban undo stack hard-codes `type: 'moveCard'` for all mutations (column reorder, card add/remove all recorded as `moveCard`).
- F-69: Kanban `deepCloneBoard`/`cloneBoard` shallow-clones nested `data`/`meta` — undo snapshot corruption for nested objects.
- F-70: `react-dom` missing from peer dependencies.
- Prior residual: `kanban-undo-stack.ts:42-46` FIXME about snapshot-vs-command undo pattern unresolved.

## Goals

- Kanban `filterCard` prop wired end-to-end: schema → type → hook → board
- All 16 Kanban unconsumed props either implemented or removed from schema definition
- Kanban DnD visual feedback (`data-dragging`, `data-drop-target`) applied to DOM by board component
- All 15+ Calendar unconsumed props/events either implemented or removed from schema definition
- Calendar dead components removed or consolidated
- BarcodeInput validation props enforced on input
- Gantt critical path incorporates work calendar
- Gantt resource load metric uses correct denominator
- Type duplicates between `schemas.ts` and `gantt.types.ts` unified (single source of truth)
- `BaselineBars` dead component removed or wired into Gantt layout
- Kanban undo stack emits correct command type per mutation
- Kanban undo cloning deep-copies nested structures
- `react-dom` added as peer dependency
- Kanban undo-stack FIXME resolved

## Non-Goals

- User-facing functional bugs (Gantt drag ghost, scheduler-config stuck, etc.) — Plan 1
- Reactive subscription precision — Plan 3
- Error propagation fidelity — Plan 3
- Accessibility — Plan 3

## Scope

### In Scope

- `scheduling-renderer-definitions.ts` — Kanban/Calendar field definitions
- `kanban.types.ts` — `filterCard` type
- `use-kanban-filter.ts` — hook signature
- `kanban-board.tsx` — prop consumption, DnD visual feedback wiring
- `kanban.css` — drag/drop CSS selectors
- `kanban-undo-stack.ts` — command types, deep clone, FIXME residual
- `kanban-helpers.ts` — clone utilities
- `calendar/calendar.tsx` — prop/event consumption
- `calendar.css` — weekend styling
- `scheduling-renderer-definitions.ts` — Calendar field definitions
- `/src/schemas.ts`, `src/gantt/gantt.types.ts` — type unification
- `src/gantt/components/critical-path.ts` — work calendar
- `src/gantt/components/resource-load.ts` — denominator fix
- `src/gantt/components/baseline-bars.tsx` — dead component
- `src/barcode-input/barcode-input.tsx` — validation wiring
- `src/barcode-input/barcode-input-schemas.ts` — schema props
- `package.json` — peer deps

### Out Of Scope

- `CalendarBatchScheduler`/`CalendarTimezoneSelector`/`CalendarResourceGroup`/`CalendarResourceHeader` — dead but tested; implementation of removal/wiring may be deferred per component-level impact assessment (evaluation/decision is in scope as Workstream 2 Decision item)
- Reactive subscription optimisation — Plan 3

## Execution Plan

### Workstream 1 — Kanban contract alignment

Status: planned
Targets: `kanban-board.tsx`, `kanban.types.ts`, `use-kanban-filter.ts`, `kanban.css`, `scheduling-renderer-definitions.ts`, `kanban-undo-stack.ts`, `kanban-helpers.ts`

- Item Types: `Fix | Proof`

- [ ] F-55: Wire `filterCard` prop through `kanban-board.tsx` → `useKanbanFilter`. Resolve schema type: if `string` is the schema representation, evaluate it as an expression; if function is the runtime expectation, ensure the prop resolves correctly.
- [ ] F-56: Audit all 16 Kanban registered props/events. For each: either implement consumption in board component, or remove from definition with a deprecation note. Add regression test asserting no `fields` entry is silently unconsumed.
- [ ] F-57: Apply `data-dragging`/`data-drop-target` attributes to dragged card/drop column elements. Wire `moveCardKeyboard` to card `onKeyDown` events (Space/Enter → drag mode, Arrow keys → move, Enter → confirm, Escape → cancel).
- [ ] F-68: Replace hardcoded `type: 'moveCard'` with correct mutation type (`moveCard`, `addCard`, `removeCard`, `reorderColumn`) based on the actual operation.
- [ ] F-69: Implement deep clone for nested `data`/`meta` objects in `deepCloneBoard`/`cloneBoard`. Use structured clone or recursive shallow-to-nth-level.
- [ ] Prior residual: Resolve FIXME at `kanban-undo-stack.ts:42-46` — decide snapshot-vs-command undo strategy and implement consistently.

Exit Criteria:

- [ ] `filterCard` prop produces correct filtering behavior in kanban board
- [ ] All 16 previously-unconsumed Kanban props are either consumed or removed from definitions
- [ ] DnD visual feedback (opacity, highlight) visible during drag operations
- [ ] `moveCardKeyboard` accessible via keyboard (Space/Arrow/Enter)
- [ ] Undo stack records correct command type per mutation
- [ ] Undo snapshots survive external mutation of nested `data`/`meta` objects
- [ ] Kanban-undo FIXME resolved or replaced with documented decision

### Workstream 2 — Calendar contract alignment

Status: planned
Targets: `calendar/calendar.tsx`, `scheduling-renderer-definitions.ts`, calendar dead components

- Item Types: `Fix | Decision | Follow-up`

- [ ] F-60: Audit all 15+ Calendar unconsumed props/events/reactions. For each: implement consumption or remove from definition. Prioritize: `viewOwnership`/`viewStatePath`, `dateOwnership`/`dateStatePath`, `onBatchSchedule`, `onTimezoneChange`, `onGroupToggle`, `loadAction`. For unconsumed regions (`loading`, `empty`, `body`): implement slot rendering.
- [ ] F-60: Evaluate dead components (`CalendarBatchScheduler`, `CalendarTimezoneSelector`, `CalendarResourceGroup`, `CalendarResourceHeader`, `useCalendarICal`, `useCalendarExport`): remove if no path to integration, or wire into calendar layout if scheduled.

Exit Criteria:

- [ ] All previously-unconsumed Calendar props/events are either consumed or removed with documented decision
- [ ] Calendar `loading`/`empty`/`body` region slots rendered when schema provides content
- [ ] Dead Calendar components either removed or wired (decision per component recorded)

### Workstream 3 — BarcodeInput, Gantt, type, and infrastructure

Status: planned
Targets: `barcode-input/barcode-input.tsx`, `barcode-input/barcode-input-schemas.ts`, `critical-path.ts`, `resource-load.ts`, `schemas.ts`, `gantt.types.ts`, `baseline-bars.tsx`, `package.json`

- Item Types: `Fix | Decision | Proof`

- [ ] F-61: Wire BarcodeInput validation props (`required`, `trimContents`, `minLength`, `maxLength`, `pattern`, `validate`, `continuousScan`) into the input component. Add form validation assertions via `props.helpers.evaluate` or `props.meta`.
- [ ] F-64: Replace calendar-day calculation in `critical-path.ts` with work-calendar-aware `diffWorkingDays` or `diffWorkingMs` using `WorkCalendar` from `worktime.ts`.
- [ ] F-65: Change denominator from `totalDaysWithWork` to `totalDays` in `resource-load.ts:84`. Add clarifying comment if zero-load days should be weighted differently.
- [ ] F-66: Deduplicate `GanttResource`, `GanttAssignment`, `GanttColumn`, `GanttScale`, `GanttZoomLevel` — pick one canonical home (`gantt.types.ts`). Remove copies from `schemas.ts` and re-export from canonical source. Fix `id` type drift (`string` vs `string | number`).
- [ ] F-67: Either wire `BaselineBars` into Gantt layout (render baselines from `GanttTaskData.baselines`) or remove dead component. If removed, archive or delete test file.
- [ ] F-70: Add `react-dom` to `peerDependencies` in `package.json`.

Exit Criteria:

- [ ] Barcode-input form field enforces `required`, `pattern`, `minLength`/`maxLength` constraints
- [ ] Critical path durations are correct when work calendar includes non-working days
- [ ] Resource load average accurately reflects utilization across all days
- [ ] `GanttResource.id` type consistent across codebase (`string | number`)
- [ ] No duplicated Gantt type definitions in `schemas.ts`
- [ ] `BaselineBars` either rendered in Gantt layout or removed from source tree
- [ ] `react-dom` present in peerDependencies

## Failure Paths

N/A — each workstream is self-contained within its component. No cross-stream blocking dependencies.

## Test Strategy

档位选择：`必须自动化`

Contract alignment (Workstreams 1-2) requires adding tests that assert registered schema definitions correspond to consumed behavior. Add a shared contract-honesty test for the scheduling package's renderer definitions. Type dedup (Workstream 3) should have type-level tests that verify unified types compile correctly from both `schemas.ts` and renderer code. Validation wiring (F-61) requires form-integration test.

## Closure Gates

- [ ] All in-scope confirmed contract drifts (F-55/F-56/F-57/F-60/F-61/F-64/F-65/F-66/F-67/F-68/F-69/F-70) resolved
- [ ] No unconsumed schema props/events remain in Kanban/Calendar definitions without explicit exemption
- [ ] Dead components either removed or wired with documented decision
- [ ] Focused verification confirms each fix addresses root cause, not just symptoms
- [ ] No contract drift from in-scope set silently downgraded to deferred/follow-up
- [ ] Affected owner docs updated (or written as No owner-doc update required)
- [ ] By independent sub-agent (fresh session) executed closure-audit completed with evidence recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test` (scheduling package + full suite)

## Draft Review Record

> To be filled after independent sub-agent review. See Plan Review Rule.

- Reviewer / Agent: AI review session (fresh context, mission-driven review)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: None (Blocker/Major). Minor: Out Of Scope wording clarified (evaluation in scope, implementation deferred); Workstream 3 Item Types expanded to include `Decision`. All file paths, sources, and references verified against live repo.

## Deferred But Adjudicated

### Calendar dead components removal or wiring

- Classification: `watch-only residual`
- Why Not Blocking Closure: Dead components have full test coverage and are zero-cost to keep. Removal or wiring is a maintenance quality decision, not a contract drift. The unconsumed props/events (explicit schema contract) are the blocking issue; dead components are secondary.
- Successor Required: `no` (handled within Workstream 2 Exit Criteria as a Decision for each component)

## Non-Blocking Follow-ups

- None.

## Closure

Status Note: TBD

Closure Audit Evidence: TBD

Follow-up: TBD
