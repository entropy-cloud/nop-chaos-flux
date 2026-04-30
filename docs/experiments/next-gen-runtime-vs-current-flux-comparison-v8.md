# v8 设计 vs 当前 Flux 实现 — 对比分析

> **文档性质**: 将从零设计的 v8 架构与当前 nop-chaos-flux 项目的实际实现进行逐层对比，识别差异、评估取舍、提出融合建议。
>
> **对比基础**: v8 设计仅基于需求文档和设计原则，不参考当前实现。当前实现基于相同的需求和原则，但经过多轮迭代。

---

## 0. 总体判断

**v8 设计与当前 Flux 实现在架构方向上高度一致**——它们遵循相同的六条设计原则，采用相同的分层策略（编译 → 运行时 → 渲染）。这不是巧合，而是相同原则驱动下的趋同演化。

**核心差异不在方向上，而在形式化程度和实现深度上**：

| 维度     | v8 设计              | 当前实现             | 差异本质     |
| -------- | -------------------- | -------------------- | ------------ |
| 形式化   | 严格、显式、理论完备 | 务实、隐式、经验驱动 | 学术 vs 工程 |
| 规范覆盖 | 全面但抽象           | 部分但具体           | 广度 vs 深度 |
| 边界定义 | 接口即约束           | 实现即规范           | 设计 vs 代码 |

---

## 1. 编译管线

### 1.1 阶段对比

| 阶段               | v8                  | Flux 现状                                | 差异                             |
| ------------------ | ------------------- | ---------------------------------------- | -------------------------------- |
| Stage 1: Parse     | 显式解析阶段        | 隐式（JSON 直接作为输入）                | Flux 不区分 parse 和 compile     |
| Stage 2: Transform | i18n/权限/继承/片段 | i18n 在编译时处理，权限裁剪由外部完成    | Flux 缺少形式化的 Transform 阶段 |
| Stage 3: Compile   | `ExecutionPackage`  | `CompiledTemplate` → `TemplateNode`      | 概念等价，命名不同               |
| Stage 4: Diagnose  | 独立诊断阶段        | 诊断嵌入编译过程（`CompileSymbolTable`） | Flux 的诊断更早但不够独立        |

**关键差异**：

v8 的 Transform 阶段（继承合并、权限裁剪、片段组合）在当前 Flux 中**未形式化**。当前实现中，`x:extends` 继承和 `$ref` 引用由外部系统在 schema 进入编译之前完成。这意味着 Flux 的编译器接收到的 schema 已经是"最终形态"，不处理编写态变换。

**评估**：当前 Flux 的做法更务实——编译器只关注编译，不关注编写态操作。但这也意味着编写态操作缺乏统一框架。v8 的形式化 Transform 阶段是一个**架构前瞻**，为未来的编写态操作提供扩展点。

### 1.2 编译产物对比

| 产物     | v8                                               | Flux 现状                                                   | 对应关系                                       |
| -------- | ------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------- |
| 执行节点 | `ExecutionNode`                                  | `TemplateNode`                                              | 概念等价                                       |
| 值 IR    | `ValueIR` (Static/Dynamic/Resource/Slot)         | `CompiledRuntimeValue` (StaticValueNode / DynamicValueNode) | 概念等价，Flux 的 RuntimeValueState 树更细粒度 |
| 表达式表 | `ExpressionTable` (全局 id → CompiledExpression) | 每个值节点内嵌编译后的 AST                                  | v8 的全局表设计更利于共享                      |
| 区域     | `RegionIR` + `TemplateIR`                        | `TemplateRegion`                                            | 概念等价                                       |
| 动作     | `ActionDAG`                                      | `CompiledActionProgram`                                     | 概念等价                                       |
| 校验     | `ValidationGraph`                                | `CompiledFormValidationModel`                               | 概念等价，Flux 更成熟                          |

**关键差异**：

v8 的 `ExpressionTable` 将所有表达式收集到一个全局表中，通过整数 ID 引用。当前 Flux 的每个 `CompiledRuntimeValue` 内嵌自己的编译结果。

**评估**：v8 的全局表设计在循环/递归场景中更有优势——模板只编译一次，多个实例共享同一个表达式。当前 Flux 的 `repeatedTemplates` 机制实现了类似效果，但不是通过全局表，而是通过模板共享。

