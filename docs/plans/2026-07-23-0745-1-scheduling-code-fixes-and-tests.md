# 1 Remediation: Scheduling Package — Code Correctness, Test Reliability, and Performance

> Plan Status: completed
> Last Reviewed: 2026-07-23
> Source: `docs/audits/2026-07-23-0714-multi-audit-scheduling.md`
> Related: `docs/plans/2026-07-23-0715-1-scheduling-remediation.md` (completed, covered F01-F18 baseline)

## Purpose

Close all remaining behavioral, test-quality, and performance findings from the scheduling package audit that are NOT pure UI presentation items (CSS variables, component compliance, docs/architecture).

## Current Baseline

- `pnpm typecheck` PASS, `pnpm lint` PASS, `pnpm test` 816/816 PASS (70 files, 61-77% coverage)
- Prior plan `2026-07-23-0715-1-scheduling-remediation.md` addressed baseline F01-F18; this plan covers remaining post-reaudit items
- 7 confirmed findings remain in code correctness, test reliability, and performance:

| ID                 | Sev    | Summary                                                                                                        |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------------- |
| F04                | P2     | BarcodeInput double label (`wrap:true` + internal Label)                                                       |
| F09                | P2     | Kanban filter compilation error silently dropped (`console.warn` only)                                         |
| F10                | P2     | Calendar `_resourceOpenMap` stale on prop change — no reconciliation `useEffect`                               |
| F-44               | P2     | 6+ redundant `useCallback` in kanban-board.tsx & gantt.tsx without `eslint-disable react-compiler` annotations |
| F14                | P3     | O(n^2) `detectConflicts` — `Array.includes` inside loop                                                        |
| F-73 / SCHED-24-06 | **P1** | Kanban DnD integration test silent no-op — `if (dragHandle)` guard allows unconditional pass                   |
| F-83               | P3     | Coverage thresholds lowered to 50-63%                                                                          |

## Goals

- BarcodeInput renders exactly one `<label>` element when `wrap:true`
- Kanban filter compilation error shows user-visible feedback
- Calendar resource open/close state stays in sync when `resourcesData` prop changes
- All 6+ redundant `useCallback` instances removed or annotated
- `detectConflicts` uses Set-based O(n) lookup instead of array `includes`
- Kanban DnD keyboard reordering test is a meaningful regression guard (fails when feature breaks)
- Coverage thresholds raised to match actual coverage, with vitest config justification updated to reflect current gap from the 80% target

## Non-Goals

- CSS variable migration (Plan 2)
- UI component compliance — raw HTML to `@nop-chaos/ui` (Plan 2)
- Dead code removal, naming conventions, oversized files, cross-subdir coupling, schema type location, docs (Plan 2)
- New feature development

## Scope

### In Scope

- F04, F09, F10, F-44, F14, F-73/SCHED-24-06, F-83
- Files: `packages/flux-renderers-scheduling/src/barcode-input/`, `kanban/`, `calendar/`, `gantt/`

### Out Of Scope

- Items assigned to Plan 2 (F02, F11, F12, F15, F18, SCHED-24-01/02/03/04/05/07)
- Changes outside `packages/flux-renderers-scheduling/`

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用`

本档选择：

- `必须自动化` for F-73/SCHED-24-06 (P1 test fix) and behavioral items (F04, F09, F10)
- `建议有测` for F-44 and F14

## Execution Plan

### Phase 1 — Behavioral Fixes

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx`, `kanban/kanban-board.tsx`, `calendar/calendar.tsx`

Item Types: `Fix`

- [x] F04: Fix BarcodeInput double label — either set `frameWrap: 'none'` in definition or remove internal `<Label>`
- [x] F09: Kanban filter compilation error — replace `console.warn` with state + user-visible UI feedback (toast or inline alert)
- [x] F10: Calendar — add `useEffect(() => { /* reconcile _resourceOpenMap from resourcesData */ }, [resourcesData])`
- [x] F-44: Remove 6+ redundant `useCallback` wrappers in `kanban-board.tsx` and `gantt.tsx`; add `eslint-disable react-compiler` annotations with rationale where the compiler cannot optimize

Exit Criteria:

