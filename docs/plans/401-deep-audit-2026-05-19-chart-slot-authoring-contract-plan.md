# 401 Deep Audit 2026-05-19 Chart Slot Authoring Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `12-02`：让 chart title 回到 value-or-region slot authoring contract。

## Current Baseline

- `packages/flux-renderers-data/src/data-renderer-definitions.ts` previously modeled `chart.title` as a plain prop, so authored title regions were compiled away instead of reaching the renderer slot path.
- `packages/flux-renderers-data/src/chart-renderer.tsx` now resolves `title` through the shared slot helper and publishes slot-backed title chrome as the chart accessible name via `aria-labelledby`.

## Goals

- 修复 `12-02`。
- 同步 slot authoring docs。

## Non-Goals

- 不处理 table schema findings。

## Scope

### In Scope

- `12-02`
- relevant data renderer definition/schema files
- `docs/components/chart/design.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- unrelated slot surfaces

## Execution Plan

### Phase 1 - Restore Chart Slot Authoring Contract

Status: completed
Targets: slot definitions, tests, owner doc

- Item Types: `Fix | Proof`
- [x] Model chart title as a supported value-or-region slot.
- [x] Update `docs/components/chart/design.md` and `docs/architecture/field-metadata-slot-modeling.md`.

Exit Criteria:

- [x] `12-02` is fixed.
- [x] Focused proof covers the final authoring contract.
- [x] `docs/components/chart/design.md` and `docs/architecture/field-metadata-slot-modeling.md` are updated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan `401` is closed. Chart `title` now follows the supported value-or-region slot contract in both metadata and renderer behavior, focused proof is green, owner docs are synced, repo-wide verification passed, and the independent closure audit found no remaining in-scope semantic blocker beyond stale bookkeeping.

Closure Audit Evidence:

- Reviewer / Agent: general subagent
- Evidence: `ses_1bd78fa54ffe54ek1v77sQzyI4` initially returned `Verdict: not acceptable` only because the plan file still showed `in progress` and one log sentence overstated the plain-string accessible-name path. The audit otherwise confirmed the live code/tests/docs satisfy the retained `12-02` contract. After syncing the plan/log closure bookkeeping, no in-scope blocker remained.