---

## 2. 表达式引擎

### 2.1 语言能力对比

| 能力         | v8                           | Flux 现状 (flux-formula)       | 评估               |
| ------------ | ---------------------------- | ------------------------------ | ------------------ |
| 基础运算     | 算术/比较/逻辑               | 算术/比较/逻辑/位运算          | Flux 更完整        |
| 条件表达式   | 三元 `? :`                   | 三元 + `if()`                  | 等价               |
| 空值合并     | `??`                         | `??`                           | 等价               |
| 可选链       | 未提及                       | `?.`                           | Flux 有，v8 未明确 |
| 箭头函数     | 未提及                       | 支持 `x => x + 1`              | Flux 更强          |
| 管道过滤     | `value \| filter:arg`        | `value \| filter:arg`          | 等价               |
| 自定义函数   | `ExpressionFunctionRegistry` | `registerFunction(name, fn)`   | 等价               |
| 命名空间     | 未提及                       | `Math.xxx`, `Date.xxx` 等      | Flux 更具体        |
| 静态求值优化 | 提及但未详述                 | `evaluateStaticAst()` 完整实现 | Flux 更成熟        |

**关键差异**：

Flux 的表达式语言更接近 JavaScript（支持箭头函数、可选链、instanceof 等），而 v8 的表达式语言是一个更受限的 DSL。

**评估**：Flux 的选择是**正确的**。一个 JS-like 表达式语言降低了学习成本，同时通过受控的编译/求值路径（而非 `eval`/`new Function`）保证安全性。v8 的保守语法设计反而可能在实际使用中遇到表达力不足的问题。

### 2.2 依赖收集对比

| 维度     | v8                                          | Flux 现状                                      | 差异               |
| -------- | ------------------------------------------- | ---------------------------------------------- | ------------------ |
| 收集时机 | AST evaluator 中的 `tracker.recordRead()`   | Proxy 拦截 scope 属性访问                      | 方法不同，效果等价 |
| 收集粒度 | 路径级（`"user.name"`）                     | 路径级 + wildcard + broadAccess                | Flux 更精细        |
| 前缀匹配 | 明确要求（写入 `user` 使 `user.name` 失效） | `scopeChangeHitsDependencies()` 实现了类似逻辑 | 等价               |
| 依赖 GC  | v8 明确提出"原子替换时清理反向索引"         | Flux 通过 `ScopeDependencySet` 替换实现        | 等价               |

**关键差异**：Flux 使用 Proxy 拦截实现依赖收集，这是一种更透明的机制——表达式代码不需要显式调用 `tracker.recordRead()`。但 Proxy 机制有运行时开销（每次属性访问经过 Proxy trap）。

**评估**：两种方案各有优劣。Proxy 更透明但开销更大。v8 的显式 tracker 更高效但要求所有数据访问必须经过 tracker。Flux 的 `ScopeDependencyCollector` 实际上结合了两种思路——在受控的求值环境中使用 Proxy，而非全局 Proxy。

---

## 3. 词法数据环境

### 3.1 模型对比

| 维度     | v8                                     | Flux 现状                                                                         | 差异                      |
| -------- | -------------------------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| 继承模型 | 显式 Scope 树 + parent 链              | 混合模型（prototype chain 用于 readVisible 视图，显式 parent 遍历用于 path 解析） | 效果等价，Flux 实现更复杂 |
| 隔离机制 | `ScopeOptions.isolated`                | `ScopePlan.kind = 'repeated-item'`                                                | 概念等价                  |
| 投影机制 | `projections: Record<string, ValueIR>` | 无显式投影机制                                                                    | **v8 更强**               |
| 路径缓存 | 提出路径解析缓存                       | 无缓存                                                                            | **v8 更优**               |
| 生命周期 | `dispose()` + `ScopePool`              | `disposeScope()` 清理 data source                                                 | Flux 有清理但无池化       |
| 写入保护 | `ScopeWriteAccess` 分离接口            | 写入通过 `FormRuntime.setValue()` 等方法                                          | 目标相同，机制不同        |

**关键差异 1：显式投影**

