# 实验稿回顾性价值评估

**日期**: 2026-04-22
**范围**: `docs/experiments/` 下 v1 → v10 + Final 设计
**目标**: 识别哪些实验想法在当前 flux 架构中仍有价值且可落地

---

## 摘要

nop-chaos-flux 项目在 10 个版本加 Final 设计中，围绕"下一代运行时内核"进行了多轮迭代。分析结果如下：

| 版本 | 已实现 | 部分实现 | 有价值可采纳 | 无价值 |
|------|-------:|---------:|------------:|-------:|
| v1   | ~30%   | ~52%     | ~18%        | —      |
| v2   | ~55%   | ~15%     | ~15%        | ~15%   |
| v4   | ~40%   | ~35%     | ~20%        | ~5%    |
| v5   | ~50%   | ~22%     | ~18%        | ~10%   |
| v6   | ~16%   | ~24%     | ~36%        | ~24%   |
| v7   | ~43%   | ~31%     | ~23%        | ~3%    |
| v8   | ~60%   | ~20%     | ~15%        | ~5%    |
| v9   | ~50%   | ~22%     | ~20%        | ~8%    |
| v10  | ~55%   | ~15%     | ~20%        | ~10%   |
| Final| ~45%   | ~20%     | ~25%        | ~10%   |

> **百分比说明**: 各列百分比为近似估计，行内不完全精确求和到 100%。分类边界存在重叠（如"部分实现"与"有价值"之间存在渐变），百分比反映的是各版本的相对侧重方向而非精确计数。

**核心发现**: 当前 flux 实现已通过自底向上工程吸收了每个版本约 30–60% 的想法。剩余价值集中在 **8 个跨版本改进主题**，而非任何一个版本的完整架构。实验系列最重要的元认知是：**指导原则是从当前项目实践中提炼出来的，而非反过来**——这解释了为什么所有实验稿最终都收敛回当前架构。

---

## 各版本摘要

### v1 — Schema 虚拟机 (SVM)

六层架构（Authoring → Compile → Template → Instance → Projection → Host Bridge），包含一次编译、Scope 森林读取、统一提交事务和框架无关的投影。最具野心的愿景。v1 比较文档对当前 Flux 架构给予了重要肯定（DSL 连续性、概念克制、工程智慧），认为"当前项目已经站在非常高的架构台阶上"。

- **已有**: 一次编译管线、模板/实例分离、编译型校验图、Surface 统一、Action 代数、表达式引擎（AST 遍历无 eval/new Function）、统一值引擎（CompiledRuntimeValue）
- **仍有价值**:
  - **统一提交事务模型** — 所有写入经 `CommitIntent → commit()` 单一入口（当前 Flux 的写入分散在 scope.update()、FormRuntime.setValue()、Action 内建、数据源发布等多条路径）
  - **形式化异步 Epoch 语义** — `EvaluationEpoch` / `ReadView` 协议统一过期结果丢弃
  - **SchemaValueNormalizer** — 在 Host 投影和 Capability 返回值进入 Scope 前的安全边界（v1 §16.2 首次提出）
  - **统一依赖图含校验** — 校验也应纳入同一个依赖图（v1 §7.1 首次提出，当前 Flux 校验使用独立的依赖基底）
  - **统一调度器 (RuntimeScheduler)** — 所有异步活动（action debounce、数据源 polling、异步校验抢占）统一经一个调度器（v1 §17.1，比单纯的批处理边界更广泛）
  - **三类 Scope（inherited/isolated/projected）** — `projected` Scope 是 v1 的重要创新：slot 参数、结果上下文、域控件快照作为一等 Scope 对象
  - **事务级循环检测 (cycleId)** — 每个消费者在同一 cycleId 内最多自动重跑一次
  - **框架无关投影协议** — 注意：这不是"跨框架渲染"（无价值），而是 `RenderFragmentHandle` + `RenderPatch` 增量协议，即使只在 React 内使用也有价值（结构化 patch/快照机制）
- **评估**: 方向指南针。统一写入/统一调度/统一依赖的愿景仍是最重要的未实现想法。

### v2 — 代数效应处理器

从零开始的六层内核，五大设计原则（编译期最大化、零抽象开销、代数效应处理器、根归一化响应式传播、基于能力的访问控制安全）。但 v2 在多个子系统上弱于当前 Flux：数据源/API（v2 缺少 formula-backed sources、rich merge strategies、refresh dedup、stopWhen）、表单/校验（v2 将校验依赖与 Scope 依赖混在同一个根归一化模型中）、表格/集合（v2 的 LoopRuntime 缺少 rowKey identity 和 scope caching）。v2 采用自顶向下的 `RendererOrchestrator.instantiate()` 创建模式，被指出不如当前 Flux 的 Creator-Owned Boundaries（page renderer 创建 PageRuntime、form renderer 创建 FormRuntime）可扩展。

- **已有**: 根归一化依赖追踪、三层 Action 解析、框架无关核心、Scope 隔离、编译期诊断管线
- **仍有价值**:
  - **EffectDispatcher + EffectScope** — 所有副作用经可拦截通道，支持 Effect 分组（commit/rollback/dispose）和 Scope 销毁时自动取消
  - **ReadableScope/ScopeWriter 分离** — 渲染器和 Action 处理器只读 ScopeRef，写入经运行时管制的内部通道
  - **Action ADT** — 动作作为递归代数数据类型（sequence | parallel | guarded | retry | debounce | timeout | chain | noop），结构可检查可组合
  - **Action `finally` 子句**
  - **DraftScope（commit/discard）** — v2 §8.1 明确设计了草稿隔离原语
  - **Branded ID 类型** — `NodeId`、`ScopeId`、`ExprId` 等编译期类型安全，防止 ID 混用
