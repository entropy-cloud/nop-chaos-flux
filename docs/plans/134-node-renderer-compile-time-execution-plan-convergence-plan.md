# 134 NodeRenderer Compile-Time Execution Plan Convergence Plan

> Plan Status: in progress
> Last Reviewed: 2026-04-24
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/module-cache-and-import-stack.md`, `docs/architecture/capability-projection-manifest.md`, `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, `packages/flux-react/src/use-node-imports.ts`
> Related: `docs/plans/36-node-renderer-refactor-plan.md`, `docs/plans/133-node-renderer-runtime-stack-and-import-boundary-refactor-plan.md`, `docs/plans/116-module-cache-import-stack-compile-symbol-resolution-plan.md`

## Purpose

把 `NodeRenderer` 收口到真正的编译期 execution-plan 模型：node-local optional boundary 是否存在，应在编译期决定并编码进 plan；运行期只执行 plan，不再对 `classAliases`、`xui:imports` 这类 node-local optional feature 做现推导或无关分支判断。

本计划同时收敛 `xui:imports` 的生命周期假设：执行阶段不再承担异步 import 加载。整个 schema 在编译前先收集全部 `xui:imports`，完成 URL 解析、模块预加载、以及静态 meta/manifest 获取；只有预加载成功后才进入编译。这样编译器可以使用 import meta 做 helper/member/capability 校验，运行期只同步安装已准备好的 import boundary。

## Current Baseline

- `TemplateNode` 已有 `providerPlan` 和 `providerWrap`，编译器会根据 `actionScopePolicy === 'new'`、`componentRegistryPolicy === 'new'`、`schema.classAliases` 生成 provider closure。
- `NodeRendererProviders` 已会执行编译期生成的 `providerWrap`，因此 `classAliases` 相关 provider 包装已经部分进入 compile-time plan 路径。
- 但 `NodeRendererResolved` 仍在运行期显式读取 `getNodeClassAliases(node)`、合并 `parentClassAliases`，并把 `classAliases` 作为独立参数传给 `NodeRendererProviders`；这说明 `classAliases` 还没有真正收口成“无配置则零路径”的纯 plan 模型。
- `xui:imports` 仍主要由运行期显式分支驱动：`NodeRenderer` 运行期调用 `getNodeImports(node)`、决定是否创建 import-owned `ActionScope`、执行 `useNodeImports()`、并在有 expression bindings 时创建 child scope。
- 现有 import 基线仍假定 node 进入执行后可能触发异步模块准备；`useNodeImports()` 持有 ready/loading/error 状态，`NodeRenderer` 需要为 imports path 做 gating。
- `docs/architecture/module-cache-and-import-stack.md` 也明确记录了当前 import helper manifest 仍偏运行期，编译器当前只能知道 alias 名，不知道库提供的完整 helper/member/capability 定义。
- Plan 36 的目标是文件降压与 effect 提取，不是 compile-time execution plan 收口。
- Plan 116 落地了 module cache / import stack / compile-time alias visibility，但它显式把 import helper manifest / capability signature loading 排除在 scope 外，也保留了运行期 import 准备路径。
- Plan 133 的目标是 boundary ownership clarification 和最小化规则澄清；它把 `xui:imports` 解释为 import-owned boundary 并保持该规则成立，但没有把 node-local optional boundary 全部迁移到 compile-time execution plan，也没有把“无配置时运行期零额外判断/零额外 hook”设为 exit criteria。

## Goals

- 为 `NodeRenderer` 引入明确的 compile-time execution plan，使 node-local optional boundary 的存在性在编译期确定。
- 让没有 `classAliases` 的节点在运行期不再触发任何 `classAliases` 特定读取、合并、provider 包装或分支判断。
- 在 schema 编译前增加统一的 import collection + preload 阶段：收集全部 `xui:imports`、解析 URL、加载模块、获取静态 meta/manifest，预加载失败则阻止编译。
- 让没有 `xui:imports` 的节点在运行期不再触发任何 import-specific 读取、`ActionScope` 创建、hook 调用、scope 准备或 ready gating。
- 把 `xui:imports` 从“运行期主线内联分支”收口成 plan-owned synchronous import execution boundary：运行期只同步安装已预加载的 import frame / namespace provider / expression bindings。
- 为导入库建立一个标准静态 meta 提供机制，使编译期可以拿到 helper/member/function definition、参数定义、可调用 capability 等信息，并据此做校验。
- 保持 `Host Projection`、`ActionScope`、`ComponentHandleRegistry`、`ImportFrame` 四层职责不混淆。