v8 的 `projections` 机制在隔离 Scope（如表格行）中非常重要——它要求隔离 Scope 访问外部数据时必须**显式声明**。当前 Flux 的表格行 Scope 通过 prototype chain 继承父 Scope，行内表达式可以直接读取任何页面级数据。但 Flux 已有部分投影能力——`projected-scope-store.ts` 和 `RendererRuntime.createHostProjectionScope()` 提供了域控件向子 Scope 投影数据的机制。只是这个能力尚未应用于表格行隔离场景。

**评估**：v8 的显式投影是**理论上更优的设计**——它消除了隐式宽依赖，使依赖图更精确。但实际工程中，这增加了 schema 编写者的负担。Flux 的隐式继承虽然可能导致不必要的重渲染，但更易用。两者可以在已有投影基础设施上逐步融合。

**关键差异 2：ScopePool**

v8 的 `ScopePool` 用于虚拟滚动场景中复用 Scope。当前 Flux 没有这个优化。

**评估**：`ScopePool` 是一个合理的性能优化，当前 Flux 在大规模表格场景中可能遇到内存压力。但这需要实际性能测试来验证是否必要。

### 3.2 变更传播对比

| 维度          | v8                                    | Flux 现状                            | 差异                  |
| ------------- | ------------------------------------- | ------------------------------------ | --------------------- |
| 传播模型      | `ChangePropagator` + 跨 Scope 订阅    | Scope store `subscribe()` + 依赖过滤 | Flux 更简单           |
| 跨 Scope 传播 | 显式 `childDeps` 索引                 | prototype chain 变更自动冒泡         | Flux 依赖 JS 原生机制 |
| settle 语义   | 正式 Settled Update Turn              | 无显式 settle 概念                   | **v8 更强**           |
| 批处理        | `batch(fn)` + microtask               | 无显式批处理                         | **v8 更强**           |
| 级联保护      | `maxTurnDepth` + CascadeOverflowError | Reaction 有 fire count limit (10)    | 机制不同，目标相同    |

**关键差异**：

v8 有一个正式的 `SettleController`，定义了"一轮更新"的边界——何时开始、何时结束、如何处理级联。当前 Flux 没有这个概念——依赖变更通过 Zustand store 的 subscribe 机制直接传播，React 的 `useSyncExternalStore` 负责调度重渲染。

**评估**：v8 的 settle 模型在**理论上是更严谨的**。它明确定义了更新边界，使得级联写入、Resource 刷新、Reaction 触发的时序可预测。当前 Flux 依赖 React 的调度器来隐式处理这些时序问题，在大多数场景下工作正常，但在复杂级联场景中可能难以调试。

然而，v8 的 settle 模型也带来了**实现复杂度**——需要自行管理调度、批处理和级联检测，而 Flux 借助 React 的调度器（并发模式、transition 等）免费获得了这些能力。

---

## 4. 响应式系统

### 4.1 三类消费者对比

| 消费者   | v8                             | Flux 现状                            | 差异                  |
| -------- | ------------------------------ | ------------------------------------ | --------------------- |
| Value    | Pull-based, lazy 重求值        | Pull-based, `evaluateWithState()`    | 等价                  |
| Resource | Push-triggered, settle 时刷新  | `DataSourceController` + 依赖订阅    | 概念等价，Flux 更成熟 |
| Reaction | Deferred 执行（不在当前 Turn） | `ReactionRuntime` + fire count limit | v8 的 deferred 更安全 |

**关键差异**：v8 明确区分了三类消费者的**触发后果**和**触发时机**。当前 Flux 的实现将 Resource 和 Reaction 混在同一个订阅模型中（scope store subscribe），区别主要体现在具体的处理逻辑上。

**评估**：v8 的三类消费者模型是一个**更清晰的概念框架**。当前 Flux 的实现虽然功能上等价，但概念边界不够清晰。

### 4.2 失效与缓存对比

| 维度     | v8                     | Flux 现状                               | 差异                   |
| -------- | ---------------------- | --------------------------------------- | ---------------------- |
| 失效检测 | 反向索引 + 前缀匹配    | `scopeChangeHitsDependencies()`         | 实现方式不同，目标等价 |
| 缓存     | `EvalCache` + 引用稳定 | `ValueEvaluationResult.reusedReference` | 等价                   |
| 树级缓存 | 全局表达式缓存         | `RuntimeValueStateNode` 递归树          | Flux 更细粒度          |
| 引用复用 | 声明为不变量           | `shallowEqual` 检查 + 引用保持          | 等价                   |

