# 183 Renderer Props And Host-Neutral Typing Convergence Plan

> Plan Status: planned
> Last Reviewed: 2026-05-02
> Source: `docs/plans/164-adversarial-review-uncovered-findings-remediation-plan.md` Finding 2, `docs/plans/182-deep-audit-full-3-mechanical-fixes-plan.md`, live code in `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/react-contracts.ts`
> Related: `docs/architecture/renderer-runtime.md`, `docs/architecture/field-binding-and-renderer-contract.md`, `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`

## Purpose

收口渲染器契约中仍未落地的类型安全缺口：`RendererComponentProps.props` 仍是无差别 `Record<string, unknown>`，host-neutral core callable surface 仍暴露多个原始 `any`，具体 renderer 仍普遍依赖 `props.props as SomeSchema` 和 `component: Renderer as any` 才能通过编译。

本计划只负责一个结果面：把 renderer contract 从 `flux-core` 到 `flux-react` 的类型边界收紧到“host-neutral core + React-owned alias + pilot renderer adoption”的可执行基线。

## Current Baseline

- `packages/flux-core/src/types/renderer-core.ts` 当前将 `RendererComponentProps.props` 固定为 `Readonly<Record<string, unknown>>`，无法表达 renderer 已知的 resolved prop bag。
- 同一文件中 `RendererHelpers.render`、`RendererDefinition.component` 仍直接返回/暴露 `any`，没有一个显式的 host-neutral render result alias。
- `packages/flux-core/src/types/renderer-hooks.ts` 的 `RenderRegionHandle.render(...)` 仍返回 `any`。
- `packages/flux-react/src/react-contracts.ts` 的 React alias layer 仍保留 `reactComponent?: (props: Record<string, unknown>) => ReactElement | null`，没有与 core 的更窄 contract 对齐。
- live renderer 代码仍大量依赖局部类型断言才能工作，例如 `packages/flux-renderers-basic/src/container.tsx` 的 `props.props as ContainerSchema`、`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` 的 `props.props as DetailViewSchema`、`detail-field.tsx` / `variant-field.tsx` 的同类 schema-cast，以及多个 `component: ... as any` 定义。
- `docs/architecture/renderer-runtime.md` 已明确区分 authored `schema` 与 resolved runtime `props`，但当前 type surface 还没有把这个契约表达为可组合的泛型边界。

## Goals

- 为 `RendererDefinition.component`、`RendererHelpers.render`、`RenderRegionHandle.render` 建立统一的 host-neutral typed surface，不再直接暴露裸 `any`。
- 为 `RendererComponentProps` 提供可显式声明的 resolved prop bag typing，让 concrete renderer 不必默认把 `props.props` 视作匿名字典。
- 保持 `flux-core` / `flux-react` 分层：React 元素类型与 `reactComponent` 仍由 `flux-react` alias layer 所有，不回流进 core。
- 在一组代表性 renderer 上移除 `props.props as ...` / `component: ... as any` 的常态化写法，证明新 contract 可实际采用。

## Non-Goals

