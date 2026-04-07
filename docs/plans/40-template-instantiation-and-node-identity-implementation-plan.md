# 40 Template Instantiation And Node Identity Implementation Plan

> Plan Status: planned
> Last Reviewed: 2026-04-07; architecture signoff re-checked against related docs on 2026-04-07
> Source: `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/component-resolution.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/flux-core.md`

## Purpose

本计划用于把已经确认的 clean-slate identity/runtime baseline 逐步落到代码中：

- 从 `SchemaCompiler + CompiledSchemaNode + createRuntimeState()` 迁移到 `TemplateCompiler + TemplateNode + instantiate() + NodeInstance`
- 把 `cid` 从当前编译期节点 id 收敛为 mounted live node id
- 为 repeated structures 建立统一的 `instanceKey` / `instancePath` / `NodeLocator` 模型
- 让 runtime 拥有 canonical structural resolution，让 registry 只负责 live handle 与 convenience selector
- 让 debugger 从 `data-cid` 回到 live runtime node，再提升到 canonical `NodeLocator`

本计划默认遵循两个约束：

- 迁移过程中优先保持外部行为稳定，避免一次性推翻 React 渲染链
- 先建立新 runtime substrate，再逐步替换旧 `cid`-centric 接线

## 已确认结论

- 编译层与运行时实例层必须彻底分离，不能再让一个对象同时承担 compiled node 与 live instance 职责。
- `templateGraphId + templateNodeId` 表示结构身份，`instancePath` 表示 repeated-instance 语义，`NodeLocator` 是 canonical live/runtime identity。
- `cid` 只用于 mounted live node 的紧凑桥接，不再参与 compile-time lowering。
- singleton 的 canonical `instancePath` 表示为 `undefined`，不是 `[]`。
- repeated rows / future `type: 'loop'` 必须共用同一 repeated-template identity model。
- runtime 拥有 structural resolution；registry 只维护 live handles 与 boundary-local selector lookup。
- debugger 的 DOM bridge 继续使用 `data-cid`，但 inspect 真正返回的是 live inspect payload 与 `NodeLocator`。
- virtualization 不能改变 identity semantics，只能改变 materialization/mount lifetime。

## 与现有计划的关系

- `docs/plans/36-node-renderer-refactor-plan.md` 已经把 `NodeRenderer` 的副作用负担降压，但没有改变 compiled-node/live-instance conflation。本计划接着处理更深层的 runtime identity substrate。
- `docs/plans/37-flux-core-runtime-architecture-convergence-plan.md` 是更宽的 runtime convergence 父计划；本计划聚焦其中的 template/instance/node identity 主线。
- `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md` 解决 dependency substrate。本计划不重开 root-binding 依赖模型，但 repeated instance reconcile 要直接复用 Plan 39 的 root-level change publication。
- `docs/plans/34-nop-debugger-ai-diagnostics-improvement-plan.md` 继续承担 debugger richer payload/UI 能力增强；本计划只负责 debugger 所依赖的 runtime identity / inspect substrate。

## Problem

- 当前 `packages/flux-runtime/src/schema-compiler.ts` 仍直接产出带 `cid` 的 `CompiledSchemaNode`，把结构身份和旧 debugger bridge 混在一起。
- `CompiledSchemaNode.createRuntimeState()` 让 compiled node 自带 live-state factory，导致 repeated instantiation、virtualization、debugger correlation 的 ownership 不清楚。
- `packages/flux-react/src/node-renderer.tsx` 当前直接渲染 `CompiledSchemaNode`，没有显式 `NodeInstance` 层。
- `packages/flux-runtime/src/component-handle-registry.ts` 当前主要按 `cid` / `templateId + instanceKey` 工作，没有 canonical `NodeLocator` resolution contract。
- `packages/nop-debugger/src/controller.ts` 与 `packages/nop-debugger/src/panel/use-inspect-mode.ts` 仍是旧 `data-cid -> handle/debugData` 思路，component tree 也主要依赖 DOM 扫描。
- repeated identity 目前只有局部 `instanceKey` 概念，尚未形成 full ancestor `instancePath` 与 repeated-template boundary model。

## Root Cause

- 现有代码是在“先把编译跑通、再附着轻量 runtime state”的路径上长出来的，最初没有严格区分 template graph 与 runtime instance graph。
- debugger 的早期需求把 `cid` 推成了单一入口，导致 compile-time lowering、runtime handle lookup、DOM inspect 都围绕同一个字段演化。
- repeated rendering 目前更接近“renderer 自己管理 row scope”的局部策略，而不是 runtime 统一的 instantiate/reconcile substrate。
- registry 和 runtime 的职责边界未被显式切开，导致 canonical structural truth 与 live handle convenience lookup 混在一起。

