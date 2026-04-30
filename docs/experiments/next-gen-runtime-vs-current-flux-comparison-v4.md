# 实验性 v4 内核设计与当前项目设计/实现对比 v4

## 1. 说明

本文对比两套东西：

1. `docs/experiments/next-gen-low-code-runtime-kernel-design-v4.md`
2. 当前项目的设计基线与已实现状态

这里必须明确区分三个层面：

1. 当前项目的目标设计
   来源主要是 `docs/architecture/*.md`

2. 当前项目的已实现状态
   来源主要是 `packages/flux-core/src/types/*`、`packages/flux-runtime/src/*`、`packages/flux-react/src/*`

3. 实验性 v4 设计
   这是一份经过收敛后的 v4 设计：它最初由 `docs/low-code-dsl-runtime-requirements.md` 驱动，但当前版本还必须满足 `docs/experiments/requirements.md`，即符合 Flux 设计原则、Flux DSL VM 定位，以及嵌入式 React 宿主和静态 `RendererEnv` 约束。

因此本文不是简单比较“两个文档”，而是比较：

1. 当前项目已经形成的真实架构方向
2. 当前代码已经落地到什么程度
3. v4 设计是否在核心内核层面更先进

## 2. 结论先行

下文所说的“领先”，只指这几个维度：

1. 内核抽象统一度
2. 调度与生命周期的可推导性
3. 类型合同的闭环程度
4. 长期收敛为单一执行内核的潜力

它不直接等同于：

1. 当前工程成熟度
2. 迁移成本
3. 短期交付价值

基于这个判准，结论是：

1. 如果比较的是“今天哪套东西更成熟、可持续迭代、可直接支撑工程推进”，当前项目更强。
2. 如果不受 Flux 既有原则约束，只看内核统一性，原始 v4 设想会更激进。
3. 但在必须满足 Flux 原则、Final Execution Schema 边界、静态 `RendererEnv`、嵌入式局部页面模型之后，当前项目与收敛后的 v4 已经不再是“谁完全压倒谁”的关系。
4. 在这个新约束下，更准确的结论是：当前项目的顶层方向更正确；收敛后的 v4 仍然在少数内核统一性议题上提供更强的未来收敛视角。

原因是：`requirements.md` 把比较规则改了。现在不能只按“统一性最大化”评判，而必须同时满足：

1. Flux 七原语闭包
2. Final Execution Schema 边界
3. 运行时最小扩展面
4. 复杂域控件仍是特殊 `type` 的复杂组件
5. Flux 作为嵌入式局部页面运行时
6. 静态 `RendererEnv` 直接调用，不再包内部 facade

在这些前提下，收敛后的 v4 仍然保留一些优势：

1. 它把值、数据源、reaction、校验、渲染订阅统一成一个依赖消费者模型。
2. 它把 scope 从“对象链 + 若干外置 sidecar”提升成“带生命周期、可见性、写入语义、revision、调度因果的帧图”。
3. 它把 action 从“带控制字段的 schema”提升成显式控制流 IR。
4. 它试图把 scheduler 和 type contract 组织成更清晰的派生执行系统，而不是散落在多个 runtime 辅助层里。

但这也意味着：我上一版那种“v4 更像真正领先的下一代设计”的强判断，现在必须降级。因为在 Flux 原则约束下，很多原本看起来更激进的抽象，其实不能再直接升格为 core-level 判断。

## 3. 当前项目到底强在哪里

先说当前项目的优点，而且这些优点是真实的，不是礼貌性表扬。

### 3.1 当前项目已经不是普通的“schema 渲染器”

从 `docs/architecture/flux-core.md`、`docs/architecture/template-instantiation-and-node-identity.md`、`docs/architecture/renderer-runtime.md` 可以看出，当前项目已经明确接受这些先进前提：

1. schema 先编译，再实例化运行。
2. 模板节点与运行时实例必须分离。
3. `templateNodeId`、`cid`、`instancePath` 是不同层次的身份。
4. 运行时不能把编译结构和实例状态混为一体。

这一点非常关键。这说明当前项目已超出“直接用 JSON 驱动递归渲染”的实现层级，具备编译期结构与运行时实例分离的内核特征。

对应证据：

1. `docs/architecture/template-instantiation-and-node-identity.md`
2. `packages/flux-core/src/types/node-identity.ts`
3. `packages/flux-runtime/src/schema-compiler.ts`