- **无价值**:
  - **字节码 VM** — 当前 `flux-formula` 在 <1μs 内完成 AST 遍历。Proxy-based 依赖收集比 VM read barriers 更实用、更易调试。实现成本 ~3000-5000 行 vs AST ~1000 行。WASM 可移植性是 aspirational
  - **跨框架渲染器协议** — `RenderOutput = unknown` 牺牲类型安全

### v4 — 可编译声明图

"Schema 是程序，不是配置"。v4 是最早接受 Flux 七原语闭包作为约束的版本，定义了七层架构（Authoring Input → Compiler → Immutable Template → Instance Graph → Reactive Kernel → Effect & Capability → Renderer Adapter）。

- **已有**: 两阶段编译/执行、不可变模板、静态 RendererEnv、三层 Action 分发、编译型校验图、校验执行/展示分离
- **仍有价值**:
  - **统一 ReactiveConsumer 模型** — 校验纳入共享依赖图（v4 §7.1，当前 Flux 校验使用独立基底）
  - **阶段显式调度器** — 固定阶段顺序：write-commit → pure-recompute → validate → reaction → datasource-refresh → publish-render
  - **WriteCause + causationId** — 在 ScopeChange 中添加 `source: 'user-input' | 'action' | 'data-source' | 'validator' | 'reaction' | 'host'` 和 `causationId`
  - **Scope 三可见性模型（inherit/isolated/projected）** — 特别是 `projected`（子 Scope 默认隔离但显式投影少量父数据为只读视图），v4 §6.3 的核心数据环境创新
  - **ActionFlowNode / Action 控制流 IR** — 动作编译为 then/onError/finally 显式控制流 IR（v4 §10），而非运行时解释 ActionSchema 字段
  - **TypeContract 统一类型合同格** — ContractIndex 贯穿 expression output/action I/O/slot param/namespace method/request-response shape（v4 §5.8）
  - **Surface 作为完整事务句柄** — `SurfaceHandle.closed: Promise<SurfaceResult>`，关闭事务、关闭期间动作清理、结果回传（v4 §13）
  - **DraftSession 冲突检测协议** — DraftCommitOutcome 四种结果（committed/conflicted/rejected/replay-required），基于 revision 的冲突检测（v4 §12.3）
  - **Activation 语义（与 visibility 分离）** — visible 控制可见性，activation 控制子树是否参与生命周期（Scope 创建、数据源启动、reaction 挂载）（v4 §14.3）
  - **域控件双通道模型** — 只读快照以 namespace projection 暴露 + 命名空间动作暴露可调用能力，"域控件内部状态机绝不直接泄露到 schema 世界"（v4 §15.4）
- **评估**: 最佳收敛北极星。三个内核统一关切（统一依赖、统一调度、统一写入语义）是正确目标。

### v5 — 代数解释器 + Signal 图

数学上优雅的 Signal 响应式内核，带词法作用域。v5 设计原则包含 Compile-Time Maximality 和 Capability-Based Security（"No action, no namespace, no data source can ever be accessed outside its declared lexical boundary"）。

- **已有**: 编译型值节点分类（static/expression/template/array/object 五种）、Scope 链、三层分发、Surface 管理、RendererComponentProps
- **仍有价值**:
  - **Effect 代数（Effect as data）** — 完整的 Effect 代数类型（scope:write、api:request、navigate、surface:open/close、component:invoke、domain:dispatch、batch、sequence、parallel、conditional），所有 Effect 均为 **JSON 可序列化纯数据**（无闭包、无类实例），使单元测试无需 mock、可跨 Worker 执行、可回放（v5 §1.3，代数内核设计的核心卖点）
  - **TrackFn 显式追踪** — 显式依赖追踪函数参数，避免异步上下文损坏（v5 §3.3）
  - **ScopeRef/ScopeWriter 读写分离** — v5 §1.2 明确定义了分离设计
  - **FormRuntime 上显式 draftMode API** — draftMode、commitDraft()、discardDraft()
  - **DisposableGroup 工具** — 统一的批量清理模式
  - **形式化 CompileResult 带诊断**
  - **NodeRef 带 maxDepth 防递归爆栈**
  - **ErrorBoundary** — 完整的 ErrorBoundary 接口和 ErrorBoundarySpec（v5 §5.2）
- **无价值**:
  - **Signal-first 响应式** — 为所有响应式值创建 Signal 对象产生分配开销；当前 Zustand + `useSyncExternalStore` 更实用
  - **框架无关 RenderOutput**

### v6 — 编译型可执行图内核

四图编译（Node/Value/Effect/Data），配合 World/Arena/Lane 调度器和字节码表达式。v6 是最激进的重写方案，但 **v6 自身已认识到部分设计的错误**：在 `v6-unification-vs-independent-evolution.md` 中主动退让了 DomainModuleContract，提出三层模型（Substrate / Owner Family / Domain Runtime 独立演化），论证"Domain Runtime 不应强统一"。

