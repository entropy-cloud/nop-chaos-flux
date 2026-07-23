# 2 Remediation: Scheduling Package — UI Consistency, Architecture, and Documentation

> Plan Status: active
> Last Reviewed: 2026-07-23
> Source: `docs/audits/2026-07-23-0714-multi-audit-scheduling.md`
> Related: `docs/plans/2026-07-23-0715-1-scheduling-remediation.md` (completed), `docs/plans/2026-07-23-0745-1-scheduling-code-fixes-and-tests.md` (Plan 1)

## Purpose

Close all UI presentation (CSS variables, component compliance), architecture, and documentation findings from the scheduling package audit that are NOT behavioral/test fixes.

## Current Baseline

- `pnpm typecheck` PASS, `pnpm lint` PASS, `pnpm test` 816/816 PASS
- 11 confirmed findings remain in UI, architecture, and documentation:

| ID          | Sev | Summary                                                                                                                                                             |
| ----------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F02         | P2  | Hardcoded hex/rgba colors in CSS — gantt.css:71 weekend bg `rgba(0,0,0,0.02)`, gantt.css:123 delete btn `color:white`, calendar-event-block.tsx:119 inline `'#fff'` |
| SCHED-24-01 | P2  | Gantt grid — 3 hardcoded color values instead of CSS variables (same set as F02)                                                                                    |
| SCHED-24-02 | P2  | Kanban — raw `<button>` for filter error dismiss at kanban-board.tsx:513 (not using `@nop-chaos/ui` `<Button>`)                                                     |
| SCHED-24-03 | P2  | Kanban — raw `<div role="dialog">` activity log panel at kanban-activity-log.tsx:98-134 (not using `@nop-chaos/ui` `<Sheet>`)                                       |
| F11         | P2  | Deprecated dead code still exported: `useKanbanAdder`, `GanttCompact`                                                                                               |
| F12         | P2  | `docs/references/quick-reference.md` missing scheduling package entry                                                                                               |
| F15         | P2  | kanban-board.tsx oversized (592 lines, exceeds 500-line guideline)                                                                                                  |
| F18         | P3  | Inconsistent naming conventions in barcode-input/utils/ directory (4 conventions in one directory)                                                                  |
| SCHED-24-04 | P3  | Barcode-input imports `useFocusTrap` from `../calendar/hooks/use-focus-trap.js` — cross-subdirectory coupling                                                       |
| SCHED-24-05 | P3  | Gantt undo-stack comments claim Kanban uses snapshot-based undo (false — Kanban uses command-based undo too)                                                        |
| SCHED-24-07 | P3  | Schema type definition location inconsistent — GanttSchema/CalendarSchema in schemas.ts, KanbanSchema/BarcodeInputSchema in respective .types.ts                    |

## Goals

- All hardcoded color values in scheduling package replaced with CSS variable references
- All raw HTML elements replaced with `@nop-chaos/ui` components where project conventions mandate
- Dead code exports removed
- `quick-reference.md` updated with scheduling package entry
- kanban-board.tsx split to under 500 lines
- barcode-input/utils naming standardized
- `useFocusTrap` extracted to shared location
- Stale comments corrected
- Schema type definitions unified

## Non-Goals

- Behavioral or test-quality fixes (handled by Plan 1)
- New feature development
- Changes outside `packages/flux-renderers-scheduling/`

## Scope

### In Scope

- F02, SCHED-24-01, SCHED-24-02, SCHED-24-03, F11, F12, F15, F18, SCHED-24-04, SCHED-24-05, SCHED-24-07
- Files across `packages/flux-renderers-scheduling/src/` and `docs/references/quick-reference.md`

### Out Of Scope

- Items assigned to Plan 1 (F04, F09, F10, F-44, F14, F-73/SCHED-24-06, F-83)
- Non-scheduling packages

## Test Strategy

档位选择：不适用 — 无行为变更 for CSS/UI/docs items. 建议有测 for architecture changes (extraction, file splitting) where existing tests may need path updates.

## Execution Plan

### Phase 1 — CSS Variable Migration

Status: planned
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt.css`, `calendar/components/calendar-event-block.tsx`

Item Types: `Fix`

- [ ] F02 + SCHED-24-01: gantt.css:71 — replace `background-color: rgba(0,0,0,0.02)` with `var(--color-muted)`
- [ ] F02 + SCHED-24-01: gantt.css:123 — replace `color: white` with `var(--color-destructive-foreground)`
- [ ] F02 + SCHED-24-01: calendar-event-block.tsx:119 — replace inline `'#fff'` with CSS variable via className or `var(--color-primary-foreground)`

Exit Criteria:

- [ ] No hardcoded `#[0-9a-fA-F]`, `rgba(`, or `rgb(` color values remain in scheduling package CSS or TSX files (verifiable via `rg '#[0-9a-fA-F]'` on scheduling CSS/TSX — expected matches only in third-party or print-only CSS)

