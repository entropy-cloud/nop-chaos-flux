# 292 Deep Audit 2026-05-15 Advanced Field Subscription And Validation Projection Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/{summary.md,05-reactive-precision.md,08-validation.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/291-deep-audit-2026-05-15-variant-field-contract-convergence-plan.md`

## Purpose

收口 advanced-field family 在 subscription precision 与 validation projection 上的 retained drift：broad scope fallback、`useFieldPresentation` 欠订阅、non-form validation owner 丢失、以及 detail value-adaptation overlay 越权清理。

## Current Baseline

- `05-01` 仍 live：`object-field` / `array-field` / `detail-field` 在 form owner 场景仍常驻 broad scope fallback；同一 retained item 还包括 `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts` 的同模式 broad fallback，以及 `variant-field` 同文件 broad fallback slice。为了保持 retained item `05-01` 只有一个 honest owner，本计划统一 owning 全部 `05-01` slices。
- `05-02` 仍 live：`array-editor` / `key-value` 的 non-form fallback 单路径读取未传 `paths`。
- `05-04` 仍 live：`packages/flux-renderers-form/src/field-utils/field-presentation.tsx` 只按单字段订阅，但实际读取跨字段 required 与提交态。
- `08-03` 仍 live：advanced fields 在 non-form owner 下把 `parentForm` 错当 validation owner，丢失当前 `ValidationScopeRuntime`。
- `08-05` 仍 live：`detail-view/value-adaptation-helper.ts` 成功时越权清空整 path error bucket，而不是只清当前 source overlay。

## Goals

- Close retained `05-01`, `05-02`, and `05-04` on the supported advanced-field subscription baseline.
- Close retained `08-03` and `08-05` on the supported validation projection / overlay baseline.
- Keep advanced-field display and validation behavior aligned across form and non-form owners.

## Non-Goals

- 不接管 submit abort、summary-gate、或 validation snapshot core defects；这些由独立 validation/submit plan owning。
- 不接管 `variant-field` owner writeback、root contract、或 action-intent modeling work；这些由 Plan `291` owning。
- 不重构整个 form hook system，只收口 confirmed retained surfaces。

## Scope

### In Scope

- `05-01`
- `05-02/05-04`
- `08-03/08-05`
- advanced-field renderers and helpers under `packages/flux-renderers-form-advanced/src/**`
- `packages/flux-renderers-form/src/field-utils/field-presentation.tsx`
- `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`
- relevant validation/form docs and `docs/logs/2026/05-15.md`

### Out Of Scope

- `06-01`, `08-01`, `08-02`
- `04-03`, `09-01`, `12-01`
- any retained ID not listed above

## Execution Plan

### Phase 1 - Subscription Precision Closure

Status: planned
Targets: advanced-field renderers, `field-presentation.tsx`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `05-01` and `05-02` so advanced-field, `variant-field`, and same-pattern code-editor scope fallbacks subscribe only when needed and carry the narrow `paths` they actually read.
- [ ] Fix `05-04` so field presentation refreshes on dynamic required dependencies and submit-state changes, not only the field path itself.
- [ ] Add focused proof for form-owner and non-form-owner subscription precision on touched paths.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `05-01`, `05-02`, and `05-04` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers the narrowed path subscriptions for advanced-field, `variant-field`, and code-editor same-pattern fallbacks, plus dynamic required / submit-state refresh semantics.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - Validation Owner Projection And Overlay Cleanup

Status: planned
Targets: advanced-field validation helpers/renderers, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `08-03` so advanced fields read the current `ValidationScopeRuntime` on supported non-form owner paths.
- [ ] Fix `08-05` so value-adaptation success only clears the current source-local overlay instead of the whole path bucket.
- [ ] Add focused proof for non-form owner validation presentation and source-local overlay cleanup semantics.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `08-03` and `08-05` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers validation-owner projection and source-local external overlay cleanup.
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
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] All in-scope confirmed live defects (`05-01`, `05-02`, `05-04`, `08-03`, `08-05`) are fixed.
- [ ] Advanced-field subscription and validation projection semantics converge to one supported baseline.
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
