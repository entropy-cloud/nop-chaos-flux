# 下一代低代码核心框架内核设计 v4

## 1. 设计目标

本文在 `docs/low-code-dsl-runtime-requirements.md` 的基础上，额外满足 `docs/experiments/requirements.md` 指定的约束：

1. 必须符合 `docs/architecture/flux-design-principles.md`
2. 必须接受 `docs/architecture/flux-dsl-vm-extensibility.md` 所定义的 Flux 定位
3. 必须适配 Flux 作为嵌入式运行时在大型 React 系统中的局部页面执行场景
4. `RendererEnv` 视为静态宿主能力对象，能直接使用的宿主能力必须直接使用，不再在内核内部额外包一层 facade

因此，这份 v4 不是“脱离 Flux 原则的独立新体系”，而是“在 Flux 原则、Final Execution Schema 边界、嵌入式 React 宿主前提下，尽可能先进的下一代低代码内核设计”。目标不是描述某个 UI 框架实现，而是定义一个可编译、可嵌入、可验证、可扩展的低代码运行时内核接口。

这个 v4 设计的核心判断是：

1. 低代码运行时不应该以“组件树 + 事件回调”的 UI 框架思路为中心，而应该以“可编译声明图 + 增量执行内核”为中心。
2. schema 不是配置，而是程序。它必须先进入编译态，被规整为不可变执行模板，再进入实例化执行态。
3. 所有运行时能力都应该落在统一的三元组上：`读什么`、`何时失效`、`失效后做什么`。
4. 值读取、数据源刷新、副作用 reaction 共享依赖模型，但仍须服从 Flux 的七原语闭包，不能为统一而把一切都升格为新 primitive。
5. 真正先进的 Flux 内核不把复杂性塞给组件，也不把复杂性升级成更多 core primitive，而是把复杂性收敛到编译器、依赖图、作用域图和派生运行时系统里。

## 2. 顶层架构

内核分为七层：

1. Authoring Input Layer
2. Compiler Layer
3. Immutable Template Layer
4. Instance Graph Layer
5. Reactive Kernel Layer
6. Effect and Capability Layer
7. Renderer Adapter Layer

### 2.1 七层职责

1. Authoring Input Layer
   负责接收原始 schema、国际化资源、组件元信息、动作元信息、宿主环境声明。

2. Compiler Layer
   把原始 schema 编译成不可变模板，做节点规整、值分类、表达式编译、区域提取、诊断生成、静态引用绑定。

3. Immutable Template Layer
   保存可复用、可缓存、可多次实例化的执行模板。模板只描述结构和静态计划，不持有实例态数据。

4. Instance Graph Layer
   把模板实例化为运行时图，包括节点实例、作用域实例、表单实例、表面实例、数据源实例、reaction 实例。

5. Reactive Kernel Layer
   统一处理路径读取、依赖收集、精确失效、增量重算、引用复用、自写保护、订阅调度。

6. Effect and Capability Layer
   统一处理所有副作用能力，包括动作派发、网络委托、通知委托、导航委托、组件实例动作、命名空间动作。

7. Renderer Adapter Layer
   把节点实例解析为渲染器可消费的 `props/meta/regions/events`，适配 React、Vue、纯 DOM 或其他渲染宿主。

## 3. 两阶段模型

### 3.1 编译态

编译态只做四类事情：

1. 把 schema 变成规范结构。
2. 把能静态解决的问题提前解决。
3. 把动态部分降解为最小执行单元。
4. 产出模板和诊断，而不是直接运行。

### 3.2 执行态

执行态只做三类事情：

1. 实例化模板。
2. 响应数据变化。
3. 通过受控能力边界产生副作用。

这个分离直接对应需求中的“编写态与执行态分离”和“如果能在编译阶段解决，就不要推迟到运行时”。

## 4. 核心抽象

在符合 Flux 顶层编程模型的前提下，v4 不重新发明 primitive closure。Flux core 仍然保持七原语闭包：

1. `Base Tree`
2. `ScopeRef`
3. `Value`
4. `Resource`
5. `Reaction`
6. `Capability`
7. `Host Projection`

因此，本文后续出现的 `Template`、`NodePlan`、`Scheduler`、`TypeContract` 等，都不是新的 Flux primitive，而是为了实现七原语闭包而引入的执行模型内部构件或派生运行时系统。

对 v4 而言，真正的核心执行构件是：

1. `Template`
2. `NodePlan`
3. `ScopeFrame`
4. `ReactiveConsumer`
5. `ActionProgram`
6. `Scheduler`
7. `TypeContract`
8. `RendererEnv Access`

它们共同定义了系统的最小闭环：

1. `Template` 描述整个应用的不可变执行蓝图。
2. `NodePlan` 描述单个节点如何解析值、区域、事件、数据源、校验和局部实例。
3. `ScopeFrame` 描述词法数据环境和命名空间边界。
4. `ReactiveConsumer` 描述“读取哪些路径，失效后如何重新执行”。
5. `ActionProgram` 描述声明式控制流，它属于 `Capability` 之上的派生 action algebra。
6. `Scheduler` 描述所有增量计算与副作用的相位秩序，它是派生 runtime system，不是新 primitive。
7. `TypeContract` 描述编译期可验证的值形状、命名空间契约、slot 契约、动作契约，它属于编译与诊断系统，不是运行时新 primitive。
8. `RendererEnv Access` 描述如何直接使用静态宿主能力对象，而不是在内核内部再套一层 facade。

### 4.1 与 Flux 原则对齐后的降级约束

为了符合 Flux 原则，v4 明确接受以下约束：