## Non-Goals

- 不重写 `ActionScope`、`ImportStack`、`ComponentHandleRegistry` 的底层能力模型。
- 不把所有普通 renderer 都改造成 host-family manifest。
- 不在本计划里做 IDE / language server / autocomplete 集成。
- 不把 page/form/surface/fragment owner-local boundary 收进 `NodeRenderer` generic plan。
- 不为了追求抽象纯度而引入过度泛化的 plan DSL；最小可读实现优先。

## Scope

### In Scope

- `packages/flux-compiler/src/schema-compiler.ts`
- `packages/flux-core/src/types/node-identity.ts`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/node-renderer-providers.tsx`
- `packages/flux-react/src/use-node-imports.ts`
- `packages/flux-react/src/use-node-scopes.ts`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/import-stack.ts`
- `packages/flux-runtime/src/imports.ts`
- focused tests under `packages/flux-react/src/`
- focused tests under `packages/flux-runtime/src/` and `packages/flux-compiler/src/`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/module-cache-and-import-stack.md`
- `docs/logs/2026/04-24.md`

### Out Of Scope

- host renderer contract redesign
- import module loader redesign
- page/form/surface runtime ownership changes
- unrelated `NodeRenderer` file-shape cleanup

## Execution Plan

### Phase 1 - Freeze The Target Execution-Plan Model

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-core/src/types/node-identity.ts`, `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`

- [x] Audited the current `providerPlan` / `providerWrap` shape versus the still-runtime-owned `classAliases` and `xui:imports` paths.
- [x] Defined the target implementation direction in code and plan: pure provider wrappers versus synchronous execution boundaries backed by preloaded import metadata.
- [x] Defined the pre-compile import collection contract in code: schema-wide import discovery now happens before compilation through `prepareSchema()` / `schemaCompiler.prepare()`.
- [x] Established the minimal compiled node surface for the landed slice: `TemplateNode.classAliasesPlan` and `TemplateNode.importsPlan` now carry node-local optional execution data instead of forcing `NodeRenderer` to rediscover it from raw schema.

Exit Criteria:

- [x] The live plan/code now distinguishes pure provider wrap from preloaded import execution-boundary installation.
- [ ] Owner docs still need to be updated to make this the normative documented baseline.

### Phase 2 - Add Schema-Level Import Collection And Static Import Meta

Status: completed
Targets: `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/imports.ts`, `packages/flux-core/src/types/*`, `packages/flux-compiler/src/schema-compiler.ts`, focused tests

- [x] Added a schema preparation stage that collects all `xui:imports` declarations before compilation.
- [x] Resolved every import to a concrete URL/module identity and preloaded required libraries before compilation in the standard `SchemaRenderer` path.
- [x] Defined a first standard static import-meta contract (`ImportedLibraryModule.getStaticMeta()`) for compile-time helper/member metadata.
- [x] Fed resolved import meta into compilation through `CompileSchemaOptions.preparedImports` and `PreparedImportSpec.staticMeta`.

Exit Criteria:

- [x] Standard `SchemaRenderer` compilation now starts only after declared imports are preloaded.
- [x] Compiler input includes resolved import metadata via `preparedImports`.
- [x] Focused tests prove preload failure blocks rendering and reports through the env error path.

### Phase 3 - Move ClassAliases Fully Into Compile-Time Plan

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, focused tests

- [x] Compiled `classAliases` into a node-local plan payload so runtime no longer needs raw schema reads for the normal execution path.
- [x] Removed runtime-only `classAliases` branching from `NodeRendererResolved` and kept alias resolution on the plan-owned path.
- [ ] Add a dedicated focused test asserting the zero-extra-work absence path rather than only covering the positive path indirectly.

Exit Criteria:

- [x] `NodeRenderer` runtime path no longer reads `schema.classAliases` or `getNodeClassAliases()`.
- [x] Existing focused/smoke tests confirm alias-aware rendering still works.

