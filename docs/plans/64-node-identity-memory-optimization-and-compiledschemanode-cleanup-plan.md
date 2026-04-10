# 64 Node Identity Memory Optimization And CompiledSchemaNode Cleanup Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-10
> Source: Discussion with user about memory optimization and architecture simplification
> Related: `docs/plans/40-template-instantiation-and-node-identity-implementation-plan.md`

## Purpose

本计划用于：
1. 简化 node identity 模型，减少内存占用（30-50%）
2. 清理 CompiledSchemaNode 与 TemplateNode 的混用，统一使用 TemplateNode
3. 移除不必要的 runtimeId 和 templateGraphId 字段，改用 cid 主定位

## Current Baseline

### 当前存在的问题

1. **内存占用过大**：
   - 每个 NodeInstance 包含完整 NodeLocator（runtimeId + templateGraphId + instancePath）
   - 每个 ComponentHandle 存储 _locator（重复存储）
   - 对于 repeated 结构，instancePath 在多个节点重复存储
   - 估算：1000 节点页面占用 0.6-3.5 MB

2. **架构混用**：
   - SchemaCompiler 产出 CompiledSchemaNode（带 React 集成信息）
   - TemplateNode 存在但不是编译产物
   - createCompatibilityNodeInstance 作为兼容层在运行时转换
   - NodeRenderer 直接消费 CompiledSchemaNode，而不是 TemplateNode

3. **过度设计的 identity 字段**：
   - NodeLocator 包含 runtimeId（单一 runtime 内不需要）
   - NodeLocator 包含 templateGraphId（cid 已足够）
   - 每个 NodeInstance 重复存储 instancePath（应该共享）

4. **Plan 40 未完成的部分**：
   - 建立了类型契约（NodeLocator, NodeInstance, TemplateNode）
   - 但实际编译/渲染路径仍在使用旧的 CompiledSchemaNode
   - 兼容层 createCompatibilityNodeInstance 仍在使用

### 当前架构状态

```
Author Schema
    ↓
SchemaCompiler → CompiledSchemaNode (包含 component, renderPlan, flags 等 React 细节)
    ↓
NodeRenderer (直接消费 CompiledSchemaNode)
    ↓
createCompatibilityNodeInstance → NodeInstance (包含 locator, templateNode 引用)
    ↓
ComponentHandle (存储 _cid, _locator 等字段)
```

## Goals

- 减少 node identity 相关内存占用 30-50%
- 统一编译产物为 TemplateNode，移除 CompiledSchemaNode 的运行时使用
- 简化 NodeLocator，移除 runtimeId 和 templateGraphId
- 移除 createCompatibilityNodeInstance 兼容层
- 保持 cid 作为主要定位方式

## Non-Goals

- 不改变 debugger 的 inspect 功能（保留 cid → NodeInstance 的能力）
- 不改变 templatePath（编译期确定，保留在 TemplateNode）
- 不改变 componentRegistry 的基本功能
- 不影响现有的 playground 和测试

## Scope

### In Scope

- `packages/flux-core/src/types/node-identity.ts` - NodeLocator, NodeInstance, TemplateNode 定义
- `packages/flux-core/src/types/renderer-compiler.ts` - CompiledSchemaNode 定义
- `packages/flux-core/src/types/renderer-component.ts` - ComponentHandle 定义
- `packages/flux-runtime/src/component-handle-registry.ts` - ComponentHandleRegistry 实现
- `packages/flux-runtime/src/schema-compiler.ts` - SchemaCompiler 实现
- `packages/flux-react/src/node-renderer.tsx` - NodeRenderer 实现
- `packages/flux-react/src/node-instance.ts` - createCompatibilityNodeInstance
- `packages/flux-runtime/src/node-resolver.ts` - RuntimeNodeResolver
- `packages/nop-debugger/src/controller.ts` - debugger controller
- `docs/architecture/template-instantiation-and-node-identity.md` - 更新架构文档
- `docs/architecture/renderer-runtime.md` - 更新渲染层文档

### Out Of Scope

- 重写 validation architecture
- 新增 virtualization renderer
- flow-designer/report-designer 的特有协议变化
- debugger UI 增强（只维护 inspect substrate）

## Execution Plan

### Phase 1 - 简化 NodeLocator 和 ComponentHandle