- **已有**: 编译型校验图、校验执行/展示分离、Surface 内核（注：三层 Action 分发是当前 Flux 已有能力，非 v6 首创）
- **仍有价值**:
  - **安定轮协议 (Settled Turn)** — 九相时序和收敛不变量（v6 §7.3–§7.4）
  - **编译期静态路径提取** — closed/parametric/dynamic 三类静态访问计划，减少表格/循环场景的失效扇出
  - **性能基准契约** — 固定场景 + 回归阈值 + 参数化复杂度（v6 §19.0）
  - **统一 source/reaction/validation 追踪** — 五种消费者共享追踪基底
  - **Data Cell 六类型** — State/Derived/Resource/Validation/Projection/Surface Cell 统一数据单元概念（v6 §4）
  - **StabilityPolicy** — scalar/structural-share/always-new/custom-equality 引用复用策略（v6 §4）
  - **Instance Channel** — 统一 platform/component/namespace 三通道鉴权和取消
  - **Scope 构造顺序契约** — 五类 frame 的构造优先级规则（v6 §6.0，v7 继承并简化了此概念）
- **无价值**:
  - **图内核重写** — v6 原文 §2.3 自承"不是天然正确答案"，对比稿说"几乎等于另起一套 runtime"
  - **Scope Frame/Cell 模型** — 远离作者与实现者的直觉对象模型，内核实现复杂度显著更高
  - **字节码 VM** — AST 遍历已足够
  - **DomainModuleContract** — v6 自身已主动退让此设计
  - **路径标记化** — 字符串路径可调试、JSON 兼容

### v7 — 执行织物（6 原语）

Template/Scope/Value/Capability/Resource/Reaction 以 Execution Package 为边界。v7 是所有版本中可采纳想法密度最高的（仅 3% 被否决）。v7 将 Surface 定位为 "derived kernel service"（派生内核服务而非提升的顶层原语），这是一个有意识的设计选择。

- **已有**: 编译型模板、词法 Scope、三层分发、拉取式 UI 订阅、参数化 Region、Surface 管理、Closed Semantic Owners（page/form/surface 闭环语义所有者）
- **仍有价值**:
  - **隔离 Scope 的活体投影绑定** — 编译期声明的只读实时投影，不是一次性种子拷贝（v7 §8.3）
  - **通过 Capability 刷新 Resource** — Resource 不拥有独立 effect lane，所有 I/O 经 Capability 通道（v7 §11.1）
  - **确定性事务模型** — patch → dirty propagation → effect scheduling → snapshot publish（v7 §9.2）
  - **集合增量实例化** — retain/patch/create/destroy 行键 diffing（v7 §14.3）
  - **值编译标签（static/pathOnly/general）** — pathOnly 启用精确选择器订阅（v7 §7.4）
  - **Operation Control Plane** — 跨 Resource 和 Action 的统一异步策略层（Timeout、cancellation、deduplication、retry、concurrency policy、debouncing 共享管理）（v7 §10.4，直接对应主题 2 和主题 4）
  - **Windowed Collections / 虚拟滚动** — 内核级窗口化执行策略（v7 §14.5）
  - **编译期诊断** — 所有权冲突检测、i18n key 前缀校验等
  - **动态装配边界** — Resource 产出数据，动态装配选择哪个预编译 fragment 被挂载（v7 §14.4）

### v8 — 原则驱动的五层架构

六设计原则（P1-P6），形式化 SettleController、统一 ValueIR（L0-L4 渐进式值语义谱系）、显式 Scope 投影。

- **已有**: 编译/执行分离、依赖追踪、管道过滤器、Scope 隔离、Action DAG（CompiledActionProgram）、Surface 管理、RendererComponentProps、布局/控件分离、`$slot` 参数命名空间、多实例隔离规范
- **仍有价值**:
  - **SettleController / 安定更新轮** — 形式化更新边界（评估者的跨版本综合判断，非 v8 原文自评）。v8 原文将其评为"高"优先级并指出是"当前 Flux 没有的概念"
  - **表格行 Scope 的显式投影** — 消除隐式父 Scope 依赖
  - **ScopePool** — 虚拟滚动的 Scope 对象池，降低 GC 压力
  - **并行 Action 策略（all/race/allSettled）** — 处理"首个响应获胜"和"部分成功"场景
  - **Resource 拓扑排序** — 编译期 DAG 分析防止 Resource A/B 竞态
  - **DraftScope 详细语义** — 独立校验状态、commit 时先 validate 再合并、跨草稿边界的校验规则检测、Reaction 隔离（v8 §9.4）
  - **错误分级（6 类）** — 表达式/Resource/Renderer/Action/编译/Settle 级联溢出，含 `CascadeOverflowError` 语义和 `ErrorContext.settleTurn` 字段（v8 §21）
  - **统一 ValueIR 渐进式谱系** — 消费者端读值方式在所有层级完全一致（通过 ScopeRef.resolve(path)），体现"渐进式演化"原则（v8 §2.2）
  - **注意**: v8 的 RendererDefinition 仅是 type → component 映射，缺少当前 Flux 的 RendererDefinition 元信息（regions、fields、scopePolicy 等），当前 Flux 在此维度更优

### v9 — Signal + Effect 通道 + 错误架构

