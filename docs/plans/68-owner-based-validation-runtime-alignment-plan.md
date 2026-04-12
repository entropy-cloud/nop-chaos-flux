# 68 Owner-Based Validation Runtime Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`, `docs/analysis/2026-04-11-dynamic-schema-hot-reload-and-validation-owner-lifecycle.md`
> Related: `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md`, `docs/plans/67-hidden-field-policy-implementation-plan.md`

## Purpose

把已经稳定下来的 owner-based validation 设计落成一份可执行 owner plan，收口当前真正阻塞实现一致性的 steady-state runtime gap：owner-local validation API、registration contract、entry arbitration、external error injection、以及 child contract lifecycle。

## Current Baseline

### Implemented (confirmed by live repo audit 2026-04-12)

- `packages/flux-core/src/types/validation.ts`: `ValidationRule`(14 kinds + async)、`ValidationError`、`ValidationResult`、`FormValidationResult`、`RuntimeFieldRegistration`、`CompiledValidationRule`、`CompiledValidationNode`、`CompiledFormValidationModel` 均已存在并有效。
- `packages/flux-core/src/types/runtime.ts`: `FormRuntime`、`FormStoreApi`、`FormStoreState`、`FormFieldStateSnapshot`、`FormFieldPresentationSnapshot`、`FormStatusSummary` 均已定义。
- `packages/flux-core/src/validation-model.ts`: 所有模型构建/查询工具函数已完整实现。
- `packages/flux-runtime/src/form-runtime.ts`: 主 `createManagedFormRuntime` factory 已实现大部分基础能力，含 submit、array mutation、hidden-field 清值、依赖 revalidation、stale-run 防护。
- `packages/flux-runtime/src/form-runtime-validation.ts`: 单字段验证（sync + async + debounce + stale-run）已完整实现。
- `packages/flux-runtime/src/form-runtime-array.ts`: 所有数组 mutation 及 state remapping 已完整实现。
- `packages/flux-runtime/src/form-runtime-subtree.ts`: 子树验证目标收集已实现。
- 14 个内置同步 validator 已有实现和测试。

### Partially Implemented Or Still Missing (gaps confirmed from live code audit)

- `ValidationScopeRuntime`、`FieldRegistrationHandle`、`ValidationReason`、`ScopeValidationStateSnapshot`、`applyExternalErrors`、`applyChangesAndRevalidate`、`isPathOwned`、`getScopeState()`、`getScopeRootErrors()`、`canSubmit`、`allTouched` 等 contract surface 已加入类型与 runtime。
- `registerField` 已改为返回 `FieldRegistrationHandle`，registration storage 已按 `registrationId` 建模，并且 duplicate-path policy 已固定为 reject。
- `lifecycleState` / `modelGeneration` 字段已存在，但 steady-state 之外的完整 lifecycle 语义仍由 plan 69 承接。
- 仍未完成的 steady-state gap：
  - `ValidationReason` 还没有真正贯穿到 runtime 执行流；`validateAt` / `validateSubtree` / `validateAll` 当前基本忽略 `reason` 参数。
  - submit/commit supersession 还没有按 plan 要求形成 owner-local reasoned arbitration；现有实现仍主要依赖 path-level stale-run cancellation。
  - `applyExternalErrors` 已存在，但 clear-on-write 语义尚未对齐到“按 `sourceId` + ancestor chain” 的计划要求。
  - `applyChangesAndRevalidate` 已存在，但当前实现更接近“写值后 `validateForm()`”，还没有完全对齐计划中的 owner-local atomic semantics。
  - `ChildValidationContract` 只落了 registration/unregistration plumbing，尚未真正接入 `submit()` / `canSubmit` / child snapshot orchestration。
  - `canSubmit` 当前仍是简单的 `valid && !validating`，没有纳入 child contract 或更完整的 form-specific gating 语义。
- `RuntimeRuleOverlayDescriptor` / `RuntimeOpaqueValidationDescriptor` 仍未实现，且继续留在本计划外。