**关键差异**：Flux 的 `RuntimeValueStateNode` 是一个递归树结构（Object → entries, Array → items），可以对嵌套对象的子属性进行独立的变更检测和引用保持。v8 的缓存模型更扁平。

**评估**：Flux 的树级缓存是**更优的实现**——对于一个包含 20 个字段的对象，只变更 1 个字段时，其他 19 个字段的引用可以保持不变。这在深层嵌套 schema 中有显著的性能优势。

---

## 5. 动作系统

### 5.1 模型对比

| 维度       | v8                                            | Flux 现状                                          | 差异                   |
| ---------- | --------------------------------------------- | -------------------------------------------------- | ---------------------- |
| 编译产物   | `ActionDAG` (5 种节点类型)                    | `CompiledActionProgram` (CompiledActionNode 链)    | 概念等价               |
| 顺序执行   | `SequentialAction`                            | `then: ActionSchema[]`                             | 等价                   |
| 条件执行   | `ConditionalAction`                           | `when: string` 守卫                                | 等价                   |
| 并行执行   | `ParallelAction` + 3 种策略                   | `parallel: ActionSchema[]`                         | **v8 更强** (3 种策略) |
| 错误处理   | `AggregateActionResult`                       | `onError` 链                                       | v8 更形式化            |
| 重试       | `RetryAction` + backoff 策略                  | `control.retry` 配置                               | 等价                   |
| 超时       | `timeoutMs`                                   | `control.timeout`                                  | 等价                   |
| 防抖       | `debounceMs`                                  | `control.debounce`                                 | 等价                   |
| 结果上下文 | `ActionContext { result, error, prevResult }` | `evaluationBindings { result, error, prevResult }` | 等价                   |

**关键差异**：

v8 的 `ParallelAction` 有 3 种明确的并行策略（`all`、`race`、`allSettled`），每种有不同的错误语义和取消行为。注意这与 Flux 的 `RequestDedupStrategy`（cancel-previous/parallel/ignore-new）解决的是**不同问题**——前者控制 Action DAG 分支的执行语义，后者控制 HTTP 请求的生命周期去重。当前 Flux 的动作并行执行是简单的 `Promise.all`，在动作层面的细粒度控制不如 v8。

**评估**：v8 的并行策略设计更完善。当前 Flux 在并行执行上的简化在大多数场景下足够，但在复杂场景（如"先到先得"或"部分成功"）中力不从心。

### 5.2 动作解析对比

| 维度          | v8                               | Flux 现状                                                     | 差异          |
| ------------- | -------------------------------- | ------------------------------------------------------------- | ------------- |
| 解析顺序      | component → namespace → builtin  | when 检查 → parallel → builtin switch → component → namespace | 顺序不同      |
| 组件动作      | `ComponentHandleRegistry`        | `ComponentHandleRegistry` + `capabilities.invoke()`           | 等价          |
| 命名空间      | `NamespaceRegistry` (Scope 关联) | `ActionScope` (层次化) + `xui:imports`                        | Flux 更成熟   |
| 内置动作      | 15+ 列表                         | switch-case 分发                                              | 等价          |
| ActionAdapter | 无（直接访问）                   | `ActionRuntimeAdapter` 接口解耦                               | **Flux 更优** |

**关键差异**：Flux 的 `ActionRuntimeAdapter` 将动作执行与运行时内部解耦——`flux-action-core` 包不直接依赖 `flux-runtime`，而是通过 adapter 接口交互。v8 没有这个分离。

**评估**：Flux 的 `ActionRuntimeAdapter` 是一个**更好的架构实践**。它使得动作派发核心可以独立测试和独立演进。

### 5.3 AJAX 请求对比