1. `Scheduler` 是 derived runtime system，不提升为 primitive。
2. `ActionProgram` 是 `Capability` 之上的派生控制流，不是独立 primitive。
3. `TypeContract` 是编译层契约系统，不是运行时 primitive。
4. `Template`/`NodePlan` 是 Final Execution Schema 的执行形态，不是 authoring model。
5. 复杂域控件仍然只是特殊 `type` 对应的复杂组件 shell，不引入第二套设计器平台协议。

## 5. 编译产物设计

### 5.1 顶层模板接口

```ts
export interface RuntimeTemplate {
  readonly templateId: string;
  readonly version: 'v4';
  readonly rootNodeId: NodeId;
  readonly nodes: ReadonlyMap<NodeId, CompiledNodePlan>;
  readonly requests: ReadonlyMap<RequestPlanId, CompiledRequestPlan>;
  readonly expressions: ReadonlyMap<ExpressionId, CompiledExpression>;
  readonly actions: ReadonlyMap<ActionId, CompiledActionProgram>;
  readonly validators: ReadonlyMap<ValidatorId, CompiledValidatorProgram>;
  readonly dataSources: ReadonlyMap<DataSourceId, CompiledDataSourcePlan>;
  readonly reactions: ReadonlyMap<ReactionId, CompiledReactionPlan>;
  readonly i18n: CompiledI18nPlan;
  readonly diagnostics: readonly CompilationDiagnostic[];
  readonly debugIndex: DebugIndex;
  readonly contractIndex: ContractIndex;
}
```

模板是完全不可变的。它可以被缓存、哈希、序列化、跨实例共享。

### 5.2 节点计划

```ts
export interface CompiledNodePlan {
  readonly nodeId: NodeId;
  readonly sourceLoc?: SourceLocation;
  readonly type: string;
  readonly role: 'layout' | 'widget' | 'fragment' | 'surface' | 'loop' | 'slot';
  readonly componentKey: string;
  readonly staticProps: JsonObject;
  readonly dynamicProps: readonly BoundValuePlan[];
  readonly meta: readonly BoundValuePlan[];
  readonly regions: readonly CompiledRegionPlan[];
  readonly events: readonly CompiledEventBinding[];
  readonly scopePlan?: CompiledScopePlan;
  readonly activationPlan?: ActivationPlanRef;
  readonly formPlan?: FormPlanRef;
  readonly surfacePlan?: SurfacePlanRef;
  readonly loopPlan?: LoopPlanRef;
  readonly validationPlan?: ValidationOwnerRef;
  readonly lifecycleHooks: readonly LifecycleHookPlan[];
}
```

节点计划不保存“当前值”，只保存“如何得到值”。

### 5.2.1 作用域计划

```ts
export type ScopeVisibilityPlan =
  | { readonly kind: 'inherit' }
  | { readonly kind: 'isolated' }
  | { readonly kind: 'projected'; readonly projection: ScopeProjectionPlan };

export interface CompiledScopePlan {
  readonly createScope: boolean;
  readonly visibility: ScopeVisibilityPlan;
  readonly initialPatch?: ScopePatch;
  readonly namespaceBindings?: readonly NamespaceBindingPlan[];
  readonly mountPolicy: 'eager' | 'on-activation';
}
```

只有容器节点、循环项节点、表面节点、表单节点、参数化片段节点会创建新作用域。`initialPatch` 在实例化时应用到该节点 own scope。命名空间注册只对该作用域及其词法子树可见。

### 5.3 渐进式值模型

需求里把值生产从字面量一路推到数据源。v4 把它统一为 `ValuePlan` 代数类型：

```ts
export type ValuePlan =
  | LiteralValuePlan
  | ExpressionValuePlan
  | TemplateStringValuePlan
  | ActionValueProducerPlan
  | DataSourceProjectionPlan;

export interface BoundValuePlan {
  readonly key: string;
  readonly plan: ValuePlan;
  readonly recomputePolicy: 'static' | 'tracked' | 'volatile';
  readonly comparePolicy: ComparePolicyRef;
  readonly outputType?: TypeShapeRef;
}
```

这有两个关键收益：

1. 编译器可以统一分析任何值字段到底会不会触发依赖收集。
2. 渲染层完全不需要知道值是字面量、表达式还是异步来源，它只消费解析后的最终值。

### 5.4 表达式编译结果

```ts
export interface CompiledExpression {
  readonly expressionId: ExpressionId;
  readonly source: string;
  readonly ast: ExpressionAst;
  readonly depsShapeHint: DependencyShapeHint;
  readonly outputType?: TypeShapeRef;
  readonly evaluator: ExpressionEvaluator;
}

export interface ExpressionEvaluator {
  evaluate(ctx: EvaluationContext): unknown;
}
```

表达式编译后只保留 AST 和解释执行器，不允许生成动态代码。

### 5.5 区域计划

```ts
export interface CompiledRegionPlan {
  readonly regionKey: string;
  readonly childNodeIds: readonly NodeId[];
  readonly params?: readonly SlotParamDef[];
  readonly regionMode: 'normal' | 'parameterized' | 'virtualized';
}
```

区域是模板级概念，而不是渲染期再去切分 children。

### 5.6 声明式请求计划

```ts
export interface CompiledRequestPlan {
  readonly requestPlanId: RequestPlanId;
  readonly url: ValuePlan;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly query?: ReadonlyRecord<string, ValuePlan>;
  readonly headers?: ReadonlyRecord<string, ValuePlan>;
  readonly body?: ValuePlan;
  readonly scopeInjection?: ScopeInjectionPlan;
  readonly responseAdapter?: ResponseAdapterPlan;
  readonly requestType?: TypeShapeRef;
  readonly responseType?: TypeShapeRef;
}

export interface ScopeInjectionPlan {
  readonly mode: 'explicit' | 'named-projection';
  readonly mappings: readonly ScopeInjectionMapping[];
}
```