### 3.2 当前项目的 action 系统已经非常强

当前项目不是简单的 `onClick -> dispatch(action)`，而是已经形成了覆盖面很广的 action algebra：

1. `when`
2. `then`
3. `onError`
4. `parallel`
5. `continueOnError`
6. `onSettled`
7. `retry`
8. `timeout`
9. `debounce`

这不仅写进了文档，而且代码里已经落实了其中的主路径行为：

1. `docs/architecture/action-algebra-formal-spec.md`
2. `packages/flux-core/src/types/actions.ts`
3. `packages/flux-runtime/src/action-runtime.ts`

尤其值得肯定的是，当前项目已经把：

1. built-in action
2. `component:<method>`
3. `namespace:method`

这三类动作路径显式分开。这一点在 `docs/architecture/flux-core.md` 和 `packages/flux-runtime/src/action-runtime.ts` 中都能看到。这个分层是对的，而且非常接近一个真正可扩展平台需要的能力边界。

### 3.3 当前项目的 scope / capability 边界意识很强

当前项目没有把所有东西都塞进 `ScopeRef`，这是成熟设计的重要标志。

它明确把这些东西分开：

1. `ScopeRef` 负责数据。
2. `ActionScope` 负责 namespaced capability。
3. `ComponentHandleRegistry` 负责组件实例能力查找。
4. source/reaction registry 作为 runtime sidecar 挂在 scope 生命周期附近。

这种分离在以下位置非常明确：

1. `docs/architecture/flux-runtime-module-boundaries.md`
2. `docs/architecture/flux-core.md`
3. `packages/flux-core/src/types/scope.ts`
4. `packages/flux-core/src/types/actions.ts`
5. `packages/flux-core/src/types/renderer-core.ts`

这说明当前项目不是 naïve 的“全局 registry + 全局 store + 组件直接读写”，而是在认真建立宿主边界和词法边界。

### 3.4 当前项目的 validation 设计非常成熟

至少从文档表述看，当前项目对 validation owner、编译期主导的 validation graph、draft isolation、subtree validation、async cancellation 的边界定义较清晰。

`docs/architecture/form-validation.md` 明确提出：

1. validation owner 不是 React 树。
2. validation owner 也不只是 form。
3. validation graph 是编译期主导。
4. runtime registration 只是补充。
5. draft isolation、subtree validation、async cancellation 都是体系内概念。

代码层也已经有对应的主实现中心：

1. `packages/flux-runtime/src/form-runtime.ts`
2. `packages/flux-runtime/src/form-runtime-validation.ts`
3. `packages/flux-runtime/src/form-runtime-owner.ts`
4. `packages/flux-core/src/types/runtime.ts`

但这里必须区分“目标设计”和“当前实现重心”：当前文档设计已经明确 validation 不只是 form-owned；当前实现的中心重力仍然明显偏向 `FormRuntime` 及其 owner machinery，更多多 owner/draft 语义仍在持续收敛。

### 3.5 当前项目对 host/domain embedding 的理解已经很先进

从 `docs/architecture/capability-projection-manifest.md`、`docs/architecture/complex-control-host-protocol.md`、`docs/architecture/renderer-runtime.md` 可以看出，当前项目已经意识到复杂域控件不能直接把内部状态机暴露给 schema。

它已经在做这些事情：

1. host contract
2. projection field
3. namespaced host capability
4. host renderer classification

这一点和 v4 的方向其实高度一致，说明当前项目已经明确把复杂域控件视为 host-bridge 问题，而不是普通字段渲染问题。

### 3.6 当前项目更早就站在嵌入式 React 宿主视角思考

`requirements.md` 特别强调了这件事：Flux 经常不是整站框架，而是大型 React 系统中的局部页面运行时。

在这个约束下，当前项目的方向明显更自然：

1. runtime 是局部执行内核。
2. schema 可以按 URL 动态加载，也可以直接传入对象。
3. 外部能力通过 `RendererEnv` 适配。
4. 不同局部页面之间不直接通信。

这和 `frontend-programming-model.md`、`renderer-api.ts`、现有 runtime 结构是相容的。

## 4. 当前项目的主要不足

这些不足不是“没实现完”那么简单，而是说明当前内核还没有完全收敛。

### 4.1 当前项目仍然是“多套先进子系统并存”，还不是“单一统一内核”

这是我认为当前项目与 v4 的最大差别。

当前项目分别拥有：

