# SPDD vs AGE: 结构化提示治理与轨迹工程对比

> Date: 2026-06-01
> Source: 微信公众号《【翻译】结构化提示驱动开发（SPDD）》（https://mp.weixin.qq.com/s/aV_gB87XEOrdZN0oAOgInQ)+ `docs/articles/age-from-state-engineering-to-trajectory-engineering.md`
> Related: `docs/analysis/2026-05-31-harness-sdd-vs-age-practice-comparison.md`
> Scope: 分析 SPDD 与 AGE 的重叠、差异、SPDD 的潜在问题，以及 AGE 是否能更好解决这些问题。

## 1. 结论先行

SPDD 的核心贡献是把 prompt 从一次性聊天输入提升为可版本化、可审查、可复用、可同步的工程制品。它解决的是 AI 生成代码之前和之后的意图治理问题：需求如何变成结构化提示，提示如何约束生成，代码变化后提示如何同步回当前实现。

AGE 的核心贡献不是再发明一种更强 prompt，也不是把 spec 写得更细。AGE 处理的是更底层的问题：仓库作为长期演化系统，在 AI 高频扰动下如何仍然围绕正确吸引子收敛。它要求 prompt、spec、plan、test、audit、log、bug note、owner doc 都回到同一个问题下重新定位：它们是否帮助仓库轨迹收敛，而不是只让某次变更显得完整。

因此，SPDD 是一种有价值的 harness。AGE 是判断 harness 是否有方向、是否会固化错误基线的上层框架。SPDD 可以成为 AGE 的局部载体，但不能替代 AGE。

## 2. SPDD 的核心结构

SPDD 将结构化提示作为一等交付物，与代码一起进入版本控制、review、复用和持续改进。它不依赖临时聊天，而是要求团队用固定结构捕获需求、领域语言、设计意图、约束和任务分解。

文章中最核心的结构是 REASONS Canvas：

| 维度         | 含义           | 工程作用                           |
| ------------ | -------------- | ---------------------------------- |
| Requirements | 需求与完成定义 | 明确要解决什么问题、什么算完成     |
| Entities     | 领域实体及关系 | 建立业务语言和领域模型             |
| Approach     | 实现策略       | 记录设计方向和权衡                 |
| Structure    | 系统结构位置   | 约束变更落点、组件与依赖           |
| Operations   | 可执行步骤     | 将抽象方案拆成可测试任务           |
| Norms        | 工程规范       | 注入命名、日志、错误处理等横切标准 |
| Safeguards   | 不可协商边界   | 明确安全、性能、不变量等硬约束     |

它的工作流以 `openspdd` 命令串联：

| 命令                   | 作用                                             |
| ---------------------- | ------------------------------------------------ |
| `/spdd-story`          | 将大需求拆成用户故事                             |
| `/spdd-analysis`       | 从需求提取领域关键词并扫描相关代码，生成战略分析 |
| `/spdd-reasons-canvas` | 生成完整 REASONS Canvas                          |
| `/spdd-generate`       | 读取 Canvas 并按 Operations 生成代码             |
| `/spdd-api-test`       | 生成 API 测试脚本                                |
| `/spdd-prompt-update`  | 需求变化时先更新提示，再更新代码                 |
| `/spdd-sync`           | 代码重构或修复后同步回 Canvas                    |

最关键的纪律是：

```text
当现实偏离时，先修提示词，再更新代码。
```

逻辑修正走需求 → prompt → code；无行为变化的重构可以先 code → prompt sync。这个双向同步机制是 SPDD 相比普通 spec-driven development 的主要增强。

## 3. SPDD 与 AGE 的重叠

### 3.1 都反对临时聊天驱动开发

SPDD 认为临时 prompt 不可治理、不可复用、不可审查。AGE 认为 chat 中形成的判断如果不进入仓库责任坐标，对下一个 AI session 基本不存在。二者都要求把会话中的关键判断落到可恢复的 repo artifact 中。

差别在于落点不同。SPDD 的主落点是结构化提示。AGE 的落点是更宽的仓库现实：owner doc、plan、test、bug note、log、audit evidence、code/tests 等都有不同责任坐标。

### 3.2 都强调先对齐，再生成

SPDD 的三项核心技能是抽象优先、对齐、迭代审查。REASONS Canvas 在生成代码前先要求需求、实体、方法、结构、规范和保障条件对齐。

AGE 同样反对先生成再补解释，但它追问得更深：对齐的对象不是某次 prompt，而是仓库长期应收敛的吸引子。若没有吸引子，prompt 越细，越可能只是更精确地执行错误方向。