请求计划负责描述请求是什么；真正发送请求时直接使用静态 `RendererEnv.fetcher`，而不是在 runtime 内部额外包一层同构 facade。这样可以满足“声明式 API 定义”和“网络请求委托”同时成立。

### 5.7 国际化编译计划

```ts
export interface CompiledI18nPlan {
  readonly supportedLocales: readonly ['zh-CN', 'en-US', ...string[]];
  readonly keyPrefix: string;
  readonly strategy: 'compile-time-replacement' | 'compile-time-lookup-table';
}
```

本设计要求所有 i18n key 使用统一前缀；翻译替换在编译阶段完成为静态字面量或 locale lookup 表，不进入响应式依赖系统。对单个 `AppInstance` 而言，locale 是固定的；locale 切换通过宿主重建实例完成，不作为响应式状态参与增量更新。

### 5.8 类型合同

```ts
export interface ContractIndex {
  readonly types: ReadonlyMap<TypeShapeRef, TypeShape>;
  readonly namespaces: ReadonlyMap<string, NamespaceContract>;
  readonly actions: ReadonlyMap<ActionId, ActionContract>;
  readonly slots: ReadonlyMap<string, SlotContract>;
}
```

## 6. 作用域图设计

### 6.1 作用域不是对象链，而是帧图

传统实现喜欢把 scope 建成“对象 + 原型式父链”。v4 不这样做。v4 使用 `ScopeFrame` 图，因为低代码运行时真正需要的是：

1. 词法继承
2. 显式隔离
3. 定点写入
4. 路径级变更通知
5. 生命周期绑定

这些需求都说明作用域更像“带寻址能力的持久化帧图”，而不是普通 JS 对象。

### 6.2 作用域帧接口

```ts
export interface ScopeFrame {
  readonly scopeId: ScopeId;
  readonly parentScopeId?: ScopeId;
  readonly visibility: ScopeVisibility;
  readonly revision: number;
  resolve(path: DataPath): ResolveResult;
  has(path: DataPath): boolean;
  patch(patch: ScopePatch, cause: WriteCause): PatchResult;
  snapshot(options?: SnapshotOptions): ScopeSnapshot;
  subscribe(selector: PathSelector, listener: ScopeListener): Unsubscribe;
}
```

```ts
export type ScopeVisibility =
  | { readonly kind: 'inherit' }
  | { readonly kind: 'isolated' }
  | { readonly kind: 'projected'; readonly projection: ScopeProjection };
```

### 6.3 三种可见性模型

1. `inherit`
   子作用域向上解析未命中的路径。

2. `isolated`
   子作用域完全不继承父级数据。

3. `projected`
   子作用域默认隔离，但显式投影少量父数据进入本地只读视图。这是行级环境、循环项环境、高频子树环境的标准模型。

### 6.4 写入模型

写入不直接返回“新对象”，而返回路径变更集：

```ts
export interface PatchResult {
  readonly revision: number;
  readonly changedPaths: readonly ChangedPath[];
  readonly touchedScopes: readonly ScopeId[];
}
```

因为依赖系统真正需要的是“哪些路径变了”，不是“对象整体可能变了”。

### 6.5 写入解析矩阵

写入规则必须是确定的：

1. 相对路径默认写入当前作用域 own data。
2. 绝对路径写入显式指定的目标作用域。
3. `projected` 可见路径永远只读，不能原地回写到父级。
4. 若当前作用域 own data 中已有同名字段，则遮蔽父级或投影字段。
5. 缺失中间节点按结构化补丁策略创建。
6. `PatchResult.changedPaths` 始终以实际被写入的目标作用域视角报告。

因此 v4 不允许“看起来写的是当前作用域，实际上偷偷改父级”的隐式回写。

## 7. 统一响应式内核

### 7.1 单一依赖图

v4 的核心创新是把所有增量逻辑统一到一个依赖图里：

1. 值求值器是消费者。
2. 数据源刷新器是消费者。
3. reaction 是消费者。
4. 校验器是消费者。
5. 渲染订阅器也是消费者。

统一接口如下：

```ts
export interface ReactiveConsumer {
  readonly consumerId: ConsumerId;
  readonly kind: 'value' | 'datasource' | 'reaction' | 'validator' | 'render-subscription';
  readonly ownerNodeId?: NodeId;
  collect(run: DependencyCollectorRun): ConsumerRunResult;
  invalidate(reason: InvalidationReason): void;
  dispose(): void;
}

export interface ConsumerExecution {
  readonly runId: string;
  readonly startedAtRevision: number;
  cancel(): void;
  commitIfCurrent(result: ConsumerRunResult): boolean;
}
```

### 7.2 依赖收集协议

```ts
export interface DependencyCollector {
  trackRead(dep: DependencySelector): void;
  trackNamespaceRead(scopeId: ScopeId, namespace: string, member: string): void;
}

export type DependencySelector =
  | { readonly kind: 'exact'; readonly scopeId: ScopeId; readonly path: DataPath }
  | { readonly kind: 'prefix'; readonly scopeId: ScopeId; readonly path: DataPath }
  | { readonly kind: 'exists'; readonly scopeId: ScopeId; readonly path: DataPath }
  | { readonly kind: 'keys'; readonly scopeId: ScopeId; readonly path: DataPath }
  | { readonly kind: 'length'; readonly scopeId: ScopeId; readonly path: DataPath }
  | { readonly kind: 'iteration'; readonly scopeId: ScopeId; readonly path: DataPath }
  | { readonly kind: 'slot'; readonly slotKey: string };

export interface EvaluationContext {
  readonly scope: ScopeFrame;
  readonly collector?: DependencyCollector;
  resolve(path: DataPath): unknown;
  has(path: DataPath): boolean;
  resolveSlot(path: DataPath): unknown;
  resolveNamespace(namespace: string, memberPath: DataPath): unknown;
  call(name: string, args: readonly unknown[]): unknown;
}
```