1. 编译模板系统
2. renderer runtime
3. action algebra
4. request runtime
5. source registry
6. reaction registry
7. validation runtime
8. surface runtime

这些系统各自都不弱，但它们之间仍然保留明显边界和不同机制。

最典型的例子是依赖系统和执行内核的统一程度：

1. 渲染值、source、reaction 已经共享一套以 `ScopeDependencySet` / `ScopeChange` 为核心的词法 root 依赖底座。
2. 但 validation 仍然保留独立的 owner-local dependency pipeline。
3. row/local collection invalidation 仍需要额外规则才能达到终局精度。

`docs/architecture/dependency-tracking.md` 甚至直接承认：

1. validation uses a separate dependency substrate
2. unknown and empty dependencies are conflated
3. ephemeral evaluations discard dependency information
4. row-scope invalidation is still underspecified

这说明当前项目虽然已经在 render/value/source/reaction 上形成部分统一，但还没有完成“统一执行机”的最后收敛。

### 4.2 当前项目的核心抽象仍然偏 renderer-runtime 中心

从 `packages/flux-core/src/types/renderer-core.ts` 和 `packages/flux-runtime/src/runtime-factory.ts` 看，当前项目的中枢对象仍然是 `RendererRuntime`。

这带来两个问题：

1. 它很强，但也很大，承担了编译、求值、scope 创建、page/form/surface/source/reaction 注册、dispatch、import、env 更新等很多职责。
2. 许多系统是“挂在 runtime 上的能力”，而不是先被抽象为统一的 kernel primitive，再由 runtime 装配。

这不是错误，它很工程化，也利于增量演进。但从“下一代内核”的角度看，它仍然偏 orchestrator object，而不是 pure kernel model。

### 4.3 当前项目的 scope 仍然比较像“对象视图 + store 订阅”

当前 `ScopeRef` 的核心接口是：

1. `get`
2. `has`
3. `readOwn`
4. `readVisible`
5. `materializeVisible`
6. `update`
7. `merge`
8. `replace`

见：

1. `packages/flux-core/src/types/scope.ts`
2. `packages/flux-runtime/src/scope.ts`

它已经很不错，但仍然有几个局限：

1. 没有统一的 `revision` 概念。
2. 没有显式 `WriteCause` / `causationId`。
3. `projection` 不是 scope 的一级语义，而是 host projection 等局部能力。
4. 写入模型仍然偏 `update/merge`，不是更系统化的 patch/addressing contract。
5. 变更通知虽然能带 path，但语义上还没有成为一个强约束的“路径级增量内核”。

这会提高其他子系统在 scope 周围补充各自机制的概率；至少从本文引用的设计与代码看，统一 revision、统一写入因果、统一 projection 语义还没有成为 scope 一级能力。

### 4.4 当前项目的 dependency tracking 还没有达到终局精度

当前项目的 dependency tracking 很先进，但还没有完全闭合。

`docs/architecture/dependency-tracking.md` 明确说明当前基线是：

1. explicit roots first
2. runtime lexical-root fallback

这很好，但它也承认几个限制：

1. `undefined` 依赖集和空依赖集没有区分。
2. action `when`、`stopWhen`、request helper 等临时求值会丢掉依赖信息。
3. row/local collection invalidation 仍靠额外规则补足。
4. validation 依赖系统与普通响应式依赖系统并不统一。

换句话说，当前项目已经把问题看清楚了，但还没有完全把它们收敛进同一个 dependency kernel。

### 4.5 当前项目的 action 很强，但还不是显式控制流 IR

当前 action 系统在 authoring surface 和执行语义上都已经很高级，但运行时本质上仍然是在解释 `ActionSchema` 的字段组合。

可以看：

1. `packages/flux-core/src/types/actions.ts`
2. `packages/flux-runtime/src/action-runtime.ts`
3. `docs/architecture/action-algebra-formal-spec.md`

这套系统已经很好用了，但和 v4 的区别在于：

1. 当前项目主要是“schema directly drives executor”。
2. v4 是“schema 先 lower 成 action flow IR，再由 executor 运行”。

前者更适合渐进落地。
后者原则上更利于静态分析、图级优化和调度统一，但这些收益仍取决于 lowering 规则、IR 稳定性与执行器约束是否真正落地。

### 4.6 当前项目的 surface 还偏“runtime owner”，不是“完整事务模型”

当前项目已经有明确的 `SurfaceRuntime` 和 stack 设计：

