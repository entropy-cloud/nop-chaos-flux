# Commit-Oriented Kernel 与现有 Flux 设计对比

## 目的

本文对比两套方案：

1. 现有 `nop-chaos-flux` 架构基线
2. 实验方案 `Commit-Oriented Low-Code Kernel`（下文简称 `COLK`）

目标不是选边站，而是回答：

- 现有设计已经解决了什么，而且解决得不错
- `COLK` 试图重写的到底是哪一层问题空间
- 两套方案各自的优势、代价、风险、适用边界是什么

## 对比输入

### 当前实验文档

- `docs/experiments/commit-oriented-kernel-study/next-gen-lowcode-attractor-discovery-independent-v1.md`
- `docs/experiments/commit-oriented-kernel-study/commit-oriented-lowcode-kernel-complete-design-v1.md`

### 当前项目文档

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-design-principles.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/data-domain-owner.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/capability-projection-manifest.md`
- `docs/architecture/renderer-runtime.md`

### 当前项目代码锚点

- `packages/flux-core/src/index.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/page-runtime.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/action-scope.ts`
- `packages/flux-react/src/index.tsx`

## 一句话结论

现有 Flux 是一套非常强的“最终执行 schema 前端运行时”，核心优势是词法作用域、七原语闭包、编译期/运行期分层、响应式求值和宿主边界收口；`COLK` 则试图把平台主语从“页面树驱动的运行时”进一步改写成“提交驱动的业务变化系统”。

因此两者不是简单的新旧替代关系，而是：

- 现有 Flux 更适合做稳健、可扩展、可嵌入的低代码前端执行内核
- `COLK` 更适合做强审计、强协作、强 AI 参与、强多入口统一的业务变化内核

## 1. 当前 Flux 的真实强项

### 1.1 原语边界非常清晰

当前 Flux 最强的一点，是顶层编程模型已经把 primitive boundary 讲得非常清楚。

根据 `docs/architecture/frontend-programming-model.md`，Flux 明确维持七原语闭包：

- `Template`
- `ScopeRef`
- `Value`
- `Resource`
- `Reaction`
- `Capability`
- `Host Projection`

优点：

- 这比主流低代码系统常见的“页面 + 组件 + action + data-source + plugin + context”混合包更干净。
- 它对“什么是核心，什么是派生系统”有明确约束，避免无限增殖新的运行时概念。
- `Action Algebra` 被明确降级为派生系统，而不是新 primitive，这一点非常克制。

`COLK` 的问题在于：

- 它天然会引入新的执行核心对象，如 `Commit Unit`、`Admission Contract`、`Journal`、`Effect Schedule`。
- 这些对象虽然有更强的业务解释力，但也意味着系统的最小术语集明显变重。

结论：

- 在“原语闭包稳定性”上，当前 Flux 明显优于 `COLK`。

### 1.2 编写态与执行态分离非常成熟

`docs/architecture/flux-design-principles.md` 和 `frontend-programming-model.md` 都反复强调：

- Flux 是 `Final Execution Schema` runtime
- 结构装配、默认展开、裁剪、继承解析都在 runtime 之前完成

代码上，`packages/flux-runtime/src/runtime-factory.ts` 也体现了这一点：

- `createRendererRuntime()` 组合 `schemaCompiler`、`expressionCompiler`、`actionDispatcher`
- runtime 执行的是已经编译好的模板和 action program，而不是浏览器里做开放式结构改写

优点：

- 有利于性能
- 有利于宿主稳定性
- 有利于诊断与工具化

`COLK` 也强调 compile/runtime 分离，但它会把更多编译责任前移到：

- commit template registry
- admission index
- capability manifest
- constraint registry

这会带来更强的静态可判定性，但也更重。

结论：

- 在“前端 runtime 边界收敛”和“编译/执行分层纪律”上，当前 Flux 已经做得很好，`COLK` 不是明显优势，而是方向变化。

### 1.3 词法所有权和数据/能力分离比主流方案强很多

当前 Flux 一个非常成熟的点，是明确把这三件事拆开了：

- `ScopeRef` 负责数据可见性
- `ActionScope` 负责 namespaced capability lookup
- `ComponentHandleRegistry` 负责实例定向能力调用

文档见：

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/scope-ownership-and-isolation.md`

