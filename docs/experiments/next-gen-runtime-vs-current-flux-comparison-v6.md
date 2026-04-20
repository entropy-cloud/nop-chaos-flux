# v6 下一代内核与当前 Flux 的对比

## 状态

- 状态: draft-for-review
- 对比对象:
  1. `docs/experiments/next-gen-low-code-runtime-kernel-design-v6.md`
  2. 当前 Flux 设计基线与已落地实现
- 当前 Flux 设计基线来源:
  1. `docs/architecture/frontend-programming-model.md`
  2. `docs/architecture/flux-design-principles.md`
  3. `docs/architecture/dependency-tracking.md`
  4. `docs/architecture/scope-ownership-and-isolation.md`
  5. `docs/architecture/action-algebra-formal-spec.md`
  6. `docs/architecture/api-data-source.md`
  7. `docs/architecture/form-validation.md`
  8. `docs/architecture/surface-owner.md`
  9. `docs/architecture/table-row-identity-and-scope-performance.md`
- 当前实现采样锚点:
  1. `packages/flux-runtime/src/runtime-factory.ts`
  2. `packages/flux-runtime/src/schema-compiler.ts`
  3. `packages/flux-runtime/src/scope.ts`
  4. `packages/flux-runtime/src/scope-change.ts`
  5. `packages/flux-runtime/src/source-registry.ts`
  6. `packages/flux-runtime/src/reaction-runtime.ts`
  7. `packages/flux-runtime/src/action-compiler.ts`
  8. `packages/flux-formula/src/scope.ts`
  9. `packages/flux-react/src/schema-renderer.tsx`
  10. `packages/flux-react/src/node-renderer.tsx`

## 1. 结论先行

如果目标是“在需求不变的前提下，重新发明一个在上限上更强、更统一、更可观测的下一代低代码底层框架”，那么 v6 明显比当前 Flux 更激进，理论上也有更高上限。

如果目标是“在当前项目约束下，保持 DSL 连续性、核心抽象稳定性、领域隔离、渐进演化和可逐步落地”，那么当前 Flux 明显更成熟、更克制，也更接近已经可持续演化的工程基线。

最准确的判断不是“v6 全面优于当前 Flux”，而是:

1. v6 在统一内核、全局调度、可诊断图模型、域模块一等接入上更强
2. 当前 Flux 在抽象边界、自顶向下的规范收敛、渐进落地路径、与现有代码的一致性上更强
3. v6 更像一次架构换道
4. 当前 Flux 更像一条持续收敛路线

## 2. 两条路线的根本分歧

### 2.1 平台中心是什么

当前 Flux 把 `Final Execution Schema` 和七个闭合原语作为中心，强调运行时表面必须小而稳，且 `Schema` 只能通过 `Capability` 产生作者可见副作用，见 `docs/architecture/frontend-programming-model.md:45-57`, `:160-181`, `:298-318`。

v6 则把 `ApplicationKernelBundle + ExecutionPlan + World` 作为平台中心，schema 不是内部唯一权威模型，权威模型是 graph kernel。

差异本质:

1. 当前 Flux 以“原语闭包”维持稳定性
2. v6 以“统一图内核”争取性能、调度和工具统一

### 2.2 复杂度放在哪里

当前 Flux 的基本判断是“能在编译或结构层解决的问题，不进入运行时表面”，见 `docs/architecture/flux-design-principles.md:37-63` 与 `docs/architecture/frontend-programming-model.md:107-109`。

v6 的判断则是“只要能换来统一优化和统一诊断，就允许把更多复杂度提升为平台一等执行模型”。

结果:

1. 当前 Flux 更偏最小核心 + 派生系统
2. v6 更偏厚内核 + 全局统一调度

### 2.3 领域系统与核心的关系

当前 Flux 明确要求复杂领域能力通过 `Host Projection`、`Capability`、`ComponentHandleRegistry`、`DomainBridge` 之类窄边界嵌入，不进入核心原语，见 `docs/architecture/flux-design-principles.md:165-190`。

