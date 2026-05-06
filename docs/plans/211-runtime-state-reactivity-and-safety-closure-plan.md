# 211 Runtime State Reactivity And Safety Closure Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-deep-audit-full-7/{04-state-ownership.md,05-reactive-precision.md,06-async-safety.md,07-lifecycle.md,08-validation.md,13-type-safety.md,19-error-propagation.md}`, `docs/analysis/2026-05-05-deep-audit-full-7/summary.md`, `docs/architecture/{renderer-runtime.md,form-validation.md,surface-owner.md,field-binding-and-renderer-contract.md}`
> Related: `docs/plans/186-detail-and-variant-async-sequencing-safety-plan.md`, `docs/plans/201-surface-family-runtime-convergence-plan.md`, `docs/plans/203-runtime-validation-and-data-source-contract-closure-plan.md`, `docs/plans/210-deep-audit-full-7-confirmed-defect-remediation-program-plan.md`

## Purpose

收口 `full-7` 中仍未被旧计划覆盖的 runtime-side confirmed defects：pseudo-controlled open state、宽订阅带来的真实无效唤醒、render 期副作用、hidden validation participation 缺口、多个保存/校验链路的 fire-and-forget / rejection 漏洞、危险类型边界，以及保留的错误传播失真问题。本计划的完成态是：这些 retained defects 在 live runtime / react host / advanced-form 边界上达到当前 supported baseline，并有 focused proof，而不是继续停留在审计文档里。

## Current Baseline

- declarative surface family 已在 plan `201` 中统一到 shared `SurfaceRuntime`，但 `use-surface-renderer.ts` 仍保留 `localOpen/effectiveOpen` 这条第二真源，外部 runtime close 未回写本地 open 时仍可能被 effect 重新打开。
- `renderer-runtime.md` 已把“subscription granularity over broad invalidation”和“render phase must stay side-effect free”写成当前 guardrail，但 `full-7` 仍确认保留了多处高置信问题：surface summary 对整栈 `entries` 宽订阅，designer toolbar / inspector 使用 full snapshot，空 `name` 分支下的 code-editor / detail-field / key-value / array-editor 仍建立明知无效的 owner 订阅。
- `NodeRenderer` 当前仍在 render 阶段通过 `useMemo` 做 namespace 注册并同步安装 prepared imports，这与 `renderer-runtime.md` 中“render phase must stay side-effect free”直接冲突。
- `form-validation.md` 已确认 hidden participation 应由 owner runtime 负责，但 live code 仍只按精确 path 记录 `hiddenFields`；隐藏父路径不会让后代编译字段自动退出验证。
- 多条异步链路仍保留真实未处理 promise 或静默失败：report designer 首次字段源刷新吞错，variant-field / table quick edit / spreadsheet selection-submit / form advanced validation / WordEditor save 等路径仍存在 fire-and-forget、未接错或未下传 `AbortSignal`。
- retained 类型边界问题仍存在：report inspector `body` 过窄迫使 `props as any` 转发，detail-view 把 `'custom'` 写进 `ValidationError.rule`，`runtime-factory` 把 `Partial<ActionContext>` 强装成完整 `ActionContext`。
- retained error-propagation 缺口仍存在：formula compile/execute 丢 `cause`、validation runtime 把真实异常误记为 `cancelled`、form `initAction` 失败被吞且 init key 前移、report preview abort 丢 `cancelled` 语义。

## Goals

- 清除 retained runtime-side 双事实源、render-phase side effect、validation participation、async safety、type-boundary 和 error-propagation defects。
- 让必须修的 reactive-precision 问题只覆盖已确认的高置信路径，不扩大成全仓泛化的“所有订阅都要最优”运动。
- 为每个 retained defect 提供 focused verification，并在需要时同步 owner docs 到 live baseline。

## Non-Goals

