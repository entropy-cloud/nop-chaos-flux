# 下一代低代码核心框架内核接口设计（实验稿）

> 文档定位：基于 `docs/low-code-dsl-runtime-requirements.md` 单独推导出的实验性设计。
>
> 约束：本设计阶段不参考当前项目代码和其他架构文档，只以需求规格为输入。
>
> 目标：定义一个可编译、可嵌入、可扩展、可诊断、可高性能实例化的低代码 DSL 运行时内核接口与核心组织方式。

## 1. 设计结论

我认为最先进的下一代低代码运行时，不应再把系统理解成“渲染器 + Store + 一堆 helper”。

它应该被设计为一个 **Schema Virtual Machine（SVM）**：

1. 编译期把 schema 降解为不可变的执行模板。
2. 运行期把模板实例化为一组彼此正交的 runtime owner。
3. 所有动态行为统一落在一套“依赖可追踪的读模型 + 能力派发的写模型”上。
4. UI 渲染只是该虚拟机的一种投影，而不是核心本体。

这个内核的关键不是“能不能渲染页面”，而是是否同时满足：

1. 编译一次，多次实例化。
2. 静态零开销。
3. 依赖精确失效。
4. 作用域可隔离但仍可组合。
5. 值、数据源、reaction、校验、动作共享同一语义底座。
6. 宿主能力通过显式桥接接入，而不是侵入核心。

## 2. 总体模型

整个系统分成六层。

1. Authoring Input Layer
2. Compile Layer
3. Runtime Template Layer
4. Instance Kernel Layer
5. Projection Layer
6. Host Bridge Layer

核心原则：

1. 编译态负责“结构理解、静态归类、约束固化、索引生成”。
2. 执行态负责“最小实例状态、最小重新计算、最小副作用暴露”。
3. 所有“读”都先过 `ScopeRuntime`。
4. 所有“写”和可见副作用都先过 `CapabilityDispatcher`。
5. 所有动态计算都必须留下依赖足迹，进入统一失效系统。

## 3. 核心对象图

```text
SchemaDocument
  -> Compiler
    -> CompiledProgram
      -> TemplateRegistry
      -> ExpressionRegistry
      -> ActionPlanRegistry
      -> ValidationRegistry
      -> DiagnosticSet

CompiledProgram + HostServices
  -> RuntimeKernel
    -> Immutable Registries / Stable Host Bridge
    -> mount()
      -> RuntimeSession
        -> ScopeForest
        -> DependencyGraph
        -> ValueEngine
        -> DataSourceEngine
        -> ReactionEngine
        -> ActionEngine
        -> ValidationEngine
        -> SurfaceEngine
        -> ComponentRegistry
        -> InstanceIndex
```

设计重点不是把所有逻辑塞进一个 runtime，而是让每个 owner 只拥有一类状态。

### 3.1 三层状态归属

这是整个内核最重要的收敛点。

1. `CompiledProgram`：纯编译产物，只读，可缓存，可跨会话复用。
2. `RuntimeKernel`：program 级只读资源加稳定宿主桥，不保存任何会话可变状态。
3. `RuntimeSession`：一次挂载的全部可变运行时 owner，所有 scope、依赖、数据源、表单、surface、实例索引都只存在于 session 内。

因此：

1. 一个 `CompiledProgram` 可以创建多个 `RuntimeKernel`。
2. 一个 `RuntimeKernel` 可以挂多个 `RuntimeSession`。
3. 任意 session 之间绝不共享 scope、依赖图、实例状态或异步任务。

## 4. 编译期设计

### 4.1 编译产物

编译器输出 `CompiledProgram`，它是运行时唯一接受的 schema 输入。

```ts
export interface CompiledProgram {
  programId: string;
  version: string;
  rootTemplateId: TemplateId;
  templates: TemplateRegistry;
  expressions: ExpressionRegistry;
  actions: ActionPlanRegistry;
  validations: ValidationRegistry;
  components: ComponentBindingTable;
  symbols: SymbolTable;
  diagnostics: DiagnosticMessage[];
  debug: DebugArtifacts;
}
```

编译器必须完成：

1. 节点类型解析。
2. 字段归类。
3. region 提取。
4. 表达式解析与 AST 编译。
5. 动作树归一化为 action plan。
6. 校验规则归一化为 validation graph。
7. 节点身份、模板身份、region 身份、slot 参数身份生成。
8. 调试索引和源码位置信息生成。

### 4.2 字段归类模型

schema 字段不能在运行时再“猜类型”。编译期必须把每个字段降解到明确的值槽类型。

```ts
export type CompiledFieldKind =
  | 'static'
  | 'expr'
  | 'template-string'
  | 'region'
  | 'region-list'
  | 'action'
  | 'data-source'
  | 'validation'
  | 'meta';

export interface CompiledFieldSlot {
  field: string;
  kind: CompiledFieldKind;
  payload: unknown;
  stable: boolean;
}
```

这里的 `stable` 很关键：

1. `stable: true` 表示该槽运行时可直接复用编译值。
2. `stable: false` 表示该槽需要进入动态求值流程。

这就是“静态零开销”的真正落点。

### 4.3 模板与实例分离

所有节点在编译后都变成模板节点，而不是运行时节点。

