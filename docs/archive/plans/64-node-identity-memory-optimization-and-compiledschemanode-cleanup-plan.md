# 64 Node Identity Memory Optimization And CompiledSchemaNode Cleanup Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: Deep analysis of `packages/flux-core/src/types/node-identity.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-instance.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, `packages/flux-core/src/compiled-cid.ts`, `docs/architecture/template-instantiation-and-node-identity.md`. Audit by independent subagent on 2026-04-10.
> Related: `docs/plans/40-template-instantiation-and-node-identity-implementation-plan.md` (completed, superseded baseline)

## Purpose

彻底重构 node identity 模型，达到最大化性能、最小化内存占用的目标：

1. 消灭 `NodeLocator` 类型——所有用途由 `cid`（整数）和 `instancePath`（repeated 时的数组）完全替代
2. `SchemaCompiler` 产出 `CompiledTemplate`（内含 `TemplateNode` 树），消除运行时兼容层转换开销
3. `NodeRenderer` 直接消费 `NodeInstance`，不再依赖 `CompiledSchemaNode` 运行时路径
4. 瘦身 `ComponentHandle`，删除冗余 locator 索引，简化 registry 结构
5. 修复当前渲染路径中每帧创建新对象的性能 bug（通过架构迁移根本解决，跳过临时 Phase 0）

## Current Baseline

### 已经成立的事实

- `TemplateNode`、`CompiledTemplate`、`NodeInstance`、`NodeLocator` 类型已在 `flux-core` 中定义
- `SchemaCompiler` 产出 `CompiledSchemaNode`（非 `TemplateNode`），`NodeLocator` 已被实装但有大量冗余字段
- `createCompatibilityNodeInstance`（`flux-react/src/node-instance.ts`）每次渲染都创建新的 regions 映射对象
- `getCompiledNodeLocator`（`node-renderer-utils.ts:36`）每帧 new 一个 locator 对象，导致依赖它的 `nodeInstance` useMemo 每帧失效（`events` useMemo 同样受影响）
- `ComponentHandle._locator` 存储 locator，`handlesByLocator` 以序列化字符串为 key 做查找
- `schema-compiler.ts:255` 已支持外部传入 `cidState`（`options.cidState ?? createCompiledCidState()`），page-runtime 通过 `getCompiledCidState(ownerNode)` 复用 ownerNode 的 cidState，但 `RendererRuntime` 层没有持有全局默认 cidState，每次 `createCompiledCidState()` 都从 0 开始

### 关于 NodeLocator 的核心结论

`NodeLocator` 的所有实际用途可以被两个独立概念完全替代：

| 用途                                                    | 实际需要                            | 结论                                         |
| ------------------------------------------------------- | ----------------------------------- | -------------------------------------------- |
| `action-runtime.ts:291` repeated action 传 instancePath | 只需要 `instancePath`               | 改为 `ctx.instancePath` 直接携带             |
| `component:method` 找 handle                            | 只需要 `cid`（`_targetCid` 已写入） | locator 路径完全冗余                         |
| debugger 事件追踪                                       | 纯调试信息                          | `debugEnabled` 开关控制，关闭时零开销        |
| `inspectNode(locator)`                                  | 可改为 `inspectByCid`               | 简化消除                                     |
| `render-nodes.tsx:230` 取 instancePath                  | 只需要 `instancePath`               | 直接从 NodeInstance 取（Phase 2 中同步修改） |
| lifecycle actions 传 locator                            | 最终只用 instancePath               | 改为 `ctx.instancePath`                      |
| `action-runtime-core.ts:51` 取 runtimeId                | 直接 `ctx.runtime.runtimeId`        | 不依赖 locator                               |
| `buildActionMonitorPayload` 中 `locator: ctx.locator`   | 纯调试字段                          | 替换为 `instancePath?: ctx.instancePath`     |

### 关于 staticPlan / repeatedPlan / repeatedSelector

- `staticPlan`（`ComponentTarget`）：由 `target-enrichment.ts:50-57` 写入 `__componentTarget`，仅服务于 locator 解析路径。`_targetCid` 已同时写入且优先使用，locator 路径删除后 `staticPlan`/`__componentTarget` 均可删除。
- `repeatedPlan`（`ComponentTarget`）：有类型定义和解析逻辑，但 `target-enrichment.ts` 中并未写入——是未被主编译器填充的遗留路径，可删除。
- `repeatedSelector`（`ComponentTarget`）：同上，未被主编译器填充，可删除。
- `_targetTemplateId`/`componentInstanceKey`/`dynamicHandles`：服务于 repeated handle 动态查找路径，`action-runtime.ts:267-269` 中仍有引用。Phase 3 删除前需确认无 schema 真实依赖这条路径；`cleanupDynamic` 的调用方也需在 Phase 3 开始前核查清楚。

