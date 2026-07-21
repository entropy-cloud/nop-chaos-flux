# 1 Dead/Unwired Module Cleanup — Scheduling + Content

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-21-1920-open-audit-scheduling.md` (F-51, F-52, F-53, F-59), `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (S01-02)
> Related: Plans 2 (`docs/plans/2026-07-21-2100-2-scheduling-package-hardening.md`), 3 (`docs/plans/2026-07-21-2100-3-convention-alignment-scheduling-content.md`)

## Purpose

Clean up three modules that compile and ship but are never integrated into any render pipeline, plus one API-surface leak from the same dead-module pattern. Close the "done-without-integration" gap that masks their true status and misleads roadmap tracking.

## Current Baseline

- `packages/flux-renderers-scheduling/src/gantt/gantt-search.ts` (11 lines) exports `searchTasks` — zero imports across the entire codebase (F-51).
- `packages/flux-renderers-scheduling/src/gantt/components/multi-select.tsx` exports `createMultiSelectState`, `handleMultiSelectClick`, `clearSelection`, `selectAll` — only imported by its own test file (F-52).
- `packages/flux-renderers-content/src/diff-view/components/diff-virtual-list.tsx` exports `DiffVirtualList` + `shouldVirtualize` — zero production imports (F-53).
- The scheduling roadmap (`docs/components/roadmap-scheduling.md`) reports S3.9 (multi-select) and S9.6 (virtual-list) as "done" despite neither being wired (F-52, F-53 context).
- `packages/flux-renderers-scheduling/src/index.ts` re-exports `GanttTaskData` and `GanttLinkData` from internal gantt types — these are already typed through `GanttSchema` and pollute the public barrel (S01-02).
- 855 tests pass but 3 untested-or-isolation-tested modules flow through the gap; the 80% coverage threshold and `--passWithNoTests` do not catch dead code (F-59).
- All four source-code findings are `Certain` confidence.

## Goals

- Each dead module is either wired into the active render pipeline or removed from source + barrel + any roadmap claims.
- `roadmap-scheduling.md` entries S3.9 and S9.6 honestly reflect wired-or-removed status.
- Internal gantt types are removed from the public barrel; consumers use `GanttSchema` types exclusively.

## Non-Goals

- Not auditing the full scheduling roadmap for further dead modules — only the three flagged here and the barrel re-export.
- Not introducing the multi-select or virtual-list features if they are removed rather than wired (that would be a successor feature plan).

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/gantt-search.ts`
- `packages/flux-renderers-scheduling/src/gantt/components/multi-select.tsx`
- `packages/flux-renderers-content/src/diff-view/components/diff-virtual-list.tsx`
- `packages/flux-renderers-scheduling/src/index.ts` (type re-exports)
- `docs/components/roadmap-scheduling.md` (S3.9, S9.6 entries)
- Barrel exports for any removed module

### Out Of Scope

- F-55, F-56, F-54, F-57, F-58 (covered in Plans 2 and 3)
- S14-01, S14-02, S14-03, S01-01, S13-01, S15-01 (covered in Plan 2)
- Any dead code not flagged in F-51..F-53 or S01-02

## Test Strategy

建议有测 — each surviving module must have an integration test verifying it is reachable from the renderer entry point.

## Execution Plan

### Phase 1 — Audit each dead module's viability + barrel hygiene

Status: completed
Targets: `gantt-search.ts`, `multi-select.tsx`, `diff-virtual-list.tsx`, `index.ts` barrel

- Item Types: `Decision | Fix`

- [x] Determine for each of the 3 modules: (a) wire into render pipeline, or (b) remove from source + barrel + roadmap
- [x] Remove `GanttTaskData` / `GanttLinkData` re-exports from `index.ts` — consumers use schemas
- [x] If wiring: identify the integration point and any missing dependencies
- [x] If removal: update roadmap doc to correct the "done" claim

Exit Criteria:

- [x] Each module has a documented decision: keep-and-wire or remove
- [x] Barrel re-exports cleaned up

### Phase 2 — Implement decisions

Status: completed
Targets: Same files + barrel exports + roadmap doc

- Item Types: `Fix`

- [x] For kept modules: wire into render pipeline and add integration test
- [x] For removed modules: delete source files and remove from barrel exports
- [x] Update `roadmap-scheduling.md` S3.9, S9.6 to reflect actual state

Exit Criteria:

- [x] Grep for `gantt-search`, `multi-select`, `diff-virtual-list` shows only intentional references (barrel re-exports if kept, zero if removed)

## Draft Review Record

- Reviewer / Agent: mission_driver (this session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Fixed wrong roadmap path (`docs/components/scheduling/ → docs/components/`) in Current Baseline and Scope
  - Removed `pnpm typecheck`/`pnpm build` from Phase 2 Exit Criteria per Minimum Rule 18 (belongs in Closure Gates only)
  - Filled empty `> Related:` line with references to sibling Plans 2 and 3

## Closure Gates

- [x] All in-scope dead modules resolved (kept-and-wired or removed)
- [x] Barrel re-exports of internal gantt types removed
- [x] Roadmap doc (S3.9, S9.6) reflects resolved state
- [x] No in-scope live defect or contract drift silently downgraded to deferred
- [x] Affected owner docs updated (roadmap)
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

(none)

## Non-Blocking Follow-ups

(none)

## Closure

Status Note: 所有目标 dead module 已从源码和 barrel 中移除；barrel 中 GanttTaskData/GanttLinkData 重导出已清理；roadmap S3.9/S9.6 已更新为 removed；typecheck/build/lint/test 全绿。

Closure Audit Evidence:

- Auditor / Agent: mission_driver (fresh closure-audit session)
- Evidence: Live repo verification — grep confirms gantt-search.ts, multi-select.tsx, diff-virtual-list.tsx zero matches; scheduling `index.ts` no longer exports GanttTaskData/GanttLinkData; roadmap S3.9/S9.6 status `removed`. Workspace verification: `pnpm typecheck` 56/56 ✓, `pnpm build` 30/30 ✓, `pnpm lint` 30/30 ✓ (2 pre-existing warnings), `pnpm test` 56/56 all passed. Independent re-verification of all 5 Closure Gates items completed.