| 维度       | v8                                  | Flux 现状                                   | 差异               |
| ---------- | ----------------------------------- | ------------------------------------------- | ------------------ |
| 请求执行   | 宿主 `httpClient` 委托              | `env.fetcher` 委托                          | 等价               |
| 作用域注入 | `scopeInjection.mappings`           | API schema 的动态参数                       | 机制不同，目标等价 |
| 适配器     | adaptor/requestAdaptor (表达式引擎) | requestAdaptor/responseAdaptor (表达式引擎) | 等价               |
| 缓存       | 未详细说明                          | TTL 缓存 + dedup 策略                       | **Flux 更成熟**    |
| 去重       | 未详细说明                          | cancel-previous / parallel / ignore-new     | **Flux 更成熟**    |

**评估**：Flux 在 API 请求方面的实现比 v8 的设计更成熟——缓存、去重、合并策略等都有具体实现。v8 在这方面只定义了接口，缺少具体的策略定义。

---

## 6. 渲染系统

### 6.1 协议对比

| 维度     | v8                                            | Flux 现状                                          | 差异            |
| -------- | --------------------------------------------- | -------------------------------------------------- | --------------- |
| 渲染接口 | `RenderSnapshot` (纯数据)                     | `RendererComponentProps` (含 React 组件类型)       | v8 更抽象       |
| 宿主适配 | `HostAdapter` (scheduleUpdate, onUnmount)     | React Context + Hooks                              | v8 更通用       |
| 组件注册 | `RendererRegistry` (type → RendererComponent) | `RendererRegistry` (type → RendererDefinition)     | Flux 更丰富     |
| 字段分类 | v8 未明确                                     | `SchemaFieldRule` (meta/prop/region/event/ignored) | **Flux 更完善** |

**关键差异**：

当前 Flux 的 `RendererDefinition` 比简单的组件映射更丰富——它包含 `regions`、`fields`、`scopePolicy`、`validation` 等元信息，指导编译器如何处理该类型的 schema 节点。v8 的 `RendererRegistry` 只是一个简单的 type → component 映射。

**评估**：Flux 的 `RendererDefinition` 是一个**更实用的设计**。它将"如何编译"和"如何渲染"的元信息集中在一个地方，使得添加新组件时不需要修改编译器。v8 的设计假设这些信息由编译器内置逻辑处理，扩展性较差。

### 6.2 渲染器 Props 对比

| 字段    | v8 `RenderSnapshot`                              | Flux `RendererComponentProps`                  | 对应                     |
| ------- | ------------------------------------------------ | ---------------------------------------------- | ------------------------ |
| props   | `props: Record<string, unknown>`                 | `props: Record<string, unknown>`               | 等价                     |
| meta    | `meta: { visible, disabled, className, testid }` | `meta: ResolvedNodeMeta`                       | 等价                     |
| regions | `regions: Record<string, RegionRenderHandle>`    | `regions: Record<string, RenderRegionHandle>`  | 等价                     |
| events  | `events: Record<string, Function>`               | `events: Record<string, RendererEventHandler>` | 等价                     |
| helpers | 无                                               | `helpers: RendererHelpers`                     | **Flux 额外提供**        |
| schema  | 无                                               | `schema: S`                                    | **Flux 保留原始 schema** |
| node    | 无                                               | `node: NodeInstance<S>`                        | **Flux 提供运行时实例**  |

**关键差异**：Flux 的 `RendererComponentProps` 额外提供了 `helpers`（render、evaluate、dispatch 等工具方法）、原始 `schema` 和运行时 `node` 实例。v8 的 `RenderSnapshot` 更精简。

**评估**：这反映了两种设计哲学的差异。v8 追求极简接口——渲染器只接收已求值的快照，不直接访问运行时。Flux 追求实用性——渲染器可以通过 `helpers` 执行运行时操作（如动态创建子区域、派发动作等），这在复杂组件中非常有用。

**融合建议**：v8 的 `RenderSnapshot` 加上 Flux 的 `helpers` 是最优组合——快照保持纯数据，helpers 提供受控的运行时访问。

---

## 7. 表单与校验

### 7.1 FormRuntime 对比