## Goals

- 建立 `TemplateCompiler`, `CompiledTemplate`, `TemplateNode`, `RepeatedTemplate`, `NodeInstance`, `NodeLocator`, `RuntimeNodeResolver`, `NodeRefRegistry` 的正式代码契约。
- 让 compile-time lowering 从 `componentId -> _targetCid` 迁移到 `StaticTargetPlan` / `RepeatedTargetPlan` / `NodeLocator`。
- 让 React 渲染链消费 `NodeInstance` 而不是 bare compiled node。
- 让 repeated rendering 统一使用 `instanceKey` / `instancePath`，并能为 table 和 future loop 复用。
- 让 debugger component tree / inspect substrate 来自 runtime-owned registry state，而不是依赖 DOM 全量扫描。
- 在迁移过程中保持 typecheck/build/test 可持续通过，并尽量保持 playground 与现有 debugger 功能可用。

## Non-Goals

- 不在本计划中完成所有 renderer 的 schema 设计优化。
- 不在本计划中重写 validation architecture。
- 不在本计划中设计新的 virtualization renderer，只定义 virtualization 对 identity/materialization 的语义。
- 不在本计划中完成所有 debugger UI 增强，只建立正确的 runtime-facing inspect substrate。
- 不在本计划中推进 flow-designer/report-designer 特有的高层 host protocol 变化，除非它们直接依赖新的 node identity contract。

## Scope

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/component-resolution.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/debugger-runtime.md`
- `docs/architecture/flux-core.md`
- `docs/logs/`
- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-core/src/types/renderer-component.ts`
- `packages/flux-core/src/types/scope.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/component-handle-registry.ts`
- `packages/flux-runtime/src/node-runtime.ts`
- `packages/flux-runtime/src/page-runtime.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/render-nodes.tsx`
- `packages/flux-react/src/helpers.tsx`
- `packages/flux-react/src/useNodeDebugData.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/panel/use-inspect-mode.ts`
- table / repeated-related renderer files and tests
- relevant tests across `flux-runtime`, `flux-react`, `nop-debugger`, and e2e

## 不在 Scope 内的事项

- design-time schema editor UX
- unrelated renderer visual refactors
- generalized cache invalidation redesign beyond identity/materialization needs
- large-scale package boundary moves unrelated to template/runtime identity

## Execution Plan

**Phase 0 — Freeze Contracts And Add Regression Harness**

Targets: core type files, runtime/compiler tests, debugger tests, table tests

- 为当前实现补足最小基线测试，明确新迁移成功标准：
  - compile-time `cid` 仍存在于 compiled node
  - current debugger `inspectByCid()` 工作方式
  - current table/dynamic handle `instanceKey` behavior
  - current `componentId -> _targetCid` lowering behavior
- 新增 target-facing contract tests，先以 pending/skip 或 type-only 方式表达未来接口：
  - `NodeLocator` singleton uses `instancePath === undefined`
  - repeated resolution requires full ancestor `instancePath`
  - `ResolutionResult` distinguishes `resolved` / `notMaterialized` / `notFound` / `ambiguous`
  - `InspectResult` distinguishes `resolved` / `notMaterialized` / `notFound`
- 锁定命名与类型入口，避免后续在多个包里平行发明类似类型。

Exit criteria: 测试能够同时表达“当前行为是什么”与“目标契约要求什么”。

