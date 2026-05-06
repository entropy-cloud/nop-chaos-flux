# 217 Deep Audit 2026-05-06 Confirmed Defect Remediation Plan

> Plan Status: planned
> Last Reviewed: 2026-05-06
> Source: `docs/analysis/2026-05-06-deep-audit-full/summary.md`, `docs/analysis/2026-05-06-deep-audit-full/review-results.md`, per-dimension files under `docs/analysis/2026-05-06-deep-audit-full/`
> Related: `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md`, `docs/plans/212-renderer-workbench-contract-and-accessibility-closure-plan.md`, `docs/plans/216-open-ended-adversarial-review-residual-integrity-plan.md`

## Purpose

把 2026-05-06 全维度深度审计结果收敛为一个可审计的 owner plan：对仍由本计划拥有的 confirmed defects 逐项修复，对已被既有 owner plan 或既定设计基线处理的相邻问题逐项记录裁定。计划完成态：本计划拥有的 2026-05-06 confirmed defects 全部 landed 或被明确移交，不存在未归属、未裁定、或被静默降级的条目。

## Current Baseline

- 2026-05-06 deep audit 已完成，来源为 `summary.md`、`review-results.md` 与同目录分维度文件。
- 源文档的 P2 计数口径并不完全一致：`summary.md` 顶部写 26，按 theme 相加是 28，`review-results.md` 按维度 confirmed 合计又更高；因此本计划不再以裸数字作为 closure 依据，而是以显式 item list 为准。
- 05-06 draft 再复核后发现，部分 finding 与更早 owner-plan 的已落地修复或既定设计决定相邻但不等价，尤其是 surface 双态历史问题、`NodeRenderer` render-phase side effect、以及 wrapped secondary action 的非 labelable 基线；这些不能混成一个新的“大而全” remediation plan。
- `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md` 已持有并为更早一轮 declarative surface second-source-of-truth、duplicate closed publication、`NodeRenderer` render-phase side-effect 等 runtime/react integration defect 记录了 phase-level landed proof / owner adjudication；217 只拥有 05-06 仍然独立存在的 residual items。
- `docs/plans/212-renderer-workbench-contract-and-accessibility-closure-plan.md` 与 `docs/logs/2026/05-03.md` 已明确记录：`WrappedFieldAction` 当前支持基线是 non-labelable button-like control，而不是简单回退成真实 `<Button>`；217 不得把该既定裁定重新当成 must-fix defect。
- 仓库当前仍有 unrelated baseline blockers：`pnpm lint` 卡在 `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:22`，`pnpm typecheck` / `pnpm build` 卡在 `packages/flux-renderers-basic/src/use-surface-renderer.ts` 缺失 `SurfaceStoreApi` 方法；217 不拥有这些 blocker，但 closure 仍需要记录 repo-level verification attempt。

## Goals

- 修复本计划拥有的 2026-05-06 confirmed P1/P2 defects。
- 对与旧 plan / 旧设计决定相邻但不应重开的条目给出显式 owner 裁定。
- 为每个 landed defect family 提供 focused proof，并保持 closure checklist 可审计。
- 清理仍由 05-06 audit 明确点名的 ghost dependency declarations。

## Non-Goals

- 不重做审计，也不重新分类已降级的 18 个 P2。
- 不把 plan `211` 已拥有的 second-source-of-truth / render-phase-side-effect 历史缺陷重新接回 217。
- 不重构 `__actionScope` hidden channel 的整体架构；217 只拥有最小类型安全收口。
- 不把 `WrappedFieldAction` 强制改成真实 `<Button>`，因为这与已记录的 owner baseline 冲突。
- 不修复 unrelated workspace baseline blockers（`SurfaceStoreApi` 缺失、spreadsheet lint failure）。
- 不处理 P3 观察项或未被 05-06 summary theme set 收口的长期优化项。

## Scope

### In Scope

