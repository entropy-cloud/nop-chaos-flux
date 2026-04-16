# 111 CompiledSchemaNode Elimination Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Review Rounds: 3 rounds of independent sub-agent review completed (APPROVED at round 3)
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, live repo audit of `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-core/src/types/node-identity.ts`, `packages/nop-debugger/src/`
> Related: `docs/plans/64-node-identity-memory-optimization-and-compiledschemanode-cleanup-plan.md` (completed), `docs/plans/100-compiledschemanode-public-boundary-closure-plan.md` (completed)

## Purpose

彻底消除 `CompiledSchemaNode` 中间类型，使编译器直接产出 `TemplateNode`。删除所有仅服务于 `CompiledSchemaNode` 的辅助类型和转换函数，消除编译管线中的冗余拷贝层。

## Current Baseline

- 渲染主路径已完全基于 `CompiledTemplate → TemplateNode → NodeInstance`，`CompiledSchemaNode` 不出现在渲染路径中。
- 编译器内部流程：`compileSingleNode()` → `CompiledSchemaNode` → `buildTemplateNode()` → `TemplateNode` → `CompiledTemplate`。
- `buildTemplateNode()` 做的事是逐字段直接复制或重命名，无任何实质性结构转换。
- 以下类型仅存在于 `CompiledSchemaNode` 及其编译管线内部，渲染/运行时路径不消费：`CompiledRegion`、`CompiledNodeFlags`、`CompiledNodeRuntimeBoundaries`、`CompiledNodeRenderPlan`、`CompiledNodeRenderPlanProviders`。
- `CompiledNodeRuntimeState` 虽然名字带 Compiled，但它是运行时求值状态类型，在 `RendererRuntime.resolveNodeMeta/Props`、`NodeRenderer`、`NodeInstance` 中广泛使用，不可删除（需重命名）。
- `createNodeRuntimeState(CompiledSchemaNode)` 仅在 `CompiledSchemaNode.createRuntimeState()` 方法内被调用，运行时实际使用 `createTemplateNodeRuntimeState(TemplateNode)`。
- `RendererPlugin.afterCompile` 签名接受 `CompiledSchemaNode | CompiledSchemaNode[]`，是唯一的公共接口残留。内部消费者：debugger `adapters.ts`、`runtime-actions-submit.test.ts:305`（spread 并 override `props`）、`adapters.test.ts:28`（`as never` stub）。
- `SchemaCompiler.compileNode` 返回 `CompiledSchemaNode`（仅 4 处测试调用）。
- `createCompiledRegion` 和 `extractNestedSchemaRegions` 通过 `schema-compiler/index.ts` 公开导出，接受/返回 `CompiledRegion`。
- 以下字段被计算但从未在编译管线之外被读取：`flags`（`CompiledNodeFlags`）、`eventKeys`、`templateGraphId`（从未被写入或读取）、`extensions`（仅用于计算 `runtimeBoundaries`，后者已被 `scopePlan` 替代）。
- `CompiledSchemaNode.cid` 在 `enrichCompiledComponentTargets` 中被赋值（`target-enrichment.ts:51`），但**从未在运行时被读取**。运行时的 `cid` 来自两条独立路径：(1) `NodeRenderer` 通过 `useMountedCid()` 分配运行时 cid（`node-renderer.tsx:41`），(2) `NodeInstance.cid` 在实例化时从外部传入。`CompiledSchemaNode.cid` 是写后不读的死字段。`getCompiledCidState()` 也从未被调用。

## Goals

- `compileSingleNode()` 直接产出 `TemplateNode`，消除 `CompiledSchemaNode → TemplateNode` 的整个转换层。
- 删除 `CompiledSchemaNode`、`CompiledRegion`、`CompiledNodeFlags`、`CompiledNodeRuntimeBoundaries`、`CompiledNodeRenderPlan`、`CompiledNodeRenderPlanProviders` 共 6 个类型。
- 删除 `buildTemplateNode`、`buildCompiledTemplate`、`buildTemplateRegion` 三个转换函数。
- 删除 `createNodeRuntimeState(CompiledSchemaNode)` 函数（已被 `createTemplateNodeRuntimeState(TemplateNode)` 替代）。
- `RendererPlugin.afterCompile` 改为接受 `CompiledTemplate`。
- `SchemaCompiler.compileNode` 改为返回 `TemplateNode`。
- `CompiledNodeRuntimeState` 重命名为 `NodeRuntimeState`，移至 `node-identity.ts`。
- 所有 typecheck、build、lint、test 通过。

## Non-Goals