代码见：

- `packages/flux-runtime/src/action-scope.ts`
- `packages/flux-runtime/src/runtime-factory.ts`

尤其 `runtime-factory.ts` 中 action dispatch 的三条路径很关键：

1. built-in actions
2. `component:<method>` through `ComponentHandleRegistry`
3. namespaced actions through `ActionScope`

优点：

- 这已经大幅好于“任何 action 都能顺手拿全局 context”的主流低代码模式。
- 它天然支持 lexical ownership，不需要全局注册表。
- 对宿主集成也更克制。

`COLK` 在这里的提升点是进一步把 capability 从 lexical resolver 推进到 `lease` 模型：

- 现有 Flux：能力解析正确，但执行仍然以 action dispatch 为主
- `COLK`：能力不仅要能 resolve，还要显式申请、显式授予、显式过期

结论：

- 当前 Flux 在“能力不混入数据 scope”这件事上已经明显优于主流方案。
- `COLK` 的优势不在第一次分离，而在第二次收紧，也就是从 lookup boundary 升级到 execution lease boundary。

### 1.4 React host 集成与 runtime 分层很工程化

`docs/architecture/renderer-runtime.md` 和 `packages/flux-react/src/index.tsx` 显示，当前 Flux 的 React host 已经有很清晰的集成边界：

- root boundary explicit props
- split contexts
- selector-based subscriptions
- `NodeRenderer` 只做单节点执行协调
- owner boundary 由 page/form/surface/fragment creator 自己创建

优点：

- 非常适合真实 React 项目接入
- 有明确的 rerender 控制与 provider 分层
- 对 page/form/dialog/table 这些 owner family 的边界已经很清楚

`COLK` 在这一层没有天然优势。

因为：

- `COLK` 的优势主要发生在业务变化语义层
- 它并不会自动带来更好的 React integration contract

结论：

- 在“前端渲染宿主工程质量”上，当前 Flux 明显强于 `COLK` 文档现阶段。

### 1.5 表单、数据域 owner、staged/live 边界已经非常深入

`docs/architecture/data-domain-owner.md` 和 `packages/flux-runtime/src/form-runtime.ts` 体现出当前 Flux 在这些问题上已经做了很多真实工作：

- form runtime
- validation facet
- staged/live publish facet
- child contract
- rootPath / owner-qualified path
- row identity / rowKey retarget

优点：

- 这不是停留在理念层，而是有大量实现细节和长期架构沉淀。
- 它对“谁拥有值、谁拥有 validation、谁负责 publish”已经有比较严密的解释。
- 它能处理很多低代码系统最难处理的细节场景：detail editor、row-local edit、child owner contract。

`COLK` 在这方面的长处是：

- 把 publish semantics 升格为整个系统的第一执行模型

但短板是：

- 它还没有像当前 Flux 一样把各种 field owner family、row retarget、validation facet 做细。

结论：

- 在“局部编辑语义”和“复杂表单/data-owner 细节”上，当前 Flux 明显更成熟。

## 2. 当前 Flux 的局限

### 2.1 执行主体仍然偏前端页面运行时

虽然当前 Flux 的 primitive 设计很干净，但它的总体重心仍然是：

- 编译 schema
- 在页面/表单/组件树下执行值、资源、反应、action
- 通过 capability 穿出副作用

也就是说，它的执行主语仍然是“挂在页面树上的运行时节点和语义 owner”。

这不是缺陷，但会带来一个结果：

- 系统更擅长回答“这个页面/表单怎么执行”
- 不那么擅长回答“这个业务变化为什么成立、如何审计、如何跨入口统一、如何重放、如何合并”

### 2.2 Action 仍然是主要业务变化入口

当前 Flux 已经把 `Action Algebra` 做成派生系统，而不是 primitive，这很正确。

但在实际执行面上，业务变化仍大量通过 action dispatch 发生：

- `setValue`
- `ajax`
- `submitForm`
- dialog/open/close
- namespaced actions