系统化的 Signal 响应式、Effect 通道（可拦截的中间件链）、三层错误边界。v9 明确定位为"当前项目的演进指南，而非替代品"。

- **已有**: 编译管线、Scope 链、三路径分发、校验 DAG、RendererComponentProps、Surface 管理器、参数化 Region、DOM 属性映射（data-cid）、节点检查 API、Host 集成边界、i18n 编译期处理
- **仍有价值**:
  - **Null-safe 表达式求值** — `user.address.city` 遇 null 中间值返回 `undefined` 而非崩溃
  - **SchemaErrorBoundary** — 三层错误边界（表达式/组件/页面）
  - **管道操作符（`|>`）** — `items | filter(x => x.active) | map(x => x.name)`
  - **Effect 通道形式化** — 将 ActionRuntimeAdapter 泛化为可拦截的中间件链（Redux middleware 模式），可测试性（mock 所有副作用）和可组合性（v9 评估为"高"价值）
  - **结构化 ActionResult 状态** — `status: 'success' | 'failure' | 'skipped' | 'cancelled'`
  - **ScopeTransaction + UndoManager** — 原子批量更新带回滚
  - **统一 FrameworkError** — 跨 expression/action/validation/rendering 的 code/category/nodeId/recoverable 结构
  - **DataSource ↔ Form 级联交互协议** — 完整时序图（省→市级联传播过程）、请求取消协议（AbortController 示例）、Surface 关闭清理时序（v9 §18.6，具体到可指导实现）
  - **Scope 内存生命周期** — 五条清理规则、ScopeLifecycle 四阶段（create/activate/suspend/dispose）（v9 §4.6）
  - **Action `catch`/`finally` 控制流**
  - **渐进式采纳指南** — 从一个表单开始、嵌入现有 React 应用、只使用部分能力的分阶段指导（v9 §27）
- **无价值**:
  - **Signal 原语** — 当前路径级失效已有效
  - **编译期类型检查** — 投资高回报低
  - **时间旅行调试** — 实现成本高，当前 debugger 已提供检查能力
  - **Schema 热重载** — Vite HMR 处理开发时热重载（注：v10 重新提出 HMR/热 Schema 替换为有价值，两者概念相似但 v10 强调 NodeId-stable diffing 的状态迁移能力，更具体）
  - **多目标编译（Vue/Solid）** — React 集成极深
  - **SSR** — 当前定位为嵌入式渲染器

### v10 — 编译器优先的响应式类型安全运行时

多阶段 IR 管线（Parse → Analyze → Optimize → Emit）、预编译选择器、结构化并发。v10 明确定位为 **schema rendering engine**（非完整低代码平台），并与 AMIS、Formily、Refine 做了坦诚对比。

- **已有**: 一次编译、Scope 投影、三层分发、编译型校验图、数组字段操作（7 种）、布局/控件分离（v10 只有 layout/widget 两类，当前 Flux 的三类模型更成熟）
- **仍有价值**:
  - **每渲染器错误边界** — `RendererErrorBoundary` 包装防止级联故障
  - **扁平 action `steps` 语法** — 嵌套 then 链的语法糖，编译器反糖化
  - **对话框 Scope AbortSignal 传播** — 链级取消（当前 68 个 AbortSignal 实例但缺少完整的 Scope → 子 Action 传播）
  - **显式 ThemeContract 文档** — CSS 变量的形式化契约
  - **每表单 Undo/Redo**
  - **HMR / 热 Schema 替换** — NodeId-stable diffing 保留 Scope 状态（v10 强调的具体机制，比 v9 的笼统"热重载"更实用）
  - **单 Store 订阅批处理** — 100+ 组件页面的性能优化（version counters）
  - **A11yContract 元数据** — 每渲染器可发现的可审计性约束（v10 §5.4）
  - **DepPattern（exact/prefix/computed）** — 更精确的编译期依赖模式（v10 §2.2）
  - **Suspense 集成** — `useDataSource` 抛 pending promise（v10 §8.6，与 React 19 集成相关）
  - **诊断系统带建议** — 编译器诊断附加 suggestion 元数据
  - **时间旅行状态跳转** — 在现有 debugger 时间线上加状态快照录制
  - **轮询去重（引用计数共享定时器）** — 多订阅者共享同一定时器
- **无价值（但应明确提及来源）**:
  - **WebSocket 数据源 + reconnect** — v10 §8.3 对比文档评为"FK10 genuinely better"，但属产品特性非架构创新，在明确需求时再加
  - **Offline 持久化** — 同上

### Final — Execution Package + Owner 基底

7 语义原语（Template、Scope、Value、Resource、Reaction、Capability、Host Projection）、Owner 基底（page/form/draft/surface/collection/domain-host）、确定性事务、Capability 作为单一效应出口。Final 设计包含 20 个子文档，涵盖事务管线、异步治理、持久化日志、诊断安全、合规测试等。Final 的渲染器分类为 **4 类**：instance-renderer、owner-renderer、domain-host-renderer、**null-renderer**（用于不产生可视 UI 的 runtime-owned 节点如 data-source、reaction）。