- 不改变运行时渲染路径的行为。
- 不重设计 debugger 架构。
- 不改变 `CompiledTemplate` / `TemplateNode` / `NodeInstance` 的字段结构。
- 不处理 `createCompiledRegion` / `extractNestedSchemaRegions` 的公共导出问题（它们在 Phase 2 中自然内联到编译器内部，不再需要公开导出）。

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-compiler.ts` — 删除类型、重命名
- `packages/flux-core/src/types/node-identity.ts` — 接收 `NodeRuntimeState`
- `packages/flux-core/src/types/renderer-plugin.ts` — 更新 `afterCompile` 签名
- `packages/flux-core/src/types/renderer-core.ts` — 更新 import
- `packages/flux-runtime/src/schema-compiler.ts` — 重写核心编译逻辑
- `packages/flux-runtime/src/schema-compiler/regions.ts` — 改为产出 `TemplateRegion`
- `packages/flux-runtime/src/schema-compiler/tables.ts` — 更新类型引用
- `packages/flux-runtime/src/schema-compiler/target-enrichment.ts` — 改为操作 `TemplateNode`
- `packages/flux-runtime/src/schema-compiler/validation-collection.ts` — 改为接受 `TemplateNode`
- `packages/flux-runtime/src/schema-compiler/fields.ts` — 删除 `createNodeRuntimeState`
- `packages/flux-runtime/src/schema-compiler/index.ts` — 更新导出
- `packages/flux-runtime/src/node-runtime.ts` — 更新 import
- `packages/flux-react/src/node-renderer.tsx` — 更新 import
- `packages/flux-react/src/node-instance.ts` — 更新 import
- `packages/nop-debugger/src/adapters.ts` — 更新 plugin 签名
- `packages/nop-debugger/src/controller-helpers.ts` — 更新 `normalizeCompiledRoot`
- 受影响的测试文件
- `docs/architecture/flux-core.md` — 更新 CompiledSchemaNode 相关描述
- `docs/references/terminology.md` — 更新术语
- `docs/references/renderer-interfaces.md` — 更新引用
- `docs/logs/` — 记录变更

### Out Of Scope

- 运行时渲染逻辑变更
- `CompiledTemplate` / `TemplateNode` / `NodeInstance` 字段增减
- debugger 架构重设计
- 不相关包的变更

## Risks And Rollback

- **Plugin 兼容性**：`RendererPlugin.afterCompile` 签名变更会破坏任何外部插件。当前仅 debugger 消费，内部可控。
- **`cid` 赋值时机**：经核实，`CompiledSchemaNode.cid` 是**写后不读**的死字段。运行时 cid 完全通过独立路径（`useMountedCid` / `NodeInstance.cid`）分配。`enrichCompiledComponentTargets` 中的 `node.cid = ...` 赋值可直接删除，不影响运行时。`CompiledCidState.byId` 映射和 `attachCompiledCidState` 仅服务于编译器内部 id 去重，运行时不读取。
- **回滚**：所有变更集中在 `schema-compiler*` 和类型定义文件，可通过 git revert 整体回滚。

## Execution Plan

### Phase 1 - Type Relocation: Rename `CompiledNodeRuntimeState` → `NodeRuntimeState`

Status: planned
Targets: `packages/flux-core/src/types/node-identity.ts`, `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-runtime/src/node-runtime.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-instance.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`

- [ ] 在 `node-identity.ts` 中新增 `NodeRuntimeState` 接口定义（字段与当前 `CompiledNodeRuntimeState` 完全一致）
- [ ] 在 `renderer-compiler.ts` 中将 `CompiledNodeRuntimeState` 改为 `export type CompiledNodeRuntimeState = NodeRuntimeState` 兼容别名
- [ ] 更新 `renderer-core.ts` 中 `resolveNodeMeta/Props` 签名使用 `NodeRuntimeState`
- [ ] 更新 `node-runtime.ts`、`node-renderer.tsx`、`node-instance.ts`、`fields.ts` 中的 import 使用 `NodeRuntimeState`
- [ ] 运行 `pnpm typecheck && pnpm build && pnpm lint && pnpm test`

Exit Criteria:

- [ ] `NodeRuntimeState` 在 `node-identity.ts` 中定义，`CompiledNodeRuntimeState` 为兼容别名
- [ ] 运行时/渲染层所有文件 import `NodeRuntimeState` 而非 `CompiledNodeRuntimeState`
- [ ] 全量验证通过

### Phase 2 - Rewrite Compiler Core: `compileSingleNode` 直接产出 `TemplateNode`

Status: planned
Targets: `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/regions.ts`, `packages/flux-runtime/src/schema-compiler/tables.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, `packages/flux-runtime/src/schema-compiler/validation-collection.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`