| 能力     | v8                            | Flux 现状                                                         | 差异            |
| -------- | ----------------------------- | ----------------------------------------------------------------- | --------------- |
| 值管理   | getValues/setFieldValue/reset | setValue/setValues/append/prepend/insert/remove/move/swap/replace | **Flux 更丰富** |
| 脏状态   | getDirtyFields/isDirty        | isDirty/isTouched per field                                       | 等价            |
| 提交     | submit() + validate           | submit(api?, options?) + full validation                          | 等价            |
| 数组操作 | 无                            | append/prepend/insert/remove/move/swap/replace                    | **Flux 独有**   |
| 草稿隔离 | DraftScope (commit/discard)   | 无显式草稿隔离                                                    | **v8 更强**     |
| 字段注册 | 无                            | 运行时字段注册 (registerField)                                    | **Flux 独有**   |

**关键差异**：

Flux 的 FormRuntime 在数组操作方面非常丰富（append、insert、remove、move、swap 等），这对动态表单场景至关重要。v8 的 FormRuntime 缺少这些操作。

v8 的 `DraftScope` 是 Flux 缺少的能力——它允许子表单独立编辑和校验，提交时才合并到父表单。

**评估**：两者互补。Flux 在具体操作上更完善，v8 在隔离模型上更先进。

### 7.2 校验模型对比

| 维度         | v8                             | Flux 现状                                                                   | 差异            |
| ------------ | ------------------------------ | --------------------------------------------------------------------------- | --------------- |
| 规则类型     | Field/Object/Array/Conditional | required/minLength/maxLength/pattern/email/equalsField/async/... (15+ 内置) | Flux 更丰富     |
| 跨字段校验   | ObjectRule (表达式)            | requiredWhen/atLeastOneFilled/allOrNone + 自定义表达式                      | 等价            |
| 条件校验     | ConditionalRule                | requiredUnless/requiredWhen                                                 | 等价            |
| 异步校验     | 提及但未详述                   | 完整实现 + AbortController 取消                                             | **Flux 更成熟** |
| 校验时机     | submit/change/blur             | validateOn (可组合) + showErrorOn (独立配置)                                | Flux 更灵活     |
| 隐藏字段策略 | 无                             | HiddenFieldPolicy (skip/preserve/clear)                                     | **Flux 独有**   |

**评估**：Flux 的校验系统在实际工程中经过大量迭代，远比 v8 的设计更完善。特别是 `showErrorOn` 的独立配置（何时显示错误）和 `validateOn` 的分离（何时触发校验），这是实际用户需求驱动的结果。

---

## 8. 数据源系统

### 8.1 Resource 对比

| 维度     | v8                                    | Flux 现状                                          | 差异            |
| -------- | ------------------------------------- | -------------------------------------------------- | --------------- |
| 类型     | ResourceValue (L4)                    | FormulaDataSource / ActionDataSource               | 等价            |
| 刷新策略 | manual / polling / onDependencyChange | manual / polling (interval) / formula-based (自动) | 等价            |
| 竞态处理 | 取消进行中请求 + 重置 debounce        | cancel-previous / parallel / ignore-new 去重策略   | **Flux 更丰富** |
| 缓存     | 未详细说明                            | TTL 缓存                                           | **Flux 有**     |
| 合并策略 | 未详细说明                            | replace/append/prepend/merge/upsert                | **Flux 更丰富** |
| 生命周期 | Mount/Unmount 自动管理                | `SourceRegistry.disposeScope()` 自动管理           | 等价            |
| 自写保护 | 显式声明                              | 通过 AsyncGovernance 跟踪                          | 等价            |
| 依赖排序 | 拓扑序                                | 无显式排序                                         | **v8 更强**     |

**关键差异**：

Flux 的 DataSourceController 有 3 种去重策略（cancel-previous、parallel、ignore-new）和 5 种合并策略（replace、append、prepend、merge、upsert），以及 TTL 缓存。v8 在这些方面的设计是空白。

**评估**：Flux 在数据源方面的工程实践远超 v8 的设计。这些策略都是实际业务场景驱动的产物。v8 需要补充这些具体策略。

---

## 9. 表面对话系统

### 9.1 模型对比