v6 则主张 `DomainModuleContract` 成为一级接入契约，让领域模块进入统一类型、调度、诊断体系。

这是一条非常大的路线分叉:

1. 当前 Flux 优先隔离复杂领域
2. v6 优先统一复杂领域

## 3. 编译模型对比

### 3.1 当前 Flux

当前编译器把 schema 编译成 `TemplateNode` 树，而不是全局图内核。`schema-compiler.ts` 的产物核心是:

1. `propsProgram`
2. `metaProgram`
3. `eventPlans`
4. `lifecycleActions`
5. `regions`
6. `scopePlan`
7. `validationPlan`

见 `packages/flux-runtime/src/schema-compiler.ts:157-306`。

这说明当前 Flux 的编译边界是“结构树 + 编译值程序 + 局部计划”，而不是“Node Graph / Value Graph / Effect Graph / Data Graph 四图统一执行包”。

### 3.2 v6

v6 编译器目标是:

1. 把 schema 前端降为统一语义图
2. 生成 `ApplicationKernelBundle`
3. 再生成 `ExecutionPlan`
4. 最终由 `World + arena + lane` 执行

### 3.3 判断

当前 Flux 的优点:

1. 编译产物更贴近渲染与局部执行
2. 现有 React renderer 更容易消费
3. 更容易按组件/节点逐步演化

v6 的优点:

1. 全局优化空间更大
2. 更容易统一调度、诊断、重放
3. 更容易把 action/resource/reaction/validation 拉到同一执行模型

结论:

1. 当前 Flux 的编译模型更保守、更工程化
2. v6 的编译模型更像虚拟机前端

## 4. 核心执行模型对比

### 4.1 当前 Flux: 七原语 + 派生系统

当前 Flux 明确坚持七个闭合原语:

1. `Base Tree`
2. `ScopeRef`
3. `Value`
4. `Resource`
5. `Reaction`
6. `Capability`
7. `Host Projection`

见 `docs/architecture/frontend-programming-model.md:160-181`。

而动作编排、表单、页面、表面、调试器都被定义为派生系统，见 `docs/architecture/frontend-programming-model.md:260-272`。

### 4.2 当前实现: 运行时组合器

`createRendererRuntime()` 实际把表达式编译器、schema 编译器、source registry、reaction registry、page/form/surface runtime、action dispatcher、import manager 等对象组合在一起，见 `packages/flux-runtime/src/runtime-factory.ts:76-523`。

这表明当前实现虽然已经不轻，但其组织方式仍是“多个专门子系统协作”，不是一个统一 kernel world。

### 4.3 v6: World + Arena + Lane

v6 的运行时中心是 `World`，内部再拆成 `StructureArena / ScopeArena / CellArena / EffectArena / SurfaceArena / HandleArena`。

### 4.4 判断

当前 Flux 更像:

1. 结构树驱动的运行时
2. 原语清晰、边界明显
3. 派生系统相对分离

v6 更像:

1. 应用图内核
2. 一切都围绕统一调度与状态图
3. 运行时内部耦合更高但也更统一

## 5. Scope 与数据模型对比

### 5.1 当前 Flux 设计

当前 Flux 明确坚持:

1. scope 默认词法继承
2. `data` 是 own scope 的初始 patch
3. `isolate` 是窄特例
4. 不提供 `$parentScope`
5. table row 默认隔离，loop item 默认继承

见 `docs/architecture/scope-ownership-and-isolation.md:20-27`, `:48-67`, `:99-160`, `:162-231`。

### 5.2 当前实现

`createScopeRef()` 的实现是:

1. own snapshot + optional parent
2. `readVisible()` 通过原型链式 view 合成
3. `materializeVisible()` 生成平坦对象
4. `update/merge/replace` 作用于 own store
5. 非隔离子 scope 通过 composite store 同时订阅 own 与 parent

见 `packages/flux-runtime/src/scope.ts:82-185`, `:265-376`。

这说明当前 scope 本质是“对象快照 + 词法父链 + store 组合”，而不是 frame/cell/trie 模型。