1. `docs/architecture/surface-owner.md`
2. `packages/flux-core/src/types/runtime.ts`

这很好，但当前接口仍然偏薄：

1. `open(...)` 返回的是 `surfaceId`。
2. `close(...)` 是命令，不是完整 result contract。
3. 表面结果回传、关闭事务、关闭期间动作清理并没有成为统一协议。

而 v4 把 surface 明确看作一个可等待关闭结果的事务句柄，这在复杂工作流编排里会更强。

### 4.7 当前项目的类型合同已经开始形成，但还不是系统级统一类型层

当前项目已经有这些重要方向：

1. renderer prop contract
2. host contract
3. `FluxValueShape`
4. schema diagnostics

但它们还没有完全统一成一个贯穿：

1. expression output type
2. action input/output type
3. slot param type
4. namespace method type
5. request/response shape type
6. compare policy / equality policy type

的完整 contract lattice。

所以当前项目的类型系统方向是先进的，但还不是一个闭环。

## 5. v4 设计比当前项目更强的地方

### 5.1 v4 完成了“统一消费者模型”

这是最核心的胜点。

当前项目里：

1. render/value/source/reaction 已经共享一部分依赖底座。
2. validation 仍有独立 dependency graph。
3. 调度、取消、循环治理、lifecycle 仍然分布在不同 runtime 子系统里。

v4 则把它们都建模成 `ReactiveConsumer`，差异只体现在：

1. 读什么
2. 何时失效
3. 失效后进入哪个调度相位

如果这种模型能覆盖渲染、校验、数据源与 reaction 的真实差异，而不是只在命名层统一，那么 v4 更有机会做到：

1. 统一调度
2. 统一诊断
3. 统一循环治理
4. 统一工具检查
5. 统一资源生命周期

这是“执行机内核”级别的优势，不是普通 API 美观问题。

### 5.2 v4 把 scheduler 提升成一等公民

这里要加一个新的约束说明：在符合 Flux 原则后，scheduler 更适合被理解为 derived runtime system，而不是新的 core primitive。

当前项目有 debounce、retry、timeout、microtask batching、source invalidation、reaction scheduling、validation cancellation，但这些能力分散在多个子系统里。

v4 明确把调度写成系统中心：

1. `write-commit`
2. `pure-recompute`
3. `validation`
4. `reaction`
5. `datasource-refresh`
6. `datasource-publish`
7. `render-notify`

这会让系统时序更容易被推导和调试，前提是这些 phase 不是文档列举，而是被执行器严格实现并形成可观测边界。若成立，它更适合未来做：

1. 并发策略统一
2. loop detection
3. stale-result discard
4. debugger timeline
5. host-safe batching

当前项目在工程上已经部分做到这些事，但没有把它上升为统一 scheduler contract。

### 5.3 v4 的 scope frame 模型更像完整的内核级数据环境候选模型

当前项目的 `ScopeRef` 很实用，但 v4 的 `ScopeFrame` 更适合作为最终内核：

1. `inherit / isolated / projected` 是统一可见性模型。
2. `revision` 是正式状态。
3. 写入带 `WriteCause` 和 `causationId`。
4. projected path 明确只读。
5. patch result 明确返回 changed paths。

这比“对象快照 + store + sidecar registry”更接近一个低代码 VM 的数据环境模型。

### 5.4 v4 的 action IR 更适合长期演化

当前项目 action 很强，但它仍然主要围绕 `ActionSchema` 解释执行。

v4 的好处是：

1. `ActionFlowNode` 显式表示 `then/onError/finally`。
2. `parallel` 是明确聚合节点，而不是解释器里的特殊分支。
3. `result/prevResult/error` 有清晰 frame 规则。
4. 后续如果要接 visual graph lowering、static diagnostics、branch-level optimization，会更自然。

这会让 action 从“强大的 JSON 控制字段”升级为“可编译程序”。

### 5.5 v4 对资源和请求的统一更干净

当前项目已经有 `ApiSchema`、`SourceSchema`、`DataSourceSchema`、`ReactionSchema`，而且 `executeApiSchema(...)` 作为统一请求路径是正确的。

但它仍然存在多个 authoring 形态和多个 runtime 所有者。

v4 把它们往一个更统一的方向推进：

1. request plan 描述请求
2. resource producer 描述值生产
3. data source runtime 描述生命周期和值发布