| 维度       | v8                      | Flux 现状                                                 | 差异              |
| ---------- | ----------------------- | --------------------------------------------------------- | ----------------- |
| 表面类型   | dialog/drawer           | dialog/drawer/sheet                                       | Flux 多一个 sheet |
| 栈管理     | 栈式，只关栈顶          | 栈式（SurfaceStore entries）                              | 等价              |
| 独立 Scope | 每个 Surface 独立 Scope | 每个 Surface 独立 Scope + ActionScope + ComponentRegistry | **Flux 更完善**   |
| 结果传递   | `handle.getResult()`    | `closeDialog({ result })` → 外部 Promise                  | 等价              |
| 关闭非栈顶 | 抛出错误                | `close(surfaceId?)` 支持指定 ID                           | Flux 更灵活       |

**评估**：基本等价。Flux 的 Surface 系统在实际使用中已经成熟。

---

## 10. 领域控件嵌入

### 10.1 嵌入模型对比

| 维度       | v8                                  | Flux 现状                                                 | 差异                |
| ---------- | ----------------------------------- | --------------------------------------------------------- | ------------------- |
| 投影       | `DomainControlContract.projections` | 特定域控件各自处理                                        | v8 更统一           |
| 命名空间   | `NamespaceRegistry`                 | `ActionScope` + `xui:imports`                             | 等价                |
| 域私有通道 | `DomainBridge`                      | 各域控件自行管理                                          | v8 更形式化         |
| 类型契约   | `DomainTypeContract`                | `RendererHostContract`                                    | 等价                |
| 实际域控件 | 无（纯设计）                        | Flow Designer / Spreadsheet / Report / Word Editor (4 个) | **Flux 有实际实现** |

**关键差异**：Flux 已经有 4 个域控件的实际实现（flow-designer、spreadsheet、report-designer、word-editor），每个都是独立的包，有完整的组件和状态管理。v8 只有抽象契约。

**评估**：v8 的 `DomainControlContract` 是一个好的**抽象模型**，但 Flux 的实际实现验证了这些模式在真实场景中的可行性。抽象需要实践的验证。

---

## 11. 工程成熟度对比

### 11.1 v8 设计独有的优势

| 能力                 | 说明                                 | 对 Flux 的价值               |
| -------------------- | ------------------------------------ | ---------------------------- |
| SettleController     | 正式的更新边界和级联保护             | 解决复杂级联场景的调试难题   |
| 显式投影             | 隔离 Scope 访问外部数据必须声明      | 消除隐式宽依赖，提升表格性能 |
| ScopePool            | 虚拟滚动中的 Scope 复用              | 大数据集场景的内存优化       |
| 三类消费者分离       | Value/Resource/Reaction 概念边界清晰 | 改善代码可理解性             |
| ActionRuntimeAdapter | Flux 已有但 v8 未提及                | 反向——Flux 已实现            |
| 前缀匹配失效         | 正式的失效语义规范                   | 修正潜在的 stale data bug    |
| 多实例隔离           | 明确的独立 Runtime 实例语义          | 多实例嵌入场景               |
| $slot 参数访问       | 统一的区域参数命名空间               | 嵌套区域消歧义               |

### 11.2 Flux 现状独有的优势

| 能力                         | 说明                                                                                     | 对 v8 的启示                    |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| RendererDefinition           | 组件注册包含编译元信息                                                                   | v8 的 RendererRegistry 过于简单 |
| SchemaFieldRule              | 编译器通过字段规则分类 schema 属性                                                       | v8 缺少这个关键编译机制         |
| RuntimeValueStateNode 递归树 | 嵌套值的独立变更检测                                                                     | v8 的缓存模型过于扁平           |
| AsyncGovernanceStore         | 异步操作版本跟踪和竞态保护                                                               | v8 缺少这个关键安全机制         |
| DataSource 去重/合并策略     | 3 种去重 + 5 种合并                                                                      | v8 的 Resource 设计过于抽象     |
| FormRuntime 数组操作         | append/insert/remove/move/swap                                                           | v8 的表单模型缺少这些           |
| 验证时机分离                 | validateOn 与 showErrorOn 独立配置                                                       | v8 的校验触发模型不够灵活       |
| xui:imports                  | 动态库加载和命名空间注入                                                                 | v8 无此概念                     |
| Import Stack                 | `ImportStack` + 可推入/弹出的 `ImportFrame`，管理跨 Scope 导入生命周期                   | v8 无此概念                     |
| Plugin 系统                  | `RendererPlugin` 5 钩子（beforeCompile/afterCompile/wrapComponent/beforeAction/onError） | v8 无编译和运行时扩展机制       |
| FormRuntime 字段注册         | 运行时动态字段注册/注销（条件字段出现/消失）                                             | v8 无此概念                     |
| 错误监控                     | `ErrorMonitorPayload` + Plugin.onError 结构化错误报告                                    | v8 的 ErrorContext 更基础       |

