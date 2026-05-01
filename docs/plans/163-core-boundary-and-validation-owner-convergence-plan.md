# 163 Core Boundary And Validation Owner Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-live-design-and-architecture-audit.md`, `docs/analysis/2026-05-01-adversarial-review.md`, `docs/architecture/flux-core.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`, `docs/architecture/surface-owner.md`, `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/package.json`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/contexts.ts`, `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-renderers-basic/src/dialog.tsx`, `packages/flux-renderers-basic/src/drawer.tsx`
> Related: `docs/plans/135-non-form-validation-scope-and-owner-boundary-implementation-plan.md`, `docs/plans/157-validation-owner-and-submitform-implementation-alignment-plan.md`, `docs/plans/162-designer-page-and-report-selection-audit-remediation-plan.md`, `docs/plans/146-domain-host-projection-and-vocabulary-convergence-plan.md`, `docs/plans/154-complex-control-code-doc-convergence-implementation-plan.md`

## Purpose

收口 2026-05-01 live audit 中一个仍然没有闭环的 root-boundary result surface：

- `flux-core` 仍直接暴露 React-specialized renderer surface
- `SchemaRenderer` 的 root surface seam 仍是 declared-but-unused public contract
- validation owner 已从 `<form>` 扩到 page/root，但 page/root -> managed surface -> form specialization 这条 creator-owned family 还没有真正收口

本计划故意只覆盖 `core -> react -> runtime` 这一条 root boundary。它不重跑 `135` / `157` 已关闭的 page-owned root baseline，也不把 renderer-contract bypass 或 Flow/Report/Word host-contract drift 混进同一个 owner plan。

## Current Baseline

- `docs/analysis/2026-05-01-live-design-and-architecture-audit.md` 已完成一次基于 live code 和 active docs 的人工复核审计，并已明确区分“当前事实”和“目标设计”。
- `docs/plans/135-non-form-validation-scope-and-owner-boundary-implementation-plan.md` 与 `docs/plans/157-validation-owner-and-submitform-implementation-alignment-plan.md` 已落地 page-owned root 作为第一个 concrete non-form validation owner family，也已让 detail child-owner 路径进入 compiler/runtime-owned baseline。
- 当前 live code 中，`SchemaRenderer` 会把 page-owned root validation owner 接到根 `ValidationContext`；但 managed `dialog` / `drawer` surface path 仍只传 `scope`、`actionScope`、`componentRegistry`、`ownerNodeInstance`，没有为每个 surface entry 创建 surface-root validation owner。
- `packages/flux-runtime/src/runtime-owned-factories.ts` 的 `createValidationScopeRuntime()` 仍直接返回 `createManagedFormRuntime(...)`，page runtime 也仍把 validation store 强转成 `FormStoreApi`；这说明 `ValidationScopeRuntime` 仍是 form-shaped substrate，而不是独立成熟的 generic validation owner substrate。
- `packages/flux-core/src/types/renderer-core.ts`、`packages/flux-core/src/types/renderer-hooks.ts`、`packages/flux-core/src/types/runtime.ts` 仍把 `ComponentType`、`ReactNode`、`ReactElement` 等 React-shaped type surface 放在 core public contract 上；`packages/flux-core/package.json` 也仍因此保留 `@types/react`。同时 `packages/flux-react/src/schema-renderer.tsx` 仍声明但未消费 `SchemaRendererProps.surfaceRuntime`。
- 同一次 audit 还确认了 renderer-contract bypass 与 Flow/Report/Word host-contract drift，但这些属于不同 closure surface：
- `A-04` / `B-01`（raw schema fallback 与 `ignored + raw schema read`）应进入 renderer-contract successor plan。
- `C-02` / `C-03` / `D-01` / `D-02` / `D-03`（Flow/Report/Word host drift 与 Word persistence split）应进入 host-contract successor plan。
- `docs/plans/146-domain-host-projection-and-vocabulary-convergence-plan.md`、`docs/plans/154-complex-control-code-doc-convergence-implementation-plan.md`、`docs/plans/162-designer-page-and-report-selection-audit-remediation-plan.md` 已解决相邻 slices；例如 Report Designer 的 top-level `selection` / `target` alias removal 已是 live fact，剩余 drift 是 docs/manifest/publication mismatch，而不是 alias cleanup 本身。