- **已有**: 全部 7 原语、三层分发、渲染器契约、结构共享、Host 投影（只读强制）、字段参与矩阵、Surface 管理
- **仍有价值**:
  - **6 阶段事务管线** — `collect → apply → invalidate → recompute → publish → settle`，附写入仲裁优先级（submit/commit > user-input > host-command > resource > reaction > system）和 settle 阶段才允许 reaction enqueue 的关键约束（Final §03）
  - **Async Lane + ConcurrencyPolicy** — 每个 owner 下多 lane（resource:xxx、validation:xxx、submit:xxx、domain:xxx），并发策略（cancel-previous | ignore-new | parallel | queue），统一失败分类 RuntimeFailureKind（Final §03，远超简单的 Epoch token）
  - **异步 Epoch 协议** — AsyncEvaluationEpoch 令牌统一过期结果处理
  - **ScopeChange 来源元数据** — `source: ScopeWriteSource` + `revision: number`
  - **SchemaValueNormalizer** — Host 投影和 Capability 返回值进入 Scope 前的 normalize(input: unknown): unknown 安全边界
  - **复合字段 ValueOwnerHelper** — detail-field/detail-view/variant-field 共享的 transform/validate/commit 协议，含 transformOut 归属约束（必须在 validateAll 成功后、parent ScopeWrite 之前执行）（Final §04）
  - **编译期 LexicalBinding 优化** — 变量名解析为 (depth, index) 对，消除运行时字符串查找
  - **编译器安全通行** — 命名空间验证、effect 安全检查作为编译器阶段
  - **可序列化 Effect 协议** — 动作程序向纯数据表示演进，改善可测试性
  - **RendererRuntime 内部服务分层** — CompilerService/EvaluationService/CapabilityService/ResourceService/FormService/SurfaceService
  - **Transaction journal** — forward/inverse patches，4 种恢复模式（strict-reject / snapshot-only / snapshot+journal-replay / degraded-host-rebind），crash consistency（Final §06）
  - **执行预算** — CPU 时间、递归深度、输出大小的运行时配额（Final §07）
  - **合规测试矩阵** — Package/Transaction/Owner/Resource/Host/Recovery 共 20+ 具体用例，定义"什么算完成"（Final §07）
  - **Table 模式分类** — display / interactive / editable-inline / editable-staged（Final §04）
  - **变体切换 3 种策略** — drop / preserve / project（Final §04）
- **无价值**:
  - **完整 Execution Package IR** — 当前编译管线已产出不可变模板，重构无用户可感知收益
  - **版本化迁移** — Schema 和运行时同版本部署
  - **准入协议** — 动态 fragment 加载非当前需求
  - **结构化路径（替代字符串）** — 成本/收益极差
  - **Signal** — Zustand 已久经考验
  - **Host 命令信封** — 当前命名空间分发已足够
  - **编译期 i18n** — 运行时 i18next 支持动态语言切换

---

## 跨版本主题：8 个高价值改进领域

以下主题在 3+ 个版本中出现，代表真正可采纳的改进：

### 主题 1：更新事务 / SettleController
**出现在**: v1（统一调度器）, v4, v6（安定轮）, v7（确定性事务）, v8（SettleController）, v9, v10, Final（6 阶段管线）
**内容**: 形式化更新边界，写入批处理 → 纯重算 → 校验 → 反应 → 发布 → 渲染。当前依赖 React 的隐式批处理。Final 的设计最为完整：6 阶段命名管线 + 写入仲裁优先级 + settle 阶段才允许 reaction enqueue。
**价值**: 使级联写入可预测，实现无毛刺读取，改善调试。
**路径**: 先实现轻量 `batch()` 包装，再演进为阶段显式调度器。

### 主题 2：统一异步治理收敛（run governance + 按需策略抽象）
**出现在**: v1, v4, v6, v7（Operation Control Plane）, v8, v9（DataSource 交互协议）, v10（AbortSignal 传播）, Final（Async Lane + ConcurrencyPolicy）
**内容**: 跨 data-source、reaction 和异步校验对齐 owner-level async run identity、stale-result discard 和基础调试元数据。当前仓库并非缺少异步治理，而是已经以较薄的共享 `runId` / `supersededBy` / `stale-dropped` 基线落地；`data-source` 还额外具备 `cancel-previous` / `ignore-new` / `parallel` 三种 refresh 策略。Final 的多 lane + `ConcurrencyPolicy` 是更强的概念框架，但当前代码还没有证明必须抽象到这一层。
**价值**: 保持各 subsystem 的过期结果不覆盖新状态，并让调试器能够解释 authoritative run 与 stale-dropped run 的区别。
**路径**: 维持现有 shared async governance 基线；仅在出现真实的 owner 多通道并发、统一策略复用或调试器表达不足时，再评估是否补充显式 `epoch`、lane 或更强的 `ConcurrencyPolicy` 抽象。

### 主题 3：ScopeChange 来源元数据（WriteCause）
**出现在**: v1, v2, v4, v5（ScopePatch.sourceId）, v6, v7, v8, v9, Final
**内容**: 当前 `ScopeChange` 已包含 `paths`、`sourceScopeId`、`kind`，并实际参与 scope 订阅、依赖命中判断和 form/page runtime 的 last-change 传播；本轮还补上了可选 `revision`，让 runtime-owned 变更具备稳定顺序元数据。剩余缺口主要是更高层的写入来源分类，例如 `source?: ScopeWriteSource`，用于区分 `user-input`、`action`、`data-source`、`reaction`、`validation`、`host`、`system` 等写入类别。
**价值**: 在保留当前路径级失效模型的前提下，改善变更顺序可观察性，并为后续自写保护、循环诊断和调试器写入溯源提供更稳的基础。
**路径**: 保持 `revision` 作为共享基线；如后续确实出现来源诊断或写入因果防护需求，再在 page/form/action/data-source/reaction 等 runtime-owned 写入路径增量接线 `source` 元数据，而不是预先强制所有调用点一次性升级。