- [ ] 将 `compileSchemaToNodes` 重命名为 `compileSchemaToTemplateNodes`，返回类型改为 `TemplateNode | TemplateNode[]`
- [ ] 将 `compileSingleNode` 返回类型改为 `TemplateNode`，内部直接构建 `TemplateNode` 对象：
  - `scopePlan` 内联计算（从 `renderer.scopePolicy` + `fieldInspection.extensions?.['xui:imports']`），不经过 `runtimeBoundaries` 中间变量
  - `providerPlan` 直接构建为 `TemplateProviderPlan`，不经过 `CompiledNodeRenderPlanProviders` 中间变量
  - `providerWrap` 直接调用 `buildWrapProvidersClosure`（改为接受 `TemplateProviderPlan`）
  - 删除 `flags`、`runtimeBoundaries`、`extensions`、`eventKeys`、`templateGraphId` 的计算和赋值
- [ ] 将 `createCompiledRegion` 改为返回 `TemplateRegion`，递归调用改为产出 `TemplateNode`
- [ ] 将 `DeepFieldNormalizer` 中 `regions` 类型改为 `Record<string, TemplateRegion>`，`compileSchema` 回调签名改为返回 `TemplateNode | TemplateNode[]`
- [ ] 将 `extractNestedSchemaRegions` 改为操作 `TemplateRegion`
- [ ] 将 `enrichCompiledComponentTargets` 改为遍历 `TemplateNode` 树，赋值 `templateNodeId`；删除死字段 `cid` 赋值（`node.cid = ...`），仅保留 `templateNodeId` 递增和 `attachCompiledCidState`
- [ ] 将 `collectValidationModel` 参数类型从 `CompiledSchemaNode` 改为 `TemplateNode`，内部字段 `.path` 改为 `.templatePath`
- [ ] 删除 `fields.ts` 中的 `createNodeRuntimeState` 函数
- [ ] 删除 `schema-compiler.ts` 中的 `buildTemplateNode`、`buildCompiledTemplate`、`buildTemplateRegion` 三个函数
- [ ] 更新 `schema-compiler/index.ts` 导出：删除 `createNodeRuntimeState`、`createCompiledRegion`（不再需要公开导出），更新 `DeepFieldNormalizer` 类型
- [ ] 运行 `pnpm typecheck && pnpm build && pnpm lint && pnpm test`

Exit Criteria:

- [ ] `compileSingleNode` 返回 `TemplateNode`，编译管线中无 `CompiledSchemaNode` 实例
- [ ] `buildTemplateNode`/`buildCompiledTemplate`/`buildTemplateRegion` 已删除
- [ ] `createNodeRuntimeState` 已删除
- [ ] `enrichCompiledComponentTargets` 操作 `TemplateNode`
- [ ] `CompiledSchemaNode.cid` 死赋值已删除，运行时 cid 路径不受影响
- [ ] `collectValidationModel` 接受 `TemplateNode`
- [ ] 全量验证通过

### Phase 3 - Update Public Interfaces: Plugin API and SchemaCompiler

Status: planned
Targets: `packages/flux-core/src/types/renderer-plugin.ts`, `packages/flux-core/src/types/renderer-compiler.ts`, `packages/nop-debugger/src/adapters.ts`, `packages/nop-debugger/src/adapters.test.ts`, `packages/nop-debugger/src/controller-helpers.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/__tests__/runtime-actions-submit.test.ts`, `packages/flux-runtime/src/index.test.ts`, `packages/flux-runtime/src/__tests__/runtime-scope-props.test.ts`, `packages/flux-runtime/src/__tests__/schema-compiler-registry.test.ts`

- [ ] 将 `RendererPlugin.afterCompile` 签名改为 `afterCompile?(template: CompiledTemplate): CompiledTemplate`
- [ ] 更新 `schema-compiler.ts` 中 `applyAfterCompilePlugins` 接受/返回 `CompiledTemplate`
- [ ] 更新 `SchemaCompiler.compileNode` 返回类型为 `TemplateNode`，调整实现
- [ ] 更新 `nop-debugger/src/adapters.ts` 中 `afterCompile` 回调接受 `CompiledTemplate`
- [ ] 更新 `nop-debugger/src/adapters.test.ts` 中 `afterCompile` stub 的类型
- [ ] 更新 `nop-debugger/src/controller-helpers.ts` 中 `normalizeCompiledRoot` 接受 `TemplateNode | TemplateNode[]`，读 `.templatePath` 替代 `.path`
- [ ] 更新 `runtime-actions-submit.test.ts:305` 中 `afterCompile` 回调（当前 spread `CompiledSchemaNode` 并 override `props`，需改为操作 `CompiledTemplate`）
- [ ] 更新 3 个测试文件中的 4 处 `compileNode` 调用
- [ ] 运行 `pnpm typecheck && pnpm build && pnpm lint && pnpm test`