## Goals

- 让 `flux-core` 回到 host-neutral contract baseline，不再直接暴露 React-specialized renderer surface。
- 让 validation owner family 在本计划范围内形成清晰且 live 的 page/root -> managed surface -> form specialization 分层。
- 让 `SchemaRenderer.surfaceRuntime` 这个 root seam 要么真正接线，要么从 public contract 中移除。
- 让 `ValidationScopeRuntime` 在 generic path 上不再依赖隐藏的 `FormRuntime` store 假定。

## Non-Goals

- 不在本计划内交付第二个非 React host；本计划只做 boundary hardening，不同时实现新的 host runtime。
- 不在本计划内把所有 future non-form owner family 一次性推广到 filter/search/wizard/row-local editor；本计划只覆盖 page-owned root、managed surface root、以及既有 `FormRuntime` specialization。
- 不在本计划内统一 declarative `type: 'dialog'` / `type: 'drawer'` renderer path 与 managed `SurfaceRuntime` path；若其 validation-owner 语义需要扩展，另开 successor plan。
- 不在本计划内处理 raw schema fallback / `ignored + raw schema read` 一类 renderer-contract bypass；这些工作单独归属 renderer-contract successor plan。
- 不在本计划内处理 Flow Designer / Report Designer / Word Editor host projection、manifest、component-doc、Word persistence policy 收口；这些工作单独归属 host-contract successor plan。
- 不在本计划内处理 `tag-list` / `key-value` / `array-editor` 的 required/minItems 语义、CRUD query-form imperative bridge、field chrome 双轨实现、`flow-designer-core` 的 graph/schema split、或 report canvas 的 hard-coded grid / `${fieldId}` policy。

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/renderer-hooks.ts`
- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-core/package.json`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-react/src/dialog-host.tsx`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/contexts.ts`
- `packages/flux-runtime/src/runtime-owned-factories.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/page-runtime.ts`
- `packages/flux-runtime/src/surface-runtime.ts`
- validation-runtime modules directly needed to separate `ValidationScopeRuntime` from `FormRuntime` assumptions
- focused tests covering the above behavior and boundary contracts
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/surface-owner.md`
- `docs/logs/2026/05-01.md`

### Out Of Scope

- any new non-React renderer host implementation
- filter/search/wizard owner-family rollout
- declarative dialog/drawer renderer-path validation-owner work
- `packages/flux-renderers-basic/src/dialog.tsx`
- `packages/flux-renderers-basic/src/drawer.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/*`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- `packages/flow-designer-renderers/src/designer-context.ts`
- `packages/flow-designer-renderers/src/designer-manifest.ts`
- `packages/report-designer-renderers/src/host-data.ts`
- `packages/report-designer-renderers/src/report-designer-manifest.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/word-editor-core/src/document-io.ts`
- `packages/word-editor-core/src/dataset-model.ts`
- `packages/word-editor-renderers/src/editor-canvas.tsx`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/word-editor-renderers/src/word-editor-action-provider.ts`
- `packages/flux-renderers-form-advanced/src/tag-list.tsx`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-data/src/crud-renderer.tsx` and query-form bridge redesign
- `packages/flux-renderers-form/src/renderers/shared/*` and `packages/ui/src/components/ui/field.tsx` field-chrome convergence
- `packages/flow-designer-core/src/types.ts` graph-vs-schema/UI split
- `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx` grid bounds / expression-string ownership refactor

## Execution Plan

### Phase 1 - Separate Host-Neutral Contracts From React Specialization

Status: completed
Targets: `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/package.json`, `packages/flux-react/src/schema-renderer.tsx`, related exports and docs

- [x] Re-audit every React-shaped public type currently exported from `flux-core` and freeze the minimal host-neutral contract that should remain there.
- [x] Move React-specialized renderer surface out of `flux-core` so `RendererDefinition.component`, `SchemaRendererComponent`, `RenderRegionHandle.render`, and `RendererHelpers.render` are owned by `flux-react` or another React-only contract layer rather than the core package.
- [x] Resolve the current `SchemaRendererProps.surfaceRuntime` seam explicitly: either wire caller-supplied `surfaceRuntime` end-to-end or remove it from the contract and docs.

Exit Criteria:

- [x] `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, and `packages/flux-core/src/types/runtime.ts` no longer contain `from 'react'` imports.
- [x] `packages/flux-core/package.json` no longer keeps `@types/react` only to support the public contract types touched by this phase.
- [x] `RendererDefinition.component`, `SchemaRendererComponent`, `RenderRegionHandle.render`, and `RendererHelpers.render` are exported from a React-owned module under `packages/flux-react`, not from `packages/flux-core`.
- [x] `packages/flux-react/src/schema-renderer.tsx` either consumes caller-supplied `surfaceRuntime` when present or `surfaceRuntime` is removed from `packages/flux-core/src/types/renderer-hooks.ts` and `docs/architecture/renderer-runtime.md`.
- [x] `docs/architecture/flux-core.md` and `docs/architecture/renderer-runtime.md` describe the final boundary only.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 2 - Complete The Page / Managed Surface / Form Validation Owner Family

Status: completed
Targets: `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/contexts.ts`, `docs/architecture/form-validation.md`, `docs/architecture/surface-owner.md`

- [x] Preserve the already-landed page-owned root validation owner baseline and keep embedded `parentScope` schema renders parent-owned unless explicitly widened.
- [x] Introduce a surface-root validation owner for each managed `dialog` / `drawer` entry created through `SurfaceRuntime`, with creation, provider wiring, and disposal coupled to the surface lifecycle.
- [x] Remove `FormRuntime`-specific store assumptions from the generic validation-owner path so `ValidationScopeRuntime` is no longer just a form-shaped alias hidden behind casts.
- [x] Fold the currently separate runtime-disposal leaks into the same lifecycle pass: page-side validation-owner disposal, bidirectional page-store sync unsubscribe cleanup, and tracking/disposal of owned form runtimes created through the runtime factory path.
- [x] Keep `FormRuntime extends ValidationScopeRuntime` as the submit/touch/dirty specialization instead of collapsing the families back together.

Exit Criteria:

- [x] `packages/flux-runtime/src/runtime-owned-factories.ts` no longer implements `createValidationScopeRuntime()` by directly returning `createManagedFormRuntime(...)`.
- [x] `packages/flux-runtime/src/runtime-owned-factories.ts` and `packages/flux-runtime/src/page-runtime.ts` no longer require page-root validation-store casts to `FormStoreApi` in the generic validation-owner path.
- [x] `packages/flux-runtime/src/surface-runtime.ts` creates a surface-root validation owner for each managed `dialog` / `drawer` entry, and the corresponding owner lifecycle is disposed when the surface closes.
- [x] `packages/flux-react/src/dialog-host.tsx` provides the managed surface-root validation owner around the rendered surface body instead of inheriting page-root owner implicitly.
- [x] `packages/flux-runtime/src/runtime-owned-factories.ts` and `packages/flux-runtime/src/runtime-factory.ts` dispose page-level validation owners, release bidirectional page-store sync subscriptions, and track/dispose runtime-owned form runtimes created through the scoped factory path.
- [x] Focused tests prove both current and target boundaries: page-owned root validation still works for ordinary `SchemaRenderer` root renders, while fields inside managed `dialog` / `drawer` surfaces resolve a surface-root owner rather than the page-root owner.
- [x] Focused tests prove runtime disposal no longer leaves page-sync subscriptions, page validation owners, or tracked runtime-owned form runtimes alive after `runtime.dispose()`.
- [x] Focused tests confirm the scoped behavior change is limited to managed surfaces in `packages/flux-react/src/dialog-host.tsx`; declarative renderer-path dialogs/drawers in `packages/flux-renderers-basic/src/dialog.tsx` and `packages/flux-renderers-basic/src/drawer.tsx` continue to use their existing `useSurfaceRenderer` path without a new managed surface-root owner contract in this plan.
- [x] `docs/architecture/form-validation.md` and `docs/architecture/surface-owner.md` describe the final supported family set only.
- [x] `docs/logs/2026/05-01.md` is updated.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, focused tests, scoped docs, this plan

- [x] Add or update focused tests for each phase so the landed boundaries are proven by live behavior rather than interface presence alone.
- [x] Run repo-wide verification after code changes land.
- [x] Perform a fresh independent closure audit that re-reads the live repo, checks each phase exit criterion, and confirms no current-fact vs target-design confusion remains in the scoped docs.

Exit Criteria:

- [x] Each phase has focused verification tied to its live behavior changes.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass after the scoped implementation lands.
- [x] `docs/architecture/flux-core.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`, and `docs/architecture/surface-owner.md` describe final design state only for this plan's scope.
- [x] Independent closure audit confirms no remaining plan-owned work in scope.
- [x] `docs/logs/2026/05-01.md` is updated with closure-audit evidence.

## Validation Checklist

- [x] `flux-core` no longer exports React-specialized renderer/runtime contracts in this plan's scope.
- [x] `SchemaRenderer.surfaceRuntime` is either a real supported seam or removed from the public contract.
- [x] Page-owned root non-form validation remains intact while managed surface-root validation owners become real live behavior.
- [x] `ValidationScopeRuntime` no longer depends on hidden `FormRuntime` store assumptions in the scoped generic path.
- [x] Focused verification is completed for every landed phase.
- [x] Independent sub-agent or independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

- The largest scope risk is silently turning this plan back into a grab-bag of every remaining audit item. If implementation pressure expands beyond `core -> react -> runtime` root-boundary work, move the extra work to explicit successor plans instead of widening this owner plan mid-flight.
- The largest semantic risk is confusing already-landed page/root validation behavior with still-target surface-root behavior. Any implementation or doc update that blurs those two baselines should block closure.
- The largest migration risk in Phase 1 is breaking renderer registration while moving React types out of `flux-core`; land boundary moves behind focused tests before deleting old surfaces.
- The largest migration risk in Phase 2 is introducing surface-root owner wiring without proving nearest-owner resolution behavior; closure must require behavior tests, not only new runtime fields or provider types.

## Closure

Status Note: Plan 163 is closed. `flux-core` no longer imports React in the scoped renderer/runtime contracts, `SchemaRenderer.surfaceRuntime` is a live supported seam, managed `dialog` / `drawer` surfaces now own and publish a surface-root validation owner, and runtime disposal cleans up page validation owners, page-store sync subscriptions, and tracked runtime-owned form runtimes.

Closure Audit Evidence:

- Reviewer / Agent: fresh `general` subagent closure audit
- Evidence: recorded in `docs/logs/2026/05-01.md`; closure audit re-checked the live `flux-core` / `flux-react` / `flux-runtime` paths, verified focused tests plus repo-wide verification, and confirmed no remaining plan-owned work in scope

Follow-up:

- Renderer-contract bypass cleanup (`A-04` / `B-01` in `docs/analysis/2026-05-01-live-design-and-architecture-audit.md`) should move to a dedicated renderer-contract successor plan.
- Flow/Report/Word host-contract convergence (`C-02` / `C-03` / `D-01` / `D-02` / `D-03`) should move to a dedicated host-contract successor plan.
- `tag-list` / `key-value` / `array-editor` required-semantics cleanup should move to a separate successor plan.
- CRUD query-form imperative bridge and field-chrome convergence should move to separate successor plans.
- `flow-designer-core` graph-vs-schema/UI split and report canvas policy ownership should move to separate successor plans if still confirmed after this plan lands.

### Adversarial Review Cross-Reference (2026-05-01)

`docs/analysis/2026-05-01-adversarial-review.md` 独立对仓库做了对抗性审查。以下发现与 Plan 163 有交叉，执行时应注意：

**Phase 2 执行时建议显式纳入：**

- **Adversarial Finding 1** — `runtime.dispose()` 在 `runtime-owned-factories.ts:124-125` 丢弃了 bidirectional sync 的 unsubscribe 返回值，且 `page.validationOwner.dispose()` 从未被调用。Plan 163 Phase 2 的 "disposal coupled to the surface lifecycle" 应同时覆盖 page-level 的订阅释放和 validation owner dispose 调用，不应只覆盖 surface-root 场景。
- **Adversarial Finding 1 补充** — `createFormRuntime()` 返回的实例未被 `runtime.dispose()` 追踪。建议在 Phase 2 的 lifecycle 工作中一并解决，或者明确划入 successor plan。

**Phase 1 执行时可能间接受益：**

- **Adversarial Finding 11** — `flux-core/src/types/renderer-core.ts` 与 `renderer-hooks.ts` 之间存在循环 `import type` 依赖。Phase 1 将 React 类型移出 flux-core 时，如能拆分这两个文件，可同时消除循环依赖风险。
