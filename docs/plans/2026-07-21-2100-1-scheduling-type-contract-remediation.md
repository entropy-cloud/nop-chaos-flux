# Scheduling — Type System, Contract Surface & Dead Code Remediation

> Plan Status: active
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-21-1920-open-audit-scheduling.md` (F-46, F-48, F-49), `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (03-01, 03-02, 03-03, 03-04, 17-03, 17-04)
> Related: `docs/plans/2026-07-21-2100-2-scheduling-runtime-lifecycle-remediation.md`, `docs/plans/2026-07-21-2100-3-scheduling-surface-quality-remediation.md`

## Purpose

Resolve all type-system, API-surface, dead-code, and naming findings from the two open audits of `flux-renderers-scheduling`. Fix contract drift so downstream consumers and subsequent runtime-fix plans work against correct types.

## Current Baseline

- `GanttSchema.tasks`/`.links` reference deprecated `GanttTask`/`GanttLink`; replacement `GanttTaskData`/`GanttLinkData` exists in `gantt.types.js` but `GanttSchema` cannot accept them — deprecation unfollowable (F-49 / 03-01).
- `BarcodeQueueItem` defined identically in two files (`barcode-input.types.ts` and `barcode-queue.ts`) — duplication risk (03-02).
- Five Kanban auxiliary types (`KanbanEvents`, `KanbanColumnConfig`, `KanbanCardConfig`, `BoardData`, `BoardItem`) not publicly exported from `index.ts` (03-03).
- `onCardUpdate` defined in `KanbanEvents` but absent from `KanbanSchema` / fields array — orphan event (03-04).
- `useOfflineDetection` exported but zero production imports; also implements wrong React pattern (render-time listener registration) (F-46 / 17-03).
- `barcode-input-renderer.tsx` uses `-renderer` suffix inconsistent with sibling sub-modules `gantt.tsx`, `calendar.tsx`, `kanban-board.tsx` (17-04).
- Four `as any` casts on event dispatch in `barcode-input-renderer.tsx` — type safety bypass on production core path (F-48). Same pattern was fixed for `UpdateTaskCommand` (F-40) but barcode-input not caught.

## Goals

- Remove dead `useOfflineDetection` export or rename to non-hook name.
- Migrate `GanttSchema` from deprecated types to `GanttTaskData`/`GanttLinkData` so deprecation is followable.
- Deduplicate `BarcodeQueueItem`.
- Publicly export all Kanban auxiliary types.
- Either wire `onCardUpdate` to renderer or remove from `KanbanEvents`.
- Rename `barcode-input-renderer.tsx` to `barcode-input.tsx`.
- Eliminate `as any` on barcode event dispatch with typed patterns.

## Non-Goals