### 关于 templateNodeId 全局唯一

**方案决策**：`RendererRuntime` 在构造时持有一个全局 cidState 作为 `createSchemaCompiler` 的默认值，所有不显式传入 cidState 的 `compile()` 调用均共享此全局计数器，保证同一 runtime 内 `templateNodeId` 全局唯一，从而可以删除 `templateGraphId` 字段。

此方案需要：

1. `createSchemaCompiler(input)` 增加 `defaultCidState?: CompiledCidState` 参数
2. `RendererRuntime` 构造时创建全局 cidState 并注入给 `createSchemaCompiler`
3. 现有 page-runtime 通过 `getCompiledCidState(ownerNode)` 传递 cidState 的路径仍然工作（显式传入优先）

### 关于 TemplateNode.metaProgram 类型

**类型决策**：`TemplateNode.metaProgram` 类型改为 `CompiledSchemaMeta`（与 `CompiledSchemaNode.meta` 结构一致），`TemplateNode.propsProgram` 类型保持 `CompiledRuntimeValue<Record<string,unknown>>`。这样 `buildTemplateNode` 可以直接赋值，`resolveNodeMeta` 最小改动即可接受 `TemplateNode`。

### 当前性能 bug

跳过 Phase 0（临时修复），通过架构迁移（Phase 1-4）从根本上消除：

- `node-renderer.tsx:96`：`getCompiledNodeLocator` 每帧 new locator 对象 → Phase 4 删除
- `node-renderer.tsx:97-104`/`131`：`createCompatibilityNodeInstance` 无充分 memo → Phase 4 删除
- `node-renderer.tsx:163-183`：`events` useMemo 依赖 `nodeLocator` 每帧重建 → Phase 4 修复
- `node-instance.ts:50-58`：regions `Object.fromEntries` 每次重建 → Phase 4 删除

### 架构遗留

- `SchemaCompiler` 仍返回 `CompiledSchemaNode`，`CompiledTemplate` 已定义但未被编译器产出
- `NodeRenderer` 接收 `CompiledSchemaNode`，通过 `createCompatibilityNodeInstance` 转换
- `ComponentHandle` 上存有 `_locator`、`_templateId`、`_instanceKey` 冗余字段
- registry 有 `handlesByLocator`、`dynamicHandles` 两个可消除的索引

## Goals

- 消除 `NodeLocator` 类型，用 `cid`（整数）+ `instancePath`（数组，singleton 时为 `undefined`）替代
- `SchemaCompiler` 产出 `TemplateNode`（`metaProgram: CompiledSchemaMeta`，`component: RendererDefinition`）
- `NodeRenderer` 接收 `NodeInstance`，不再依赖 `CompiledSchemaNode` 运行时路径
- `ComponentHandle` 只保留 `_cid`、`_mounted`、`id`、`name`、`type`、`ref`、`capabilities`
- Registry 只保留 `handlesByCid`、`handlesById`、`handlesByName` 三个索引
- `ActionContext` 用 `instancePath` 直接替代 `locator?.instancePath`
- debugger 调试信息由 `debugEnabled` 开关控制，关闭时零分配开销
- `runtimeId` 移至 `SchemaRenderer` 根节点 DOM 属性（`data-runtime-id`），不进入任何运行时数据结构

## Non-Goals

- 不改变 scope 模型（`ScopeRef` 已经是不变对象，无需改动）
- 不改变 expression compiler 和依赖追踪逻辑
- 不改变 form validation 架构
- 不改变 playground 和 debugger UI 的外观功能
- 不引入 virtualization renderer
- 不改变 flow-designer / report-designer 的特有协议

## Scope

### In Scope

**flux-core 类型层**

