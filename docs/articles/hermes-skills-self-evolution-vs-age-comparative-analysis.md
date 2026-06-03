# 两套 AI 工程经验积累体系的对比：Hermes 技能自进化 vs Attractor-Guided Engineering

> 一个优化 Agent 的能力，一个优化仓库的结构。它们共享某些工程直觉，但世界观根本不同。

## 引言

Hermes 是 Harness 平台的技能自进化子系统（[微信文章](https://mp.weixin.qq.com/s/3BvebfHJygUmXHrOROM7-w)），核心设计目标：让 Agent 在反复执行任务的过程中自动沉淀、维护、合并可复用的经验技能。

Attractor-Guided Engineering（AGE）是从 [nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux) 项目实践中提取的方法论（[微信文章](https://mp.weixin.qq.com/s/TwMkUDLNo2-bIrXrfvPqIw)，[模板仓库](https://github.com/entropy-cloud/attractor-guided-engineering-template)），核心设计目标：让仓库在 AI 反复扰动下仍然沿领域结构受控收敛。

两者都在解决"AI 工程中的经验积累与复用"问题，但各自的理论基础、优化对象和边界假设截然不同。

## 一、经验积累：三层引擎 vs 五层阶梯

### Hermes：Agent 能力的生命周期管理

Hermes 用三层引擎处理经验的产生、评估和整合：

- **Layer 1 实时反思引擎**（`background_review.py`）：任务结束后 fork 影子 Agent，解析全量对话和工具调用，筛出可复用经验写入技能库。解决"经验有没有沉淀"。
- **Layer 2 延迟统计引擎**（`skill_usage.py`）：对每条技能的使用、查看、修改埋点，通过 `.usage.json` 边车文件存储统计数据，驱动活性状态转换。解决"技能还活不活"。
- **Layer 3 定期合并引擎**（`curator.py`）：语义相似度、使用热度、场景覆盖率三维仲裁，把碎片技能聚合为伞状技能，归档无复用价值的过期技能。解决"技能质量好不好"。

三层形成闭环：产生 → 评估 → 整合 → 再产生。循环对象是 **Agent 的能力描述**。

### AGE：多源轨迹蒸馏

AGE 的经验积累远不限于 bug 记录。nop-chaos-flux 中有至少 7 种独立的轨迹来源，各自捕获不同维度的经验：

| 轨迹来源                                                   | 文件数   | 捕获什么                                            |
| ---------------------------------------------------------- | -------- | --------------------------------------------------- |
| `docs/bugs/`                                               | 66       | 非显然的失败：根因、修复路径、涉及文件              |
| `docs/logs/`                                               | 72       | 每日活动时间线：做了什么、验证了什么、下一步        |
| `docs/discussions/`                                        | 11       | 需求从模糊到精确的演化过程，包括错误的中间理解      |
| `docs/plans/` + `docs/archive/plans/`                      | 46 + 398 | 结构化修复轨迹：基线 → 差距 → 补救 → 证明 → 闭包    |
| `docs/analysis/` + `docs/archive/analysis/`                | 10 + 133 | 审计发现：20 维深度审计、多轮对抗性审查、方法论对比 |
| `docs/lessons/`                                            | 1        | 工程判断失误的完整推理链（即使代码最终是对的）      |
| `docs/references/cross-plan-recurring-anomaly-patterns.md` | 425 行   | 跨计划反复出现的异常家族的元蒸馏                    |

这些来源通过一个五层蒸馏阶梯向上提纯：

1. **Tier 1 原始轨迹**：上述 7 种来源，总计约 840+ 个文件。这是未经提炼的经验素材。
2. **Tier 2 模式蒸馏**：8 条架构 guardrails（`architecture-guardrails-from-bugs.md`）、20 条审计规则（`docs/references/audit-rules/`）、跨计划异常模式图。每条 guardrail 有"规则 + 为什么 + bug 证据 + 架构锚点"四要素。
3. **Tier 3 编码化审查模式**：22 个可复用提示/审计模板（`docs/skills/`），从重复执行相似审查任务中蒸馏。
4. **Tier 4 启发性扫描器**：12 个信息性扫描脚本（exit 0），将 Tier 3 中的部分模式部分机械化。
5. **Tier 5 硬门控**：14 个 CI-blocking 脚本、30+ ESLint 规则、dependency-cruiser、Semgrep、Husky pre-commit。人工判断退化为机器执行。

蒸馏的循环对象是 **仓库的结构不变量**。但它不是只从失败中提炼——`docs/discussions/` 记录需求演化过程，`docs/lessons/` 记录判断失误过程，`docs/analysis/` 记录审计发现（不一定是 bug），`docs/logs/` 记录完整的时间线轨迹。Guardrail 只是蒸馏产品的一种，审计规则、skills、扫描器、硬门控都是蒸馏产品。

### 对比

Hermes 的三层引擎处理单一输入源——Agent 的任务执行过程。AGE 的五层阶梯处理至少 7 种不同维度的轨迹数据。

Hermes 从 Agent 的行为中提炼能力——"Agent 下次怎么做得更好"。AGE 从多种轨迹中提炼结构约束——"仓库怎样才不会漂移"。

Hermes 的三层引擎是运行时机制，嵌入 Agent runtime；AGE 的五层阶梯是文档治理流程，嵌入仓库结构。前者自动化程度高，后者人工介入重。但 AGE 的设计者会指出：自动化提炼能力不等于提炼出正确的结构约束——`docs/references/architecture-guardrails-from-bugs.md` 中的第 7 条 guardrail（Owner/Bridge/Persisted State Coherence）不是从一次失败中自动概括出来的，而是从 bug #37、bug #38 和历史审计多次交叉验证后才被承认的架构级不变量。同样，`docs/references/cross-plan-recurring-anomaly-patterns.md` 中识别的异常家族不是从单一 bug 中概括的，而是从 398 个归档计划和 133 个归档分析中跨源交叉比对后发现的模式。

## 二、触发机制：脏计数器 vs Plan 触发条件

### Hermes：工具迭代计数

Hermes 的触发信号是一个脏计数器（Dirty Counter），以**工具迭代次数**（非对话轮数）为度量标准。默认阈值 10 次触发异步复盘。Agent 主动调用 `skill_manage` 时重置计数器。

这个设计的直觉是：如果 Agent 反复调用工具但没沉淀经验，说明这个会话里有值得提取但还没被提取的东西。

### AGE：多维度 Plan 触发

AGE 的触发机制是 `docs/plans/` 的写入条件，不是单一计数器，而是多维度判定：

- 变更 API、数据库/模型、认证、集成、部署 → 必须写 Plan
- 跨多模块、改变共享行为 → 必须写 Plan
- 预计超过一个 AI Session → 必须写 Plan
- 文案修改、小型样式调整、单文件修复 → 可跳过 Plan

这不是"做了多少次操作就触发"，而是"变更的性质决定了流程强度"。

### 对比

脏计数器是**定量触发**，Plan 触发条件是**定性触发**。前者度量扰动频率，后者度量扰动范围。

两者的隐含假设不同。Hermes 假设：操作次数多 = 经验密集 = 值得反思。AGE 假设：变更跨边界 = 结构风险高 = 需要更强的收敛机制。

nop-chaos-flux 的 `docs/plans/` 目录下有过 Plan 143 这种连续三次 closure assumption 被推翻的案例——变更次数不多，但每次都跨了模块边界，所以每次都触发独立审计。如果用脏计数器衡量，可能三次变更加起来都不够阈值；但从 AGE 视角看，每次都需要独立收敛判定。

反过来，一个 Agent 可能在同一模块内反复调试 20 次工具调用，Hermes 的脏计数器会触发反思提炼出一条新技能；AGE 则认为这 20 次都在同一个架构约束内，不构成跨边界风险，不需要启动 Plan 流程。

**两套触发机制各自优化了不同信号**：Hermes 捕获"经验密度"，AGE 捕获"结构风险"。一个关心 Agent 有没有在重复劳动中浪费机会，一个关心仓库有没有在无声中漂移。

## 三、隔离：影子 Agent 六层舱壁 vs 生成/验收分离

### Hermes：影子 Agent 的六层舱壁隔离

Hermes 在 fork 影子 Agent 做 Layer 1 实时反思时，施加了六层舱壁（bulkhead）隔离：

1. 记忆插件隔离（`skip_memory=True`）
2. 递归复盘隔离（阈值置 0，禁止套娃）
3. 工具白名单隔离（仅开放 memory、skills 工具集）
4. 危险命令自动审批拒绝（`rm`、`sudo` 等自动拦截）
5. 前端状态输出隔离（`suppress_status_output`）
6. 日志输出隔离（stdout/stderr 重定向至 `/dev/null`）

隔离的目的是：反思 Agent 不能污染主 Agent 的状态，也不能执行危险操作。这是一个**安全隔离**设计。

### AGE：生成与验收的上下文分离

AGE 的隔离不是安全隔离，而是**认知隔离**。核心规则：

> 不要让同一个上下文既做实现，又做完成判定。

AGE 要求 closure audit 必须由 fresh session 执行——输入只有三件套（任务 plan + diff summary + 验证输出），不带实现过程的历史。Plan 143 的 closure 之所以有分量，正是因为完成判定不是实现者自报，而是来自独立的收敛判定。

AGE 在 `agent-skills-vs-age-practice.md` 中明确解释了原因：AI 在生成代码的同时也在生成验证这段代码的所有材料——类型、测试、文档、完成总结都出自同一个上下文。如果理解本身偏了，所有"验证证据"一致地偏在同一方向。这种自我验证陷阱必须通过工程手段——fresh session、独立 audit、回到 live repo 取证——人为重建。

### 对比

Hermes 的隔离解决"反思 Agent 不要搞破坏"，是**横向安全隔离**——防止一个子系统失控影响另一个。

AGE 的隔离解决"同一个认知主体不能同时是运动员和裁判"，是**纵向认知隔离**——防止生成上下文的偏差污染验收判断。

两者都需要隔离，但隔离的原因不同。Hermes 不担心影子 Agent 会得出错误结论——它担心的是影子 Agent 执行了不该执行的操作。AGE 不担心审计 Agent 会执行危险命令——它担心的是同一个上下文对自身的产物丧失批判力。

nop-chaos-flux 的 Plan 145 在 closure/audit 之后把新确认的跟进面拆到 Plan 146，Plan 143 的 closure assumption 被连续推翻直到 live repo 真正过线。如果 closure audit 由实现者自己做，这些被推翻的假设根本不会被暴露——因为推翻假设意味着承认自己之前说的"完成了"是假完成。

## 四、生命周期管理

### Hermes：四状态双向可逆状态机

Hermes 对技能施加了显式的生命周期管理：

- `active`（活跃）→ `stale`（陈旧，30 天无活动）→ `archived`（归档，90 天无活动）
- `stale` 技能被重新使用时自动复活为 `active`
- `pinned`（置顶保护）跳过所有自动状态变更

状态转换完全由 Layer 2 统计引擎的数据驱动，不需要人工判断。

### AGE：没有显式状态机，但有隐式 precedence 衰减

AGE 对文档没有显式的状态机。但有若干隐式机制：

- **Owner doc precedence**：`docs/architecture/` 下的固定名称文档（如 `flux-core.md`、`renderer-runtime.md`）拥有最高权威，不会被日志或 bug note 覆盖。
- **Plan 的闭包门**：Plan 不是持久文档，而是局部收敛机制。一旦 closure audit 通过，Plan 的权威性降到历史记录级别——它不再是当前的指导文档，而是"为什么当时那样做"的证据。
- **Bug note 的 guardrail 提炼**：单个 bug note 随时间推移权威性不变，但当它被提炼为 guardrail 后，原始 bug note 的权威性从"当前约束"降为"历史证据"。
- **Freshness / autonomy**：文档的"新鲜度"影响 AI 能否基于它行动、能自动走多远。过期的 owner doc 会限制 AI 的自主性。

### 对比

Hermes 的生命周期管理是**自动化的、数据驱动的**——`.usage.json` 里的时间戳决定状态转换，Agent 不需要人工介入就能完成整个生命周期。

AGE 的生命周期管理是**语义驱动的、需要判断的**——一个 Plan 是否可以关闭不取决于时间，取决于 closure audit 的证据是否充分。一个 bug note 是否该提炼为 guardrail 不取决于被引用次数，取决于它是否暴露了架构级不变量。

这是两种不同的衰减模型。Hermes 用时间衰减（30 天无活动 → stale），AGE 用语义饱和衰减（guardrail 覆盖了这类问题 → 原始 bug note 降级为历史）。

AGE 没有像 Hermes 那样把生命周期做成显式状态机，这是一个可以改进的实践空白。但 AGE 的设计者可能会指出：owner doc 的权威性不应该随时间衰减——`flux-design-principles.md` 里定义的设计原则不会因为 90 天没人修改就变成 stale。这条原则的存在本身就说明：不是所有工程制品都适合时间驱动的生命周期管理。

## 五、反固化机制

### Hermes：只存"怎么修"，不存"什么坏了"

Hermes 明确禁止沉淀三类内容：

1. 环境临时故障
2. 工具负面断言（"这个工具不支持 X"）
3. 重试成功后的原始失败记录

核心规则：**只存"怎么修"，不存"什么坏了"**。理由是负面经验会随环境变化失效，而且会误导 Agent 绕开实际可行的路径。

### AGE：反偷懒规则与渐进自动化

AGE 没有直接等价的"禁止沉淀负面经验"规则。但它有一个更根本的反固化机制：**attractor 不是当前状态的描述，而是系统应收敛到的结构**。

AGE 文章 `attractor-before-harness-ai-large-scale-development-methodology.md` 明确区分了 fixed-point（不动点）和 attractor（吸引子）：不动点是"系统当前停在这里"，吸引子是"系统无论被推开多远都能回来"。如果 guardrail 只描述当前状态（"代码现在是这样的"），它不是 attractor，只是 snapshot。

在 nop-chaos-flux 的实践中，`architecture-guardrails-from-bugs.md` 中的每条 guardrail 都有"规则 + 为什么 + bug 证据 + 架构锚点"四要素。这个结构本身就防止了固化：bug 证据是负面的（什么坏了），但 guardrail 条目本身是正面的（应该怎么做），而且必须指向架构锚点（attractor 的承载层）。如果架构锚点本身变了，guardrail 必须重新评估。

### 对比

Hermes 的反固化是**内容层面的**——禁止存储特定类型的信息。AGE 的反固化是**结构层面的**——通过区分 attractor 和 fixed-point，确保约束指向收敛方向而非当前状态。

Hermes 的规则更直接、更易执行。AGE 的区分更根本但更难操作化——判断一条文档是 attractor 承载还是 fixed-point 记录需要架构判断力。

两者不矛盾。Hermes 的"只存怎么修不存什么坏了"可以看作 AGE 的"attractor 描述收敛方向而非当前状态"在 Agent 技能这个具体载体上的操作化。但 Hermes 把这个规则硬编码到系统中（影子 Agent 的过滤逻辑），AGE 把它作为概念区分留给实践者。

## 六、权限与信任模型

### Hermes：agent-created vs user-created 双轨隔离

Hermes 的权限模型规则清晰，全部硬编码：

- Agent 自建技能（agent-created）由 Curator 全权管理：可归档、可合并、可覆盖。
- 用户手动创建技能（user-created）完全隔离：Curator 不触碰，不会被自动归档、合并、覆盖。
- 信任分层：内置 > 可信源 > 社区 > Agent 自建。
- 用户提供三把管控钥匙：pinned 技能置顶保护、Curator 全局暂停开关、用户技能专属隔离。

### AGE：attractor 承载层 vs 实现层

AGE 的权限模型不是基于"谁创建的"，而是基于"回答什么问题"：

- **代码**对当前实现行为有权威。
- **Owner doc**（`docs/architecture/`）对系统应向哪里收敛有权威。
- **Logs / bugs / analysis** 对演化轨迹（为什么走到这里、哪些路已被排除）有权威。
- **Plans / audits** 对本轮变化是否闭合有权威。

文档类型决定了权威范围，而非创建者身份。

AGE 文章 `agent-skills-vs-age-practice.md` 明确指出：代码与文档冲突时，不是"哪个更权威"，而是"问什么问题"——问当前实现行为，代码权威；问系统应向哪里收敛，文档权威；问某条路径为什么被放弃，logs/bugs/analysis 权威。每一层只在它对应的问题上是权威。

### 对比

Hermes 的权限模型是**创建者身份驱动**的——Agent 创建的内容和用户创建的内容有不同的生命周期和修改权限。AGE 的权限模型是**语义角色驱动**的——同一份材料在不同问题下有不同权威性。

Hermes 的模型更易自动化：检查 `.usage.json` 中的 `created_by` 字段即可。AGE 的模型需要语义理解：判断一份文档在当前上下文中扮演什么角色——是 attractor 承载层还是实现层——不是字段值能决定的。

nop-chaos-flux 中 `CompiledSchemaNode` 被移除的过程说明这一点：代码说"这个类还在"，但 `docs/architecture/` 中的模板/实例分离基线说"这个中间结构不再属于正确结构"。代码是当前实现的权威，但 attractor 承载层是收敛方向的权威。后者赢了。如果按 Hermes 的模型，这条"代码要被删"的经验会作为 agent-created skill 沉淀下来，但它能被沉淀的前提是 Agent 理解为什么这个类该删——而这恰恰需要架构判断力。

## 七、数据驱动决策

### Hermes：Layer 2 统计引擎

Hermes 的 Layer 2 通过独立边车文件（`.usage.json`）存储每条技能的使用、查看、修改、复用场景的毫秒级埋点数据。这些数据驱动：

- 活性状态转换（active → stale → archived）
- 伞状技能合并优先级（使用热度高的优先保留）
- 支撑文件降级决策（场景专属经验降为参考文档/模板/脚本）

三级信号仲裁进一步强化了数据驱动：

1. 第一级：模型删除时的 `absorbed_into` 合并声明
2. 第二级：结构化总结佐证
3. 第三级：工具调用审计佐证

三信号综合判定"技能合并留存"还是"彻底修剪删除"。

### AGE：recurrence frequency 作为自动化阶梯的入场券

AGE 的数据驱动不那么系统化，但在 guardrail 提炼中有类似的直觉：一条 bug 的经验是否值得提炼为架构级 guardrail，取决于它是否反复出现。

`architecture-guardrails-from-bugs.md` 中的 8 条 guardrail 都有"Bug evidence"字段列出关联的 bug note。第 3 条 guardrail（Scope Identity And Parent-Child Reactivity Must Be Stable）关联了 3 个 bug note（`docs/bugs/03-fragment-scope-identity-form-reset-fix.md`、`docs/bugs/04-dialog-scope-stale-render-fix.md`、`docs/bugs/23-stale-js-artifacts-shadow-source-in-vitest-fix.md`），第 5 条 guardrail（Tailwind v4 Monorepo Scanning Must Be Verifiable）关联了 2 个 bug note。关联数量本身就是一个隐式的 recurrence frequency 信号。

但 AGE 没有把这个信号自动化。是否提炼为 guardrail 仍然是人工判断，recurrence frequency 只是输入之一。

### 对比

Hermes 的数据驱动是**系统化的、持续运行的**——每条技能的使用都有埋点，状态转换由算法驱动，合并决策由三维仲裁。

AGE 的数据驱动是**隐式的、事件触发的**——recurrence frequency 存在于 bug evidence 的列表长度中，但没有被形式化为算法输入。

这是一个真实的差距。AGE 的实践者需要人工回顾 `docs/bugs/` 目录才能发现某类问题的 recurrence frequency；Hermes 的实践者只需要查看 `.usage.json`。

但 AGE 的设计者会指出：guardrail 提炼的关键判断不是"这个问题出现了几次"，而是"它是否暴露了架构级不变量"。一次跨模块的状态一致性失败可能比十次单文件拼写错误更值得提炼为 guardrail。频率是信号，但不是唯一信号。

## 八、Hermes 有而 AGE 没有的

### 1. 边车文件架构（Sidecar File）

Hermes 把技能内容（`SKILL.md`）和统计数据（`.usage.json`）分离存储。内容文件用户可编辑，统计文件系统管理。两者通过原子写入（`tempfile + os.replace`）和跨进程文件锁保证一致性。

AGE 的文档没有这种分离。一个 bug note 既包含内容（根因分析），也隐含统计信息（是否被 guardrail 引用）。但统计信息没有被外化为独立数据文件。

边车架构的价值是：内容变更不影响统计，统计更新不污染内容。这在多进程/多 Agent 并发操作时尤其重要。

### 2. 缓存继承

Hermes 的影子 Agent 继承父 Agent 的系统提示词缓存（`_cached_system_prompt`），固定 `session_start` 和 `session_id` 保证字节级一致，实测端到端成本降低约 26%。

AGE 没有等价机制。Fresh session 的隔离要求（不带实现历史）本身就意味着不能继承缓存。这是 AGE 的隔离策略与成本优化之间的真实张力。

### 3. 三级信号仲裁

Hermes 在技能合并时使用三级信号：

1. 模型删除时的 `absorbed_into` 合并声明（声明级）
2. 结构化总结佐证（摘要级）
3. 工具调用审计佐证（行为级）

三级信号综合判定保留还是删除，避免了单一信号的误判。

AGE 的 guardrail 提炼没有这种多信号仲裁。判断一条经验是否值得成为 guardrail 主要依赖人的架构判断。

### 4. 冷启动门控

Hermes 的 Curator 首次运行仅记录时间戳，不执行治理——"先观察再治理"。这是一个谨慎的冷启动策略。

AGE 有类似的直觉（`docs/plans/00-plan-authoring-and-execution-guide.md` 要求 re-audit live repo before claiming completion），但没有形式化为系统级门控。

### 5. 四级技能迭代优先级

Hermes 明确了技能迭代的优先顺序：

1. 迭代当前会话已加载的技能（修补存量）
2. 迭代已有伞状技能（补充子模块）
3. 新增场景支撑文件（不建主技能）
4. 新建品类级伞状技能（仅在无匹配时）

AGE 没有等价的"guardrail 更新优先级"——是先更新架构文档还是先更新 guardrail 还是先更新 bug note，没有明确排序。

## 九、AGE 有而 Hermes 没有的

### 1. 吸引子作为数学概念

Hermes 没有"吸引子"概念。技能库是经验的集合，但集合不构成吸引子。吸引子要求：系统无论被推开多远都能回到它附近——这是一个关于**动力学稳定性**的概念，不是关于**信息检索**的概念。

AGE 从动力系统借用吸引子概念，区分 attractor（吸引子）和 fixed-point（不动点）。`attractor-before-harness-ai-large-scale-development-methodology.md` 用 Lorenz 吸引子解释：局部轨迹高度复杂，短期近乎混沌，但整体被稳定结构约束。这不是"信息更多"的问题，是"结构稳定性"的问题。

### 2. 轨迹作为一等对象

Hermes 关心 Agent 每次任务做对了什么、做错了什么，但这些是孤立的截面。影子 Agent 反思完就结束，没有把"Agent 的能力随时间如何演化"本身作为管理对象。

AGE 把轨迹作为一等公民：`docs/logs/`、`docs/bugs/`、`docs/discussions/` 共同记录仓库如何一步步走到现在。轨迹不是辅助信息，而是判断系统在收敛还是漂移的基础对象。

`agent-skills-vs-age-practice.md` 指出：传统方法论有"技术债务""坏味道""腐蚀"等否定性词汇追认轨迹问题，但这些概念在体系里的地位是修正机制和诊断词汇，不是基础对象。AGE 把轨迹提升为基础范畴。

### 3. 不动点 vs 吸引子的区分

Hermes 的技能库是一个快照集合——某次任务的经验被提取出来，存为静态文档。技能库本身不会回答"系统现在是在吸引子附近还是暂时停在某个局部极值"。

AGE 的 attractor 三层分架构（结构层/承载层/实现层）区分了"不变量"和"当前投影"。`docs/architecture/` 下的 owner doc 是承载层——它们描述系统应向哪里收敛，不描述系统当前停在何处。代码是实现层——它描述系统当前状态，但不描述系统应向哪里收敛。两者不是同一种东西。

### 4. 收敛方向 vs 到达

Hermes 的技能评估维度是：使用热度、语义相似度、场景覆盖率。这些维度衡量的是"技能好不好用"——即 Agent 是否已经到达了一个能力水平。

AGE 的核心判断是"轨迹是否向 attractor 收敛"——即方向是否正确，而不是当前是否到达。`attractor-before-harness-ai-large-scale-development-methodology.md` 用一句话概括：**状态空间 → 吸引子 → 轨迹 → 控制。** 这不是修辞排序，是逻辑依赖——attractor 不定义就无法判断轨迹是否在漂移。

### 5. Owner-doc precedence 层级

Hermes 的技能之间没有严格的优先级层级——伞状技能和支撑文件之间有优先级，但这是功能性的（先查伞状再查支撑），不是语义权威性的。

AGE 有显式的 owner-doc precedence 体系：

- `docs/architecture/README.md` 负责层级和阅读顺序
- `flux-design-principles.md` 负责方向层
- `frontend-programming-model.md` 负责顶层规范层
- `flux-core.md` 负责 codebase-wide baseline
- 更窄的 architecture doc 在各自主题内定义局部 contract

这不是文件排序，是语义权威性的层次结构。当 `flux-design-principles.md` 和某个局部 architecture doc 冲突时，前者优先。Hermes 没有等价的跨技能权威性排序。

## 十、世界观的根本差异：Agent-centric vs Repository-centric

### Hermes：优化 Agent 的能力

Hermes 的整个设计围绕一个中心问题：**Agent 下次能不能做得更好？**

三层引擎都在回答这个问题：Layer 1 让 Agent 从每次任务中学习，Layer 2 让 Agent 知道哪些能力还在用，Layer 3 让 Agent 的能力库保持精简。脏计数器度量 Agent 的劳动密度，影子 Agent 是 Agent 的反思分身，伞状技能是 Agent 的能力索引。

这个 worldview 把 Agent 当作主要优化对象，仓库是 Agent 作用的环境。

### AGE：优化仓库的结构

AGE 的整个设计围绕另一个中心问题：**仓库经过多次 Agent 扰动后，是否仍然沿领域结构受控收敛？**

Attractor 定义仓库应向哪里收敛，轨迹记录仓库如何走到现在，harness 把仓库持续拉回 attractor 附近。Plan 是局部收敛机制，audit 是独立收敛判定，guardrail 是从历史失败中提炼的结构约束。

这个 worldview 把仓库当作主要优化对象，Agent 是施加扰动的环境。

`agent-skills-vs-age-practice.md` 的核心论断精确概括了这一差异：

> Skill packages capabilities by invocation. AGE preserves domain structure across transformations.

### 两个 worldview 的互补与冲突

两者不是互斥的。一个系统可以同时优化 Agent 能力和仓库结构。

但它们在资源分配和设计决策上有真实的张力：

- **当 Agent 积累了一条新技能，但这条技能描述的是旧架构下的做法**——Hermes 会保留它（只要使用热度够高），AGE 会标记它为过期（因为 attractor 已经变了）。nop-chaos-flux 的 `CompiledSchemaNode` 移除就是这种情况：旧的经验"如何使用 CompiledSchemaNode 做模板编译"在新基线下没有价值，但在 Hermes 的热度评估中可能仍然活跃。
- **当仓库结构约束和 Agent 执行效率冲突**——Hermes 倾向于让 Agent 更快（技能越精准，执行越高效），AGE 倾向于让仓库更稳（约束越明确，漂移风险越低）。`docs/architecture/styling-system.md` 要求 layout renderer 只发 marker class 不加硬编码样式——这约束了 Agent 的自由度，但保护了仓库的样式架构。
- **当经验只能存在于文档中、不能存在于技能中**——`architecture-guardrails-from-bugs.md` 的 8 条 guardrail 每条都指向架构锚点。这些锚点是仓库内部的概念拓扑（"渲染器运行时"、"样式系统"、"模块边界"），不是通用的任务能力。把它们包装成技能会丢失它们与架构文档的 owner 关系。这就是 `agent-skills-vs-age-practice.md` 说的"AGE 要成为仓库自身的底层拓扑，而不是从外部施加到仓库上的能力包"。

### 最终差异

Hermes 在问：Agent 怎么才能越来越能干？

AGE 在问：仓库怎么才能在 Agent 越来越能干之后仍然保持正确的结构？

第一个问题的答案是一套 Agent runtime 内嵌的经验管理机制。第二个问题的答案是一套仓库结构内嵌的语义权威拓扑。

两者都需要。但 AGE 的主张是：在 AI 大规模开发中，第二个问题比第一个更紧迫。因为 Agent 的能力可以通过更好的模型、更好的 prompt、更多的技能来提升，但仓库的结构漂移是不可逆的——一旦测试套件与实现细节耦合、架构文档与代码脱节、guardrail 被实现腐蚀，修复成本随时间指数增长。

nop-chaos-flux 的 Plan 76 移除 `array-editor` / `key-value` 本地状态镜像引出 11 个测试失败的案例，不是 Agent 能力不足，而是仓库在多次"每次都通过 review 和 CI"的合法提交中累积了结构性漂移。Agent 技能再强也无法防止这种漂移——因为它不是单次任务的失败，而是轨迹在截面质量检查下的隐性漂移。

---

**参考资源：**

- Hermes 技能自进化体系：[微信文章](https://mp.weixin.qq.com/s/3BvebfHJygUmXHrOROM7-w)
- Attractor-Guided Engineering 方法论：[微信文章](https://mp.weixin.qq.com/s/TwMkUDLNo2-bIrXrfvPqIw)
- AGE 应用开发模板：[GitHub](https://github.com/entropy-cloud/attractor-guided-engineering-template)
- nop-chaos-flux 实践仓库：[GitHub](https://github.com/entropy-cloud/nop-chaos-flux)
