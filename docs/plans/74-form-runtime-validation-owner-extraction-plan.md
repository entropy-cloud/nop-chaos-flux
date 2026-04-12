# 74 Form Runtime Validation Owner Extraction Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/plans/68-owner-based-validation-runtime-alignment-plan.md`, live repo audit of `packages/flux-runtime/src/form-runtime.ts` on 2026-04-12
> Related: `docs/plans/69-dynamic-schema-validation-owner-lifecycle-implementation-plan.md`, `docs/plans/71-large-inline-table-aggregate-validation-performance-plan.md`

## Purpose

把当前仍然堆在 `packages/flux-runtime/src/form-runtime.ts` 里的 owner-local validation orchestration 抽成更清晰的内部模块，并把 `ManagedFormRuntimeSharedState` 从“可变状态袋”收窄成按职责切分的内部 state slices，在不改变 public contract 和现有行为的前提下，让 `FormRuntime` 更接近 `docs/architecture/form-validation.md` 中“FormRuntime 是 ValidationScopeRuntime specialization”的实现边界。

## Current Baseline

- `packages/flux-runtime/src/form-runtime-validation.ts` 已承接单路径 validation 执行、async debounce、stale-run 防护。
- `packages/flux-runtime/src/form-runtime-registration.ts`、`form-runtime-subtree.ts`、`form-runtime-array.ts`、`form-runtime-submit.ts`、`form-runtime-status.ts` 已承接部分 focused helpers。
- `packages/flux-runtime/src/form-runtime-lifecycle.ts` 已承接 rule-identity retention 等 refresh lifecycle helper；本计划不重开该 plan-owned 语义，只在需要时做无行为变化的代码搬运对接。
- 但 `packages/flux-runtime/src/form-runtime.ts` 仍同时承担：dependency-driven revalidation、external error side-map、owner-wide traversal (`validateForm`)、subtree orchestration、atomic write + revalidate (`applyChangesAndRevalidate`)、summary state computation、submit orchestration、普通值写入、array mutation dispatch。
- `ManagedFormRuntimeSharedState` 当前被多个模块以整包 mutable bag 方式共享；不少模块只需要其中一小部分字段，却仍依赖整个大接口。
- live repo 中并不存在独立的 `ValidationScopeRuntime` factory 或 `createValidationScopeRuntime`；owner-local validation core 目前仍内嵌在 `createManagedFormRuntime()`。

## Goals

- 把 owner-local validation core 从 `form-runtime.ts` 中抽离到 focused internal module(s)，让 `form-runtime.ts` 主要保留 form specialization 和组装职责。
- 用更窄的 internal shared-state slice types 替代对整包 `ManagedFormRuntimeSharedState` 的广泛耦合。
- 保持现有 `FormRuntime` public API、validation semantics、submit semantics、hidden-field 行为、child contract 行为不变。
- 为后续真正抽出通用 `ValidationScopeRuntime` 基座创造更清晰的落点，而不在本计划里一次性完成那个更大抽象。

## Non-Goals

- 不在本计划内引入新的 public runtime factory，例如 `createValidationScopeRuntime()`。
- 不改变 `FormRuntime` public type contract、`ValidationScopeRuntime` public type contract、或 renderer/form consumer 用法。
- 不重写 validation algorithm、dependency model、async rule semantics、hidden-field semantics、或 child contract semantics。
- 不把本计划扩展成 plan 69 的 dynamic schema recreation / owner recreation work。
- 不处理 large-inline-table performance 策略设计；那仍由 plan 71 承接。
- 不把 `canSubmit`、`allTouched`、`submit()` 等 form-only policy/UX 语义重定义为通用 validation-owner core；这些仍属于 `FormRuntime` specialization。

## Scope

### In Scope

- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-types.ts`
- new internal modules under `packages/flux-runtime/src/` for extracted owner logic
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-registration.ts`
- `packages/flux-runtime/src/form-runtime-subtree.ts`
- `packages/flux-runtime/src/form-runtime-array.ts`
- focused tests under `packages/flux-runtime/src/**/*.test.ts`
- `docs/architecture/flux-runtime-module-boundaries.md` if module ownership wording changes materially
- `docs/logs/2026/04-12.md`

### Out Of Scope

- public `ValidationScopeRuntime` API redesign
- renderer-layer adoption changes beyond compile/type safety
- owner overlay system (`RuntimeRuleOverlayDescriptor` / `RuntimeOpaqueValidationDescriptor`)
- dynamic schema recreate/remount semantics
- performance-policy changes for aggregate-heavy inline tables

## Execution Plan

### Phase 1 - Baseline And State-Slice Design

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-types.ts`

- [x] Re-audit `form-runtime.ts` responsibilities and pin the exact owner-local validation responsibilities to be extracted.
- [x] Introduce narrower internal slice types in `form-runtime-types.ts` so helper modules stop depending on the full mutable bag by default.
- [x] Keep `ManagedFormRuntimeSharedState` only as the assembly-time aggregate type if still needed, but route helper modules through narrower slice aliases/interfaces.

Exit Criteria:

- [x] A small set of slice types exists for validation owner logic, registration lookup, subtree collection, and array mutation helpers.
- [x] No public runtime contract changes are required by the new internal slice boundaries.

### Phase 2 - Extract Owner-Local Validation Core

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts`, new extracted internal module(s)