### 3.3 都要求现实与文档双向同步

SPDD 用 `/spdd-prompt-update` 和 `/spdd-sync` 明确提示与代码之间的双向同步。AGE 也要求文档、代码、测试、audit evidence 能从 live repo 重新验证，避免文档成为陈旧叙事。

差别在于 SPDD 主要同步 prompt-code pair；AGE 同步的是语义承诺在整个 repo topology 中的位置。某条规则是否应该进入 prompt、architecture doc、bug note、test，或只是当前 plan 的 closure evidence，需要由责任坐标决定。

### 3.4 都把 review 前移

SPDD 把 review 从只看代码前移到审查分析文档与 REASONS Canvas。AGE 也要求计划、owner doc、proof relation、closure audit 在代码之外发挥作用。

共同点是：代码 diff 到达 review 阶段时再发现意图错误，成本太高。

## 4. 根本差异

### 4.1 第一性对象不同

| 框架 | 第一性对象             | 主要问题                                    |
| ---- | ---------------------- | ------------------------------------------- |
| SPDD | 结构化 prompt / Canvas | 如何让 AI 生成变更可治理、可审查、可复用    |
| AGE  | 仓库轨迹 / attractor   | AI 高频扰动后，仓库是否仍沿正确长期结构收敛 |

SPDD 把 prompt 升格为一等交付物，这是重要进步。但 AGE 进一步把轨迹升格为第一性对象。prompt 只是轨迹控制中的一个输入面，不是系统本身。

### 4.2 Truth model 不同

SPDD 的隐含 truth model 是：结构化提示应成为意图与设计的准确记录，并与代码同步演进。

AGE 的 truth model 是多源、有优先级、有 owner 的 source-of-truth graph：代码回答当前行为，owner docs 回答长期方向，tests 回答证明关系，plans/logs 回答本轮变化义务和历史轨迹，bug notes 回答非显然根因与证伪路径。

因此，AGE 不会接受“prompt is truth”的绝对化表述。prompt 可以是强载体，但它必须服从 owner-doc precedence 和 proof relation。否则 prompt 会把架构、历史、测试承诺、当前实现和待决问题压成同一种 artifact。

### 4.3 控制粒度不同

SPDD 的控制粒度是单次或一组变更。它将业务输入转化为分析、Canvas、生成、验证、同步，最终形成 prompt-code 可追溯闭环。

AGE 的控制粒度是跨 session、跨变更、跨时间的仓库演化。它关心的是一个局部正确的 prompt-code 闭环是否把系统推向错误长期结构。

SPDD 能回答：这次生成是否遵守了 Canvas？AGE 还要问：这个 Canvas 本身是否处在正确权威位置？它引用的结构是否新鲜？它有没有固化错误基线？它引入的变化义务是否被 owner doc、tests 和 audit evidence 吸收？

### 4.4 人类角色不同

SPDD 文章明确强调它目前是半自动、以人为中心的框架，人类仍是核心决策把关者。它重视人类在抽象、建模、系统分析和业务理解上的能力。

AGE 更强调 owner function。owner 不必永久等同于某个人类，但系统必须有一种机制承担语义权威、长期责任和裁决能力。当前阶段通常是人类 owner 与仓库结构共同承担；未来也可能由更可靠的 AI、团队机制或自动化承担一部分。

也就是说，SPDD 更接近 human-in-the-loop 的强流程协作。AGE 更接近 human out-of-loop guidance：人或 owner function 设计吸引子、权威结构、验证面和记忆机制，让 AI 在其中展开并收敛。

## 5. SPDD 的潜在问题

### 5.1 Prompt 可能变成新的单点权威

SPDD 的口号“提示即代码”很有效，但也危险。若团队把 Canvas 当作唯一权威，它会吞掉不同 artifact 的责任边界。

例如，同一条信息可能有不同性质：

| 信息           | 正确 AGE 落点                     |
| -------------- | --------------------------------- |
| 当前 API 行为  | code/tests                        |
| 长期领域边界   | owner doc / architecture doc      |
| 本轮任务约束   | plan / Canvas                     |
| 历史错误路径   | bug note                          |
| 尚未裁决的问题 | active requirement / open issue   |
| 验证证据       | test / audit evidence / CI output |

如果全部写进 Canvas，它看似完整，实际可能压平语义拓扑。下次 AI 读到一个巨大 prompt，很难判断哪些是长期权威、哪些是本轮临时约束、哪些是过期历史。

### 5.2 同步可能只是 J-flow，不一定是 R-flow