### 5.3 v6

v6 用 `ScopeFrame + DataCell + WriteRoute + Scope Construction Contract` 取代普通对象链。

### 5.4 判断

当前 Flux 的优点:

1. 词法模型直接、可理解
2. 与 JS 对象心智接近
3. 当前 React 渲染路径易于接线

当前 Flux 的限制:

1. 数据追踪单位偏粗
2. 写入路由和依赖失效难做到 cell 级
3. 更难承载 v6 那种统一 graph kernel

v6 的优点:

1. 更适合精确失效和统一调度
2. 更适合局部 patch、局部校验、资源生命周期绑定
3. 更适合做高阶调试器和执行重放

v6 的代价:

1. 远离作者与实现者的直觉对象模型
2. 内核实现复杂度显著更高

## 6. 依赖追踪对比

### 6.1 当前 Flux 设计

当前 Flux 的主动选择是“显式 root 优先，运行时词法 root fallback”，而且明确拒绝把编译期静态 AST 依赖提取作为规范基线，见 `docs/architecture/dependency-tracking.md:270-305`。

其跟踪单位是 lexical root，例如 `user`、`filters`、`record`，不是深路径，也不是 cell。

### 6.2 当前实现

实现层面:

1. `flux-formula/src/scope.ts` 通过 Proxy 记录访问
2. `normalizeTrackedPath()` 会归一化到 root，见 `packages/flux-formula/src/scope.ts:5-41`
3. `scopeChangeHitsDependencies()` 先 root-normalize 再匹配，见 `packages/flux-runtime/src/scope-change.ts:91-123`
4. source/reaction 注册时订阅 scope store，按 root hit 决定 refresh/trigger，见 `packages/flux-runtime/src/source-registry.ts:148-166` 与 `packages/flux-runtime/src/reaction-runtime.ts:349-359`

### 6.3 v6

v6 采用“静态访问计划 + 动态补追踪 + cell 级失效”的混合依赖模型。

### 6.4 判断

当前 Flux 的优势:

1. 依赖模型简单且已经部分落地
2. root 级失效足以覆盖多数 schema 场景
3. 避免编译器静态分析爆炸

当前 Flux 的劣势:

1. 对高频复杂场景精度不够
2. validation 仍是分离依赖系统，见 `docs/architecture/dependency-tracking.md:207-217`, `:438-447`
3. 更难为全局调度器提供统一、细粒度可预测输入

v6 的优势:

1. 性能上限更高
2. 适合做更强的局部失效与 profiling
3. 更接近“真正的运行时内核”

v6 的风险:

1. 静态计划与动态补追踪双重复杂度
2. 需要更严格的不变量才能避免错失效或重算过度

## 7. 表达式引擎对比

### 7.1 当前 Flux

当前 Flux 通过表达式编译器和 formula scope 完成求值，强调:

1. 无 `eval` / `new Function`
2. 依赖收集依托受控的 EvalContext
3. `Value` 仍保持为独立 primitive

实现上通过 `createFormulaScope(context)` 的 Proxy 拦截访问，见 `packages/flux-formula/src/scope.ts:107-204`。

### 7.2 v6

v6 要求 `EvaluatorProgram` 成为显式字节码/指令级 VM，并把静态访问计划、字节码调试、求值 tracing 一并纳入。

### 7.3 判断

当前 Flux:

1. 更轻
2. 与现有 TS/React 运行时贴合
3. 已能支撑运行时求值和 root 级依赖收集

v6:

1. 更适合当真正 VM 内核
2. 更适合做 instruction-level profiling
3. 也更昂贵

## 8. 动作系统对比

### 8.1 当前 Flux 设计

当前 Flux 已经把 Action Algebra 形式化为编译期组装的 DAG 语义，作者侧仍保留 `when` / `then` / `onError` / `parallel` 的渐进表面，见 `docs/architecture/action-algebra-formal-spec.md:39-88`, `:239-294`。

### 8.2 当前实现

