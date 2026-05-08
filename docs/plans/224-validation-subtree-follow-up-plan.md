# 224 Validation Integrity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-08
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,08-validation.md}`
> Related: `docs/plans/{168-validation-and-built-in-form-targeting-semantics-convergence-plan.md,223-reactive-and-async-follow-up-closure-plan.md,230-renderer-slot-and-type-contract-cleanup-plan.md}`

## Purpose

收口 `full-8` 维度 08 仍保留的 validation-owner consistency defects。完成态要求：surface owner activation、hidden descendant async invalidation、external-error lifecycle、projected writes、以及 retained subtree/dependency/hint/child-snapshot semantics 在 live code、focused proof、owner docs 中一致。

## Current Baseline

- 维度 08 保留了 P1 defects：surface owner activation、hidden descendant async invalidation、array `externalErrors` remap、projected writes prefix、`applyChanges` clear external errors、ordinary validation overwrite/remove external errors。
- 同一维度还保留了 P2 residuals：dependent revalidation one-layer、no-model success semantics、runtime registration hidden policy、submit child-contract snapshot、`hiddenFields` refresh、`clearValueWhenHidden` descendants。`FieldFrame` hint/aria drift 由 `230` 作为 renderer/field contract residual 显式 owning。
- `168` 已关闭 earlier validation semantic work；本计划只拥有 `full-8` 仍保留的 distinct residuals。

## Goals

- 修复 validation owner activation 与 external-error lifecycle drift。
- 修复 retained subtree/dependency/hint/child snapshot residuals。
- 用 focused validation proof 固定 final baseline。

## Non-Goals

- 不接管 renderer contract / slot modeling / type cleanup；这些由 `230` owning。
- 不重开 `168` 已关闭的 earlier validation baseline。
- 不把本计划扩大成 generic validation architecture rewrite。

## Scope

### In Scope

- `packages/flux-runtime/src/{surface-runtime.ts,form-runtime-owner.ts,form-runtime-field-ops.ts,form-runtime-array.ts,form-runtime-validation.ts,form-runtime-subtree.ts,projected-validation-runtime.ts}`
- directly affected validation helpers/tests/docs including `docs/architecture/form-validation.md`

### Out Of Scope

- renderer/meta/readOnly/slot/type cleanup owned by `230`
- runtime ownership/reactive precision owned by `223`
- async/lifecycle/error integrity owned by `229`

## Execution Plan

### Workstream 1 - Repair Validation Owner And External Error Integrity

Status: completed
Targets: validation owner/runtime files, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Repair surface validation owner activation for action-opened surfaces.
- [x] [Fix] Invalidate hidden descendant in-flight async validation correctly.
- [x] [Fix] Remap/clear/preserve `externalErrors` honestly across array mutations, projected writes, `applyChanges`, and ordinary validation overlay.
- [x] [Proof] Add focused validation proof for owner activation, async invalidation, external-error lifecycle, and projected writes.

Exit Criteria:

- [x] The retained validation-owner and external-error defects are closed on the supported paths.
- [x] Focused tests cover the landed validation semantics.
- [x] `docs/architecture/form-validation.md` and any directly affected references are updated if the stable baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Align Retained Subtree And Change-Revalidation Residuals

Status: completed
Targets: subtree/change/hint/child-snapshot validation paths, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Address the retained `hiddenFields` refresh, child snapshot, and descendant clear-on-hide residuals that remain in the supported validation path.
- [x] [Fix] Address the retained dependency-closure, no-model, and runtime-registration hidden-policy residuals that remain in the supported validation path.
- [x] [Fix] Keep changed/subtree targeting semantics honest for the retained `full-8` residuals without reopening already-closed earlier baselines.
- [x] [Proof] Add focused proof for the repaired `hiddenFields` refresh, child snapshot, and descendant clear-on-hide behavior.
- [x] [Proof] Add focused proof for the remaining subtree/change residuals after the retained dependency/no-model/hidden-policy work lands.

Exit Criteria:

- [x] The retained subtree/change/hint/child-snapshot defects are closed on the supported paths.
- [x] Focused tests prove the final validation targeting baseline.
- [x] Affected owner docs are updated if the stable baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Verification And Closure Audit

Status: completed
Targets: in-scope runtime/tests/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused validation verification after the fixes land.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all changes land.
- [x] Perform an independent closure audit and fix any remaining in-scope ambiguity before closing the plan.

Exit Criteria:

- [x] Focused verification is recorded for the landed validation slices.
- [x] Workspace verification passes.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope retained validation defects are fixed.
- [x] Focused verification exists for each landed validation family.
- [x] No in-scope retained defect is silently deferred or downgraded.
- [x] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Validation Checklist

- [x] `168` carve-out remains explicit.
- [x] External-error lifecycle is fixed with proof, not only by wording changes.
- [x] Focused tests cover both validation families.
- [x] `FieldFrame` hint/aria residual remains explicitly carved to `230` rather than silently dropped.
- [x] No retained `full-8` item from dimension 08 is left without an owner decision.

## Closure

Status Note: the final retained validation semantics are now closed in live code: owner-driven dependent revalidation expands through the full cycle-safe owner-local closure, runtime-only registrations can override hidden participation through `hiddenFieldPolicy`, focused regressions cover both validation families, and the fresh independent closure audit found no remaining plan-owned blocker.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode fresh closure pass plus independent general-agent audit (`ses_1fa140f1cffevDG2I4iShJZFF5`)
- Evidence: focused validation regressions and workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass; the latest independent re-audit (`ses_1f9989882ffe2AWwOCQcoCR1ra`) confirmed the former dependency-closure and runtime-registration hidden-policy gaps are now fixed in `packages/flux-runtime/src/{form-runtime-owner.ts,form-runtime-validation.ts}` with focused proof in `src/__tests__/{form-runtime-values.test.ts,hidden-field-policy.test.ts}` and no remaining plan-owned blocker.

Follow-up:

- no remaining plan-owned work