```ts
export interface CompiledTemplateNode {
  templateNodeId: TemplateNodeId;
  type: string;
  propsSlots: CompiledFieldSlot[];
  metaSlots: CompiledFieldSlot[];
  regionSlots: CompiledRegionSlot[];
  eventSlots: CompiledEventSlot[];
  localDefinitions: CompiledLocalDefinition[];
  lifecycle: CompiledLifecycleHooks;
  debug: DebugNodeInfo;
}
```

模板节点是不可变的。运行期不会修改它，只会围绕它创建实例状态。

### 4.4 身份体系

下一代内核必须把身份体系定义清楚，否则调试、重复结构、组件实例动作、增量渲染都会失真。

```ts
export type TemplateId = string;
export type TemplateNodeId = string;
export type InstanceId = string;
export type RuntimeNodeId = string;
export type ScopeId = string;
```

它们的职责严格区分：

1. `TemplateId`：一棵编译模板的身份。
2. `TemplateNodeId`：模板内静态节点身份，跨会话稳定。
3. `InstanceId`：某模板在某 session 内的一次实例化身份。
4. `RuntimeNodeId`：`InstanceId + TemplateNodeId + local repetition key` 组成的稳定运行时节点身份。
5. `ScopeId`：一次作用域 owner 的身份，不等同于节点身份。

映射规则：

1. 一个 `TemplateNodeId` 在不同 session 下会映射到多个 `RuntimeNodeId`。
2. 同一个重复模板节点，在同一 session 内不同 item 也会映射到多个 `RuntimeNodeId`。
3. `component:` 动作解析依赖 `RuntimeNodeId -> ComponentInstanceHandle` 索引，而不是依赖 UI 框架 ref 泄漏。

### 4.5 编译产物到执行器映射

编译产物必须有唯一消费方，不允许“只是看起来完整”。

1. `templates` 由 `InstanceIndex` 和 `ProjectionEngine` 消费。
2. `expressions` 由 `ValueEngine`、`ActionEngine`、`ValidationEngine`、`DataSourceEngine`、`ReactionEngine` 共享消费。
3. `actions` 仅由 `ActionEngine` 消费。
4. `validations` 仅由 `ValidationEngine` 消费。
5. `components` 由 `ProjectionEngine` 做类型绑定，由 `ComponentRegistry` 做实例方法注册。
6. `symbols` 只用于编译期诊断、调试和类型校验，不进入热路径。
7. `debug` 只由 `RuntimeInspector` 和开发工具消费。

凡是找不到唯一消费方的编译字段，都不应进入正式规格。

## 5. 运行时核心接口

### 5.1 内核入口

```ts
export interface RuntimeKernel {
  readonly program: CompiledProgram;
  readonly host: StableHostBridge;
  readonly catalogs: RuntimeCatalogs;

  mount(input: MountInput): RuntimeHandle;
  inspector(sessionId: string): RuntimeInspector | undefined;
  inspect(): KernelSnapshot;
  dispose(): void;
}
```

`RuntimeKernel` 只做两件事：

1. 持有全局不可变资源。
2. 生成一次具体运行会话 `RuntimeSession`。

### 5.2 运行会话

```ts
export interface RuntimeHandle {
  readonly sessionId: string;
  readonly rootScopeId: ScopeId;
  readonly rootInstanceId: InstanceId;

  renderRoot(): RenderFragmentHandle;
  dispatch(input: DispatchInput): Promise<ActionOutcome>;
  commit(request: CommitRequest): Promise<CommitResult>;
  validate(request?: ValidationRequest): Promise<ValidationResult>;
  inspectNode(nodeId: RuntimeNodeId): RuntimeNodeSnapshot | undefined;
  inspectScope(scopeId: ScopeId): ScopeSnapshot | undefined;
  dispose(): void;
}
```

`RuntimeKernel.mount()` 对外返回的应该是 `RuntimeHandle`，而不是内部 owner 图。

```ts
export interface RuntimeSession {
  readonly handle: RuntimeHandle;
  readonly scopes: ScopeForest;
  readonly deps: DependencyGraph;
  readonly values: ValueEngine;
  readonly actions: ActionEngine;
  readonly dataSources: DataSourceEngine;
  readonly reactions: ReactionEngine;
  readonly validations: ValidationEngine;
  readonly surfaces: SurfaceEngine;
  readonly instances: InstanceIndex;
  readonly projector: ProjectionEngine;
  dispose(): void;
}
```

这两个接口必须严格区分：

1. `RuntimeHandle`：宿主、测试、调试工具可见的最小公开面。
2. `RuntimeSession`：内核内部 owner 组合体，不承诺给普通业务代码直接访问。
3. `RuntimeKernel.inspector(sessionId)`：调试器进入正式检查 API 的唯一入口。

会话是可销毁的，便于嵌入式场景和测试场景。

这里的 `commit()` 不是绕过动作系统的后门，而是唯一公开写入口。它只是把宿主写入、测试写入、调试写入也标准化成统一事务协议。

```ts
export interface CommitRequest {
  kind: 'host-patch' | 'host-set' | 'system-write';
  targetScopeId: ScopeId;
  path?: ValuePath;
  value?: unknown;
  patch?: StructuralPatch;
  source: WriteSource;
}
```