### Phase 4 - Introduce A Compiled Synchronous Import Execution Boundary Plan

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-core/src/types/node-identity.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/use-node-imports.ts`, `packages/flux-runtime/src/import-stack.ts`, focused tests

- [x] Compiled `xui:imports` into `TemplateNode.importsPlan` so `NodeRenderer` no longer rediscovers imports from raw schema at render time.
- [x] Refactored the runtime path so import-owned `ActionScope`, `ImportFrame`, and child scope bindings are installed synchronously from preloaded import data.
- [x] Removed node-local ready/loading/error gating from the `NodeRenderer` mainline.
- [x] Nodes without imports now bypass the import boundary path entirely.
- [x] Preserved lexical alias / namespace semantics while removing per-node async loading from `NodeRenderer`.

Exit Criteria:

- [x] `NodeRenderer` runtime path no longer reads `schema['xui:imports']` or `getNodeImports()`.
- [x] Nodes without imports bypass import-specific setup entirely.
- [x] `NodeRenderer` no longer carries per-node import loading state.
- [x] Focused import tests cover namespace dispatch, lexical behavior, preload failure, and expression binding behavior under synchronous execution.

### Phase 5 - Use Import Meta For Compile-Time Validation And Update Docs

Status: in progress
Targets: `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-formula/src/compile.ts`, diagnostics, docs

- [x] Extended symbol metadata carriers so imported helper/member references can consume static import meta when present.
- [ ] Validate callable imported functions against declared parameter definitions when manifest data is available.
- [ ] Document the standard import meta contract and fallback/error policy in owner docs.

Exit Criteria:

- [ ] Compiler can validate imported helper/member/function references against static import meta.
- [ ] Docs describe the import-meta contract as the live baseline for compile-time import validation.

### Phase 6 - Collapse NodeRenderer Onto Plan Execution And Update Docs

Status: in progress
Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/module-cache-and-import-stack.md`, `docs/logs/2026/04-24.md`

- [x] Simplified `NodeRenderer` so the runtime mainline now executes compiled plan data for `classAliases` and `xui:imports` instead of hand-rolled raw-schema feature checks.
- [ ] Update architecture docs to describe `NodeRenderer` as an execution-plan runner for node-local optional boundaries, while keeping owner-local boundaries outside the generic layer.
- [ ] Update docs to state that import loading happens before compilation, not during node execution.
- [ ] Record the landing, key decisions, and explicit leftovers in the daily log.

Exit Criteria:

- [ ] Docs no longer describe `classAliases` and `xui:imports` as mixed compile/runtime ad-hoc paths.
- [ ] `NodeRenderer` mainline is observably smaller and no longer contains feature-specific branching for these node-local optional boundaries.

### Phase 7 - Verification And Closure

Status: in progress
Targets: focused tests, verification commands, this plan file

- [x] Ran focused tests covering schema preload failure, synchronous import path, namespace dispatch, expression bindings, and a no-import renderer smoke path.
- [ ] Run required verification commands and record unrelated blockers if any remain outside this plan's scope.
- [ ] Perform an independent closure audit before marking the plan completed.

Exit Criteria:

- [ ] Focused verification proves the plan-owned path and the zero-extra-work path.
- [ ] Daily log and closure evidence are recorded.
- [ ] No remaining plan-owned gap remains hidden behind older completed plans.

## Validation Checklist

- [x] `NodeRenderer` no longer runtime-reads `classAliases` from raw schema.
- [x] `NodeRenderer` no longer runtime-reads `xui:imports` from raw schema.
- [x] Schema-level import collection and preload happen before compilation.
- [x] Missing import modules fail before template generation.
- [ ] Imported helper/member/function validation uses static import meta when available.
- [ ] Nodes without `classAliases` pay no alias-specific runtime branching or provider setup cost.
- [ ] Nodes without `xui:imports` pay no import-specific runtime branching, scope creation, or hook/setup cost.
- [x] `NodeRenderer` no longer carries async import ready/loading/error gating for node-local imports.
- [x] Nodes with imports still preserve current import-owned boundary semantics after synchronous installation.
- [ ] Relevant architecture docs describe the preloaded compile-time import model and compile-time execution-plan model as the live baseline.
- [x] Focused tests cover the main presence path and preload failure path; an explicit zero-overhead absence-path assertion still needs to be added.
- [ ] `docs/logs/2026/04-24.md` records the implementation and closure context.
- [ ] Independent closure audit is completed and recorded before plan closure.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: Pending.
- Evidence: Pending.

Follow-up:

- Pending execution.
- If execution discovers additional owner-local boundary work outside node-local optional plan convergence, move that work into a separate successor plan instead of silently widening this plan.