---

## 12. 融合建议

### 12.1 从 v8 引入到 Flux

| 改进              | 优先级 | 理由                             | 实施难度                                  |
| ----------------- | ------ | -------------------------------- | ----------------------------------------- |
| SettleController  | **高** | 复杂级联场景的调试问题越来越频繁 | 中（需要修改 scope change 传播）          |
| 显式投影          | **高** | 表格行隐式继承导致的性能问题     | 高（需要修改所有使用表格行 scope 的代码） |
| 前缀匹配规范      | **高** | 防止 stale data bug              | 低（当前实现已有类似逻辑，需规范验证）    |
| ScopePool         | **中** | 大数据集表格的内存优化           | 中（需要与虚拟滚动集成）                  |
| DraftScope        | **中** | 子表单编辑和向导场景             | 中（需要新增概念）                        |
| 多实例隔离规范    | **低** | 当前基本可用，需要规范化         | 低（文档和测试为主）                      |
| Resource 拓扑排序 | **低** | 防止 Resource 间依赖导致的竞态   | 低（编译时分析，运行时排序）              |

### 12.2 Flux 已实现、v8 需补充

| 能力                      | v8 当前状态 | 需要补充                                        |
| ------------------------- | ----------- | ----------------------------------------------- |
| RendererDefinition 元信息 | 无          | 组件注册需包含编译指导信息                      |
| SchemaFieldRule 字段分类  | 无          | 编译器需要知道哪些字段是 region/event/meta/prop |
| RuntimeValueStateNode 树  | 扁平缓存    | 需要递归树结构支持嵌套值变更检测                |
| AsyncGovernanceStore      | 无          | 需要异步操作版本跟踪                            |
| DataSource 去重策略       | 无          | 需要定义 cancel-previous/parallel/ignore-new    |
| DataSource 合并策略       | 无          | 需要定义 replace/append/merge/upsert            |
| FormRuntime 数组操作      | 无          | 需要 append/insert/remove/move/swap             |
| xui:imports               | 无          | 需要动态库加载机制                              |
| Plugin 系统               | 无          | 需要编译和运行时扩展钩子                        |

---

## 13. 结论

### 13.1 核心判断

**v8 设计是当前 Flux 架构的"理论投影"——它在相同的六条原则驱动下，推导出了一套更形式化、更严格、更完备的架构。但在实际工程深度上，当前 Flux 的实现远超 v8 的设计。**

具体来说：

1. **概念层面**：v8 更优。SettleController、三类消费者分离、显式投影、前缀匹配失效等概念是 Flux 当前架构中缺失或隐式的。

2. **工程层面**：Flux 更优。RendererDefinition、SchemaFieldRule、AsyncGovernance、DataSource 策略、表单操作等都是经过实际验证的工程产物。

3. **表达力层面**：Flux 更优。表达式引擎（JS-like 语法 + 箭头函数 + 可选链）、组件生态（flow designer、spreadsheet 等域控件）都是 v8 设计中没有的。

### 13.2 差异根因

差异的根因不是设计水平，而是**输入不同**：

- v8 仅基于**需求文档和设计原则**——这些是高度抽象的约束，驱动出的设计自然更理论化
- Flux 基于**相同的约束加上大量实际业务场景的反馈**——这些反馈驱动出了更务实的工程设计

### 13.3 最优路径

**融合而非替换**。最优路径是：

1. 将 v8 的形式化概念（SettleController、显式投影、前缀匹配、三类消费者）引入 Flux 的现有架构
2. 保持 Flux 的工程深度（RendererDefinition、AsyncGovernance、DataSource 策略、表单操作）
3. 用 v8 的理论框架为 Flux 的工程实践提供规范验证——确保现有实现没有违反原则的隐含假设

这样得到的系统既有理论严谨性，又有工程成熟度。