### 主题 4：效应纪律（EffectChannel / EffectDispatcher）
**出现在**: v1（Capability）, v2（EffectDispatcher）, v5（Effect 代数，JSON 可序列化纯数据）, v7（Capability 作为单一效应出口）, v8（CapabilityDispatcher，权限控制导向）, v9（Effect 通道中间件链，可测试/可审计导向）, Final（可序列化 Effect 协议）
**内容**: 将副作用尽量集中到可拦截通道。注意各版本的机制差异：v2/v5 的 EffectDispatcher 是效应数据模型（可序列化纯数据）；v8 的 CapabilityDispatcher 是权限控制导向；v9 的 Effect Channel 是可测试/可审计导向的中间件链。当前仓库并非完全缺少 effect boundary：`ActionRuntimeAdapter` 现已统一承接 built-in、component、namespace 三类 action 的最终 runtime invocation 边界；`reaction.actions` 与 action-backed/api-backed `source` 执行体也已通过 `runtime.dispatch(...)` 复用这条边界。但它还不是整个 runtime 的单一 effect 出口，因为 `data-source` owner orchestration、imports、以及部分 host/env 调用仍有旁路。
**价值**: 审计、统一监控元数据、Scope/Surface 销毁时更完整的取消、效应排序、可测试性。真正大的现实收益来自统一拦截和取消归属，而不是把所有 effect 立即改写成 JSON 可序列化纯数据。
**路径**: 先以 `ActionRuntimeAdapter` 作为统一 action invocation boundary，再视收益决定是否把 adapter 内部中间件化，演进为 runtime-internal `EffectChannel`；后续重点不再是收口 component/namespace/source/reaction action body，而是按收益收口 request / notify / navigate / import load 等 host boundary，并评估 `data-source` owner orchestration 是否需要更薄的 shared effect seam。`data-source` 与 `reaction` 应继续复用共享 action/request substrate，但不要把 owner-level refresh lifecycle 简化成“普通 action 触发”；它们仍需保留自己的发布、调度、polling、status 和 async-governance 语义。外部 API 可保持不变；`Effect as data` / JSON 可序列化纯数据应视为远期可选项，而非当前阶段目标。

### 主题 5：Staged Owner / Draft Isolation 收敛
**出现在**: v2, v4（DraftSession 冲突检测）, v5（draftMode API）, v6, v7, v8（完整 DraftScope 语义）, v9, v10（Undo/Redo）, Final
**内容**: 当前仓库已经在 `detail-field` / `detail-view` 中落地了 renderer-local 的 staged editing baseline：打开时创建局部 draft form，确认时先校验再 `transformOut` 并写回父 owner，取消时直接丢弃 draft。剩余可收敛价值不是立即引入统一 `DraftScope` 原语，而是判断这套 staged owner 语义是否会在更多 owner family 中重复出现，再决定是否抽成共享的 `commit()` / `discard()` 基底。v4 的 DraftCommitOutcome 四结果（committed/conflicted/rejected/replay-required）和 v8 的独立校验状态设计仍是可参考的更强模型。
**价值**: 让复合字段、局部 subform、未来 wizard 或 row editor 等 staged editing 场景共享更清晰的一致语义，并为 Undo/Redo 提供潜在基础。
**路径**: 先保留当前 renderer-local draft form 模式；只有在多个场景确认需要共享 draft lifecycle、冲突检测或独立校验状态时，再从 staged owner 模式提取共享基底。

### 主题 6：错误韧性（错误边界 + Null-Safe 求值）
**出现在**: v5（ErrorBoundary 接口）, v8（6 类错误分级 + CascadeOverflowError）, v9（SchemaErrorBoundary + Null-safe + 统一 FrameworkError）, v10（每渲染器错误边界）
**内容**: 三层错误边界（表达式/组件/页面）+ null-safe 表达式求值（`user.address.city` 遇 null 中间值时返回 `undefined` 而非崩溃）。v8 的 6 类错误分级和 v9 的统一 FrameworkError 是最完备的设计。
**价值**: 防止级联故障；减少生产环境运行时崩溃。
**路径**: 在 `NodeRenderer` 中添加 `SchemaErrorBoundary` 包装；在 `flux-formula` 中添加 null-safe 求值模式。

### 主题 7：RendererRuntime 分解
**出现在**: v1, v4, v6, v7, Final
**内容**: 将庞大的 `RendererRuntime` 门面（当前实际 27 方法 + 8 属性）拆分为内部服务（CompilerService、EvaluationService、CapabilityService、ResourceService、FormService、SurfaceService），保持外部门面不变。
**价值**: 可维护性，使子系统集成（异步 Epoch、复合字段）更容易。
**路径**: 仅内部重构，不改外部 API。