SPDD 的双向同步很强，但同步本身不等于收敛。

把代码侧变更同步回 Canvas，可能只是把事实从一个载体搬到另一个载体。这是 J-flow：信息在载体之间移动。AGE 会继续追问是否发生了 R-flow：不确定性有没有减少？owner 有没有裁决？测试有没有证明正确承诺？错误路径有没有被证伪并进入记忆？

一个错误实现也可以被 `/spdd-sync` 同步得非常漂亮。同步降低了 prompt-code drift，但不能自动保证 attractor 正确。

### 5.3 REASONS Canvas 缺少显式 owner precedence

REASONS Canvas 覆盖需求、实体、方法、结构、操作、规范和保障，但它没有显式回答：当 Canvas、代码、架构文档、历史 bug note、测试、团队规则冲突时，谁优先？

SPDD 文章强调人类审查和版本控制，但没有给出完整 source-of-truth graph。对复杂仓库来说，这会造成一个隐性风险：当前 Canvas 可能覆盖长期架构承诺，或者把历史兼容性约束误认为新设计原则。

AGE 的 owner-doc precedence 能补足这一点。Canvas 应该被视为一轮变更的强 carrier，而不是全局 owner。

### 5.4 Prompt-code pair 不能覆盖 repo trajectory

SPDD 很擅长治理某个增强需求，例如文章中的计费引擎扩展。但长期问题通常不是单次增强本身，而是多个增强之后的轨迹漂移。

典型风险包括：

- 每次 Canvas 都合理，但多个 Canvas 之间的领域模型开始分叉。
- 每次同步都成功，但长期 owner doc 没有吸收稳定规则。
- 每次测试都通过，但测试逐渐保护错误抽象。
- 每次 review 都检查了提示与代码一致，但没有检查语义承诺是否泄漏。
- 每次 prompt 更新都很精确，但仓库实际吸引子已经被局部需求推歪。

这些问题不是靠更细的 prompt 模板就能解决的。

### 5.5 ROI 边界说明了它不是通用底层框架

SPDD 文章自己承认它适合规模化、标准化、高合规、团队协作、可追溯、横切一致性工作；不适合应急热修复、探索性 spike、一次性脚本、上下文黑洞、纯创意/视觉工作。

这说明 SPDD 是一种有适用边界的工程投资。AGE 的边界不同：即使一个任务不值得完整 SPDD，它仍然有轨迹问题。轻量 bug note、focused test、owner doc 一句话、fresh session audit，都可以是 AGE 的轻量载体。

## 6. AGE 如何补强 SPDD

### 6.1 Attractor before Prompt

SPDD 可以增加一个前置判断：在生成或更新 Canvas 前，先确认本轮需求应收敛到哪个 owner-level attractor。

```text
需求 → owner/attractor 定位 → REASONS Canvas → code/tests → audit evidence → memory
```

这样 Canvas 不再是孤立 prompt，而是某个吸引子下的执行载体。

### 6.2 Canvas 需要 owner 与 freshness 字段

SPDD 的 Canvas 可以扩展两个 AGE 字段：

| 字段              | 作用                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| Owner / Authority | 本 Canvas 中每类承诺的上游权威来源是什么                                     |
| Freshness         | 引用的架构文档、规则、历史判断是否 fresh / partially stale / stale / unknown |

这能避免 AI 在过期文档上生成“很结构化”的错误计划。

### 6.3 Operations 需要 proof relation

SPDD 的 `Operations` 已经把任务拆成可执行步骤。AGE 会要求每个关键 operation 绑定它证明或维护的语义承诺。

```text
Operation -> changed code -> test/audit proof -> protected semantic commitment
```

这能防止测试只证明实现细节，而不是证明业务或架构承诺。

### 6.4 `/spdd-sync` 之后需要 semantic leakage check

代码同步回 Canvas 后，还应检查：

- 是否有语义承诺从 owner doc 漂移到 Canvas？
- 是否有临时实现被描述成长期原则？
- 是否有历史 bug 约束被遗忘？
- 是否有测试开始保护错误抽象？
- 是否有变化义务尚未被稳定 artifact 吸收？

这类检查属于 AGE closure audit，不是普通 prompt-code sync 能自动完成的。

### 6.5 Prompt library 应该进入 repo topology，而不是平面资产库

SPDD 希望成功模式积累为可复用提示库。这有价值，但提示库如果只是平面集合，会逐渐变成“看起来都能用”的模板仓库。

AGE 的要求是：每个 reusable prompt 都应知道自己服务哪个 owner doc、适用哪个领域边界、有哪些 proof expectation、什么时候过期、被哪个历史 bug 或 audit finding 修正过。

