# 1 — Scheduling Orphaned Code Cleanup

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: `docs/audits/2026-07-22-0908-open-audit-scheduling.md` Finding 1, `docs/audits/2026-07-22-0908-multi-audit-scheduling.md` Issues 2-3
> Related: `docs/plans/2026-07-22-2359-1-scheduling-p2-p3-residual-fixes.md`

## Purpose

Remove all remaining orphaned/dead code identified in the July 22 scheduling audits that was not covered by the completed P2/P3 residual fixes plan (`2026-07-22-2359-1`). This includes write-only refs, components with zero production importers, unused utility exports, and suppressable compiler warnings.

## Current Baseline

- The `2026-07-22-2359-1-scheduling-p2-p3-residual-fixes.md` plan resolved the Calendar dead components (`CalendarBatchScheduler`, `CalendarTimezoneSelector`, `CalendarResourceGroup`, `CalendarResourceHeader`, `useCalendarICal`) and Kanban dead hooks (`useKanbanAdder`, `useKanbanCollab`).
- All P0/P1 defects across scheduling's 4 components are fixed per the 11 completed scheduling plans.
- The scheduling package passes `typecheck`, `build`, `lint` (3 warnings), and `test` (600+).

**Remaining orphaned code (not covered by prior plans):**

| Item                       | Source         | File                                                | Status                                                              |
| -------------------------- | -------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `dataFingerprintRef`       | Open Finding 1 | `gantt.tsx:76,83`, `kanban-board.tsx:150,157`       | Write-only ref, never read anywhere                                 |
| `KanbanWipBadge` component | Multi Issue 2  | `kanban-wip-badge.tsx`                              | 9 test cases, 0% production imports                                 |
| `getMonthDays` export      | Multi Issue 2  | `calendar-date-utils.ts:110-117`                    | Exported but unused by any renderer                                 |
| React Compiler warnings    | Multi Issue 3  | `gantt-grid.tsx:41`, `use-kanban-virtualizer.ts:20` | 3 `react-hooks/incompatible-library` warnings from TanStack Virtual |

## Goals

- Remove `dataFingerprintRef` and its increment logic from both Gantt and KanbanBoard components
- Remove `KanbanWipBadge` component (no production imports)
- Remove or consolidate `getMonthDays` (delete if truly unused, or document as utility export)
- Suppress 3 React Compiler warnings with eslint-disable comments (documented as known TanStack Virtual compatibility gap)
- Verify no regressions: existing tests still pass, no new dead code

## Non-Goals