Status: planned
Targets: `packages/flux-core/src/types/node-identity.ts`, `packages/flux-core/src/types/renderer-component.ts`

- [ ] 简化 NodeLocator，移除 runtimeId 和 templateGraphId
  ```typescript
  interface NodeLocator {
    templateNodeId: number;
    instancePath?: readonly InstanceFrame[];
  }
  ```

- [ ] 简化 ComponentHandle，只保留最小必要字段
  ```typescript
  interface ComponentHandle {
    _cid: number;
    _templateNodeId: number;
    _instancePathRef?: string;  // 引用共享的 instancePath
    // 移除 _locator, _runtimeId, _templateId
  }
  ```

- [ ] 添加 instancePathCache 共享机制
  ```typescript
  const instancePathCache = new Map<string, readonly InstanceFrame[]>();
  ```

- [ ] 更新 ComponentHandleRegistry，简化 resolveHandle 和 getHandleLocator

- [ ] 更新 RuntimeNodeResolver，移除 runtimeId 依赖

- [ ] 更新 debugger controller，移除 runtimeId 使用

Exit Criteria:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test -- --run packages/flux-runtime` passes
- [ ] `pnpm test -- --run packages/nop-debugger` passes

---

### Phase 2 - 更新 SchemaCompiler 产出 TemplateNode

Status: planned
Targets: `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-core/src/types/renderer-compiler.ts`

- [ ] 重构 SchemaCompiler.compile() 返回类型
  ```typescript
  interface CompiledTemplate {
    templateGraphId: string;
    root: TemplateNode | readonly TemplateNode[];
    repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate>;
  }
  ```

- [ ] 实现 TemplateNode 生成逻辑
  ```typescript
  function buildTemplateNode(
    compiled: CompiledSchemaNode,
    templateGraphId: string,
    templateNodeId: number
  ): TemplateNode {
    return {
      templateNodeId,
      templatePath: compiled.path,
      id: compiled.id,
      type: compiled.type,
      schema: compiled.schema,
      rendererType: compiled.type,
      propsProgram: compiled.props,
      metaProgram: compiled.meta as CompiledRuntimeValue<Record<string, unknown>>,
      eventPlans: compiled.eventActions,
      regions: convertRegions(compiled.regions),
      scopePlan: { kind: 'inherit' },
      validationPlan: compiled.validation
    };
  }
  ```

- [ ] 移除 CompiledSchemaNode.createRuntimeState()
  - 这个方法应该在 runtime 创建 NodeInstance 时调用，而不是在 compiled node 上

- [ ] 更新 SchemaCompiler 类型定义
  ```typescript
  interface SchemaCompiler {
    compile(schema: SchemaInput): CompiledTemplate;  // 改为返回 CompiledTemplate
    compileNode(schema: BaseSchema, options: CompileNodeOptions): CompiledSchemaNode;  // 内部使用
  }
  ```

- [ ] 更新 RendererRuntime.compile() 返回类型

Exit Criteria:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test -- --run packages/flux-runtime` passes

---

### Phase 3 - 重构 NodeRenderer 直接使用 TemplateNode

Status: planned
Targets: `packages/flux-react/src/node-renderer.tsx`

- [ ] 修改 NodeRenderer props
  ```typescript
  export const NodeRenderer = memo(function NodeRenderer(props: {
    templateNode: TemplateNode;  // 替代 CompiledSchemaNode
    scope: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
  })
  ```

- [ ] 移除 createCompatibilityNodeInstance 调用
  - 不再需要从 CompiledSchemaNode 转换
  - 直接从 TemplateNode 创建 NodeInstance

- [ ] 实现 NodeInstance 创建逻辑
  ```typescript
  const nodeInstance = useMemo(
    () => ({
      cid: finalResolvedMeta.cid,
      locator: {
        templateNodeId: templateNode.templateNodeId,
        instancePath
      },
      templateNode,
      scope: renderScope,
      state: {
        metaState: importNodeState.meta,
        propsState: importNodeState.props,
        mounted: true
      }
    }),
    [templateNode, instancePath, renderScope, importNodeState, finalResolvedMeta.cid]
  );
  ```

- [ ] 更新 ComponentProps 生成逻辑
  - templateNode.id 替代 node.id
  - templateNode.templatePath 替代 node.path

- [ ] 移除对 node.component 的直接访问
  - 改用 runtime.registry.getRenderer()