换句话说，prompt 不是孤立资产，而是 repo semantic topology 中的节点。

## 7. AGE 是否能更好解决 SPDD 关心的问题

答案取决于“问题”是哪一层。

| 问题                               | SPDD 是否擅长 | AGE 是否更好                                           |
| ---------------------------------- | ------------- | ------------------------------------------------------ |
| 将业务需求结构化为 AI 可执行输入   | 是            | AGE 不替代，可提供前置定位                             |
| 让 prompt 可审查、可复用、可版本化 | 是            | AGE 可补充 owner/freshness/proof 关系                  |
| 防止 prompt 与代码漂移             | 是            | AGE 会进一步检查语义承诺是否漂移                       |
| 单次复杂变更的生成治理             | 是            | AGE 提供方向判断，但不一定替代 SPDD 的具体流程         |
| 多轮变更后的长期架构漂移           | 部分          | 是，AGE 的核心问题正是轨迹收敛                         |
| 防止错误基线被严格流程固化         | 弱            | 是，AGE 的 `Attractor before Harness` 专门处理这个问题 |
| 判断 artifact 之间谁有权威         | 弱            | 是，AGE 依赖 owner-doc precedence 与责任坐标           |
| 管理不同任务重量下的流程成本       | 中            | AGE 可轻可重，但需要具体策略配合                       |

SPDD 更像高质量执行引擎。AGE 更像判断执行是否沿正确长期结构收敛的动力学框架。SPDD 可以让 AI 更可控地做事；AGE 判断“这件事是不是应该这样进入仓库现实”。

## 8. 对 nop-chaos-flux / AGE 实践的启发

### 8.1 可吸收的 SPDD 实践

SPDD 有几项实践值得吸收：

- 对复杂需求使用固定结构先做 analysis，再生成可执行蓝图。
- 把逻辑修正和无行为重构分流：前者先改意图载体，后者可先改代码再同步说明。
- 在代码前审查领域实体、方法、结构、工程规范和硬约束。
- 对 AI 生成的测试场景做去重和承诺对齐，而不是照单全收。
- 让可复用 prompt 成为版本化资产，但必须挂接到 owner topology。

### 8.2 不应直接照搬的部分

以下部分不宜直接照搬为 AGE 核心：

- 不应把结构化 prompt 变成唯一 truth source。
- 不应要求所有任务都走完整 SPDD 流程。
- 不应把 `/spdd-sync` 等价为 closure audit。
- 不应把 prompt library 当成 owner docs 或 architecture docs 的替代品。
- 不应将“提示即代码”理解为“提示拥有与代码相同类型的权威”。

### 8.3 一个 AGE 化的 SPDD 流程

如果把 SPDD 放入 AGE，较合理的流程是：

```text
1. 定位本轮需求对应的 owner docs / attractor
2. 检查相关 docs freshness 与 source-of-truth precedence
3. 用 REASONS Canvas 形成本轮变更 carrier
4. 审查 Canvas 是否真实消解不确定性，而不是搬运信息
5. 根据 Canvas 实现 code/tests
6. 将稳定承诺吸收回 owner docs / tests / bug notes / logs
7. 做 closure audit：proof relation、semantic leakage、residual obligations
8. 只把可复用且仍 fresh 的部分沉淀为 prompt asset
```

这个流程保留 SPDD 的强执行优势，但避免 prompt 侵占仓库语义权威。

## 9. 最终判断

SPDD 的创新在于：它正确看见了 prompt 不能继续停留在 chat 层。prompt 作为 AI 生成代码的直接控制面，必须被结构化、版本化、审查化、同步化。这一点非常重要。

但 AGE 会进一步指出：prompt 不是 AI 软件工程的最终对象。真正需要被工程化的是仓库轨迹。结构化提示可以降低单轮变更的不确定性，却不能单独定义系统长期应该成为谁。

SPDD 回答：

> 怎样让 AI 辅助变更可治理、可审查、可复用？

AGE 回答：

> 这些治理、审查和复用机制，是否让仓库沿正确吸引子收敛？

因此，AGE 能更好解决 SPDD 背后最深层的问题：不是“如何把 prompt 管好”，而是“prompt、spec、test、doc、audit、code 共同作用后，系统是否仍然成为同一个正确系统”。

SPDD 值得作为 AGE 的一个强 harness 被吸收。但它一旦脱离 owner、freshness、proof relation 和 trajectory audit，就会退化为更高级的 prompt 管理术。AGE 的优势正在于防止这种退化。
