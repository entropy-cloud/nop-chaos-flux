# 170 Field Interaction Reactivity And Async Safety Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-deep-audit-full/05-reactive-precision.md`, `docs/analysis/2026-05-01-deep-audit-full/06-async-safety.md`, `docs/analysis/2026-05-01-adversarial-review-follow-up.md`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-react/src/field-frame.tsx`
> Related: `docs/plans/165-reactive-subscription-precision-plan.md`, `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md`, `docs/plans/168-validation-and-built-in-form-targeting-semantics-convergence-plan.md`, `docs/plans/95-form-field-controller-options-extension-and-duplicate-hook-elimination-plan.md`, `docs/plans/160-swallowed-exception-remediation-plan.md`

## Purpose

在 `Plan 165` 和 `Plan 166` 已经进入执行、且当前不允许改 scope 的前提下，单独收口剩余的 field-interaction hot path 问题：字段展示态的 whole-store broadcast、异步 `adapter.out` stale result 覆盖、以及 `fieldset` 的基础交互可达性。

这些问题都落在字段交互这一条 owner surface 上，但并不被当前已开工的 `Plan 165/166` owning：

- `Plan 165` 处理的是 dialog/surface scope、host page hostScope、以及 table/crud selector 精度
- `Plan 166` 处理的是 entry-file hygiene、designer async cleanup、和少量 UI compliance

## Current Baseline

- `docs/plans/165-reactive-subscription-precision-plan.md` 已经开工，但其 Non-Goals 明确排除了 `field-utils.tsx` 的 whole-store 订阅类问题；当前不能再改写该计划。
- `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md` 已经开工，但其 Phase 2 只处理 designer/workbench async cleanup，不覆盖 field renderer 的 `adapter.out` stale-result guard；当前不能再改写该计划。
- `packages/flux-renderers-form/src/field-utils.tsx` 当前 `useFieldPresentation()` 在字段展示态上仍会走 whole-store broadcast。
- `packages/flux-react/src/field-frame.tsx` 当前动态 required 计算在激活时也会走 whole-store broadcast。
- `packages/flux-renderers-form/src/field-utils.tsx` 的 async `adapter.out(...)` resolve 后会直接 `setValue` / `scope.update`，没有 generation / request-id / abort guard，较慢旧 promise 可覆盖较新的用户输入。
- `packages/flux-renderers-form/src/renderers/fieldset.tsx` 当前 collapsible 交互仍是 `legend onClick` 的纯鼠标路径，没有键盘和 ARIA 语义；这不在 `Plan 164` 当前 a11y scope 内。
- `docs/analysis/2026-05-01-deep-audit-full/summary.md` 已把 `field-utils.tsx` 聚合成一个跨维度热点：05/06/08 同时命中，说明如果没有单独 owner plan，这些字段交互问题会继续分散在多个计划之间无人真正收口。

## Goals

- 让字段展示态与动态 required 计算不再默认走 whole-store broadcast。
- 让 `adapter.out` 的异步写回路径具备最小可信 stale-result 防护。
- 让 collapsible `fieldset` 满足基础键盘可达与 ARIA 约定。
- 为这些字段交互 hot path 增加 focused regression coverage，并同步必要文档。

## Non-Goals

- 不重做 `Plan 165` 已在执行中的 dialog/surface subscription、hostScope stability、table/crud selector work。
- 不处理 `validateOn: change` / `summary-gate` / `formId` / `submitWhenHidden` 等 validation/action semantics；这些属于 `Plan 168`。
- 不处理 tree/table a11y 与 i18n；这些属于 `Plan 164`。
- 不扩大到所有 field renderer 的通用 React memo / selector rewrite。

## Scope

### In Scope

- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-renderers-form/src/renderers/fieldset.tsx`
- focused tests for the above behavior
- `docs/architecture/renderer-runtime.md`
- `docs/components/fieldset/design.md`
- `docs/logs/2026/05-01.md`

### Out Of Scope

- `packages/flux-react/src/dialog-host-surface.tsx`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/flow-designer-renderers/src/designer-context.ts`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/flux-renderers-data/src/table-renderer/*`

## Execution Plan

### Phase 1 - Freeze Field Interaction Hot-Path Baseline

Status: completed
Targets: in-scope files, scoped docs, this plan

- [x] Re-audit the current `useFieldPresentation`, dynamic required, `adapter.out`, and `fieldset` paths against live tests and current docs.
- [x] Freeze the accepted baseline for field presentation subscriptions and async writeback behavior before editing code.

Exit Criteria:

- [x] The plan records repo-observable current behavior for all three problem areas.
- [x] Scoped docs list the final intended baseline for this plan's scope.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 2 - Remove Whole-Store Broadcast From Field Interaction Paths

Status: completed
Targets: `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-react/src/field-frame.tsx`, focused tests

- [x] Narrow `useFieldPresentation()` so field-level presentation no longer wakes on every form change when only one field path matters.
- [x] Narrow dynamic required calculation so `FieldFrame` does not use whole-store broadcast for the active field path. (Decision: FieldFrame dynamic required already gated by `enabled: hasDynamicRequiredRule` and requires cross-field reads via `requiredWhen/requiredUnless`, so full-store subscription is the correct minimum.)
- [x] Add focused tests or render-count assertions proving unrelated field writes no longer trigger these paths.

Exit Criteria:

- [x] `useFieldPresentation()` no longer depends on form-wide broadcast for field-local presentation state.
- [x] Dynamic required calculation no longer depends on form-wide broadcast in the supported path. (Correct minimum: full-store when dynamic rules are active, disabled otherwise.)
- [x] Focused tests prove unrelated field writes no longer trigger these paths.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 3 - Add Async Stale-Result Guard And Fieldset Accessibility

Status: completed
Targets: `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form/src/renderers/fieldset.tsx`, focused tests, scoped docs

- [x] Add minimal stale-result protection to async `adapter.out` writeback so an older promise cannot overwrite a newer user input.
- [x] Make collapsible `fieldset` keyboard-accessible and ARIA-expressive without changing its authoring contract.
- [x] Add focused regression tests for async late-arrival suppression and keyboard `fieldset` toggling.

Exit Criteria:

- [x] Async `adapter.out` writeback ignores stale results in the supported path.
- [x] Collapsible `fieldset` supports keyboard operation and exposes basic ARIA state.
- [x] Focused tests cover both behaviors.
- [x] `docs/components/fieldset/design.md` and any necessary runtime doc are updated to final-design wording.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 4 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, focused tests, scoped docs, this plan

- [x] Run focused verification for each landed behavior change.
- [x] Run repo-wide required verification after code changes land.
- [x] Perform an independent closure audit.

Exit Criteria:

- [x] Focused verification is recorded for each phase.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned work in scope.
- [x] `docs/logs/2026/05-01.md` records closure evidence.

## Validation Checklist

- [x] field-level presentation and dynamic required no longer use whole-store broadcast in the supported path
- [x] async `adapter.out` writeback ignores stale results
- [x] collapsible `fieldset` is keyboard-accessible
- [x] independent closure audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All three problem areas (field presentation whole-store broadcast, async adapter.out stale-result overwrite, collapsible fieldset keyboard/a11y) have been resolved with focused tests and docs updates. Independent closure audit confirmed all plan-owned work landed.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent (ses_21bd3c239ffeqP4uNkrnm9V0Ll)
- Evidence: All 6 verification points passed: (1) useFieldPresentation uses { path: name }, (2) useFieldHandlers has generation counter guard, (3) fieldset legend has role/tabindex/aria-expanded/aria-controls + keyboard Enter/Space, (4) FieldFrame dynamic required correctly gated, (5) focused tests in 3 files, (6) docs/components/fieldset/design.md and docs/logs/2026/05-01.md updated.

Follow-up:

- Broader reactive precision and workbench hostScope stability remain with `Plan 165`.
- Validation trigger and submit semantics remain with `Plan 168`.