- `packages/flux-core/src/types/node-identity.ts` — 删除 `NodeLocator` 及辅助函数，`NodeInstance` 加顶层 `instancePath`（删除 `locator` 字段），删除 `RuntimeNodeResolver` 接口，更新 `NodeRefRegistry.resolveCid` 返回类型，`ActionContext` 删除 `locator` 改为 `instancePath`，`ActionMonitorPayload` 同步更新，删除 `StaticTargetPlan`/`RepeatedTargetPlan`/`RepeatedInstanceSelector` 中的 `templateGraphId`，更新 `ResolutionResult`/`InspectResult`/`NodeInspectPayload`（删除 locator 字段）
- `packages/flux-core/src/types/renderer-compiler.ts` — `CompiledSchemaNode` 加 `@internal` 注释；`SchemaCompiler.compile()` 返回类型改为 `CompiledTemplate`
- `packages/flux-core/src/types/renderer-component.ts` — 瘦身 `ComponentHandle`（删除 `_locator`、`_templateId`、`_instanceKey`），删除 `ComponentTarget` 中的 `locator`/`staticPlan`/`repeatedPlan`/`repeatedSelector`/`_targetTemplateId`/`componentInstanceKey`，更新 `ComponentHandleRegistry` 接口（删除 `resolveHandle`/`getHandleLocator`/`getLocatorByCid`/`cleanupDynamic`），更新 `ComponentHandleDebugData`（删除 `locator` 字段）
- `packages/flux-core/src/types/actions.ts` — `ActionContext.locator` 改为 `instancePath`，`ActionMonitorPayload.locator` 改为 `instancePath`
- `packages/flux-core/src/types/renderer-core.ts` — `RendererComponentProps` 删除 `locator` 字段，`node` 类型改为 `NodeInstance`；`RendererRuntime.resolveNodeMeta()`/`resolveNodeProps()` 签名接受 `TemplateNode`；删除 `RendererRuntime.resolveNode(locator)` 方法
- `packages/flux-core/src/types/renderer-hooks.ts` — `RenderNodeMeta` 删除 `locator` 字段，`node?: CompiledSchemaNode` 改为 `node?: NodeInstance`；删除 `RenderFragmentOptions.ownerNode?: CompiledSchemaNode`（以 `ownerNodeInstance` 为准）；`RenderRegionHandle.node` 类型改为 `TemplateNode`；`RenderNodeInput` 删除 `CompiledSchemaNode` 选项
- `packages/flux-core/src/compiled-cid.ts` — 删除 `templateGraphId` 字段

**flux-runtime 实现层**

- `packages/flux-runtime/src/schema-compiler.ts` — `compile()` 返回 `CompiledTemplate`（内含 `TemplateNode` 树），实现 `buildTemplateNode` 递归转换（含 `component` 赋值、`metaProgram` 直接赋值 `node.meta`、`scopePlan` 映射、`regions` 递归）；`createSchemaCompiler` 增加 `defaultCidState` 参数
- `packages/flux-runtime/src/schema-compiler/target-enrichment.ts` — 删除 `__componentTarget`/`staticPlan` 写入逻辑，删除 `templateGraphId` 写入，只保留 `templateNodeId`/`cid` 填充
- `packages/flux-runtime/src/component-handle-registry.ts` — 删除 `handlesByLocator`、`dynamicHandles`，只保留 `handlesByCid`/`handlesById`/`handlesByName`；删除 `allocateCid` 内部函数；删除 `cleanupDynamic` 实现
- `packages/flux-runtime/src/node-resolver.ts` — 删除 locator-based 和 plan-based 解析路径，`resolveTarget` 只走 `_targetCid`/`componentId`/`componentName`；`ResolutionContext` 删除 `instancePathFor`/`instancePathForExplicit`
- `packages/flux-runtime/src/action-runtime.ts` — `ctx.locator?.instancePath` 改为 `ctx.instancePath`；删除 locator/plan/`_targetTemplateId`/`componentInstanceKey` 相关分支
- `packages/flux-runtime/src/action-runtime-core.ts` — `getActionRuntimeId` 改为 `ctx.runtime.runtimeId`；`buildActionMonitorPayload` 中 `locator` 改为 `instancePath`
- `packages/flux-runtime/src/node-runtime.ts` — `resolveNodeMeta`/`resolveNodeProps` 接受 `TemplateNode`（`metaProgram: CompiledSchemaMeta`/`propsProgram`），更新字段引用
- `packages/flux-runtime/src/page-runtime.ts` — 使用 runtime 全局 cidState（不再依赖 `getCompiledCidState(ownerNode)` 手动传递）

**flux-react React 层**