普通 schema 侧可见副作用仍然只能通过 `dispatch()` 进入能力派发通道。

更强的硬约束是：

1. `dispatch()` 本身不允许直接修改任何内核状态。
2. 任意 builtin/component/namespace capability 若要修改 scope、surface、form、validation 或实例状态，必须返回一个或多个 `CommitRequest` 或 `CommitIntent`。
3. `ActionEngine` 负责把这些 intent 归并进 session `commit()` 事务。
4. 因此系统内部永远不存在“能力内部直写 scope”的第二条路径。

```ts
export interface CommitIntent {
  target: 'scope' | 'surface' | 'form' | 'validation-meta' | 'instance-meta';
  payload: unknown;
}
```

因此本文后续出现的 `FormRuntime`、`SurfaceEngine`、`DataSourceRuntime`、`ReactionRuntime` 等接口，一律视为 **session 内部 owner 合同**，不是宿主公开 API。

## 6. 作用域系统

### 6.1 作用域必须是森林，不是单链上下文

传统低代码运行时喜欢把 scope 做成“父子对象 + merge 读取”。这会导致：

1. 依赖难以精确归属。
2. 行级隔离难以实现。
3. 局部刷新边界模糊。
4. 写入路径不知道该落到哪个 owner。

更好的做法是把作用域设计成 **Owner Forest + Read Projection**。

```ts
export interface ReadableScope {
  id: ScopeId;
  parentId?: ScopeId;
  mode: 'inherited' | 'isolated' | 'projected';
  owner: ScopeOwnerKind;

  has(path: ValuePath): boolean;
  resolve(path: ValuePath): unknown;

  project(input: ScopeProjectionInput): ScopeId;
  fork(input: ScopeForkInput): ScopeId;
  subscribe(sub: ScopeSubscription): Unsubscribe;
  snapshot(): ScopeSnapshot;
}

export interface WritableScopeStore extends ReadableScope {
  write(path: ValuePath, value: unknown, options?: ScopeWriteOptions): WriteResult;
  patch(patch: StructuralPatch, options?: ScopeWriteOptions): WriteResult;
}
```

### 6.2 三类作用域

1. `inherited`: 默认词法继承，可遮蔽父级。
2. `isolated`: 不读取父级，仅显式投影外部值。
3. `projected`: 自身不拥有完整状态，只是多个来源的只读投影视图。

第三类 `projected` 很重要。它使复杂域控件的只读快照、slot 参数、结果上下文都能作为一等作用域对象存在，而不是散落成临时变量。

关键约束：

1. `projected` scope 只实现 `ReadableScope`，不允许直接写入。
2. 只有 session 内部 owner 持有 `WritableScopeStore`。
3. 外部宿主、动作系统、表单系统的所有写入最终都走 `commit()` 事务入口，再由 session 内部路由到具体 `WritableScopeStore`。

### 6.3 路径变更通知

```ts
export interface ScopeChange {
  scopeId: ScopeId;
  writes: Array<{
    path: ValuePath;
    kind: 'set' | 'delete' | 'patch';
    value?: unknown;
  }>;
  source: WriteSource;
  revision: number;
}
```

变更通知必须是路径级的，因为依赖失效就是按路径匹配，而不是按 scope 整体匹配。

## 7. 统一依赖系统

### 7.1 一个图，三类消费者

需求已经规定三类消费者共享同一依赖模型。我认为应该把它设计成统一的 `DependencyGraph`。

```ts
export type DepConsumerKind = 'computed-value' | 'data-source' | 'reaction' | 'validation';

export interface DependencyGraph {
  beginCollection(consumer: DepConsumerToken): void;
  recordRead(read: DependencyRead): void;
  endCollection(): DependencySet;
  invalidate(change: ScopeChange): InvalidationBatch;
  inspect(consumerId: string): DependencySet | undefined;
}
```

校验也应进入同一个依赖图。原因很简单：条件校验本质上也是“读一些值后产出结果”的计算单元。

### 7.1.1 异步一致性

统一依赖图如果不配套版本语义，就只能正确处理同步计算，无法处理现代低代码最关键的数据源、reaction、异步校验。

因此每个可异步消费者必须绑定以下协议：

```ts
export interface EvaluationEpoch {
  consumerId: string;
  epoch: number;
  cause: 'mount' | 'invalidate' | 'manual-refresh' | 'retry' | 'resume';
}

export interface AsyncConsumerRuntime {
  currentEpoch(): EvaluationEpoch;
  beginEpoch(cause: EvaluationEpoch['cause']): EvaluationEpoch;
  commitEpoch(epoch: EvaluationEpoch, result: unknown): boolean;
  cancelEpoch(epoch: EvaluationEpoch): void;
}

export interface ReadView {
  scopeId: ScopeId;
  revision: number;
  resolve(path: ValuePath): unknown;
  has(path: ValuePath): boolean;
}
```

规则：

1. 每次重新调度都创建新 epoch。
2. 旧 epoch 完成时如果不是当前 epoch，结果直接丢弃。
3. 默认策略是 `take-latest`。
4. `dispose()`、scope 卸载、surface 关闭都会取消关联 epoch。
5. 依赖收集只记录单个 epoch 内真实读取的路径。
6. 每个异步 epoch 在开始时都固定绑定一个 `ReadView`，整个异步前置求值阶段只能读取这个快照。
7. `ReadView` 只用于求参与条件判定，不直接承载写入。

