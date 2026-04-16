# 108 Form Field Consumer Performance Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 6.6 and 6.8, `docs/architecture/form-validation.md`, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/90-form-store-per-path-subscription-plan.md`, `docs/plans/91-form-field-state-normalization-refactor-plan.md`

## Purpose

收口 form field consumer 层仍残留的 confirmed performance defects：double subscription usage and measured high-frequency input publication on large inline-edit surfaces。

## Current Baseline

- `useBoundFieldValue()` 仍总是安装 form + scope 双订阅。
- text input 仍每次按键写回 form store；这不是 blanket defect，但在大 inline-edit surface 上需要实测 closure。
- Plan 90 / 91 已定义 subscription API 与 normalized field state baseline；本计划只在 consumer layer 上修复，不改这些 contracts。

## Goals

- 让 `useBoundFieldValue()` 每种 mode 只安装一条必要订阅。
- 用 measured evidence 判断是否需要在大型 inline-edit surface 上引入 local buffering。
- 若引入 buffering，只在 evidence-backed surfaces 落地，不形成 blanket debounce policy。

## Non-Goals

- 不重设计 `FormStoreApi` 或 projected-store subscription contract。
- 不重设计 normalized `fieldStates`。
- 不 blanket debounce all inputs。

## Scope

### In Scope

- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form/src/renderers/array-editor.tsx`
- measured validation scenarios/tests/docs/logs

### Out Of Scope

- runtime/form-store redesign
- global input policy changes unrelated to measured hot surfaces

## Execution Plan

### Phase 1 - Consumer Subscription Fix

Status: planned
Targets: `field-utils.tsx`

- [ ] split consumer paths so `useBoundFieldValue()` installs only one necessary subscription per field mode

Exit Criteria:

- [ ] audited field binding modes no longer install unused second subscriptions

### Phase 2 - Measured Input Publication Audit

Status: planned
Targets: `input.tsx`, `array-editor.tsx`, playground/tests/logs

- [ ] measure large inline-edit surfaces that still feel expensive under per-keystroke store publication
- [ ] decide whether local buffering is required for those specific surfaces

Exit Criteria:

- [ ] there is repo-observable evidence for whether buffering is needed
- [ ] no blanket debounce policy is introduced without evidence

### Phase 3 - Targeted Buffering If Needed

Status: planned
Targets: only evidence-backed hot surfaces

- [ ] if measurement justifies it, introduce local buffering only for named hot surfaces
- [ ] preserve validation trigger semantics and blur/submit behavior

Exit Criteria:

- [ ] any introduced buffering is limited to named evidence-backed surfaces
- [ ] validation and submit semantics remain correct under focused verification

### Phase 4 - Docs Sync And Closure

Status: planned
Targets: docs/logs/tests

- [ ] reverse-update audit/log text and record the owner decision

Exit Criteria:

- [ ] docs reflect whether buffering landed or was rejected by evidence

## Validation Checklist

- [ ] `useBoundFieldValue()` installs only one necessary subscription per mode
- [ ] input publication owner decision is evidence-backed
- [ ] any buffering is targeted, not blanket
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after double subscription is removed and input buffering has either landed on measured surfaces or been explicitly rejected with evidence.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if future profiling finds new high-frequency field surfaces, create a successor tuning plan rather than reopening this one blindly
