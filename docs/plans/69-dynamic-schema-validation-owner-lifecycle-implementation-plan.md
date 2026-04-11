# 69 Dynamic Schema Validation Owner Lifecycle Implementation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/analysis/2026-04-11-dynamic-schema-hot-reload-and-validation-owner-lifecycle.md`, `docs/architecture/form-validation.md`
> Related: `docs/plans/68-owner-based-validation-runtime-alignment-plan.md`

## Purpose

把 dynamic schema replacement 下的 validation owner lifecycle 从已稳定的技术方案推进为独立实现计划，避免把 owner-local validation alignment 与 model-refresh / owner-recreation 平台生命周期混在同一 owner plan 中。

## Current Baseline

### Already Implemented (from live code audit 2026-04-12)

- `packages/flux-runtime/src/form-runtime.ts`: `createManagedFormRuntime` 存在完整的 form runtime factory，但没有任何 lifecycle state 管理，没有 `modelGeneration`，没有 `compiledModel` 替换入口，没有 compatible/incompatible 判定逻辑。
- `packages/flux-runtime/src/form-runtime-validation.ts`: stale-run 防护通过 `validationRuns` Map 实现，但 run identity 只包含 per-path counter，没有绑定 `modelGeneration`。
- `packages/flux-core/src/types/runtime.ts`: `FormRuntime` 接口有 `validation?: CompiledFormValidationModel`，但没有 `lifecycleState`、`modelGeneration`、`refreshCompiledModel` 等 lifecycle 接口。

### Not Yet Implemented

- `modelGeneration` 计数器和 lifecycle state 机器（`bootstrapping` | `active` | `refreshing` | `disposed`）。
- `refreshCompiledModel(newModel)` 显式替换入口。
- `isOwnerCompatible` 判定逻辑（参见 analysis doc section 5）。
- Compatible refresh 11 步流程（见 analysis doc section 6.1）。
- Incompatible recreation 5 步流程（见 analysis doc section 6.2）。
- Async run identity 含 `modelGeneration`（现有 `validationRuns` counter 只按 path 和 run counter 防护，跨 generation 不隔离）。
- 注册/registration generation binding（registration 目前不知道自己被哪个 generation 接受）。
- React integration key contract（schema key 变化触发 unmount/remount）。
- 字段 re-registration after refresh 语义。

### Analysis Document Status

`docs/analysis/2026-04-11-dynamic-schema-hot-reload-and-validation-owner-lifecycle.md` 已形成可实施技术方案，此计划直接以该文档为规范输入。

### Dependency On Plan 68

本计划依赖 plan 68 Phase 1 已落地 `lifecycleState`、`modelGeneration`、`ValidationOwnerLifecycleState` 类型。这些类型在 plan 68 Phase 1 中引入契约层，但实现为桩（`lifecycleState` 固定为 `'active'`）。本计划实现其真正的状态机行为。

## Goals

- 将 dynamic schema replacement 变成可验证、可测试、可重建的 runtime lifecycle，而不是 silent in-place mutation。
- 明确 compatible refresh 与 incompatible recreation 的实现分流与最小 React integration contract。
- 让 stale-generation async work、registrations、caches、child contracts 在 model change 后都具备明确失效语义。

## Non-Goals

- 不在本计划内重做完整 debugger UI，只提供最小 observability hooks（`modelGeneration` 可观察即可）。
- 不把 dynamic schema lifecycle 扩展成 generic cross-domain owner lifecycle framework。
- 不在本计划内讨论 warning severity、validation diagnostics 面板、或 broader product UX。
- 不推进 validation graph compaction、normalization pipeline、state compression、compiler-described composite validation、或 registration-reduction 等 plan 09 的 deferred 方向。

## Scope

### In Scope

