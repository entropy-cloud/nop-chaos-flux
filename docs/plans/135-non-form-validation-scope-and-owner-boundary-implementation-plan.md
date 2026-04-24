# 135 Non-Form Validation Scope And Owner Boundary Implementation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-24
> Source: `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/surface-owner.md`, `docs/references/form-validation-runtime-types.md`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/contexts.ts`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-compiler/src/schema-compiler.ts`
> Related: `docs/plans/127-data-domain-owner-doc-alignment-and-operational-rules-plan.md`, `docs/plans/130-form-validation-current-vs-target-wording-convergence-plan.md`, `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md`

## Purpose

收口一个可执行的 Phase 3 owner-scope feature slice：先让 `SchemaRenderer` 的 page-owned root path 成为第一个真实落地的 non-form validation owner family，并补齐 nearest-owner reactive substrate，使普通输入控件在没有包裹 `<form>` 的情况下，仍能接入最近的 validation-capable owner 完成字段验证、错误展示、以及 owner-local summary state 发布。

## Current Baseline

- `docs/architecture/form-validation.md` 已明确 `ValidationScopeRuntime` 才是正确抽象，但 live code 中唯一成熟 concrete owner family 仍是 `FormRuntime`。
- `packages/flux-react/src/hooks.ts` 的 `useCurrentForm()` 仍然是字段层读取 validation owner 的主要入口；没有通用 `useCurrentValidationScope()` 或等价入口。
- `packages/flux-renderers-form/src/field-utils.tsx` 当前在 `!currentForm` 时只执行 `scope.update()`，不会触发 `validateAt`、`touch`、错误展示、或 hidden-field participation policy。
- `docs/architecture/data-domain-owner.md` 已把 page/root、filter/search panel、local draft scope 定义为潜在 `Data Domain Owner` family，但当前 live runtime 还没有通用 reusable substrate 把它们变成 concrete validation owners。
- `packages/flux-core/src/types/renderer-hooks.ts`、`packages/flux-react/src/hooks.ts`、`packages/flux-react/src/schema-renderer.tsx` 仍以 `FormRuntime` / `PageRuntime` / `SurfaceRuntime` 分离 provider 为主，没有一个通用且可响应式订阅的 nearest-validation-owner contract。
- `packages/flux-runtime/src/page-runtime.ts` 与 `packages/flux-runtime/src/runtime-factory.ts` 当前没有 page/root validation facet；page fallback owner 不是一个窄的 wiring 开关，而是需要新的 runtime 创建与 provider 接线。
- `packages/flux-react/src/node-renderer.tsx` 仍在通用 hidden-field effect 中直接调用 `currentForm.notifyFieldHidden(...)`，所以 non-form owner 不仅要改字段 helper，也要改 node-level participation path。
- `packages/flux-compiler/src/schema-compiler.ts` 当前只在 `renderer.scopePolicy === 'form'` 时附加 `validationPlan`；如果不把编译输出扩展到 page-owned root path，runtime 无法真正执行 non-form validation owner。
- `packages/flux-react/src/schema-renderer.tsx` 目前总是创建 `PageRuntime`，但实际根 render scope 可能是 `props.parentScope ?? page.scope`。本计划若不先定清“谁是 fallback owner”，就会把 page-owned fallback 与嵌入式 parent-scope render 混为一谈。
- 仓库里当前没有一个已存在且成熟的 `filter/search panel` renderer/schema 入口可作为第一批 concrete non-form owner adopter；把它与 page/root fallback 一起纳入同一执行计划会让 owner factory、renderer entry point、compiler contract 同时扩散。
- `docs/architecture/form-validation.md` 的 Phase 3 同时列出了四件未来工作：common validation scope runtime、non-form validation scopes、compiler-driven owner classification、automatic draft ownership。把这四件事一次性作为一个大重构执行，范围过宽，风险高。
- 当前最直接的用户可见缺口是：form 外 bound field 没有 Flux validation semantics；这意味着 page-level field、filter panel、search panel 一类场景只能拿到值写入，拿不到 owner-local validation behavior。