- 2 个 P1 defect
- 6 个 async error observability defects
- 4 个 widget renderer `className` contract defects
- 5 个 type-safety / lifecycle residual defects：`__actionScope` typed carrier、`node-renderer` hot-path `as any`、condition-builder schema `any`、keyboard event cast、surface dual-effect overlap
- 4 个 accessibility / validation defects：RadioGroup、CheckboxGroup、ConditionBuilder、runtime-registered hidden fields
- 3 个 ghost-dependency clusters，涉及 9 个具体 dependency declarations
- directly affected focused tests

### Out Of Scope

- 已降级的 18 个 P2
- `WrappedFieldAction` real `<Button>` migration
- `NodeRenderer` render-phase import installation defect 本身（由 plan `211` 拥有）
- declarative surface `defaultOpen/localOpen` second-source-of-truth defect 本身（由 plan `211` 拥有）
- P3 观察项与长期优化项
- unrelated workspace baseline blockers

## Confirmed Item Adjudication

### Plan-Owned Confirmed Set

- `P1-1` `packages/word-editor-renderers/src/editor-canvas.tsx` remount on chart/code insertion
- `P1-2` `packages/flux-runtime/src/action-adapter.ts` bare catch masks real submit errors
- `T1-1` to `T1-6` async error swallowing / observability defects from `form.tsx`, `source-registry.ts`, `report-designer-core/src/core.ts`, `table-quick-edit-controller.ts`
- `T2-1` to `T2-4` widget root `props.meta.className` merge defects
- `T3-1` condition-builder schema `fields` / `operators` `any`
- `T3-2` `wrapped-field-action.tsx` and `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx` keyboard event cast
- `T3-3` `use-surface-renderer.ts` `dispatch.__actionScope` / `__componentRegistry` hidden `any` carrier
- `T3-4` `node-renderer.tsx` hot-path `action as any` / `region.node as any`
- `T3-5` `use-surface-renderer.ts` dual-effect overlap causing close-reopen on declarative scope churn
- `T4-1` to `T4-3` RadioGroup / CheckboxGroup / ConditionBuilder accessibility gaps
- `T6-1` runtime-registered hidden fields skipping `hiddenFieldPolicy.validateWhenHidden`
- `T5-1` to `T5-3` ghost-dependency cleanup clusters across 7 manifests

### Already Owned Or Adjudicated Elsewhere

- `use-surface-renderer` earlier pseudo-controlled `localOpen/effectiveOpen` split and duplicate closed-summary publication are already owned by plan `211`; 217 only owns the distinct 05-06 dual-effect overlap residual.
- `NodeRenderer` render-phase prepared-import installation and namespace-registration side effect are already owned by plan `211`; 217 only owns the remaining hot-path `as any` casts.
- `WrappedFieldAction` staying non-labelable is an explicit supported baseline recorded in `docs/logs/2026/05-03.md` and closure plan `212`; 217 only owns the keyboard-event typing gap, not a Button migration.

### Review-Results-Only Confirmed Items Explicitly Routed Elsewhere

- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` working-value cache stays with future value-owner / staged-owner convergence work. It was review-confirmed as a real dual-state tradeoff, but 05-06 summary did not include it in the active remediation theme set and no current owner doc treats the live behavior as a broken supported baseline.
- `packages/flow-designer-renderers/src/designer-page.tsx` `treeDocument` props-to-state sync is moved to a future flow-designer owner plan. It remains a review-confirmed dual-state smell, but the current live code preserves one `DesignerCore` and updates through `core.replaceDocument(...)`, so 217 does not reopen it as a closure blocker.
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts` `draftValue` / `savedValue` local draft cache versus row-scope value is moved to future table draft-owner convergence work. 05-06 review kept it as a real dual-state tradeoff, but the same audit note also classifies the local cache as an acceptable draft-edit tradeoff rather than a current broken supported baseline; 217 only owns the separate save-error observability defect in that file.
- `packages/flux-react/src/hooks.ts` `useScopeSelector` full-broadcast subscription is moved to a future performance owner plan. `docs/analysis/2026-05-06-deep-audit-full/15-security-performance.md` records it as a known design tradeoff rather than a current broken supported baseline.
- `packages/flux-renderers-form/src/renderers/input.tsx` Select virtualization is moved to a future performance owner plan. It remains a scale optimization issue, not a correctness regression on the current supported baseline.
- `packages/report-designer-renderers/src/page-renderer.tsx` refresh error observability is already landed outside this plan: live code now reports through `env.notify?.(...)`, so 217 does not need to own it.
- `AGENTS.md` dependency-flow drift from dimension 01 is a docs-routing / baseline-sync issue, not a code-remediation item in this plan. If it still needs correction after code closure, it must move to a doc-owner successor rather than disappearing through omission.

