# 119 Action Precompile And Args Unification Plan

> Plan Status: in-progress (Phase 1 completed)
> Last Reviewed: 2026-04-20
> Source: `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-graph-authoring.md`, `docs/references/action-payload-matrix.md`, `docs/plans/38-action-api-source-convergence-migration-plan.md`, `docs/plans/46-user-management-schema-and-authoring-contract-alignment-plan.md`, `packages/flux-core/src/types/actions.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-runtime/src/action-runtime-handlers.ts`
> Related: `docs/plans/38-action-api-source-convergence-migration-plan.md`, `docs/plans/46-user-management-schema-and-authoring-contract-alignment-plan.md`

## Purpose

本计划用于把当前事件/生命周期中的 `ActionSchema` 从“节点编译时原样保留，首次执行时按需编译动态值”的模式，迁移到“编译期 lowering 为专用 action IR，运行时直接执行 compiled action”的模式，并同步评估、收口 built-in action 的 `action + args` authoring contract。

目标不是重写 `Action Algebra` 的 exported DSL，也不是把 Flux 变成新的 workflow engine，而是：

1. 兑现 `flux-design-principles.md` 中“编译期 action DAG 组装”的原则。
2. 在不破坏当前 progressive authoring surface 的前提下，把动作里的动态值从懒编译迁移到预编译。
3. 让 built-in action 尽量收敛到 `action + args`，同时明确哪些字段属于 targeting / control / compatibility，哪些 payload 不能被简单压扁成 `args`。

## Current Baseline

- `schema-compiler.ts` 在节点模板编译阶段对 `props` 和 `meta` 做了预编译，但对 `eventPlans` 仍然只是 `eventPlans[key] = value`，未对 `ActionSchema` 做专门 lowering。
- `action-runtime-core.ts` 当前通过 `getCompiledValue(payload, input.compileValue)` 和 `WeakMap` 在首次执行时懒编译 action payload。
- 当前懒编译至少覆盖两类路径：
  - `evaluateActionArgs(...)` 对 `args` 或顶层 payload map 的懒编译
  - built-in `ajax` / `submitForm` 对 `action.api` 的懒编译
- `shouldRunActionWhen(...)` 当前通过 `evaluateInActionContext(action.when, ...)` 直接求值，`when` 也不是节点模板编译阶段的专用 action IR 产物。
- `ActionSchema` 当前不是纯 `action + args`。在 `packages/flux-core/src/types/actions.ts` 里，除 `args` 外还保留了：
  - request carrier: `api`
  - surface carrier: `dialog`, `drawer`
  - write carriers: `dataPath`, `value`, `values`
  - targeting carriers: `_targetCid`, `_targetTemplateId`, `targetId`, `componentId`, `componentName`, `componentPath`, `formId`, `dialogId`
  - control-flow / execution control carriers: `when`, `parallel`, `then`, `onError`, `onSettled`, `control`, `timeout`, `retry`, `debounce`, `continueOnError`
- 当前 built-in action handler 的 payload 形态并不统一：
  - `showToast`, `navigate`, `component:<method>`, `namespace:method` 已接近 `action + args`
  - `ajax`, `submitForm` 仍使用 `api`
  - `openDialog` / `dialog` 使用 `dialog`
  - `openDrawer` / `drawer` 使用 `drawer`
  - `setValue` 使用 `componentPath`/`componentId` + `value`
  - `setValues` 使用 `values`
  - `refreshSource` 使用 `targetId` 等 targeting 字段而非 `args`
- `docs/architecture/action-algebra-formal-spec.md` 已明确 authoring surface 的 baseline 是 `{ action, args }` 逐步成长到 `when` / `then` / `onError` / `parallel`，并且强调 action graph 应由编译期从 schema 结构组装，而不是运行时发现。
- `docs/plans/38-action-api-source-convergence-migration-plan.md` 已经把“顶层 payload 风格迁移到 `args`”列为历史方向，但 live repo 仍未完全收口。

## Goals