**Phase 1 — Introduce New Core Types Without Changing Render Flow Yet**

Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-core/src/types/renderer-component.ts`, `packages/flux-runtime/src/index.ts`, related tests

- 新增而不是立刻替换：
  - `CompiledTemplate`
  - `TemplateNode`
  - `RepeatedTemplate`
  - `InstanceFrame`
  - `NodeLocator`
  - `NodeInstance`
  - `ResolutionResult`
  - `InspectResult`
  - `RuntimeNodeResolver`
  - `NodeRefRegistry`
- 明确旧类型与新类型的桥接关系，避免命名冲突。
- 保留旧 `CompiledSchemaNode` 合约以维持编译通过，但在类型注释与文档中标记为 migration path。

Exit criteria: 新类型可以被各包引用，且不破坏现有运行路径。

**Phase 2 — Split Template Compilation From Runtime State Creation**

Targets: `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/node-runtime.ts`, `packages/flux-core/src/types/renderer-compiler.ts`, related tests

- 引入 `TemplateCompiler` 与 `instantiate(...)` 的第一版实现。
- 去掉新模板类型对 `createRuntimeState()` 的依赖；runtime 负责创建 `NodeState`。
- 保留过渡适配层，使旧代码仍可从 compiled node 路径运行。
- 移除 compile-time lowering 对 live `cid` 的语义依赖，改为生成 static/repeated target plans。
- 明确 later-compiled fragment 的 `templateGraphId` 分配规则与 owner context。

Exit criteria: runtime 可以从 `TemplateNode`/`CompiledTemplate` 创建 `NodeInstance`，而不是依赖 compiled node 自带 factory。

**Phase 3 — Establish Runtime-Owned Structural Resolution Layer**

Targets: `packages/flux-runtime/src/component-handle-registry.ts`, new runtime resolver module(s), action resolution paths, related tests

- 新增 runtime-owned resolver，负责：
  - `resolveNode(locator)`
  - `resolveTarget(target, ctx)`
  - `ResolutionResult` 分类返回
- 将 registry 调整为 subordinate role：
  - `resolveHandle(locator)`
  - `resolveSelector(...)`
  - `register/unregister(...)`
- 将旧 `componentId -> _targetCid` fast path 改为 `StaticTargetPlan` / `RepeatedTargetPlan`。
- 明确 ambiguity 行为，拒绝“pick first”。

Exit criteria: canonical structural resolution 不再以 registry 或 `cid` 为中心，且 repeated-target resolution 有明确结果类型。

**Phase 4 — Introduce Mounted Node Ref Registry And New `cid` Semantics**

Targets: runtime mount/unmount integration points, `packages/flux-react/src/useNodeDebugData.ts`, debugger controller/types, related tests

- 引入 `NodeRefRegistry`：
  - `resolveCid(cid)`
  - `inspectCid(cid)`
  - mounted-node registration/unregistration
- 改变 `cid` 语义：
  - template/compiled layer 不再拥有 live `cid`
  - `cid` 在 mount 时分配
  - `NodeInstance.cid` 可为空，只有 mounted inspectable node 才有值
- 让 `data-cid` 继续作为 DOM bridge，但其背后不再依赖 compiled-node cid。
- debugger inspect 返回 `InspectResult`，而不是裸 `undefined`。

Exit criteria: `cid` 成为 mounted live-node bridge；debugger 可以从 `data-cid` 回到 live node inspect payload 与 `NodeLocator`。

**Phase 5 — Migrate React Render Path To `NodeInstance`**

Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`, helpers/contexts/hooks, related tests

- 让 `NodeRenderer` 接收 `NodeInstance`，同时仍能在过渡期适配旧调用点。
- 调整 `RendererComponentProps` 的 target shape：
  - `locator`
  - `templateNode`
  - `node: NodeInstance`
- 保持 selective subscription / dependency tracking 现有收益，不因重构回退到全量 rerender。
- 确保 imports, classAliases, form/page context, regions, events, helpers 都基于 runtime instance 正常工作。

Exit criteria: React 渲染主链不再把 bare compiled node 当作 live instance 使用。

**Phase 6 — Repeated Template Instantiation For Table And Shared Reconcile Substrate**

Targets: table renderer/runtime, repeated fragment helpers, future reusable repeated instantiation utilities, related tests

- 把 table row rendering 切到 repeated-template instantiation model：
  - compile row/cell/action body once
  - runtime per row instantiate subtree with `instanceKey` + full `instancePath`
- 优先支持 stable-key reconcile：
  - preserve subtree/state when keys match
  - dispose when keys disappear
  - instantiate when keys appear
- 与 Plan 39 对接，确保 row-local invalidation 与 repeated subtree preservation 兼容。
- 为 future `type: 'loop'` 提炼共享 substrate，而不是在 table 中写死私有实现。

Exit criteria: table repeated rendering 使用正式 repeated-template identity model，且为 loop 复用留下清晰路径。

**Phase 7 — Debugger Component Tree And Inspect Substrate Migration**

Targets: `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/panel/use-inspect-mode.ts`, related tests/e2e

- component tree 改为从 runtime-owned mounted-node registry 枚举，而不是 `querySelectorAll('[data-cid]')`。
- `inspectByElement()` 仍可通过 DOM closest 命中 `data-cid`，但后续全部通过 runtime inspect substrate。
- `inspectNode(locator)`、`inspectByCid(cid)`、`inspectByElement(element)` 的结果形状统一到 `InspectResult`。
- 保持 automation API 对现有消费者尽量兼容，必要时提供一段过渡适配。

Exit criteria: debugger mounted tree 与 inspect 不再依赖 DOM 扫描，重复节点可被准确区分和追踪。

