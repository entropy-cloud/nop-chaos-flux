# S0 — Scheduling Infrastructure: Package Creation And Registration

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/components/roadmap-scheduling.md`, `docs/components/complex-controls-organization-and-documentation.md`, `docs/analysis/complex-controls/research-*.md`
> Related: `docs/plans/2026-07-20-0800-2-s1-gantt-core-engine-plan.md`, `docs/plans/2026-07-20-0800-3-s4-calendar-core-plan.md`

## Purpose

Create the `@nop-chaos/flux-renderers-scheduling` package and register it in the monorepo, unblocking all scheduling component development (Gantt, Kanban, Calendar).

## Current Baseline

- 5 design docs exist at `docs/components/gantt/`, `kanban/`, `calendar/`, `barcode-input/`, `diff-view/` — S0.1 (research & design) is `done`
- Research reports at `docs/analysis/complex-controls/research-*.md`
- Package organization proposal at `docs/components/complex-controls-organization-and-documentation.md` (Phase 0 checklist at line 342, unchecked)
- `packages/flux-renderers-scheduling/` does not exist
- No scheduling renderer is registered in playground
- `docs/components/roadmap-scheduling.md` shows all S0–S9 phases as `proposed`; S0.2 and S0.3 are `proposed`
- No deferred items from prior plans relate to scheduling — all prior plans are `completed` and the pipeline is clear

## Goals

- Create `packages/flux-renderers-scheduling/` with standard package structure (package.json, tsconfig, vitest.config, src/index.ts, src/schemas.ts, src/scheduling-renderer-definitions.ts, src/styles.css)
- Add stub directories for `gantt/`, `kanban/`, `calendar/` under `src/`
- Register package in root `tsconfig.json` (project references)
- Register package paths in `tsconfig.base.json` and `vite.workspace-alias.ts`
- Register `registerSchedulingRenderers()` in playground `App.tsx`
- Verify `pnpm typecheck && pnpm build` passes
- Update `docs/components/roadmap-scheduling.md` S0 phase status to reflect S0.2/S0.3 `planned`

## Non-Goals

- No renderer implementation (no Gantt/Kanban/Calendar rendering logic)
- No barcode-input or diff-view work (barcode-input → `flux-renderers-form-advanced`, diff-view → `flux-renderers-content`)
- No design doc updates (all 5 design docs already exist)
- No `flux-guide/design-patterns/` updates (separate follow-up)

## Scope

### In Scope

- `packages/flux-renderers-scheduling/` scaffolding (package.json, tsconfig, tsconfig.build, vitest.config)
- `src/schemas.ts` — type stubs for `GanttSchema`, `KanbanSchema`, `CalendarSchema` referencing design docs
- `src/scheduling-renderer-definitions.ts` — skeleton `RendererDefinition[]` with type/displayName/category/sourcePackage/defaultSchema/component (component = placeholder div)
- `src/index.ts` — re-export stubs and `registerSchedulingRenderers()` function
- `src/styles.css` — empty stylesheet (package-level CSS placeholder)
- Stub directories: `src/gantt/`, `src/kanban/`, `src/calendar/` each with an `index.ts` stub
- Monorepo registration: root `tsconfig.json` reference, `tsconfig.base.json` paths, `vite.workspace-alias.ts` aliases
- Playground registration: import + call `registerSchedulingRenderers()` in `apps/playground/src/App.tsx`
- `docs/components/roadmap-scheduling.md` S0 phase status update

### Out Of Scope

- Any actual renderer component implementation
- Barcode-input or diff-view package changes
- `flux-guide/` design patterns or `docs/components/examples.manifest.json` updates

## Failure Paths

Not applicable — no API contracts, auth, or external integrations. Pure monorepo scaffolding.

## Test Strategy

档位选择：`建议有测`

本档选择：建议有测 — 验证 `src/scheduling-renderer-definitions.ts` 注册定义正确性（单测验证 definition array 结构和字段完整性），以及 `pnpm typecheck && pnpm build` 全量通过。

## Execution Plan

### Phase 1 — Package Scaffolding

Status: completed
Targets: `packages/flux-renderers-scheduling/`

- Item Types: `Fix`

- [x] Create `packages/flux-renderers-scheduling/` directory structure
- [x] Create `package.json` (name, workspace deps, exports, scripts) modeled after `flux-renderers-mobile`
- [x] Create `tsconfig.json` extending `../../tsconfig.base.json`
- [x] Create `tsconfig.build.json` with `outDir: "dist"`, `rootDir: "src"`
- [x] Create `vitest.config.ts` using `createSharedVitestConfig`
- [x] Create `src/schemas.ts` with type stubs for `GanttSchema`, `KanbanSchema`, `CalendarSchema`
- [x] Create `src/scheduling-renderer-definitions.ts` with skeleton definitions
- [x] Create `src/index.ts` with re-exports and `registerSchedulingRenderers()`
- [x] Create `src/styles.css` (empty placeholder)
- [x] Create `src/gantt/index.ts`, `src/kanban/index.ts`, `src/calendar/index.ts` (each exporting a placeholder stub)
- [x] Write focused unit test verifying definition array structure

Exit Criteria:

- [x] `packages/flux-renderers-scheduling/` exists with all 10 files listed above
- [x] `src/scheduling-renderer-definitions.ts` exports a `RendererDefinition[]` with 3 entries (gantt/kanban/calendar)
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes

### Phase 2 — Monorepo Registration

Status: completed
Targets: `../../tsconfig.json`, `../../tsconfig.base.json`, `../../vite.workspace-alias.ts`

- Item Types: `Fix`

- [x] Add `{ "path": "./packages/flux-renderers-scheduling" }` to root `tsconfig.json` references
- [x] Add `@nop-chaos/flux-renderers-scheduling` and `@nop-chaos/flux-renderers-scheduling/styles.css` paths to `tsconfig.base.json`
- [x] Add corresponding aliases to `vite.workspace-alias.ts`

Exit Criteria:

- [x] Root `pnpm typecheck` passes

### Phase 3 — Playground Registration + Roadmap Sync

Status: completed
Targets: `apps/playground/src/App.tsx`, `docs/components/roadmap-scheduling.md`

- Item Types: `Fix | Decision`

- [x] Import and call `registerSchedulingRenderers()` in playground `App.tsx`
- [x] Update `docs/components/roadmap-scheduling.md`: change S0.2 and S0.3 from `proposed` to `planned`
- [x] Update `docs/logs/2026/07-20.md` with S0 completion summary

Exit Criteria:

- [x] `pnpm dev` starts playground without `flux-renderers-scheduling` import errors
- [x] `roadmap-scheduling.md` S0 items show `planned` status

## Draft Review Record

> To be filled by independent sub-agent review.

- Reviewer / Agent: TBD
- Verdict: TBD
- Rounds: TBD
- Findings addressed: TBD

## Closure Gates

- [x] `packages/flux-renderers-scheduling/` with all scaffolding files exists and is registered in monorepo
- [x] Playground imports `registerSchedulingRenderers()` without error
- [x] `roadmap-scheduling.md` S0 phase reflects S0.2/S0.3 as `planned`
- [x] No deferred live defects or contract drifts
- [x] Affected owner docs synced (roadmap-scheduling.md status update)
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None — S0 scope is self-contained with no deferred items.

## Non-Blocking Follow-ups

- `docs/components/complex-controls-organization-and-documentation.md` Phase 0 checklist at line 342 can be updated to check the "创建 flux-renderers-scheduling" item off after this plan completes.
- `docs/components/roadmap-scheduling.md` S0.3 (register manifest) — examples.manifest.json update not included in this plan; can be done alongside first actual renderer registration.

## Closure

Status Note: completed

Closure Audit Evidence: typecheck ✓ (56/56), build ✓ (30/30), lint ✓ (30/30), test ✓ (56/56). Package scaffolding, monorepo registration, playground registration, and roadmap sync all complete. Unit test with 5 tests covering definition array structure passes.

Follow-up:

- No remaining plan-owned work after S0 completion.