- 为事件动作和生命周期动作引入专用 `CompiledActionProgram` / `CompiledActionNode`，在节点模板编译阶段完成 action lowering。
- 把 `when`、`args`、`api`、`then`、`onError`、`parallel` 等动态值从懒编译迁移到预编译。
- 删除或显著缩小 `action-runtime-core.ts` 中 `getCompiledValue(...)` 对普通 action payload 的运行时职责，使其不再承担 action 主路径编译。
- 明确 built-in action 的 payload contract 分类：
  - 能统一进 `args` 的
  - 必须保留为 targeting/control 字段的
  - 需要 compatibility 迁移层的
- 推动 `ajax` 收敛到 `action: 'ajax' + args: ApiSchema` 的 authoring contract。
- 输出一个 live-repo 可执行的迁移顺序，而不是只给抽象结论。

## Non-Goals

- 不在本计划中重开 `ActionSchema` 的 exported DSL 大类，不引入新的 graph container language。
- 不在本计划中移除 `then: ActionSchema[]` / `onError: ActionSchema[]` 这种 ordered sequence shorthand。
- 不在本计划中一并重写 `SourceSchema` / `DataSourceSchema` 全部 authoring contract，只处理与 action 预编译和 payload 统一直接相关的部分。
- 不在本计划中强行把所有 targeting/control 字段都塞进 `args`。
- 不在本计划中把 component targeting 改成新的 selector 语法；`component:<method>` 仍保留现有 targeting family。

## Scope

### In Scope

- `packages/flux-core/src/types/actions.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-runtime/src/action-runtime-handlers.ts`
- 需要时新增 focused module，例如：
  - `packages/flux-runtime/src/action-compiler.ts`
  - `packages/flux-runtime/src/compiled-action-types.ts`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/references/flux-json-conventions.md`
- 相关测试与 representative examples

### Out Of Scope

- `ActionScope` / `xui:imports` 命名空间系统的整体重设计
- `SourceSchema` / `DataSourceSchema` 的完整值消费收敛
- visual action designer 的 authoring IR 设计
- host projection / domain bridge / `RendererEnv` 边界调整

## Design Position

### 1. 为什么要做 action 预编译

根据 `docs/architecture/flux-design-principles.md`：

1. action DAG 应在编译期从 schema 结构组装。
2. 能在结构变换层解决的问题，不应拖进运行时表面。

因此当前 action payload 懒编译虽然工程上可行，但已经落后于 Flux 自己的原则目标。预编译带来的直接收益包括：

1. action 表达式语法错误在 compile time 暴露，而不是首次触发时暴露。
2. runtime 不再反复处理 action payload 的 shape 判定与 `WeakMap` 编译缓存。
3. `when` / `args` / `api` / branch payload 的依赖和诊断更容易统一。
4. action graph 的 compiled form 更接近 formal spec 里的 compiler-assembled DAG。

### 2. `action + args` 能统一到什么程度

基于 live repo，当前 built-in action 可分为三类：

1. 已接近 `action + args`
   - `showToast`
   - `navigate`
   - `component:<method>`
   - `namespace:method`

2. payload 可以原则上迁移到 `args`，但需要 compatibility 迁移
   - `ajax`: `api` -> `args: ApiSchema`
   - `submitForm`: `api` -> `args: ApiSchema | submit options DTO`
   - `openDialog`: `dialog` -> `args: DialogOpenArgs`
   - `openDrawer`: `drawer` -> `args: DrawerOpenArgs`
   - `refreshSource`: target payload 可以改为 `args: { targetId }`，但 targeting family 需先决定是否 author-visible 保留独立字段

3. 不适合简单压平为通用 map payload，或至少不能只靠“args 是 map”就自然完成
   - `setValue`: 它同时包含目标路径语义和单值写入语义，`value` 不是 map；若强推 `args`，需要额外定义 `{ path, value }` DTO，并处理当前 `componentPath` / `componentId` / form targeting 的现有分流
   - `setValues`: 虽然可改成 `args: Record<string, SchemaValue>`，但这会让 `args` 同时承担“payload map”与“path->value patch map”两种不同语义，需先明确 contract
   - `closeDialog` / `closeDrawer`: 当前几乎是无 payload + optional targeting；把它们也塞进 `args` 收益很小

结论：

1. 不是所有 built-in action 都应机械统一成只有 `action + args`。
2. 更合理的目标是：author-visible payload 尽量统一为 `args`；targeting 和 control-flow 保持独立字段族。
3. `setValue` 是最明显的困难点，但不是唯一需要 contract 澄清的点；`setValues` 和 `refreshSource` 也需要显式决策。

## Execution Plan

### Phase 1 - Baseline Audit And Contract Freeze

Status: completed
Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-runtime/src/action-runtime-handlers.ts`, `docs/architecture/action-algebra-formal-spec.md`, `docs/references/flux-json-conventions.md`

