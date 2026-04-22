# 对照当前 Flux 之后的最终设计（校正版）

Status: draft-2-zh-audited

## 1. 文档定位

本文是对 `docs/experiments/v11/final-design.md` 初稿的校正版本。

它的目标不是发明一套替代当前 Flux 正式架构的新术语体系，而是基于当前仓库已落地的正式文档与实现入口，回答两件事：

1. 当前 Flux 哪些判断已经是正确且应保留的基线
2. 在这些基线不变的前提下，下一步最值得推进的改进是什么

因此本文的定位是：

- 实验性综合文档
- 面向未来收敛的判断备忘
- 不高于 `docs/architecture/*.md` 的正式优先级

如果本文与下列正式文档冲突，以正式文档为准：

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/data-domain-owner.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/unified-runtime-indexing-and-path-binding.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/debugger-runtime.md`

## 2. 核查结论

原稿的总体方向不是错的，但有三类问题需要纠正：

1. 它把当前 Flux 已经存在的顶层术语和派生运行时系统，重新包装成另一套并行 vocabulary，容易与正式架构冲突。
2. 它把若干“未来目标”写成了“当前基线”，尤其是 owner 自动分区、多 owner validation、完整 explainability、以及更强的语义寻址层。
3. 它提出的部分建议过于超前，例如把 `Shape`、`Lens`、`Guard`、`Rule`、`Intent` 直接提升为新的核心合同，这与当前仓库的 primitive discipline 不一致。

校正后的结论是：

- 当前 Flux 最强的部分，仍然是闭合 primitive set 下的 execution model
- 当前 Flux 也已经有相当清楚的 derived runtime systems，而不是“只有底层 VM、缺少上层语义”
- 下一步不应另造一套顶层名词体系，而应使用当前正式文档中的术语，把 owner-centered editing semantics、path binding、validation participation、action lifecycle、debugger explainability 继续收敛

## 3. 当前 Flux 已被证实正确的部分

### 3.1 `Final Execution Schema` 边界

这是当前正式基线，必须保留。

保留原因：

- 结构决策留在 loader / compiler 阶段
- runtime surface 可以保持小而稳定
- 延迟注入的 fragment 仍必须跨越同一执行边界
- host 与 domain complexity 不会直接污染 core runtime

### 3.2 七原语闭合

当前 Flux 的七个 core primitive 已经是正式架构，而不是偶然实现：

- `Template`
- `ScopeRef`
- `Value`
- `Resource`
- `Reaction`
- `Capability`
- `Host Projection`

下一步不应轻易重新打开 primitive closure。

### 3.3 严格的 host 边界

当前正式基线已经明确：

- host readonly data 通过 `Host Projection` 进入执行模型
- visible effect 只能通过 `Capability` 发生
- `ActionScope` 与 `ScopeRef` 分离
- component targeting 与 lexical namespace targeting 分离

这部分是 Flux 相对多数低代码框架的核心优势。

### 3.4 compile-once / instantiate-many

当前 Flux 已经明确采用：

- 编译期产生 immutable `Template`
- 运行时实例化 live node / runtime owner / scope
- `Value` 保留 static fast path 和 dynamic identity reuse 的方向

这也是必须保留的基线。

### 3.5 derived runtime system 已经存在

原稿对这一点说得不够准确。

当前 Flux 并不是“只有底层执行 substrate，缺乏上层运行时语义”。正式文档已经明确存在下列 derived runtime systems：

- `Action Algebra`
- `Operation Control`
- `Semantic Lifecycle Entry`
- `FormRuntime` / `PageRuntime` / `SurfaceRuntime`
- debugger runtime

因此，下一步应该做的是“继续收敛这些派生系统之间的关系”，而不是重新发明一套与之并行的顶层 vocabulary。

### 3.6 owner-centered 方向已经进入正式架构

当前正式文档已经使用并固定了更高层的 owner 语义，而不只是实现细节：

- `Data Domain Owner`
- validation owner
- surface owner

这说明 Flux 不是“还没有 owner 模型”，而是“owner 模型已经形成，但实现成熟度仍不均衡”。

### 3.7 `object-field` / `variant-field` 的当前基线是对的

当前仓库已经明确：

- `object-field` 默认是 parent-owned inline live editor，不自动 create-owner
- `variant-field` 默认是 parent-owned polymorphic editor，不自动 create-owner
- staged child owner 的当前成熟承载仍然是 `detail-field` / `detail-view`

这一判断应保留，不应为了追求统一而把所有复合字段都提升成独立 owner。

## 4. 当前 Flux 的真实缺口

不是“没有语义层”，而是“语义解释分布在多份文档和不同成熟度的 subsystem 中”。

更准确地说，当前缺口有五类。

### 4.1 owner 语义已正确，但实现成熟度仍不均衡

正式文档已经把 owner 语义说清楚了，但 live implementation 仍以以下几类中心为主：

- `FormRuntime` 最成熟
- renderer-level draft isolation 仍然存在
- compiler-driven `inherit-owner | create-owner | no-owner` 分区仍是未来阶段的一部分

因此，缺口不是“缺 owner 理念”，而是“owner tree 还未在所有复杂场景完全落地”。

### 4.2 path binding 已经走在正确方向上，但仍需继续收敛

当前正式基线已经很明确：

- 值与 validation 的 canonical address 仍是 owner-local absolute path
- `cid`、`instancePath`、`templateNodeId` 各有职责，不应合并成万能 id
- `PathBindingService` 一类 focused service 才是当前合理的收敛方向

因此，这里的缺口是：

- 路径 rebasing 仍有控件内分散逻辑
- projected state / error / touched 等局部视图仍有进一步优化空间

但不意味着当前就应引入新的全局语义地址模型替代绝对路径。

### 4.3 validation participation 语义已有基础，但表达仍分散

当前 Flux 已经区分：

- `visible`
- `when`
- `disabled`
- validation execution
- error display policy
- submit gating

这部分已经比许多系统更清楚。

真正缺的不是一个新的 `Guard` primitive，而是：

- 在现有术语下，把 participation matrix 讲得更集中
- 让 hidden / inactive / disabled / touched / submit policy 的关系更容易被调试和解释

### 4.4 action 语义已经是派生系统，但 semantic lifecycle 还可继续压实

当前正式基线已经有：

- `Action Algebra`
- `Capability`
- semantic lifecycle entry

因此不能简单说“现在只是 declarative callback orchestration”。

更准确的说法是：

- Flux 已经有一套强的 action/control-flow 模型
- 但 form submit、detail confirm、dialog semantic open/close、row-local staged commit 等 semantic entry 的统一表达仍可继续加强

### 4.5 debugger inspection 已存在，但 explainability 仍明显不足

当前 debugger 已具备：

- 结构化事件流
- `cid`-centered inspection
- automation-facing diagnostics API
- async owner snapshot

但还没有形成完整的语义级 explain query，例如：

- 为什么某个节点当前没有 mounted
- 为什么某个字段当前不参与 validation
- 为什么某个错误未显示但 owner 已不可提交
- 为什么某个 subtree 被视为 inactive

这确实是下一阶段值得推进的方向。

## 5. 不应采纳的原始提法

以下观点在核查后不宜作为当前项目的改进建议直接采纳。

### 5.1 不宜把 `Shape` / `Lens` / `Guard` / `Rule` / `Intent` 提升为新的核心合同

原因：

- 当前正式文档已经有自己的顶层 taxonomy：`Core Primitive`、`Primitive-Owned Surface`、`Derived Runtime System`
- 当前仓库已经有 `Data Domain Owner`、`Action Algebra`、validation model、path binding、renderer contract 等稳定术语
- 如果再在 `flux-core` 中引入另一套语义名词，很容易和已有名词并存冲突

因此这些词最多只能作为讨论性辅助语言，不能作为当前推荐的新 canonical contract。

### 5.2 不宜把 `Lens` 当作新的 canonical public address

原稿提出的 `Lens` 思路有启发性，但当前不适合上升为正式建议。

原因：

- 当前正式基线已经明确 canonical write / validation key 是 owner-local absolute path
- repeated identity、template identity、live instance identity 已经有独立轴线
- 如果再叠一层新地址 DSL，会增加双重寻址复杂度

更合理的做法是：

- 内部继续强化 path binding 与 owner-local path discipline
- debugger / diagnostics 如需更友好的展示地址，可以把它作为 view-layer notation，而不是 runtime canonical address

### 5.3 不宜把 action system 改写成 “intent-first transaction” 叙事

当前项目里，正式存在的是：

- `Action Algebra`
- `Capability`
- semantic lifecycle entry

它们已经足够构成当前正确的 action model。

如果未来真的要引入更强的 intent 或 transaction vocabulary，也只能作为某个 owner family 的 narrowed model 逐步证明，而不应直接成为新的全局执行真相。

### 5.4 不宜把“第二依赖平面”表述成全新发明

当前 Flux 已经明确把 validation dependency system 与普通 scope dependency tracking 分开。

因此更准确的建议应是：

- 保留这一分离
- 把其边界、用途、以及 explainability 做得更清楚

而不是把它叙述成尚未存在的新设计。

### 5.5 不宜把若干枚举直接写成当前推荐基线

以下内容在当前阶段都还过早：

- 统一的 submit slice taxonomy
- 统一的 variant retention 四态枚举
- 广义 projection family 的全面规范化

这些想法可以保留为候选研究方向，但不应写成当前仓库的下一步确定建议。

## 6. 更准确的改进主张

在不改变 primitive closure 的前提下，当前项目更合理的推进路径如下。

### 6.1 用现有正式术语收敛，而不是重造顶层词汇

优先使用：

- `Data Domain Owner`
- validation owner
- surface owner
- `Action Algebra`
- semantic lifecycle entry
- owner-local absolute path
- `PathBindingService`
- validation participation / display policy

而不是额外引入另一套总词典。

### 6.2 把 owner-centered editing semantics 继续做实

下一步真正重要的是把以下关系继续拉齐：

- live owner 与 staged child owner
- validation facet 与 publish facet
- row-local staged edit 的 retarget / commit 规则
- detail editor 与 parent owner 的 writeback contract
- filter/search/wizard 这类非 form owner 的 validation reuse

也就是说，重点是继续做实 `Data Domain Owner`，不是另造 “Owner” 新名词。

### 6.3 保持 owner-local absolute path 为 canonical address

推荐继续坚持：

- 写入地址使用 owner-local absolute path
- validation state key 仍使用 owner-local absolute path
- `cid` 继续用于 mounted inspection / DOM bridge / registry lookup
- `instancePath` 继续用于 repeated instance identity

如需更适合 debugger 的展示地址，可以在工具层增加别名或格式化，不改变 canonical runtime addressing。

### 6.4 把 participation 作为文档与 diagnostics 主题，而不是新 runtime primitive

下一步应补强的是一份集中说明，明确这些状态的关系：

- mounted / structural activation
- visible / hidden
- enabled / writable
- validatable
- error-displayable
- submit-blocking
- serializable

但它应基于现有 `when`、`visible`、`disabled`、validation policy、display policy、submit policy 来表达，而不是引入新的总 contract 替代它们。

### 6.5 把 explainability 作为高优先级工程目标

这是本文最认同原稿的一点。

下一阶段最值得补强的不是更大的抽象，而是更强的“为什么”：

- 为什么 mounted / unmounted
- 为什么 active / inactive
- 为什么 visible / hidden
- 为什么 valid / invalid / blocked
- 为什么某路径属于某个 owner
- 为什么某次 async 结果没有发布

这将显著提高框架的可调试性和设计可信度。

## 7. 校正后的编程模型总结

对照当前正式架构，一个更准确的总结是：

1. loader / compiler 组装 `Final Execution Schema`
2. compiler 产出 immutable `Template` graph、compiled `Value`、compiled validation structure、compiled action program
3. runtime 实例化 `ScopeRef`、runtime owners、source/reaction sidecars、component registry、action scope
4. renderer runtime 将节点投影为 `props`、`meta`、`regions`、`events`
5. concrete semantic owners 负责各自的 lifecycle entry，例如 form submit、detail confirm、surface open/close
6. `Action Algebra` 在 `Capability` 之上负责编排 effect dispatch
7. owner-local validation、display policy、draft/live publish policy 共同决定用户可见交互结果
8. debugger / automation 负责暴露结构化 inspect 与 explain surface

这个模型已经比“纯 schema renderer”强很多，也已经不是“只有底层 substrate、没有上层语义”的状态。

## 8. 建议的迁移路线

### Phase 1：文档对齐

优先目标：统一描述，不改 public runtime contract。

工作：

- 继续以 `frontend-programming-model.md` 的 taxonomy 为顶层
- 在 owner、path binding、validation、action、debugger 文档中减少概念重叠
- 明确哪些是 current baseline，哪些是 future target

### Phase 2：diagnostics / debugger 补强

优先目标：先把系统“解释清楚”。

工作：

- 暴露 owner-aware inspection
- 暴露 validation participation explainability
- 暴露 structural activation / branch activity explainability
- 暴露 async outcome / stale-drop / supersession explainability

### Phase 3：shared helper 与 focused service 收敛

优先目标：减少当前分散实现。

工作：

- 继续收敛 `PathBindingService`
- 继续收敛 owner-local field-state projection / prefix index
- 把 staged child-owner 公共合同从 renderer-local glue 中进一步抽出

### Phase 4：owner tree 落地深化

优先目标：把 target owner model 进一步变成现实实现。

工作：

- 逐步推进 compiler-aware owner resolution
- 让非 form validation owner 有更稳定的共享基座
- 完善 row-local staged editing 与 child-owner coordination

### Phase 5：只在证明必要时再考虑新 vocabulary

如果未来仍想引入更强语义术语，例如更友好的调试地址或更强的 semantic transaction 描述，应满足两个前提：

1. 现有正式术语确实无法表达目标能力
2. 新术语不会与 primitive model、owner model、action model 产生并行冲突

在这之前，不建议把新 vocabulary 提升进 `flux-core` 或顶层正式架构。

## 9. 最终立场

对照当前仓库后，更准确的最终判断不是“用一套新语义词汇替换今天的 Flux”，而是：

- 保留当前 Flux 已经正确的 primitive discipline 与 execution boundary
- 承认当前 Flux 已经拥有一组真实存在的 derived runtime systems
- 用当前正式术语继续把 owner-centered editing semantics、path binding、validation participation、semantic lifecycle、debugger explainability 做实

因此，当前最好的改进方向不是“另造一层总抽象”，而是“把已经正确的层级继续压实，并把尚未完全落地的部分明确标成 future target”。

一句话总结：

- 不是否定 Flux
- 也不是另起炉灶
- 而是在现有正式架构上，继续完成 Flux
