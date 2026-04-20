# 实验性下一代内核设计 vs 当前 `nop-chaos-flux` 设计与实现

> 对比对象：
>
> 1. 实验稿：`docs/experiments/next-gen-low-code-runtime-kernel-design.md`
> 2. 当前项目基线：`docs/architecture/frontend-programming-model.md`、`docs/architecture/flux-core.md`、`docs/architecture/dependency-tracking.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/scope-ownership-and-isolation.md`、`docs/architecture/api-data-source.md`、`docs/architecture/template-instantiation-and-node-identity.md`、`docs/architecture/surface-owner.md`、`docs/architecture/action-algebra-formal-spec.md`，以及 `packages/flux-core` / `packages/flux-runtime` / `packages/flux-react` 的当前公开接口与实现入口。

## 1. 先给结论

结论不能简单说成“实验稿绝对更好”或者“当前项目绝对更好”。

更准确的判断是：

1. **当前 `nop-chaos-flux` 已经是非常先进的低代码运行时设计**，明显超出传统 schema renderer、表单引擎、配置驱动 UI 框架的水平。
2. **实验稿在“内核纯度、统一事务语义、异步一致性、UI 解耦、宿主边界显式化”上更进一步**，它更像一个真正的 Schema VM 内核设计。
3. 如果问“哪个更接近今天可落地、可持续演进、已被证明的先进架构”，当前项目更强。
4. 如果问“哪个更像面向未来 5-10 年的下一代低代码内核终局形态”，实验稿更领先。

所以我的最终判断是：

**当前项目是已经进入先进区间的现实主义架构；实验稿是更激进、更纯粹、理论上更领先的下一代内核形态。**

但“更领先”不等于“现在就更适合直接替换当前项目全部实现”。

## 2. 当前项目到底先进在哪里

很多低代码系统仍然停留在：

1. schema 只是配置对象。
2. 运行时本体是一个巨大的 page/form store。
3. 动作、数据源、watch、表单、dialog 各自有一套语义。
4. 依赖刷新主要靠粗粒度 rerender 或全量订阅。

而当前 `nop-chaos-flux` 已经明显超越了这一层。

### 2.1 它已经建立了很强的顶层理论闭包

`docs/architecture/frontend-programming-model.md` 最强的地方，是它不是在堆功能，而是在定义 **closed primitive set**。

当前项目把核心收敛为七个 primitive：

1. `Base Tree`
2. `ScopeRef`
3. `Value`
4. `Resource`
5. `Reaction`
6. `Capability`
7. `Host Projection`

这比很多“运行时设计文档”高一个层级，因为它已经在回答：

1. 什么是运行时一等概念。
2. 哪些能力不能继续无节制膨胀成新 primitive。
3. authoring、loader、runtime、host/domain 的边界在哪里。

这套 primitive closure 本身就已经非常接近世界级设计。

### 2.2 它已经明确把 schema 当成 Final Execution Schema

当前项目不是把浏览器端 runtime 当作一台临时组装器，而是要求 schema 先进入 `Final Execution Schema` 边界，再被 runtime 执行。

这意味着它已经具备很强的“编写态/装配态/执行态分离”意识。

这点和实验稿是同向的，而且当前项目在 authoring continuity 上更成熟、更克制。

### 2.3 它已经有 compile-once / template-instance split

`docs/architecture/template-instantiation-and-node-identity.md` 和 `packages/flux-core/src/types/node-identity.ts` 说明，当前项目已经明确区分：

1. `TemplateNode`
2. `CompiledTemplate`
3. `NodeInstance`
4. `ScopeRef`
5. `ComponentHandleRegistry`

这不是普通 schema renderer 的水平，而是已经进入“模板不可变、运行时实例独立”的现代运行时设计。

### 2.4 它已经有很强的 action/capability 分层

当前项目不是把 action 当作一个字符串分发表，而是把：

1. primitive 层的 `Capability`
2. derived 层的 `Action Algebra`

明确拆开。