Exit Criteria:

- [ ] `RendererPlugin.afterCompile` 签名使用 `CompiledTemplate`
- [ ] `SchemaCompiler.compileNode` 返回 `TemplateNode`
- [ ] debugger 编译日志功能正常
- [ ] 全量验证通过

### Phase 4 - Delete Dead Types

Status: planned
Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`, `packages/flux-runtime/src/schema-compiler/index.ts`

- [ ] 删除 `CompiledSchemaNode` 接口定义
- [ ] 删除 `CompiledRegion` 接口定义
- [ ] 删除 `CompiledNodeFlags` 接口定义
- [ ] 删除 `CompiledNodeRuntimeBoundaries` 接口定义
- [ ] 删除 `CompiledNodeRenderPlan` 接口定义
- [ ] 删除 `CompiledNodeRenderPlanProviders` 接口定义
- [ ] 删除 `CompiledNodeRuntimeState` 兼容别名（确认无引用后）
- [ ] 将 `CompiledSchemaMeta` 重命名为 `NodeMetaProgram`（`TemplateNode.metaProgram` 直接引用此类型），定义移至 `node-identity.ts`，`renderer-compiler.ts` 保留 `export type CompiledSchemaMeta = NodeMetaProgram` 兼容别名
- [ ] 将 `buildCompiledMeta` 重命名为 `buildMetaProgram`（`fields.ts` 和 `schema-compiler/index.ts` 导出）
- [ ] 清理 `renderer-compiler.ts` 中不再需要的 import
- [ ] 运行 `pnpm typecheck && pnpm build && pnpm lint && pnpm test`

Exit Criteria:

- [ ] `renderer-compiler.ts` 中 6 个中间类型全部删除
- [ ] `CompiledSchemaMeta` 已重命名为 `NodeMetaProgram`（定义移至 `node-identity.ts`）
- [ ] `CompiledSchemaNode` 在 `packages/` 中零引用（grep 确认）
- [ ] 全量验证通过

### Phase 5 - Documentation Update

Status: planned
Targets: `docs/architecture/flux-core.md`, `docs/references/terminology.md`, `docs/references/renderer-interfaces.md`, `docs/logs/`

- [ ] 更新 `docs/architecture/flux-core.md`：删除 `CompiledSchemaNode` 相关章节，更新编译管线描述为 `SchemaInput → TemplateNode → CompiledTemplate`
- [ ] 更新 `docs/references/terminology.md`：删除 `CompiledSchemaNode` 条目，补充 `NodeRuntimeState`
- [ ] 更新 `docs/references/renderer-interfaces.md`：删除 `CompiledSchemaNode` 引用
- [ ] 在 `docs/logs/` 记录本次变更
- [ ] 全仓 grep `CompiledSchemaNode`，确认仅在已归档文档和 git 历史中出现
- [ ] 删除 `renderer-compiler.ts` 中 `CompiledSchemaMeta` 和 `CompiledNodeRuntimeState` 兼容别名（Phase 1/4 保留的临时别名）

Exit Criteria:

- [ ] 活跃文档中无 `CompiledSchemaNode` 引用
- [ ] `docs/logs/` 已更新

## Validation Checklist

- [ ] `CompiledSchemaNode` 在 `packages/` 中零引用
- [ ] `CompiledRegion`、`CompiledNodeFlags`、`CompiledNodeRuntimeBoundaries`、`CompiledNodeRenderPlan`、`CompiledNodeRenderPlanProviders` 在 `packages/` 中零引用
- [ ] `createNodeRuntimeState` 已删除，运行时统一使用 `createTemplateNodeRuntimeState`
- [ ] `buildTemplateNode`/`buildCompiledTemplate`/`buildTemplateRegion` 已删除
- [ ] `RendererPlugin.afterCompile` 签名使用 `CompiledTemplate`
- [ ] `SchemaCompiler.compileNode` 返回 `TemplateNode`
- [ ] `NodeRuntimeState` 在 `node-identity.ts` 中定义
- [ ] `NodeMetaProgram` 在 `node-identity.ts` 中定义（原 `CompiledSchemaMeta`）
- [ ] `CompiledSchemaNode.cid` 死赋值已删除
- [ ] 编译器直接产出 `TemplateNode`，无中间转换层
- [ ] debugger 编译日志功能正常
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] 独立子 agent closure audit 已完成并记录证据

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<剩余工作或明确写 no remaining plan-owned work>>
