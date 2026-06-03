# 两个 AI 工程方法论的对读：OpenProse 与 AGE

> 相关项目：[OpenProse](https://github.com/openprose/prose)（`@openprose/reactor`）、[AGE 模板](https://github.com/entropy-cloud/attractor-guided-engineering-template)、[nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux)（AGE 的生产级实施实例）
> AGE 方法论系列文章：[Attractor Before Harness](https://mp.weixin.qq.com/s/TwMkUDLNo2-bIrXrfvPqIw)、[从 Spec-Driven Development 到 AGE](https://mp.weixin.qq.com/s/j4dZm1bAK61qB8i5RzHRWA)

---

## 起点：同一个问题，两条路

OpenProse 和 AGE（Attractor-Guided Engineering）都在回答同一个问题：AI 大规模参与软件构建时，如何保证系统的长期一致性？

但切入点完全不同。OpenProse 从**运行时抽象**出发——设计一种让 AI agent 长期维护"持续为真"目标的合约语言和运行引擎。AGE 从**工程过程**出发——设计一种让人类和 AI 协作时系统持续向稳定结构收敛的文档-流程体系。

一个是 runtime，一个是 process。一个是微观的单点正确性，一个是宏观的长期收敛。

---

## Fixed Point ≠ Attractor

两个项目的核心抽象恰好对应两个不同的数学对象，混淆它们会影响后续的理解。

**Fixed Point（不动点）**：`f(x) = x`。系统放在这个点上就不动了。判定条件是严格的等式。不动点可以是稳定的（附近的点向它收敛），也可以是不稳定的（附近的点远离它）。Fixed point 不蕴含 basin of attraction 的概念。

**Attractor（吸引子）**：一个集合（点、极限环、奇怪吸引子），使得周围一个区域（吸引域，basin of attraction）内的所有初始状态都会随时间演化向它收敛。关键性质不是"放上去不动"，而是"从附近出发会被拉回来"。吸引子不必是一个点，可以是一个流形。系统不需要精确到达它——只要在 basin 内，轨迹在收敛就行。

OpenProse 的指纹比对 `fingerprint == fingerprint` 是 fixed point 检测：输出和之前一样吗？一样就不动了。

AGE 的"系统向稳定结构收敛"是 attractor：系统不需要精确到达某个理想状态，只要控制机制持续把它拉回吸引子附近。

一个是状态判定——"到了没有"。一个是过程判定——"方向对不对"。

---

## 两个方法论的前提假设

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

| 维度         | OpenProse                             | AGE                                            |
| ------------ | ------------------------------------- | ---------------------------------------------- |
| 核心问题     | 如何让 AI 持续维护一个为真的目标？    | 如何让系统在 AI 高频扰动下持续向稳定结构收敛？ |
| 问题域       | 单个 responsibility 的生命周期        | 整个仓库的演化轨迹                             |
| 时间尺度     | 单次 render（分钟）到持续 serve（天） | 单次 commit（分钟）到项目演化（月/年）         |
| 稳定性概念   | **Fixed point**——指纹相等即不动       | **Attractor**——在 basin 内即收敛               |
| "对了"的含义 | 输出与期望精确匹配（二值）            | 系统在收敛方向上（方向性）                     |

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

**AGE 的 Attractor** 不是一个对象，是一个结构性质，由三层组成：

- **结构层**：少量高层不变量（如包依赖方向 `flux-core → ... → flux-renderers`、七种原语闭集、编译优先管道）
- **载体层**：承载这些不变量的可审计文档（`docs/architecture/`）
- **实现层**：当前代码中体现这些不变量的部分

Responsibility 是一个**实例**——你可以数出"这个项目有 23 个 responsibility"。Attractor 是一个**性质**——你不能数出"这个项目有 5 个 attractor"，它更像"这个系统的吸引子是一个低维流形"。

### 状态模型

**OpenProse**：每个 responsibility 维护一个 world-model（维护的真值），分为 published（指纹化的、可被下游订阅的）和 workspace（私有草稿、不指纹化的）两部分。每次 render 产生一个 receipt，构成链式可验证的决策历史。

状态变化的核心机制是**不动点检测**：`(contract_fingerprint, input_fingerprints)` 如果没变，render 不执行（零 token 成本）。这是精确的等式判定——`hash == hash`——在问"输出是否已经是一个 fixed point"。

**AGE**：AGE 的"状态"不是单一数据结构，而是三个层面：

1. 代码（实现的瞬时投影）
2. Owner 文档（`docs/architecture/`、`docs/design/` 等，attractor 的载体）
3. 轨迹记忆（`docs/logs/`、`docs/bugs/`、`docs/lessons/`，系统演化的历史）

状态变化的核心机制是**收敛循环**：`typecheck → build → lint → test → audit → log`。这不是在检测"输出是否精确等于期望"，而是在检测"系统是否仍在吸引域内、是否仍在向 attractor 收敛"。一次通过不意味着到达了 attractor——它只意味着当前状态还在 basin 里。

|            | OpenProse                          | AGE                                     |
| ---------- | ---------------------------------- | --------------------------------------- |
| 状态表示   | 内容寻址的 world-model（形式化）   | 代码 + 文档 + 日志（非形式化）          |
| 变化检测   | 确定性指纹函数（canonicalizer）    | CI 命令 + 人工审查                      |
| 历史记录   | Receipt ledger（链式可验证）       | 日志 + Bug Notes + Git history          |
| 稳定性语义 | Fixed point 检测（`hash == hash`） | Attractor 收敛（在 basin 内且方向正确） |

### 组合机制

**OpenProse 的 Forme** 在编译期通过语义匹配自动建立订阅关系：

```
Responsibility A --[### Maintains::facet-x]--> Responsibility B --[### Requires::facet-x]
```

下游只订阅上游的特定 facet（`####` 子声明），facet A 的变化不会唤醒订阅 facet B 的下游。结构即订阅。这是严格的 DAG——无环性作为后置条件强制执行。

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

OpenProse 的 Forme 是数据驱动的自动连线——追求"不用人写依赖关系"。AGE 的路由是语义驱动的手动分层——追求"不用人猜哪个文档说了算"。

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

**AGE** 没有"编译一次然后运行"的分离。验证持续嵌入在每次变更中。稳定性语义是 attractor 收敛：没有"到达终点"的时刻——每次验证只是在检查"是否还在 basin 内、是否还在向 attractor 收敛"。

```
任何代码变更 → typecheck → build → lint → test →
  如果是重大变更 → 写 Plan → 独立审计 → 闭包审计 → 日志记录
```

|                  | OpenProse                      | AGE                              |
| ---------------- | ------------------------------ | -------------------------------- |
| 分离模式         | 编译期 vs 运行期（严格二阶段） | 变更前 vs 变更后（持续循环）     |
| 智能的位置       | 仅在编译期                     | 分散在审计、日志、人工审查中     |
| 运行时的判断能力 | 零（纯确定性）                 | 依赖人工+工具组合                |
| 稳定性语义       | Fixed point（到达即停）        | Attractor 收敛（永远在验证方向） |

### 成本控制

**OpenProse** 的成本 = Σ(变化了的 responsibility 的 render 成本)。如果只有 2/100 个 responsibility 的输入变了，只 render 2 个。局部最优——理论上无法比这更便宜。

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

AGE 明确识别了**自验证陷阱**：AI 从同一上下文生成代码和所有评判材料（类型、测试、文档、完成总结），如果理解有偏差，所有"验证证据"会朝同一个方向偏。对策是强制生成和评判分离——闭包审计必须由新上下文执行。OpenProse 通过编译期冻结确定性函数来绕过同一个问题。

---

## 对"一致性"的理解——Fixed Point vs Attractor

这是两个方法论最深层的分歧点。

**OpenProse 的 fixed-point 一致性**：每个 responsibility 的 render 产出 world-model，通过 canonicalizer 得到指纹。指纹和上次一样，系统"一致"。判定是二值的：相等或不相等，没有"差不多一致"。组合层面，每个 responsibility 都在自己的不动点上，DAG 拓扑正确，则整个系统一致。自底向上，每个局部不动点组合成全局不动点。

**AGE 的 attractor 一致性**：不是二值的。一个系统可以"大部分在 attractor 附近，但某个子系统偏离了"——这不是"不一致"，而是"在 basin 内但偏离中心"。判定标准是方向性的：系统是在向 attractor 收敛，还是在远离？一次 commit 可以通过所有测试（在 basin 内），但如果引入了架构偏移（比如逆转包依赖方向），系统的轨迹就不再向 attractor 收敛了。自顶向下——即使每个模块的测试都通过（每个局部都在不动点），整体仍然可以偏离 attractor。

AGE 的原始论断：_"所有 state-level checks 都能通过，但系统整体在漂移"_。这恰恰是 attractor 概念存在的原因。

这个区分不是术语偏好：

1. Fixed point 方法只能检测"是否精确到达"——对"在收敛方向上但还没到达"和"已经偏离"的区分能力很弱
2. Attractor 方法天然关注轨迹方向——不需要系统精确到达，只需要系统在收敛，而收敛本身就是可持续的
3. Fixed point 在离散状态空间（如 world-model 的指纹）中工作良好；Attractor 在连续状态空间（如架构的演化）中更有表达力
4. 这直接解释了为什么 OpenProse 用 `hash == hash`（离散等式），AGE 用"CI 通过 + 文档一致 + 架构边界完整"（多维收敛信号）

---

## 对 AI 的定位

**OpenProse** 把 AI 建模为一个有界的 render 函数。它接收 (contract, evidence, prior)，产出 (new world-model, receipt)。智能被严格限制在 render 边界内。编译期和运行时的所有决策都是确定性的。AI 的角色是**执行器**。

**AGE** 把 AI 建模为一个高频、高振幅、无持续方向感的扰动。它不是"更快的程序员"——是一种性质不同的力量。因此需要 attractor 来定义"扰动后回到哪里"，需要 harness 来控制"扰动的传播范围"。AI 的角色是**扰动源 + 执行器**（同时被约束和被使用）。

---

## 对文档的理解

**OpenProse**：`*.prose.md` 不是关于代码的文档——它就是程序。编译后的 IR、投影、receipt 都是派生物。如果任何东西与 Markdown 不一致，Markdown 是对的。没有第二个创作面。

**AGE**：文档不是 attractor 本身，也不是代码的附属品。它是 attractor 的**载体层**。Attractor 是抽象的结构性质；载体层是使其可审计、可版本化、可路由的具体文档。代码是 attractor 的**瞬时投影**——它可能部分正确、部分偏离，但载体层定义了它应该回到哪里。

OpenProse 把文档视为程序本身（单一创作面）。AGE 把文档视为结构性质的载体（代码和文档是 attractor 的两种不同投影）。

---

## 失败处理

**OpenProse**：失败产生一个 `failed` receipt，包含失败原因和 token 成本。Tenet 4："Fail safe. Under uncertainty, escalate or stop rather than act." Receipt chain 保证即使失败也有可审计的记录。失败处理是**即时和个体的**——每个 render 独立记录失败。

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

## 一个思想实验：如果用 OpenProse 管理 nop-chaos-flux

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

AGE 的 owner-doc 系统处理这些问题，OpenProse 的 responsibility 合约不覆盖。

---

## 深层相似性

切入角度不同，但底层结构几乎一一对应。

**单一真相源**。OpenProse：`*.prose.md` 是唯一的创作面，编译产物都是派生的。AGE：`docs/index.md` + `AGENTS.md` 是权威路由，所有其他文档通过它们可达。

**生成与评判分离**。OpenProse：编译期产生 canonicalizer，运行时用确定性函数评判，不用 LLM 评判。AGE：实现和闭包审计必须由不同上下文执行。

**不可变历史**。OpenProse：Receipt chain 是 append-only 的。AGE：`docs/logs/` 是 append-only 的，`docs/bugs/` 保留历史记录。

**显式的优先级链**。OpenProse：七条 tenets 有明确的优先级顺序。AGE：Owner 文档有明确的优先级链。

**反氛围编程**。OpenProse：bounded render + postcondition gate + receipt ledger。AGE：file-in/file-out + 计划触发条件 + 独立审计 + 反偷懒规则。

---

## 互补性

### OpenProse 能为 AGE 补充什么

1. **运行时精确的变化检测**：AGE 的变化检测依赖人工判断和 CI 命令。如果把架构不变量建模为 responsibility，变化检测可以精确到指纹级别。
2. **自动化的后置条件验证**：AGE 的验证主要是过程性的（审查、审计）。OpenProse 的 postcondition gate 提供了一种可自动化的验证机制。
3. **精确的成本追踪**：OpenProse 的 receipt 系统记录了每次决策的 token 成本。AGE 没有这种精确度。
4. **语义连线自动化**：Forme 的自动订阅匹配可以替代 AGE 中的手动文档路由。

### AGE 能为 OpenProse 补充什么

1. **Attractor 的显式建模**：OpenProse 的 responsibility 是一个独立的计算单元，但它没有回答"这些 responsibility 的结构应该是什么"。AGE 的三层 attractor 模型提供了这个元层。
2. **轨迹级别的长期一致性**：OpenProse 的 postcondition 保证的是 fixed point——每次 render 输出精确满足条件。但一百次 render 后，responsibility 之间的结构关系可能已经漂移了（比如一个 responsibility 的 Maintains 的语义悄悄变了）。AGE 的 trajectory 概念直接处理这个问题——关注的不是单点精确，而是长期收敛方向。
3. **工程过程的制度化**：OpenProse 假设合约已经写好了。谁来写？如何评审？何时修改？AGE 的计划系统、审计系统、触发条件提供了这些过程层面的保障。
4. **失败模式的蒸馏**：OpenProse 记录失败但不蒸馏模式。AGE 的 guardrails 蒸馏机制提供了一种渐进式质量提升路径，nop-chaos-flux 的实践证明这条路径可落地——62+ bug notes 中蒸馏出的 8 条 guardrails，已经催生了 14 个硬门控脚本、12 个启发性扫描器和 30+ 条 ESLint 规则。这不是理论设想，是已经在 CI 中运行的代码。

### 两者的数学关系

OpenProse 的 canonicalizer 为每个 responsibility 定义了一个 fixed point landscape——"输出应该停在哪个不动点上"。AGE 的 attractor 定义了一个更高维的收敛结构——"所有这些不动点的配置本身应该向什么结构收敛"。前者是局部稳定，后者是全局稳定。

一个系统可以所有局部 fixed point 都满足，但全局 attractor 结构在漂移——这正是 AGE 存在的理由。

---

## 适用场景

### OpenProse 更合适的场景

- AI agent 是主要执行者，且任务可以分解为独立维护的持续目标
- 变化检测需要运行时精确（成本敏感场景）
- 合约之间有明确的订阅关系（数据流驱动的系统）
- 需要可审计的决策链（合规敏感场景）
- 系统可以在编译期冻结大量判断逻辑

典型场景：持续监控、自动化运维、知识库维护、CI/CD 管道编排。

### AGE 更合适的场景

- 人类和 AI 混合执行，且系统需要长期演化
- 架构一致性比单个功能正确性更重要（大型应用开发）
- 变化检测主要在结构层面（不是数据变化，而是架构漂移）
- 团队需要共享的结构化知识（不只是 AI 可读的合约）
- 失败模式需要被蒸馏和积累（持续改进场景）

典型场景：企业应用开发、框架/平台开发、长期演化的产品线、多人协作的大型项目。

### nop-chaos-flux 为什么选择 AGE

nop-chaos-flux 是一个前端框架/低代码运行时，它的核心挑战不是"如何让 AI 维护 100 个独立的状态"，而是：

1. 如何在 AI 高速生成代码时保持包依赖方向不被逆转？
2. 如何在频繁重构时保持渲染器合约的一致性？
3. 如何让新加入的 AI session 快速理解当前系统的结构？
4. 如何从历史 bug 中蒸馏出可复用的 guardrails？

这些都是结构性、长期性、过程性问题。OpenProse 的 responsibility 合约可以帮助自动化其中一部分检查，但无法替代 AGE 的过程保障层。

---

## 差异总结

| 维度             | OpenProse                                     | AGE                                        |
| ---------------- | --------------------------------------------- | ------------------------------------------ |
| **核心隐喻**     | React（render、memo、props）                  | 动力系统（attractor、trajectory、basin）   |
| **稳定性数学**   | **Fixed point**（`f(x) = x`，指纹相等即不动） | **Attractor**（在 basin 内且向吸引子收敛） |
| **"对了"的含义** | 输出与期望精确匹配（二值判定）                | 系统在收敛方向上（方向性判定）             |
| **建模对象**     | 持续为真的责任                                | 系统演化的轨迹                             |
| **最小原语**     | Responsibility（实例）                        | Attractor（性质）                          |
| **状态模型**     | 内容寻址 world-model                          | 代码 + 文档 + 日志                         |
| **变化检测**     | 确定性指纹函数                                | CI + 人工审查                              |
| **组合机制**     | Forme（自动 DAG）                             | Owner-doc 路由（语义分层）                 |
| **编译/运行**    | 严格二阶段                                    | 持续循环                                   |
| **成本控制**     | 精确 memoization                              | 计划触发条件                               |
| **信任模型**     | 算法信任（指纹 + 链验证）                     | 社会信任（独立审查 + 流程保障）            |
| **对 AI 的定位** | Bounded render 函数                           | 高频高振幅扰动源                           |
| **文档角色**     | 程序本身（唯一创作面）                        | Attractor 载体（代码的元层）               |
| **失败处理**     | 即时个体（failed receipt）                    | 累积演化（guardrails 蒸馏）                |
| **时间尺度**     | render 级（分钟到天）                         | 项目级（天到年）                           |
| **形式化程度**   | 高                                            | 中低                                       |
| **适用规模**     | 可分解为独立责任的系统                        | 需要整体结构一致性的系统                   |

---

## 结论

OpenProse 回答的是："给定一个需要持续为真的目标，如何用 AI 高效、安全、可审计地维护它？"——微观运行时问题。

AGE 回答的是："给定一个在 AI 扰动下持续演化的系统，如何保证它不会偏离稳定结构？"——宏观过程问题。

两者守护的是一致性的不同数学性质。OpenProse 信任算法（确定性函数、内容寻址、链式验证）来检测不动点；AGE 信任过程（分层审查、独立审计、失败蒸馏）来维持收敛轨迹。

在 nop-chaos-flux 的实践中，AGE 的渐进自动化阶梯已经跑通：62+ bug notes → 8 guardrails → 14 硬门控 + 12 启发性扫描器 + 30+ ESLint 规则。Bug #23（构建产物污染）完整走完了从 bug note 到 CI-blocking 硬门控的 5 级蒸馏。72 个日志文件记录了系统的轨迹，46 个执行计划是局部收敛机制，58 个架构文档的优先级链是 attractor 的载体层。

这些实践在 OpenProse 的框架中没有对应物——它们不维护任何"持续为真"的合约，而是维护系统整体的结构性质。反过来，OpenProse 的精确 memoization、内容寻址 receipt、自动 Forme 连线在 AGE 中也没有对应物。

两者都认识到 AI 辅助开发的核心挑战不是"让 AI 生成正确的代码"，而是"在 AI 持续参与下保持系统的长期一致性"。不同在于用什么语言描述这个问题、在什么抽象层级解决它、以及信任什么类型的验证。