因此数据源、reaction、异步校验的安全执行流程必须是：

1. `beginEpoch()`。
2. 基于当前 revision 创建 `ReadView`。
3. 在这个 `ReadView` 上完成参数组装、条件表达式和依赖收集。
4. 发起异步工作。
5. 返回后仅通过 `commitEpoch()` 决定是否允许提交结果。

### 7.2 读追踪必须发生在 `resolve`

任何动态系统想要做到精确依赖，不能靠调用方自觉上报读取。必须在 `ScopeRuntime.resolve()` 内部自动打点。

这样一来：

1. 表达式读取能被追踪。
2. 模板字符串读取能被追踪。
3. 数据源参数注入读取能被追踪。
4. reaction 条件读取能被追踪。
5. 校验规则读取能被追踪。

### 7.3 自写保护

命名数据源和 reaction 都需要自写保护。最佳机制不是“特殊 if 判断”，而是给每次写入打上 `writeSource`。

```ts
export interface WriteSource {
  kind: 'user' | 'action' | 'data-source' | 'reaction' | 'validation' | 'system';
  producerId?: string;
  cycleId?: string;
}
```

失效时如果发现“变更来源 producerId 与消费者自身一致”，就跳过该消费者的重新调度。

但这只解决自环。要解决多节点循环，还需要事务级循环控制：

1. 每次 `commit()` 都分配 `cycleId`。
2. 一个消费者在同一 `cycleId` 内最多自动重跑一次。
3. 如果形成 A -> B -> A 级联，第二次返回 `blocked-by-cycle-guard` 诊断。
4. 数据源、reaction、异步校验都必须可观测地暴露该阻断状态。

## 8. 值引擎

### 8.1 五类值统一成一个求值协议

需求里给了渐进值语义：字面量、表达式、模板字符串、动作型值生产者、命名数据源。

最好的设计不是每类都搞一套接口，而是统一成 `ValueProvider` 协议。

```ts
export type ValueProviderKind =
  | 'static'
  | 'expression'
  | 'template'
  | 'action-produced'
  | 'named-source';

export interface ValueProvider<T = unknown> {
  id: string;
  kind: ValueProviderKind;
  evaluate(
    input: ValueEvaluationInput,
  ): ValueEvaluationResult<T> | Promise<ValueEvaluationResult<T>>;
}
```

但运行期调度上要分层：

1. `static` 直接返回编译值。
2. `expression` 和 `template` 属于同步纯计算。
3. `action-produced` 属于一次性异步生产。
4. `named-source` 属于带生命周期的持续生产者。

### 8.2 引用复用

为了满足“动态求值结果未变化时复用上次引用”，值引擎要缓存最后结果。

```ts
export interface ComputedValueCell<T = unknown> {
  id: string;
  deps: DependencySet;
  lastValue: T;
  lastStableHash?: string;
  dirty: boolean;
  evaluate(): T;
}
```

对于对象或数组，不建议做深比较全量扫描。更先进的做法是：

1. 表达式语言默认鼓励结构共享。
2. 数据源适配器可显式返回 `stableHash`。
3. 框架只做引用比较加可选哈希比较。

## 9. 表达式引擎

### 9.1 设计原则

表达式引擎必须是 AST 解释或字节码解释，不使用动态代码生成。

```ts
export interface ExpressionProgram {
  expressionId: string;
  ast: ExprNode;
  bytecode?: ExprInstruction[];
  symbols: string[];
}

export interface ExpressionEngine {
  compile(source: string): ExpressionProgram;
  execute<T = unknown>(program: ExpressionProgram, ctx: ExpressionContext): T;
}

export interface ExpressionContext {
  has(path: ValuePath): boolean;
  resolve(path: ValuePath): unknown;
  callBuiltin(fn: BuiltinFunctionId, args: unknown[]): unknown;
}
```

### 9.2 为什么推荐字节码解释

如果追求世界级内核，表达式就不该只是“parse 后递归 AST”。

字节码解释更适合，但这只是优化方向，不是首版硬前提：

1. 降低热路径对象分配。
2. 把路径读取、短路逻辑、函数调用统一成固定指令集。
3. 后续可接静态类型诊断、表达式 profiling、调试单步执行。

安全约束：

1. 表达式只能调用编译期已注册的 `BuiltinFunctionId`。
2. 不允许表达式访问宿主对象、全局对象、组件实例或命名空间动作。
3. `env` 不直接暴露为任意对象，只能暴露为编译期声明的只读环境投影。

## 10. 动作系统

### 10.1 动作不是函数表，而是控制流代数

动作系统的先进性，不在于能注册多少 action，而在于是否把控制流当成一等模型。

```ts
export type ActionStatus = 'success' | 'error' | 'skipped';

export interface ActionOutcome<T = unknown> {
  status: ActionStatus;
  value?: T;
  error?: ActionError;
  meta?: Record<string, unknown>;
}

export interface ActionPlan {
  planId: string;
  root: ActionStep;
}

export interface ActionDispatcher {
  dispatch(plan: ActionPlan, ctx: ActionExecutionContext): Promise<ActionOutcome>;
}
```