`docs/architecture/action-algebra-formal-spec.md` 里对 `when`、`then`、`onError`、`parallel`、结果分类、链式结果上下文的定义，已经相当成熟。

同时实际实现里也已经是三层解析：

1. built-in
2. component-targeted
3. namespaced action

这一点与实验稿高度一致，说明当前项目并不是“旧式 action runtime”。

### 2.5 它已经有依赖追踪，而不是纯粹 rerender 驱动

`docs/architecture/dependency-tracking.md` 说明当前项目已经把：

1. `Value`
2. `Resource`
3. `Reaction`

放进共享依赖模型里。

尽管当前 baseline 还是“lexical-root normalized dependencies first”，精度不如实验稿里的路径级 consumer graph，但它已经远好于“scope 一变全 rerender”的系统。

### 2.6 它对 scope 隔离和高频子树性能有成熟判断

`docs/architecture/scope-ownership-and-isolation.md` 里对：

1. 默认词法继承
2. `data` 是 own scope 初始 patch
3. `isolate` 只作为窄特例
4. row scope 默认隔离
5. loop item 默认继承

的判断非常成熟。

这比很多系统“为了性能到处开隔离”或“为了方便到处允许父链穿透”要先进得多。

### 2.7 它已经开始处理 host/domain 边界，而不是把复杂域控件塞进普通 scope

顶层 programming model 里的 `Host Projection`，加上 `Capability` 的严格 effect boundary，本质上已经在接近实验稿里“宿主只读投影 + 命名空间能力”的方向。

这说明当前项目的方向本身就是先进的，不是传统低代码 runtime 的思路。

## 3. 当前项目的核心短板在哪里

虽然当前项目非常先进，但如果标准提高到“真正的下一代内核 VM”，它仍然有几个明显短板。

### 3.1 它的 runtime 公开面仍然偏大、偏混合

从 `packages/flux-core/src/types/renderer-core.ts` 看，当前 `RendererRuntime` 同时承担：

1. compile
2. evaluate
3. child scope creation
4. host projection scope creation
5. action scope creation
6. component registry creation
7. dispatch
8. source execution
9. page runtime creation
10. surface runtime creation
11. data source registration
12. reaction registration
13. form runtime creation

这说明当前项目虽然有清晰文档分层，但在实际 runtime 接口层仍然更像一个 **强大的 runtime facade**，而不是实验稿里那种严格的：

1. `CompiledProgram`
2. `RuntimeKernel`
3. `RuntimeHandle`
4. internal owner graph

也就是说，当前项目的理论分层很强，但运行时接口还没有完全收缩成“最小内核 + owner 子系统”。

### 3.2 写入通道还没有彻底统一成事务语义

当前项目里写入会通过多个 owner 入口发生：

1. `ScopeRef.update/merge`
2. `FormRuntime.setValue/setValues/...`
3. surface open/close
4. data source controller 发布
5. action built-ins

这些当然都能工作，但它们还不是实验稿里那种 **所有内核状态变更统一 lowering 为 `commit()` 事务** 的形态。

这会带来两个问题：

1. 当前项目已经有不少正式的一致性与边界规则，但它们仍然分布在 scope、action、source、surface、validation 等子系统中，而不是由一个统一 `commit()` 事务协议集中承载。
2. 想把调试、回放、批处理、并发提交、cycle guard、版本丢弃做成第一等机制时，成本会更高。

### 3.3 依赖系统还不是完整统一图

当前项目已经把 `Value`、`Resource`、`Reaction` 放在共享依赖语义上，这非常好。

但它还没有达到实验稿中的完全统一：

1. 当前 baseline 主要按 lexical root invalidation。
2. validation 还是单独一套依赖系统。
3. async consumer 的 epoch/read-view/commit-epoch 语义没有被抽成统一协议。

也就是说，当前项目已经摆脱了低级系统，但还没有完全进入“单一依赖图 + 单一异步一致性协议”的阶段。

### 3.4 它仍然明显以 React host 为中心组织投影层

这句话需要说得更准确：当前项目的 **渲染与宿主集成契约主要围绕 React host 落地**，但 runtime 本体并不等于 React runtime。