- `docs/analysis/2026-04-11-dynamic-schema-hot-reload-and-validation-owner-lifecycle.md`
- `docs/architecture/form-validation.md`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-types.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/index.ts`
- focused tests covering refresh/recreate lifecycle

### Out Of Scope

- unrelated validation rule execution changes already owned by plan 68
- debugger product work beyond lifecycle observability
- broader deferred validation roadmap work in plan 09
- hidden-field behavior redesign; plan 67 baseline remains locked and must survive refresh/recreate work unchanged

## Execution Plan

### Phase 1 - Lifecycle Contract Plumbing

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-types.ts`, `packages/flux-runtime/src/index.ts`

- [x] Store `modelGeneration` (integer, starts at 1) and `lifecycleState` in owner internal state.
- [x] Implement `refreshCompiledModel(newModel)` entry on `FormRuntime` (exposed via `ValidationScopeRuntime`): increments `modelGeneration`, transitions through `refreshing` → `active`, cancels stale async runs, invalidates materialization-adjacent caches (validationRuns map reset), rebuilds registrations that are still valid.
- [x] Implement `isOwnerCompatible` check: `ownerId`, `rootPath` match, boundary kind match — used by callers to decide refresh vs recreate.
- [x] Implement `dispose()` on `FormRuntime`: transitions to `disposed`, cancels all async runs and debounces, clears all field state, rejects subsequent validation/registration requests.
- [x] Ensure stale-generation async work cannot publish after generation change: async run identity must include `modelGeneration` snapshot.

Exit Criteria:

- [x] Runtime exposes `refreshCompiledModel(newModel)` instead of requiring React unmount for every schema change.
- [x] `isOwnerCompatible` is exported and usable by the React integration layer.
- [x] `lifecycleState` transitions through `refreshing` during refresh and back to `active` after reconciliation.
- [x] `modelGeneration` increments on each `refreshCompiledModel` call.
- [x] After refresh, async runs from the previous generation cannot publish results.

### Phase 2 - Refresh/Recreate Behavior Verification

Status: completed
Targets: focused runtime/integration tests, validation docs if needed

- [x] Focused test: compatible refresh drops stale async runs.
- [x] Focused test: compatible refresh retains field error state for paths with identical rule identity set.
- [x] Focused test: compatible refresh clears field error state for paths with changed rule identity set.
- [x] Focused test: `lifecycleState === 'disposed'` rejects new registration and validation requests.
- [x] Focused test: stale-generation async completion does not publish after `refreshCompiledModel`.
- [x] Focused test: `modelGeneration` increments correctly across multiple refreshes.
- [x] Add minimal integration note/comment for React-side owner remount trigger semantics (React key pattern).

Exit Criteria:

- [x] Focused tests prove compatible refresh drops stale async runs and preserves only explicitly-allowed state.
- [x] Focused tests prove `disposed` owner rejects new work.
- [x] Stale-generation async and registration work cannot publish into the new generation.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes.

## Validation Checklist

- [x] `modelGeneration` lifecycle is implemented and observable via `getScopeState()`
- [x] `lifecycleState` transitions correctly: `active` → `refreshing` → `active` on compatible refresh
- [x] `lifecycleState` transitions to `disposed` on `dispose()` call
- [x] Compatible refresh versus incompatible recreation follows `isOwnerCompatible` rule
- [x] Stale-generation async runs cannot publish after `refreshCompiledModel`
- [x] `disposed` owner rejects registration and validation requests
- [x] Plan 67 hidden-field behavior remains intact through refresh/recreate paths
- [x] Validation docs and analysis reflect landed behavior
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

All phases completed as of 2026-04-12. Dynamic schema validation owner lifecycle is implemented: `modelGeneration`, `lifecycleState` state machine, `refreshCompiledModel`, `dispose`, and stale-generation async isolation are all in place and verified by focused tests.

Follow-up:

- If debugger UX requires richer model-generation inspection, move that work to a debugger-specific successor plan.
- React integration key-based owner remount is a React layer concern; when a React renderer hosts `FormRuntime`, it should key on `${ownerId}:${rootPath}` and call `refreshCompiledModel` for compatible changes.