### Reference Plans

- `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md` 处于 `deferred`，不是当前执行基线。
- `docs/plans/67-hidden-field-policy-implementation-plan.md` 已 completed；其 hidden-field 行为必须在本计划全程保持 non-regression。
- Dynamic schema refresh / owner recreation lifecycle 由 successor plan 69 独立承接。

## Goals

- 让 runtime public/internal contracts 与当前 validation architecture 对齐，不再依赖口头约定或实现特例。
- 为 owner-local validation 落地最小但完整的 steady-state 实现路径：先收口 contract correctness，再收口 child owner steady-state 协作。
- 为后续代码实施提供单一 owner plan，避免 steady-state validation work 同时散落在 deferred roadmap、旧 completion plans、和新 architecture wording 之间。

## Non-Goals

- 不在本计划中引入 warning severity、diagnostics UI、或更大范围的 validation introspection 产品化能力。
- 不重开 `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md` 中更长期的 validation graph compaction / memory-optimization 话题。
- 不把本计划扩展成全仓库统一 owner runtime 改造；当前只聚焦 validation-capable scopes。
- 不要求一次性把所有 renderer family 都迁移到新 contract；renderer adoption 只做到 contract 正确性所必需的范围。
- 不在本计划内实现 dynamic schema refresh / owner recreation 全流程；该部分由 successor plan 单独承接。
- 不推进 compiler-described composite validation、validation graph compaction、或 registration-reduction 方向；这些仍属于 `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md` 的 deferred 领域。
- 不实现 `RuntimeRuleOverlayDescriptor` 或 `RuntimeOpaqueValidationDescriptor`；这些属于 Phase 4 future work。

## Scope

### In Scope

- `docs/architecture/form-validation.md`
- `docs/references/form-validation-execution-details.md`
- `packages/flux-core/src/types/validation.ts`
- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-registration.ts`
- `packages/flux-runtime/src/form-runtime-subtree.ts`
- `packages/flux-runtime/src/form-runtime-types.ts`
- `packages/flux-runtime/src/index.ts`
- focused tests under `packages/flux-runtime/src/**/*.test.ts`
- minimal consumer-proof coverage in `packages/flux-react` or relevant renderer integration tests when contract correctness requires it

### Out Of Scope

- warning / info severity model
- debugger UI feature work beyond minimal runtime observability hooks required by this contract
- generic cross-domain owner runtime unification outside validation-capable scopes
- large-scale renderer-family cleanup unrelated to validation contract correctness
- explicit dynamic schema refresh / owner recreation implementation (plan 69)
- composite-control compiler migration and broader validation graph redesign from plan 09
- `RuntimeRuleOverlayDescriptor` / `RuntimeOpaqueValidationDescriptor` overlay system

## Execution Plan

### Phase 1 - Contract Surface Alignment

Status: completed
Targets: `packages/flux-core/src/types/validation.ts`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/form-runtime-types.ts`

- [x] Audit current `FormRuntime` / validation-related public types against the architecture doc and list exact contract mismatches. (done: see Current Baseline / gaps section above)
- [x] Add `ValidationOwnerLifecycleState` type, `ValidationReason` type, `FieldRegistrationHandle` interface, `ApplyExternalErrorsInput` interface, `ScopeValidationStateSnapshot` interface, `ChildValidationMode` type, `ChildValidationContract` interface to `validation.ts`.
- [x] Add `ValidationScopeRuntime` base interface and extend `FormRuntime` from it in `runtime.ts`.
- [x] Add `lifecycleState`, `modelGeneration`, `applyChangesAndRevalidate`, `applyExternalErrors`, `getScopeState`, `getScopeRootErrors`, `isPathOwned`, `updateFieldRegistration`, `canSubmit`, `allTouched` to the contracts.
- [x] Update `registerField` signature on `FormRuntime` to return `FieldRegistrationHandle` instead of plain `() => void`.
- [x] Update `sourceKind` in `ValidationError` to include `row`, `scope-root`, `external`, `runtime-overlay`, `runtime-opaque`.
- [x] Update tests or type-level assertions so contract drift is visible in CI.