### 10.2 三层动作解析

我认为应该严格分成三层 resolver，而且 resolver 顺序固定：

1. `builtin:` 平台内置能力。
2. `component:` 组件实例能力。
3. `namespace:` 作用域命名空间能力。

对外不暴露隐式全局查找，防止安全边界漂移。

```ts
export interface ActionCapabilityResolver {
  resolveBuiltin(name: string): ActionCapability | undefined;
  resolveComponent(nodeId: RuntimeNodeId, method: string): ActionCapability | undefined;
  resolveNamespace(scopeId: ScopeId, ns: string, method: string): ActionCapability | undefined;
}
```

权限边界：

1. `builtin:` 能力由平台静态白名单提供。
2. `component:` 能力只能访问当前 session 的实例索引，不允许跨 session。
3. `namespace:` 能力必须先由当前词法 scope 显式注册，再通过 manifest 校验参数形状。
4. 所有能力调用都支持超时、取消、参数校验和错误分类。

这里 `component:` 的寻址键固定为 `RuntimeNodeId`，然后再由 `InstanceIndex` 解析到实际 `ComponentInstanceHandle`。不直接暴露 UI 框架原生 ref，也不把 `InstanceId` 当成组件动作目标。

### 10.3 动作上下文必须是作用域化的

`when`、`then`、`onError`、`parallel` 的真正难点，不是调度，而是结果上下文。

最干净的设计是：每一步都生成一个只读 `projected scope`，把 `result`、`error`、`prevResult` 注入进去。

这样控制流表达式根本不需要额外语法特例，仍走统一 `resolve/has`。

## 11. 数据源与 reaction

### 11.1 命名数据源是长期存活的生产单元

```ts
export interface DataSourceRuntime {
  id: string;
  state: 'idle' | 'loading' | 'ready' | 'error' | 'disposed';
  start(): void;
  refresh(reason: RefreshReason): Promise<void>;
  stop(): void;
  snapshot(): DataSourceSnapshot;
}
```

它与普通异步动作的根本区别在于：

1. 它有生命周期。
2. 它可以被依赖触发刷新。
3. 它会把 loading/error/data 发布到 scope。

数据源提交规则：

1. 请求参数读取依赖时会记录到当前 epoch。
2. 请求完成后不直接写 scope，而是提交一个 `commit()` 事务。
3. `loading/error/data` 是三个独立路径，允许精确订阅。
4. 数据源结果适配器可以返回 `stableHash`，以支持引用复用。

### 11.2 reaction 不是 watch 回调，而是声明式观察单元

```ts
export interface ReactionRuntime {
  id: string;
  evaluate(): Promise<void>;
  pause(): void;
  resume(): void;
  dispose(): void;
}
```

reaction 的最先进做法是显式区分：

1. 依赖求值阶段。
2. 条件判定阶段。
3. 副作用派发阶段。

这样才能防止“读依赖时顺便写值”的混乱循环。

reaction 也必须满足：

1. 条件求值与副作用执行分离。
2. 条件未变化时不重复触发。
3. 副作用执行只允许走 `dispatch()` 或 `commit()`。

## 12. 表单内核

### 12.1 表单必须是专门 owner，而不是普通 scope 打补丁

表单场景有自己的状态维度：

1. values
2. dirty
3. touched
4. submit state
5. validation state
6. draft isolation

这意味着它必须有独立内核。

```ts
export interface FormRuntime {
  id: string;
  scopeId: ScopeId;
  getValue(path?: ValuePath): unknown;
  setValue(path: ValuePath, value: unknown, options?: FormWriteOptions): Promise<CommitResult>;
  markTouched(path: ValuePath): void;
  validate(request?: ValidationRequest): Promise<ValidationResult>;
  submit(action?: DispatchInput): Promise<ActionOutcome>;
  snapshot(): FormSnapshot;
}
```

`FormRuntime.setValue()` 只是表单友好的 facade，底层仍然走 session `commit()`，不会绕过统一事务和依赖失效机制。

`markTouched()` 也不构成第二写通道。它只是一个内部 owner helper，最终必须被 lowering 为 `CommitIntent(target: 'form')` 再进入统一事务。

### 12.2 校验图

校验规则不能在运行时按字段临时扫描 schema。编译期必须构造 `ValidationGraph`。

```ts
export interface ValidationGraph {
  graphId: string;
  fieldRules: CompiledValidationRule[];
  objectRules: CompiledValidationRule[];
  arrayRules: CompiledValidationRule[];
  dependencies: ValidationDependencyIndex;
}
```

局部校验依赖这个索引，按路径快速筛出受影响规则。

### 12.3 草稿隔离

草稿模式本质上不是“加个布尔值”。

它应该被设计成：

1. 父表单有正式值 scope。
2. 草稿子区创建 draft form owner。
3. 草稿提交前，对父表单只暴露只读投影或完全不暴露。
4. 草稿提交时走一次显式 merge/commit 动作。

这样才不会污染父级 dirty 和 validation 状态。

## 13. 表面系统

### 13.1 dialog/drawer 统一为 surface