如果 request plan、resource producer、data source runtime 三者的边界能稳定收敛，那么它有机会减少 authoring 形态与 runtime owner 的分裂。

### 5.6 v4 更适合复杂 domain host 的长期收敛

当前项目已经开始做 host contract，这很好。

但 v4 在理论上更进一步：

1. host projection 统一进入 namespace read。
2. host capability 统一进入 namespace action。
3. type contract 是系统级合同，不只是一类 renderer metadata。

这使域控件不会只是“特殊 renderer”，而是真正成为 kernel 上的 capability island。

### 5.7 收敛后的 v4 对静态 RendererEnv 边界表达得更明确

在加入 `requirements.md` 和用户补充约束后，v4 的一个明确收益是：

1. 不再试图在 runtime 内部重建一层 `HostBridge` facade。
2. 直接承认 `RendererEnv` 是静态宿主能力对象。
3. 直接使用 `fetcher`、`notify`、`navigate`、`confirm`、`importLoader` 等能力。

这让 v4 在宿主接驳问题上比原版实验稿更克制，也更符合 Flux VM 的定位。

## 6. v4 设计不如当前项目的地方

必须诚实地说，v4 不是全面碾压，它也有明显短板。

### 6.1 v4 是终局内核设计，不是最优迁移路径

当前项目最大的现实优势，是它的每一步演进都能落在现有代码组织里。

例如：

1. `schema-compiler.ts` 已经可持续扩展。
2. `action-runtime.ts` 已经能增量强化。
3. `source-registry.ts` / `reaction-runtime.ts` / `surface-runtime.ts` 已经各自成形。
4. React host、runtime、validation、request 已经能独立推进。

而 v4 的问题是，它虽然更统一，但要真正落地，往往意味着：

1. 大规模 kernel 抽象迁移。
2. 需要重新定义 runtime assembly。
3. 需要把多个既有子系统折叠到统一 scheduler 和 consumer graph。
4. 需要重新梳理 type contract 层。

这在工程上代价很大。

而且在加入 `requirements.md` 之后，v4 还额外失去了一部分“自由抽象空间”：

1. 不能随意重开 primitive closure。
2. 不能把运行时 facade 继续做厚。
3. 不能把 Flux 从 Final Execution Schema runtime 推向更泛的平台内核。

### 6.2 当前项目对 authoring progressive surface 的考虑更成熟

当前项目的很多设计文档都很强调：

1. 逐步 authoring
2. 兼容 AMIS 心智
3. visual designer lowering
4. 真实组件 contract
5. 复杂组件边界

这些东西在当前项目文档体系里非常细，尤其是 action、field binding、slot、variant field、object-field、array-field、designer-page 等。

v4 则更偏 kernel-first，它在 authoring ergonomics 上故意讲得少。所以如果比较“作者体验模型的完整度”和“文档覆盖范围”，当前项目更强。

### 6.3 当前项目已经有真实实现约束下的 guardrail

当前项目文档里有很多非常珍贵的现实约束，例如：

1. `docs/architecture/dependency-tracking.md`
2. `docs/architecture/form-validation.md`
3. `docs/architecture/renderer-runtime.md`
4. `docs/architecture/flux-runtime-module-boundaries.md`

这些文档都不是空中楼阁，而是吸收了真实实现、回归 bug、hot path 教训之后形成的 guardrail。

相较当前项目，v4 目前主要体现为设计统一性优势；本文没有提供它在等量实现与回归压力下的验证证据，因此不宜把设计优势直接等同于工程可信度优势。

### 6.4 在 Flux 原则约束下，v4 的部分“领先性”已经被主动削弱

这是本次修订后最重要的新结论。

例如：

1. `Scheduler` 不能再被视为新 primitive，只能回退为 derived system。
2. `TypeContract` 不能再被写成顶层 primitive，只能视为编译与诊断层的一部分。
3. `HostBridge` facade 被删除，改为直接使用静态 `RendererEnv`。
4. v4 必须接受 Flux 是嵌入式局部页面 runtime，而不是更大的浏览器端平台内核。

这意味着收敛后的 v4 不再是“另起炉灶的新体系”，而是“对当前 Flux 方向做更统一的未来化整理”。

## 7. 当前项目设计与当前实现之间的距离

这是本文最需要说清的一点。

当前项目的文档设计，整体上比当前实现更超前一些。

### 7.1 已形成稳定实现或主路径实现的部分