### 主题 8：性能基础设施
**出现在**: v4, v6（性能基准契约 + StabilityPolicy + 编译期路径提取）, v7（虚拟滚动 + 值编译标签）, v8（ScopePool + 单 Store 批处理）, v10（单 Store 批处理 + DepPattern + Suspense）
**内容**: 性能基准契约（固定场景 + 回归阈值）、虚拟滚动的 ScopePool、编译期路径提取、单 Store 订阅批处理、DepPattern 精确依赖。
**价值**: 性能护栏、降低 GC 压力、更精确的失效。
**路径**: 先加基准套件（纯增量）；再基于数据优化。

---

## 优先采纳路线图

> **重要限定**（来自 `flux-pragmatic-adoptable-runtime-upgrades.md`）：当前依赖追踪仍有独立待收敛问题（unknown/empty dependencies 语义、dependsOn 与 runtime fallback 并存、临时 evaluation 的 ownership 丢失、row-scope invalidation translation），因此 Phase 1 不应被宣称为"彻底解决依赖与循环问题"。此外，校验目前仍属于独立 runtime family，是否未来收敛是另一项更大的架构工作。

### Phase 1 — 低风险，高价值（每项 1–2 周）

| # | 改进项 | 主题 | 来源 |
|---|-------|------|------|
| 1 | ScopeChange 来源元数据 + revision | 主题 3 | v1, v4, v7, Final |
| 2 | Null-safe 表达式求值模式 | 主题 6 | v9 |
| 3 | 每渲染器错误边界 | 主题 6 | v9, v10 |
| 4 | Action `finally` 子句 | 主题 4 | v2, v9 |
| 5 | 扁平 action `steps` 语法 | — | v10 |
| 6 | 性能基准契约 | 主题 8 | v6 |

### Phase 2 — 中等工作量，高价值（每项 2–4 周）

| # | 改进项 | 主题 | 来源 |
|---|-------|------|------|
| 7 | 评估 async governance 抽象收敛边界 | 主题 2 | v1, v4, v6, v7, Final |
| 8 | SettleController / 批处理边界（6 阶段管线） | 主题 1 | v6, v8, Final |
| 9 | SchemaValueNormalizer | — | v1, v10, Final |
| 10 | EffectChannel 形式化（内部中间件优先，不预设可序列化纯数据） | 主题 4 | v2, v5, v9 |
| 11 | 复合字段 ValueOwnerHelper | — | Final |
| 12 | 隔离 Scope 的活体投影绑定 | — | v7, v8 |

### Phase 3 — 战略性（下季度规划）

| # | 改进项 | 主题 | 来源 |
|---|-------|------|------|
| 13 | 评估 staged owner draft 基底是否需要共享化 | 主题 5 | v2, v4, v8 |
| 14 | RendererRuntime 内部服务分层 | 主题 7 | v1, v7, Final |
| 15 | ScopeTransaction + UndoManager（含 journal） | — | v9, v10, Final |
| 16 | 编译期静态路径提取 + DepPattern | 主题 8 | v6, v10 |
| 17 | 虚拟滚动 ScopePool | 主题 8 | v7, v8 |

---

## 确认无价值的想法

以下想法在多个版本中出现，但**不建议**采纳：

| 想法 | 否决原因 |
|------|---------|
| 表达式字节码 VM | AST 遍历已足够；`flux-formula` 在 <1μs 内完成。Proxy-based 依赖收集比 VM read barriers 更实用、更易调试。实现成本 ~3000-5000 行 vs AST ~1000 行。 |
| Signal 细粒度响应式 | Zustand + `useSyncExternalStore` 与 React 19 已久经考验。Signal-first 为所有响应式值创建对象产生分配开销。重写风险高。 |
| 跨框架渲染（`RenderOutput = unknown`） | React 集成极深（30+ hooks，12 contexts）。ROI 过低。注意：v1 的结构化增量投影协议（RenderFragmentHandle + RenderPatch）与此不同，即使只在 React 内使用也有价值。 |
| 完整 Execution Package IR 重写 | 当前编译管线已产出不可变模板。重构无用户可感知收益。 |
| 结构化/驻留化路径（替代字符串） | 字符串路径可调试、JSON 兼容、效率已足够。成本/收益极差。 |
| DomainModuleContract（核心吸收领域语义） | 有意为之的架构选择。v6 自身已认识到此错误并在 `v6-unification-vs-independent-evolution.md` 中主动退让。 |
| Schema 编译期类型系统 | JSON Schema 校验 + TypeScript 类型更实用。 |
| SSR 支持 | 当前定位为嵌入式渲染器，非独立框架。 |

---

## 结论

实验系列完成了其使命：从各个角度对当前架构进行了压力测试，识别了真实的张力点。**指导原则是从实践中提炼的而非反过来**——这个元认知解释了为什么所有实验稿最终都收敛回当前架构。

当前 flux 实现独立收敛到了正确的结构决策（一次编译、模板/实例分离、三层分发、Owner 生命周期、Scope 链、编译型校验、Creator-Owned Boundaries）。v2 的比较文档特别肯定了当前 Flux 在数据源/API、表单/校验、表格/集合等子系统上优于实验设计。