```ts
export type SurfaceKind = 'dialog' | 'drawer';

export interface SurfaceEntry {
  surfaceId: string;
  kind: SurfaceKind;
  parentSurfaceId?: string;
  scopeId: ScopeId;
  rootInstanceId: InstanceId;
  active: boolean;
  status: 'opening' | 'open' | 'closing' | 'closed';
}

export interface SurfaceEngine {
  open(input: OpenSurfaceInput): Promise<SurfaceEntry>;
  close(surfaceId: string, result?: unknown): Promise<void>;
  top(): SurfaceEntry | undefined;
  stack(): SurfaceEntry[];
}
```

### 13.2 关闭恢复

不要把“恢复前一个 surface 焦点”交给 UI 层临时处理。它属于 `SurfaceEngine` 的状态机职责。

### 13.3 Surface 拓扑裁决

本设计在这里做单一裁决，不再保留两种模型：

1. `surface` 是 **同一个 `RuntimeSession` 内部的 overlay owner 树**。
2. 打开 dialog/drawer 不会创建子 session，只会在当前 session 内创建新的 surface entry、scope subtree 和 instance subtree。
3. 因此 `SurfaceEngine.open/close` 的结果也必须通过事务协议进入统一调度。
4. `MountInput.surface` 不表示“创建子 session”，只表示“把根挂载到某个既有 surface 容器上下文”，属于嵌入位置提示。

## 14. 渲染模型

### 14.1 UI 是投影，不是核心

运行时核心不应依赖任何具体 UI 框架。它只输出标准渲染句柄。

```ts
export interface RenderFragmentHandle {
  fragmentId: string;
  mountPoint: RuntimeNodeId;
  snapshot(input?: RenderInvocationInput): RenderTree;
  subscribe(subscriber: RenderSubscriber): Unsubscribe;
}

export interface RenderTree {
  nodeId: RuntimeNodeId;
  type: string;
  props: Record<string, unknown>;
  meta: Record<string, unknown>;
  regions: Record<string, RenderFragmentHandle | RenderFragmentHandle[]>;
  events: Record<string, DispatchInput>;
}

export interface RenderPatch {
  fragmentId: string;
  revision: number;
  nodeId: RuntimeNodeId;
  changedProps?: string[];
  changedMeta?: string[];
  changedRegions?: string[];
  childDiffs?: RegionChildDiff[];
  lifecycle?: 'mounted' | 'updated' | 'unmounted';
}

export interface RegionChildDiff {
  region: string;
  op: 'insert' | 'remove' | 'move' | 'replace';
  key: string;
  fromIndex?: number;
  toIndex?: number;
  nodeId?: RuntimeNodeId;
}
```

`snapshot()` 用于首屏和调试快照，`subscribe()` + `RenderPatch` 才是生产渲染协议。

规则：

1. 普通 props/meta 变化只发字段级 patch。
2. region 子项插入、删除、重排必须通过 `childDiffs` 表达，而不是强迫 adapter 重拉整棵树。
3. 每个 patch 都带 `fragmentId + revision`，adapter 可丢弃过期 patch。
4. `snapshot()` 总能重建某个 fragment 的完整一致视图，作为 patch 丢失后的恢复机制。

React、Vue、Web Components 都只是把这套投影协议映射为各自 UI 节点。

### 14.2 参数化区域

region 参数应该降解成 scope projection，而不是匿名 closure。

```ts
export interface RegionInvocationInput {
  slotBindings?: Record<string, unknown>;
  scopeOverrides?: ScopeProjectionBinding[];
}
```

slot 渲染时自动生成 `$slot` 投影 scope，表达式仍然只认统一上下文。

## 15. 表格、循环、递归

### 15.1 高频子树必须模板复用、实例隔离

表格行、loop item、递归节点都应该服从同一个实例化协议：

```ts
export interface RepeatedInstanceFactory {
  instantiate(templateId: TemplateId, owner: RepeatedOwnerInput): InstanceId;
  recycle(instanceId: InstanceId): void;
}
```

重复结构还必须定义 key 规则：

1. 优先使用 schema 显式 `rowKey` / `itemKey`。
2. 否则退化为稳定位置 key。
3. key 变化意味着实例销毁重建，而不是就地篡改身份。

### 15.2 行作用域默认隔离

行级 scope 默认 `isolated`，只注入：

1. `record`
2. `index`
3. `rowMeta`
4. 显式投影进来的少量外部值

这是满足行级性能隔离的关键。

### 15.3 递归不是重新编译

递归结构应通过“模板自引用 + 新实例状态”实现，而不是在运行时重新生成 schema。

## 16. 宿主桥

### 16.1 宿主能力收敛为稳定服务接口

```ts
export interface HostServices {
  transport: HostTransport;
  navigation: HostNavigation;
  notification: HostNotification;
  scheduler: HostScheduler;
  i18n: HostI18n;
  diagnostics?: HostDiagnostics;
  errorReporter?: HostErrorReporter;
}
```

关键点：宿主对象引用变化不能导致 runtime 重建。因此内核初始化时应该把这些服务包装成稳定代理。

### 16.2 复杂域控件协议

复杂域控件不能直接把内部状态塞进 scope。应该只暴露两类东西：

1. 只读快照投影。
2. 命名空间命令。