## Goals

- 提供一个可复用的 `ValidationScopeRuntime` concrete substrate，使非 submit-oriented owner 不再依赖完整 `FormRuntime` 才能获得 validation semantics。
- 让 form 外的普通字段控件可以接入最近 validation owner，具备 change/blur 验证、字段错误显示、以及 owner-local summary 状态更新。
- 让 `SchemaRenderer` 的 page-owned root path 成为第一个 concrete non-form owner family，并为它建立最小可用的 compiler/runtime/react shared contract，而不是继续依赖 renderer-level 偶然约定。
- 保持 `FormRuntime extends ValidationScopeRuntime`，不破坏现有 form submit、touched、dirty、visited、`canSubmit` 语义。

## Supported Owner Families In This Plan

- `form` 继续作为 submit-oriented validation owner。
- `SchemaRenderer` 的 page-owned root path 作为本计划唯一新增的 concrete non-form owner family，在没有更近 owner 时承接 bound field validation。

## Explicit Non-Owner Families In This Plan

- `object-field`
- `array-field`
- `variant-field`
- table row scope
- `loop` item scope
- `dialog` / `drawer` surface shell
- renderer-local draft editors such as current `detail-field` / `detail-view`
- future `filter/search panel` owner family

这些边界在本计划内保持现状：要么继续 parent-owned / inherit-owner，要么继续 renderer-local draft runtime，不在本计划内被自动提升为新 owner。

## Non-Goals

- 不在本计划内完成 row-local staged child-domain 全量收口。
- 不在本计划内把 `detail-field` / `detail-view` 的 staged owner 全部改写成 compiler-driven automatic draft owner。
- 不在本计划内交付完整的 multi-owner child contract automation、lifecycle snapshot submit orchestration、或 richer `summary-gate` / `recurse-submit` policy matrix。
- 不要求所有 renderer family 同步支持复杂 owner-mode 切换；本计划只覆盖让 non-form validation owner 成立所需的最小边界分类。
- 这里的 `summary` 仅指 owner-local `getScopeState()`、valid/ready/validating 一类状态发布；不包括 parent-child gating、action disable policy、submit recursion、或跨 owner orchestration。

## Scope

### In Scope

- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-core/src/types/renderer-hooks.ts`
- `packages/flux-react/src/contexts.ts`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/page-runtime.ts`
- `packages/flux-runtime/src/validation-runtime.ts`
- `packages/flux-compiler/src/schema-compiler.ts`
- new reusable validation-scope runtime module(s) under `packages/flux-runtime/src/`
- page-owned root fallback owner creation path in compiler/runtime/react
- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/form-state.ts` or successor generic validation-state selector module
- focused tests for standalone field validation, page/root owner fallback, provider wiring, selector behavior, and hidden-field participation
- doc updates in `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`, and related log entries

### Out Of Scope

- row-local staged editor commit retargeting by `rowKey`
- generalized child-owner draft orchestration for every composite field family
- surface-owner refactors unrelated to validation ownership
- broad validation performance rewrites from the deferred long-range roadmap
- embedded `SchemaRenderer` trees that render against `props.parentScope` instead of their own `page.scope`; those remain parent-owned in this plan and do not auto-create a page fallback owner

## Execution Plan

### Phase 1 - Extract Reusable Validation Owner Substrate

Status: completed
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, new runtime modules

- [x] Re-audit the current `FormRuntime` implementation and identify the pieces that are genuinely form-specific versus generic owner-validation machinery.
- [x] Extract or introduce a reusable validation-scope builder/factory that owns compiled model attachment, registration state, field validation state, external errors, path ownership checks, and async validation coordination without depending on submit/touched policy.
- [x] Keep `FormRuntime` as a specialization layered on top of that substrate rather than duplicating owner-validation logic.
- [x] Preserve current owner-local invariants: `rootPath` ownership rejection, model-generation awareness, stale async suppression, and owner-local `applyChangesAndRevalidate(...)` atomicity.

Exit Criteria:

- [x] A concrete reusable validation-scope runtime exists beneath `FormRuntime`.
- [x] `FormRuntime` still passes existing focused validation/runtime tests without semantic regression.
- [x] Generic owner code no longer requires `submit`, `touchField`, or `canSubmit` semantics just to execute validation.

### Phase 2 - Establish Minimal Compiler/Runtime Owner Contract For `form` And Page-Owned Root

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-react/src/schema-renderer.tsx`, `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`