表达式执行时只要通过 `resolve/has/resolveSlot/resolveNamespace` 读取，就自动留下依赖痕迹。`$slot.xxx` 是保留词法命名空间，优先于普通路径解析，但可以被局部 slot 绑定整体替换。`$form` 和域控件投影也按 namespace 解析，而不是伪装成普通 scope path。

### 7.3 失效传播

依赖图存的是“路径订阅边”，不是粗粒度“某个 scope 变了”。

```ts
export interface InvalidationEvent {
  readonly scopeId: ScopeId;
  readonly changedPaths: readonly ChangedPath[];
  readonly cause: WriteCause;
}
```

失效传播分三步：

1. 从变更路径定位潜在消费者。
2. 用路径前缀与选择器规则做精确筛选。
3. 按消费者类型进入不同调度通道。

### 7.4 引用复用

每个消费者都可以提供稳定性比较器：

```ts
export interface EqualityPolicy {
  equals(prev: unknown, next: unknown): boolean;
}
```

默认策略：

1. 基元值按 `Object.is`
2. 结构值按 `TypeShape` 驱动的 shape-aware 比较
3. 标记为 `volatile` 的值直接失效

### 7.5 自写保护

每次写入都带 `WriteCause`：

```ts
export interface WriteCause {
  readonly source: 'user-input' | 'action' | 'datasource' | 'validator' | 'reaction' | 'host';
  readonly producerId?: string;
  readonly causationId: string;
}
```

数据源消费者收到由自己 `producerId` 写回造成的失效时直接忽略，从而避免自触发刷新循环。

### 7.6 循环治理

自写保护还不够。v4 还要求：

1. 同一 `causationId` 在单个调度批次内对同一消费者同一 revision 只执行一次。
2. 内核维护最大传播步数，超过上限时上报循环诊断。
3. reaction 和数据源都必须声明并发策略，例如 `switch/exhaust/concat/merge`。
4. 所有异步消费者的过期结果只能在 `commitIfCurrent()` 成功时提交。

### 7.7 调度器

```ts
export interface RuntimeScheduler {
  enqueue(task: ScheduledKernelTask): void;
  flush(): void;
}
```

调度相位固定为：

1. `write-commit`
2. `pure-recompute`
3. `validation`
4. `reaction`
5. `datasource-refresh`
6. `datasource-publish`
7. `render-notify`

规则如下：

1. 同一批次内低相位必须先于高相位完成。
2. 高相位产生新写入时，进入下一批次，从 `write-commit` 重新开始。
3. `render-notify` 永远看见当前批次收敛后的稳定结果。
4. Host 计时器只负责提供时间与延迟回调，不决定内核相位顺序。

## 8. 实例图设计

### 8.1 模板实例化

实例化后的运行时不是组件树，而是实例图：

1. `AppInstance`
2. `NodeInstance`
3. `ScopeFrame`
4. `FormRuntime`
5. `SurfaceRuntime`
6. `DataSourceRuntime`
7. `ReactionRuntime`

```ts
export interface AppInstance {
  readonly appId: string;
  readonly template: RuntimeTemplate;
  readonly rootScope: ScopeFrame;
  readonly rootNode: NodeInstance;
  readonly kernel: ReactiveKernel;
  readonly scheduler: RuntimeScheduler;
  readonly actionExecutor: ActionExecutor;
  readonly env: RendererEnv;
  mount(): void;
  unmount(): void;
  inspect(): RuntimeInspection;
}
```

### 8.2 节点实例

```ts
export interface NodeInstance {
  readonly nodeId: NodeId;
  readonly plan: CompiledNodePlan;
  readonly scope: ScopeFrame;
  readonly state: 'inactive' | 'mounting' | 'active' | 'suspending' | 'disposed';
  readonly parent?: NodeInstance;
  readonly children: ReadonlyMap<string, readonly NodeInstance[]>;
  resolveProps(): ResolvedPropsBag;
  resolveMeta(): ResolvedMetaBag;
  getRegion(regionKey: string): RegionHandle | undefined;
  getEvent(eventKey: string): RuntimeEventHandler | undefined;
}
```

关键点：节点实例只在边界上提供 `resolveProps/resolveMeta`，内部真正的增量缓存由响应式内核接管。

### 8.3 生命周期与销毁顺序

所有动态实例都遵循统一规则：

1. 先停止接受新的调度。
2. 再取消未完成异步执行。
3. 再释放子 consumer。
4. 再释放子 scope 和子实例。
5. 最后进入 `disposed`。

销毁中的异步结果一律丢弃，不允许回写到已失活实例。

## 9. 渲染适配层

### 9.1 渲染器注册表

```ts
export interface RendererRegistry {
  register(def: RendererDefinition): void;
  resolve(type: string): RendererDefinition | undefined;
}

export interface RendererDefinition {
  readonly type: string;
  readonly role: 'layout' | 'widget' | 'fragment-host' | 'surface-host';
  readonly component: unknown;
  readonly contract?: RendererContract;
}
```

`RendererContract` 必须显式声明：

1. layout renderer 只能输出稳定语义 marker class，不包含内置视觉样式。
2. widget renderer 可以是自包含控件。
3. 渲染适配器必须输出稳定 DOM 调试标记，能从 DOM 反查 `nodeId`。

### 9.2 渲染器输入合同