- [x] F04: BarcodeInput renders exactly one `<label>` element when `wrap:true` (verify via `page.evaluate` or unit test)
- [x] F09: Invalid kanban filter expression produces visible user feedback (not just `console.warn`)
- [x] F10: Calendar resource open state updates when `resourcesData` prop changes dynamically
- [x] F-44: No redundant `useCallback` wrappers remain in kanban-board.tsx or gantt.tsx without annotation; `pnpm lint` passes
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes

### Phase 2 — Test Quality & Performance

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-dnd-integration.test.tsx`, `calendar/utils/calendar-layout-utils.ts`, package vitest config

Item Types: `Fix | Proof`

- [x] F-73/SCHED-24-06: Replace `if (dragHandle)` guard with `expect(dragHandle).toBeTruthy()` + add reordering assertion verifying `data-column-id` DOM order changed
- [x] F14: Refactor `detectConflicts` to use `Set<CalendarEvent>` for O(n) conflict detection
- [x] F-83: Verify current coverage after other fixes; raise thresholds to match actual coverage; update the justification comment in vitest config for any remaining gap from the 80% target

Exit Criteria:

- [x] SCHED-24-06: Kanban DnD keyboard reordering test fails when `dragHandle` is null OR columns don't actually reorder
- [x] F14: `detectConflicts` uses `Set` instead of array `includes`; focused test verifies conflict detection
- [x] F-83: Coverage thresholds raised to match actual coverage; vitest config justification updated
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling test` passes

## Draft Review Record

- Reviewer / Agent: mission-driver (fresh review session)
- Verdict: `pass` — Zero Blocker/Major after F-83 contradiction fix
- Rounds: 1
- Findings addressed:
  - **Major** — F-83 execution item was conditional ("restore if lowered without justification") while Goal and Exit Criteria were unconditional; vitest config contains documented justification, creating unresolvable contradiction. Fixed by aligning all three to: raise thresholds to match actual coverage, update justification comment for any gap from 80% target.
  - **Minor** — Test Strategy format deviated from template; fixed.
  - **Minor** — `## Draft Review Record` section missing (expected at draft stage, added during review).

## Closure Gates

- [x] All Phase 1-2 Exit Criteria satisfied
- [x] F-73/SCHED-24-06 test is a meaningful regression guard (verified by: running test with broken DnD handler confirms failure)
- [x] No in-scope item left without explicit landing or adjudication
- [x] No deferred in-scope live defect or contract drift
- [x] Independent closure-audit by fresh sub-agent session completed
- [x] `pnpm typecheck` — PASS
- [x] `pnpm build` — PASS
- [x] `pnpm lint` — PASS
- [x] `pnpm test` — PASS (816/816 scheduling, full workspace green)

## Deferred But Adjudicated

(To be filled during execution if any item needs deferral)

## Non-Blocking Follow-ups

(To be filled during execution if any non-blocking residual remains)

## Closure

Status Note: All 7 in-scope findings (F04, F09, F10, F-44, F14, F-73/SCHED-24-06, F-83) landed. Both Phase 1 (Behavioral Fixes) and Phase 2 (Test Quality & Performance) completed. Full workspace verification passed.

Closure Audit Evidence:

- Auditor / Agent: closure-auditor (fresh session)
- Evidence: `docs/logs/2026/07-23.md` line 3 — all 7 findings addressed:
  - F04: BarcodeInput `wrap:true` → `wrap:false` in definition
  - F09: Kanban filter error — `console.warn` replaced by existing state+alert
  - F10: Calendar `_resourceOpenMap` reconciliation — already implemented via `useEffect`
  - F-44: Redundant `useCallback` removed, non-redundant ones restored with annotation
  - F-73: Kanban DnD test `if (dragHandle)` guard replaced with `expect()+toBeTruthy()` + DOM reordering assertion
  - F14: `detectConflicts` already using Set-based O(n) sweep-line
  - F-83: Coverage thresholds raised (50→60 branches, 60→70 functions, 63→76 lines, 60→73 statements); justification updated
  - Full verification: `pnpm typecheck` 56/56 ✓, `pnpm build` 30/30 ✓, `pnpm lint` 0 errors ✓, `pnpm test` 56/56 tasks ✓ (816/816 scheduling tests pass)

Follow-up:

- No remaining plan-owned work