这意味着：

- action 仍然同时承担“入口、编排、副作用桥接、状态修改”多个角色
- 即使能力 lookup 已经拆开，变化执行仍然没有一个更高阶的统一提交实体

所以当前 Flux 的 action 系统很强，但它更像“强运行时控制流”，而不是“强业务提交模型”。

### 2.3 审计、协作、AI 还不是第一性对象

当前 Flux 文档里当然有很多工具化、诊断、manifest、host contract 的设计，但总体上：

- 审计是 runtime/debugger/tooling 方向的能力
- 协作主要还是 domain/host 层话题
- AI 仍然偏 authoring assistant 或 tooling consumer

这与 `COLK` 的核心差异是：

- 当前 Flux：AI/协作/审计是围绕 runtime 的重要外围系统
- `COLK`：AI/协作/审计直接收敛在 `Commit Unit` 上，是内核约束

### 2.4 多入口统一仍不彻底

当前 Flux 可以支持：

- UI action
- reaction
- page/form lifecycle
- host capability

但这些入口统一在“执行模型”上，并不完全统一在“业务变化语义”上。

换句话说：

- 它们共享的是 runtime primitive 和 action dispatch 语义
- 不一定共享一个“业务提交记录语义”

这使得它非常适合做执行内核，但不天然等于“业务变化总账内核”。

## 3. COLK 的真实强项

### 3.1 统一入口的能力更强

`COLK` 的最大优点，是把以下入口统一成同一个东西：

- 页面交互
- AI agent
- webhook
- timer
- 人工操作

它们最终都只能产生：

- `Commit Draft`
- `Commit Unit`

这比当前 Flux 的统一更强，因为当前 Flux 更偏“统一执行原语”，而 `COLK` 统一的是“业务变化载体”。

### 3.2 审计、回放、协作天然更强

`COLK` 用 `Journal Entry` 把业务变化变成正式一等对象。

好处：

- 审计不再是附加日志
- 回放不再是调试能力，而是内核能力
- 冲突分析可以围绕 `basis` / `claim` / `constraint`
- AI 与人类操作天然在同一日志语义里

这是当前 Flux 明显不如 `COLK` 的地方。

当前 Flux 可以做日志和调试，但它的主内核不是 journal-centric。

### 3.3 AI 适配性更高

当前 Flux 已经适合 AI 生成 schema 和 action，但 AI 仍容易生成：

- 结构复杂的页面树
- 混合上下文访问
- 各种 action glue

`COLK` 则给 AI 更清晰的输出目标：

- commit template
- commit draft
- admission diagnostics

这对 AI 更友好，因为：

- 输出目标更结构化
- 可拒绝、可修复、可回滚
- 不要求 AI 直接生成隐式 runtime glue

### 3.4 能力治理更彻底

当前 Flux 的 capability 已经做到了“只通过 capability 出效果”。

`COLK` 更进一步：

- 不只关心谁能 resolve 到能力
- 还关心谁在这次 commit 中被正式授予能力
- 还关心 lease 的时效和范围

所以它在安全和治理层面理论上更强。

## 4. COLK 的明显代价

### 4.1 概念负担显著更重

相对当前 Flux 七原语闭包，`COLK` 的内核术语更多：

- draft
- commit
- basis
- claim
- constraint
- lease
- effect schedule
- journal
- projection

这些术语是有价值的，但会带来：

- 学习成本更高
- authoring 难度更高
- MVP 难做

### 4.2 对简单页面场景可能过重

当前 Flux 对“页面 + 表单 + action + resource”这类场景很自然。

`COLK` 若严格执行，会让简单场景也要经过：

- draft
- admission
- constraint
- effect
- journal

这对简单前端交互是偏重的。

### 4.3 前端 authoring 体验未必更好

`COLK` 很强，但不自动意味着页面作者体验更好。

因为页面作者最常见的问题是：

- 我这里显示什么
- 我点按钮后做什么
- 我字段联动怎么写

当前 Flux 已经围绕这些问题形成了比较成熟的 runtime/renderer/form 语义。