- [x] 盘点所有 built-in action、component action、namespace action 当前读取的 payload/targeting/control 字段
- [x] 输出 built-in action payload matrix，标记哪些是 `args-ready`、哪些是 `args-migratable`、哪些需要保留专用字段
- [x] 冻结 `action + args` 的目标 authoring contract，明确 `args` 只承载 payload，不吞并 control-flow 字段
- [x] 明确 `ajax` 是否规范收敛为 `action: 'ajax' + args: ApiSchema` → **YES**
- [x] 明确 `submitForm` 是否与 `ajax` 同样收敛为 `args: ApiSchema`，还是保留语义型 submit options wrapper → **YES, 跟随 ajax**

Exit Criteria:

- [x] `docs/references/action-payload-matrix.md` 已能回答"现在还有几个不满足 action+args 的动作"
- [x] 文档明确说明 targeting/control 字段与 payload 字段的边界

### Phase 2 - Compiled Action IR Design

Status: planned
Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-runtime/src/action-compiler.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `docs/architecture/action-algebra-formal-spec.md`

- [ ] 定义 `CompiledActionProgram`、`CompiledActionNode`、`CompiledActionPayload` 等专用类型
- [ ] 定义 action compiler 如何递归 lowering：`when`、`args`、`api`、`then`、`onError`、`parallel`、`onSettled`
- [ ] 明确 compiled action 中 targeting/control 字段保留原始结构，动态 payload/value 则变成 compiled value nodes
- [ ] 定义 built-in action payload contract 在 compiled form 中的统一表示
- [ ] 明确 legacy top-level payload fallback 在 compiled action 中的去留策略

Exit Criteria:

- [ ] compiled action IR 可以表达当前 formal spec 的 main branch model
- [ ] IR 设计不重开 primitive closure，也不改变 exported DSL authoring baseline

### Phase 3 - Schema Compiler Integration

Status: planned
Targets: `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/action-compiler.ts`, `packages/flux-runtime/src/types/*`

- [ ] 在节点编译阶段将 `eventPlans[key] = value` 迁移为 action-specific compile path
- [ ] 对 lifecycle actions 同样接入 compiled action pipeline
- [ ] 保留 schema sourceLoc / debug anchor，确保 action diagnostics 能反查节点路径
- [ ] 为 action compile failure 增加 compile-time diagnostics

Exit Criteria:

- [ ] `TemplateNode.eventPlans` 不再只存原始 `ActionSchema`
- [ ] 非法 action expression 在 compile time 报出，而不是首次执行时报出

### Phase 4 - Runtime Executor Migration

Status: planned
Targets: `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-runtime/src/action-runtime-handlers.ts`

- [ ] 让 executor 直接执行 compiled action node，而不是在主路径上解释原始 `ActionSchema`
- [ ] 删除或收缩 `getCompiledValue(...)` 在 action 主路径上的职责
- [ ] 让 `when`、`args`、`api`、branch payload 的求值全部走 compiled action IR
- [ ] 保留 `ActionResult`、monitor payload、retry/timeout/debounce/parallel 的既有语义
- [ ] 明确 plugin hook 是接 raw action 还是 compiled action，必要时设计 narrow compatibility bridge

Exit Criteria:

- [ ] action 主执行链不再依赖运行时首次 payload 编译
- [ ] existing action semantics tests 在 compiled executor 下继续通过

### Phase 5 - Args Unification Migration