Exit Criteria:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] playground 功能正常（测试 basic page, form, dialog, drawer）

---

### Phase 4 - 移除 CompiledSchemaNode 的运行时使用

Status: planned
Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-react/src/node-instance.ts`

- [ ] 标记 CompiledSchemaNode 为 compile-time only
  ```typescript
  /**
   * @internal Compile-time node structure with React integration details.
   * Use TemplateNode at runtime.
   */
  export interface CompiledSchemaNode<S extends BaseSchema = BaseSchema> {
    // ... existing fields
  }
  ```

- [ ] 删除 createCompatibilityNodeInstance 函数
  - 不再需要兼容层

- [ ] 删除 node-instance.ts 文件
  - 如果没有其他导出

- [ ] 清理 ActionContext 等类型中的 ownerNode 引用
  - 改用 ownerTemplateNode 或 ownerNodeInstance

Exit Criteria:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] 所有测试通过

---

### Phase 5 - 文档更新和验证

Status: planned
Targets: `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/renderer-runtime.md`

- [ ] 更新 template-instantiation-and-node-identity.md
  - 移除 runtimeId 的说明
  - 更新 NodeLocator 定义
  - 更新编译流程图

- [ ] 更新 renderer-runtime.md
  - 更新 NodeRenderer 说明
  - 移除 CompiledSchemaNode 的运行时引用

- [ ] 更新 Plan 40 的状态
  - 标记 completed 或 superseded
  - 引用本计划作为后续优化

- [ ] 更新 AGENTS.md 文档路由表
  - 如果需要

- [ ] 完整验证
  - playground: basic page, form, dialog, drawer, table
  - debugger: inspect, expression evaluation
  - tests: 所有 packages 测试通过

Exit Criteria:

- [ ] `pnpm typecheck && pnpm build && pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] playground 所有场景正常
- [ ] debugger 功能正常

---

## Validation Checklist

### Phase 1

- [ ] NodeLocator 只有 templateNodeId 和 instancePath
- [ ] ComponentHandle 只有 _cid, _templateNodeId, _instancePathRef
- [ ] ComponentHandleRegistry 通过 _cid 主定位
- [ ] RuntimeNodeResolver 移除 runtimeId 依赖
- [ ] debugger controller 移除 runtimeId 使用
- [ ] 内存占用测试：1000 节点页面减少 30-50%

### Phase 2

- [ ] SchemaCompiler.compile() 返回 CompiledTemplate
- [ ] CompiledTemplate.root 是 TemplateNode[]
- [ ] TemplateNode 包含所有必要字段（id, type, schema, propsProgram, metaProgram 等）
- [ ] CompiledSchemaNode.createRuntimeState() 已移除

### Phase 3

- [ ] NodeRenderer props 是 templateNode: TemplateNode
- [ ] NodeRenderer 不再调用 createCompatibilityNodeInstance
- [ ] NodeInstance 从 TemplateNode 直接创建
- [ ] ComponentProps 从 templateNode 生成

### Phase 4

- [ ] CompiledSchemaNode 标记为 @internal
- [ ] createCompatibilityNodeInstance 已删除
- [ ] node-instance.ts 文件已删除（如无其他导出）
- [ ] ActionContext 等 type 使用 ownerTemplateNode

### Phase 5

- [ ] 架构文档已更新
- [ ] Plan 40 状态已更新
- [ ] playground 所有场景正常
- [ ] debugger 功能正常
- [ ] 所有测试通过

---

## Risks

1. **兼容性风险**：如果用户代码直接访问 CompiledSchemaNode，会破坏
   - 缓解：保持一段时间 @deprecated 标记，给出迁移指南

2. **性能风险**：instancePathCache 的管理可能引入新的复杂性
   - 缓解：使用 WeakMap 或定期清理

3. **测试覆盖**：需要确保所有场景测试覆盖
   - 缓解：每个 Phase 都有独立的 Exit Criteria

4. **文档同步**：多个文档需要同步更新
   - 缓解：Phase 5 统一更新并验证

---

## Notes

- 本计划是对 Plan 40 的"deferred remainder"的具体化
- 遵循"编译期产 TemplateNode，运行时产 NodeInstance"的原则
- 保持 cid 作为主要定位方式，简化 identity 模型
- templatePath 保留在 TemplateNode（编译期确定）