`action-compiler.ts` 会把动作编译成 `CompiledActionProgram` 与嵌套 `CompiledActionNode`，把 payload、targeting、control、`then`/`onError`/`parallel` 都编进去，见 `packages/flux-runtime/src/action-compiler.ts:119-234`。

换句话说，当前 Flux 在动作编排这一块已经明显接近 v6 的设计方向。

### 8.3 v6

v6 进一步要求:

1. 把 action 与 reaction/resource/validation 调度统一进同一个 effect graph 内核
2. 引入 lane 和 settled turn 的严格时序
3. 统一 channel dispatch

### 8.4 判断

这一维度上，两者差距没有看起来那么大。

当前 Flux 已经完成:

1. 动作 DAG 化
2. 结果代数化
3. 链式上下文规范化

v6 比当前 Flux 多出来的，不是“有 DAG”，而是“把 DAG 放进更大的统一调度世界”。

## 9. Source / Resource / Reaction 对比

### 9.1 当前 Flux 设计

当前 Flux 明确区分:

1. `source`: 匿名执行型值
2. `data-source`: 命名、调度、发布型 source
3. `reaction`: 观察值变化并派发动作

见 `docs/architecture/api-data-source.md:1-24`, `:240-244`, `:403-443`, `:727-859`。

同时，当前 Flux 强调 source/reaction 是 scope-scoped runtime sidecar，不应塞进 `ScopeRef` 本体，见 `docs/architecture/api-data-source.md:574-620`。

### 9.2 当前实现

实现上:

1. source registry 按 `scope.id` 分桶，见 `packages/flux-runtime/src/source-registry.ts:79-80`
2. reaction registry 按 `scope.id` 分桶，见 `packages/flux-runtime/src/reaction-runtime.ts:371-372`
3. 依赖命中后各自 refresh / schedule，不存在统一的 kernel lane

### 9.3 v6

v6 试图把:

1. `producer`
2. `resource`
3. `reaction`
4. `effect continuation`
5. `validation`

都纳入统一 settled turn。

### 9.4 判断

当前 Flux 的优势:

1. 语义边界清楚
2. sidecar 归属与词法所有权一致
3. 现有实现已可运行

当前 Flux 的不足:

1. source、reaction、validation 仍分多套执行面
2. 缺少统一调度 contract
3. 对高级 tracing 不够统一

v6 的优势:

1. 统一性强
2. 更容易做全链路 tracing
3. 更容易用一套 turn contract 解释复杂行为

## 10. 校验系统对比

### 10.1 当前 Flux 设计

当前 Flux 的校验系统已经相当重，而且明确走“编译图优先、owner runtime 执行”的路线，见 `docs/architecture/form-validation.md:15-54`, `:86-118`, `:497-544`, `:1040-1052`。

它的关键特征是:

1. validation graph 编译优先
2. `ValidationScopeRuntime` / `FormRuntime` 分层
3. draft 隔离、child contract、partial validation 都被建模
4. validation dependency 与普通 scope dependency 刻意分离，见 `docs/architecture/dependency-tracking.md:207-217`

### 10.2 当前实现状态

文档本身明确承认当前实现仍处于阶段化收敛中，尤其多 owner 和 compiler-driven owner resolution 还没有完全落地，见 `docs/architecture/form-validation.md:303-360`, `:1018-1038`。

### 10.3 v6

v6 也把校验视为图，但尝试把它进一步拉回统一 kernel scheduling，而不是继续保留独立 substrate。

### 10.4 判断

当前 Flux 在校验上的优势很明显:

1. 规范文档更完整
2. owner 语义、partial validation、draft 隔离定义更细
3. 与当前项目组件/表单路线耦合更深，真实可落地性更强

v6 在校验上的优势则主要体现在:

1. 与统一 kernel 更一致
2. 更容易和 effect/resource/reaction 共用调度基础设施

但从当前成熟度看，Flux 在校验这一维度比 v6 更“实”。

## 11. 表面系统对比

### 11.1 当前 Flux

当前 Flux 已经把 dialog/drawer 收敛为 shared surface owner family，并明确要求:

1. surface 不上卷 page
2. 用统一 stack 管理
3. top surface 拥有交互控制权
4. SurfaceRuntime/SurfaceStore 独立于 page/form

见 `docs/architecture/surface-owner.md:20-31`, `:66-93`, `:100-145`。

实现上 `SchemaRenderer` 会创建 `surfaceRuntime` 并提供 `DialogHost`，见 `packages/flux-react/src/schema-renderer.tsx:48-49`, `:121-123`；runtime 工厂也提供 `createSurfaceRuntime()`，见 `packages/flux-runtime/src/runtime-factory.ts:167-177`。

### 11.2 v6

v6 的 `SurfaceKernel` 更强调把 surface 也纳入 unified world/turn contract。

### 11.3 判断

这一块两者方向接近。不同点主要是:

1. 当前 Flux 把 surface 当作较独立的 owner family
2. v6 把 surface 当作统一 kernel 的一个 arena

## 12. 表格与高频集合对比

### 12.1 当前 Flux 设计

当前 Flux 对 table row 的设计其实已经非常强调性能与身份稳定性:

1. value path 与 row identity 分离
2. `rowKey` 与 `sourceIndex` 分离
3. row scope 复用、row-local invalidation、O(1) reconciliation 都被明确要求
4. table row 默认隔离

见 `docs/architecture/table-row-identity-and-scope-performance.md:31-38`, `:64-112`, `:317-406`, `:500-621`。

### 12.2 v6

v6 的 `RowArena + Row Identity Contract` 在理念上与当前 Flux 非常接近，只是抽象层次更高。

### 12.3 判断

这是一个关键发现:

1. 当前 Flux 在表格高频局部更新上的架构意识已经非常强
2. v6 并不是在这个点上“从零超越一个完全没意识到问题的系统”
3. v6 的优势更多是把 row 问题纳入全局 kernel 统一调度，而不是首次提出 row identity / row-local invalidation

## 13. 宿主与领域扩展对比

### 13.1 当前 Flux

当前 Flux 对宿主边界要求非常严格:

1. 读通过只读 `Host Projection`
2. 写通过 `Capability`
3. domain bridge 不进入 schema-visible scope

见 `docs/architecture/frontend-programming-model.md:171-172`, `:290-297` 与 `docs/architecture/flux-design-principles.md:171-187`。

### 13.2 v6

v6 则接受更强的域模块一级契约，把复杂领域纳入类型校验、命令契约、生命周期和诊断体系。

### 13.3 判断

当前 Flux 的好处:

1. 核心不被领域复杂度拖垮
2. 对 flow designer/report/spreadsheet/word editor 这类复杂域保持抽象克制

v6 的好处:

1. 域集成能力更强
2. 编译诊断和运行 tracing 更统一
3. 长期看更适合“大一统低代码平台内核”

这里没有绝对高下，取决于是否接受核心边界扩大。

## 14. 当前实现成熟度与 v6 的现实距离

这是最重要的现实判断。

### 14.1 当前 Flux 已经真实落地的部分

从已读源码可确认:

1. runtime 工厂已经真实存在，且能创建 page/form/surface/source/reaction/action 等子系统，见 `packages/flux-runtime/src/runtime-factory.ts:76-523`
2. schema 编译器已经稳定输出 `TemplateNode` 树，见 `packages/flux-runtime/src/schema-compiler.ts:71-341`
3. scope/store 已经是稳定运行时基线，见 `packages/flux-runtime/src/scope.ts:21-376`
4. action compiler 已经落地，见 `packages/flux-runtime/src/action-compiler.ts:205-234`
5. source/reaction registry 已经 scope-scoped 落地，见 `packages/flux-runtime/src/source-registry.ts:73-309`, `packages/flux-runtime/src/reaction-runtime.ts:367-503`
6. React adapter 已经形成稳定使用面，见 `packages/flux-react/src/schema-renderer.tsx:20-133`, `packages/flux-react/src/node-renderer.tsx:45-374`