- 不重做整个 reactive substrate 或 scope subscription API。
- 不把已在 `full-7` 中降级/驳回的 naming、generic optimization、或非 blocking observability 噪音重新拉回本计划。
- 不处理 renderer/workbench/styling/a11y/doc-path/test-hardening/performance hot path，这些由 plans `212`-`214` 承接。
- 不重新打开已由 plans `186`、`201`、`203` 收口且不在 `full-7` retained set 内的问题。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flow-designer-renderers/src/{designer-toolbar.tsx,designer-inspector.tsx,designer-page.tsx}`
- `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`
- `packages/spreadsheet-renderers/src/{spreadsheet-interactions/use-spreadsheet-shell.ts,use-spreadsheet-interactions.ts,spreadsheet-interactions/use-selection.ts}`
- `packages/flux-renderers-form-advanced/src/{detail-view/detail-field.tsx,detail-view/detail-view.tsx,key-value.tsx,array-editor.tsx,variant-field/variant-field.tsx}`
- `packages/flux-renderers-data/src/table-renderer/{table-quick-edit-cell.tsx,table-quick-edit-controller.ts}`
- `packages/flux-runtime/src/{form-runtime.ts,form-runtime-values.ts,form-runtime-array.ts,form-runtime-validation.ts,runtime-factory.ts}`
- `packages/flux-runtime/src/form-runtime-field-ops.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/word-editor-renderers/src/{word-editor-page.tsx,toolbar/page-controls.tsx}`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-formula/src/compile/formula-compiler.ts`
- `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts`
- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/report-designer-renderers/src/host-action-provider.ts`
- directly affected focused tests and owner docs

### Out Of Scope

- `17-naming` public vocabulary cleanup
- workbench / renderer metadata / a11y / BEM / UI-component issues
- docs path drift, coverage policy uplift, oversized-file split
- report-designer deep-copy performance work

## Execution Plan

### Phase 1 - Close State-Source And Reactive-Precision Defects

Status: in progress
Targets: `use-surface-renderer.ts`, flow-designer shell files, `use-code-editor-binding.ts`, `detail-field.tsx`, `key-value.tsx`, `array-editor.tsx`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Remove the retained pseudo-controlled `localOpen` vs `SurfaceRuntime` split so declarative surface open state has one live source of truth.
- [x] [Fix] Close the retained state-source defects in spreadsheet toolbar (`cellValue/commentText`) and word-editor `PageControls.pageMode` so local state no longer drifts from the owned runtime/store truth.
- [x] [Fix] Narrow the retained high-confidence broad subscriptions: surface-summary stack read, designer toolbar/inspector full snapshots, and the empty-`name` owner subscriptions in code-editor / detail-field / key-value / array-editor.
- [x] [Decision] Explicitly document which remaining broad subscriptions are still allowed because they own host-scope projection or shell composition, so the plan does not silently expand into full reactive perfectionism.
- [x] [Proof] Add focused tests proving declarative close does not reopen from stale local state and that the in-scope empty-`name` paths no longer subscribe to full owner state unnecessarily.

Exit Criteria:

- [x] The retained declarative surface, spreadsheet-toolbar, and word-editor page-mode second-source-of-truth defects are closed.
- [x] Only the retained must-fix broad subscriptions are changed; non-retained shell-wide subscriptions are either left alone or explicitly adjudicated.
- [x] Focused tests cover the corrected state/reactivity baseline.
- [x] `docs/architecture/renderer-runtime.md` and/or `docs/architecture/surface-owner.md` are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Remove Render-Phase Side Effects And Validation Participation Drift

Status: in progress
Targets: `node-renderer.tsx`, `form-runtime-validation.ts`, `form-runtime-field-ops.ts`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Move namespace registration and prepared-import installation out of render phase into an effect/commit-safe path without reintroducing lifecycle leaks.
- [x] [Fix] Change hidden participation semantics so hiding a parent path actually removes descendant compiled fields from active validation participation.
- [x] [Decision] Record the final owner-baseline wording for hidden subtree participation and render-phase side-effect guardrails.
- [x] [Proof] Add focused tests for render-phase side-effect removal and hidden-parent subtree validation exclusion.

Exit Criteria:

- [x] `NodeRenderer` no longer mutates runtime state during render for the retained namespace/import paths.
- [x] Hidden parent paths no longer leave descendant compiled fields participating in validation.
- [x] Focused tests cover both retained defects.
- [x] `docs/architecture/renderer-runtime.md` and/or `docs/architecture/form-validation.md` are updated to the final baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Close Async Safety Defects On Retained User-Visible Paths

Status: in progress
Targets: report designer page, word editor page, spreadsheet/table save paths, advanced-form files, form runtime/save paths, form renderer, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Ensure retained startup/save/submit/validation paths no longer rely on unhandled fire-and-forget promises or swallowed rejections, including table quick edit, spreadsheet submit/selection, and dependent revalidation paths.
- [ ] [Fix] Add `AbortSignal` propagation where the retained path already has a supporting contract and stale-guard-only behavior is insufficient.
- [ ] [Decision] Keep the plan bounded to the retained user-visible paths instead of reopening every downgraded async resource-management issue; explicitly exclude already-downgraded `node-renderer-effects.ts` lifecycle dispatch handling.
- [ ] [Proof] Add focused tests for report-designer startup failure visibility, WordEditor save rejection handling, table/spreadsheet save rejection handling, dependent revalidation rejection handling, and advanced-form validation promise handling.

Exit Criteria:

- [ ] No in-scope retained async path still drops a user-visible rejection on the floor.
- [ ] In-scope retained paths that already support cancellation now pass `signal` or explicitly justify why `latest-wins` remains sufficient.
- [ ] Focused tests cover the landed retained async fixes.
- [ ] `docs/architecture/action-interaction-state.md` and/or related owner docs are updated if baseline changes; otherwise explicitly record `No owner-doc update required`.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Close Retained Type-Boundary And Error-Propagation Defects

Status: in progress
Targets: `runtime-factory.ts`, report inspector shell, detail-view helper, formula compiler, form renderer, report host provider/core dispatch, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Replace the retained dangerous casts and out-of-contract writes (`props as any`, `'custom'`, `ctx as ActionContext`) with contract-honest types or validated translation layers.
- [ ] [Fix] Preserve retained failure semantics and structured metadata: formula error `cause`, validation runtime non-cancelled errors, declarative surface close/unmount duplicate publication removal, form `initAction` retryability, and report preview abort `cancelled` semantics.
- [ ] [Proof] Add focused tests for each retained boundary/propagation defect.
- [ ] [Decision] Record any final owner-doc wording needed for `ActionContext`, `ValidationError.rule`, or error-result semantics.

Exit Criteria:

- [ ] The retained dangerous type-boundary escapes are removed or replaced by explicit, validated contract translation.
- [ ] The retained lifecycle/error-propagation semantics are preserved end-to-end for the in-scope paths, including declarative surface closed-summary publication.
- [ ] Focused tests cover all landed retained fixes in this phase.
- [ ] Affected owner docs are updated if the public/current baseline changed; otherwise explicitly record `No owner-doc update required`.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] All in-scope retained live defects from dimensions `04`, `05`, `06`, `07`, `08`, `13`, and `19` are fixed, or moved to explicit successor ownership with recorded reasoning.
- [ ] No in-scope confirmed defect is silently downgraded to optimization-only cleanup.
- [ ] The in-scope retained set is explicit and auditable: declarative surface / spreadsheet toolbar / word-editor page-mode second-source-of-truth defects, retained broad subscriptions, duplicate `publishClosed()` publication, render-phase side effects, hidden subtree validation participation, retained async fire-and-forget paths, retained type-boundary escapes, and retained error-propagation defects.
- [ ] Focused verification exists for each landed retained defect family: state/reactivity, lifecycle duplicate publication, render-phase side effects, validation participation, async safety, type boundaries, and error propagation.
- [ ] Affected owner docs are synced to the live baseline, or each phase explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope retained runtime-side blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Broad Reactive Precision Outside The Retained Set

- Classification: `watch-only residual`
- Why Not Blocking Closure: this plan only owns the `full-7` retained high-confidence reactive defects, not every broad subscription pattern that could be optimized in the future.
- Successor Required: no

## Closure

Status Note: In progress. This pass landed part of the retained set, including the duplicate declarative surface closed-summary publication fix in `packages/flux-renderers-basic/src/use-surface-renderer.ts`, but the broader retained runtime/reactivity/async/type/error items remain open and this plan cannot close yet.

Status Note: In progress. This pass closes the retained state-source/reactivity items (`use-surface-renderer`, spreadsheet shell, word-editor page mode, empty-name subscriptions), the hidden-subtree validation participation defect, and the retained `NodeRenderer` render-phase side-effect defect with focused proof. The plan remains open because retained async user-visible rejection handling is still incomplete, including the attempted but reverted WordEditor save-failure UX path.

Closure Audit Evidence:

- Focused proof passed for declarative surface stale-reopen prevention in `packages/flux-renderers-basic/src/__tests__/basic-page-layout.test.tsx`.
- Focused proof passed for hidden-parent subtree exclusion in `packages/flux-runtime/src/__tests__/hidden-field-policy.test.ts`.
- Focused proof passed for render-abort import setup safety in `packages/flux-react/src/__tests__/compilation-and-boundaries.test.tsx`.
- Existing import behavior smoke tests still passed in `packages/flux-react/src/schema-renderer-imports-basic.test.tsx`.

Follow-up:

- Finish retained async user-visible rejection handling and proof, especially the WordEditor save-failure path that was reverted after failing focused verification.