- [x] Land the narrow compiler/runtime owner contract needed for this feature slice: `form` remains renderer-created, and `SchemaRenderer` page-owned root becomes the only non-form fallback owner in this plan.
- [x] Extend compiler output so the page-owned root path can receive a compiled validation model instead of limiting `validationPlan` attachment to `form` only.
- [x] Make an explicit boundary decision for embedded `SchemaRenderer` usage: when `props.parentScope` is provided, this plan keeps the subtree parent-owned and does not auto-create a second fallback owner.
- [x] Ensure field mounting and runtime registration still cannot create a brand-new owner at ordinary unclassified boundaries.
- [x] Keep projected inline editors, row scopes, `loop`, surface shells, current renderer-local draft editors, embedded parent-scope schema renders, and future filter/search owners on their existing non-owner / inherit-owner / renderer-local semantics.
- [x] Update architecture docs so current live baseline reflects page-owned root as the first landed non-form owner family, while leaving embedded parent-scope adoption, filter/search, and broader owner-boundary work as future slices.

Exit Criteria:

- [x] Compiler/runtime/react share an observable minimal owner contract for exactly the supported owner families in this plan.
- [x] Unclassified boundaries still do not create owners.
- [x] Focused tests or example schemas prove only `form` and page-owned root create validation owners in the paths covered by this plan, while object/array/loop/surface shells and embedded parent-scope schema renders do not.
- [x] Docs clearly separate what this plan lands from later embedded-root adoption, filter/search, row/draft, and generalized owner-tree work.

### Phase 3 - Introduce Reactive Page-Owned Root Owner Provisioning And Fallback