当前项目当然强调“core logic 可脱离 UI 测试”，而且 `flux-runtime` 已经独立承载 compile、action、source、reaction、surface、form/page 等核心逻辑；只是公开渲染路径目前主要是：

1. `RendererRuntime`
2. `SchemaRenderer`
3. `NodeRenderer`
4. React contexts/hooks

`docs/architecture/renderer-runtime.md` 的现实基线非常清楚：当前模型仍然主要是“compiled node against current scope -> resolved renderer props/meta -> concrete renderer component”。

这说明它虽然绝不是普通 React state app，但当前公开投影协议仍然更偏 React host integration，而不是实验稿里那种更彻底的：

1. 内核只输出 projection contract
2. `snapshot()` + `RenderPatch`
3. UI host 只是 adapter

### 3.5 Surface / Form / Resource / Reaction 还不是完全统一 owner 事务体系

当前项目已经有很好的 owner classification 文档，例如 `surface-owner.md`。

但从实现形态看，surface runtime、form runtime、source registry、reaction registry 仍然是“收敛中的多个 owner 子系统”，尚未完全统一到实验稿里那种：

1. session owner graph
2. unified commit/epoch/scheduler semantics
3. uniform lifecycle release table

这不是缺点到“错误”的程度，而是成熟工程在演进中的常见形态。

### 3.6 安全边界是强的，但 schema-safe value normalization 还没被提升为最显式的核心协议

当前项目已经明确：

1. 不用 `new Function` / `eval` / `with`
2. `Capability` 是 effect authority
3. `Host Projection` 是只读快照，不是桥对象

这已经很好。

但实验稿更进一步，把“任意宿主回流值进入 scope 前必须经过 `SchemaValueNormalizer`”写成了核心协议。

当前项目在这点上更像“架构上有边界意识，具体收敛还在进行中”，而不是已经被形式化成内核硬约束。

## 4. 实验稿领先在哪里

实验稿最核心的领先之处，不是功能更多，而是它试图把当前项目里已经很强的思想，继续收缩成更纯粹、更一致、更像 VM 的内核。

### 4.1 它把 runtime 拆成了真正三层：program / kernel / session

这是实验稿最关键的一步。

当前项目已经有 compile-once / instantiate-many 的方向，但实验稿进一步明确：

1. `CompiledProgram` 是纯编译产物。
2. `RuntimeKernel` 只持有 program 级只读资源和稳定宿主桥。
3. `RuntimeHandle`/session 才承载全部会话级可变 owner。

这让下面这些问题都更清晰：

1. 多 session 隔离
2. 调试器挂接
3. 并发运行
4. 内核缓存
5. 生命周期释放

这是从“先进 runtime”迈向“真正 VM 内核”的关键一步。

### 4.2 它把所有状态写入收敛成统一事务提交模型

实验稿最强的地方之一，是不再允许：

1. action 内部直接写 scope
2. form helper 自成一套写语义
3. surface runtime 自成一套写语义
4. data source 完成后直接发布

而是要求这些能力最终都 lowering 为统一 `CommitIntent -> commit()`。

这个统一写入口会极大提升：

1. 一致性
2. 回放能力
3. 事务内排序
4. cycle guard
5. 调试可解释性
6. 后续并发调度扩展性

### 4.3 它把异步一致性正式化了

当前项目在 async action/source/reaction 上已经有很多现实处理。

它已经具备不少重要保护机制，例如：

1. action 级 debounce / timeout / retry / cancel。
2. request 执行路径上的 dedup / cache / abort / adaptor 收敛。
3. source 自触发过滤，避免直接自刷新环。
4. reaction 的 microtask batching、debounce、fire-count guard。

但实验稿更进一步，正式定义：

1. `EvaluationEpoch`
2. `ReadView`
3. `commitEpoch()`
4. stale result discard
5. cycle guard

这是“下一代内核”非常关键的一步。

因为现代低代码系统真正难的，不是渲染，而是：

1. 请求竞态
2. watch 竞态
3. 异步校验竞态
4. 过期结果回写
5. 事务和 patch 的稳定性

