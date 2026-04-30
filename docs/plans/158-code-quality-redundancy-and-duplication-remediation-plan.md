# 158 Code Quality: Residual Redundancy And Duplication Remediation Plan

> Plan Status: in progress
> Last Reviewed: 2026-04-30
> Source: live repo re-audit of `packages/flux-runtime`, `packages/flux-react`, `packages/flux-renderers-basic`, `packages/flux-core`, plus repeated independent subagent review on 2026-04-30
> Related: `docs/plans/76-repo-refactor-hotspots-remediation-plan.md`, `docs/plans/122-compiler-package-extraction-and-boundary-plan.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/145-runtime-react-renderer-hotspot-boundary-convergence-plan.md`, `docs/plans/159-code-refactor-discovery-remediation-plan.md`

## Purpose

收口当前 live repo 中仍然成立、且不与已完成 owner plans 冲突的残余重复代码与低风险冗余清理项，避免继续让局部重复实现和硬编码常量在 runtime/react/basic/core 层平行存在。

## Current Baseline

- 2026-04-30 的 repeated independent subagent audit 一致确认：原始 plan 158 过宽，并且把多个已由 `122`、`123`、`145`、`76` 收口或定案的 owner surface 混进同一份计划，不适合直接执行。
- 以下旧方向已从本计划移出，因为它们要么与现行 baseline 冲突，要么已由已完成 owner plan 收口：`flux-compiler`/`flux-action-core` owner 重画、`compile-symbol-table`/`validation-lowering` 迁移到 `flux-core`、`form-runtime` 19 文件合并回 5-6 文件、`array-editor`/`key-value` dual-state 推翻式重构。
- live repo 仍存在 4 组低风险且 repo-observable 的残余重复/冗余问题：
- `packages/flux-runtime/src/action-adapter.ts` 的 `ajax` built-in 仍内联重复 `executeRuntimeAjaxAction(...)` 已覆盖的执行流程。
- `packages/flux-renderers-basic/src/dialog.tsx` 与 `packages/flux-renderers-basic/src/drawer.tsx` 仍保留同构的 declarative surface lifecycle/status publication 逻辑。
- `packages/flux-react/src/hooks.ts` 仍保留重复的 form-store subscription wiring，以及 `useChildFieldState(...)` 仅作为 `useCurrentFormFieldState(path, { path })` 的别名存在，但它仍是 active public hook surface，不应在本计划中直接删除。
- `packages/flux-core/src/named-action-provider.ts` 仍本地硬编码 `XUI_ACTIONS_NAMESPACE`，而 `packages/flux-core/src/constants.ts` 已有同名共享常量。
- 另有若干“看似可删”的 public exports 或 utility cleanup（如 `rendererHooks`、`normalizeInstancePath`、`useChildFieldState` 删除）目前证据不足，或属于 public API surface 变更；它们不纳入本计划执行范围。

## Goals

- 让 runtime ajax built-in 与已有 helper 使用单一实现。
- 让 declarative `dialog` / `drawer` 共享 surface lifecycle helper，而不是继续维护两份近乎相同的 renderer-local effect 逻辑。
- 让 `flux-react` form error/field-state hooks 共享一致的内部 subscription helper，同时保留现有 public hook contract。
- 清理已存在共享常量的局部硬编码，避免同名 magic string 平行生长。

## Non-Goals

- 不重新开启 `flux-compiler` / `flux-action-core` / `flux-core` owner 边界调整；`parseNamespacedAction`、`compile-symbol-table`、`validation-lowering` owner 结论以 `docs/plans/122-compiler-package-extraction-and-boundary-plan.md` 与 `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md` 为准。
- 不把 `form-runtime` 文件拓扑重新并回更少文件；`docs/plans/145-runtime-react-renderer-hotspot-boundary-convergence-plan.md` 的已完成 baseline 保持有效。
- 不删除 `useChildFieldState`、`rendererHooks`、`normalizeInstancePath`、`EMPTY_SCOPE_DATA` 等 public surface，仅因仓库内消费者较少就视为死代码。
- 不处理 `array-editor` / `key-value` / `object-field` 的 owner 语义或 dual-state 设计；相关语义边界以 `docs/plans/76-repo-refactor-hotspots-remediation-plan.md`、`docs/plans/145-runtime-react-renderer-hotspot-boundary-convergence-plan.md` 和其 successor plans 为准。
- 不做 repo-wide dead export / redundant alias sweep；这类 public API 收敛如需推进，应进入单独 successor plan。

## Scope

### In Scope