## Execution Plan

### Phase 1 - P1 Critical Fixes

Status: planned
Targets: `packages/word-editor-renderers/src/editor-canvas.tsx`, `packages/flux-runtime/src/action-adapter.ts`

- Item Types: `Fix | Proof`

- [ ] [Fix] **P1-1**: `editor-canvas.tsx:148` - remove `charts` and `codes` from the effect dependency array and carry the latest values through refs so chart/code insertion no longer tears down the active editor bridge.
- [ ] [Fix] **P1-2**: `action-adapter.ts:166-170` - narrow `submitForm` catch scope so only form-handle resolution failure becomes `Form not found`; `invoke('submit', ...)` failures must preserve and propagate the real cause.
- [ ] [Proof] Add or update focused verification proving chart/code insertion does not remount the editor or lose undo/redo state.
- [ ] [Proof] Add or update focused verification proving submit validation/network/permission failures surface their real error instead of `Form not found`.

Exit Criteria:

- [ ] Word editor chart/code insertion no longer remounts the editor.
- [ ] `submitForm` preserves and propagates the real submit failure semantics.
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Async Error Observability

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`, `packages/flux-runtime/src/async-data/source-registry.ts`, `packages/report-designer-core/src/core.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`

- Item Types: `Fix | Proof`

- [ ] [Fix] **T1-1**: `form.tsx:271` - replace `initAction.catch(() => undefined)` with monitored reporting that suppresses only abort-path noise.
- [ ] [Fix] **T1-2**: `field-utils/field-handlers.tsx` - attach explicit rejection handling to the fire-and-forget `validateField` path so it cannot become an unhandled rejection.
- [ ] [Fix] **T1-3**: `source-registry.ts:204` - replace `refresh().catch(console.warn)` with a runtime-host-visible reporting channel.
- [ ] [Fix] **T1-4**: `report-designer-core/src/core.ts:349` - replace `refreshDerivedState().catch(() => undefined)` with designer-visible error reporting.
- [ ] [Fix] **T1-5**: `source-registry.ts:198` - fix `sourceCascadeDepth` underflow so the counter cannot end below zero on the reset path.
- [ ] [Fix] **T1-6**: `table-quick-edit-controller.ts:100` - expose save failure state after the callback so consumers have a UI-visible error channel.
- [ ] [Proof] Focused tests or equivalent proof cover each landed observability path.

Exit Criteria:

- [ ] All 6 in-scope async error paths have an observable exit.
- [ ] `sourceCascadeDepth` cannot underflow below zero.
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Renderer `className` Contract Fix

Status: planned
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`, `packages/flux-renderers-form-advanced/src/tag-list.tsx`, `packages/flux-renderers-form-advanced/src/key-value.tsx`, `packages/flux-renderers-form-advanced/src/array-editor.tsx`

- Item Types: `Fix | Proof`

- [ ] [Fix] **T2-1**: `condition-builder.tsx:110` - merge `props.meta.className` into the root `nop-condition-builder` element.
- [ ] [Fix] **T2-2**: `tag-list.tsx:85` - merge `props.meta.className` into the root `nop-tag-list` element.
- [ ] [Fix] **T2-3**: `key-value.tsx:357` - merge `props.meta.className` into the root `nop-key-value` element.
- [ ] [Fix] **T2-4**: `array-editor.tsx:294` - merge `props.meta.className` into the root `nop-array-editor` element.
- [ ] [Proof] Focused proof confirms schema `className` now reaches each widget root.

Exit Criteria:

- [ ] All 4 widget roots merge `props.meta.className`.
- [ ] Schema consumers can override or extend widget root styling through `className`.
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Type Safety And Lifecycle Residuals

Status: planned
Targets: `packages/flux-renderers-basic/src/use-surface-renderer.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`, `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx`, `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx`, shared typed dispatch metadata helpers if needed

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] **T3-1**: `condition-builder/types.ts:144,156` - replace `fields?: any[]` with `fields?: ConditionField[]` and `operators?: any` with `operators?: ConditionOperatorOverrides`, matching `docs/components/condition-builder/design.md`.
- [ ] [Fix] **T3-2**: `wrapped-field-action.tsx:87` and `code-editor-renderer/toolbar-button.tsx:40` - remove `KeyboardEvent -> MouseEvent` assertions by widening the handler contract or splitting keyboard activation logic.
- [ ] [Fix] **T3-3**: `use-surface-renderer.ts:102-107` - replace hidden `any` dispatch metadata reads with a shared typed carrier for `__actionScope` / `__componentRegistry`; do not reopen the broader architecture rewrite.
- [ ] [Fix] **T3-4**: `node-renderer.tsx:246,272,285` - eliminate the hot-path `as any` casts around action dispatch and region node rendering by introducing local typed narrowing/helpers.
- [ ] [Fix] **T3-5**: `use-surface-renderer.ts:230-266` - remove the close-reopen hazard caused by overlapping declarative lifecycle effects when the derived scope changes while the surface stays open.
- [ ] [Decision] Record that this phase does not reopen the already-owned `defaultOpen/localOpen` split or render-phase prepared-import side-effect defects from plan `211`.
- [ ] [Proof] Focused proof covers typed dispatch metadata access, `node-renderer` region/event paths, and declarative surface stability across scope churn.

Exit Criteria:

- [ ] condition-builder schema typing no longer uses `any` for `fields` or `operators`.
- [ ] keyboard activation no longer relies on `KeyboardEvent -> MouseEvent` assertion.
- [ ] hidden dispatch metadata no longer crosses this path through `any`.
- [ ] `node-renderer` hot-path `as any` sites are removed from the confirmed locations.
- [ ] declarative surface scope churn no longer triggers an unnecessary close-reopen cycle.
- [ ] Owner-doc adjudication against `docs/architecture/{renderer-runtime.md,surface-owner.md}` is recorded; update only if supported semantics changed.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 5 - Accessibility And Validation Contract Gaps

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx`, `packages/flux-runtime/src/form-runtime-validation.ts`

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] **T4-1**: `input.tsx` RadioGroup - add `aria-required` to the group control and `role="alert"` to the async error surface.
- [ ] [Fix] **T4-2**: `input.tsx` CheckboxGroup - add `role="group"` and `aria-required` to the group root.
- [ ] [Fix] **T4-3**: `condition-builder/condition-group.tsx` - add stable group-level ARIA structure for nested condition groups.
- [ ] [Fix] **T6-1**: `form-runtime-validation.ts:443-449` - apply `hiddenFieldPolicy.validateWhenHidden` to runtime-registered hidden-field validation, matching compiled-field behavior.
- [ ] [Decision] Record that `WrappedFieldAction` real-`<Button>` migration remains out of scope because the supported baseline is a non-labelable button-like control.
- [ ] [Proof] Focused proof covers RadioGroup, CheckboxGroup, ConditionBuilder accessibility semantics, and runtime-registered hidden-field policy behavior.

Exit Criteria:

- [ ] RadioGroup has required-state and error-alert semantics.
- [ ] CheckboxGroup exposes group semantics and required-state semantics.
- [ ] ConditionBuilder nested groups expose stable group-level ARIA structure.
- [ ] runtime-registered hidden fields obey `hiddenFieldPolicy.validateWhenHidden`.
- [ ] Owner-doc adjudication against `docs/architecture/form-validation.md` is recorded; update only if supported semantics changed.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 6 - Ghost Dependencies Cleanup

Status: planned
Targets: `packages/word-editor-renderers/package.json`, `packages/flux-renderers-basic/package.json`, `packages/flux-renderers-form-advanced/package.json`, `packages/flux-renderers-data/package.json`, `packages/flow-designer-renderers/package.json`, `packages/spreadsheet-renderers/package.json`, `packages/report-designer-renderers/package.json`

- Item Types: `Fix | Proof`

- [ ] [Fix] **T5-1**: remove `@nop-chaos/theme-tokens` from `packages/word-editor-renderers/package.json`.
- [ ] [Fix] **T5-2**: move test-only `@nop-chaos/flux-runtime` usage from `dependencies` to `devDependencies` in `flux-renderers-basic`, `flux-renderers-form-advanced`, `flux-renderers-data`, and `word-editor-renderers`.
- [ ] [Fix] **T5-3**: remove unused `react-dom` declarations from `word-editor-renderers`, `flow-designer-renderers`, `spreadsheet-renderers`, and `report-designer-renderers`.
- [ ] [Proof] `pnpm install` succeeds and manifest hygiene checks stay green after the cleanup.
- [ ] [Proof] package-scoped typecheck/build verification confirms the declaration moves do not break the owned packages.

Exit Criteria:

- [ ] All 3 ghost-dependency clusters are cleaned, covering 9 concrete dependency declarations across 7 manifests.
- [ ] `pnpm install` succeeds.
- [ ] `pnpm check:workspace-manifest-deps` passes or remains blocked only by unrelated pre-existing issues.
- [ ] No owner-doc update required.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] Every plan-owned confirmed defect listed in `## Confirmed Item Adjudication` is fixed or moved to explicit successor ownership with recorded reasoning.
- [ ] No plan-owned confirmed defect is silently downgraded to optimization-only cleanup or generic follow-up.
- [ ] The overlap with prior owner plans is explicitly adjudicated: plan `211` keeps the earlier declarative-surface and render-phase-side-effect defects, and plan `212` / `docs/logs/2026/05-03.md` keep the WrappedFieldAction non-labelable baseline.
- [ ] Focused verification exists for each landed defect family: P1 word-editor/action-adapter, async observability, widget `className`, type/lifecycle residuals, accessibility/validation, and manifest hygiene.
- [ ] Affected owner docs are synced to the live baseline, or each phase records why `No owner-doc update required` remains correct.
- [ ] `pnpm typecheck` is attempted and its pass/block status is recorded honestly in the closure note.
- [ ] `pnpm build` is attempted and its pass/block status is recorded honestly in the closure note.
- [ ] `pnpm lint` is attempted and its pass/block status is recorded honestly in the closure note.
- [ ] `pnpm test` is attempted and its pass/block status is recorded honestly in the closure note.
- [ ] `docs/logs/` 对应日期条目已更新。
- [ ] Independent closure audit is completed and evidence is recorded below.

## Deferred But Adjudicated

### `__actionScope` Hidden Channel Architecture Rewrite

- Classification: `optimization candidate`
- Why Not Blocking Closure: 217 owns only the minimal type-safe carrier needed to remove the confirmed `any` boundary; replacing the hidden carrier with a new explicit context-passing architecture is a broader runtime design task.
- Successor Required: yes
- Successor Path: future runtime/type-safety owner plan; fill in the concrete plan path before 217 closure if this rewrite is still considered necessary.

### Broader `node-renderer.tsx` Generic Cleanup Beyond The Confirmed Hot-Path Casts

- Classification: `optimization candidate`
- Why Not Blocking Closure: 217 closes only the confirmed `action as any` / `region.node as any` sites; broader generic cleanup around `Object.entries()` typing can remain separate once the confirmed hot path is no longer using `any`.
- Successor Required: yes
- Successor Path: future `flux-react` type-safety owner plan; fill in the concrete plan path before 217 closure if the broader cleanup remains open.

## Closure

Status Note: *(to be filled when plan is completed)*

Closure Audit Evidence:

- Reviewer / Agent: *(to be filled)*
- Evidence: *(to be filled)*

Follow-up:

- `__actionScope` hidden channel architecture rewrite -> successor plan
- broader `node-renderer.tsx` generic cleanup -> successor plan