Status: planned
Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-runtime/src/action-runtime-handlers.ts`, `docs/references/flux-json-conventions.md`, `docs/examples/*`

- [ ] 将 `ajax` 的推荐 authoring contract 迁移为 `args: ApiSchema`
- [ ] 评估并决定 `submitForm` 是否跟随 `ajax` 统一到 `args`
- [ ] 将 `openDialog` / `openDrawer` 的推荐 payload contract 迁移为 `args`
- [ ] 为 `setValue` / `setValues` 制定明确策略：
  - 方案 A: 保留 `value` / `values` 作为 narrower built-in carriers
  - 方案 B: 迁移为 `args` DTO，但文档清楚标明其 patch semantics
- [ ] 为 legacy `api` / `dialog` / `drawer` / top-level payload 写兼容与退役策略

Exit Criteria:

- [ ] `ajax` 的推荐写法已收敛到 `action + args`
- [ ] 文档能清楚回答“哪些 built-in action 仍然不是纯 `action + args`，为什么”

### Phase 6 - Enhanced ActionMonitor (Effect Observability)

Status: planned
Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-core/src/types/renderer-api.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/action-trace.ts`

本 phase 增强 ActionMonitor 以获得类似 Effect 代数的可观测性收益，而无需引入全新的 Effect 中间层。

#### 6.1 ActionTrace 树结构

定义 `ActionTrace` 用于记录完整的 action 执行树（包括 then/parallel/onError 分支）：

```typescript
interface ActionTrace {
  /** Unique trace ID */
  traceId: string;
  
  /** Parent trace ID (for nested actions) */
  parentTraceId?: string;
  
  /** Interaction ID (groups related actions from same user interaction) */
  interactionId: string;
  
  /** Action identifier */
  action: string;
  
  /** Resolved args (evaluated values, not raw expressions) */
  resolvedArgs?: Record<string, unknown>;
  
  /** Dispatch mode */
  dispatchMode: 'built-in' | 'component' | 'namespace';
  
  /** Namespace and method (for namespaced actions) */
  namespace?: string;
  method?: string;
  
  /** Targeting info */
  targetId?: string;
  componentId?: string;
  
  /** Timing */
  startTime: number;
  endTime?: number;
  durationMs?: number;
  
  /** Result */
  result?: ActionResult;
  
  /** Branch type (how this action was reached) */
  branchType?: 'root' | 'then' | 'onError' | 'onSettled' | 'parallel';
  
  /** Child traces (for then/parallel/onError branches) */
  children: ActionTrace[];
  
  /** Source location for debugging */
  nodeId?: string;
  templatePath?: string;
}
```

#### 6.2 ActionTraceCollector

定义 `ActionTraceCollector` 用于收集和管理 trace：

```typescript
interface ActionTraceCollector {
  /** Start a new trace, returns trace context */
  startTrace(payload: ActionMonitorPayload, resolvedArgs?: Record<string, unknown>): ActionTraceContext;
  
  /** End a trace with result */
  endTrace(ctx: ActionTraceContext, result: ActionResult): void;
  
  /** Get all traces for an interaction */
  getInteractionTraces(interactionId: string): ActionTrace[];
  
  /** Get trace tree (root traces with children) */
  getTraceTree(interactionId: string): ActionTrace[];
  
  /** Clear traces older than given timestamp */
  clearBefore(timestamp: number): void;
  
  /** Export traces for debugging/replay */
  exportTraces(filter?: TraceFilter): ActionTrace[];
  
  /** Subscribe to trace events */
  subscribe(listener: TraceListener): () => void;
}

interface ActionTraceContext {
  traceId: string;
  interactionId: string;
  parentTraceId?: string;
  branchType?: ActionTrace['branchType'];
}

interface TraceListener {
  onTraceStart?(trace: ActionTrace): void;
  onTraceEnd?(trace: ActionTrace): void;
}

interface TraceFilter {
  interactionId?: string;
  action?: string;
  since?: number;
  limit?: number;
}
```

#### 6.3 Enhanced RendererMonitor

扩展 `RendererMonitor` 接口：

```typescript
interface RendererMonitor {
  // Existing
  onActionStart?(payload: ActionMonitorPayload): void;
  onActionEnd?(payload: ActionMonitorPayload & { durationMs: number; result?: ActionResult }): void;
  
  // Enhanced: receives resolved args and trace context
  onActionTraceStart?(trace: ActionTrace): void;
  onActionTraceEnd?(trace: ActionTrace): void;
  