```ts
export interface HostCapabilityManifest {
  namespace: string;
  projections: CapabilityProjectionSpec[];
  commands: CapabilityCommandSpec[];
}
```

这是实现“领域私有状态机不进入 schema 可见环境”的必要边界。

安全要求：

1. manifest 是命名空间能力暴露的唯一来源。
2. projection 字段必须声明类型、路径和只读性。
3. command 必须声明参数 shape、返回 shape、超时和取消能力。
4. 未在 manifest 中声明的能力，schema 永远不可见。

另外必须补一条值回流边界：

1. 任意 capability 返回值、projection 值、`env` 值在进入 scope 前，都必须经过 `SchemaValueNormalizer`。
2. `SchemaValueNormalizer` 默认拒绝函数、类实例、DOM 对象、Promise、Symbol、代理对象和宿主框架对象引用。
3. 允许进入 scope 的只能是 schema-safe 值：`null`、布尔、数值、字符串、普通数组、普通对象、受控日期/二进制包装值，以及平台显式支持的不可变标量包装。

## 17. 调度与并发

### 17.1 统一调度器

所有异步活动都应该经过统一 scheduler，而不是每个模块自己 `setTimeout`、`Promise.then`。

```ts
export interface RuntimeScheduler {
  enqueue(job: RuntimeJob, priority?: JobPriority): JobHandle;
  cancel(jobId: string): void;
  flush(): Promise<void>;
}
```

统一 scheduler 的收益：

1. action debounce 可以复用同一机制。
2. data source polling 可以统一取消。
3. async validation 可以统一抢占和失效。
4. 调试器可以看到全局任务图。

### 17.2 事务化刷新

写入不应立刻触发一连串同步风暴。更领先的策略是：

1. 一次 write 进入事务。
2. 收集路径变更。
3. 批量失效依赖消费者。
4. 调度重新计算。
5. 最后向 UI 投影层提交稳定快照。

这能显著降低抖动与重复计算。

### 17.3 提交顺序与一致性

单个事务按以下顺序推进：

1. 接受 `dispatch()` 或 `commit()` 请求。
2. 生成事务 `revision` 和 `cycleId`。
3. 如果来源是 `dispatch()`，先由 capability 产出 `CommitIntent`，再归并为 `CommitRequest`。
4. 路由到底层 `WritableScopeStore` 产生路径变更。
5. 立刻标脏同步计算单元，但不立刻触发 UI 投影。
6. 同一事务内先重算同步 `computed-value`。
7. 再调度 `validation`、`data-source`、`reaction` 这三类异步消费者。
8. 最后把本事务稳定后的 patch 批量发给 `ProjectionEngine`。

一致性规则：

1. 同一事务中的后续读取可以看到前面已提交的写入。
2. 异步消费者只能基于某个确定 epoch 的快照开始执行。
3. 旧 epoch 的结果不能覆盖新事务后的状态。
4. `surface open/close` 也属于事务性事件，参与同一调度协议。

### 17.3.1 生命周期释放表

为了避免 owner 泄漏，销毁责任必须写成正式规则：

1. `RuntimeSession.dispose()` 负责递归销毁本 session 下所有 owner。
2. `SurfaceEngine.close()` 负责先停表面子树的 async epoch，再释放其 scope、实例、订阅和 patch 流。
3. `RepeatedInstanceFactory.recycle()` 必须同步释放该实例关联的 `ReadableScope`/`WritableScopeStore`、依赖边、组件实例索引和 render subscriber。
4. `RenderFragmentHandle.subscribe()` 返回的 `Unsubscribe` 在 fragment 卸载时自动触发，adapter 可重复调用而无副作用。
5. `projected scope` 的生命周期从属于创建它的 owner；owner 销毁时投影视图必须一并失效。
6. `ComputedValueCell`、`ReactionRuntime`、`DataSourceRuntime`、`ValidationRuntime` 的依赖边必须在 `dispose()` 时立即从图上删除。

### 17.4 复杂度预算

如果一个设计不愿意写复杂度预算，它通常不是成熟内核。

本设计的目标预算：

1. 单次路径写入的失效查找应接近 `O(affected-consumers)`，而不是全图扫描。
2. 依赖索引必须至少按 `scopeId + path segment trie` 或等价结构组织。
3. 表格/loop 场景的消费者规模上限应与“可见实例数”近似线性，而不是与“总数据量”线性。
4. 回收的重复实例必须同步释放依赖边、scope 订阅和组件实例索引。
5. 调试模式允许额外索引；生产模式必须可关闭重型诊断数据。

## 18. 调试与诊断

### 18.1 调试信息是正式产物

```ts
export interface DebugArtifacts {
  nodeSourceMap: Record<TemplateNodeId, SourceRange>;
  expressionSourceMap: Record<string, SourceRange>;
  actionSourceMap: Record<string, SourceRange>;
  regionSourceMap: Record<string, SourceRange>;
}
```

### 18.2 运行时检查接口

```ts
export interface RuntimeInspector {
  getScope(scopeId: ScopeId): ScopeSnapshot | undefined;
  getNode(nodeId: RuntimeNodeId): RuntimeNodeSnapshot | undefined;
  getDependencies(consumerId: string): DependencySet | undefined;
  getPendingJobs(): RuntimeJobSnapshot[];
  getSurfaces(): SurfaceEntry[];
}
```

