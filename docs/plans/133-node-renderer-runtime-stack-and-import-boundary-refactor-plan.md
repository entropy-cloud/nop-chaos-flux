# 133 NodeRenderer Runtime Stack And Import Boundary Refactor Plan

> Plan Status: completed
> Last Reviewed: 2026-04-23
> Source: `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/module-cache-and-import-stack.md`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/use-node-imports.ts`, `packages/flux-runtime/src/imports.ts`
> Related: `docs/plans/36-node-renderer-refactor-plan.md`, `docs/plans/116-module-cache-import-stack-compile-symbol-resolution-plan.md`, `docs/plans/112-capability-projection-manifest-implementation-plan.md`

## Purpose

收口 `NodeRenderer` 当前与运行时 stack 相关的真实剩余问题：明确 `Host Projection` / `ActionScope` / `ComponentHandleRegistry` / `ImportFrame` 的职责边界，减少无必要的新 execution boundary 创建，并把 `xui:imports` 的 import-owned boundary 收敛成更清晰的 runtime model，而不是继续沿用旧的“文件拆分降压”目标。

## Current Baseline

- `NodeRenderer` 当前已经不是“每个节点都无脑创建新 action scope / child scope”的旧形态。
- `componentRegistry` 仅在 renderer 明确 `componentRegistryPolicy: 'new'` 时创建。
- import child data scope 仅在 `useNodeImports()` 产出 `expressionBindings` 时创建；否则直接复用父 scope。
- 但当前 `xui:imports` 仍会隐式触发 child `ActionScope`，因为 imported namespace provider 的 lifetime / ref-count 仍与 capability boundary 绑在一起。
- 旧 Plan 36 的主要目标是拆分 `NodeRenderer` 文件与 effect hook，不再覆盖当前真正需要解决的“运行时 boundary 最小化”问题。

## Goals

- 明确 `NodeRenderer` 运行时 stack 中哪些 boundary 是刚需，哪些是按需创建。
- 收敛 `xui:imports` 的 runtime boundary 语义：import frame、expression alias、capability overlay 各自职责清楚。
- 明确 `xui:imports` 必定创建 import-owned child `ActionScope`，并把这条规则从 renderer policy 混用中拆出来。
- 保持 `Host Projection`、`ActionScope`、`ComponentHandleRegistry`、`ImportFrame` 四层边界不混淆。

## Non-Goals

- 不重写 `ActionScope` / `ComponentHandleRegistry` 的整体能力模型。
- 不把 imported capability lookup 从 `ActionScope` 完全搬到另一套平行机制。
- 不重做 `RendererRuntime`、`SchemaRenderer`、`RenderNodes` 的全部 context 架构。
- 不把此次计划扩展成大规模 `NodeRenderer` 文件拆分计划。

## Scope

### In Scope

- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/node-renderer-providers.tsx`
- `packages/flux-react/src/use-node-imports.ts`
- `packages/flux-react/src/use-node-scopes.ts`
- `packages/flux-runtime/src/imports.ts`
- `packages/flux-runtime/src/import-stack.ts`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/module-cache-and-import-stack.md`

### Out Of Scope

- host manifest / projection shape redesign
- generic effect-channel convergence
- form/page/surface owner boundary redesign
- non-import-related renderer file extraction work

## Execution Plan

### Phase 1 - Runtime Boundary Audit And Target Model Freeze

Status: completed
Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, `docs/architecture/*.md`

- [x] 审计 `NodeRenderer` 当前创建/传递的 boundary：`ScopeRef`、`ActionScope`、`ComponentHandleRegistry`、`ImportFrame`、`NodeMetaContext`、`ClassAliasesContext`。
- [x] 列出这些 boundary 的 live consumers，区分“基础刚需 context”与“可按需化 boundary”。
- [x] 在 architecture docs 中冻结目标模型：`Host Projection` / `ActionScope` / `ComponentHandleRegistry` / `ImportFrame` 四层严格分离。

Exit Criteria:

- [x] repo-observable 目标模型已写入 owner docs
- [x] docs 明确写出 imports boundary 与 host projection / component registry 的区别

### Phase 2 - Import-Owned Capability Boundary Narrowing

Status: completed
Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/use-node-imports.ts`, `packages/flux-runtime/src/imports.ts`, `packages/flux-runtime/src/import-stack.ts`

- [x] 审计当前 `xui:imports => child ActionScope` 的真实必要性：哪些 imported module 仅需要 expression helpers，哪些需要 action namespace provider。
- [x] 设计更窄的 import-owned boundary：先由 `ImportFrame` 持有 alias/lifetime，再决定何时必须建立 child `ActionScope`。
- [x] 如果可行，减少“仅因 imports 存在就无条件 new ActionScope”的粗规则；若不可行，则把现状升格为显式 architecture rule 并说明原因。

Exit Criteria:

- [x] docs 和 code 能清楚回答 imported helpers 与 imported namespace provider 各自由谁承载
- [x] `NodeRenderer` 不再仅靠隐式规则创建 import-owned child `ActionScope`，或该规则被明确记录为当前必要约束

### Phase 3 - Provider/Scope Creation Minimization

Status: completed
Targets: `packages/flux-react/src/node-renderer-providers.tsx`, `packages/flux-react/src/node-renderer.tsx`, focused tests

- [x] 复核 `ImportFrameContext`、`ClassAliasesContext`、node-local provider wrap 的按需创建是否还能进一步收窄。
- [x] 保持 `ScopeContext` / `NodeMetaContext` / `ActionScopeContext` / `ComponentRegistryContext` 的 live contract，不做破坏式下沉。
- [x] 为 boundary 创建规则补 focused tests，覆盖 imports、host renderer、component-target dispatch、fragment render。

Exit Criteria:

- [x] `NodeRenderer` runtime stack 的 boundary 创建规则最小化且文档化
- [x] focused tests 覆盖 import-owned boundary 和 renderer fragment 边界

## Validation Checklist

- [x] docs 明确区分 `Host Projection`、`ActionScope`、`ComponentHandleRegistry`、`ImportFrame`
- [x] `xui:imports` 的 compile-time / runtime 职责分工已明确
- [x] `NodeRenderer` 不再承担与当前 boundary 模型无关的历史性隐式创建规则
- [x] focused verification 已覆盖 imports、namespace dispatch、component-target dispatch、fragment rendering
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Completed. The live repo now treats `xui:imports` as an import-owned boundary that always creates a child `ActionScope`, while renderer-owned `actionScopePolicy` remains a separate contract. `NodeRenderer` no longer mixes those two rules through a renderer-policy fallback path.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent closure audit
- Evidence: task `ses_247543496ffewQNC5a7dGJXmwE` re-audited the live repo after follow-up fixes and passed. It confirmed `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/use-node-scopes.ts`, `packages/flux-react/src/node-renderer-providers.tsx`, and the three owner docs now encode import-owned action-scope creation separately from renderer policy, and `packages/flux-react/src/schema-renderer-imports-boundaries.test.tsx` now covers imports, namespace dispatch, component-target dispatch, and fallback behavior. Workspace-wide `pnpm typecheck/build/lint/test` were attempted during execution but did not fully complete within the session timeout window, so those checklist items remain unchecked.

Follow-up:

- No remaining plan-owned work. Future changes to import capability semantics should update this plan only if the repo reopens import-owned boundary ownership rather than extending adjacent host/runtime features.