```ts
export interface RendererInput {
  readonly nodeId: NodeId;
  readonly type: string;
  readonly version: number;
  readonly props: ResolvedPropsBag;
  readonly meta: ResolvedMetaBag;
  readonly regions: ReadonlyMap<string, RegionHandle>;
  readonly events: ReadonlyMap<string, RuntimeEventHandler>;
  readonly runtime: RendererRuntimeBridge;
}
```

渲染器永远拿不到全局内部 store，只拿到受限桥接口。

bag 模式下的规则是：只有当某个 prop/meta key 的值或 bag 结构真正变化时，`version` 才增长，未变化的子引用必须复用。

### 9.3 片段渲染

```ts
export interface RegionHandle {
  readonly regionKey: string;
  render(bindings?: RegionBindings): RenderFragment;
}

export interface RegionBindings {
  readonly slot?: Record<string, unknown>;
  readonly scopePatch?: ScopePatch;
  readonly visibility?: ScopeVisibilityPlan;
}
```

区域不是 React children，而是具名的“可带绑定调用的模板句柄”。这使参数化 slot、循环项实例化、递归片段渲染都落在同一模型下。

## 10. 动作系统设计

### 10.1 动作不是函数，而是程序

需求里的 `when`、`then`、`onError`、`parallel`、`retry`、`timeout`、`debounce` 已经说明：动作系统本质上不是调用一个 handler，而是执行一个声明式程序。

```ts
export interface CompiledActionProgram {
  readonly actionId: ActionId;
  readonly root: ActionFlowNode;
}

export interface ActionFlowNode {
  readonly step: ActionStep;
  readonly then?: ActionFlowNode;
  readonly onError?: ActionFlowNode;
  readonly finally?: ActionFlowNode;
}

export type ActionStep =
  | DispatchStep
  | ParallelStep
  | GuardStep
  | RetryStep
  | TimeoutStep
  | DebounceStep;
```

### 10.2 统一动作结果

```ts
export type ActionOutcome =
  | { kind: 'success'; value: unknown }
  | { kind: 'error'; error: ActionError }
  | { kind: 'skipped'; reason?: string };
```

规则如下：

1. `then` 只在 `success` 后进入。
2. `onError` 只在 `error` 后进入。
3. `skipped` 默认向上传播，除非后续节点显式声明接受 `skipped`。
4. `parallel` 聚合结果为子结果数组；只要有 `error`，并行节点整体为 `error`，否则若全部 `skipped` 则整体 `skipped`，其余为 `success`。
5. `result` 是上一步成功值，`error` 是上一步失败对象，`prevResult` 是更早的最近一次成功值。
6. `finally` 在 `then/onError` 分支结算后总会执行；默认不改写主 outcome，只有当 `finally` 自身失败时覆盖整体 outcome。

### 10.3 动作执行上下文

```ts
export interface ActionContext {
  readonly app: AppInstance;
  readonly node?: NodeInstance;
  readonly scope: ScopeFrame;
  readonly result?: unknown;
  readonly prevResult?: unknown;
  readonly error?: ActionError;
  dispatch(step: DispatchInvocation): Promise<ActionOutcome>;
  write(target: ScopeWriteTarget, patch: ScopePatch): Promise<PatchResult>;
}
```

嵌套流程中每个 `ActionFlowNode` 都形成一个新的局部 action frame，保证 `result/prevResult/error` 绑定规则稳定、可推导。

### 10.4 三层解析机制

动作名解析顺序固定：

1. 平台内置动作
2. `component:<method>` 组件实例动作
3. `namespace:method` 命名空间动作

```ts
export interface ActionResolver {
  resolve(name: string, ctx: ActionContext): ResolvedActionHandler | undefined;
}

export interface ComponentInstanceRegistry {
  register(target: string, instance: ComponentActionTarget): Unsubscribe;
  resolve(target: string): ComponentActionTarget | undefined;
}
```

这个顺序确保平台语义稳定，同时保留组件实例和域控件的扩展性。`component:<method>` 的实际 target 由动作参数显式给出，例如节点 id、实例别名或最近作用域内的命名组件句柄。

## 11. 数据源与 reaction

### 11.1 数据源模型

```ts
export interface CompiledDataSourcePlan {
  readonly dataSourceId: DataSourceId;
  readonly publishTo: DataPath;
  readonly statusTo?: {
    readonly loading?: DataPath;
    readonly error?: DataPath;
  };
  readonly trigger: DataSourceTriggerPlan;
  readonly resource: ResourceProducerPlan;
  readonly refreshPolicy: RefreshPolicy;
  readonly concurrency: 'switch' | 'exhaust' | 'concat' | 'merge';
}
```

数据源不是特殊组件，而是绑定在作用域生命周期上的命名值生产者。

```ts
export type ResourceProducerPlan =
  | { readonly kind: 'computed'; readonly value: ValuePlan }
  | { readonly kind: 'request'; readonly requestPlanId: RequestPlanId };

export type DataSourceTriggerPlan =
  | { readonly kind: 'mount'; readonly immediate: boolean }
  | { readonly kind: 'manual' }
  | { readonly kind: 'polling'; readonly intervalMs: number }
  | { readonly kind: 'dependency-driven'; readonly watch: ExpressionId };

export interface RefreshPolicy {
  readonly retry?: RetryPolicy;
  readonly dedupe?: 'none' | 'by-trigger' | 'by-request-fingerprint';
}
```

### 11.2 数据源运行时

```ts
export interface DataSourceRuntime extends ReactiveConsumer {
  readonly kind: 'datasource';
  refresh(reason: RefreshReason): Promise<void>;
  suspend(): void;
  resume(): void;
}
```

### 11.3 reaction 模型

