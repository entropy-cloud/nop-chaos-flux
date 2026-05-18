# 291 Deep Audit 2026-05-15 Variant-Field Contract Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/{summary.md,04-state-ownership.md,05-reactive-precision.md,09-renderer-contract.md,12-field-slot.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/289-open-ended-adversarial-review-2026-05-15-remediation-plan.md`

## Purpose

收口 `variant-field` 同一 shared surface 上的 retained contract drift：non-form owner writeback 缺失、wrapped path root `className` 契约缺口、以及 action-intent 字段被误建模为 `prop`。

## Current Baseline

- `04-03` / `09-01` 已在当前 live baseline 收口：`packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` 现在会把 non-form owner variant 切换写回父 scope，且 wrapped / unwrapped 的 canonical control root `[data-slot="variant-field-body"]` 都保留 `meta.className` 契约。
- `12-01` 已在当前 live baseline 收口：`detectVariantAction` 通过 `event` channel 编译为 execution-time action plan；`variant-field` 的 nested `transformInAction` 现在直接从 `templateNode.schema` 读取 authored action schema 而不再消费 prop-resolved variant copy；top-level `transformInAction` / `transformOutAction` / `validateValueAction` 也不再经 render-time `prop` channel 暴露给 renderer。
- 审计汇总已把该文件列为 `04/09/12` 的跨维度热点，适合由单一 owner plan 收口。
- retained `05-01` 仍由 Plan `292` 统一 owning；本计划不再切分该 retained item ID，避免 `05-01` 形成双 owner。
- Plan `289` 已 owning `detail-view` defect family；本计划不重开同 family 的其它 advanced-field surface。

## Goals

- Close retained `04-03`, `09-01`, and `12-01` on one supported `variant-field` baseline.
- Make non-form owner variant switching converge back to canonical parent-owned value.
- Make wrapped and unwrapped root contracts agree on `meta.className` behavior.
- Move variant action-intent fields onto an honest execution-time contract.

## Non-Goals

- 不接管 `detail-view` 或 `object-field` defect families。
- 不重构整个 advanced-field framework；只修 `variant-field` 当前 retained surface。
- 不吸收 `05-*`, `06-*`, `08-*`, `10-*`, `14-*`, `16-*`, `18-*`, `20-*`。

## Scope

### In Scope

- `04-03`
- `09-01`
- `12-01`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- compiler/runtime field-modeling paths needed for the variant action-intent fix
- focused tests and relevant owner docs: `docs/architecture/variant-field.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/logs/2026/05-15.md`

### Out Of Scope

- `detail-view` atomicity or overlay cleanup
- `object-field` / `array-field` validation owner work
- any retained ID not listed above

## Execution Plan

### Phase 1 - Canonical Owner And Root Contract

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `04-03` so non-form owner switching publishes the migrated canonical value back to the parent owner instead of stopping at local selector state.
- [x] Fix `09-01` so wrapped and unwrapped rendering paths agree on the canonical control-root `meta.className` contract.
- [x] Add focused proof for non-form owner switching and wrapped-root class propagation.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `04-03` and `09-01` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers canonical writeback on non-form owner paths and wrapped/unwrapped root-contract parity.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - Action-Intent Modeling Convergence

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, compiler/runtime field metadata paths, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix the `detectVariantAction` slice of `12-01` so detect now executes through the execution-time `event` channel instead of render-time `prop` resolution.
- [x] Resolve the remaining `12-01` action-intent drift for `transformInAction` / `transformOutAction` / `validateValueAction` on the supported `variant-field` baseline.
- [x] Add focused proof for the final `12-01` baseline that will be claimed at closure.
- [x] Sync field-modeling docs to the landed detect-action baseline, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `12-01` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers action-intent fields on the final metadata channel.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 2 execution notes and follow-up status.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all in-scope defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plan `289`.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`04-03`, `09-01`, `12-01`) are fixed.
- [x] `variant-field` owner semantics, root contract, and action-intent modeling converge to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: `04-03`, `09-01`, and `12-01` are now closed on the live baseline. `variant-field` keeps `detectVariantAction` on the compiled execution-time `event` channel, recovers authored nested `transformInAction` directly from `templateNode.schema` instead of consuming the prop-resolved variant copy, and no longer exposes top-level `transformInAction` / `transformOutAction` / `validateValueAction` through the render-time `prop` channel. Fresh workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green. No additional owner-doc update is required because `docs/architecture/renderer-runtime.md` already states that `meta.className` must land on the canonical control root and `docs/architecture/field-metadata-slot-modeling.md` already documents `detectVariantAction` on the execution-time `event` channel.

Closure Audit Evidence:

- Reviewer / Agent: general subagent `ses_1d4147da7ffee3M1J8ThKMwagI`.
- Evidence: PASS. Re-read this plan, `docs/analysis/2026-05-15-deep-audit-full/04-state-ownership.md`, `docs/analysis/2026-05-15-deep-audit-full/09-renderer-contract.md`, `docs/analysis/2026-05-15-deep-audit-full/12-field-slot.md`, `docs/architecture/renderer-runtime.md`, `docs/logs/2026/05-15.md`, the live `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, focused proof in `variant-field-field-frame.test.tsx`, `variant-field-owner-contract.test.tsx`, `variant-field-detection.test.tsx`, and `variant-field-transform.test.tsx`, the saved green workspace test output `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2bcfc998001vZ6FpDWzfu2ATS`, and the green hard-gate results from this conversation (`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`). Confirmed retained `04-03`, `09-01`, and `12-01` are honestly closed on the live supported `variant-field` baseline; no remaining overlap conflict with Plan `289`; the daily log evidence is consistent with completion; and `No owner-doc update required` remains honest because the landed fixes restore the existing documented canonical-root and execution-time action-channel baseline rather than changing the supported owner contract.

Follow-up:

- None currently.
