# 吸引子先于 Harness：Harness Engineering 与 Attractor-Guided Engineering 的深层对比

> 相关材料：Ryan Lopopolo 伦敦演讲 "Harness Engineering: How to Build Software When Humans Steer, Agents Execute"，[微信公众号 AI 趣实验中文整理稿](https://mp.weixin.qq.com/s/3BvebfHJygUmXHrOROM7-w)）、[nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux)（AGE 的生产级实施实例）、[attractor-guided-engineering-template](https://github.com/entropy-cloud/attractor-guided-engineering-template)（AGE 方法论模板仓库）
> AGE 方法论系列文章：[Attractor Before Harness: AI 大规模开发的方法论](https://mp.weixin.qq.com/s/TwMkUDLNo2-bIrXrfvPqIw)、[从 Spec-Driven Development 到 AGE](https://mp.weixin.qq.com/s/j4dZm1bAK61qB8i5RzHRWA)
> 相关对比文章：[控制层和方向层的分野：OpenProse、NLAHs 与 AGE](https://mp.weixin.qq.com/s/scTDkvSOxww3YI4YNs09mA)

## 起点

OpenAI 技术团队成员 Ryan Lopopolo 在 AI Engineer 伦敦演讲中系统讲述了 Harness Engineering，他在演讲中宣称

> 实现已经不再是软件工程里最稀缺的资源。代码是免费的。

Ryan 的演讲标题是 **Harness Engineering: How to Build Software When Humans Steer, Agents Execute**。"AI 趣实验"的整理稿随后把这套实践进一步提炼为具有五层定义的工程方法论。

[Attractor-Guided Engineering（AGE）](https://github.com/entropy-cloud/attractor-guided-engineering-template)是我从非线性动力系统控制原理出发所建立的AI大规模开发的方法论，它在 [nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux) 中形成了生产级实践，并在 [attractor-guided-engineering-template](https://github.com/entropy-cloud/attractor-guided-engineering-template) 中被抽取为通用模板的一部分。它的核心判断是：

> 在 AI 深度参与开发的系统中，第一性的问题不是"如何约束 AI 的行为"，而是"系统应当收敛到怎样的长期结构"。

两者从同一个观察出发——代码变便宜了，工程师的角色变了——但在"因此什么才是真正稀缺的"这个问题上给出了不同回答。

这篇文章先把两者一致的地方讲清楚，再指出四个关键分歧。

## 一、一致之处：九点共识

### 1. 代码不再是稀缺资源

Ryan 反复强调"code is free"。AGE 的表述是"真正稀缺的不是更多会写代码的 agent，而是能够率先回答'系统该向哪里收敛'的人"。两者都认为这个变化重新定义了工程师的职责。

### 2. 仓库必须成为系统的事实源

Ryan 在演讲中强调"你要用适合智能体的方式去组织系统"，并在访谈中把仓库和 GitHub Markdown 视为人和智能体共同工作的协作中心。整理稿的解读更为直白："好的仓库应该是 Agent 的唯一事实源。对智能体来说，运行时访问不到的知识，基本就等于不存在。"

AGE 的表述是：

> AI 深度参与以后，仓库不再只是人类认知的外部投射，而开始成为系统唯一真相的载体。

两者都把代码库加文档当作 agent 的操作现实；

### 3. 人类经验必须被外化进系统

Ryan 在演讲中讨论了非功能性需求（non-functional requirements）的问题：写出好代码可能需要围绕未明确规定的非功能性需求做出 500 个小决定，而团队的经验应该以一种智能体能够理解的方式写下来。整理稿把这段概括为：团队经验"不能只停留在人脑和 review 习惯里，而要写进 docs、rules、ADRs、QA plans 和代码库结构里"。

AGE 的表述是：

> 任何未被显式外化的架构判断对 AI 都不存在。

两者的工程动作是一样的：把人类判断写成可持续的仓库结构。

### 4. 渐进注入比一次性倾倒更有效

Ryan 说：

> 你不应该在一开始就把所有指令一股脑塞给智能体，那样只会把它淹没。但在整个 PR 过程中，凡是关于"什么叫好工作"的要求，最终都应该被逐步触发。一个好的 harness，应该做的是延迟注入、按需注入这些说明。

AGE 的路由层（`docs/index.md`、`AGENTS.md`）服务于同样的目的：在正确的时间把正确的上下文递到 agent 面前。

### 5. 反馈必须回写为可复用规则

Ryan 描述了一个具体的闭环：

> 人类在 PR 里给出的反馈，本质上是在暴露智能体缺失了哪些上下文。我们把这些信息写回代码库，再通过失败测试或自动注入的审查提示把它们重新喂给智能体，让它在下次出现类似行为时可以自我修正。

整理稿把这提炼为："Prompt 是短期增益，Guardrails 才是长期复利。"这个金句是"AI 趣实验"自己的总结，不是 Ryan 原话，但准确捕捉了 Ryan 描述的反馈回写机制。

在 nop-chaos-flux 中，`architecture-guardrails-from-bugs.md` 做的是同一件事：反复出现的 bug 模式被蒸馏为收敛约束，每条约束都链接到对应的架构锚点文档。

### 6. 工程师角色从实施者转向编排者

Ryan 说：

> 作为软件工程师，你们真正的职责，是为智能体团队以及驱动这些智能体的人清除障碍。

AGE 说"人定义新的 attractor，AI 围绕既定 attractor 高速展开"。二者都认为工程师不再主要承担手写实现；但 AGE 进一步把"定义新 attractor"明确为人类不能默认外包给 AI 的核心职责。

### 7. Guardrails 和验证是必要基础设施

Ryan 在演讲中强调审查智能体、lint、结构测试和 QA 计划的重要性。AGE 说：

> 在传统协作中，harness 是可选纪律；在 AI 协作中，harness 是让轨迹判断成为可能的必要条件。

两者都认为约束和验证是工程投入的核心方向。

### 8. 实现层和验收层需要独立机制

Ryan 的系统通过每次 push 触发的 persona review agents、团队沉淀的 QA plan 写作标准（功能、关键用户旅程、PR 验收材料），以及周五 garbage collection 将人工反馈回写为文档、lint、失败测试和 review-agent 提示，来减少同步人工 review 的瓶颈。AGE 也要求实现和验收分离，但把问题命名为"自我验证陷阱"——同一上下文既生成又验收的风险——并以"fresh session 或独立审计"为强制规则。两者都打破了"实现者自己说完成"的弱点，但边界不同：Ryan 从效率和吞吐出发，把 review 反馈变成可复用仓库制品；AGE 从认识论风险出发，要求 completion 必须回到 live repository 和独立上下文重新判断。

### 9. 代码库一致性降低 agent 认知负荷

Ryan 说：

> 你应该只有一种方法来编写有界并发辅助函数。你应该只有一个对象模型。

nop-chaos-flux 的设计不变量（DSL-first、authoring-execution 分离、reactive data-driven、progressive evolution、lexical ownership、domain isolation）服务于同样的结构角色：通过缩小合法状态空间让 agent 输出更可预测。

## 二、关键分歧：四个维度

### 分歧一：方向 vs 控制

**本文所对照的 Harness Engineering 表述更倾向于把方向嵌入 harness，而不是把方向作为独立对象提出**。AGE 对此的判断是：

> 当前所有这些 harness 类机制，都建立在一个隐含前提上——评价单位以状态为主，轨迹收敛靠人的隐性方向感兜底。

Ryan 的演讲确实没有提出一个独立的、命名的对象来代表"长期结构方向"。但他确实建立了丰富的方向基础设施——定义"what good looks like"的 persona 文档、断言结构不变量的测试、QA plan、以及数百个 package 的 PNPM workspace（英文 summary 记为 750-package）——只是这些都被嵌入在 harness 内部，没有独立于 harness 的存在。

**AGE 把吸引子作为一等工程对象**。它在逻辑上独立于 harness，浓缩在少数高阶不变量中——"方程定义流形，而不是枚举所有合法点"。承载 attractor 的 owner docs / architecture docs 说明系统应向哪里收敛；文档不是 attractor 本身，而是 attractor 的可版本化、可审计载体。Harness 负责依据这些载体测量和纠偏轨迹。

**为什么重要**：在 Harness 框架下，如果问"系统应该收敛到哪里"，答案会分散在 lint 规则、review 配置、persona 文档和 repo 结构中。当两条 guardrail 或两份材料冲突时，Ryan 的演讲没有提供一个独立于 harness 的方向对象来仲裁。在 AGE 中，source-of-truth / precedence model 先判断"你在问什么问题"：当前实现行为、期望收敛方向、执行闭合、历史原因分别有不同事实源；冲突需要显式分类为 implementation drift、doc drift 或 intentional legacy behavior。

nop-chaos-flux 中 `CompiledSchemaNode` 被移除，不是因为任何测试失败或 lint 报错——它仍然能工作——而是因为 attractor 的 Template/Instance 分离不变量使它"在架构上不再合法"。在 Ryan 演讲所命名的 Harness 框架中，这类决策没有被作为独立的一等方向对象来表述。

### 分歧二：轨迹 vs 状态

**Harness 主要从 PR/push 级反馈循环入手**。每个 PR 被检查，反馈循环是：agent 生成 → harness 检查 → 反馈回写；周五 garbage collection 再把重复问题转化为长期制品。Ryan 的演讲中没有把"100 个各自正确的变更累积出的方向偏移"命名为一等范畴。他的改进模型是累加的——观察错误、写 lint、加 guardrail、持续打磨。

**AGE 把轨迹作为基础范畴**。它对传统方法论的判断是：

> 传统方法论并非完全没有轨迹意识——重构、技术债务、坏味道、演进式架构、Lehman 软件演化定律都涉及轨迹。但这些概念在体系里的地位是修正机制和诊断词汇，而不是基础对象。

它不仅问"这次变更是不是正确的"，而且问"许多看似正确的变更是否仍在把系统推向正确方向"：

> 在 AI 协作中，所有状态层检查都能通过，但系统整体可以在持续漂移。

**为什么重要**：nop-chaos-flux 的 Plan 76 是典型案例。问题暴露前，相关增量提交都通过了 review / CI，测试套件长期保持绿色；但 Phase 2 一旦尝试移除 `array-editor` / `key-value` 的本地状态镜像，就暴露出 11 个测试失败，说明测试已经与旧实现时序耦合，导致结构演进被阻塞。这里批判的不是 Ryan 本人只看 CI 绿灯，而是 harness 在普通实施中很自然会退化成一种状态层直觉：检查都通过了，系统就是健康的。AGE 看到的是轨迹偏离 attractor。

这正是整理稿里那句总结的反面：

> 真正的 Harness Engineering，不是让 Agent 多会一点，而是让系统少依赖人一点。

### 分歧三：吸引子的共演化

**Harness 的反馈循环**是：观察失败 → 写 guardrail → 更好的输出。Ryan 的改进模型是观察智能体和人类一次又一次犯下的持久性错误，"设计一个解决方案，系统地消除这类不良行为"。这会持续更新"what good looks like"的实践定义，但没有显式把实践反馈上升为"更新 attractor / owner-doc baseline"的方法论机制。

**AGE 的反馈循环**不同：

> 真正的闭环不是"定义一次 attractor，然后永久执行 harness"，而是"定义 attractor → 扩张 → 纠偏 → 更新 attractor → 再扩张"。

这里的"更新 attractor"不是 AI 在迭代中自然漂出新方向，而是经由 owner-doc / precedence / human or independent adjudication 明确沉淀后的方向更新。

`flux-compiler / flux-action-core / flux-runtime` 三层拆分被文档记录为"attractor 被实践校正后再继续扩张的例子"。

nop-chaos-flux 中有三条轨迹→吸引子反馈制品：

- `architecture-guardrails-from-bugs.md`：bug 模式 → 收敛约束 → 架构锚点
- `deep-audit-calibration-patterns.md`：误报模式 → 更精确的合法状态空间定义
- `reopened-design-decisions-and-audit-adjudications.md`：防止重复翻案削弱 attractor

**这些不是增加 CI 检查**。它们精炼的是"系统应该向哪里收敛"的定义本身。

### 分歧四：工程师该投资什么

Ryan 说工程师的职责是"为智能体团队以及驱动这些智能体的人清除障碍"。他强调的投资不只有 guardrails 和 lint——还包括重大的架构决策：数百个 package 的 PNPM workspace（英文 summary 记为 750-package）、按业务域和栈层隔离的包结构、通过 lint 强制执行的包隐私边界、断言源代码结构属性（文件长度、schema 去重、依赖方向）的结构测试、以及"每种东西只有一种写法"的代码一致性。在谈到 Symphony 和代码可抛弃性时，他还说"库本身更像一份定义非常明确的规范，而代码只是这份规范'编译'出来的产物"，把规范和约束视为稳定的源头。

AGE 的论证路径不同。它不是从"代码免费"推导出"投资吸引子"，而是从轨迹收敛问题出发：

> AI 大规模开发真正困难的地方，不在于让 AI 多写一点代码，而在于让系统在高速扩张中仍然向正确结构收敛。

AGE 的核心投入是定义 attractor——长期结构目标。在 AGE 的框架里，harness 是必要的（"在 AI 协作中，harness 是让轨迹判断成为可能的必要条件"），但没有 attractor 则 harness 缺乏目标（"纠偏纠向哪里？"）。

**关键差距在于"架构决策以什么形态存在"**。Ryan 的架构决策（域边界、包隐私、依赖方向、代码一致性）确实定义了结构方向——但它们被嵌入在 harness 基础设施中（lint、结构测试、persona 文档），没有独立于 harness 的存在。AGE 把这些决策作为 attractor 的一等对象，有自己的生命周期、优先级模型和共演化机制。Ryan 在访谈中用 single-package Electron app 很快变乱的经验说明，agent 行为会反过来推动仓库结构化需求；AGE 则主动定义架构方向然后让 agent 围绕它展开。

## 三、AGE 增加了什么 Harness Engineering 没有

1. **吸引子作为一等工程对象**——结构方向被命名，并通过 owner docs 等 carrier 变得可版本化、可审计、可继承，有自己的优先级模型。Ryan 的框架中没有等价的、独立命名并带生命周期 / precedence 的方向对象。

2. **轨迹作为基础范畴**——不只是"发生了什么"的日志，而是被理论化为必须对照吸引子判断的实际演化路径。

3. **自我验证陷阱的显式命名**——同一上下文不能既生成又判断完成，completion 必须由 fresh session、独立审计或 live repository evidence 重新确认。

4. **吸引子的共演化**——AGE 明确说"真正的闭环不是'定义一次 attractor，然后永久执行 harness'，而是'定义 attractor → 扩张 → 纠偏 → 更新 attractor → 再扩张'"。Bug 模式和审计发现反馈回来精炼 attractor 本身，而不只是收紧 harness。

5. **三层吸引子架构**（结构层/承载层/实现层）——解决"文档和代码冲突时听谁的"，通过问"你在问什么问题"来回答。

6. **吸引子优先级模型**——在 nop-chaos-flux 实例中，`docs/architecture/` 内部有方向层、顶层规范层、codebase-wide baseline、局部 contract 的层级；在通用 AGE 模板中，则由 `source-of-truth-and-precedence` 按问题规定事实源。

7. **人机分工的显式表述**——AGE 说至少在当前主流模型的训练分布和偏置下，不能默认指望 AI 自己演化出新的 attractor；真正新的概念切分、边界重定义和架构语言，仍需要人先提出，并经 owner-doc / audit / precedence 机制沉淀。

## 四、Harness Engineering 有什么 AGE 可以借鉴的

以下不是 AGE 缺失的东西，而是 Ryan 的表述方式或侧重点能为 AGE 提供启发的地方。

### 1. 上下文注入时机的实践建议

AGE 的路由层（`docs/index.md` 的百余条 Read This First 路由表、`AGENTS.md` 的双维度路由）已经实现了任务级渐进注入，AGE 方法论文章也把路由 harness 列为第一层 harness。Ryan 的补充是一个实用的经验法则：不要在开始时把所有要求一次塞完，而是在过程中按需注入——"在正确的时间提供正确的文本"。AGE 的路由是任务维度的（做什么任务读什么文档），Ryan 建议考虑时间维度（工作流的哪个阶段注入什么约束），但 Ryan 自己也只是给了实用建议，没有建立正式的会话生命周期模型。

### 2. "LLM 是模糊编译器"：一个更易上手的隐喻

Ryan 说：

> 把 LLM 看成一种模糊编译器，是个很有意思的思维模型。

AGE 使用动力系统语言（吸引子、轨迹、状态空间、吸引域）。这个语言在理论上更精确，但对从业者的入门门槛更高。"模糊编译器"可以作为一个入口隐喻，但只能作为入口：上下文和规则影响生成结果，AGE 的核心不是控制提示词，而是先定义 state space → attractor → trajectory → control 的逻辑结构。AGE 仓库中没有出现过这个隐喻。

### 3. 对 plan mode 的怀疑：临时计划不是免审工件

Ryan 并非反对计划本身，而是反对交互式 agent 工具里的 plan mode：agent 先生成一份临时执行计划，用户点批准后，后续 rollout 就按这份计划执行。Claude Code 官方文档对 plan mode 的定义也是"只读文件并提出计划，获批前不落盘编辑"；Ryan 在访谈中提到他们早期用过类似 `exec plan` 的原型 skill，后来几乎不用，因为"批准一份没人逐行读过的计划"等价于把一堆未审指令合法化。他的替代建议是：如果必须用计划，就把计划作为单独 PR 提交，让人逐行 review 后再执行。

这和 AGE 的 `docs/plans/` 不是同一种对象。AGE plan 不是会话里的临时草稿，也不是让 agent 获得写权限的审批页，而是仓库内的执行/闭合契约：必须从 live repo 写 `Current Baseline`，明确 `Goals` / `Non-Goals`、scope、proof、owner-doc obligations、Closure Gates，并在关闭前经独立 closure audit 重新核对 live repository。Ryan 的警告对 AGE 的真正价值，不是"少写 plan"，而是反过来证明 AGE 为什么必须把 plan 做成可审计仓库制品：没人读的计划不是治理，是把错误指令合法化；可追责的 plan 则是本轮轨迹如何收口到 attractor 的公开契约。

## 五、一句话总结

Harness Engineering 和 AGE 从同一个前提出发——代码便宜了，工程师的工作变了——但在"因此什么才是稀缺的"这个问题上分叉了。Harness Engineering 投资约束和验证基础设施（guardrails、审查智能体、结构测试、monorepo 架构、代码一致性），让 agent 输出可靠地正确——这些架构决策确实定义了结构方向，但被嵌入在 harness 内部，没有独立于 harness 的存在和生命周期。AGE 把结构方向作为吸引子，在逻辑上先于 harness：没有"向哪里"，就无法定义"如何纠偏"。但在执行中，attractor 与 harness 会通过实践反馈共演化。当一切都通过了但系统仍然是错的（Plan 76，沉默累积的架构债务），本文所对照的 Harness Engineering 表述没有把这类跨多次正确变更累积出的轨迹漂移命名为一等范畴，AGE 则把它叫做轨迹漂移，并有显式机制来检测、纠正和从中学习。反过来，Ryan 的实践为 AGE 提供了三处值得借鉴的表述——上下文注入时机的实用建议、"LLM 是模糊编译器"的入门隐喻、对未审临时 plan mode 的尖锐怀疑——而不损害 AGE 的基础主张：**attractor 逻辑上先于 harness，"向哪里？"必须在"如何约束？"变得有意义之前被回答。**

## 附录：OpenAI 实践与 AGE/nop-chaos-flux 实现对照

下表将 Ryan 演讲、英文 summary 和公开中文解读中描述的 OpenAI 实践，逐项映射到 nop-chaos-flux 中对应的 AGE 实现。对照表明：两者在操作层面高度重叠——Harness Engineering 描述的主要实践，AGE 大多有对应机制，且在 nop-chaos-flux 中通常被组织进更明确的 state space → attractor → trajectory → control 框架。

| OpenAI 实践                                                                                                                                   | nop-chaos-flux / AGE 对应实现                                                                                                                                                                                                                      | 关键差异                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **结构化文档**（Ryan 提到 AGENTS.md、规则文件、skill；中文解读概括为 agent 入口地图）                                                         | 双层路由：`AGENTS.md`（操作性子集）+ `docs/index.md`（百余条权威路由表）。路由层级本身是工程对象，有显式权威声明防止两个文件间漂移                                                                                                                 | AGE 的路由更细粒度，且路由层级被方法论文档化为独立 harness 层                                                                              |
| **架构约束**（custom linters、结构测试、把"品味"编码为规则）                                                                                  | 多层约束：ESLint 与 hard gates、结构/契约检查脚本、启发式 suspect scanners、20 份书面审计规则文档（目录内 21 个 md，含 README）                                                                                                                    | OpenAI 描述为抽象类别，AGE 有从 bug → guardrail → 审计规则 → 硬门的可追溯闭环                                                              |
| **可观测性**（agent 可查询日志/指标/追踪）                                                                                                    | `nop-debugger` 包：结构化事件采集、因果交互追踪、自动失败解释（`explainNodeFailure` 基于相关事件、请求、错误与交互轨迹给出有界失败解释）、自动化 API（`queryEvents`、`exportSession`）专供 agent/E2E 测试消费                                      | 不同域（OpenAI 侧资料更偏 agent 可消费的应用 / 开发可观测性栈，AGE 此处对应客户端框架诊断），但 AGE 有 OpenAI 未详细展开的自动失败解释能力 |
| **反馈循环**（persona 审查智能体，每次 push 触发）                                                                                            | 深度审计系统：20 个审计维度 × 6 大类，每个维度最多 10 轮迭代深化 → 独立审查智能体（保留/降级/驳回）→ 高风险逐项审查 + 低风险批量审查。校准模式文件防止重复误报                                                                                     | OpenAI 用 persona 文档驱动审查智能体，AGE 用 20 个专业化维度 prompt + 元审查层（校准模式 + 翻案追踪）                                      |
| **垃圾回收**（Ryan 字幕：周五 garbage collection；知乎解读进一步扩展为定期扫描偏差、doc-gardening）                                           | Bug → guardrail 蒸馏管线：62+ 份 bug 记录 → `architecture-guardrails-from-bugs.md`（8 条 guardrail，每条可追溯至具体 bug）→ 校准模式（10 条误报经验）→ 翻案裁决追踪。文档新鲜度检查：`check-active-doc-code-anchors.mjs`、`check-docs-garbled.mjs` | OpenAI 把重复 review 问题转为周期性系统改进；AGE 把它进一步纳入轨迹问题——不只是"有没有债"，而是"系统是否在偏离 attractor"                  |
| **分层/边界架构**（Ryan：按业务域和技术栈层隔离、package privacy、依赖方向；知乎解读示例化为 Types → Config → Repo → Service → Runtime → UI） | `flux-core(0 deps) → flux-formula → flux-compiler → flux-action-core → flux-runtime → flux-react → flux-renderers-*`。依赖声明卫生由 `check-workspace-manifest-deps.mjs` 自动扫描；依赖方向由模块边界文档、维度 01 审计和依赖图检查共同约束        | 原理相邻，AGE 的分层是域特定的（低代码编译管线），且通过 owner docs + 自动化脚本 + 审计共同执行                                            |

**结论**：在操作层面，Ryan 演讲及后续中文公开解读中列出的多数实践，AGE 都有对应机制。两者的真正差距不在"是否要 guardrails / review agents / structure tests"，而在"用什么概念框架组织这些做法"：Harness 把它们组织为"harness 基础设施"，AGE 把它们组织进 state space → attractor → trajectory → control 的四对象框架；其中 attractor 自身又区分结构层、承载层、实现层。