- `packages/flux-react/src/node-renderer.tsx` — 接收 `TemplateNode`，直接读取 `component`，删除 locator 相关代码，直接构建 `NodeInstance`
- `packages/flux-react/src/node-instance.ts` — 删除整个文件
- `packages/flux-react/src/node-renderer-utils.ts` — 删除 `getCompiledNodeLocator`
- `packages/flux-react/src/node-renderer-providers.tsx` — 删除 `node: CompiledSchemaNode`、`locator` props
- `packages/flux-react/src/render-nodes.tsx` — `instancePath` 改为从 `ownerNodeInstance?.instancePath` 取（Phase 2 中同步修改，不等到 Phase 4）
- `packages/flux-react/src/helpers.tsx` — 删除 `locator` 参数，`mergeActionContext` 用 `instancePath` 替代
- `packages/flux-react/src/hooks.ts` — `useRenderFragment` 中 `locator: nodeMeta?.nodeInstance?.locator` 改为 `instancePath: nodeMeta?.nodeInstance?.instancePath`
- `packages/flux-react/src/node-renderer-effects.ts` — `useNodeLifecycleActions` 删除 `locator` 参数，dispatch 时传 `instancePath`
- `packages/flux-react/src/useNodeDebugData.ts` — 删除 locator 写入，所有写入移入 `debugEnabled` 条件分支
- `packages/flux-react/src/schema-renderer.tsx` — 根节点输出 `data-runtime-id`，注册全局 runtime Map

**renderer 包**

- `packages/flux-renderers-form/src/renderers/form.tsx` — 删除 `props.locator`/`props.nodeInstance.locator`；`activationKey` 改为 `props.meta.cid !== undefined ? String(props.meta.cid) : \`${props.id}:${props.path}\``
- `packages/flux-renderers-data/src/table-renderer.tsx` — 删除 `props.nodeInstance.locator.instancePath`，改为 `props.node.instancePath`
- `packages/flux-renderers-data/src/table-renderer/use-table-handle.ts` — 注册 handle 时删除 locator/templateId/instanceKey 参数
- `packages/flux-renderers-basic/src/tabs.tsx` — 注册 tabs handle 时删除 locator 参数
- `packages/flux-renderers-data/src/chart-renderer.tsx` — 注册 chart handle 时删除 locator 参数

**debugger 包**

- `packages/nop-debugger/src/controller.ts` — 删除 `inspectNode(locator)` 入口，改为 `inspectByCid(cid)`；`getComponentTree` 中 `templateGraphId`-based 排序逻辑改为用 `templateNodeId` 排序，`instancePath.length` 替代 `locator.instancePath.length`
- `packages/nop-debugger/src/types.ts` — `NopDebugEvent.locator` 改为 `instancePath`；`NopComponentTreeItem.locator`/`NopComponentInspectResult.locator` 字段删除或替换
- `packages/nop-debugger/src/adapters.ts` — 所有 `ctx.locator`/`payload.locator` 引用更新为 `ctx.instancePath`/`payload.instancePath`

**测试文件**

- `packages/flux-react/src/schema-renderer-runtime.test.tsx` — 更新 locator 引用（第 172 行等），`exposes locator` 测试用例改为验证 `instancePath`/`templateNodeId`
- `packages/flux-renderers-basic/src/index.test.tsx` — 更新第 17 行 `props.nodeInstance.locator.instancePath` 引用

**文档**

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/renderer-runtime.md`

### Out Of Scope

- 重写 validation architecture
- 新增 virtualization renderer
- flow-designer / report-designer 的特有协议变化
- debugger UI 增强（只维护 inspect substrate）
- `ScopeRef` 内部实现变更

## Execution Plan

### Phase 1 - 更新 TemplateNode 契约，让编译器直接产出 CompiledTemplate

Status: completed
Targets:

- `packages/flux-core/src/types/node-identity.ts`
- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-core/src/compiled-cid.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`
- `packages/flux-runtime/src/page-runtime.ts`

**类型变更：**

- [x] `TemplateNode` 定义更新：`metaProgram` 类型改为 `CompiledSchemaMeta`（与 `CompiledSchemaNode.meta` 结构一致）；加入 `component: RendererDefinition` 字段
- [x] `CompiledCidState` 删除 `templateGraphId` 字段
- [x] `SchemaCompiler.compile()` 返回类型改为 `CompiledTemplate`
- [x] `CompiledSchemaNode` 加 `@internal` 注释

**编译器变更：**

- [x] `createSchemaCompiler(input)` 增加 `defaultCidState?: CompiledCidState` 参数；内部回退逻辑改为 `options.cidState ?? input.defaultCidState ?? createCompiledCidState()`
- [x] `RendererRuntime` 构造时创建全局 cidState，注入给 `createSchemaCompiler`；同步更新 `page-runtime.ts`（确认与现有 `getCompiledCidState(ownerNode)` 路径兼容）
- [x] 实现 `buildTemplateNode(compiled: CompiledSchemaNode, registry: RendererRegistry): TemplateNode` 递归转换函数：
  - `component`：从 `registry.get(compiled.type)` 取
  - `metaProgram`：直接赋值 `compiled.meta`（类型已对齐）
  - `propsProgram`：直接赋值 `compiled.props`
  - `eventPlans`：直接赋值 `compiled.eventActions`
  - `regions`：递归调用 `buildTemplateNode`，构建 `TemplateRegion` 树
  - `scopePlan`：根据 `renderer.scopePolicy` 和 schema 字段映射（先阅读 `createSchemaCompiler` 中的 scope boundary 逻辑确认所有可能值）
  - `validationPlan`：直接赋值 `compiled.validation`