`COLK` 如果没有一个非常好的 projection authoring 层，会让作者感觉：

- 理论很强
- 写页面更绕

### 4.4 实现落地难度远高于当前 Flux

当前 Flux 已经有：

- compiler
- runtime
- form/page/surface owner
- action algebra
- host manifest
- React integration

而 `COLK` 需要补齐的东西非常多：

- commit IR
- admission engine
- constraint engine
- journal store
- conflict resolution
- projection engine
- authoring DSL

也就是说，`COLK` 的理论收益很高，但落地成本和迁移成本都很高。

## 5. 分维度对比

| 维度 | 当前 Flux | COLK |
| --- | --- | --- |
| 执行主体 | `Final Execution Schema` runtime | `Commit Unit` business-change kernel |
| 核心优势 | 原语清晰、runtime 稳定、前端工程化成熟 | 审计强、多入口统一、AI/协作天然友好 |
| 状态边界 | scope/data-domain owner/form/page/surface 边界清楚 | canonical/draft/journal 边界更统一 |
| 副作用模型 | capability + action algebra | admission + lease + effect schedule |
| 宿主集成 | 已有成熟 host projection / manifest / action scope 设计 | 还需补完整 host projection authoring 体系 |
| 表单/局部编辑 | 很成熟，细节多 | 还偏高层，缺很多局部编辑细节 |
| 审计/回放 | 可做，但不是内核主轴 | 内核主轴 |
| AI 适配 | 可生成 schema/action，但仍易落回页面中心心智 | 目标更结构化，更适合 agent 提交 |
| 简单场景成本 | 较低 | 较高 |
| 实现成熟度 | 高 | 低 |
| 理论统一性 | 前端执行统一性强 | 业务变化统一性强 |

## 6. 哪些地方当前 Flux 更好

当前 Flux 更好的地方：

1. 更适合作为通用前端低代码 runtime 核心。
2. 更适合页面、表单、渲染器、宿主集成这些真实前端问题。
3. 已经有很强的词法边界、owner 语义、host boundary discipline。
4. 更容易渐进演化，不需要一次性重写平台主语。
5. 对简单到中等复杂度业务场景，更现实、更可交付。

## 7. 哪些地方 COLK 更好

`COLK` 更好的地方：

1. 更适合作为“业务变化总账内核”。
2. 更适合 AI、人类、Webhook、自动化共用一套变化协议。
3. 更适合强审计、强回放、强协作冲突分析。
4. 更容易把副作用治理和授权提升到显式制度层。
5. 更有机会跳出“页面树 + action”作为平台主语的旧吸引子。

## 8. 哪些优点不能简单比较

有些优点不是一方绝对优于另一方，而是优化目标不同。

### 8.1 Flux 优化的是“执行内核最小闭包”

当前 Flux 的第一目标是：

- 保持 runtime surface 小而稳
- 保持 host/domain complexity 不灌回 core

所以它对复杂度的处理方式是：

- 用 primitive closure 和 derived runtime system 控制增长

### 8.2 COLK 优化的是“业务变化语义总线”

`COLK` 的第一目标是：

- 让任何业务变化都能被统一表达、解释、拒绝、审计、回放

所以它对复杂度的处理方式是：

- 用提交协议、约束协议、日志协议吸收增长

这两者不是同一个优化函数。

## 9. 最现实的判断

如果问题是：

“现有 Flux 设计好不好？”

答案是：

- 好，而且在低代码前端 runtime 这一层已经明显优于大量主流方案。

如果问题是：

“`COLK` 是否在某些方向上优于当前 Flux？”

答案也是：

- 是，尤其是在业务变化统一、审计、协作、AI 多入口统一这些方向上，`COLK` 的理论上限更高。

但如果问题是：

“`COLK` 能否立刻替代当前 Flux？”

答案是否定的：

- 不能。
- 因为当前 Flux 已经拥有大量成熟的 runtime、renderer、form、owner、host 集成细节，而 `COLK` 目前还没有对应成熟度。

## 10. 历史文档给出的更强结论

补看历史分析与实验回顾后，可以得到一个比上一版更强的判断。