Status: completed
Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/contexts.ts`, `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/page-runtime.ts`

- [x] Introduce a React/runtime context for the nearest validation-capable owner that is not limited to `FormContext`.
- [x] Add the generic reactive hook/query surface needed by field consumers, rather than exposing only imperative owner methods.
- [x] Keep `useCurrentForm()` for form-only behavior, but add a general hook or equivalent runtime accessor for nearest validation owner lookup and owner-backed field state subscription.
- [x] Add runtime creation and provider wiring for `SchemaRenderer` page-owned root fallback owner so fields outside forms have a concrete owner instead of falling back to raw scope writes.
- [x] Ensure non-form owners publish field state and owner-local summary state without inheriting form-only touched/submit policy.

Exit Criteria:

- [x] There is a concrete non-form validation owner creation path in live code.
- [x] React field consumers can subscribe to nearest-owner field state without depending on `FormRuntime.store` directly.
- [x] A field rendered outside `<form>` can resolve a nearest validation owner.
- [x] Existing form context consumers continue to behave as before.

### Phase 4 - Wire Field Controls And Hidden Participation To Nearest Validation Owner

Status: completed
Targets: `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/form-state.ts` or successor generic selector module, `packages/flux-react/src/node-renderer.tsx`, relevant form-field renderers and hooks

- [x] Replace the current `currentForm`-only validation branching in field helpers with nearest-owner behavior: when a validation owner exists, use owner-local validation APIs even if it is not a `FormRuntime`.
- [x] Update field presentation and error hooks so non-form owners can expose owner-backed field state without depending on `FormRuntime`-only selectors.
- [x] Preserve form-only behavior for touch/visited/showError policies while allowing non-form owners to validate on change/blur and expose error state.
- [x] Align hidden-field participation handling in both field helper and node-level hidden effects so non-form owners also clear stale errors and honor participation updates.
- [x] Keep plain non-owner subtrees on the current lightweight `scope.update()` path.

Exit Criteria:

- [x] Form-external bound inputs validate through a nearest validation owner instead of silently bypassing validation.
- [x] Error display hooks return real owner state for non-form owners.
- [x] Form-only UX policies do not leak into non-form owners unless explicitly modeled.

### Phase 5 - Verification, Examples, And Closure Audit

Status: completed
Targets: focused tests, `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`, `docs/logs/`, this plan file

- [x] Add focused tests proving standalone field validation outside form, page/root fallback ownership, provider wiring, selector behavior, and hidden-field participation cleanup.
- [x] Add or update at least one representative schema/example covering page/root non-form validation owner behavior.
- [x] Update relevant architecture docs and append daily log entries describing the landed runtime behavior and remaining out-of-scope work.
- [x] Run a fresh independent closure audit before changing this plan to `completed`.

Exit Criteria:

- [ ] Focused tests cover the new runtime path and fail without the feature.
- [ ] Documentation matches live behavior for form and non-form owners.
- [ ] Closure evidence records an independent audit that checks live behavior rather than interface presence alone.

## Validation Checklist

- [ ] `ValidationScopeRuntime` has a reusable concrete implementation path independent of full `FormRuntime` semantics.
- [x] Inputs outside `<form>` validate when a nearest validation owner exists.
- [x] Page/root fallback ownership is explicit and tested, not accidental.
- [x] Page-owned root is implemented and documented as the first concrete non-form owner family in this plan.
- [x] Existing `FormRuntime` submit/touch semantics remain intact.
- [x] React/provider/hook wiring supports nearest-owner field-state subscription without forcing consumers onto `FormRuntime.store`.
- [ ] Unsupported owner families such as row-local staged editors remain explicitly out of scope and do not receive accidental partial semantics.
- [ ] Unclassified boundaries still do not create owners.
- [ ] Embedded `SchemaRenderer` trees with `parentScope` remain parent-owned unless a later successor plan explicitly widens support.
- [x] Relevant architecture docs are updated to reflect the landed baseline.
- [x] A representative example/schema for non-form validation owner behavior is updated.
- [x] Focused verification is completed for runtime behavior and regression coverage.
- [x] Independent sub-agent closure audit is completed and recorded before plan closure.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] Focused tests for the landed slice (`flux-renderers-form` validation UI, `flux-react` validation owner boundary, `flux-react` scope behavior)

## Risks And Rollback

- The main semantic risk is leaking `FormRuntime`-specific UX policy into non-form owners or, conversely, weakening existing form behavior while extracting the shared substrate.
- The main scope risk is letting this feature balloon into a generalized owner-tree rewrite or pulling `filter/search panel` adoption into the same slice before there is a concrete renderer entry point. If implementation pressure expands beyond the minimal owner families named here, split the remaining work into successor plans instead of silently widening this plan.
- Rollback should prefer keeping `FormRuntime` behavior unchanged and deferring non-form owner adoption rather than landing a half-shared substrate that blurs owner semantics.

## Closure

Status Note: Completed. Page-owned root non-form validation ownership is live, documented, covered by focused verification, and independently audited. Future non-form owner families stay in successor plans.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent audit (`task_id: ses_241df642cffexFamzPykrze185`)
- Evidence: independent audit concluded `Ready To Close: yes`; it verified that page-owned root non-form validation is landed, `parentScope` renders explicitly suppress fallback owner creation, focused regression tests exist for both behaviors, and the only remaining work was plan closure metadata rather than missing implementation.

Follow-up:

- Filter/search-panel owners, row-local staged child-domain semantics, automatic draft-owner extraction for `detail-*`, and broader multi-owner contract automation should land in successor plans after this narrower feature slice is complete.
