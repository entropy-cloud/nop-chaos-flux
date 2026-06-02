# 自进化的两个尺度：RMSP Agent 与 AGE 方法论的深层结构对应

> **摘要**：RMSP（Reward-Modulated Structural Plasticity）提出了一种让 Agent 行为拓扑在使用中自进化的新范式。AGE（Attractor-Guided Engineering）提出了一种让软件仓库在 AI 高频扰动中持续收敛的方法论。两者不是竞争关系——RMSP 调整 Agent 内部结构（秒级），AGE 固定仓库级别的不变契约（天级）。nop-chaos-flux 是 AGE 在框架层面的完整实现，其 owner-doc 体系已在四个方向上发生结构演化——职责拆分（split）、高层抽象（lift）、旧结构移除（prune）、交叉引用（connect），恰好对应 RMSP 六条重写规则驱动的结构自组织。本文分析这种跨尺度的结构对应，并讨论两者的互补边界。
>
> 来源：
>
> 1. **RMSP 论文** — 《Self-Evolving LLM Agents as LLM + MAN: A New Agent Paradigm via Reward-Modulated Structural Plasticity》，全文见 [mp.weixin.qq.com/s/HYCq2mKlIaSCRAJIp92NGQ](https://mp.weixin.qq.com/s/HYCq2mKlIaSCRAJIp92NGQ)
> 2. **AGE 模板** — `attractor-guided-engineering-template`，[github.com/entropy-cloud/attractor-guided-engineering-template](https://github.com/entropy-cloud/attractor-guided-engineering-template)
> 3. **nop-chaos-flux 实践** — [github.com/entropy-cloud/nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux)

---

## 一、核心命题对照

| 维度     | RMSP Agent 范式                                       | AGE 方法论                                                                  | nop-chaos-flux 实践                                         |
| -------- | ----------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 核心诊断 | 当前 Agent = 撰写产物（authoring artifact），结构不变 | 当前 AI 开发依赖外部工具约束行为（harness-first），而非让仓库自身的结构收敛 | AI 高频扰动下，仓库必须成为可验证的事实来源                 |
| 核心主张 | Agent 结构应在使用中自进化                            | 系统应在迭代中收敛到稳定吸引子                                              | `docs/architecture/` owner-doc 体系是吸引子的工程载体       |
| 结构对象 | MAN 关注点图（aspect graph）                          | Owner-doc 体系                                                              | 带 precedence 的架构文档树                                  |
| 演化规则 | RMSP：reweight/connect/prune/split/merge/lift         | AGE 工作流：input→req→design→plan→implement→verify→close                    | 加强版：plan closure gate + independent audit + deep-audit  |
| 评价函数 | `F = Surprise + β·Complexity`                         | 吸引子保真度 + 轨迹收敛性                                                   | live repo baseline consistency（owner doc vs code vs test） |

三种范式都从同一观察出发：静态结构无法在交互中自适应演化，必须引入某种可塑性机制。

---

## 二、三种尺度上的结构可塑性

结构可塑性发生在三个不同的时间尺度上。

### 尺度 1：Agent 运行时 — RMSP/MAN

RMSP 把 Agent 的 behavior topology 建模为一张 aspect 图。每个 aspect（职责关注点，包含 pointcut 匹配条件和 advice 处理逻辑）带有自己的滑动窗口，跟踪最近几次表现。

Agent 每次交互后，奖励被分摊到参与决策的 aspect 上，作为贡献值累积。当一个 aspect 的信用方差超过阈值时，触发六条重写规则之一。**split** 把高方差 aspect 拆成两个特化（自顶向下分化）；**lift** 把协同共激活的 aspect 群抽象为上层协调者（自底向上抽象）；**connect/prune** 管理边的进化和淘汰。LLM 可以提议新结构，但需经过 `κ` 估计（评估预期收益）和 `F-score`（`Surprise + β·Complexity`）双门控才能落地——生成和验证必须分离。

MAN 将智能体明确分为两个系统：LLM 是 **System 1**，负责当前一轮的快速推理和生成；aspect network 是 **System 2**，负责结构治理、调度和自我演化。快速通路（⇓_fast）在固定拓扑下完成一次推理；慢通路（⇓_slow）积累到足够信号后才改变图结构。LLM 是效应器，MAN 是神经系统——两者分工在不同时间尺度。

### 尺度 2：AI 开发 Session — AGE Plan/Closure/Audit

AGE 把每次开发任务组织为一个收敛循环：`input/` → `discussions/` → `requirements/` → `design/` + `architecture/` → `plans/` → implement → verify → close。

这里生长的不是 aspect 图，是 plan 文档、closure gate 判定和 audit 记录。每次任务触发的循环推动需求从模糊走向实现就绪，同时把稳定的设计意图沉淀到 `design/` 和 `architecture/`（即吸引子）。每个 plan 执行完毕后，必须由独立 session 做 closure audit，不能由实现者自报完成。

在 nop-chaos-flux 中，这套循环被强化到 24 条 plan 规则、3 级状态和 deep-audit。Plan 143 是典型例子：closure 假设先后被 2026-04-26 和 2026-04-27 的独立审计连续推翻，直到 live repo 真正过线后才允许关闭。

### 尺度 3：项目长期演化 — AGE Attractor / Owner-Doc 体系

最慢的一层是 `docs/architecture/` 文档树本身的变化。新架构 doc 从 `analysis/` 或 `plans/` 晋升为稳定的 architecture doc；旧结构被排除（`CompiledSchemaNode` 移除）；架构层次变深（从较少的包层拆分出 `flux-compiler`、`flux-action-core`、`flux-runtime` 三层，形成 `flux-core → flux-compiler → flux-action-core → flux-runtime → flux-react` 的五层管线）。

这一层的变化不是 session 级任务驱动的，而是跨 session 的设计决策累积 + 深度审计发现驱动的。每次 deep-audit 找到 owner-doc 与 live repo 之间的偏差，就触发一轮结构修正。修正完成后项目回到更精确的吸引子附近。

|            | Agent 内部（RMSP）             | Session 控制（AGE Plan）       | 项目演化（AGE Attractor）                |
| ---------- | ------------------------------ | ------------------------------ | ---------------------------------------- |
| 时间尺度   | 每次交互                       | 每次任务（小时~天）            | 每周~每月                                |
| 结构单位   | aspect                         | plan + closure gate            | owner-doc                                |
| 学习信号   | 奖励 → 责任分摊                | audit finding → baseline drift | deep-audit → doc/code discrepancy        |
| 偏移检测   | 滑动窗口方差                   | exit criteria 未满足           | owner-doc vs live repo 不一致            |
| 采纳门控   | κ 估计 + F-score               | 独立 closure audit             | deep-audit + 决策记录                    |
| 持续性假设 | 连续存在（单实例、单 session） | 断续存在（多 session）         | 时间平移不变（多实例、不受实例生灭影响） |

---

## 三、概念映射

### Aspect ↔ Owner-Doc

RMSP 的 aspect 是 Agent 内部的最小行为单元（pointcut + advice + 滑动窗口）。AGE 的 owner-doc 是项目知识的最小稳定单元（design intent + contract + precedence）。

两者都是结构的最小单元，都可以被 split/merge/lift，都有自己的 "pointcut"（什么情况下触发，`docs/index.md` 路由）和 "advice"（触发后的行为）。

关键差异：aspect 由奖励驱动自动生长，专属于单个 Agent 实例；owner-doc 由人和 AI 协作撰写，版本化、团队共享。

### 重写规则 ↔ 文档演化

| RMSP 规则    | AGE/nop-chaos-flux 对应             | 仓库里的真实例子                                                                                                     |
| ------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **split**    | 一个架构 doc 拆分为多个窄 scope doc | `flux-core.md` 的职责分化出 `frontend-programming-model.md`（顶层规范）、`form-validation.md`、`renderer-runtime.md` |
| **merge**    | 功能近似的 doc 合并                 | 两个表述同一约束的 doc 合并为一个                                                                                    |
| **lift**     | 从具体 doc 中抽象出更高层的原则 doc | `docs/architecture/README.md` 作为整套架构 doc 的阅读顺序和 hierarchy                                                |
| **connect**  | 交叉引用和新依赖建立                | `renderer-runtime.md` 引用 `form-validation.md`，`field-binding-and-renderer-contract.md` 引用 `renderer-runtime.md` |
| **prune**    | 废弃/归档不再适用的 doc             | `CompiledSchemaNode` 相关代码和文档被彻底移除                                                                        |
| **reweight** | 调整 owner-doc precedence           | `frontend-programming-model.md` 被确立为顶层规范，覆盖 `flux-core.md` 的部分职责                                     |

### 奖励调制 ↔ Audit 信号

RMSP 用 `reward → 责任分摊 → 贡献值累积 → 结构重写`。AGE 用 `audit finding → baseline drift 检测 → closure gate 调整 → 结构更新`。

信号不能来自生成者自身——这是两者的共同纪律。RMSP 中 LLM 是结构提议者，奖励是验证者；AGE 中实现者不能做完成判定，必须由独立 session 做 closure audit。

### 软 advice ↔ 硬控制流

RMSP 和 AGE 都把软信号转化为硬控制流。RMSP 中 LLM 提议的新结构在写入 aspect 图之前，必须先通过 `κ` 估计和 `F-score` 的硬门控——这不是一段建议，而是一个不可绕过的裁决。AGE 中 closure audit 的结果同样不是"建议关闭"，而是实际决定 plan 是否可以标记 completed。两者都在做同一件事：结构是否改变，不由提议者的软意见决定，而由一个独立于提议者的硬机制裁决。

从工程方向上看，两边的长期趋势也是一致的：把更多软约束转化为可强制执行的控制流节点。RMSP 论文明确区分了"软 advice"（prompt 注入，不可靠）和"硬 advice"（拦截工具调用、拒绝动作、重写参数，可靠），并指出智能体的可靠性提升依赖后者。AGE 的 closure gate、deep-audit、24 条 plan 规则也是把"应该收敛"的软意图固化为可执行的硬门禁。

### 慢通路（slow pathway）↔ Closure Audit

RMSP 的慢通路不参与每次快速推理，只在信用积累到阈值后触发结构重写。AGE 的 closure audit 也不参与日常实现，只在 plan 执行完毕后做独立的收敛判定。

---

## 四、核心差异

### 自动化程度

RMSP 的 aspect 生长是完全自动的——奖励驱动所有重写规则，不需要人类干预。AGE 的 attractor 演化是半自动的——human/AI 协作提议新结构，经过 audit 门控后采纳。

RMSP 更适合单个 Agent 的在线学习——规模小、反馈密集。AGE 更适合仓库级知识管理——规模大、反馈虽稀疏但单次结构影响大。

### 结构载体

RMSP 的结构载体是运行时的 aspect graph（在内存中，每个 Agent 实例独立）。AGE 的结构载体是仓库文件系统中的 owner-doc（在磁盘上，版本化，团队共享）。

RMSP 可以跨 Agent 实例迁移 aspect 图（导出→导入）；AGE 天然支持多人多 Agent 共享同一吸引子（版本控制 + diff review）。

### 评价指标

RMSP 用 `F = Surprise + β·Complexity` 统一评判结构改动是否被接受。这个公式的直观含义是"结构必须付租金"：新增结构必须通过降低误差（Surprise）来为自己的复杂度（Complexity）买单。AGE 没有统一的数值指标，它用多个实践信号评估收敛性：typecheck/build/test 是否通过、owner-doc 是否与 live repo 一致、closure audit 是否验证完成。

Agent 运行时的状态空间（aspect 图 × memory × tool call）远小于软件仓库的状态空间（文件 × 依赖 × 行为 × 测试 × 文档 × 配置）。在小状态空间里统一的数值评价函数可行，在大状态空间里评价必须分解为多个正交信号的组合。

### 适应 vs 收敛

RMSP 的目标是适应——Agent 更好地适应当前用户，允许 aspect 图持续漂移（只要 `F` 下降）。AGE 的目标是收敛——系统向预定义的吸引子收拢，偏离的结构会被 harness 拉回。

nop-chaos-flux 通过严格区分 "scope-in 的变更" 和 "吸引子更新" 来管理这一点。设计变更必须经过 owner-doc 更新 → closure audit 两个环节，不允许 silent baseline shift。

### 时间平移不变性

RMSP 假设 Agent 连续存在——至少在一个 session 内持续运行，aspect 图在内存中，奖励信号连续累加，结构重写在交互间自然发生。

AGE 面对的是不同的约束：AI 会话在用户关闭窗口后即消失。同一个仓库今天由 Agent A 修改，明天由 Agent B 审计，后天由 Agent C 继续开发——三者看到的必须是同一个仓库，读到的 owner-doc 必须是同一份，判断 closure 的证据必须是同一个 live repo。AGE 的所有状态输入输出都经过文件系统，这不是设计偏好，而是时间平移不变性的直接推论：因为会话不能持久，跨 session 的一致性只能靠文件系统这个唯一持久层来保证。（"时间平移不变性"借自物理学的 Noether 定理，此处指系统行为不因操作它的 Agent 或时间点不同而改变。）

RMSP 和 AGE 面对的根本不是同一个时间结构。

- RMSP 解决的是 **单实例、连续存在** 的适应问题——一个 Agent 从 session 开头到结束越用越顺。
- AGE 解决的是 **多实例、断续存在** 的收敛问题——无论哪个 Agent、无论何时打开仓库，都看到并维护同一套吸引子。

把 RMSP 和 AGE 结合使用时，真正需要解决的数据流问题不是架构抽象层面的兼容，而是：**Agent 实例销毁后，它的 aspect 图里哪些信息需要写入仓库？** RMSP 论文没有定义这一步（它不假设多实例），但实际集成时必须解决——比如把稳定收敛后的 aspect 规则降级为 AGENTS.md 中的操作规则，或者导出为项目可共享的 skill 包。反过来，AGE 的 owner-doc 读入 Agent 运行时后，也需要一个机制决定哪些约束应固化到 aspect 图中、哪些只需在本次 session 参考。

RMSP Agent 能否把 AGE 的 owner-doc 规则编码为 aspect 图中的 pointcut/advice，从而内化 AGE 的功能？不能。原因不在技术难度——AI 当然可以学会读文件——而在于时间结构不匹配。RMSP 假设 Agent 连续存在，aspect 图随实例生灭。AGE 要求时间平移不变：今天 Agent A 写的 owner-doc，明天 Agent B 必须能独立审计，不受 A 是否仍在运行的影响。只要仓库使用者不共享同一个持久 Agent 实例，内化就是死路。文件系统是唯一不受实例生灭影响的共享层。

两者冲突时，attractor 优先——跨 session 的项目一致性权重高于单次 Agent 适应的局部最优。如果 Agent 的 aspect 图漂移到了与 owner-doc 冲突的方向，AGE 的 harness（closure audit、deep-audit）会拉回它，而不是 RMSP 的奖励信号。两者共存需要明确的仲裁规则：项目基线由 AGE 定义，Agent 只能在不破坏基线的前提下自我适应。

把 RMSP 集成到 Agent runtime 中，让 Agent 在使用中演化出适应当前项目的技能偏好；上面铺 AGE 方法论，让项目仓库在 Agent 高速迭代中仍然保持结构。两者各管各的收敛问题。

---

## 五、nop-chaos-flux 的隐性印证

nop-chaos-flux 没有实现 RMSP，但它的实践和 RMSP 的理念有深层对应：

**生成与验证分离**：RMSP 的核心设计——LLM 提议结构，奖励决定结构是否落地。nop-chaos-flux 的核心纪律——实现者不能做完成判定，closure audit 必须由独立 session 完成。

**结构显式外化**：RMSP 把 aspect graph 设计为可检视、可编辑、可导出的数据结构。nop-chaos-flux 把 `docs/architecture/` owner-doc 作为系统应向哪里收敛的稳定载体。两种做法都认为结构信息应该显式外化，不能依赖隐式内化。

**结构重写以基线对齐为前提**：RMSP 重写前当前 MAN 图必须是已知的（`κ` 估计需要基线）。nop-chaos-flux 的 plan 指南的第一条规则：写计划前先核对 live repo。

**审计算法的深层对应**：nop-chaos-flux 的 deep-audit 有一整套偏离分类——doc-behavior drift、proof insufficiency、duplicate coverage、orphan contract。这些是 RMSP 中 `Surprise` 信号在仓库尺度上的表达：当 owner-doc 描述 ≠ live repo 行为时，Surprise 升高，需要结构修正。

---

## 六、AGE 模板：中间的粘合层

`attractor-guided-engineering-template`（[GitHub](https://github.com/entropy-cloud/attractor-guided-engineering-template)）是 AGE 在应用层项目的完整模板化。它与 nop-chaos-flux 的关系是：

| 维度        | AGE 模板                    | nop-chaos-flux                               |
| ----------- | --------------------------- | -------------------------------------------- |
| 定位        | 应用层项目脚手架            | 框架级低代码运行时                           |
| 文档数量    | 约 20-30 个文件（核心 ~10） | 数十个架构 doc + 组件设计 doc + plan + audit |
| Plan 复杂度 | 轻量 plan（~5 节模板）      | 完整 plan 体系（24 条规则 + 3 级状态）       |
| Audit 要求  | plan 前审计 + closure audit | 同上 + deep-audit + adversarial review       |
| 项目规模    | 中小型应用                  | 大型框架（约 20 个 workspace package）       |

AGE 模板在 RMSP 和 nop-chaos-flux 之间起到桥梁作用：它不需要每一层都到位，而是给出一个可以渐进增强的支架。RMSP 论文中把 Agent 的初始状态称为 "合子"（唯一一个皮层 aspect + 一组守恒反射核 + 零突触），对应 AGE 模板的 "最小核心"（AGENTS.md + docs/index.md + docs/context/ + 验证命令）；RMSP 的 "交互中生长" 对应 AGE 模板的 "按需触发"（plans/、bugs/、logs/ 只在实际需要时出现，不是预设全部）。

---

## 七、一个统一的演化图景

```
尺度              时间结构              结构示例            演化机制           评价方式
────             ──────              ──────            ──────            ──────
Agent 运行时      连续存在（单实例）      aspect 图          RMSP              F = Surprise + β·Complexity
                                        （6 条重写规则）
                                             ↑
开发 Session      断续存在（多 session）  plan + closure     plan audit        独立 closure audit
                                        gate + audit       + exit criteria
                                             ↑
项目长期          时间平移不变             owner-doc 树       deep-audit +      owner-doc vs live repo
                  （多实例、不受实例      架构吸引子         决策记录          一致性检验
                   生灭影响）
                                             ↑
方法论模板        时间平移不变（模板化）   AGE 模板 +         copy → fill →     project-context 真实性
                                        START-HERE        渐进增强          验证命令非占位符
```

每一层解决不同的收敛问题，每一层有不同的时间结构。RMSP 假设 Agent 连续存在，让实例收敛到适应当前任务的行为拓扑；Plan 层面对断续存在的多 session，让单次开发变更收敛到预定 scope 和 closure gate；Owner-doc 层要求时间平移不变，让项目长期演化收敛到稳定架构吸引子——无论哪个 Agent 什么时候来读，看到的吸引子一致；模板层同样要求时间平移不变，但针对的是从零开始的新项目。

---

## 八、结论

1. **共享诊断**：三者都认为静态的撰写产物（authoring artifact）是当前实践的核心局限，必须引入结构可塑性。

2. **尺度分工**：RMSP 解决 Agent 运行时的结构自进化，AGE/nop-chaos-flux 解决项目仓库在 AI 高频迭代下的结构收敛。两者不是替代关系，而是在不同尺度上互补。

3. **共同的门控原则**：生成（LLM 提议 / Agent 实现）和验证（奖励 / audit）必须分离。RMSP 中表现为 `κ` 估计 + `F-score`，AGE/nop-chaos-flux 中表现为独立 closure audit。

4. **nop-chaos-flux 是 AGE 在框架层面的完整实现**，也是 RMSP 理念在仓库管理层面的先行印证——owner-doc 的 split/merge/lift/prune/connect/reweight 实现了文档结构的自组织演化。

5. **AGE 模板是中间的粘合层**：[attractor-guided-engineering-template](https://github.com/entropy-cloud/attractor-guided-engineering-template) 连接了理论范式（RMSP）和框架级实践（[nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux)），为应用层项目提供了从合子开始渐进生长的路径。

6. **一个可验证的预测**：如果 RMSP 在未来被工程化验证，它最自然的集成方式不是替代 AGE，而是在 Agent runtime 层与 AGE 结合——RMSP 驱动 Agent 自身结构的适应，AGE 驱动仓库吸引子的收敛。两者结合形成完整的"自进化开发"闭环。