### 10.1 仓库历史结论整体并不支持整体重写

以下文档反复得出相近结论：

- `docs/analysis/experiment-retrospective-value-assessment.md`
- `docs/analysis/2026-04-26-flux-architecture-improvement-opportunities.md`
- `docs/analysis/2026-04-06-frontend-programming-model-staged-reactive-alternative.md`
- `docs/experiments/flux-pragmatic-adoptable-runtime-upgrades.md`

它们的共同结论是：

1. 当前 Flux 总体方向是对的。
2. 实验稿的大部分价值已经被当前工程逐步吸收。
3. 剩余价值集中在少数协议级改进，而不是整包 clean-slate 架构。
4. 继续推进应是 refine current Flux，而不是 replace current Flux。

这意味着：

- 如果把 `COLK` 当成“下一代正式内核替代 baseline”，它与仓库已有历史结论并不一致。
- 如果把 `COLK` 当成“暴露问题空间并筛选少数高价值收敛点”的实验，它仍然有价值。

### 10.2 历史文档已经明确否决了若干 clean-slate 倾向

历史分析里被多次否决或降级的方向包括：

1. 重开 primitive closure。
2. 把 Flux 从 `Final Execution Schema` runtime 改写成更大的 staged program VM。
3. 把 host/designer/workbench 提升成新的平台级 core ontology。
4. 在浏览器端重新承载 loader/inheritance/profile/assembly 语义。
5. 引入完整的 execution package / program / kernel / session 公开拓扑，作为当前阶段的主路径。

这几条都与 `COLK` 的重心天然存在张力。

### 10.3 历史结论对当前 Flux 的评价比“还不错”更强

`docs/analysis/experiment-retrospective-value-assessment.md` 给出的判断非常明确：

- 当前架构已经是强健的、可上线的生产级设计。
- 没有识别出需要基础性重架构的需求。
- 更合理的是增量吸收 8 类跨版本主题，而不是切换到某一版实验内核。

所以从仓库历史证据看，当前 Flux 不是“过渡方案”，而是“当前正确基线”。

## 11. 哪些 `COLK` 主张与仓库历史结论冲突

### 11.1 “提交成为唯一一等执行对象”与当前七原语闭包冲突

`COLK` 把 `Commit Unit` 提升为主语，这在概念上非常强。

但从当前架构文档看：

- Flux 已经把 `Template`、`ScopeRef`、`Value`、`Resource`、`Reaction`、`Capability`、`Host Projection` 固定为闭包。
- 历史分析明确反对再引入新的 core primitive 或新的总本体。

因此：

- 若 `Commit Unit` 只是平台上层业务协议，它可以讨论。
- 若 `Commit Unit` 要替代现有执行主语，它就与现行基线冲突。

### 11.2 Admission / Journal / Lease 更适合业务协议层，不适合直接压入当前 Flux core

`COLK` 的：

- admission
- journal
- capability lease
- effect schedule

这些对象更像业务变化治理协议，而不是当前 Flux core 最需要的 runtime primitive。

历史文档更倾向于：

- 把 effect boundary 做得更清晰
- 把 async governance 做得更一致
- 把 diagnostics/debugger 做得更强

而不是先引入一整套新的内核实体。

### 11.3 `COLK` 倾向统一“业务变化总线”，而 Flux 明确坚持“执行内核最小闭包”

这两者的优化目标不同：

- Flux 要的是最小、稳定、可组合的前端执行内核。
- `COLK` 要的是最强、最统一、最可审计的业务变化语义总线。

历史文档已经站队前者作为当前仓库 baseline。

## 12. 哪些 `COLK` 价值点与历史分析是相容的

虽然整体替代不成立，但 `COLK` 并非没有可保留的价值。

### 12.1 explainability / auditability 方向是被认可的

`COLK` 强调：

- 为什么这个变化成立
- 为什么某个异步结果被接受或丢弃
- 为什么某个副作用被允许执行

这与当前仓库的以下方向高度相容：

- `docs/architecture/debugger-runtime.md`
- `docs/analysis/2026-03-21-framework-debugger-design.md`
- `docs/analysis/experiment-retrospective-value-assessment.md`