  // Enhanced: receives complete interaction trace tree
  onInteractionComplete?(traces: ActionTrace[]): void;
}
```

#### 6.4 Runtime Integration

- [ ] 在 `action-runtime.ts` 中集成 `ActionTraceCollector`
- [ ] 在 action dispatch 入口创建 trace context
- [ ] 在 `then`/`onError`/`onSettled`/`parallel` 分支中传递 parent trace context
- [ ] 在 action 执行前记录 `resolvedArgs`（求值后的参数）
- [ ] 在 action 执行后更新 trace result 和 timing
- [ ] 为 `interactionId` 相同的 action 链构建完整 trace tree

#### 6.5 DevTools Integration

- [ ] 提供 `getActionTraceCollector()` API 供 DevTools 使用
- [ ] 支持 trace tree 可视化（action 执行树）
- [ ] 支持检查每步的 `resolvedArgs`（解析后的参数值）
- [ ] 支持按 `interactionId` 过滤和分组
- [ ] 支持导出 trace 用于问题诊断

#### 6.6 Tasks

- [ ] 定义 `ActionTrace`、`ActionTraceCollector`、`ActionTraceContext` 类型
- [ ] 实现 `createActionTraceCollector()` 工厂函数
- [ ] 在 `action-runtime.ts` 中集成 trace 收集
- [ ] 在 `evaluateActionArgs` 后记录 `resolvedArgs`
- [ ] 为 branch dispatch 传递 `branchType` 和 `parentTraceId`
- [ ] 扩展 `RendererMonitor` 接口
- [ ] 为 `nop-debugger` 提供 trace tree 查询 API
- [ ] 添加 trace 相关 tests

Exit Criteria:

- [ ] 每次 action dispatch 产出完整的 `ActionTrace`，包括 `resolvedArgs`
- [ ] `then`/`onError`/`parallel` 分支正确关联为 trace tree
- [ ] DevTools 可以查询和展示 action trace tree
- [ ] trace 收集对正常执行性能影响可忽略（< 1% overhead）

### Phase 7 - Validation And Closure Prep

Status: planned
Targets: `packages/flux-runtime/src/__tests__/*`, `docs/architecture/action-algebra-formal-spec.md`, `docs/references/flux-json-conventions.md`, `docs/logs/`

- [ ] 为 compile-time action diagnostics 增加 focused tests
- [ ] 为 compiled action executor 增加 branch / retry / timeout / onSettled / parallel regression tests
- [ ] 为 `ajax args`、legacy `api` compatibility、`setValue` / `setValues` contract 决策增加 tests
- [ ] 为 ActionTrace 收集和 tree 构建增加 focused tests
- [ ] 更新 docs/examples 中的 representative action schema
- [ ] 记录 closure-audit 所需的 live repo evidence

Exit Criteria:

- [ ] docs、types、runtime、tests 对 action precompile 和 payload contract 的说法一致
- [ ] closure audit 可以基于 live repo 回答"action 是否已经预编译"和"args 是否已按计划收敛"
- [ ] ActionTrace 功能已集成并有测试覆盖

## Validation Checklist

- [ ] 节点模板编译阶段已为事件动作和生命周期动作产出 compiled action IR
- [ ] `when` / `args` / `api` / `then` / `onError` / `parallel` 的动态值不再依赖首次执行时懒编译
- [ ] `ajax` 的推荐 authoring contract 已迁移为 `action + args`
- [ ] `docs/references/action-payload-matrix.md` 已更新，并明确哪些动作不应机械统一
- [ ] `docs/architecture/action-algebra-formal-spec.md` 与 live runtime 实现一致
- [ ] `docs/references/flux-json-conventions.md` 已更新
- [ ] ActionTrace 树结构可以完整记录 action 执行链
- [ ] DevTools 可以查询和展示 action trace tree
- [ ] focused verification 已完成
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: pending

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- 若 `setValue` / `setValues` 的 `args` 统一结论仍 unresolved，则拆出 successor plan 专门处理 write-action payload contract
- 若 `SourceSchema` / `DataSourceSchema` 也需要同步切到 compiled action IR，则归入 successor convergence plan，而不是隐含留在本计划内
- 若需要 ActionTrace replay 能力（重放 action 序列），则拆出 successor plan 专门设计 replay mechanism