- [x] `scopePlan` 映射规则在 `buildTemplateNode` 中实现（不能硬编码 `inherit`）：
  - `renderer.scopePolicy === 'form'` → `{ kind: 'form' }`
  - `renderer.scopePolicy === 'dialog'` → N/A (`ScopePolicy` type only has `'inherit' | 'form'`; `dialog` and `repeated-item` are runtime-constructed, not compiler-mapped)
  - 否则 → `{ kind: 'inherit' }` or `{ kind: 'child' }` via `mayPublishScope`
- [x] `enrichCompiledComponentTargets` 更新：删除 `templateGraphId` 写入，只保留 `templateNodeId`/`cid` 填充
- [x] `SchemaCompiler.compile()` 实现：在 `enrichCompiledComponentTargets` 之后，调用 `buildTemplateNode` 递归构建 `CompiledTemplate.root`

Exit Criteria:

- [x] `SchemaCompiler.compile()` 返回 `CompiledTemplate`（含 `root: TemplateNode | TemplateNode[]`）
- [x] `TemplateNode` 包含 `component: RendererDefinition` 且 `metaProgram` 类型为 `CompiledSchemaMeta`
- [x] 同一 runtime 下所有 `templateNodeId` 全局唯一（不依赖 `templateGraphId`）
- [x] `pnpm typecheck` passes
- [x] `pnpm --filter @nop-chaos/flux-runtime build` passes

---

### Phase 2 - 消除 NodeLocator，更新 ActionContext 和 NodeInstance

Status: completed
Targets:

- `packages/flux-core/src/types/node-identity.ts`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-react/src/helpers.tsx`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/node-renderer-effects.ts`
- `packages/flux-react/src/render-nodes.tsx`

**类型删除：**

- [x] 删除 `NodeLocator` 接口
- [x] 删除 `serializeNodeLocator`、`normalizeNodeLocator`、`isNodeLocator` 函数（`normalizeInstancePath` 如有独立用途则保留）
- [x] 删除 `RuntimeNodeResolver` 接口（`node-identity.ts:152`）
- [x] `NodeRefRegistry.resolveCid` 返回类型从 `NodeLocator | undefined` 改为 `{ templateNodeId: TemplateNodeId; instancePath?: readonly InstanceFrame[] } | undefined`（或删除整个接口，视调用方情况决定）
- [x] `NodeInstance` 更新：删除 `locator: NodeLocator`，加入 `instancePath?: readonly InstanceFrame[]`
- [x] `ActionContext` 更新：删除 `locator?: NodeLocator`，加入 `instancePath?: readonly InstanceFrame[]`
- [x] `ActionMonitorPayload` 更新：`locator?: NodeLocator` 改为 `instancePath?: readonly InstanceFrame[]`
- [x] `ResolutionResult`、`InspectResult`、`NodeInspectPayload` 中的 `locator` 字段移除或替换为 `{ templateNodeId: TemplateNodeId; instancePath?: readonly InstanceFrame[] }`
- [x] `StaticTargetPlan`、`RepeatedTargetPlan`、`RepeatedInstanceSelector` 删除 `templateGraphId` 字段

**实现更新：**

- [x] `action-runtime.ts:291`：`ctx.locator?.instancePath` → `ctx.instancePath`
- [x] `action-runtime-core.ts:51`：`ctx.locator?.runtimeId` → `ctx.runtime.runtimeId`
- [x] `action-runtime-core.ts:95`：`buildActionMonitorPayload` 中 `locator: ctx.locator` → `instancePath: ctx.instancePath`
- [x] `helpers.tsx`：`mergeActionContext` 和 `createHelpers` 删除 `locator` 参数，改用 `instancePath`
- [x] `hooks.ts:201`：`locator: nodeMeta?.nodeInstance?.locator` 改为 `instancePath: nodeMeta?.nodeInstance?.instancePath`
- [x] `node-renderer-effects.ts`：`useNodeLifecycleActions` 删除 `locator` 参数，dispatch 时传 `instancePath`
- [x] `render-nodes.tsx:230`：`ownerNodeInstance?.locator.instancePath` 改为 `ownerNodeInstance?.instancePath`

