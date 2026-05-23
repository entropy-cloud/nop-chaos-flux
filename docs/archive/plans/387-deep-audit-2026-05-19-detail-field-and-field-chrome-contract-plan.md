# 387 Deep Audit 2026-05-19 Detail-Field And Field-Chrome Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `09-01`、`09-03`、`12-01`：让 detail-field 与 field-chrome surface 回到 renderer contract 与 field metadata baseline。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` 已保留 schema `className` 到 canonical control root。
- detail surfaces 已回到 `useCurrentFormState` / `useScopeSelector`，不再直读 `FormRuntime` store。
- `packages/flux-renderers-form/src/field-utils/field-reading.tsx` 已导出 shared `formFieldChromeRules`，显式覆盖 `FieldFrame` chrome inputs。

## Goals

- 修复 `09-01`、`09-03`、`12-01`。
- 同步 detail/field-chrome contract docs。

## Non-Goals

- 不处理 validation owner lifecycle；那由 Plan `386` owning。

## Scope

### In Scope

- `09-01`, `09-03`, `12-01`
- relevant detail-field / field metadata files
- focused tests
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- broader form validation findings

## Execution Plan

### Phase 1 - Restore Detail And Field-Chrome Contract

Status: completed
Targets: detail-field code, tests, owner docs

- Item Types: `Fix | Proof`
- [x] Restore schema `className` handling and stop direct store reads.
- [x] Make the field-chrome metadata contract explicit.
- [x] Update the owner docs named in Plan `371`.

Exit Criteria:

- [x] `09-01`, `09-03`, and `12-01` are fixed.
- [x] Focused proof covers the final detail-field and field-chrome contract.
- [x] `docs/architecture/renderer-runtime.md` and `docs/architecture/field-metadata-slot-modeling.md` are updated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan `387` is closed. The retained detail-field `className` / direct-store / field-chrome metadata gaps are already fixed in the live repo, focused proof now explicitly covers the control-root className contract, owner docs are synced, repo-wide verification passed, and the independent closure audit found bookkeeping-only drift.

Closure Audit Evidence:

- Reviewer / Agent: general subagent
- Evidence: independent audit `ses_1bd6a8bd8ffe95ya3f4UG3Ouvh` confirmed the retained code findings were already fixed and only focused proof/doc/log bookkeeping remained; after adding explicit className proof and syncing owner docs/log/closure gates, no in-scope blocker remained.