剩余价值不在任何单一版本的架构中，而在于强化现有基础的 **8 个跨版本主题**。所有主题均可在当前七原语模型内增量采纳。其中 Final 设计在事务管线（6 阶段 + 写入仲裁）、异步治理概念框架、持久化（Journal + Crash Recovery）方面提供了最具体的实现细节；但当前仓库已经落地了较薄且可用的 shared async governance 基线，因此 lane / epoch / 更强并发策略是否继续吸收，应以真实缺口为前提。其完整 Execution Package 重写方案本身不可取。

**推荐路径**: 先执行 Phase 1（低风险、即期价值），再 Phase 2（中等投入、核心架构强化），再 Phase 3（按产品需求对齐的战略投入）。Phase 1 不应被宣称为彻底解决依赖与循环问题。

---

## 附录：独立架构最优性评估

一位独立评审人（不接触实验稿）对当前 flux 架构进行了评估。核心发现：

### 总体判断

架构已达到**强健的、可上线的生产级设计**。编译/运行时分离干净、响应式模型推理充分、模块边界文档化程度在低代码框架中属于顶尖水平。系统**已足够上线**。剩余改进为渐进式精化，非基础性重构。

### 各维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 架构健壮性 | 8/10 | 层次清晰、依赖无环。因 `RendererRuntime` 门面过宽（实际 27 方法 + 8 属性）扣分。 |
| 响应式模型 | 9/10 | 路径级依赖追踪（scopeChangeHitsDependencies）、原型链 Scope 读取（readVisible 零分配）、静态快路径（isStatic: true 直接返回引用）、引用复用。最强维度。 |
| 类型安全与契约 | 7/10 | 核心契约类型良好，但 Scope 路径中 `Record<string, any>` 泛滥。`FluxValueShape` 覆盖广泛但类型合同尚未统一。 |
| 可扩展性 | 8/10 | 渲染器（RendererDefinition + fields 元信息）/领域（domain-host-renderer + hostContract）/校验器（注册式）/动作（xui:imports）均有良好扩展路径。 |
| 性能 | 8/10 | 静态快路径、编译型模板、按路径订阅、隔离行 Scope。虚拟滚动为渲染器级，非内核级。 |
| 开发者体验 | 7/10 | hooks/文档良好，但 Scope/ActionScope/ComponentRegistry 三层模型学习曲线陡峭。表达式错误信息可改善。 |
| 完整度 | 7/10 | 核心完备。缺失：非表单校验 Scope（ValidationScopeRuntime 接口已存在于代码中 `flux-core/src/types/runtime.ts:296-323`，且 `FormRuntime extends ValidationScopeRuntime` 类型继承已建立，但无独立工厂，非表单场景无具体实现路径）、编译器 Owner 解析（OwnerBoundaryKind 类型存在于 `flux-runtime` 但编译器包 `flux-core` 完全不感知 owner boundary）。 |

### Top 5 改进（独立评估）

1. **提取 `ValidationScopeRuntime` 独立工厂** — 接口已存在（`runtime.ts:296-323`），类型继承已建立（`FormRuntime extends ValidationScopeRuntime`），但缺少独立工厂函数，非表单场景（filter panel、search panel、inline row editor）无具体实现路径
2. **分解 `runtime-factory.ts`（502 行）为子系统工厂** — 架构中最脆弱的单点。注意 `form-runtime.ts` 虽然仍 507 行但已拆分出 13 个 `form-runtime-*.ts` 辅助模块，主文件主要做组装和 API 转发
3. **将域特定状态类型移出 `flux-core`** — `DesignerHostStatusSummary`、`SpreadsheetHostStatusSummary`、`ReportDesignerHostStatusSummary`、`WordEditorHostStatusSummary`（`runtime.ts:126-158`）泄漏领域关注到共享契约层
4. **落地编译器级 `inherit-owner`/`create-owner`/`no-owner` 分类** — `OwnerBoundaryKind` 类型存在于 `flux-runtime/src/form-runtime-lifecycle.ts` 但编译器包完全不引用。需要将 owner boundary 元数据引入编译器产物
5. **引入更窄的 `RendererRuntime` 切面** — 将 27 方法门面拆分为聚焦接口（CompilationServices、ScopeServices、ActionServices、DataSourceServices）

### 收敛验证

独立评估的 Top 5 改进直接映射到实验分析 8 个主题中的 4 个：

| 独立发现 | 对应主题 |
|---------|---------|
| ValidationScopeRuntime 独立工厂 | 主题 5：Draft Scope |
| runtime-factory 分解 | 主题 7：RendererRuntime 分解 |
| 编译器 Owner 解析 | 主题 5：Draft Scope |
| RendererRuntime 切面 | 主题 7：RendererRuntime 分解 |

两个主题（错误韧性、性能基础设施）未被独立评审标记为关键缺口——它们是改进项而非缺口。这确认了架构不存在需要紧急处理的结构性弱点。

### 最终结论

实验系列和独立评审收敛到同一答案：**当前 flux 架构设计良好、可投入生产**。实验中的 8 个改进主题和独立评审的 5 个改进领域互为补充、互不矛盾。两个来源均未识别出需要基础性重架构的需求。

推荐路径保持不变：先执行 Phase 1（低风险、高价值），再 Phase 2（核心强化），再 Phase 3（战略投入）。架构足够稳定，可以增量吸收这些改进。

---

*本分析由子 Agent 对 `docs/experiments/` 下全部实验文档逐版本评估、7 位校对员逐条核对原始文档后修订生成。*