```ts
export interface CompiledReactionPlan {
  readonly reactionId: ReactionId;
  readonly watch: ExpressionId;
  readonly when?: ExpressionId;
  readonly fire: ActionId;
  readonly distinctUntilChanged: boolean;
  readonly triggerOnMount: boolean;
  readonly emit: 'current' | 'prev-current';
  readonly concurrency: 'switch' | 'exhaust' | 'concat' | 'merge';
  readonly flushPhase: 'reaction' | 'datasource-refresh';
}
```

reaction 与数据源共享同样的依赖收集和失效框架，只是失效后动作不同。

## 12. 表单系统设计

### 12.1 表单是专用运行时，不是普通容器标签

表单之所以需要独立运行时，是因为它不仅要存值，还要维护：

1. dirty
2. touched
3. submit status
4. validation graph
5. draft isolation

```ts
export interface FormRuntime {
  readonly formId: string;
  readonly scope: ScopeFrame;
  readonly valuesPath: DataPath;
  readonly state: FormStateSnapshot;
  patchValues(patch: ScopePatch): PatchResult;
  markTouched(path: DataPath): void;
  validate(request?: ValidationRequest): Promise<ValidationResult>;
  submit(action?: ActionId): Promise<ActionOutcome>;
  createDraft(path: DataPath): DraftSession;
}
```

表单元数据统一投影到保留命名空间 `$form.<formId>`，例如 `$form.userForm.dirty`、`$form.userForm.errors.name`。这保证表单状态进入同一依赖图，而不是另起一套响应式系统。

### 12.2 校验图

```ts
export interface CompiledValidatorProgram {
  readonly validatorId: ValidatorId;
  readonly ownerPath: DataPath;
  readonly level: 'field' | 'object' | 'array';
  readonly syncRules: readonly ValidationRulePlan[];
  readonly asyncRules: readonly AsyncValidationRulePlan[];
  readonly triggers: readonly ValidationTrigger[];
  readonly dependencies: readonly ExpressionId[];
}
```

```ts
export interface ValidationRequest {
  readonly target: { readonly kind: 'path' | 'subtree' | 'form'; readonly path?: DataPath };
  readonly displayPolicy: 'silent' | 'interactive' | 'submit';
}

export interface ValidationExecution {
  readonly validationRunId: string;
  cancel(): void;
}
```

v4 明确把校验从组件事件里剥离出来，放入独立校验图。这样才能支持部分校验、条件规则、可取消异步校验、草稿模式。

### 12.3 草稿隔离

草稿不是简单“临时对象”。草稿是子作用域 + 子表单运行时 + 延迟提交协议：

```ts
export interface DraftSession {
  readonly draftId: string;
  readonly draftScope: ScopeFrame;
  readonly form: FormRuntime;
  readonly baseRevision: number;
  commit(): Promise<DraftCommitOutcome>;
  rollback(): void;
}

export type DraftCommitOutcome =
  | { readonly kind: 'committed'; readonly patch: PatchResult }
  | { readonly kind: 'conflicted'; readonly baseRevision: number; readonly currentRevision: number }
  | { readonly kind: 'rejected'; readonly reason: string }
  | {
      readonly kind: 'replay-required';
      readonly fromRevision: number;
      readonly toRevision: number;
    };
```

草稿提交必须先校验，再检查与父作用域的 revision 冲突，再决定合并、拒绝或重放，不能假定永远同步成功。草稿创建时记录 `parentScope.revision` 到 `baseRevision`。

## 13. 表面系统设计

### 13.1 统一表面模型

```ts
export interface SurfaceRuntime {
  readonly surfaceId: string;
  readonly type: 'dialog' | 'drawer';
  readonly scope: ScopeFrame;
  readonly state: 'opening' | 'active' | 'closing' | 'closed';
  close(result?: unknown): Promise<void>;
}

export interface SurfaceManager {
  readonly stack: readonly SurfaceRuntime[];
  open(plan: SurfaceOpenRequest): Promise<SurfaceHandle>;
  closeTop(result?: unknown): Promise<void>;
  active(): SurfaceRuntime | undefined;
}

export interface SurfaceHandle {
  readonly runtime: SurfaceRuntime;
  readonly closed: Promise<SurfaceResult>;
}
```

表面始终拥有独立作用域，不复用页面作用域。父级只通过显式参数或提交结果交互。

只有 `active()` 表面接收焦点和键盘事件。顶层表面关闭后，前一个栈顶自动恢复 `active`。`closing` 阶段不再接受新的用户写入，但允许完成关闭动作链。

## 14. 集合、循环与递归

### 14.1 高性能集合渲染

行级环境采用“隔离 + 投影”模型：

```ts
export interface CollectionItemScopePlan {
  readonly visibility: { readonly kind: 'projected'; readonly projection: ScopeProjectionPlan };
  readonly inject: {
    readonly itemAs: string;
    readonly indexAs: string;
    readonly projectedParentPaths?: readonly DataPath[];
  };
}
```

这让每一行都拥有稳定、可裁剪的局部依赖边界。

### 14.2 编译一次实例化多次

循环体和递归体只保留一个模板节点集，运行时只是重复创建 `NodeInstance + ScopeFrame + ConsumerSet`。这也是高性能和低内存占用的关键。

### 14.3 远程片段与激活语义

`visible` 只决定可见性，不决定生命周期参与。v4 另外定义 `activation`，用于控制子树是否挂载、是否创建作用域、是否启动数据源和 reaction。

```ts
export interface CompiledActivationPlan {
  readonly mode: 'eager' | 'lazy';
  readonly activeWhen?: ExpressionId;
  readonly gates: readonly ('scope' | 'validation' | 'reaction' | 'datasource' | 'render')[];
}
```

未激活节点不参与 `gates` 所列运行时单元；从 `inactive -> active` 时再实例化或恢复。