### Phase 2 — UI Component Compliance

Status: planned
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`, `kanban/components/kanban-activity-log.tsx`

Item Types: `Fix`

- [ ] SCHED-24-02: Replace raw `<button type="button" className="ml-2 underline">` with `<Button variant="link" size="sm">` from `@nop-chaos/ui`
- [ ] SCHED-24-03: Replace raw `<div ref={...} role="dialog" aria-modal="true">` with `<Sheet>`, `<SheetContent>`, `<SheetHeader>`, `<SheetTitle>`, `<SheetClose>` from `@nop-chaos/ui`

Exit Criteria:

- [ ] kanban-board.tsx imports and uses `<Button>` from `@nop-chaos/ui` for filter error dismiss
- [ ] kanban-activity-log.tsx imports and uses `<Sheet>` family from `@nop-chaos/ui` with built-in focus trap, animations, keyboard handling
- [ ] Raw `<button>` (non-UI-component) count in kanban/ directory is zero
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (verify no test breakage from DOM structure change)

### Phase 3 — Architecture & Dead Code Cleanup

Status: planned
Targets: `packages/flux-renderers-scheduling/src/`

Item Types: `Fix`

- [ ] F11: Remove deprecated dead code exports — `useKanbanAdder` and `GanttCompact` files and barrel exports
- [ ] F15: Split kanban-board.tsx — extract reusable sub-components (toolbar, column-adder) to separate files; target <500 lines
- [ ] F18: Normalize naming conventions in barcode-input/utils/ directory to single convention (`*-utils.ts` or as determined by existing pattern)
- [ ] SCHED-24-04: Extract `useFocusTrap` hook to `src/shared/hooks/use-focus-trap.ts`; update imports in both calendar/ and barcode-input/
- [ ] SCHED-24-07: Unify schema type definitions — either all four in `schemas.ts` or all in their respective `.types.ts` files

Exit Criteria:

- [ ] F11: `useKanbanAdder` and `GanttCompact` no longer exported from package barrel; related files removed
- [ ] F15: kanban-board.tsx under 500 lines
- [ ] F18: All files in barcode-input/utils/ use consistent naming
- [ ] SCHED-24-04: `useFocusTrap` located at `src/shared/hooks/use-focus-trap.ts`; both calendar and barcode-input import from shared path
- [ ] SCHED-24-07: All four component schemas (Gantt, Kanban, Calendar, BarcodeInput) follow the same definition pattern
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes

### Phase 4 — Documentation

Status: planned
Targets: `docs/references/quick-reference.md`, `packages/flux-renderers-scheduling/src/gantt/undo-stack.ts`

Item Types: `Fix`

- [ ] F12: Add `@nop-chaos/flux-renderers-scheduling` section to `quick-reference.md` — component registration, schema types, key hooks, and renderer patterns for Gantt, Kanban, Calendar, BarcodeInput
- [ ] SCHED-24-05: Fix stale comments in `gantt/undo-stack.ts:7` (doc comment) and `:161-165` (FIXME) — correct "Kanban uses snapshot-based undo" to "Kanban also uses command-based undo"

Exit Criteria:

- [ ] F12: `quick-reference.md` has a scheduling section with Package Directory Map entry, component registration names, schema types, and hook references
- [ ] SCHED-24-05: `gantt/undo-stack.ts` comments accurately state "Kanban also uses command-based undo"
- [ ] `pnpm lint` passes

## Draft Review Record

- Reviewer / Agent: `nop-chaos-flux` mission driver (this session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Count corrected: "12 confirmed findings" → "11 confirmed findings" (table listed 11)
  - Phase 1 Exit Criteria: removed `pnpm typecheck`/`pnpm build` (CSS-only Phase per Rule 18 — full verification belongs in Closure Gates)
  - Added `## Draft Review Record` section (was missing from template)

## Closure Gates

- [ ] All Phase 1-4 Exit Criteria satisfied
- [ ] No hardcoded color values in scheduling package source files
- [ ] No raw HTML where `@nop-chaos/ui` components should be used
- [ ] Dead code removed, naming standardized, schemas unified
- [ ] `quick-reference.md` synced to live baseline
- [ ] No deferred in-scope live defect or contract drift
- [ ] Affected owner-docs (styling-system.md, quick-reference.md) synced
- [ ] Independent closure-audit by fresh sub-agent session completed
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

(To be filled during execution if any item needs deferral)

## Non-Blocking Follow-ups

(To be filled during execution if any non-blocking residual remains)