- 不尝试从任意 schema 自动推导完整 resolved prop 类型；低代码动态表达式语义仍要求保留保守边界。
- 不在本计划里清理全仓库所有测试中的 `as any`。
- 不重做 `SchemaFieldRule` 语义分类或 compiler field lowering 设计。
- 不把所有 renderer 一次性迁移到新 contract；超出本计划 pilot 集的剩余迁移必须按 owner package 再拆。
- 不把 host-neutral core 重新耦合回 React 类型。

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/renderer-hooks.ts`
- `packages/flux-react/src/react-contracts.ts`
- `packages/flux-react/src/auto-renderer.tsx`
- `packages/flux-react/src/helpers.tsx`
- `packages/flux-react/src/render-nodes.tsx`
- representative pilot renderers that currently need schema/any casts, starting with:
  - `packages/flux-renderers-basic/src/container.tsx`
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
  - `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- focused type tests / compile-time assertions for the above
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/references/renderer-interfaces.md`

### Out Of Scope

- automatic schema-to-props inference for every renderer package
- repository-wide cast cleanup outside the pilot set
- changes to validation owner semantics, region semantics, or field classification rules
- lint-rule enforcement for `as any` across the whole workspace

## Execution Plan

### Phase 1 - Freeze The Core Typed Contract Boundary

Status: planned
Targets: `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-binding-and-renderer-contract.md`, `docs/references/renderer-interfaces.md`

- [ ] Re-audit every current `any` seam in the renderer contract files and freeze the exact target alias/generic surface in the plan before editing code.
- [ ] Introduce one host-neutral render-result alias or equivalent generic boundary so `RendererDefinition.component`, `RendererHelpers.render`, and `RenderRegionHandle.render` no longer expose raw `any` returns.
- [ ] Introduce a resolved-props generic or equivalent helper on `RendererComponentProps` so renderer authors can declare the runtime prop bag they expect instead of accepting only `Record<string, unknown>`.
- [ ] Add type-level or compile-only coverage proving the narrowed core contract still composes with existing host-neutral runtime types.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Core renderer contract files no longer expose raw `any` at the primary render entry points owned by this phase.
- [ ] `docs/architecture/renderer-runtime.md`, `docs/architecture/field-binding-and-renderer-contract.md`, and `docs/references/renderer-interfaces.md` describe the final typed boundary between `schema`, resolved `props`, and host-owned render output.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Thread The Contract Through The React Alias Layer

Status: planned
Targets: `packages/flux-react/src/react-contracts.ts`, `packages/flux-react/src/auto-renderer.tsx`, `packages/flux-react/src/helpers.tsx`, `packages/flux-react/src/render-nodes.tsx`

- [ ] Thread the new core generics/aliases through the React-owned alias layer without reintroducing React types into `flux-core`.
- [ ] Align `reactComponent`, auto-wrapping helpers, and helper factories with the narrowed contract so React consumers see the same prop bag and render-result expectations.
- [ ] Add focused type/compile coverage for plain React component auto-wrapping and typed helper/region calls.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `flux-react` aliases faithfully layer React-specific types on top of the new core contract.
- [ ] Auto-renderer helpers compile against the new contract without widening the surface back to raw `any`.
- [ ] `docs/architecture/renderer-runtime.md` and `docs/references/renderer-interfaces.md` are updated to reflect the React alias wiring.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Remove Pilot Renderer Cast Debt

Status: planned
Targets: `packages/flux-renderers-basic/src/container.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, focused tests

- [ ] Replace the in-scope `props.props as ...` and `component: ... as any` patterns with the new generic contract in the pilot renderers.
- [ ] Keep raw `props.schema` reads limited to true static structural fields; runtime business values must come from typed `props.props`.
- [ ] Add focused tests or compile-only coverage proving the pilot renderers compile without those casts and still satisfy the runtime contract.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] The pilot renderer set no longer depends on `props.props as ...` / `component: ... as any` as its normal typing path.
- [ ] Focused verification proves the pilot renderers still render and dispatch correctly after the type-surface changes.
- [ ] Relevant renderer contract docs are updated to the final live baseline.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Verification And Closure Audit

Status: planned
Targets: in-scope packages, focused tests, this plan

- [ ] Run focused verification for core type surfaces, React alias surfaces, and the pilot renderers.
- [ ] Run required workspace verification after code changes land.
- [ ] Perform an independent closure audit against live code and docs.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Focused verification is recorded for each landed slice.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining in-scope renderer typing debt owned by this plan.
- [ ] `docs/logs/` 对应日期条目已更新。

## Validation Checklist

> **关闭条件**：只有本 section 所有条目及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [ ] `RendererComponentProps` can express a typed resolved prop bag for in-scope renderers.
- [ ] `RendererDefinition.component`, `RendererHelpers.render`, and `RenderRegionHandle.render` no longer expose raw `any` in the in-scope contract.
- [ ] React alias layering remains host-neutral in core and React-specific in `flux-react`.
- [ ] Pilot renderers compile without the in-scope schema/any cast patterns.
- [ ] Relevant docs are updated to the final baseline.
- [ ] Focused verification is complete.
- [ ] Independent closure audit is complete and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending execution.

Closure Audit Evidence:

- Reviewer / Agent: TBD
- Evidence: TBD

Follow-up:

- If broad renderer-package migration remains after the pilot set lands, split that remaining work by owner package instead of reopening this plan.
- Otherwise, no remaining plan-owned work.