也就是说：

- `COLK` 的 explainability 诉求是对的
- 但当前仓库更倾向通过 debugger/diagnostics/async governance/source metadata 去满足，而不是通过重写 core ontology 去满足

### 12.2 capability discipline 的进一步收紧是相容的

当前 Flux 已经有：

- `ScopeRef` / `ActionScope` / `ComponentHandleRegistry` 分离
- `Host Projection` 只读
- `Capability` 作为唯一 author-visible effect path

`COLK` 的 lease 思路可以被理解为：

- 对 capability discipline 的进一步强化方向

但历史文档更支持先吸收：

- effect channel discipline
- host normalization
- action/runtime diagnostics

而不是直接上完整 lease 内核。

### 12.3 多入口统一可以先吸收到 async governance 和 effect discipline

`COLK` 强调统一：

- UI
- AI
- webhook
- timer
- operator

当前仓库历史文档更现实的吸收方式是：

1. 统一 async governance
2. 统一 scope write source metadata
3. 统一 effect interception boundary
4. 统一 debugger explanation surface

这是一种“吸收统一性收益，但不整体换内核”的路线。

## 13. 历史文档支持吸收的，具体是什么

根据 `experiment-retrospective-value-assessment.md` 和 `flux-pragmatic-adoptable-runtime-upgrades.md`，真正值得吸收的重点不是 `COLK` 全案，而是更窄的协议级升级：

1. async epoch / stale-result protocol
2. 更丰富的 `ScopeChange` source metadata 和 revision
3. host projection / capability result 的 schema-safe normalization
4. value-oriented family 的共享 owner substrate
5. `RendererRuntime` 的内部服务分层
6. 更强的 settle/update turn discipline
7. 更好的 error boundary / null-safe expression behavior
8. 更强的 debugger / diagnostics / explain APIs

这组结论很重要，因为它修正了一个潜在误判：

- `COLK` 的价值不主要在“换一个新的主内核名字”
- 而在于它逼出了哪些协议升级确实能提升当前 Flux

## 14. 修正后的建议结论

结合当前代码、当前规范文档、历史实验对比文档、analysis 文档之后，更稳妥的结论应改写为：

1. 不建议把 `COLK` 作为当前仓库的替代架构基线。
2. 建议继续把当前 Flux 作为正式执行内核。
3. 建议把 `COLK` 视为“压力测试当前架构边界”的实验框架，而不是待落地的新正统。
4. 如果要吸收 `COLK` 的价值，应优先吸收 explainability、async governance、effect discipline、write provenance、host normalization 这些窄协议。

更具体地说：

- Flux 继续负责：
  - template
  - scope
  - value/resource/reaction
  - capability
  - host projection
  - renderer/runtime integration
- 可吸收的 next-gen 收益负责强化：
  - async authoritative run/stale discard
  - write source / causation metadata
  - debugger explanation and auditability
  - effect boundary discipline
  - staged owner/value-owner shared substrate

不建议当前阶段直接引入为新 core baseline 的内容：

- `Commit Unit` 作为唯一一等执行主语
- 完整 admission kernel
- 完整 journal-centric runtime core
- 完整 lease-centric capability execution model

## 15. 最终判断

现有 Flux 的优势是：

- 结构干净
- 边界清楚
- runtime 工程化成熟
- 低代码前端问题理解深入

`COLK` 的优势是：

- 更大胆地重写平台主语
- 更适合 AI 与协作时代
- 更适合把“业务变化”而不是“页面执行”作为内核中心

所以两者的优缺点可以归纳成一句话：

- 当前 Flux 更像一个已经做得很强、并且被仓库历史反复验证过的“前端低代码执行虚拟机”
- `COLK` 更像一个有启发性的“业务变化提交内核假说”，其价值主要在于暴露未来值得吸收的协议升级，而不是直接成为当前架构替代品

前者更成熟，后者更激进。
前者更现实，后者上限可能更高。

但结合本仓库已有历史结论，更准确的落点应是：

- 继续演进前者
- 选择性吸收后者
- 不把后者误判成当前必须切换的新基线