- `packages/flux-runtime/src/action-adapter.ts`
- `packages/flux-runtime/src/runtime-action-helpers.ts`
- `packages/flux-renderers-basic/src/dialog.tsx`
- `packages/flux-renderers-basic/src/drawer.tsx`
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-core/src/named-action-provider.ts`
- 与上述实现直接相关的 focused tests、architecture docs、daily log、plan closure evidence

### Out Of Scope

- `packages/flux-compiler/src/**`
- `packages/flux-action-core/src/**` owner relocation or API convergence
- `packages/flux-runtime/src/form-runtime*.ts` file-topology rewrite
- `packages/flux-renderers-form-advanced/src/**` composite-field semantic refactor
- public export removals that require downstream API migration analysis

## Execution Plan

### Phase 1 - Runtime And Surface Duplication Cleanup

Status: in progress
Targets: `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/runtime-action-helpers.ts`, `packages/flux-renderers-basic/src/dialog.tsx`, `packages/flux-renderers-basic/src/drawer.tsx`, `packages/flux-renderers-basic/src/use-surface-renderer.ts`

- [ ] Replace the `ajax` branch in `action-adapter.ts` so it delegates to `executeRuntimeAjaxAction(...)` instead of keeping a second inline implementation.
- [ ] Extract the shared declarative surface lifecycle and `statusPath` publication logic from `dialog.tsx` and `drawer.tsx` into a local `useSurfaceRenderer(...)` helper.
- [ ] Keep renderer-specific UI concerns (`Dialog` vs `Drawer`, direction handling, body/footer slots, close-on-outside-click behavior) in each renderer file; only move the duplicated owner/lifecycle logic.
- [ ] Re-run focused runtime/basic renderer tests covering ajax action execution and declarative surface status behavior.

Exit Criteria:

- [ ] `action-adapter.ts` no longer carries a second inline ajax execution flow already owned by `executeRuntimeAjaxAction(...)`.
- [ ] `dialog.tsx` and `drawer.tsx` share one local surface lifecycle helper for controlled/local open state, declarative stack subscription, registration, and owner status publication.
- [ ] Existing declarative surface behavior and focused tests remain green with no user-visible semantic change.
- [ ] `docs/architecture/surface-owner.md` and `docs/architecture/renderer-runtime.md` are updated if the helper extraction changes the documented implementation anchor wording.
- [ ] `docs/logs/2026/04-30.md` is updated.

### Phase 2 - React Hook And Constant Hygiene

Status: planned
Targets: `packages/flux-react/src/hooks.ts`, `packages/flux-core/src/named-action-provider.ts`

- [ ] Introduce a small internal helper in `hooks.ts` for repeated form-store subscription wiring used by `useCurrentFormErrors`, `useCurrentFormError`, `useCurrentFormFieldState`, and `useFieldError`.
- [ ] Preserve all existing public hooks, including `useChildFieldState(...)`; if it remains an alias, make that relationship explicit in code/comments instead of treating it as undocumented duplication.
- [ ] Replace the duplicated `XUI_ACTIONS_NAMESPACE` local string in `named-action-provider.ts` with the shared constant from `constants.ts`.
- [ ] Re-run focused `flux-react` tests that cover hook subscription and composite field error observation behavior.

Exit Criteria:

- [ ] `hooks.ts` no longer repeats near-identical form-store subscribe/getSnapshot setup across the targeted hooks.
- [ ] `useChildFieldState(...)` remains either a documented alias or a justified distinct surface; no accidental public API removal occurs in this plan.
- [ ] `named-action-provider.ts` imports `XUI_ACTIONS_NAMESPACE` from `constants.ts` instead of hardcoding the same string twice.
- [ ] Focused `flux-react` verification stays green with no hook contract drift.
- [ ] `docs/architecture/renderer-runtime.md` is updated to reflect any clarified hook-surface wording.
- [ ] `docs/logs/2026/04-30.md` is updated.

## Validation Checklist

- [ ] All phase exit criteria are satisfied.
- [ ] Focused tests cover ajax helper reuse, declarative surface status behavior, and form-hook subscription behavior.
- [ ] Relevant architecture docs and the daily dev log are updated to the final baseline.
- [ ] Independent subagent closure audit is completed and recorded with evidence.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<completed or closed after execution and closure audit>>

Closure Audit Evidence:

- Reviewer / Agent: <<fresh independent subagent>>
- Evidence: <<task id / findings summary / doc-log link>>

Follow-up:

- Public API removals or deprecations (`rendererHooks`, `useChildFieldState`, `normalizeInstancePath`, `EMPTY_SCOPE_DATA`) should move to a separate successor plan if a fresh consumer audit proves they are safe.
- Broader package-boundary or topology changes remain owned by their existing completed plans or by `docs/plans/159-code-refactor-discovery-remediation-plan.md` where applicable.