**Phase 8 — Remove Legacy `cid`-Centric Paths And Close Migration**

Targets: compiler/runtime/react/debugger leftover compatibility code, docs, tests

- 删除旧 compile-time `cid` lowering 和与之绑定的类型/字段。
- 删除 `CompiledSchemaNode.createRuntimeState()` 及相关桥接残留。
- 清理 `data-cid` 相关老式 debug data path，只保留新的 mounted-node substrate。
- 审查相关 architecture docs 与 plan status，关闭迁移中的过渡措辞。

Exit criteria: 代码主链与文档主链一致，不再依赖旧 `cid` 语义或 compiled-node/live-instance conflation。

## Recommended Execution Order Inside Code

1. Phase 0 regression harness
2. Phase 1 type introduction
3. Phase 2 template/instance split substrate
4. Phase 3 runtime resolver
5. Phase 4 mounted-node `cid` / inspect substrate
6. Phase 5 React render-path migration
7. Phase 6 repeated table substrate
8. Phase 7 debugger tree migration
9. Phase 8 legacy cleanup

Reasoning:

- 先立类型与结果契约，再动 runtime 主路径，返工最少。
- 先把 structural resolution 和 mounted-node inspect substrate 建起来，再让 React/debugger 消费它们。
- repeated table/loop substrate 依赖新的 instance identity，因此放在 render-path 迁移之后更稳。

## Verification Strategy

每个 phase 至少覆盖以下层面中的相关部分：

- type-level contract tests
- runtime unit tests
- React rendering tests
- debugger controller/panel tests
- table repeated-instance tests
- e2e debugger inspect smoke tests when relevant

Full verification gates for code-changing phases:

- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm test`

Recommended focused commands during iteration:

- `pnpm --filter @nop-chaos/flux-core test`
- `pnpm --filter @nop-chaos/flux-runtime test`
- `pnpm --filter @nop-chaos/flux-react test`
- `pnpm --filter @nop-chaos/nop-debugger test`

## Key Risks

- 过渡期同时保留旧 `CompiledSchemaNode` 和新 `TemplateNode`，容易出现双轨类型漂移。
- `NodeRenderer` 迁移如果处理不当，可能破坏当前 selective subscription 与 dependency cache 行为。
- debugger automation API 已经有现有消费者，inspect/result 形状升级需要兼顾兼容性。
- table repeated reconcile 若过早耦合 virtualization 细节，容易把 identity 语义与缓存策略混在一起。
- registry/runtime ownership 改造如果边界不够硬，旧 `cid` fast path 可能以兼容名义重新渗回主链。

## Risk Mitigations

- 每一阶段都先写 contract tests，再做迁移代码。
- 过渡期明确单一 source-of-truth 文件和类型导出入口，避免平行定义。
- 对 debugger API 采用 staged migration：先新增 typed result，再决定何时删除旧便利返回格式。
- repeated identity 只先服务 table row，再抽象成 loop-ready substrate，避免一开始过抽象。
- 所有 compile-time target lowering 改动都必须配合 ambiguity/missing-context tests。

## Acceptance Criteria

- 编译结果与运行时实例彻底分层，`TemplateNode` 不再承担 live-state factory 角色。
- `cid` 只表示 mounted live node id，且来自 mount-time/runtime-owned registry。
- `NodeLocator` 在 runtime/action/debugger 文档和代码中是唯一 canonical structural identity。
- repeated table rows 使用 `instanceKey` + full `instancePath`，而不是扁平 `row:0` 约定。
- runtime resolver 能返回 `resolved` / `notMaterialized` / `notFound` / `ambiguous`。
- debugger inspect 能返回 typed `InspectResult`，component tree 不再依赖 DOM 扫描。
- 全仓 `typecheck/build/lint/test` 通过。

## Documentation Follow-Up

代码改造每推进一个重要阶段，都要同步：

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/component-resolution.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/debugger-runtime.md`
- `docs/architecture/flux-core.md`
- `docs/logs/{year}/{month}-{day}.md`

当 Phase 4 之后的实现开始落地时，需要额外复核：

- `docs/plans/34-nop-debugger-ai-diagnostics-improvement-plan.md`
- `docs/plans/37-flux-core-runtime-architecture-convergence-plan.md`

## Suggested First Slice

建议从以下最小可落地 slice 开始：

1. Phase 0 regression harness
2. Phase 1 core type introduction
3. Phase 3 result-type and runtime-resolver skeleton

原因：

- 这三步先把术语、结果类型、ownership 边界钉死
- 对现有运行链破坏最小
- 能尽快让 action/debugger/repeated migration 后续都有稳定依赖面