Exit Criteria:

- [x] Runtime TypeScript contracts include `FieldRegistrationHandle` (accepted/rejected + registrationId), instance-addressed `updateFieldRegistration`, `applyExternalErrors`, `ValidationScopeRuntime` base, `lifecycleState`, and `ValidationReason`.
- [x] `FormRuntime` extends `ValidationScopeRuntime`.
- [x] `ValidationError.sourceKind` covers all architecture-required source kinds.
- [x] `pnpm typecheck` passes.

### Phase 2 - Owner-Local Execution Semantics

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime-registration.ts`, focused tests

- [x] Thread `ValidationReason` through `validateField`, `validateForm`, `validateSubtree` internal calls. (`reason` param now flows from `validateAt`/`validateAll`/`validateSubtree` → `validateField`/`validateForm`/`validateSubtree` → internal `validatePath`/`validateSubtreeByNode`/`validateCompiledField`; `submit` reason skips debounce in `waitForValidationDebounce`; `submit()` calls `validateForm('submit')`)
- [x] Finish `applyExternalErrors` clear-on-write behavior so it follows `sourceId` and changed-path ancestor-chain semantics.
- [x] Implement `getScopeState()` returning `ScopeValidationStateSnapshot` (valid, hasErrors, validating, lifecycleState, ready).
- [x] Implement `getScopeRootErrors()`.
- [x] Implement `isPathOwned(path)`.
- [x] Implement `canSubmit` and `allTouched` properties.
- [x] Implement `lifecycleState` (start as `active` for now; `bootstrapping`/`refreshing`/`disposed` are plan 69 concerns but the field must exist).
- [x] Implement `applyChangesAndRevalidate` for atomic write + revalidation (owner-local). (`revalidateDependents` is now `await`-ed for each changed path before `validateForm(reason)` is called)
- [x] Add submit/commit supersession: `submit` and `commit` reasons cancel in-flight lower-priority `change`/`blur`/`manual` debounces for the supersession set.
- [x] Verify `valid`, `validating`, `ready`, and `canSubmit` stay coherent when debounced async work is pending.

Exit Criteria:

- [x] Focused tests prove `submit`/`commit` reasons supersede lower-priority work and stale lower-priority async completions do not publish.
- [x] Focused tests prove debounced async pending contributes to `validating` / readiness during the debounce window.
- [x] Focused tests prove `applyExternalErrors` publishes owner summary state atomically and clears by `sourceId` along the changed-path ancestor chain.
- [x] `getScopeState()` returns coherent `valid`, `validating`, `ready`, `lifecycleState`.

### Phase 3 - Registration And Child-Owner Lifecycle

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-registration.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/index.ts`, focused tests

- [x] Update `registerField` to return `FieldRegistrationHandle` (accepted + registrationId + unregister).
- [x] Implement `registrationId`-based identity inside `ManagedFormRuntimeSharedState`: `runtimeFieldRegistrations` keyed by registrationId, not by path.
- [x] Implement duplicate-path registration policy: reject (return `accepted: false`) when a registration for the same path is already active (repository choice: reject duplicates).
- [x] Implement `updateFieldRegistration(registrationId, patch)` instance-addressed partial update.
- [x] Introduce the minimal parent/child contract plumbing: `ChildValidationContract` registration/unregistration hooks on `FormRuntime` (`registerChildContract` / `unregisterChildContract`).
- [x] Wire child contract state into steady-state submit/gating behavior where this plan owns it.
- [x] Ensure `dispose()` rejects new registration and validation requests.
- [x] Add focused tests for duplicate-path rejection, `updateFieldRegistration`, stale-handle `unregister` no-ops, and `accepted: false` handles.
- [x] Add focused tests for child contract activation/deactivation.

Exit Criteria:

- [x] `registerField` returns `FieldRegistrationHandle` with `accepted` and `registrationId`.
- [x] Duplicate-path registration returns `accepted: false` and does not corrupt existing registration.
- [x] `updateFieldRegistration` updates only the named registrationId, ignores unknown/stale handles.
- [x] Focused tests prove child activation snapshotting or steady-state child gating behavior where owned by this plan.
- [x] `pnpm typecheck` passes.

### Phase 4 - Consumer Proof And Documentation Closure

Status: completed
Targets: `packages/flux-react/src/*` (minimal), validation docs, `docs/logs/2026/04-12.md`

- [x] Update `packages/flux-react` call sites for `registerField` to handle `FieldRegistrationHandle` return instead of plain `() => void`.
- [x] Re-audit plan 67 hidden-field behavior against the landed contract changes and add non-regression coverage where needed.
- [x] Re-audit the validation docs against landed runtime behavior and update any wording that still describes future intent rather than the shipped baseline.
- [x] Record implementation slices and closure evidence in the daily log.

Exit Criteria:

- [x] All `registerField` call sites in `flux-react` compile cleanly with the new return type.
- [x] Hidden-field behavior from plan 67 remains intact under the new runtime contract.
- [x] Docs describe the landed runtime rather than the overstated completed state from the prior plan closure.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes.

## Validation Checklist

- [x] Registration contract is instance-addressed (`registrationId`) and returns `FieldRegistrationHandle`
- [x] Duplicate-path registration returns `accepted: false`
- [x] `updateFieldRegistration` is instance-addressed and ignores stale handles
- [x] Submit/commit supersede lower-priority validation work per owner-local rules
- [x] Debounced async pending contributes to `validating` / readiness consistently
- [x] External error injection publishes owner summary state atomically and clears by source/context on owner-local writes
- [x] `getScopeState()` returns coherent `valid`, `validating`, `ready`, `lifecycleState`
- [x] `isPathOwned` returns correct results
- [x] `canSubmit` and `allTouched` are correctly derived for the steady-state semantics owned by this plan
- [x] `applyChangesAndRevalidate` is owner-local and atomic
- [x] Child contract steady-state behavior is implemented beyond raw registration/unregistration plumbing
- [x] Plan 67 hidden-field behavior remains covered as a non-regression baseline
- [x] All `registerField` call sites in `flux-react` use the new `FieldRegistrationHandle` return
- [x] `ValidationReason` is threaded through internal validation calls, not just present in the interface signature
- [x] Validation docs and plan status updated to match landed behavior
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

All phases completed as of 2026-04-12. The following gaps from the earlier partial state are now landed:

- `applyExternalErrors` now rebuilds `store.errors` atomically from the side-map; `setValue`/`setValues` clear external errors via `sourceId`-keyed side-map and republish filtered errors to the store.
- `submit()` calls `supersedeLowerPriorityWork()` before `validateForm()`, bumping all `validationRuns` counters and cancelling all debounces.
- `computeCanSubmit()` blocks on active `summary-gate` child contracts.
- `submit()` notifies active `recurse-submit` child contracts after own-form validation passes.
- `isOwnerCompatible` is implemented in `packages/flux-runtime/src/form-runtime-lifecycle.ts` and exported from the package index.
- `refreshCompiledModel` now computes `ruleIdentitySet` per path and selectively retains/clears field errors using `computeRefreshErrorRetention`.

Follow-up:

- dynamic schema refresh / owner recreation lifecycle moves to successor plan `docs/plans/69-dynamic-schema-validation-owner-lifecycle-implementation-plan.md`
- `RuntimeRuleOverlayDescriptor` / `RuntimeOpaqueValidationDescriptor` overlay system, if ever productized, should become a new successor plan.
- If warning severity becomes a concrete product requirement, create a successor plan instead of expanding this plan mid-flight.
- If dynamic-schema debugger UX requires more than minimal observability hooks, move that work to a debugger-specific successor plan.