- Not changing runtime behavior (effect deps, state ownership, performance) — Plan 2.
- Not fixing CSS, a11y, test, or doc gaps — Plan 3.
- Not addressing same-pattern issues outside scheduling package.

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.ts` — dead code removal
- `packages/flux-renderers-scheduling/src/schemas.ts` — migrate `GanttSchema` types, correct `@deprecated` JSDoc
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.types.ts` and `barcode-queue.ts` — deduplicate `BarcodeQueueItem`
- `packages/flux-renderers-scheduling/src/index.ts` — add missing Kanban type exports
- `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts` — mirror schema type changes if needed
- `packages/flux-renderers-scheduling/src/kanban/kanban.types.ts` — either wire or remove `onCardUpdate`
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx` — `as any` elimination; rename file
- All consumer import paths that reference the renamed file

### Out Of Scope

- Other `as any` casts outside scheduling (adjudicated as acceptable per Dimension 13 compliance)
- Cross-package type contract verification
- Runtime behavior changes

## Test Strategy

档位选择：`必须自动化` — type and contract changes must not regress type checking. Focused verification: `pnpm typecheck --filter @nop-chaos/flux-renderers-scheduling`.

## Execution Plan

### Phase 1 — Dead code removal & naming fixes

Status: completed
Targets: `barcode-queue.ts`, `barcode-input-renderer.tsx`, `index.ts`

- Item Types: `Fix`

- [x] Remove dead `useOfflineDetection` export from `barcode-queue.ts`. Keep internal implementation only if used within same file.
- [x] Rename `barcode-input-renderer.tsx` to `barcode-input.tsx`. Update all imports across the monorepo.
- [x] Remove the old file. Update `index.ts` barrel export path.

Exit Criteria:

- [x] `useOfflineDetection` no longer exported from scheduling package; no production imports remain.
- [x] File renamed to `barcode-input.tsx`; all consumer imports updated.
- [x] `pnpm typecheck --filter @nop-chaos/flux-renderers-scheduling` passes.

### Phase 2 — Type duplication, missing exports & event wiring

Status: planned
Targets: `barcode-input.types.ts`, `barcode-queue.ts`, `index.ts`, `kanban/kanban.types.ts`, `scheduling-renderer-definitions.ts`

- Item Types: `Fix | Decision`

- [ ] Remove duplicated `BarcodeQueueItem` from `barcode-queue.ts`; import from `barcode-input.types.ts`.
- [ ] Add `KanbanEvents`, `KanbanColumnConfig`, `KanbanCardConfig`, `BoardData`, `BoardItem` to `index.ts` exports.
- [ ] Decide: wire `onCardUpdate` into `KanbanSchema` fields/renderer or remove from `KanbanEvents`. Execute chosen path.

Exit Criteria:

- [ ] `BarcodeQueueItem` defined in exactly one canonical location.
- [ ] All five Kanban auxiliary types reachable via `@nop-chaos/flux-renderers-scheduling` barrel import.
- [ ] `onCardUpdate` either wired (present in schema fields + connected in renderer) or removed from `KanbanEvents` type.

### Phase 3 — Schema deprecation resolution & `as any` elimination

Status: planned
Targets: `schemas.ts`, `barcode-input.tsx` (formerly `barcode-input-renderer.tsx`), `scheduling-renderer-definitions.ts`

- Item Types: `Fix`

- [ ] Change `GanttSchema.tasks` from `GanttTask[]` to `GanttTaskData[]` and `.links` from `GanttLink[]` to `GanttLinkData[]`.
- [ ] Update `@deprecated` JSDoc on `GanttTask`/`GanttLink` to reference correct migration target: `GanttTaskData` from `./gantt/gantt.types.js`.
- [ ] If `scheduling-renderer-definitions.ts` field config references `GanttTask`/`GanttLink`, update to `GanttTaskData`/`GanttLinkData`.
- [ ] Replace four `as any` casts on `helpers.dispatch(events.onScan as any, ...)` and `events.onScanError as any` with typed payloads (e.g., typed dispatch helper that accepts `Partial<ActionContext>`).

Exit Criteria:

- [ ] `GanttSchema.tasks` accepts `GanttTaskData[]`; no type error when consumers pass runtime task data.
- [ ] Zero `as any` casts remain on barcode event dispatch path.
- [ ] `pnpm typecheck --filter @nop-chaos/flux-renderers-scheduling` passes.
- [ ] `@deprecated` JSDoc points to correct replacement type.

## Draft Review Record

- Reviewer / Agent: `ses_07b049312ffeiJist4U6qTP5sJ` (independent sub-agent via review task)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - [x] **Major**: `as any` count corrected from 3→4 (Current Baseline line 20, Phase 3 line 107) — live repo audit confirmed 4 casts on lines 106, 107, 116, 117 of `barcode-input-renderer.tsx`.

## Closure Gates

- [ ] All Phase exit criteria satisfied.
- [ ] Dead code `useOfflineDetection` no longer exported.
- [ ] `GanttSchema` migrated from deprecated types; deprecation followable.
- [ ] `BarcodeQueueItem` deduplicated.
- [ ] All Kanban auxiliary types publicly exported.
- [ ] `onCardUpdate` resolved (wired or removed).
- [ ] File renamed to `barcode-input.tsx`; no stale references.
- [ ] Zero `as any` on barcode event dispatch.
- [ ] Affected owner docs (`docs/audits/`, `docs/logs/`) synced.
- [ ] Independent sub-agent (fresh session) closure-audit passes, evidence recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

(none)

## Non-Blocking Follow-ups

(none)