- Cross-cutting convention alignment (raw HTML → `@nop-chaos/ui`, memoization cleanup, etc.) — tracked separately in prior plans' deferred items
- Performance optimization beyond dead code removal
- Any changes to live behavioral code paths
- Removal of code that has _any_ production importers, even if indirect

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx` — `dataFingerprintRef` removal
- `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx` — `dataFingerprintRef` removal
- `packages/flux-renderers-scheduling/src/kanban/components/kanban-wip-badge.tsx` — component removal
- `packages/flux-renderers-scheduling/src/kanban/index.ts` — remove WipBadge export if present
- `packages/flux-renderers-scheduling/src/calendar/utils/calendar-date-utils.ts` — `getMonthDays` removal or deprecation
- `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx` — eslint-disable for TanStack Virtual
- `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-virtualizer.ts` — eslint-disable for TanStack Virtual
- Corresponding test file cleanup

### Out Of Scope

- Dead code already removed by prior plans (Calendar 5 components, Kanban dead hooks)
- DnD DnD coverage gaps (covered by separate plan)
- Integration test gap (covered by separate plan)
- Any behavioral code changes

## Failure Paths

Not applicable — pure deletion/suppression, no new behavioral paths.

## Test Strategy

档位选择：不适用 — deletion requires no new tests. Verify no regressions by ensuring existing tests still pass after removal.

## Execution Plan

### Phase 1 — Write-only refs

Status: completed
Targets: `gantt.tsx`, `kanban-board.tsx`

- Item Types: `Fix`

- [x] Remove `dataFingerprintRef` declaration, `prevDataRef`, and the `useEffect` block that compares data and increments the ref from `gantt.tsx:76-86`. The actual data-fetching/parsing logic that depends on data changes (e.g., `store.parse()`) should be triggered by a different mechanism (e.g., watching `resolved.tasks` directly) or remain as a simpler effect.
- [x] Remove `dataFingerprintRef` declaration, `prevDataRef`, and the `useEffect` from `kanban-board.tsx:150-161`. The `setLocalBoardData(newData)` call that was guarded by the ref comparison should remain — move it into the existing data flow or a simpler condition.
- [x] Verify `rg 'dataFingerprintRef' --include '*.ts' --include '*.tsx'` returns no matches after removal.

Exit Criteria:

- [x] `dataFingerprintRef` does not appear anywhere in the scheduling package (verified by grep)
- [x] No behavioral change — Gantt and KanbanBoard still parse/update data correctly

### Phase 2 — Dead components and unused exports

Status: completed
Targets: `components/kanban-wip-badge.tsx`, `kanban/index.ts`, `utils/calendar-date-utils.ts`

- Item Types: `Fix | Decision`

- [x] Remove `components/kanban-wip-badge.tsx` file. Remove any re-export from `kanban/index.ts`.
- [x] Remove `getMonthDays` from `utils/calendar-date-utils.ts` (and its test in `calendar-date-utils.test.ts`). If it is genuinely unused across the entire codebase, delete. If used by tests only, delete function and tests together.
- [x] Verify `rg 'KanbanWipBadge' --include '*.ts' --include '*.tsx'` and `rg 'getMonthDays' --include '*.ts' --include '*.tsx'` return zero production matches.

Exit Criteria:

- [x] `KanbanWipBadge` component removed from source tree (no production importers, verified by grep)
- [x] `getMonthDays` removed if unused (confirmed via grep)

### Phase 3 — React Compiler warning suppression

Status: completed
Targets: `gantt-grid.tsx`, `hooks/use-kanban-virtualizer.ts`

- Item Types: `Fix`

- [x] Add `// eslint-disable-next-line react-hooks/incompatible-library` before `useVirtualizer()` calls in `gantt-grid.tsx:40` and `hooks/use-kanban-virtualizer.ts:20`. Include a comment: `// TanStack Virtual not yet React-Compiler-compatible; known gap.`
- [x] Verify `pnpm lint` shows 0 warnings for the scheduling package

Exit Criteria:

- [x] `pnpm lint` passes with 0 warnings in `packages/flux-renderers-scheduling/`
- [x] Suppression comments include documented reason for future maintainers

## Draft Review Record

- Reviewer / Agent: mission-driver (this session)
- Verdict: pass (minor fixed inline)
- Rounds: 1
- Findings addressed: Fixed 3 incorrect file paths (Scope Phase 2/3 targets), removed non-existent test-file reference, fixed line-number drift `gantt-grid.tsx:41→40`, removed Rule-18 violations from Phase Exit Criteria (full verification belongs in Closure Gates only).

## Closure Gates

- [x] All orphaned code items (dataFingerprintRef, KanbanWipBadge, getMonthDays) removed from source tree
- [x] React Compiler warnings suppressed with documented eslint-disable comments
- [x] No behavioral regressions in Gantt, KanbanBoard, or Calendar rendering
- [x] All existing scheduling package tests pass
- [x] No remaining dead code with test coverage maintained (verified by grep)
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint` (0 errors, 0 warnings in scheduling package)
- [x] `pnpm test`
- [x] By independent sub-agent (fresh session) executed closure-audit completed and evidence recorded

## Deferred But Adjudicated

None — all in-scope items are removal/suppression with no deferred risk.

## Non-Blocking Follow-ups

- Future deep audits should check for write-only ref patterns across all packages, not just scheduling.

## Closure

Status Note: All in-scope items landed. live code verified; no deferred defects. Plan cleanly closed.

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent explore (fresh session, task `ses_0761a0af9ffertcabBmYIxnal2`)
- Evidence: Verified via grep — dataFingerprintRef zero matches. KanbanWipBadge file and all references removed. getMonthDays deleted from source and test. 3 eslint-disable comments verified in gantt-grid.tsx:40, use-kanban-virtualizer.ts:20, use-calendar-virtualizer.ts:23. All 9 closure gates pass (grep, lint, typecheck, build, test). Full details in audit summary above.

Follow-up:

- No remaining plan-owned work.
