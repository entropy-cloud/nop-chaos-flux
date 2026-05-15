# 291 Deep Audit 2026-05-15 Variant-Field Contract Convergence Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/{summary.md,04-state-ownership.md,05-reactive-precision.md,09-renderer-contract.md,12-field-slot.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/289-open-ended-adversarial-review-2026-05-15-remediation-plan.md`

## Purpose

收口 `variant-field` 同一 shared surface 上的 retained contract drift：non-form owner writeback 缺失、wrapped path root `className` 契约缺口、以及 action-intent 字段被误建模为 `prop`。

## Current Baseline

- `04-03` 仍 live：`packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` 在 non-form owner 下只改本地 selector，不把 canonical variant 切换写回父 owner。
- `09-01` 仍 live：同文件 wrapped 路径的 canonical control root 丢失 `props.meta.className`。
- `12-01` 仍 live：`detectVariantAction` 仍按 `prop` 进入 render-time value 通道，而不是 execution-time action metadata 通道。
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

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `04-03` so non-form owner switching publishes the migrated canonical value back to the parent owner instead of stopping at local selector state.
- [ ] Fix `09-01` so wrapped and unwrapped rendering paths agree on the canonical control-root `meta.className` contract.
- [ ] Add focused proof for non-form owner switching and wrapped-root class propagation.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `04-03` and `09-01` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers canonical writeback on non-form owner paths and wrapped/unwrapped root-contract parity.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - Action-Intent Modeling Convergence

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, compiler/runtime field metadata paths, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `12-01` so variant action-intent fields no longer execute through render-time `prop` resolution.
- [ ] Add focused proof that execution-time action scope/arguments are preserved under the chosen metadata channel.
- [ ] Sync field-modeling docs to the final live baseline, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `12-01` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers action-intent fields on the final metadata channel.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for all in-scope defect families has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plan `289`.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] All in-scope confirmed live defects (`04-03`, `09-01`, `12-01`) are fixed.
- [ ] `variant-field` owner semantics, root contract, and action-intent modeling converge to one supported baseline.
- [ ] Necessary focused verification exists for every touched defect family.
- [ ] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Pending implementation, verification, and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: Pending.
- Evidence: Pending.

Follow-up:

- None currently.