调试器不应该靠偷读内部 store，它应该基于正式 inspect API。

公开路径明确为：

1. 宿主拿到 `RuntimeHandle` 后，可通过 `handle.sessionId` 标识当前会话。
2. 调试器调用 `RuntimeKernel.inspector(handle.sessionId)` 获取该会话的 `RuntimeInspector`。
3. `RuntimeHandle.inspectNode/inspectScope` 只是便捷入口；完整诊断能力以 `RuntimeInspector` 为准。

## 19. 推荐的模块边界

如果从零实现，我会把内核拆成下面这些包或模块：

1. `schema-ast`
2. `schema-compiler`
3. `expression-vm`
4. `runtime-scope`
5. `runtime-deps`
6. `runtime-values`
7. `runtime-actions`
8. `runtime-data-source`
9. `runtime-validation`
10. `runtime-surface`
11. `runtime-render-contract`
12. `runtime-host-bridge`
13. `runtime-debug`

这样拆的理由是：

1. 每个模块的状态所有权明确。
2. 无 DOM 环境下可单测。
3. UI 框架接入层被压到最外层。
4. 可逐层替换或独立 benchmark。

## 20. 最关键的组织原则

### 20.1 一切动态能力都抽象成“可追踪消费者”

只要某个单元会读取 scope 并在变更后需要重跑，它就应该进入统一消费模型。

包括：

1. 动态 props
2. meta visible/disabled
3. 模板字符串
4. 数据源触发条件
5. reaction 条件
6. 条件校验

### 20.2 一切副作用都抽象成“能力派发”

不要让表达式、组件、数据源直接写外部世界。只允许通过 capability dispatcher 产生命令意图，再统一折叠到事务提交：

1. 产生 scope/form/surface 变更 intent
2. 发请求
3. 打开 surface
4. 关闭 surface
5. 调用 namespace command
6. 导航
7. 通知

宿主只看到 `RuntimeHandle`；内部 owner 的直接方法调用不构成公开扩展点。

### 20.3 一切重复结构都抽象成“模板 + 实例 owner”

不要在 loop/table/recurse 上各写一套生命周期系统。

## 21. 最小公开接口草图

```ts
export interface SchemaVM {
  compile(input: SchemaCompileInput): CompiledProgram;
  createKernel(program: CompiledProgram, host: HostServices): RuntimeKernel;
}

export interface SchemaCompileInput {
  schema: unknown;
  locale?: string;
  componentCatalog: ComponentCatalog;
  capabilityCatalog?: CapabilityCatalog;
}

export interface MountInput {
  data?: Record<string, unknown>;
  env?: Record<string, unknown>;
  surface?: MountSurfaceContext;
}
```

这个公开面已经足够小，但内部可以非常强。

其中：

1. `MountInput.data` 是根数据快照。
2. `MountInput.env` 不是原样透传，而是按编译期环境声明投影成只读环境 scope。
3. `MountInput.surface` 只用于把当前 root 绑定到一个既有 surface 容器上下文，不创建子 session。

## 22. 执行时序

### 22.1 启动

1. host 注入 schema、catalog、能力描述。
2. compiler 产出 `CompiledProgram`。
3. kernel 基于 `CompiledProgram` 创建全局索引。
4. session mount，建立 root scope 和 root instance。
5. 模板根节点实例化。
6. 首轮静态 props 直接复用，动态槽进入值引擎。
7. data source、reaction、surface、form owner 按模板声明启动。
8. projection layer 渲染 UI。

### 22.2 写入

1. 组件事件触发 `dispatch`。
2. action engine 派发能力并收集 `CommitIntent`。
3. session 把 intent 归并成一次 `commit()` 事务。
4. scope 或其他 owner 生成路径变更与结构变更。
5. dependency graph 精确失效消费者。
6. scheduler 重新运行受影响计算、数据源、reaction、校验。
7. projection engine 发出带 revision 的 `RenderPatch`。
8. UI adapter 增量更新，必要时回退到 `snapshot()` 重建。

### 22.3 销毁

1. 停止 polling 和 async job。
2. 销毁 surface 栈。
3. 销毁 data source 和 reaction。
4. 清理 scope 订阅。
5. 释放 instance index。

## 23. 为什么这个设计更像“下一代”

因为它不是把低代码框架看成“表单引擎的放大版”，而是看成：

1. 一台受限、可优化、可调试的声明式虚拟机。
2. 一组有严格边界的 owner runtime。
3. 一套读写分离、依赖闭环、能力显式的执行模型。

世界级低代码内核的分水岭，不再是组件数量，也不是 schema 花样多少，而是以下四点是否同时成立：

1. 能否把 schema 当一级可编译制品。
2. 能否把所有动态逻辑收敛到同一依赖和调度模型。
3. 能否在高频重复结构下维持精确刷新边界。
4. 能否把 UI、宿主、领域控件都压缩成清晰投影层，而不是让它们反向污染内核。

如果只能保留一个判断标准，我会选这个：

**内核是否可以完全脱离 UI 框架独立运行、测试、调试、调度和诊断。**

能做到这一点，才有资格称为下一代低代码运行时内核。