Exit Criteria:

- [x] 代码中无 `NodeLocator` 类型引用
- [x] `ActionContext.instancePath` 可正常传递到 repeated action 解析路径
- [x] `render-nodes.tsx:230` 已更新（无 `.locator.instancePath` 访问）
- [x] `pnpm typecheck` passes
- [x] `pnpm --filter @nop-chaos/flux-runtime test` passes

---

### Phase 3 - 瘦身 ComponentHandle 和 Registry

Status: completed
Targets:

- `packages/flux-core/src/types/renderer-component.ts`
- `packages/flux-runtime/src/component-handle-registry.ts`
- `packages/flux-runtime/src/node-resolver.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`

**前置确认（执行前核查）：**

- [x] 确认 `cleanupDynamic` 的所有调用方，评估删除 `dynamicHandles` 后是否需要替代清理机制
- [x] 确认无 schema 真实使用 `_targetTemplateId` 进行 repeated 定位的场景（搜索 playground schemas 和测试数据）

**类型变更：**

- [x] `ComponentHandle` 接口只保留：`_cid?`、`_mounted?`、`id?`、`name?`、`type`、`ref?`、`capabilities`（删除 `_locator`、`_templateId`、`_instanceKey`）
- [x] `ComponentTarget` 接口删除：`locator`、`staticPlan`、`repeatedPlan`、`repeatedSelector`、`_targetTemplateId`、`componentInstanceKey`
- [x] `ComponentHandleRegistry` 接口删除：`resolveHandle`、`getHandleLocator`、`getLocatorByCid`、`cleanupDynamic`；`register` options 删除 `locator`、`templateId`、`instanceKey`、`dynamicLoaded`
- [x] `ComponentHandleDebugData` 删除 `locator` 字段

**实现变更：**

- [x] `createComponentHandleRegistry`：删除 `handlesByLocator`、`dynamicHandles` Map 及相关逻辑；删除 `staticCidCounter`/`dynamicLoadedCidCounter`；删除 `resolveHandle`/`getHandleLocator`/`getLocatorByCid`/`cleanupDynamic` 方法
- [x] `resolveInScope` 只走 `_targetCid`/`componentId`/`componentName` 路径
- [x] `resolveTarget` 中 ambiguous 分支：删除 `locator` 相关字段的 fallback
- [x] `node-resolver.ts`：删除 locator-based 和 plan-based 解析路径；`ResolutionContext` 删除 `instancePathFor`/`instancePathForExplicit`
- [x] `action-runtime.ts:267-269`：删除 `_targetTemplateId`/`componentInstanceKey` 分支
- [x] `target-enrichment.ts`：删除 `__componentTarget`/`staticPlan` 写入逻辑（第 50-57 行）

Exit Criteria:

- [x] `handlesByLocator` Map 不存在于任何代码路径
- [x] `ComponentHandle._locator` 字段不存在
- [x] `dynamicHandles` Map 不存在
- [x] `cleanupDynamic` 方法不存在
- [x] `pnpm typecheck` passes
- [x] `pnpm --filter @nop-chaos/flux-runtime test` passes

---

### Phase 4 - 重构 NodeRenderer 消费 NodeInstance

Status: completed
Targets:

- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/renderer-hooks.ts`
- `packages/flux-runtime/src/node-runtime.ts`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/node-instance.ts`
- `packages/flux-react/src/node-renderer-utils.ts`
- `packages/flux-react/src/node-renderer-providers.tsx`
- `packages/flux-react/src/schema-renderer.tsx`

**类型变更：**

- [x] `RendererRuntime.resolveNodeMeta(node: TemplateNode, ...)`/`resolveNodeProps(node: TemplateNode, ...)` 签名更新（接受 `TemplateNode` 替代 `CompiledSchemaNode`）；删除 `RendererRuntime.resolveNode(locator)` 方法
- [x] `RendererComponentProps` 更新：删除 `locator` 字段；`node` 类型改为 `NodeInstance`
- [x] `RenderNodeMeta` 更新：删除 `locator` 字段；`node?: CompiledSchemaNode` 改为 `node?: NodeInstance`
- [x] 删除 `RenderFragmentOptions.ownerNode?: CompiledSchemaNode`（以 `ownerNodeInstance` 为准）
- [x] `RenderRegionHandle.node` 类型从 `CompiledSchemaNode | CompiledSchemaNode[] | null` 改为 `TemplateNode | TemplateNode[] | null`
- [x] `RenderNodeInput` 删除 `CompiledSchemaNode` 选项

**实现变更：**