### 14.2 当前 Flux 还未完全落地的部分

从文档可确认:

1. validation 的一些 owner 级高级能力仍处于 phased implementation，见 `docs/architecture/form-validation.md:303-360`, `:1018-1038`
2. dependency tracking 仍有 row reconciliation、ephemeral evaluation ownership 等 follow-up，见 `docs/architecture/dependency-tracking.md:220-267`, `:541-550`
3. surface owner 文档也明确区分“目标基线”和“未必完全同名落地实现”，见 `docs/architecture/surface-owner.md:14-18`

### 14.3 v6 的现实情况

v6 目前仍是设计稿，没有实现。

所以从“今天能不能接着做”这个问题看:

1. 当前 Flux 是可继续演进的真实基线
2. v6 是需要重新开辟新内核轨道的研究方案

## 15. 哪些地方 v6 真的优于当前 Flux

在纯架构上，v6 的明显优势主要有六点。

1. 更强的统一执行内核
2. 更强的调度时序合同
3. 更强的可诊断性与可重放性
4. 更强的静态依赖计划与性能上限
5. 更强的域模块类型化接入
6. 更适合做真正的下一代“低代码应用虚拟机”

如果要做一个明显超出当前 Flux 的全新底层，这六点确实是最有价值的超越方向。

## 16. 哪些地方当前 Flux 仍然更优

当前 Flux 的明显优势主要有八点。

1. 原语边界更清楚
2. 与需求的渐进式复杂性更一致
3. DSL 连续性更强
4. 领域隔离原则更稳
5. 运行时表面更小
6. 现有文档体系与实现锚点更完整
7. 更容易按包和子系统逐步演进
8. 已有大量关键能力不是停留在口号，而是已经在代码中落地

这意味着当前 Flux 虽然上限不如 v6 激进，但它不是“落后的旧系统”，而是一条非常有意识的收敛路线。

## 17. 如果真要从当前 Flux 走向 v6，最大代价是什么

最大的代价不是重写几个模块，而是重写架构哲学。

需要被推翻或重构的核心前提至少包括:

1. 七原语闭包
2. 派生系统与 primitive 的边界
3. 词法所有权的中心地位
4. validation 独立 dependency substrate
5. scope 作为对象快照 + 父链的实现基线
6. source/reaction 作为 scope-scoped sidecar 而非统一 kernel lane 参与者
7. 领域系统保持窄边界嵌入的核心承诺

这几乎等于另起一套 runtime，而不是“升级当前 Flux”。

## 18. 更现实的结论

更现实的策略不是二选一，而是分层判断。

### 18.1 可以直接借鉴到当前 Flux 的 v6 优点

1. 更严格的 turn contract
2. 更强的性能基准契约
3. 更好的 source/reaction/validation tracing
4. 更清晰的 world creation / registry handshake 契约
5. 更明确的 async ownership key 设计

### 18.2 不适合直接塞回当前 Flux 的 v6 思路

1. graph kernel 取代七原语
2. frame/cell/arena 全面替代现有 scope/store 模型
3. 把复杂领域升级为一级核心契约
4. 把 validation/source/reaction 全部并进统一 kernel 调度器

这些改动会直接击穿当前 Flux 的规范基线。

## 19. 最终判断

最终判断分三句。

1. v6 是一套比当前 Flux 更激进、潜在上限更高、但也更像换道重启的新内核方案。
2. 当前 Flux 不是一个“等着被 v6 替代的落后方案”，而是一条高度自觉、边界明确、已有相当落地深度的工程化路线。
3. 真正合理的关系不是“v6 否定 Flux”，而是“v6 作为极限探索，反向暴露出 Flux 哪些地方还能继续强化”。

## 20. 当前评审结论占位

- 当前状态: 待独立子 agent 评审
- 目标共识标准:
  1. 对当前 Flux 的描述不违背已读架构文档与实现锚点
  2. 不把“v6 更激进”偷换成“v6 已经更优”
  3. 能清楚区分设计上限、工程成熟度、迁移代价三种判断维度
