# OpenProse、Natural-Language Agent Harnesses 与 Attractor-Guided Engineering的比较分析：控制层和方向层的分野

> 相关项目：[OpenProse](https://github.com/openprose/prose)（`@openprose/reactor`）、[NLAHs](https://arxiv.org/abs/2603.25723)（Natural-Language Agent Harnesses https://arxiv.org/abs/2603.25723）、[AGE 模板 https://github.com/entropy-cloud/attractor-guided-engineering-template](https://github.com/entropy-cloud/attractor-guided-engineering-template)、[nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux)（AGE 的生产级实施实例）
> AGE 方法论系列文章：[Attractor Before Harness: AI 大规模开发的方法论](https://mp.weixin.qq.com/s/TwMkUDLNo2-bIrXrfvPqIw) 、 [从 Spec-Driven Development 到 AGE](https://mp.weixin.qq.com/s/j4dZm1bAK61qB8i5RzHRWA)

---

## 起点

OpenProse、NLAH(Natural-Language Agent Harnesses) 和 AGE(Attractor Guided Engineering) 都在应对同一个焦虑：AI agent 的产出不可靠，怎么办？

前两者在控制层给出答案——OpenProse 用确定性 runtime 让目标可被精确维护，NLAHs 用自然语言文档让 harness 策略可被审查。AGE 追问的是控制层之前的问题：控制到底应该维护什么结构？

如果方向层不存在，更好的 runtime 和更清晰的 harness 只会让漂移更可重复。

**OpenProse** 从**运行时抽象**出发——设计一种让 AI agent 长期维护"持续为真"目标的合约语言和运行引擎。

**NLAHs** 从**表示媒介**出发——将 agent harness 策略从 tangled controller code 外化为可编辑的自然语言文档，由共享运行时 IHR 解释执行。

**AGE** 从**工程过程**出发——设计一种让人类和 AI 协作时系统持续向稳定结构收敛的文档-流程体系。

OpenProse 问的是：怎样让一个目标不变。NLAHs 问的是：怎样让一次 agent run 按可审查的策略执行。AGE 问的是：系统被推偏之后，为什么还会回到正确方向。

> **约定**：本文中 "NLAHs" 指论文提出的整体框架（Natural-Language Agent Harnesses），"NLAH" 指单份策略文档，"IHR" 指共享运行时（Intelligent Harness Runtime）。

---

## Fixed Point ≠ Attractor

OpenProse 和 AGE 的核心抽象对应两个不同的数学对象。

**Fixed Point（不动点）**：`f(x) = x`。系统放在这个点上就不动了。判定条件是严格的等式。不动点可以是稳定的（附近的点向它收敛），也可以是不稳定的（附近的点远离它）。Fixed point 不蕴含 basin of attraction 的概念。

**Attractor（吸引子）**：一个集合（点、极限环、奇怪吸引子），使得周围一个区域（吸引域，basin of attraction）内的所有初始状态都会随时间演化向它收敛。关键性质不是"放上去不动"，而是"从附近出发会被拉回来"。吸引子不必是一个点，可以是一个流形。系统不需要精确到达它——只要在 basin 内，轨迹在收敛就行。

OpenProse 的指纹比对 `fingerprint == fingerprint` 是 fixed point 检测：输出和之前一样吗？一样就不动了。

AGE 的"系统向稳定结构收敛"可按 attractor 判据理解：系统不需要精确到达某个理想状态，只要控制机制持续把它拉回稳定结构附近。

一个是状态判定——"到了没有"。一个是过程判定——"方向对不对"。

---

## Control Target ≠ Attractor：本体论断层

收敛机制（fixed point vs attractor）的区分之外，还有一个更深的本体论差异：**控制目标 vs 吸引子**。

### 控制目标（Control Target）

控制框架已经建立后，定义"控制应该朝向哪里"。它假设：

- 控制框架本身已经存在
- 执行者会按照指令行动
- 偏离时通过**重新执行指令**来纠正

控制目标是外部强加的 specification，执行者被**驱动**着去符合它。

### 数学吸引子（Attractor）

吸引子由系统自身动力学产生——周围区域内的所有初始状态都随时间演化向它收敛。关键性质：

- 它是**涌现的**——由系统动力学定义，不是外部强加的指令
- **扰动-恢复**——推走它，动力学会把它拉回来
- 系统**不需要"知道"它**——水不需要知道洛伦兹吸引子就按它运动
- 它是**方程定义的流形**——不枚举每个正确状态，只定义约束关系

吸引子为控制提供**最终因**（final cause）。它在控制之前，不在控制之内。

> **注意**：下文对 AGE 使用"吸引子"时，描述的是工程判据，不是数学证明。AGE 的吸引子不是自然涌现的数学对象，而是工程化构造的方向场：人定义结构约束，流程把这些约束转化为跨会话的恢复动力学。它的判据不是"没有外部设计"，而是"扰动后的恢复是否由持久结构场驱动，而非由一次性指令驱动"。

### 打个比方

操作手册告诉工人怎么组装零件。工人按手册做，偏离了对照手册纠正。手册是控制目标——它需要工人"知道"它并主动执行。

重力井是吸引子——不管你怎么推物体，物体的动力学自然把它拉回来。物体不需要"知道"重力井的存在。

### OpenProse 和 NLAHs 的不变量都是控制目标

**OpenProse 的 Responsibility**（Goal/Maintains/Continuity）是外部定义的 specification。运行时通过指纹比对检测偏离，偏离了就重新 render。这是控制目标 + 确定性执行。收敛靠 runtime 强制重新执行 specification。

**NLAHs 的 harness pattern**（contract + stages + modules）告诉 IHR 应该怎么组织一次 task run。IHR 执行这个指令。如果 agent 偏离，是指令把它拉回来，不是系统动力学自然收敛。NLAH 是一份 specification（操作手册），IHR 是 interpreter（执行者）。Agent 的行为被**驱动**着去符合 specification，而非被系统动力学**吸引**向涌现结构。"behavior is flexible but still policy-guided" 不是吸引子语义，是**软约束下的程序执行**。

### AGE 的 owner-doc 体系在类比意义上具备吸引子性质

1. **扰动-恢复动态**：AI 改了代码（扰动）→ test/audit 发现偏离 → 修正 → 系统回到结构附近。跨会话的扰动-检测-纠正循环构成了收敛动力学。
2. **隐式定义的流形**：`docs/architecture/` 不是枚举每个正确状态，而是定义约束方程。满足约束的状态构成流形，局部实现多样，整体被拉向同一类结构。
3. **跨会话涌现**：上百次 commit、几十个 plan、多次审计叠加后的长期收敛——这是"系统行为"，不是"某次执行"。

AGE 的恢复同样依赖文档作为真值源。区别不只是粒度和时间尺度，而是**约束对象不同**：控制层指令约束一次执行如何完成；方向层约束未来所有执行结果允许落入的结构区域。

### 机制层的结构性平行

三个体系的机制层存在结构性平行：

|            | OpenProse                       | NLAHs                    | AGE                               |
| ---------- | ------------------------------- | ------------------------ | --------------------------------- |
| **真值源** | Responsibility (Goal/Maintains) | NLAH (contract + stages) | Owner docs (`docs/architecture/`) |
| **解释者** | OpenProse reactor               | IHR runtime              | AI agent 读文档                   |
| **检测**   | 指纹比对                        | contract gates           | CI + audit                        |
| **纠正**   | 重新 render                     | 重新执行策略阶段         | 修正代码，重读文档                |

机制槽位相似，但语义不同。这个表只说明三者都是控制系统，不说明它们控制的是同一类对象。OpenProse 和 NLAHs 让一次执行更可控；AGE 判断这些执行累积后是否仍指向同一个长期结构。

差异不在机制层，而在机制层之上的**方向层是否存在**。OpenProse 的 Responsibility 和 NLAHs 的 NLAH 都是**自包含的 specification**——它们定义了自己的完成条件（指纹相等 / contract 满足），不需要外部引用"系统应该向什么结构收敛"。AGE 也有完成条件（CI gates、audit 通过），但 owner docs 的不可替代作用是：当局部完成条件与长期结构方向冲突时，提供裁决依据。CI 可以判定某次 import 是否通过；owner-doc 决定为什么 `flux-react` 不能反向依赖 renderer 包。前者是控制门，后者是方向层。

这就是方向层 vs 控制层的区别：不是机制不同，而是**控制之上有没有一个独立的、持久的目标结构为所有控制提供最终因**。

### 三者的本体论位置

三者的关系不是层次关系（project-level attractor ⊃ run-level attractor），而是**本体论差异**：

```
方向层（Attractor）——AGE: owner-doc 定义的长期收敛结构
  ↑ 为控制提供最终因
  │
控制层（Control Target）——NLAHs/OpenProse: specification + runtime 执行
  ↑ 控制机制的实现
  │
机制层（Mechanism）——IHR/reactor/CI: 具体的检测、执行、恢复
```

AGE 文章的核心论点正是：**方向层先于控制层。** 没有定义"朝哪里收敛"，控制机制就没有统一意义。NLAHs 和 OpenProse 都在控制层做创新——NLAHs 用 NL 提高策略的可审计性和可移植性，OpenProse 用确定性 runtime 提高执行的精确性和成本效率。但它们都不能回答方向层的问题：**系统应该向什么结构长期收敛？** 可检验地说：如果移除 AGE 的 owner-doc 优先级链、日志和 bug 蒸馏后，系统仍能在长期重构中保持同等架构方向，那么 AGE 的方向层主张就是多余的。

---

## 三个体系的前提假设

### OpenProse：会话终将结束，责任不应随之消失

OpenProse 的核心隐喻来自 React。它把 AI agent 的每一次执行建模为一个 render：

```
(contract, evidence, prior world-model) → (new world-model, receipt)
```

三个关键假设：

1. AI 的价值在于 bounded render——有限、可审计的单次推理
2. 持续性的来源不是会话，而是 world-model 的持久状态和 receipt 链
3. 成本与"意外"成正比，与时间无关——如果没有变化，render 不执行

这是 runtime-first 的世界观：先定义好"什么在运行时保持为真"，再考虑工程过程。

### NLAHs：策略不应埋在代码里

NLAHs（Natural-Language Agent Harnesses）的核心隐喻来自可编辑的策略文档。它把 agent harness 策略建模为四层栈：

```
Base agent (LLM + terminal)
  → Runtime policy (固定 NL charter)
    → NLAH (可替换的 per-harness NL policy)
      → Scripts/adapters (确定性 code hooks)
```

三个关键假设：

1. Harness 策略可以从 tangled controller code 中分离出来，用可编辑的自然语言表达
2. NL 携带策略，code 携带机制——精确操作留在代码里，可检查的策略留在 NL 里
3. 共享 runtime（IHR）可以为不同的 NLAH 提供统一的执行基底

这是 representation-first 的世界观：策略的表示媒介决定了它的可审查性、可移植性和可分析性。

### AGE：先定义系统要回到哪里，再讨论怎么回去

AGE 的核心隐喻来自动力系统理论：

```
State Space → Attractor → Trajectory → Control
```

三个关键假设：

1. AI 是结构上不同的扰动源——高频、高振幅、无持续方向感
2. Attractor 必须先于 harness 存在——"朝哪里纠正"先于"如何纠正"
3. 文档是 attractor 的载体，代码是 attractor 的瞬时投影——两者都不是 attractor 本身

这是 process-first 的世界观：先定义好"系统应该向什么结构收敛"，再设计运行时的行为。

### 分歧一览

| 维度         | OpenProse                               | NLAHs                                  | AGE                                                     |
| ------------ | --------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| 核心问题     | 如何让 AI 持续维护一个为真的目标？      | 如何将 harness 策略外化为可审查的 NL？ | 如何让系统在 AI 高频扰动下持续向稳定结构收敛？          |
| 问题域       | 单个 responsibility 的生命周期          | 单次 task run 的 harness 策略          | 整个仓库的演化轨迹                                      |
| 时间尺度     | 单次 render（分钟）到持续 serve（天）   | 单次 task run（分钟到小时）            | 单次 commit（分钟）到项目演化（月/年）                  |
| 不变量性质   | 控制目标（specification + fixed point） | 控制目标（specification + 软约束）     | **工程化方向场**（engineered attractor-like structure） |
| 稳定性概念   | **Fixed point**——指纹相等即不动         | **Policy conformance**——符合策略即正确 | **Attractor**——在 basin 内即收敛                        |
| "对了"的含义 | 输出与期望精确匹配（二值）              | 执行路径符合 NLAH 规定的策略           | 系统在收敛方向上（方向性）                              |
| 收敛机制     | 确定性指纹比对（零 LLM）                | IHR 解释 NL policy（依赖 LLM）         | 扰动-恢复动力学（test→audit→fix）                       |
| 策略执行     | Runtime 强制                            | Runtime + NL 指导                      | 制度化流程诱导，而非 runtime 强制                       |

---

## 核心抽象对比

### 最小原语

**OpenProse 的 Responsibility** 是一个自包含的计算单元：

```markdown
---
kind: responsibility
---

### Goal 维护目标描述

### Requires 从其他责任订阅的输入

### Maintains 本责任产出和维护的真值

### Continuity 跨 render 的连续性约束
```

它有明确的输入边界（Requires）、输出边界（Maintains）、目标（Goal）和连续性约束（Continuity）。执行产生一个 receipt——内容寻址、链式可验证的决策证明。

**NLAHs 的 NLAH 文档** 是一个可编辑的策略描述：

```markdown
## Task Contract（输入、输出、完成条件）

## Stages（inspect → plan → edit → verify → recover → finalize）

## State Rules（状态文件、artifact 路径、证据要求）

## Validation Rules（何时验证、接受条件）

## Recovery Rules（重试策略、回退路径）

## Stopping Conditions（何时关闭运行）
```

它定义了 task run 的生命周期策略，由 IHR 解释执行。NLAH 不是"告诉模型怎么回答"，而是"告诉 runtime 怎么组织一次多步执行"。

**AGE 的 Attractor** 不是一个对象，是一个结构性质，由三层组成：

- **结构层**：少量高层不变量（如包依赖方向 `flux-core → ... → flux-renderers`、七种原语闭集、编译优先管道）
- **载体层**：承载这些不变量的可审计文档（`docs/architecture/`）
- **实现层**：当前代码中体现这些不变量的部分

Responsibility 和 NLAH 都是**实例**——你可以数出"这个项目有 23 个 responsibility"或"这个 benchmark 有 1 个 NLAH"。Attractor 是一个**性质**——你不能数出"这个项目有 5 个 attractor"，它更像"这个系统的吸引子是一个低维流形"。

### 状态模型

**OpenProse**：每个 responsibility 维护一个 world-model（维护的真值），分为 published（指纹化的、可被下游订阅的）和 workspace（私有草稿、不指纹化的）两部分。每次 render 产生一个 receipt，构成链式可验证的决策历史。

状态变化的核心机制是**不动点检测**：`(contract_fingerprint, input_fingerprints)` 如果没变，render 不执行（零 token 成本）。这是精确的等式判定——`hash == hash`——即判断"输出是否已经是一个 fixed point"。

**NLAHs**：状态通过文件系统承载。IHR 在 `STATE_ROOT`（默认 `/sa-output/runtime`）下维护运行时状态，在 `/sa-output/artifacts` 下维护可评审的交付物。状态更新由 NLAH 策略规定——何时写状态文件、哪些 artifact 必须被后续 agent 重新打开、什么证据支持什么结论。

状态变化的核心机制是**策略遵循**：IHR 按照 NLAH 的阶段和规则执行，agent 在策略约束内灵活行动。Paper 发现 "behavior is flexible but still policy-guided"——同一份 NLAH 可以产生不同具体执行路径，只要满足同一 contract。

**AGE**：AGE 的"状态"不是单一数据结构，而是三个层面：

1. 代码（实现的瞬时投影）
2. Owner 文档（`docs/architecture/`、`docs/design/` 等，attractor 的载体）
3. 轨迹记忆（`docs/logs/`、`docs/bugs/`、`docs/lessons/`，系统演化的历史）

状态变化的核心机制是**收敛循环**：`typecheck → build → lint → test → audit → log`。这不是在检测"输出是否精确等于期望"，而是在检测"系统是否仍在吸引域内、是否仍在向 attractor 收敛"。一次通过不意味着到达了 attractor——它只意味着当前状态还在 basin 里。

|            | OpenProse                          | NLAHs                                  | AGE                                     |
| ---------- | ---------------------------------- | -------------------------------------- | --------------------------------------- |
| 状态表示   | 内容寻址的 world-model（形式化）   | 文件系统状态（STATE_ROOT + artifacts） | 代码 + 文档 + 日志（非形式化）          |
| 变化检测   | 确定性指纹函数（canonicalizer）    | IHR 解释 NL 策略 + contract gates      | CI 命令 + 人工审查                      |
| 历史记录   | Receipt ledger（链式可验证）       | Artifact 文件 + 日志（单次 run 内）    | 日志 + Bug Notes + Git history          |
| 稳定性语义 | Fixed point 检测（`hash == hash`） | Policy conformance（符合策略）         | Attractor 收敛（在 basin 内且方向正确） |
| 跨会话记忆 | Receipt chain（链式可验证）        | 无（单次 run 内的文件状态）            | 有（logs、bugs、discussions、plans）    |

### 组合机制

**OpenProse 的 Forme** 在编译期通过语义匹配自动建立订阅关系：

```
Responsibility A --[### Maintains::facet-x]--> Responsibility B --[### Requires::facet-x]
```

下游只订阅上游的特定 facet（`####` 子声明），facet A 的变化不会唤醒订阅 facet B 的下游。结构即订阅。这是严格的 DAG——无环性作为后置条件强制执行。

**NLAHs 的 IHR 编排**通过 parent-child agent 调用实现组合：

```
Parent orchestrator (执行 NLAH 策略)
  → Child executor 1 (接收 task packet)
  → Child executor 2 (接收不同 task packet)
  → Verifier child (检查 artifact)
```

NLAH 定义角色和阶段，IHR 把这些映射为具体的 agent 调用边界。Paper 发现 parent-child handoff 是当前主要的机制弱点——information handoff recall 降至 0.32-0.55。组合是 runtime 级别的 agent 编排，不是编译期的自动连线。

**AGE 的 Owner-Doc 路由**不是运行时的数据流，而是工程过程中的语义权威拓扑：

```
docs/architecture/flux-design-principles.md  （最高优先级）
  ↓ 载体
docs/architecture/frontend-programming-model.md
  ↓ 载体
docs/architecture/flux-core.md
  ↓ 载体
docs/architecture/{各个子系统文档}
```

每个文档"拥有"特定的问题域，事实冲突时优先级链决定谁说了算。

三种组合逻辑代表三种哲学：OpenProse 是数据驱动的自动连线——追求"不用人写依赖关系"。NLAHs 是策略驱动的 runtime 编排——追求"不用人写 controller code"。AGE 是语义驱动的手动分层——追求"不用人猜哪个文档说了算"。

---

## 技术实现对比

### 编译期 vs 运行期

**OpenProse** 是严格的两阶段架构：

```
Compile（昂贵，罕见）:
  prose.md → Forme（拓扑 DAG）
           → Canonicalizer（指纹函数）
           → Postcondition Validators（提交门控）

Run（廉价，频繁）:
  比对指纹 → 未变则跳过 → 变了则 render → 门控提交 → 传播下游
```

编译期用 LLM 产生三个确定性工件。运行期从不调用 LLM 做判断，所有决策都是确定性的。稳定性语义是 fixed point：指纹没变，系统精确地停在不动点上，无需额外操作。

**AGE** 没有"编译一次然后运行"的分离。验证持续嵌入在每次变更中。稳定性语义是吸引子式收敛：没有"到达终点"的时刻——每次验证不是精确判定 basin membership，而是收集多维信号，判断当前轨迹是否仍可被拉回长期结构。

```
任何代码变更 → typecheck → build → lint → test →
  如果是重大变更 → 写 Plan → 独立审计 → 闭包审计 → 日志记录
```

|                  | OpenProse                      | NLAHs                          | AGE                              |
| ---------------- | ------------------------------ | ------------------------------ | -------------------------------- |
| 分离模式         | 编译期 vs 运行期（严格二阶段） | NL policy vs 确定性 hooks      | 变更前 vs 变更后（持续循环）     |
| 智能的位置       | 仅在编译期                     | 分散在 IHR 编排和 NL 解释中    | 分散在审计、日志、人工审查中     |
| 运行时的判断能力 | 零（纯确定性）                 | 高（依赖 LLM 解释 NL）         | 依赖人工+工具组合                |
| 稳定性语义       | Fixed point（到达即停）        | Policy conformance（策略遵循） | Attractor 收敛（永远在验证方向） |

### 成本控制

**OpenProse** 的成本 = Σ(变化了的 responsibility 的 render 成本)。如果只有 2/100 个 responsibility 的输入变了，只 render 2 个。局部最优——理论上无法比这更便宜。

**NLAHs** 的成本受 IHR 编排开销影响。Paper 发现 NLAHs 通常使用更多 model calls、tool calls 和 tokens——因为 IHR 建立在通用 agent 基底上，用 NL 编排增加了开销。但重要发现是：这个成本不影响任务性能。Live-SWE NLAH 的 wall-clock time 甚至快于 native code harness（6.1 min vs 28.9 min）。成本属于工程优化范畴，不代表表示方法本身有问题。

**AGE** 的成本控制通过计划触发条件实现：改动 < 5 文件、< 200 行、单模块内 → 跳过计划直接改；跨模块、> 5 文件、修改公共 API → 必须写计划 + 审计。这不是"跳过执行"，而是"跳过过程开销"。

### 验证与信任

**OpenProse** 的信任基础是内容寻址 + 确定性验证：

```
render 产出 → gateCommit（postcondition validators）→ 通过 → commit + receipt
                                     → 失败 → 回滚 + 失败 receipt
```

每个 receipt 包含：wake cause、指纹、状态（rendered/skipped/failed）、token 成本、prev 链接。receipt 之间构成链，可以离线重放验证，不需要密钥。

**AGE** 的信任基础是分层交叉验证 + 生成/评判分离：

```
代码变更 → 自动化验证（typecheck/build/lint/test）
         → 计划闭包审计（独立子代理）
         → 深度审计（对抗性审查）
         → 日志记录 + bug 记录
```

AGE 明确识别了**自验证陷阱**：AI 从同一上下文生成代码和所有评判材料（类型、测试、文档、完成总结），如果理解有偏差，所有"验证证据"会朝同一个方向偏。对策是强制生成和评判分离——闭包审计必须由新上下文执行。OpenProse 通过编译期冻结确定性函数来绕过同一个问题。NLAHs 在论文的评估场景中靠 benchmark autograder 规避——但在生产部署中，NLAHs 同样需要外部验证机制来避免自验证陷阱。

---

## 对"一致性"的理解——三种语义

这是三个体系最深层的分歧点。

**OpenProse 的 fixed-point 一致性**：每个 responsibility 的 render 产出 world-model，通过 canonicalizer 得到指纹。指纹和上次一样，系统"一致"。判定是二值的：相等或不相等，没有"差不多一致"。组合层面，每个 responsibility 都在自己的不动点上，DAG 拓扑正确，则整个系统一致。自底向上，每个局部不动点组合成全局不动点。

**NLAHs 的 policy-conformance 一致性**：agent 的执行路径是否遵循 NLAH 规定的策略。Paper 定义了 pattern-preservation、stage-coverage、artifact-contract compliance 等指标来度量。不是二值的——NLAH 允许灵活执行，但要求策略结构（阶段、角色、验证门、状态规则）被保留。Paper 的 RQ2 发现 NLAH 保留了可识别的工作流结构（workflow preservation 0.63-0.67, stage coverage 0.57-0.82），但信息传递是主要弱点（handoff recall 低至 0.32）。

**AGE 的 attractor 一致性**：不是二值的。一个系统可以"大部分在 attractor 附近，但某个子系统偏离了"——这不是"不一致"，而是"在 basin 内但偏离中心"。判定标准是方向性的：系统是在向 attractor 收敛，还是在远离？一次 commit 可以通过所有测试（在 basin 内），但如果引入了架构偏移（比如逆转包依赖方向），系统的轨迹就不再向 attractor 收敛了。自顶向下——即使每个模块的测试都通过（每个局部都在不动点），整体仍然可以偏离 attractor。

AGE 的原始论断：_"所有 state-level checks 都能通过，但系统整体在漂移"_。nop-chaos-flux 的 Plan 76 是一个实例：移除 `array-editor` 局部状态镜像的尝试产生了 11 个测试失败——不是因为单个 bug，而是因为测试本身已经漂移到了与旧实现的时序耦合状态。每个累积的变更都通过了 review 和 CI，但从 attractor 视角看，测试套件已经漂离了能支持结构性演化的位置。这恰恰是 attractor 概念存在的原因。

这个区分不是术语偏好：

1. Fixed point 方法只能检测"是否精确到达"——对"在收敛方向上但还没到达"和"已经偏离"的区分能力很弱
2. Attractor 方法天然关注轨迹方向——不需要系统精确到达，只需要系统在收敛，而收敛本身就是可持续的
3. Fixed point 在离散状态空间（如 world-model 的指纹）中工作良好；Attractor 在连续状态空间（如架构的演化）中更有表达力
4. 这直接解释了为什么 OpenProse 用 `hash == hash`（离散等式），AGE 用"CI 通过 + 文档一致 + 架构边界完整"（多维收敛信号）

---

## 对 AI 的定位

**OpenProse** 把 AI 建模为一个有界的 render 函数。它接收 (contract, evidence, prior)，产出 (new world-model, receipt)。智能被严格限制在 render 边界内。编译期和运行时的所有决策都是确定性的。AI 的角色是**执行器**。

**NLAHs** 把 AI 建模为一个被策略文档约束的执行系统。IHR 作为 parent orchestrator 读取 NLAH 策略，把任务分发给 child executor agents。AI 既是指令的解释者（IHR 解释 NL 策略），也是任务的执行者（child agents 执行具体工作）。AI 的角色是**策略解释器 + 执行器**。

**AGE** 把 AI 建模为一个高频、高振幅、无持续方向感的扰动。它不是"更快的程序员"——是一种性质不同的力量。因此需要 attractor 来定义"扰动后回到哪里"，需要 harness 来控制"扰动的传播范围"。AI 的角色是**扰动源 + 执行器**（同时被约束和被使用）。

---

## 对文档的理解

**OpenProse**：`*.prose.md` 不是关于代码的文档——它就是程序。编译后的 IR、投影、receipt 都是派生物。如果任何东西与 Markdown 不一致，Markdown 是对的。没有第二个创作面。

**NLAHs**：NLAH 文档不是程序——它是**策略**。它规定"怎么做"但不直接"执行"。精确的执行留给 scripts、adapters 和 runtime。NLAH 的价值在于把最可审查的策略部分从实现细节中分离出来。Paper 发现 Live-SWE 的可读策略从 60.1k tokens of code 缩减为 2.9k tokens of NL。

**AGE**：文档不是 attractor 本身，也不是代码的附属品。它是 attractor 的**载体层**。Attractor 是抽象的结构性质；载体层是使其可审计、可版本化、可路由的具体文档。代码是 attractor 的**瞬时投影**——它可能部分正确、部分偏离，但载体层定义了它应该回到哪里。

OpenProse 把文档视为程序本身（单一创作面）。NLAHs 把文档视为可审查的策略层（与机制分离）。AGE 把文档视为结构性质的载体（代码和文档是 attractor 的两种不同投影）。

---

## 失败处理

**OpenProse**：失败产生一个 `failed` receipt，包含失败原因和 token 成本。Tenet 4："Fail safe. Under uncertainty, escalate or stop rather than act." Receipt chain 保证即使失败也有可审计的记录。失败处理是**即时和个体的**——每个 render 独立记录失败。

**NLAHs**：NLAH 文档中定义了 Recovery Rules——何时重试、如何回退、什么证据支持重试决策。Paper 的 RQ3 表明，最有效的模块是那些"缩短从中间工作到可审计证据和最终接受条件的路径"的模块（file-backed state +2.6~+13.9, self-evolution +5.8~+8.4）。失败的 artifact 保留在文件系统中供后续分析。但失败模式不跨 run 蒸馏——每次 task run 独立，没有 guardrails 机制。

**AGE**：失败产生一个结构化的 Bug Note（Problem → Diagnostic Method → Root Cause → Fix → Tests → Notes for Future Refactors）。反复出现的失败模式被蒸馏为 guardrails。AGE 有一个**渐进式自动化策略**：

```
散落笔记 → 可复用审计提示 → 检查清单 → 启发式脚本 → 静态检查 → lint 规则 → CI 门控 → codemod
```

每个级别的复发频率证明更强的自动化响应是合理的。失败处理是**累积和演化的**——反复出现的失败模式逐步蒸馏为自动化规则。

---

## 渐进式自动化的实证：nop-chaos-flux 的工具链

AGE 方法论有一个核心论断：_能落实为确定性检查的，会逐步从轨迹数据中抽取为确定性脚本_。

[nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux) 的工具链为这条论断提供了完整的实证。实际发生的 5 级渐进自动化阶梯：

```
Tier 1: 轨迹捕获（Bug Notes + Logs）
  62+ bug fix notes, 72 daily dev logs

Tier 2: 模式蒸馏（Architecture Guardrails + Audit Rules）
  8 guardrails distilled from bugs, 19 dedicated audit rules

Tier 3: 编码化的审查模式（Skills/Prompts）
  24 reusable audit/review prompt templates

Tier 4: 启发性嫌疑扫描器（Heuristic Scanners, exit 0）
  12 focused audit scanners, informational output

Tier 5: 硬门控自动化（Hard Gates, CI-blocking, exit 1 on failure）
  14 hard gate scripts, 30+ ESLint rules, dependency-cruiser, Semgrep, Husky pre-commit
```

### 实例 A：构建产物污染源码目录

**Tier 1** — Bug #23：`packages/*/src/` 中残留的 `.js` 文件在 Vitest 运行时暗中覆盖了 `.ts` 源码，导致测试失败但根因不在测试代码。共发现 102 个过期文件。

**Tier 2** — Guardrail #6 "No Build Artifacts In Source Directories" 被蒸馏进 `docs/references/architecture-guardrails-from-bugs.md`，附有 bug 证据链接。

**Tier 5** — `scripts/verify-no-src-artifacts.mjs` 成为硬门控（CI-blocking），同时 `scripts/clean-src-artifacts.mjs` 提供清理能力。`pnpm lint` 链在 ESLint 之前先跑 clean + verify。

从 bug 到 CI 门控，完整走完了 5 级。

### 实例 B：响应式读取 vs 命令式读取

**Tier 1** — Bug #22：`A1ValueProbe` 使用 `scope.readOwn()`（命令式）而非 `useScopeSelector`（响应式订阅），组件永远不在数据变化时重新渲染。Bug #03：Fragment scope 在每次 render 时重建，破坏表单状态。Bug #04：Dialog scope 未订阅父 scope 变化。

**Tier 2** — Guardrail #1 "Reactive Render Reads Must Subscribe" + Guardrail #3 "Scope Identity And Parent-Child Reactivity Must Be Stable"。审计规则 `docs/references/audit-rules/reactive-read-vs-imperative-read.md` 专门记录这个模式。

**Tier 4** — `scripts/audit/find-reactive-render-reads.mjs` 扫描所有 `scope.get()`/`scope.read()`/`runtime.getState()` 在 render 敏感代码中的使用，附有 known-safe-paths 排除表。这是启发性扫描器（exit 0），不是硬门控——因为这个模式存在合法例外（如 effect 回调中的命令式读取），完全自动化会产生太多假阳性。

**故意停在 Tier 4** — 判断"这个命令式读取是否在 render 路径中"需要语义理解，目前无法完全机械化。不是所有模式都适合硬门控，启发性扫描器是 Tier 4 的正确归宿。

### 实例 C：React 19 遗留 API 防御

**Tier 2** — 从 React 19 迁移基线中识别出需要禁止的 API 列表。

**Tier 5** — 三重冗余防御，全部是硬门控：

1. `scripts/check-react19-legacy-apis.mjs` — AST 扫描 `ReactDOM.render`、`findDOMNode`、`forwardRef`、string refs 等
2. ESLint `no-restricted-imports` + `no-restricted-syntax` + `no-restricted-properties` + `react/no-deprecated` + `react/no-string-refs` + `react/no-find-dom-node`
3. Semgrep `.semgrep.yml` 中的规则

同一条约束在三个独立工具中实现——复发频率最高的模式在 Tier 5 获得了最强防御。

### 尚未完全实现的间隙

这个阶梯存在已文档化但未自动化的间隙：

- **Guardrail #7**（Owner/Bridge/Persisted State Coherence）— 有详细的审计规则文档，但没有对应的扫描器脚本。这是最复杂的 guardrail，失败模式最微妙。
- **Guardrail #8**（Schema-Within-a-Prop compilation）— 有 bug 证据（#43）但没有自动化检查。
- 19 个审计规则中约 10 个没有对应的扫描器脚本，仅存在于文档中。

渐进自动化不是全有或全无——它按复发频率和自动化可行性逐步推进。AGE 的论断不是"所有约束都必须自动化"，而是"复发频率足够高的约束值得自动化，且自动化强度与复发频率成正比"。

---

## 一个思想实验：如果用 OpenProse 或 NLAHs 管理 nop-chaos-flux

### 用 OpenProse

假设把 nop-chaos-flux 的每个架构不变量建模为 OpenProse 的 responsibility：

```markdown
---
kind: responsibility
name: package-dependency-direction
---

### Goal 维护 flux 系列包的单向依赖关系

### Requires 所有 package.json 的依赖声明

### Maintains 依赖方向合法性矩阵

### Continuity 依赖方向逆转 = 立即失败
```

这会给出运行时精确的依赖方向检测——每次 package.json 变化都自动触发检查。但它不会告诉你：

- 为什么依赖方向应该这样？ → 需要设计原理文档
- 如果需要引入反向依赖怎么办？ → 需要 Architecture Decision Record
- 这个方向在整个项目演化中的稳定性如何？ → 需要轨迹记录
- 新加入的人如何理解这个约束？ → 需要 context 文档

### 用 NLAHs

假设把 nop-chaos-flux 的每次 plan 执行建模为 NLAH：

```markdown
## Task Contract

- Input: 当前 repo 状态 + plan 目标
- Output: 变更后的代码 + 验证通过的证据
- Completion: typecheck + build + lint + test 全通过 + owner-doc adjudication 完成

## Stages

- Inspect: 读 owner-doc 基线，理解当前状态
- Plan: 写执行计划，定义闭包条件
- Edit: 实现最小完整切片
- Verify: 运行验证栈
- Audit: 独立闭包审计
- Close: 更新日志和 owner docs

## Validation Rules

- 每个 execution item 必须有对应的 proof item
- 闭包审计必须由新 session 执行
```

这会给出结构化的 plan 执行流程——每次 plan 都按策略组织，agent 行为被约束在策略内。但它不会回答：

- 为什么这个依赖方向属于正确的长期结构，而不是另一个？ → 需要方向层的判断
- 100 次 plan 执行后系统是在收敛还是漂移？ → 需要轨迹分析
- 哪些 owner-doc 规则具有更高优先级？ → 需要 source-of-truth precedence

### OpenProse 和 NLAHs 都不能替代的

AGE 的 owner-doc 系统处理这些问题。OpenProse 的 responsibility 合约不覆盖方向层。NLAHs 的策略文档不覆盖跨会话的轨迹演化。两者都是优秀的控制层工具，但吸引子（方向层）不在它们的问题域内。

---

## 深层相似性

切入点不同，但底层结构几乎一一对应。这种相似性容易误导人：它说明三者都反对无结构的 AI 使用，但不说明三者在同一层解决问题。

**单一真相源**。OpenProse：`*.prose.md` 是唯一的创作面，编译产物都是派生的。NLAHs：NLAH 文档是 harness 策略的唯一来源，runtime 和 scripts 是执行机制。AGE：`docs/index.md` + `AGENTS.md` 是权威路由，所有其他文档通过它们可达。

**生成与评判分离**。OpenProse：编译期产生 canonicalizer，运行时用确定性函数评判，不用 LLM 评判。NLAHs：NLAH 携带策略，scripts/adapters 携带精确操作，两者分离。AGE：实现和闭包审计必须由不同上下文执行。

**不可变历史**。OpenProse：Receipt chain 是 append-only 的。NLAHs：Artifact 文件在 run 内是 append-only 的。AGE：`docs/logs/` 是 append-only 的，`docs/bugs/` 保留历史记录。

**显式的优先级链**。OpenProse：七条 tenets 有明确的优先级顺序。NLAHs：四层栈（base agent → runtime policy → NLAH → scripts）有明确的职责边界。AGE：Owner 文档有明确的优先级链。

**反氛围编程**。OpenProse：bounded render + postcondition gate + receipt ledger。NLAHs：contract-first completion + evidence-backed answering + file-backed state。AGE：file-in/file-out + 计划触发条件 + 独立审计 + 反偷懒规则。

这些相似性不是三者等价的证据，而是 AI 工程系统的最低入场券。真正的分歧在于失败会在哪里累积：OpenProse 把失败局部化到 responsibility，NLAHs 把失败局部化到 task run，AGE 把失败看作跨会话轨迹的信号。相似的是控制卫生，不同的是控制服务的最终对象：局部正确、策略遵循，还是长期结构方向。

---

## 互补性

OpenProse 和 NLAHs 对 AGE 最有价值的不是“也有一套流程”，而是它们能把 AGE 的部分控制层做得更硬。

OpenProse 可以把已经明确的局部不变量变成精确的变化检测和 postcondition gate。它不能决定哪些长期结构约束值得建模，但一旦 AGE 给出这些约束，OpenProse 可以降低执行成本和误判空间。

NLAHs 的真正价值在于把 harness 变成可消融对象——它能回答“这个流程是否被保留、这个模块是否改变了结果”，但不能回答“保留下来的流程是否把系统带向正确结构”。

AGE 指出的是一个 OpenProse 和 NLAHs 共同预设、却没人回答的问题：谁定义控制目标之间的长期结构关系？没有这个方向层，fixed point 和 policy conformance 都可能稳定地维护错误的系统轨迹。

### 三者的数学关系

OpenProse 的 canonicalizer 为每个 responsibility 定义了一个 fixed point landscape——"输出应该停在哪个不动点上"。NLAHs 的 IHR 为每个 task run 定义了一个 policy conformance space——"执行路径应该遵循什么策略"。AGE 的 attractor 不是抽象赞美词，而是由可观察维度组成：依赖方向是否逆转、原语集合是否膨胀、renderer contract 是否漂移、验证管道是否被绕过、owner-doc 优先级是否仍能裁决冲突、重复 bug 是否被蒸馏为 guardrail。

三者的本体论层次关系见上文"三者的本体论位置"节。一个系统可以所有局部 fixed point 和 policy conformance 都满足，但全局 attractor 结构在漂移——这正是 AGE 存在的理由。

---

## 判断标准：失败发生在哪里

不要先问“我属于哪类场景”，先问失败在哪里积累。

如果失败来自重复计算成本、局部目标反复被不必要地重算，选 OpenProse。它擅长把“已经稳定的责任”冻结成可指纹化的不动点。

如果失败来自 harness 策略不可见、不可迁移、不可消融，选 NLAHs。它擅长把 controller code 里的策略层抽出来，让研究者能比较和拆解流程。

如果失败来自多次局部正确执行之后整体架构漂移，选 AGE。它关心的不是这一次任务有没有做对，而是一百次任务之后系统是否还朝同一个结构回归。

### nop-chaos-flux 为什么选择 AGE

nop-chaos-flux 是一个前端框架/低代码运行时，它的核心挑战不是"如何让 AI 维护 100 个独立的状态"或"如何让 AI 按策略执行单次任务"，而是：

1. 如何在 AI 高速生成代码时保持包依赖方向不被逆转？
2. 如何在频繁重构时保持渲染器合约的一致性？
3. 如何让新加入的 AI session 快速理解当前系统的结构？
4. 如何从历史 bug 中蒸馏出可复用的 guardrails？

这些都是结构性、长期性、过程性问题。OpenProse 的 responsibility 合约可以帮助自动化其中一部分检查，NLAHs 的策略表示可以改进 plan 执行的组织方式。但按其当前抽象，二者不包含方向层原语；若要替代 AGE，必须额外引入 owner-doc precedence、trajectory memory 和 failure distillation，这已经是在引入 AGE 的核心机制。

---

## 差异总结

如果只保留一张表，应该是这张：

| 问题                 | OpenProse                                | NLAHs                                   | AGE                                                  |
| -------------------- | ---------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| **它看见什么失败？** | 局部 responsibility 不再满足 fixed point | 一次 task run 没有按 harness 策略执行   | 多次局部成功后，系统轨迹偏离结构方向                 |
| **它擅长修什么？**   | 重复计算、局部变化检测、可重放决策链     | harness 不可见、不可移植、不可消融      | 架构漂移、测试语义腐蚀、owner-doc 冲突、失败模式复发 |
| **它看不见什么？**   | 为什么这些 responsibility 应该这样组织   | 为什么这个 harness 会把系统带向正确结构 | 单次局部执行的最小成本最优                           |
| **一句话边界**       | 让目标不变                               | 让流程可审查                            | 决定什么才叫偏离                                     |

---

## 结论

OpenProse 回答的是："给定一个需要持续为真的目标，如何用 AI 高效、安全、可审计地维护它？"——微观运行时问题。

NLAHs 回答的是："给定一个 tangled 的 controller code，如何把可复用的 harness 策略外化为可审查、可移植、可消融分析的 NL 文档？"——表示媒介问题。

AGE 回答的是："给定一个在 AI 扰动下持续演化的系统，如何保证它不会偏离稳定结构？"——宏观过程问题。

三者守护的是不同形式化/工程化稳定性语义，甚至不同本体论层次。OpenProse 信任算法（确定性函数、内容寻址、链式验证）来维持不动点；NLAHs 信任可审查的 NL 策略（IHR 解释执行、模块可消融）来维持策略遵循；AGE 信任的不是泛泛流程，而是可审计、可累积、可对抗复核、能把失败沉淀为未来约束的过程。OpenProse 和 NLAHs 在控制层做创新；AGE 在方向层做贡献。

在 nop-chaos-flux 的实践中，AGE 的渐进自动化阶梯已经跑通：62+ bug notes → 8 guardrails → 14 硬门控 + 12 启发性扫描器 + 30+ ESLint 规则。Bug #23（构建产物污染）完整走完了从 bug note 到 CI-blocking 硬门控的 5 级蒸馏。72 个日志文件记录了系统的轨迹，46 个执行计划是局部收敛机制，58 个架构文档的优先级链是 attractor 的载体层。

这些实践在 OpenProse 和 NLAHs 的框架中没有对应物——它们不维护系统的长期收敛结构，不蒸馏跨会话的失败模式，不定义"朝哪里纠正"的最终因。OpenProse/NLAHs 可以承载或执行 AGE 产生的局部规则，但不能从自身产生这些规则之间的方向优先级。它们可以成为控制层执行器，不能替代方向层裁判。

可证伪地说：如果一个项目连续通过 CI、review 和 harness contract，却在 50 次 AI-assisted change 后出现包边界逆转、测试语义耦合和 owner-doc 冲突，那么 OpenProse/NLAHs 的控制层成功了，而 AGE 要处理的问题才刚刚显现。这就是三者的分界线：不是谁更全面，而是谁能看见长期漂移。

控制层能告诉 AI 怎么纠错；方向层决定了什么才叫错。