- [x] `node-runtime.ts`：`resolveNodeMeta`/`resolveNodeProps` 接受 `TemplateNode`，字段引用从 `node.meta` 改为 `node.metaProgram`，从 `node.props` 改为 `node.propsProgram`，`cid` 从 `node.templateNodeId` 取
- [x] `NodeRenderer` props 更新为接收 `TemplateNode`（替代 `CompiledSchemaNode`）
- [x] `NodeRenderer` 内部：直接从 `props.node.component` 读取 renderer，删除 registry 查找
- [x] `NodeRenderer` 内部：直接构建 `NodeInstance` via `createNodeInstance` (`node-instance.ts`)
- [x] `node-renderer-utils.ts`：删除 `getCompiledNodeLocator`
- [x] `node-renderer-providers.tsx`：删除 `node: CompiledSchemaNode`、`locator` props
- [x] `schema-renderer.tsx`：根节点输出 `data-runtime-id={runtimeId}`

Exit Criteria:

- [x] `node-renderer.tsx` 中无 `CompiledSchemaNode` 引用
- [x] `createCompatibilityNodeInstance` 不存在于任何代码路径
- [x] `RendererRuntime.resolveNodeMeta`/`resolveNodeProps` 接受 `TemplateNode`
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] playground 功能正常（basic page, form, dialog, table）

---

### Phase 5 - 更新 debugger 和 renderer 包，关闭 locator 入口

Status: completed
Targets:

- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/flux-react/src/useNodeDebugData.ts`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-renderers-data/src/table-renderer.tsx`
- `packages/flux-renderers-data/src/table-renderer/use-table-handle.ts`
- `packages/flux-renderers-basic/src/tabs.tsx`
- `packages/flux-renderers-data/src/chart-renderer.tsx`

**debugger 变更：**

- [x] `NopDebugEvent.locator` 改为 `instancePath?: readonly InstanceFrame[]`
- [x] `NopComponentTreeItem.locator`/`NopComponentInspectResult.locator` 字段删除或替换
- [x] `controller.ts`：删除 `inspectNode(locator)` 入口，改为 `inspectByCid(cid)` 唯一入口
- [x] `controller.ts`：`getComponentTree` 中 `templateGraphId`-based 排序逻辑改为用 `templateNodeId` 排序；`instancePath.length` 替代 `locator.instancePath.length`
- [x] `adapters.ts`：两处 `ctx.locator`/`payload.locator` 引用改为 `ctx.instancePath`/`payload.instancePath`
- [x] `useNodeDebugData.ts`：所有 `debugDataByCid` 写入移入 `debugEnabled` 条件分支

**renderer 包变更：**

- [x] `form.tsx`：删除 `props.locator`/`props.nodeInstance.locator`；`activationKey` 改为 `instancePath`-based key
- [x] `table-renderer.tsx`：`props.node.instancePath` 直接使用
- [x] `use-table-handle.ts`：注册 handle 时删除 locator/templateId/instanceKey 参数
- [x] `tabs.tsx`：注册 tabs handle 时删除 locator 参数
- [x] `chart-renderer.tsx`：注册 chart handle 时删除 locator 参数

Exit Criteria:

- [x] `debugEnabled = false` 时，`debugDataByCid` Map 完全不写入
- [x] `data-runtime-id` 正确出现在 SchemaRenderer 根节点
- [x] debugger `inspectByCid` 能正确返回 `{ templateNode, scope, state, resolvedMeta, resolvedProps }`
- [x] `form.tsx` 的 initAction 防重执行逻辑正常工作
- [x] `pnpm typecheck` passes
- [x] `pnpm --filter @nop-chaos/nop-debugger test` passes

---

### Phase 6 - 清理剩余引用，更新测试和文档

Status: completed
Targets: 全仓剩余引用，测试文件，文档

- [x] 全仓 grep `CompiledSchemaNode` 运行时引用，逐一清理或确认已标注 `@internal`
- [x] `DialogState`、`SurfaceState` 中的 `ownerNode?: CompiledSchemaNode` 改为 `ownerTemplateNode?: TemplateNode`
- [x] `packages/flux-react/src/schema-renderer-runtime.test.tsx`：更新 locator 引用，验证 `instancePath`/`templateNodeId`
- [x] `packages/flux-renderers-basic/src/index.test.tsx`：更新 `props.nodeInstance.locator.instancePath` 引用
- [x] `packages/flux-renderers-data/src/index.test.tsx`：更新 stale "locator" test description strings
- [x] 更新 `docs/architecture/template-instantiation-and-node-identity.md`：反映 NodeLocator 消除、TemplateNode 直接持有 renderer 引用、templateNodeId 全局唯一、instancePath 替代 locator 的新设计
- [x] 更新 `docs/architecture/renderer-runtime.md`：移除"current code still renders CompiledSchemaNode"的临时说明

