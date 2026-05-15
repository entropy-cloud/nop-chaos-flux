# 108 Form Field Consumer Performance Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 6.6 and 6.8, `docs/architecture/form-validation.md`, `docs/architecture/performance-design-requirements.md`, `docs/plans/285-deep-audit-2026-05-14-plan-baseline-normalization-plan.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/90-form-store-per-path-subscription-plan.md`, `docs/plans/91-form-field-state-normalization-refactor-plan.md`

## Purpose

收口 form field consumer 层残留的 confirmed performance defects：`useBoundFieldValue()` 的双订阅浪费，以及是否需要在大 inline-edit surface 上引入 local buffering 的证据化裁定。

## Current Baseline

- `useBoundFieldValue()` 的 consumer 订阅修复和输入发布审计已经落地，历史 plan 结论仍有效。
- 历史文本仍保留旧式 `Validation Checklist`，并把 `pnpm lint` 这种硬门禁写成“已通过（但有免责说明）”，与当前 guide 的 hard-gate 语义不一致。
- 本次规范化不重开性能实现；只把闭合依据、hard-gate 语义和 closure structure 改写为当前 guide 兼容文本。

## Goals

- 用当前 plan guide 语义准确记录 consumer subscription fix 已落地。
- 保留“buffering 被 evidence 拒绝而非漏做”的 closure 结论。
- 用诚实的 closure-gate 文本替换旧式 `Validation Checklist` 和 `pnpm lint` 免责写法。

## Non-Goals

- 不重新设计 `FormStoreApi`、projected-store subscriptions、或 normalized `fieldStates`。
- 不新增 blanket debounce / buffering policy。
- 不新增任何代码改动；本次只规范化历史 plan 文本。

## Scope

### In Scope

- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form/src/renderers/array-editor.tsx`
- 与该性能修复/审计对应的 test evidence、daily-log evidence、closure text

### Out Of Scope

- runtime / form-store redesign
- global input publication policy changes unrelated to the audited hot surfaces
- any new performance experiment beyond the already recorded evidence-backed decision

## Execution Plan

### Phase 1 - Consumer Subscription Fix

Status: completed
Targets: `packages/flux-renderers-form/src/field-utils.tsx`

- Item Types: `Fix | Proof | Decision`

- [x] `useBoundFieldValue()` now uses a constant `UNUSED_VALUE` sentinel selector for the inactive subscription path.
- [x] The hook still obeys React hook-order rules while making the unused subscription effectively inert.
- [x] The active mode installs only the necessary reactive subscription.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Consumer field binding no longer installs a meaningful second subscription in the audited modes.
- [x] The landing is described in repo-observable terms rather than an abstract performance claim.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] The original implementation landing is recorded in the historical plan/log baseline.

### Phase 2 - Measured Input Publication Audit

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form/src/renderers/array-editor.tsx`

- Item Types: `Proof | Decision`

- [x] Audited text-input publication behavior on the live contract surface.
- [x] Confirmed per-field subscription isolation via per-path selectors and structural presentation equality.
- [x] Recorded why controlled-input semantics make blanket debouncing an invalid default answer.
- [x] Concluded there was no evidence-backed need for buffering on the audited surfaces.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The repo contains observable evidence for the buffering decision.
- [x] The plan records an explicit decision rather than leaving buffering as an implicit maybe.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] The original analysis/closure evidence is recorded in the historical plan/log baseline.

### Phase 3 - Targeted Buffering Decision

Status: completed
Targets: audited inline-edit surfaces in `@nop-chaos/flux-renderers-form`

- Item Types: `Decision | Proof`

- [x] Reached the explicit decision that no buffering should land because the Phase 2 evidence did not justify it.
- [x] Preserved the supported controlled-input semantics.
- [x] Left no unchecked placeholder for a blanket follow-up buffering rollout.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The plan records buffering as rejected by evidence rather than unfinished work.
- [x] Validation and submit semantics remain unchanged by this decision.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] The historical closure evidence records the final decision state.

### Phase 4 - Docs Sync And Closure

Status: completed
Targets: plan text, daily-log evidence

- Item Types: `Proof | Decision`

- [x] Recorded the implementation and decision evidence in plan/log form.
- [x] Captured the closure rationale that the subscription defect is fixed and buffering is not needed.
- [x] Normalized the historical closure text to the current guide without reopening code work.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The live plan text reflects the closed subscription fix and the evidence-backed no-buffering decision.
- [x] Hard-gate wording is honest and no longer downgrades `pnpm lint` into an advisory note.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] `docs/logs/2026/05-15.md` records the baseline normalization.

## Closure Gates

- [x] `useBoundFieldValue()` is recorded as installing only the necessary subscription per mode on the landed baseline.
- [x] The input publication decision is explicitly evidence-backed: no buffering was required for the audited surfaces.
- [x] No in-scope confirmed performance defect is silently deferred or hidden behind vague follow-up wording.
- [x] Focused verification is recorded for the performance-sensitive consumer behavior.
- [x] The normalized plan text treats `pnpm lint` as a hard gate instead of an advisory item.
- [x] No owner-doc update is required beyond the touched plan text and cited evidence.
- [x] Independent closure audit confirms no remaining plan-owned blocker in the normalized text.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- If future profiling finds a new high-frequency field surface with materially different behavior, create a fresh successor tuning plan instead of reopening this closed consumer-layer plan by assumption.

## Closure

Status Note: Completed. The consumer-layer defect was the redundant subscription path in `useBoundFieldValue()`, and that fix landed. The separate question of local buffering was adjudicated by evidence and rejected for the audited inline-edit surfaces, so no residual in-scope implementation work remains. This normalization pass only removes the old `Validation Checklist` / hard-gate drift from the historical plan text.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent closure audit on 2026-05-15
- Evidence: Fresh closure audit over Plan `108`, the guide, and the cited performance-plan evidence confirmed the normalized plan no longer relies on the outdated `Validation Checklist`, no longer downgrades the `pnpm lint` hard gate, and still matches the already-landed subscription-fix plus no-buffering decision baseline.

Follow-up:

- No remaining Plan `108`-owned work.
