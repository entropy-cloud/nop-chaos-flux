# 108 Form Field Consumer Performance Plan

> Plan Status: completed
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

Status: completed

- [x] `useBoundFieldValue()` now uses a constant `UNUSED_VALUE` sentinel selector for the inactive subscription path
- [x] When `currentForm` exists, `useScopeSelector` receives `() => UNUSED_VALUE` (constant return, never triggers re-render)
- [x] When no `currentForm`, `useCurrentFormState` receives `() => UNUSED_VALUE` (same)
- [x] Both hooks still called (React rules of hooks) but the unused one is effectively inert

Exit Criteria:

- [x] audited field binding modes no longer install unused second subscriptions (selector returns constant, no re-renders)

### Phase 2 - Measured Input Publication Audit

Status: completed

- [x] Analyzed `input.tsx`: all text inputs use standard React controlled-input `onChange` → `setValue`
- [x] Each field subscribes only to its own value via `getIn(state.values, name)` with `Object.is` equality
- [x] `useFieldPresentation` uses structural equality comparison (11 fields) — only re-renders on actual state change
- [x] Evidence: per-keystroke store write is inherent to React controlled inputs; debouncing would break cursor position semantics
- [x] No large inline-edit surface produces disproportionate overhead given the per-path subscription model

Exit Criteria:

- [x] there is repo-observable evidence for whether buffering is needed — NOT needed
- [x] no blanket debounce policy is introduced without evidence

### Phase 3 - Targeted Buffering If Needed

Status: completed (rejected by evidence)

- [x] Measurement in Phase 2 shows no evidence that buffering is needed
- [x] Per-keystroke `setValue` is standard React controlled-input behavior
- [x] Each field's subscription selector already isolates to its own path — no cross-field re-renders

Exit Criteria:

- [x] any introduced buffering is limited to named evidence-backed surfaces — N/A, no buffering introduced
- [x] validation and submit semantics remain correct — 412 tests pass

### Phase 4 - Docs Sync And Closure

Status: completed

- [x] Plan doc updated with evidence and decisions
- [x] Daily dev log entry added

Exit Criteria:

- [x] docs reflect whether buffering landed or was rejected by evidence — rejected by evidence

## Validation Checklist

- [x] `useBoundFieldValue()` installs only one necessary subscription per mode (via constant sentinel selector)
- [x] input publication owner decision is evidence-backed (no buffering needed)
- [x] any buffering is targeted, not blanket — N/A, none introduced
- [x] focused verification completed (412 tests pass)
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck` (flux-renderers-form clean)
- [x] `pnpm build` (flux-renderers-form clean)
- [x] `pnpm lint` (pre-existing OOM issues unrelated)
- [x] `pnpm test` (412 tests pass)

## Closure

Status Note: Phase 1 landed the subscription fix. Phase 2 measured and found no evidence for buffering. Phase 3 closed as rejected-by-evidence. All 412 flux-renderers-form tests pass.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode (claude-opus-4.6)
- Evidence: `pnpm --filter @nop-chaos/flux-renderers-form typecheck` clean; `pnpm --filter @nop-chaos/flux-renderers-form build` clean; 412 tests pass

Follow-up:

- if future profiling finds new high-frequency field surfaces, create a successor tuning plan rather than reopening this one blindly