实验稿在这块比当前项目更前瞻，也更彻底。

### 4.4 它把 projection/render host 彻底下放为 adapter

实验稿不是“NodeRenderer 调组件”，而是“内核生成 projection contract，UI host 做 adapter”。

这带来几个长期优势：

1. 内核可以真正脱离 React 成为一等系统。
2. render patch 可以成为统一调试/回放/性能分析接口。
3. host 切换不需要重构核心 owner 模型。
4. DOM/debugger/SSR/非 DOM host 的抽象层次更干净。

当前项目虽然已经强烈强调 core vs React split，但实验稿在这件事上更绝对。

### 4.5 它把 projected scope 和 host value normalization 提升为一等协议

当前项目已经有 host projection，也具备 `projected scope store` 的实现基座。

但实验稿把这些继续推到更完整的位置：

1. `projected scope` 是正式的只读 scope 类别。
2. result context、slot bindings、host projections 都变成同类对象。
3. 任意回流值进入 scope 前必须 schema-safe normalization。

也就是说，当前项目在这块已经有 substrate，但还没有被提升成一个覆盖全 runtime 的统一通用协议。实验稿在这一点上走得更远。

### 4.6 它在 owner graph 方面更彻底

当前项目已经在 owner classification 上非常强。

实验稿更进一步做了形式化收敛：

1. 所有 owner 明确属于 session。
2. 所有异步 owner 都有 epoch/dispose 语义。
3. 所有重复实例都要同步释放 scope、deps、registry、render subscriber。
4. surface 明确只是 session 内 overlay owner 树，不再保留多模型歧义。

这套 owner graph 明显更像一个严肃 runtime kernel，而不只是“一个做得很好的前端运行时”。

## 5. 实验稿的明显弱点

必须承认，实验稿并不只是“更先进”，它也有真实代价。

### 5.1 它更抽象，更难一次性落地

实验稿已经不是普通项目文档，而更像一个内核白皮书。

它的问题是：

1. 抽象层次高。
2. 对实现纪律要求极高。
3. 一旦做不到统一事务和 epoch 语义，整套模型会局部塌陷。

换句话说，它更领先，但也更容易因为实现不完整而变成“高级名词集合”。

### 5.2 它对团队工程能力的要求更高

当前项目的好处是：

1. 很多边界已经与实际代码、React host、现有组件系统对齐。
2. 文档和实现之间已经有明显闭环。
3. 它已经在解决真实问题，而不是只停留在结构美学。

实验稿如果没有非常强的实现纪律，很容易出现：

1. 文档是 VM
2. 实现还是 runtime facade
3. 最后两层模型并存

这是很多 ambitious architecture 最常见的失败方式。

### 5.3 它还没有被真实代码和大量场景验证

当前项目最大的优势之一，不是理论，而是它已经在文档、接口、实现、组件系统之间形成了现实约束。

实验稿目前仍然是高质量实验基线，不是被真实业务和复杂 host/domain 控件反复压测后的成熟系统。

## 6. 当前项目的弱点为什么不是致命问题

虽然我认为实验稿更像真正下一代内核，但当前项目的“没那么纯”并不意味着它落后。

恰恰相反，当前项目做对了很多实验稿最容易做错的事。

### 6.1 它非常重视 DSL continuity，而不是只追求 runtime elegance

这点在 `frontend-programming-model.md` 里很强。

很多架构设计会因为追求 runtime 统一性，牺牲 authoring surface 的渐进式复杂度。

当前项目没有这么做。它持续强调：

1. DSL continuity
2. progressive authoring path
3. primitive closure 不轻易重开

这其实是大型平台设计里更难也更重要的能力。

### 6.2 它对“什么不属于 runtime”有很强的克制

当前项目对 loader/runtime/host/domain 的边界感非常好。

这让它避免了很多系统会出现的两个极端：

1. 把一切都推到 runtime
2. 把 runtime 做成超级 mutable bag

### 6.3 它已经在处理实际性能与实际 React 宿主问题