```ts
export interface RemoteFragmentPlan {
  readonly loadBy: RequestPlanId | ActionId;
  readonly cacheKey?: ValuePlan;
  readonly activation: 'lazy' | 'eager';
}
```

## 15. 宿主集成边界

### 15.1 静态 RendererEnv

v4 在这里不再引入新的 `HostBridge` facade，而是直接使用静态 `RendererEnv`。原因是：

1. `requirements.md` 已经明确 Flux 会以嵌入式方式运行在大型 React 宿主里。
2. 用户进一步明确 `RendererEnv` 是静态的，不会变化。
3. 能直接使用的宿主能力应直接使用，不应在内核内部再包一层平行 facade。

方向性接口如下：

```ts
export interface RendererEnv {
  readonly fetcher: ApiFetcher;
  readonly notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  readonly navigate?: (to: string | number, options?: { replace?: boolean }) => void;
  readonly confirm?: (message: string, options?: unknown) => Promise<boolean>;
  readonly functions?: Record<string, (...args: any[]) => any>;
  readonly filters?: Record<string, (input: any, ...args: any[]) => any>;
  readonly importLoader?: ImportedLibraryLoader;
  readonly resolveImportUrl?: (
    schemaUrl: string,
    from: string,
    options?: Record<string, unknown>,
  ) => string;
  readonly monitor?: RendererMonitor;
}
```

所有副作用都必须经由 `Capability` 解析后，直接调用静态 `RendererEnv` 暴露的宿主能力。内核不直接碰全局网络、全局路由、全局 toast，也不在内部重包一层 effect facade。

### 15.2 稳定环境

宿主环境分成两层：

1. `RendererEnv` 是初始化时注入的稳定对象，用于提供长期不变能力。
2. 动态上下文通过显式数据注入进入根作用域，而不是替换 `RendererEnv` 引用。

这样能满足“宿主传入环境对象引用变化不应重建内部状态”，同时也明确：v4 不依赖运行期动态换 env。

### 15.3 嵌入式局部页面模型

根据 `requirements.md`，Flux 的典型落地方式是嵌入式执行局部页面，而不是总是接管整个应用。v4 必须显式支持两种入口：

1. router 命中某个宿主页面后，根据 URL 动态加载 JSON schema，再渲染得到局部页面。
2. 宿主直接给定 JSON schema 对象，再渲染得到局部页面。

这意味着：

1. `RuntimeTemplate` 针对的是一个局部 execution island。
2. 每个局部页面拥有自己的 root scope、resource/reaction sidecar、surface stack。
3. 不同局部页面之间不直接互相通信。
4. 如需与外部系统交互，只能通过静态 `RendererEnv` 能力和显式宿主投影完成。

### 15.4 域控件嵌入

域控件与 schema 内核之间只走两条通道：

1. 只读快照以 namespace projection 暴露给表达式
2. 命名空间动作暴露可调用能力

```ts
export interface NamespaceCapabilityRegistry {
  register(namespace: string, provider: NamespaceProvider): Unsubscribe;
  resolve(namespace: string, method: string): NamespaceMethod | undefined;
}

export interface NamespaceContract {
  readonly namespace: string;
  readonly projections: readonly ProjectionFieldContract[];
  readonly methods: readonly NamespaceMethodContract[];
}
```

域控件内部状态机绝不直接泄露到 schema 世界。它仍然属于宿主私有对象，不进入 schema-visible scope，也不进入新的 runtime facade。

## 16. 工具与诊断

### 16.1 调试索引

```ts
export interface DebugIndex {
  readonly nodeToSource: ReadonlyMap<NodeId, SourceLocation>;
  readonly nodeDomMarkers: ReadonlyMap<NodeId, string>;
  readonly expressionToSource: ReadonlyMap<ExpressionId, SourceLocation>;
}
```

### 16.2 运行时检查接口

```ts
export interface RuntimeInspector {
  inspectNode(nodeId: NodeId): NodeInspection;
  inspectScope(scopeId: ScopeId): ScopeInspection;
  inspectForm(formId: string): FormInspection;
  inspectConsumers(nodeId?: NodeId): readonly ConsumerInspection[];
}
```

### 16.3 诊断原则

编译器应优先发现：

1. 无效路径引用
2. 不存在的组件类型
3. 不存在的动作名
4. 命名空间契约不匹配
5. slot 参数不匹配
6. 校验规则与值类型冲突
7. i18n key 前缀不匹配
8. 请求/响应 shape 与契约不匹配

## 17. 扩展模型

### 17.1 四类扩展点

1. Renderer Extension
2. Action Extension
3. Namespace Capability Extension
4. Value/Validator Function Extension

这四类扩展点必须继续服从 Flux VM 可扩展性边界：

1. 它们是执行最终模型的最小扩展面。
2. 它们不是整个平台的主扩展机制。
3. 大部分结构级变化应在 loader/assembly 层完成，不应回流到 runtime surface。

### 17.2 平台核心不允许的扩展方式

1. 全局可变单例注入
2. 任意运行时代码字符串执行
3. 绕过作用域解析的全局动作查找
4. 组件私有 store 直接被 schema 表达式读取

一个先进内核必须限制扩展边界，否则系统复杂度会快速坍塌。

## 18. 核心逻辑如何组织

这是整个设计最关键的部分。

### 18.1 启动流程

1. 输入原始 schema、组件注册表、动作注册表、命名空间契约、i18n 资源、静态 `RendererEnv`。
2. 若 schema 不是 Final Execution Schema，必须先在 loader/assembly 边界完成装配；运行时只消费 final schema。
3. 编译器执行：规范化、i18n 替换、值分类、表达式编译、类型推断、节点建模、区域提取、请求计划构建、校验图构建、动作程序编译、诊断生成。
4. 得到 `RuntimeTemplate`。
5. 实例工厂创建根 `ScopeFrame`。
6. 根据模板创建根 `NodeInstance` 和其附属运行时单元。
7. 注册数据源、reaction、校验器等消费者。
8. 挂载渲染适配器。