Exit Criteria:

- [x] `pnpm typecheck && pnpm build && pnpm lint` passes
- [x] `pnpm test` passes
- [x] playground 所有场景正常（basic page, form, dialog, drawer, table）
- [x] debugger inspect 功能正常
- [x] 架构文档与代码一致

---

## Validation Checklist

### 功能正确性

- [x] `component:method` action 通过 `_targetCid` 正确找到 ComponentHandle
- [x] repeated table row action 通过 `instancePath` 正确解析目标实例
- [x] lifecycle onMount/onUnmount actions 正确触发
- [x] form submit/validate/reset 正确工作；initAction 不重复执行
- [x] dialog open/close 正确工作
- [x] xui:imports 正确工作

### 性能/内存

- [x] `node-renderer.tsx` 中每次渲染不创建新的 locator 对象（locator 已消除）
- [x] `nodeInstance` useMemo 在 templateNode 和 instancePath 不变时正确复用
- [x] singleton 节点的 `instancePath` 为 `undefined`（不分配数组）
- [x] `debugEnabled = false` 时无调试对象分配

### 结构正确性

- [x] `NodeLocator` 类型不存在于任何运行时代码路径
- [x] `ComponentHandle._locator` 字段不存在
- [x] `handlesByLocator` Map 不存在
- [x] `dynamicHandles` Map 不存在
- [x] `createCompatibilityNodeInstance` 函数不存在
- [x] `TemplateNode.component` 直接持有 `RendererDefinition`
- [x] `TemplateNode.metaProgram` 类型为 `CompiledSchemaMeta`
- [x] `templateNodeId` 在同一 runtime 内全局唯一

### 验证

- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

1. **Phase 1 scopePlan 映射**：`buildTemplateNode` 中 `scopePlan` 的映射规则需要在执行前完整阅读 `createSchemaCompiler` 中的 scope boundary 逻辑，确认 `scopePolicy` 字段名和所有可能值，避免映射不完整导致 scope boundary 错误。

2. **Phase 3 dynamicHandles 删除**：`cleanupDynamic` 的调用方和 `_targetTemplateId` 实际使用场景必须在 Phase 3 开始前核查，否则删除后可能引入静默的功能 bug。

3. **Phase 4 cid 来源**：新设计中 `NodeInstance.cid` 直接使用 `TemplateNode.templateNodeId`（编译期全局唯一分配）。需在 Phase 4 开始前确认 `node-runtime.ts:192` 的 `cid: node.cid` 路径在 Phase 1 后是否替换为 `templateNodeId`，以及 `data-cid` DOM 属性的写入时机是否一致。

4. **渲染器兼容**：所有具体 renderer 组件通过 `RendererComponentProps.node` 访问原 `CompiledSchemaNode` 字段的代码需要全部更新，主要集中在 Phase 5/6。建议在 Phase 4 完成后，通过全仓 typecheck 错误驱动逐一修复。

## Closure

Status Note: All phases completed. Independent closure audit (session ses_27e6f3ed7ffeqMnGzRFTZpy8uh, 2026-04-12) confirmed the remaining gaps and they were landed in session 29:

1. `createSchemaCompiler` now accepts `defaultCidState?: CompiledCidState` parameter (`packages/flux-runtime/src/schema-compiler.ts`)
2. `createRendererRuntime` creates a global `defaultCidState` at construction time and passes it to `createSchemaCompiler`, ensuring all `templateNodeId` values are globally unique within one runtime (`packages/flux-runtime/src/index.ts`)
3. `OwnedSurfaceStateBase.ownerNode: CompiledSchemaNode` renamed to `ownerTemplateNode: TemplateNode` in `packages/flux-core/src/types/runtime.ts` and `packages/flux-runtime/src/page-runtime.ts`
4. `schema-renderer.tsx` root node now outputs `data-runtime-id={runtime.runtimeId}` attribute (`packages/flux-react/src/schema-renderer.tsx`)
5. Stale test descriptions containing "locator" cleaned up in `packages/flux-renderers-data/src/index.test.tsx`

Verification: `pnpm typecheck` ✓, `pnpm build` ✓, `pnpm lint` ✓, `pnpm test` ✓ (all 475 runtime tests, 57 react tests, 200 form renderer tests, 32 data renderer tests passing).

Follow-up:

- 如有 repeated table row 的 instancePath 传递需要专项优化，移至独立 plan