- [x] Extract owner-local validation orchestration into focused internal module(s).
- [x] Move these responsibilities out of `form-runtime.ts`: `revalidateDependents`, `applyExternalErrors`, `applyChangesAndRevalidate`, `validateForm`, `validateSubtree`, `computeScopeState`, `supersedeLowerPriorityWork`.
- [x] Keep `computeCanSubmit`, `computeAllTouched`, `submit`, touch/visit, ordinary value writes, and array mutation dispatch in `form-runtime.ts` as form-specialization logic.
- [x] Relocate `refreshCompiledModel` / `dispose` wiring as an internal move only, without lifecycle semantic change.

Exit Criteria:

- [x] `form-runtime.ts` no longer defines `revalidateDependents`, `applyExternalErrors`, `applyChangesAndRevalidate`, `validateForm`, or `validateSubtree` locally.
- [x] Extracted module boundaries match `docs/architecture/flux-runtime-module-boundaries.md` guidance: non-trivial runtime logic lives outside the entry/orchestrator file.
- [x] Focused tests covering dependent revalidation, external error publish/clear, owner-wide validation, and subtree validation still pass without behavior regression.

### Phase 3 - Narrow Coupling In Existing Helper Modules

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-validation.ts`, `form-runtime-registration.ts`, `form-runtime-subtree.ts`, `form-runtime-array.ts`, `form-runtime-types.ts`

- [x] Update helper modules to consume narrower shared-state slices in `form-runtime-types.ts` for owner/registration/store concerns where this refactor touched them.
- [x] Remove avoidable references to the full `ManagedFormRuntimeSharedState` where a smaller slice is sufficient in `form-runtime-registration.ts`, `form-runtime-subtree.ts`, `form-runtime-array.ts`, and `form-runtime-validation.ts`.
- [x] Keep cross-module dependencies explicit so future extraction of a generic validation owner runtime does not depend on form-only state.

Exit Criteria:

- [x] Validation, registration, subtree, and array helper modules each depend on narrower state slices rather than the full shared bag wherever feasible.
- [x] There is no new circular dependency among form-runtime helper modules.

### Phase 4 - Verification And Documentation Sync

Status: completed
Targets: focused runtime tests, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/logs/2026/04-12.md`

- [x] Add or update focused tests covering extracted owner-local behavior if existing coverage does not already pin it sufficiently.
- [x] Update module-boundary documentation if the new internal ownership split changes the live repo baseline.
- [x] Record the landed refactor slices and any remaining follow-up in the daily log.

Exit Criteria:

- [x] Focused runtime tests cover external error publish/clear, dependent revalidation, subtree validation, and owner-wide validation non-regression.
- [x] Docs reflect the new module placement accurately when boundaries changed.
- [x] `pnpm --filter @nop-chaos/flux-runtime typecheck`, `test`, `lint` pass.

## Validation Checklist

- [x] `form-runtime.ts` is smaller and focused on form specialization / assembly
- [x] Owner-local validation orchestration lives in dedicated internal module(s)
- [x] Helper modules consume narrowed shared-state slices where feasible
- [x] No public `FormRuntime` / `ValidationScopeRuntime` contract regression
- [x] Focused runtime tests still cover submit, subtree validation, external errors, refresh/dispose, and dependent revalidation behavior
- [x] `docs/architecture/flux-runtime-module-boundaries.md` updated if module ownership baseline changed
- [x] 独立子 agent review 已完成并记录证据
- [x] `pnpm --filter @nop-chaos/flux-runtime typecheck`
- [x] `pnpm --filter @nop-chaos/flux-runtime build`
- [x] `pnpm --filter @nop-chaos/flux-runtime lint`
- [x] `pnpm --filter @nop-chaos/flux-runtime test`

## Closure

Status Note: The owner-local validation extraction, helper-state narrowing, focused verification, and documentation sync are all landed. A fresh independent closure audit found no remaining plan-owned implementation work, so this plan can close as completed.

Closure Audit Evidence:

- Reviewer / Agent: fresh closure-audit subagent task `ses_27fdc3c0dffeNQsU4WxMm8aL5z`
- Evidence: closure audit recommended `close`; owner extraction verified in `packages/flux-runtime/src/form-runtime-owner.ts`, delegation verified in `packages/flux-runtime/src/form-runtime.ts`, narrowed helper-state slices verified in `packages/flux-runtime/src/form-runtime-validation.ts`, `form-runtime-registration.ts`, `form-runtime-subtree.ts`, and `form-runtime-array.ts`; package verification already green in `docs/logs/2026/04-12.md`

Follow-up:

- If this plan lands only the internal extraction and slice narrowing, any later public `ValidationScopeRuntime` factory extraction should become a separate successor plan.
- If large-inline-table validation still needs algorithmic/perf work after the extraction, continue in `docs/plans/71-large-inline-table-aggregate-validation-performance-plan.md`.
- No remaining plan-owned work. Any later public `ValidationScopeRuntime` factory extraction or algorithmic performance redesign should be handled by successor plans rather than reopening this internal extraction plan.