1. 模板/实例分离已形成稳定实现。
2. action algebra 已有主路径实现。
3. ApiSchema/request convergence 已有主路径实现。
4. source/reaction runtime 已形成独立模块。
5. form validation owner 模型已有较成熟实现中心，但仍偏 form-first。
6. surface runtime 已有 stack owner 模型。

### 7.2 仍处于“方向正确但尚未彻底闭合”的部分

1. dependency tracking 的统一性。
2. row/local invalidation 的终局精度。
3. source/reaction/validation 之间的统一依赖内核。
4. host contract、type contract、schema diagnostics 的全链路收敛。
5. 将设计文档中的一些终局概念完全压入更少、更稳定的核心接口。

### 7.3 这意味着什么

这意味着当前项目不是“设计差，代码也差”。

恰恰相反，它属于：

1. 目标设计非常强。
2. 实现已经走到了较高水位。
3. 但内核层还存在历史分层和渐进演进留下的多子系统并存现象。

而 v4 的价值，正是把这些已经存在但尚未统一的方向，再向前推一步，收敛成更少的核心抽象。

## 8. 哪个才是真正领先的下一代设计

我的判断是：`v4`。

### 8.1 不是因为它更复杂，而是因为它更统一

“下一代”不是指 API 更多，不是指概念更多，也不是指文档写得更大。

本文采用的“下一代设计”判准是：

1. 更少的核心抽象解释更多的系统行为。
2. 更强的正交性让系统复杂性可控。
3. 更清晰的调度和生命周期规则让并发、缓存、失效、取消都可推导。
4. 更统一的类型和契约系统让静态诊断更可信。

在这四条上，v4 比当前项目更进一步。

### 8.2 当前项目更像“最强的演进中架构”

如果让我给当前项目下定义，我会说：

它不是旧架构，它是一个已经非常先进、但仍在持续收敛中的强架构。

它已经具备下一代系统的大部分要素：

1. compile once / instantiate many
2. lexical scope
3. typed renderer contract
4. action algebra
5. host capability boundary
6. validation owner
7. source/reaction runtime

但这些要素还没有像 v4 那样，被彻底压缩进一个更统一的 kernel model 里。

不过在加入 `requirements.md` 后，还要补一句：

当前项目不仅是“演进中架构”，它也是更符合 Flux 原则原始意图的基线。也就是说，这一轮约束加入后，当前项目的理论正当性增强了，而不是削弱了。

### 8.3 如果只谈工程现实，赢家会不同

如果问题不是“谁更领先”，而是“谁更适合作为本项目未来两个月到半年里的演进基线”，那答案会偏向当前项目。

因为：

1. 它已经有真实模块边界。
2. 它已经有大量细化文档。
3. 它已经有可以逐步替换的实现锚点。
4. 它不需要先重构成一个全新 kernel 才能继续前进。

所以结论不能简化成“v4 好，当前项目差”。

真正准确的结论是：

1. 当前项目是更成熟、也更符合 Flux 顶层原则的现实架构。
2. 收敛后的 v4 是一个更偏未来收敛视角的内核整理方案，而不再是无条件更先进的替代体系。

## 9. 最后判断

最终判断分三句话：

1. 当前项目已经具有非常强的架构水位，不是普通 schema renderer，也不是简单的 AMIS 重写版。
2. 在 `requirements.md` 约束下，当前项目的顶层方向更正确，因为它天然更符合 Flux 原则、Flux DSL VM 定位、嵌入式局部页面模型以及静态 `RendererEnv` 边界。
3. 收敛后的 v4 仍然在若干内核维度上提供更强的未来整理视角：consumer 模型、scope frame、action IR、调度显式化、契约系统收敛。
4. 因此，现在更准确的说法不是“v4 胜出”，而是“当前项目是正确基线，v4 是未来收敛草案”。

最值得采取的策略，不是二选一，而是：

1. 保持当前项目的工程化分层与增量演进路径。
2. 用收敛后的 v4 作为 future kernel convergence 的北极星，而不是替代当前 Flux 顶层原则。
3. 未来逐步把当前项目里已经存在的强子系统，向 `统一 consumer graph + 显式 scheduler + frame-based scope + stronger contracts` 的方向收敛，但始终保持 Final Execution Schema、最小运行时扩展面和静态 `RendererEnv` 边界。

这样才能既保留当前项目的落地优势，又真正走向更领先的下一代低代码内核。
