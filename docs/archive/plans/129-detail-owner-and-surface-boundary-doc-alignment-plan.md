# 129 Detail Owner And Surface Boundary Doc Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-04-22
> Source: `docs/architecture/data-domain-owner.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/surface-owner.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`, `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-renderers-basic/src/dialog.tsx`, `packages/flux-renderers-basic/src/drawer.tsx`
> Related: `docs/plans/127-data-domain-owner-doc-alignment-and-operational-rules-plan.md`, `docs/plans/128-composite-field-owner-doc-alignment-plan.md`

## Purpose

把 `detail-field` / `detail-view` 与 `dialog` / `drawer` / `surface` 相关文档收敛到当前正式 owner baseline 与 live implementation：明确 staged detail owner 仍是 renderer-local temporary draft form baseline，明确 declarative `dialog`/`drawer` renderers 与 action-opened managed surfaces 不是同一条实现路径，并去掉 `statusPath` / `data` / extra surface modes / commit behavior 的 live overclaim。

## Current Baseline

- `docs/architecture/data-domain-owner.md` 已把 `detail-field` / `detail-view` 定义为当前 staged child-domain baseline，并把 `dialog` / `drawer` 定义为 `Surface Owner` 而不是数据 owner。
- live `detail-field` / `detail-view` 仍是 renderer-level temporary `FormRuntime` staged editors，确认时直接写回 parent form/scope，而不是 shared/compiler-aware owner substrate。
- live managed surface stack 存在于 action-opened surfaces：`openDialog` / `openDrawer` 进入 `SurfaceRuntime` + `DialogHost`。
- live declarative `type: 'dialog'` / `type: 'drawer'` renderers 只是直接 UI wrappers，不等于 action-opened managed surface stack。
- 当前 docs drift 在于：detail docs对 commit/result/surface mode 写得比 live 更宽，surface/dialog/drawer docs对 `statusPath`、`data`、shared host/runtime 的 current-vs-target 边界写得不够硬。

## Goals

- 让 `value-adaptation-and-detail-field.md` 明确 current-vs-target staged detail baseline。
- 让 `surface-owner.md`、`dialog`、`drawer` docs 明确 declarative renderer 与 action-opened managed surface 的 live split。
- 去掉 `statusPath`、`data`、extra surface mode、auto-commit/result behavior 的 live overclaim。

## Non-Goals

- 不修改 `detail-field` / `detail-view` / `dialog` / `drawer` runtime or renderer implementation。
- 不在本计划内实现 declarative `statusPath`、dialog/drawer `data` authoring、shared staged-owner substrate、or extra detail surface modes。
- 不重写 broader surface or action architecture。

## Scope

### In Scope

- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/surface-owner.md`
- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`
- `docs/logs/2026/04-22.md`

### Out Of Scope

- code changes
- unrelated architecture routing cleanup

## Execution Plan

### Phase 1 - Align Detail Owner Wording

Status: completed
Targets: `docs/architecture/value-adaptation-and-detail-field.md`

- [x] Marked current `detail-field` / `detail-view` baseline as renderer-local temporary draft `FormRuntime`, not shared/compiler-aware child-owner runtime.
- [x] Distinguished current live commit behavior from stricter target owner-defined `patch` / `updates` contract.
- [x] Trimmed extra surface modes to the current live-safe baseline.
- [x] Kept `detail-*` staged-owner semantics aligned with `Data Domain Owner` without overstating current substrate maturity.

Exit Criteria:

- [x] `value-adaptation-and-detail-field.md` cleanly separates current live detail behavior from target owner contract.
- [x] No live overclaim remains about managed surface hosting, overlay/patch draft baseline, or commit result strictness.

### Phase 2 - Align Surface / Dialog / Drawer Boundaries

Status: completed
Targets: `docs/architecture/surface-owner.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`

- [x] Distinguished action-opened managed surfaces from declarative `dialog` / `drawer` renderers.
- [x] Marked `statusPath` and `data` semantics as current only where they are truly live, otherwise as target/recommended baseline.
- [x] Tightened root-host / shared `SurfaceRuntime` language so it applies to the managed surface path without falsely implying declarative renderers already use it.

Exit Criteria:

- [x] Surface docs no longer blur declarative renderers with action-opened managed surfaces.
- [x] `dialog` / `drawer` docs do not overclaim live `data` or `statusPath` support.

### Phase 3 - Evidence And Closure

Status: completed
Targets: `docs/logs/2026/04-22.md`, this plan file

- [x] Added a daily-log entry for the detail/surface doc alignment slice.
- [x] Ran an independent docs/code closure audit and recorded the evidence here.
- [x] Closed the plan only after the audit confirmed no remaining plan-owned doc drift.

Exit Criteria:

- [x] Daily log entry exists with code/doc anchors.
- [x] Closure audit evidence is recorded from a fresh sub-agent session.
- [x] No remaining plan-owned doc drift remains.

## Validation Checklist

- [x] `value-adaptation-and-detail-field.md` accurately describes current staged detail behavior and clearly marks richer future contract pieces as target-only.
- [x] `surface-owner.md` distinguishes managed surfaces from declarative renderers.
- [x] `dialog` / `drawer` design docs no longer overclaim live `data` / `statusPath` semantics.
- [x] `docs/logs/2026/04-22.md` records the landing and evidence.
- [x] An independent closure audit is completed and recorded before plan closure.
- [x] No plan-owned code changes were required; workspace verification commands are not closure gates for this docs-only plan.

## Closure

Status Note: Completed as a docs-only alignment slice. The detail-owner docs now match the live renderer-local draft form baseline, and the surface/dialog/drawer docs now distinguish managed action-opened surfaces from declarative renderer wrappers without overclaiming `data` / `statusPath` or shared host/runtime behavior.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent sub-agents
- Evidence: `ses_2486a4a7fffeJJIen1gCuyx7e4` reported no blocking findings after the final wording fixes; `ses_2486a4a74ffeX6FlSW6enjr21R` recommended closure after daily-log evidence, confirming the edited docs match live anchors in `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `detail-view.tsx`, `detail-surface.tsx`, `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-renderers-basic/src/dialog.tsx`, and `packages/flux-renderers-basic/src/drawer.tsx`.

Follow-up:

- If future work lands declarative dialog/drawer `data` / `statusPath`, read-only detail opening, extra detail surface modes, or a shared staged-owner runtime, handle it in separate implementation plans.
- No remaining plan-owned work.