### 18.2 单次读取流程

1. 渲染器请求节点的某个 prop。
2. 节点实例触发相应 `BoundValuePlan` 计算。
3. 计算期间通过 `EvaluationContext.resolve()` 读路径。
4. 依赖收集器记录这些路径。
5. 结果写入消费者缓存。
6. 若与旧值相等，复用旧引用。

### 18.3 单次写入流程

1. 用户输入或动作执行产生 `ScopePatch`。
2. 目标 `ScopeFrame.patch()` 计算变更路径集。
3. 响应式内核根据变更路径检索受影响消费者。
4. 调度器按固定相位推进：`write-commit -> pure-recompute -> validation -> reaction -> datasource-refresh -> datasource-publish -> render-notify`。
5. 每个异步消费者都绑定 `runId`，只允许最新结果提交。
6. 重新收集依赖并更新缓存。

### 18.4 动作执行流程

1. 事件处理器触发 `ActionProgram`。
2. 执行器创建根 action frame。
3. 先执行 guard，若不满足则产出 `skipped`。
4. 若继续，解析动作名并执行 dispatch 或并发节点。
5. 根据 outcome 进入 `then` 或 `onError`，并刷新 `result/prevResult/error` 绑定。
6. `finally` 永远执行。
7. 所有读都走 scope，所有副作用都走 capability，最终直接调用静态 `RendererEnv` 提供的宿主能力。

### 18.5 数据源刷新流程

1. 数据源初次挂载时运行一次或按策略等待。
2. 若是 request 型资源，先解析 `CompiledRequestPlan`，完成 URL、query、headers、body、scope injection、response adapter 计算。
3. 运行 resource producer 时自动记录依赖。
4. 依赖路径变化时，数据源被精确失效。
5. 调度器根据 `manual/polling/dependency-driven` 与并发策略刷新。
6. 发起网络请求时直接调用静态 `RendererEnv.fetcher`。
7. 成功后向目标路径发布数据及 loading/error 状态。
8. 由自身发布导致的写入通过 `producerId` 与 `causationId` 共同抑制回流。

### 18.6 为什么这种组织方式更先进

因为它把系统复杂性组织成“模板、实例、依赖、能力”四个正交维度，而不是把所有东西揉成一个 UI 组件树加一堆 ad-hoc store：

1. 模板决定结构。
2. 实例决定生命周期。
3. 依赖决定增量更新。
4. 能力决定副作用边界。

四者分离后，性能优化、工具化、跨框架渲染、域控件嵌入、静态诊断、局部重算都能自然成立。

## 19. 与需求逐项对齐的设计结论

1. Schema 解析与编译
   通过 `RuntimeTemplate + NodePlan + ValuePlan` 满足。

2. 表达式引擎
   通过 `CompiledExpression + EvaluationContext` 满足，且无动态代码生成。

3. 词法数据环境
   通过 `ScopeFrame` 图、`inherit/isolated/projected` 三模式和显式写入矩阵满足。

4. 依赖追踪与响应式更新
   通过统一 `ReactiveConsumer` 模型、结构依赖选择器、调度相位和循环治理满足。

5. 渲染与组件系统
   通过 `RendererRegistry + RendererInput + RegionHandle + $slot` 语义满足。

6. 动作系统与控制流
   通过 `CompiledActionProgram + ActionFlowNode + ActionExecutor` 满足。

7. 三层动作解析
   通过固定 `ActionResolver` 顺序满足。

8. 表单与校验
   通过 `FormRuntime + ValidatorGraph + ValidationExecution + DraftSession` 满足。

9. API 与数据源
   通过 `CompiledRequestPlan + RendererEnv + DataSourceRuntime + ReactionRuntime` 满足。

10. 表面对话系统
    通过 `SurfaceManager + SurfaceRuntime` 满足。

11. 表格与集合
    通过 `isolated + projection` 的行级作用域满足。

12. 循环与递归
    通过“一次编译，多次实例化”的实例图模型满足。

13. 宿主集成
    通过静态 `RendererEnv`、命名空间能力注册和静态命名空间契约满足。

14. 安全、性能、可测试性
    通过无动态代码、静态模板、路径级失效、结构依赖、相位调度、UI 框架无关内核满足。

## 20. 最终判断

这个 v4 方案在符合 Flux 原则后的根本主张是：

1. 下一代低代码核心框架不应以前端组件树为中心，而应以编译后的执行模板为中心。
2. 下一代响应式系统应尽量统一 `Value`、`Resource`、`Reaction` 的依赖模型，但不应为统一而打破 Flux 七原语闭包。
3. 下一代扩展模型不应靠 runtime surface 膨胀，而应坚持 Final Execution Schema、最小运行时扩展面和显式契约。
4. 下一代复杂域控件集成不应把内部状态暴露给 schema，而应只暴露只读投影和命令能力。
5. 下一代嵌入式 Flux 运行时应把每个局部页面视为独立 execution island，通过静态 `RendererEnv` 与宿主衔接，而不是在 runtime 内部继续包更多 facade。

如果把低代码运行时视作一种声明式程序执行机，那么这个 v4 设计不是“页面渲染库”，而是一个专门为 Final Execution Schema 设计的增量执行内核。它的先进性不在于 API 数量，而在于在不打破 Flux 原则和嵌入式宿主边界的前提下，尽量把复杂性组织得足够严格，以至于复杂性可以长期被控制。