实验稿更纯，但当前项目的很多约束来自真实实现经验，例如：

1. selective subscription
2. mounted node `cid`
3. component handle registry
4. root scope seeding
5. host effects 不应复写 owner summary

这些都是实验稿暂时还没有被真实实现折磨出来的“工程智慧”。

## 7. 到底哪个才是真正领先的下一代设计

这要分层回答。

### 7.1 如果问题是“谁的顶层理论更成熟”

当前项目非常强。

它的 primitive closure、Final Execution Schema 边界、Capability 与 Action Algebra 分层、Host Projection 概念，都已经非常接近世界一流。

### 7.2 如果问题是“谁的当前工程化基线更成熟”

当前项目更强。

原因很简单：

1. 有完整文档体系。
2. 有现成公开接口。
3. 有实际 runtime factory、schema compiler、scope、source、reaction、surface 等落地实现。
4. 很多设计已经过实现反推修正。

### 7.3 如果问题是“谁更像下一代低代码内核终局形态”

实验稿更领先。

原因不是它更复杂，而是它在以下四点上做得更彻底：

1. **真正三层化的内核拓扑**：program / kernel / session。
2. **统一事务写模型**：所有内核状态变更收敛到 `commit()`。
3. **正式异步一致性协议**：epoch + read view + stale result discard。
4. **真正 host-agnostic 的 projection 内核**：UI host 只是 adapter。

这四点叠加在一起，会把系统从“高级 runtime”推进到“真正 runtime kernel”。

### 7.4 最终裁决

我的最终裁决是：

1. **当前 `nop-chaos-flux` 不是落后的当前方案，而是已经接近下一代的先进现实方案。**
2. **实验稿在内核抽象层面比当前项目更领先。**
3. **但当前项目在工程成熟度、概念克制、DSL 连续性、现实可落地性上更强。**

因此，真正准确的说法不是：

1. “实验稿全面碾压当前项目”
2. “当前项目已经不需要更高阶内核设计”

而是：

**当前项目已经站在非常高的架构台阶上；实验稿给出的，是它下一次架构跃迁可能通往的更纯粹内核终局。**

## 8. 如果要把两者结合，最值得吸收什么

如果目标不是做纯理论比较，而是推动当前项目继续进化，我认为最值得从实验稿吸收到当前项目里的，不是全部重写，而是以下五件事。

### 8.1 先把 runtime facade 再收缩一层

把当前 `RendererRuntime` 的公开面逐步收缩为：

1. compile/kernel 级公开能力
2. session/handle 级最小宿主能力
3. owner 子系统改为内部接口

### 8.2 逐步引入统一 commit 事务层

不需要一夜之间替换所有写入口，但可以逐步把：

1. built-in actions
2. form writes
3. source publication
4. surface status changes

统一 lowering 到一个正式 commit 协议。

### 8.3 把 async source / reaction / validation 统一到 epoch 语义

这是当前项目最值得做的“下一代化”升级之一。

### 8.4 把 projected scope / host projection / result context 做更统一的类型化收敛

当前项目已经有基础，只差更系统化的统一。

### 8.5 为 projection layer 预留真正的 patch 协议

即使继续以 React 为主宿主，也可以先把内核到 host 的增量协议显式化，为未来 debugger、benchmark、non-React host、fine-grained rendering 做准备。

## 9. 最后的判断

如果只选一句最重要的话，我会选这句：

**当前项目已经是很先进的 Flux 架构；实验稿则是在它之上，把“先进前端低代码 runtime”继续推进为“真正的 Schema VM 内核”。**

所以谁更领先？

1. 在“现实世界可落地的先进架构”维度，当前项目更成熟。
2. 在“下一代低代码内核终局形态”维度，实验稿更领先。

如果必须二选一回答“哪个才是真正领先的下一代设计”，我的答案是：

**实验稿更接近真正的下一代内核设计。**

原因不是它推翻了当前项目，而是它把当前项目已经很强的思想，进一步收敛成了更彻底的 VM、事务、一致性、投影、宿主边界五位一体的内核模型。
