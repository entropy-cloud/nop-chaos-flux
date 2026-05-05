# nop-chaos-flux 深度审核提示词手册

> **定位**: 本文档是一份面向 AI 的多维度深度审核提示词集合。每个维度提供一个可复用的“维度正文”，由主 agent 与共享前缀拼接后派发给专用子 agent 执行。
> **前提**: 执行审核前必须先阅读 `docs/index.md`、`AGENTS.md` 和相关架构文档，以当前代码和文档为准。
> **输出格式**: 每个发现按统一格式输出（见附录 A）。

---

## 审核总览

本手册覆盖以下 **20 个审核维度**，分为 6 大类：

| 类别                  | 维度编号 | 维度名称                 | 审核目标                                                                             |
| --------------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------ |
| **A. 架构与模块边界** | 01       | 依赖图与包边界           | 包间依赖是否合规                                                                     |
|                       | 02       | 模块职责与文件边界       | 单一职责、文件大小、入口文件纯度                                                     |
|                       | 03       | API 表面积与契约一致性   | 导出接口是否收敛、是否有多余暴露                                                     |
| **B. 运行时与状态**   | 04       | 状态所有权与单一事实来源 | 双状态、同步链、事实来源冲突                                                         |
|                       | 05       | 响应式订阅精度           | 订阅范围、selector 稳定性、不必要重渲染                                              |
|                       | 06       | 异步模式与取消安全       | AbortController、竞态、并发保护                                                      |
|                       | 07       | 生命周期与副作用归属     | useEffect 职责、runtime vs React 层归属                                              |
|                       | 08       | 验证系统一致性           | 验证时机、owner 归属、隐藏字段策略                                                   |
| **C. 渲染器与 UI**    | 09       | 渲染器契约合规性         | RendererComponentProps 遵循、marker class、避免不必要的 renderer-owned 默认布局/视觉 |
|                       | 10       | 样式系统合规性           | classAliases、stack/hstack、BEM 残留、主题独立性                                     |
|                       | 11       | UI 组件使用合规性        | 原生 HTML 替代、shadcn/ui 集成                                                       |
|                       | 12       | 表单字段与 Slot 建模     | field-metadata 规则、value-or-region、事件字段                                       |
| **D. 工程质量**       | 13       | 类型安全与动态边界       | any 收敛、类型逃逸口、边界类型声明                                                   |
|                       | 14       | 测试覆盖与质量           | 测试边界、setup 膨胀、跨域测试、遗漏路径                                             |
|                       | 15       | 安全与性能红线           | eval/new Function、O(n^2)、不可变更新、观察性                                        |
| **E. 文档与一致性**   | 16       | 文档-代码一致性          | owner 漂移、文档过时、计划状态失真                                                   |
|                       | 17       | 命名与术语一致性         | 双词汇、术语偏离、命名模式不统一                                                     |
|                       | 18       | 跨包模式一致性           | 相同概念在不同包中的实现是否一致                                                     |
| **F. 运行时鲁棒性**   | 19       | 错误传播保真度           | try/catch 语义、错误吞没、错误替换、跨层错误丢失                                     |
|                       | 20       | 可访问性 (WCAG)          | ARIA 属性、键盘可操作性、屏幕阅读器兼容、焦点管理                                    |

---

## 子 Agent 执行模型

### 执行方式

深度审核采用**迭代深挖 + 维度复核 + 风险分层子项复核**模型，分为两个阶段：

#### 阶段一：迭代深挖（每个维度多轮）

每个维度不是单次初审就结束，而是循环执行多轮深挖，直到该维度不再产生新的发现：

1. **第 1 轮（初审）**：派发子 agent 执行该维度的完整审核步骤，产出的发现列表保存到 `docs/analysis/{日期}-deep-audit-{标识}/{维度编号}-{名}.md`。
2. **第 N 轮（追加深挖，N ≥ 2）**：将前 N-1 轮已保存的发现全文作为输入，派发一个新的子 agent，要求它：
   - 读取已保存的全部发现
   - 基于已有发现暴露的文件、模式、关联路径，继续深挖该维度中尚未覆盖的盲区
   - **只输出新发现的条目**（不能重复已有发现）
   - 新发现追加写入同一个维度文件（追加到文件末尾，标注 `## 深挖第 N 轮追加`）
3. **终止条件**：若深挖轮次输出"未发现新的问题"或新发现数量为 0，则该维度的深挖阶段结束。
4. **上限保护**：每个维度的深挖轮次上限为 **5 轮**（含初审），防止无限循环。

#### 阶段二：复核（每个维度独立复核）

深挖阶段结束后，进入复核阶段：

1. **维度复核**：派发一个**独立子 agent**，读取该维度最终完整的发现文件（含所有深挖追加），重新核对 live code / 当前文档，输出"保留 / 降级 / 驳回"的逐条判断。
2. **子项复核（分层）**：维度复核后，再对高风险或不确定的发现项逐项复核；低风险项允许按文件或按模式批量复核。

#### 核心要求

- 复核 agent 不能复用深挖 agent 的结论当作事实，只能把深挖结果当作"待验证线索"。
- 维度复核 agent 与子项复核 agent 都必须回到 live code / 当前文档重新核对。
- 最终汇总报告只能使用"已通过独立复核"的结论，不能直接汇总深挖结果。
- 如果时间有限，可以减少维度数量，但**不能跳过维度复核阶段**。
- 以下条目必须逐项独立复核：`P0/P1`、跨包边界结论、文档-代码违约结论、会驱动实际改代码的结论、以及初审与维度复核意见不一致的条目。
- 以下条目可按文件或同类模式批量复核：纯 `P2/P3`、同一文件中的重复模式、已经有充分代码片段证据且风险较低的机械问题。
- 对于"零发现"的维度（深挖所有轮次均无发现），仍需一个独立复核 agent 复查并明确输出"未发现需报告问题"。

### 调度模式

```
主 Agent（协调者）
  │
  │  ── 阶段一：迭代深挖 ──
  │
  ├── Task → 维度 01 第 1 轮（初审） → 保存到文件
  ├── Task → 维度 01 第 2 轮（追加深挖） → 追加到文件
  ├── ...（直到无新发现或达到 5 轮上限）
  │
  ├── Task → 维度 02 第 1 轮（初审） → 保存到文件
  ├── ...
  │
  │  ── 阶段二：复核 ──
  │
  ├── Task → 维度 01 维度复核（读取完整文件，逐条保留/降级/驳回）
  ├── Task → 维度 01 子项 A 复核（高风险逐条）
  ├── Task → 维度 01 子项 B 批量复核（低风险批量）
  │
  ├── Task → 维度 02 维度复核
  ├── ...
  └── 汇总已复核通过的结果 → summary.md
```

### 调度方法

1. 主 agent 读取本文档，选择要执行的维度。
2. **阶段一 — 迭代深挖**：
   a. 主 agent 用"共享提示词前缀 + 该维度正文"拼接出完整 prompt，派发**第 1 轮（初审）子 agent**。
   b. 初审完成后，将发现保存到 `docs/analysis/{日期}-deep-audit-{标识}/{维度编号}-{名}.md`。
   c. 如果第 1 轮有发现，主 agent 派发**第 2 轮（追加深挖）子 agent**，prompt 中包含：
   - 共享提示词前缀
   - 该维度正文（相同）
   - 已保存发现全文
   - 深挖追加指令（见下文"深挖追加提示词模板"）
     d. 第 2 轮完成后，新发现追加到同一个维度文件（标注 `## 深挖第 2 轮追加`）。
     e. 重复 c-d，直到某轮输出无新发现或达到 5 轮上限。
     f. 如果第 1 轮就无发现，直接进入阶段二维度复核（复核 agent 确认零发现）。
3. **阶段二 — 复核**：
   a. 深挖结束后，主 agent 派发一个**独立的维度复核子 agent**，输入为该维度完整文件（含所有深挖追加），要求它重新读代码与文档，输出"保留 / 降级 / 驳回"的逐条判断。
   b. 维度复核完成后，主 agent 必须对高风险或不确定发现项，再派发**独立的子项复核子 agent**逐项验证；低风险项可按文件或按模式批量复核。
4. 只有在"深挖完成 + 维度复核 + 必要的子项复核"都完成后，该维度结果才允许进入最终汇总。
5. 所有维度完成后，主 agent 汇总**已复核通过**的结果，生成「深度审核汇总报告」（格式见附录 A）。

### 深挖追加提示词模板

从第 2 轮起，主 agent 在维度正文后追加以下内容：

```text
---

## 深挖追加指令（第 N 轮）

以下是本维度前 N-1 轮已保存的全部发现：

[粘贴前 N-1 轮的完整发现文本]

你的任务：

1. 读取上述已有发现，理解本维度已经覆盖了哪些文件、模式和路径。
2. 基于已有发现暴露的文件、模式和关联路径，**继续深挖**本维度中尚未覆盖的盲区：
   - 已有发现涉及的文件是否有同类型问题未被检出？
   - 已有发现的模式是否在其他文件中也存在？
   - 是否有与已有发现相关的、但尚未检查的代码路径？
   - 该维度的执行步骤中是否有尚未充分覆盖的步骤？
3. **只输出新发现的条目**。不要重复已有发现中已经报告的内容。
4. 如果经过仔细检查后确实没有发现新的问题，输出："未发现新的问题。深挖结束。"
5. 每个新发现仍需遵守统一的发现格式（文件路径 + 行号 + 证据片段 + 严重程度 + 现状 + 风险 + 建议）。
```

### 并行策略

- 同批次的**第 1 轮（初审）**可以并行派发。
- 同一维度的**深挖追加轮次**必须串行（每轮依赖前一轮结果）。
- 同一维度的**维度复核**必须在该维度深挖阶段全部结束后进行。
- 同一维度的**子项复核**必须在该维度复核完成后进行。
- **不同维度之间**的深挖、复核可以并行（互不依赖）。

批次之间的初审依赖关系如下：

| 批次   | 维度                   | 可否并行         |
| ------ | ---------------------- | ---------------- |
| 第一批 | 01, 04, 15             | 互相独立，可并行 |
| 第二批 | 05, 06, 09             | 互相独立，可并行 |
| 第三批 | 02, 07, 08, 14         | 互相独立，可并行 |
| 第四批 | 03, 10, 13, 19         | 互相独立，可并行 |
| 第五批 | 11, 12, 16, 17, 18, 20 | 互相独立，可并行 |

> **注意**：同批次内各维度的第 1 轮初审可并行，但每个维度自身的深挖追加轮次是串行的。实际调度时，主 agent 可按批次并行派发各维度第 1 轮，然后对有发现的维度继续串行深挖，最后再并行派发各维度的复核。

### 调度示例

**第 1 轮（初审）并行派发示例**：

```
请用 Task tool 并行派发以下 3 个子 agent：

1. subagent_type="explore", description="维度01: 依赖图与包边界 (第1轮初审)"
   prompt = （共享提示词前缀 + 维度 01 正文）

2. subagent_type="explore", description="维度04: 状态所有权 (第1轮初审)"
   prompt = （共享提示词前缀 + 维度 04 正文）

3. subagent_type="explore", description="维度15: 安全与性能红线 (第1轮初审)"
   prompt = （共享提示词前缀 + 维度 15 正文）
```

**深挖追加轮次示例**（维度 01 第 1 轮有 5 个发现）：

```
维度 01 第 1 轮发现已保存到 docs/analysis/2026-05-05-deep-audit-full/01-dependency-graph.md。
第 1 轮有 5 个发现，继续深挖：

Task(
  subagent_type="explore",
  description="维度01: 依赖图与包边界 (第2轮深挖)",
  prompt = 共享提示词前缀 + 维度 01 正文 + 深挖追加指令（第 2 轮）+ 已有发现全文
)
```

如果第 2 轮有新发现，追加到文件并继续第 3 轮；如果无新发现，深挖结束。

**复核调度示例**（维度 01 深挖结束，共 3 轮 8 个发现）：

```
1. 派发一个独立子 agent 做"维度01整体复核"
   - 输入：维度01完整文件（含 3 轮深挖全部发现）
   - 要求：重新读 live code / 文档，输出逐条"保留 / 降级 / 驳回"清单

2. 对维度01中的高风险或不确定发现，再分别派发独立子 agent
   - 输入：某一条发现全文 + 对应文件路径
   - 要求：只复核这一条，输出"成立 / 降级 / 驳回"与原因

3. 对低风险重复项，可按文件或模式做批量复核
   - 输入：同一文件中的同类发现列表，或同一模式的多条发现
   - 要求：输出逐条保留/降级/驳回结果，不得只给总评

4. 只有通过独立复核的条目才允许进入最终汇总
```

主 Agent（协调者）
├── Task(subagent_type="explore") → 维度 01 初审
├── Task(subagent_type="explore") → 维度 01 维度复核
├── Task(subagent_type="explore") → 维度 01 子项 A 复核
├── Task(subagent_type="explore") → 维度 01 子项 B 复核
├── Task(subagent_type="explore") → 维度 02 初审
├── Task(subagent_type="explore") → 维度 02 维度复核
...
└── Task(subagent_type="explore") → 维度 18 子项 N 复核

```

**调度方法**：

1. 主 agent 读取本文档，选择要执行的维度。
2. 主 agent 用“共享提示词前缀 + 该维度正文”拼接出完整 prompt，先派发**初审子 agent**。
3. 初审完成后，主 agent 必须派发一个**独立的维度复核子 agent**，要求它重新读代码与文档，输出该维度下“保留 / 降级 / 驳回”的判断。
4. 维度复核完成后，主 agent 必须对该维度下的高风险或不确定发现项，再派发**独立的子项复核子 agent**逐项验证；低风险项可按文件或按模式批量复核。
5. 只有在“初审 + 维度复核 + 必要的子项复核”都完成后，该维度结果才允许进入最终汇总。
6. 所有维度完成后，主 agent 汇总**已复核通过**的结果，生成「深度审核汇总报告」（格式见附录 A）。

**并行策略**：

- 同批次的**初审**维度可以并行派发。
- 同一维度的**维度复核**必须在该维度初审完成后进行。
- 同一维度的**子项复核**必须在该维度复核完成后进行。
- 不同维度之间的复核可以并行。

批次之间的初审依赖关系如下：

| 批次   | 维度                   | 可否并行         |
| ------ | ---------------------- | ---------------- |
| 第一批 | 01, 04, 15             | 互相独立，可并行 |
| 第二批 | 05, 06, 09             | 互相独立，可并行 |
| 第三批 | 02, 07, 08, 14         | 互相独立，可并行 |
| 第四批 | 03, 10, 13, 19         | 互相独立，可并行 |
| 第五批 | 11, 12, 16, 17, 18, 20 | 互相独立，可并行 |

**单次调度示例**（主 agent 视角）：

```

请用 Task tool 并行派发以下 3 个子 agent：

1. subagent_type="explore", description="维度01: 依赖图与包边界"
   prompt = （共享提示词前缀 + 下面维度 01 的正文）

2. subagent_type="explore", description="维度04: 状态所有权"
   prompt = （共享提示词前缀 + 下面维度 04 的正文）

3. subagent_type="explore", description="维度15: 安全与性能红线"
   prompt = （共享提示词前缀 + 下面维度 15 的正文）

```

**复核调度示例**（主 agent 视角）：

```

维度 01 初审完成后：

1. 派发一个独立子 agent 做“维度01整体复核”
   - 输入：维度01初审全文
   - 要求：重新读 live code / 文档，输出“保留 / 降级 / 驳回”清单

2. 对维度01中的高风险或不确定发现，再分别派发独立子 agent
   - 输入：某一条发现全文 + 对应文件路径
   - 要求：只复核这一条，输出“成立 / 降级 / 驳回”与原因

3. 对低风险重复项，可按文件或模式做批量复核
   - 输入：同一文件中的同类发现列表，或同一模式的多条发现
   - 要求：输出逐条保留/降级/驳回结果，不得只给总评

4. 只有通过独立复核的条目才允许进入最终汇总

```

### 结果输出与归档

每个维度的初审 + 复核完成后，所有已通过独立复核的结果必须保存到 `docs/analysis/` 目录下的专用子目录中。

**目录结构**：

```

docs/analysis/{year}-{month}-{day}-deep-audit-{简短标识}/
├── 01-dependency-graph.md
├── 02-module-responsibility.md
├── 03-api-surface.md
├── 04-state-ownership.md
├── 05-reactive-precision.md
├── 06-async-safety.md
├── 07-lifecycle.md
├── 08-validation.md
├── 09-renderer-contract.md
├── 10-styling.md
├── 11-ui-components.md
├── 12-field-slot.md
├── 13-type-safety.md
├── 14-test-coverage.md
├── 15-security-performance.md
├── 16-doc-code-consistency.md
├── 17-naming.md
├── 18-cross-package.md
└── summary.md

```

**命名规则**：

- 子目录名格式：`{YYYY}-{MM}-{DD}-deep-audit-{简短标识}`（如 `2026-04-17-deep-audit-full` 或 `2026-04-17-deep-audit-runtime`）
- 每个维度一个 md 文件，文件名格式：`{维度编号}-{英文简短名}.md`
- `summary.md` 保存主 agent 的汇总报告（格式见附录 A）

**要求**：

1. 每个维度文件包含该维度的所有深挖轮次结果 + 复核结论（保留/降级/驳回标注）。文件内部结构为：
   - 第 1 轮（初审）发现
   - `## 深挖第 2 轮追加`（如有）
   - `## 深挖第 N 轮追加`（如有）
   - `## 维度复核结论`（复核子 agent 输出）
   - `## 子项复核结论`（如有逐条复核）
2. 汇总报告必须包含深挖统计（每维度深挖轮次数、每轮发现数）和复核统计（初审总数、保留/降级/驳回数）
3. 同一天的多次审核使用不同的 `{简短标识}` 区分
4. 主 agent 在所有维度完成后，将汇总报告写入 `summary.md`

### 子 Agent 提示词装配结构

下文每个维度给出的内容是**维度正文**，不是可单独复制执行的完整 prompt。主 agent 派发前，必须先拼接共享前缀。

完整 prompt 由两部分组成：

```

1. 共享提示词前缀（固定，所有维度相同）
2. 维度正文（本维度目标 + 必读文档 + 执行步骤 + 额外输出要求）

````

### 共享提示词前缀

主 agent 在派发任一维度前，应先附加以下共享前缀：

```text
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

执行前先阅读：
1. docs/index.md（文档导航基线）
2. AGENTS.md（代码规范、验证命令、agent 工作流）
3. docs/references/deep-audit-calibration-patterns.md（项目特定的误报校准与举证门槛）
4. 本维度列出的 owner 文档

注意：这是一个持续演进中的仓库，很多 domain 包和复杂 host 能力仍在逐步收敛。审核时不要默认所有包都已经完成最终契约收口；要区分“当前真实缺陷”和“尚未完成的实现切片/过渡结构”。

通用审计口径：
1. 以当前代码为准，不以历史日志、已关闭计划或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把“看起来不优雅”当问题，必须有结构性原因或可量化风险。
4. 对低代码动态边界保持克制。any、Record<string, unknown>、动态 schema 对象在边界上可能是合理的。
5. 每个发现必须可定位：文件路径 + 行号范围 + 3-10 行证据片段。
6. 区分已自动化 vs 需人工发现。已被 lint/check 覆盖的问题，只有在“自动化有漏洞”时才报告。
7. 初审输出只是线索，不是最终事实；最终结论必须经过独立复核。
8. 命中 calibration patterns 的候选问题，必须按该文档要求执行 reject / downgrade / require-stronger-evidence 规则，不得跳过。
9. 如果某条发现看起来像历史上的高频误报模式，必须明确写出“为什么这次不是同类误报”。
10. 文件大小规则：>500 行需评估是否拆分，>700 行默认必须拆分。

严重程度判级：
- P0: 当前已构成错误行为、安全违约、核心数据损坏风险、或违反 CI/硬性架构红线。
- P1: 高概率回归、核心契约漂移、跨包边界错误、或会误导后续开发的文档/公开面问题。
- P2: 真实维护成本或局部缺陷，但可排期处理。
- P3: 观察项、中间态风险、或暂不值得立即改动的问题。

如果本维度需要命令输出（如 pnpm check、依赖图、文件行数基线），优先由主 agent 先生成基线，再把结果连同本 prompt 一起提供给你；不要假设你一定能直接运行命令。
````

维护规则：

- 共享方法论、严重程度判级、命令基线策略只维护在“共享提示词前缀”中。
- 项目特定的重复误报模式、降级模式、举证门槛维护在 `docs/references/deep-audit-calibration-patterns.md` 中。
- 各维度正文只保留该维度特有的目标、owner 文档、执行步骤、特例说明和额外输出要求。
- 如果某个维度需要额外约束，只写该维度新增部分，不要重复抄写共享前缀内容。

---

## 通用审计口径

以下口径会嵌入每个子 agent 的提示词中，所有维度的审核员必须遵守。项目特定的误报校准与例外模式不再在此处展开，统一维护在 `docs/references/deep-audit-calibration-patterns.md`：

1. **以当前代码为准**，不以历史日志、已关闭的计划或口头约定为准。
2. **不重复报告已收敛的问题**。如果代码中已按架构规则实现，不再标记为问题。
3. **不把"看起来不优雅"当问题**。必须有结构性原因或可量化风险。
4. **对低代码动态边界保持克制**。`any`、`Record<string, unknown>`、动态 schema 对象在边界上是合理的。
5. **每个发现必须可定位**：文件路径 + 行号范围 + 具体代码片段。
6. **区分已自动化 vs 需人工发现**。已被 lint/check 覆盖的问题只在"自动化有漏洞"时才报告。
7. **所有结论都必须经过独立复核**。初审 agent 的输出只是线索，不是最终事实；维度级结论与每条发现都要由新的独立子 agent 二次核验。
8. **命中 calibration patterns 的候选问题必须按校准文档抬高举证门槛**。没有越过证据门槛时，应驳回或降级，而不是直接进入 remediation backlog。
9. **文件大小限额**。源代码文件超过 **500 行**需要仔细考虑是否要拆分（职责混合、多 owner、入口文件泄露实现）；超过 **700 行**必须拆分。报告时区分"超过 700 行必须拆"和"500-700 行需评估"两档。

**自动化执行工具**：

| 层级    | 工具                                                                                | 阈值                        | 行为                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| CI 脚本 | `pnpm check:oversized-code-files`（源码：`scripts/check-oversized-code-files.mjs`） | 500 行警告 / 700 行报错退出 | 扫描所有 `apps/`、`packages/`、`scripts/`、`tests/` 下 git-tracked 代码文件，>700 行 `process.exit(1)`，>500 行 console.warn |
| ESLint  | `max-lines` 规则（`eslint.config.js`）                                              | 700 行（跳过空行和注释）    | `pnpm lint` 时强制拦截超 700 行文件，作为 CI 二次防线                                                                        |

子 agent 在维度 02 执行前，应先运行 `pnpm check:oversized-code-files` 获取当前超大文件基线，再深入分析每个文件的职责拆分点。

---

## 项目校准说明

项目特定的高频误报模式、降级规则、以及“什么时候仍可保留该发现”的说明，统一维护在 `docs/references/deep-audit-calibration-patterns.md`。

不要再在本文件重复维护第二份“项目背景 + 特例口径”清单，以避免提示词与历史 meta-review 结论继续漂移。

---

## A. 架构与模块边界

### 维度 01：依赖图与包边界

**子 Agent 提示词**：

```
以下为“维度 01”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 01：依赖图与包边界

目标：检查包间依赖是否存在真实的边界问题，例如跨包内部路径导入、循环依赖、`*-core -> *-renderers` 反向依赖、错误的 package manifest，或未被文档/公开契约支撑的私有耦合；不要把 `renderers -> flux-core/flux-formula/flux-runtime` 的公开 API 依赖本身当作问题。

基线要求：如果主 agent 已提供 package 清单、依赖图或 grep 基线，请以该基线为起点；如果未提供，也可自行搜索代码库后继续，但要在结论中说明依赖图是“基于当前搜索重建”还是“基于主 agent 提供基线”。

必读文档：
- AGENTS.md 的 Dependency Flow 章节
- docs/architecture/flux-runtime-module-boundaries.md

执行步骤：

1. 读取所有 packages/*/package.json，提取 dependencies 和 peerDependencies 中所有 @nop-chaos/* 引用。
2. 构建完整的内部依赖图，以文本形式绘制。
3. 对照以下规则逐条检查：
   a. flux-core 不能依赖任何其他 @nop-chaos/* 包
   b. flux-formula 只能依赖 flux-core
   c. flux-runtime 只能依赖 flux-core 和 flux-formula
   d. flux-react 不能依赖任何 renderers 包
   e. renderers 包可以依赖 `flux-react` 以及 `flux-core` / `flux-formula` / `flux-runtime` 的稳定公开 API；应重点检查是否直接依赖这些包的内部模块、私有子路径或形成难以解释的边界耦合
   f. *-core 包不能依赖 *-renderers 包
   g. spreadsheet-core 不能依赖 report-designer-core（反向可以）
   h. ui 可以依赖被明确设计为共享基础设施的 `@nop-chaos/*` 包（例如 `flux-i18n`）；重点检查是否出现未被文档/公开契约支撑的私有耦合、内部子路径依赖，或把本应保持独立的运行时边界硬耦合进 `ui`
   i. tailwind-preset 和 theme-tokens 不依赖任何运行时包
4. 对每个违规或可疑依赖，指出：
   - 哪个包的 package.json
   - 违规的依赖声明
   - 违反了哪条规则
   - 是否存在合理的例外理由（如公开 API、共享 bridge、类型引用、性能/宿主实现需要）
5. 额外检查：是否有 import 语句实际引用了其他包的内部路径（非 index 导出），例如 from '@nop-chaos/flux-runtime/src/internal/xxx'。
6. 检查是否存在循环依赖的迹象（A 导入 B，B 又间接导入 A）。
7. 检查所有包的 exports 字段是否一致（都使用 types + default 双条件导出）。
8. 检查是否有包缺少 tsconfig.build.json 或 build 脚本。

输出格式：

对每个发现：
### [维度01] 简短标题
- **文件**: packages/xxx/package.json
- **严重程度**: P0/P1/P2/P3
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向

最后输出：
1. 完整的依赖图（ASCII art 或文本）
2. 违规清单（按严重程度排序）
3. 合规的包清单
4. 总结评估
```

---

### 维度 02：模块职责与文件边界

**子 Agent 提示词**：

```
以下为“维度 02”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 02：模块职责与文件边界

目标：识别职责混合的超大文件、入口文件泄露实现细节、目录结构混乱等问题。

必读文档：
- docs/architecture/flux-runtime-module-boundaries.md
- AGENTS.md Code Organization 章节

历史教训：本项目曾将 flux-core/src/index.ts(1183行)、flux-core/src/types.ts(904行)、use-spreadsheet-interactions.ts(918行)、table-renderer.tsx(906行) 成功拆分。"在第一轮提取后停下来，不要为了行数继续拆。"

文件大小限额（项目强制规则）：
- 源代码文件超过 **500 行**：需要仔细评估是否应该拆分
- 源代码文件超过 **700 行**：必须拆分，不允许例外
- orchestrator 文件（仅组装子模块调用）可适当放宽，但也应控制在 500 行以内
- 自动化工具：运行 `pnpm check:oversized-code-files` 获取当前超大文件列表（500 行警告 / 700 行报错）
- ESLint 防线：`max-lines: 700` 规则在 `pnpm lint` 时强制拦截超 700 行文件

基线要求：优先使用主 agent 提供的 `pnpm check:oversized-code-files` 输出、文件行数清单或等价基线。如果没有命令基线，也可以先根据代码搜索做结构审查，但必须把所有涉及“>500 行”或“>700 行”的判断标记为“待命令基线确认”，不要把缺少基线时的行数估计写成确定事实。

执行步骤：

1. 运行 `pnpm check:oversized-code-files` 获取当前超大文件基线。
2. 统计所有 packages/*/src/ 下非测试、非 .d.ts 文件的行数。列出超过 300 行的所有文件，按行数降序排列。对超过 500 行的文件标注为"需评估拆分"，超过 700 行的标注为"必须拆分"。
3. 对每个超过 500 行的文件：
    a. 读取文件内容，识别其中的职责边界
    b. 用 "职责 A: 行 X-Y"、"职责 B: 行 Y-Z" 格式标注
    c. 判断哪些职责应该提取为独立模块
    d. 如果文件是 orchestrator（组装调用子模块），标注为可接受（但应控制在 500 行以内）
    e. 如果文件已做过拆分但重新吸入了实现细节，标注为"二次膨胀"
    f. 超过 700 行的文件必须在输出中标注为 P0 或 P1 级别问题
4. 检查每个包的 index.ts：
   a. 是否仅做 re-export（理想情况）
   b. 是否包含具体实现逻辑（应提取）
   c. 导出项数量是否超过 50 个（可能表明包的职责范围过大）
5. 统计每个包 src/ 顶层文件数量，超过 20 个的列出来并建议子目录归组方案。
6. 检查是否存在只有 1-2 个文件的子目录（过度拆分）。
7. 对照 docs/architecture/flux-runtime-module-boundaries.md 的文件所有权映射，检查实际文件是否偏离文档定义。

输出格式：

对每个发现：
### [维度02] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向
- **为什么值得现在做**: 当前 ROI
- **误报排除**: 为什么不是合理的 orchestrator 或动态边界
- **历史模式对应**: 本仓库哪一类高频重构模式

最后输出：
1. 超大文件清单（带职责分析，按 500-700 行"需评估"和 >700 行"必须拆分"两档标注）
2. 入口文件问题清单
3. 目录结构建议
4. 文档-代码偏离清单
5. 若缺少命令基线，单列“待基线确认项”
```

---

### 维度 03：API 表面积与契约一致性

**子 Agent 提示词**：

```
以下为“维度 03”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 03：API 表面积与契约一致性

目标：确保每个包的公开 API 表面积收敛、无多余暴露、跨包契约一致。

必读文档：
- docs/references/renderer-interfaces.md
- docs/references/terminology.md

执行步骤：

1. 读取所有 packages/*/src/index.ts，列出每个包的全部导出项（类型导出 vs 值导出分开列）。
2. 对每个包，检查：
   a. 是否有仅内部使用但被公开导出的函数/类型
   b. 是否有"内部实现泄露到公开 API"的痕迹（如导出了 helper、util、internal 前缀的项）
   c. 导出的类型是否有对应的 JSDoc 或在 docs/references/ 中有文档
   d. 如果导出明显服务于测试共享、过渡迁移、host wiring 或未完成集成，先判断它是否是当前明确支持的公共面，还是仅处于过渡期；不要把“被导出且暂未收口”直接等同于“稳定公共 API 已经错误设计”
3. 检查跨包接口一致性：
   a. RendererComponentProps 在 flux-react 和各 renderers 包中的使用是否一致
   b. ScopeRef 接口在 flux-core 定义和 flux-runtime 实现是否匹配
   c. RendererDefinition 的注册协议在各 renderers 包中是否统一；但只有在当前代码与 owner 文档都表明该包已走 Flux renderer 注册路径时，缺少注册协议才算问题。若该包当前仍是独立 React 页面包或文档明确是 future contract draft，应降级为“待收敛方向”而非直接判违约
   d. FormStoreApi / PageStoreApi 的公开方法是否在文档中有完整描述
4. 检查是否有类型通过 import type 从 A 包导出，又在 B 包 re-export 且添加了不同的约束。
5. 检查 packages/*/src/ 下是否有未被 index.ts 导出的候选未接线文件；只有在确认整个文件没有任何活跃源码引用、没有明确的过渡 owner/计划背景、且不是预留子路径或开发中切片时，才将其定性为"死代码"。
6. 检查 exports map：package.json 的 exports 字段与实际 index.ts 导出是否对齐。

输出格式：

对每个发现：
### [维度03] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向

最后输出每个包的 API 表面积报告 + 问题清单。
```

---

## B. 运行时与状态

### 维度 04：状态所有权与单一事实来源

**子 Agent 提示词**：

```
以下为“维度 04”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 04：状态所有权与单一事实来源

目标：发现双状态（local state + store 维护同一份数据）、props-to-state 同步链、多来源事实冲突。

必读文档：
- docs/architecture/form-validation.md
- docs/architecture/scope-ownership-and-isolation.md

历史教训：ArrayEditor、CheckboxGroup 曾因本地 useState 与 form store 不同步产生 bug。原则："复杂字段不得维护独立本地状态，只从 store 读取。"

执行步骤：

1. 在所有 packages/ 下搜索 useState 声明。对每个 useState：
   a. 判断它维护的数据是否在 form store / scope store / runtime store 中也存在
   b. 检查是否有 useEffect 将 props 或 store 数据同步到这个 state
   c. 检查这个 state 的值是否影响提交/验证/持久化（如果是，则不应是 local state）
2. 搜索 useRef 缓存数据的模式：
   a. ref.current 被用来缓存 store 中已有的数据
   b. ref 被用来做"上一次值"对比，但 store 本身已支持 selector
3. 搜索 useEffect + setState/setXxx 模式（props-to-state 同步链）：
   a. useEffect 依赖中包含 props 并设置本地 state
   b. 这种模式应该改为 derived value（useMemo）或直接从 store selector 读取
4. 检查复杂表单字段渲染器（如 ArrayEditor、CheckboxGroup、TreeSelect 等）：
   a. 是否用 local state 维护了表单值
   b. 是否有"先更新 local state 再同步到 store"的模式（应直接写 store）
5. 检查 Dialog / Drawer / Surface 相关代码：
   a. 打开状态是否同时存在于 local state 和 SurfaceStore
   b. 数据是否在组件 state 和 scope 中双存
6. 检查设计器组件（flow-designer、spreadsheet、report-designer）：
   a. 是否有设计器状态同时在 Zustand store 和 React state 中维护
   b. 选区、缩放、历史记录等状态是否有单一来源

输出格式：

对每个发现：
### [维度04] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向
- **双状态详情**: 哪两份数据在表达同一件事
- **同步失败症状**: 用户可见的故障表现
```

---

### 维度 05：响应式订阅精度

**子 Agent 提示词**：

```
以下为“维度 05”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 05：响应式订阅精度

目标：发现过宽订阅、selector 引用不稳定、不必要重渲染等性能问题。

必读文档：
- docs/architecture/performance-design-requirements.md（P7 per-path subscription）
- docs/architecture/renderer-runtime.md

历史教训：FieldFrame 曾为所有字段订阅 form.values；DialogHost 因数组引用不等导致每次渲染。

执行步骤：

1. 搜索所有 useScopeSelector 调用：
   a. selector 函数返回了什么（单个值 vs 对象 vs 数组）
   b. 如果返回对象/数组，是否每次调用都创建新引用
   c. 是否有 useSyncExternalStore 的 getSnapshot 返回新对象
2. 搜索所有 useSyncExternalStore 调用：
   a. subscribe 和 getSnapshot 是否稳定引用
   b. getSnapshot 是否返回原始 store slice 而非衍生计算
3. 检查 useEffect 依赖项：
   a. 依赖中是否包含大型对象（如 [form.values]、[scope.data]）
   b. 依赖中是否包含每次 render 都新建的引用（如 inline object/array）
4. 检查 Context provider 的 value prop：
   a. 是否每次 render 都创建新对象（违反 react/jsx-no-constructed-context-values）
   b. 特别是 FormContext、ScopeContext、RuntimeContext 等
5. 检查 useFormFieldController 或类似 hook：
   a. 它订阅了多大范围的 form 数据
   b. 是否只订阅了当前字段的路径
   c. 是否支持 per-path subscription（P7 要求）
6. 检查 NodeRenderer / RenderNodes：
   a. 子组件重渲染时父组件是否也被迫重渲染
   b. regions.render() 是否每次返回新 React 元素引用
7. 搜索 useMemo / useCallback 使用：
   a. 是否有 "void useMemo"（返回值未使用）的痕迹
   b. 是否有 React Compiler 已能处理但仍手动 memo 的位置
   c. 是否有缺少 memo 但有明显性能问题的位置

输出格式：

对每个发现：
### [维度05] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **订阅位置**: 具体的 hook 调用位置
- **订阅范围**: 当前订阅了什么
- **实际需要**: 组件实际依赖的数据路径
- **重渲染频率**: 估算不必要重渲染的触发频率
- **建议**: 收窄方向
```

---

### 维度 06：异步模式与取消安全

**子 Agent 提示词**：

```
以下为“维度 06”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 06：异步模式与取消安全

目标：确保所有异步操作都有取消机制、并发保护、竞态防护，且异常不会被静默吞掉。

必读文档：
- docs/architecture/performance-design-requirements.md（P5 AbortController）
- docs/bugs/07-submit-concurrent-guard.md

历史教训：双击 submit 曾触发重复 API 调用；cancelled/disposed boolean 已统一迁移为 AbortController。Promise 链中 `void promise.then(...)` 无 `.catch()` 曾导致数据源永久卡死、表单值静默丢失等难以诊断的缺陷。

执行步骤：

1. 搜索所有 async 函数（packages/ 下，非 test 文件）：
   a. 检查是否有 AbortController / AbortSignal 支持
   b. 检查是否使用了 cancelled / disposed / isMounted 等布尔标记（应迁移到 AbortController）
2. 搜索所有 fetch / API 调用：
   a. 是否有 AbortController 传递
   b. 快速连续触发时（如搜索框输入、快速切换 tab）是否有去抖/取消旧请求机制
   c. 响应到达时是否检查请求是否已过时（stale response guard）
3. 检查 submit 相关代码：
   a. 是否有并发保护（防止双击提交）
   b. submitting 标志是否在方法入口而非仅 UI 层检查
4. 搜索所有 setInterval / setTimeout：
   a. 是否有对应的清理逻辑
   b. 在组件卸载时是否清理
   c. 轮询场景是否支持停止（如 dialog 关闭时停止轮询）
5. 异常吞掉检查（Promise / catch / then 链）：
   a. 搜索所有 `catch (` 和 `catch{` 块：检查 catch 体是否至少做了以下之一——日志输出（console.error/warn）、monitor 上报、rethrow、写入结构化错误状态/返回值。空 catch 体或仅含控制流（return/break/continue）而无任何错误处理的，标记为吞掉异常。
   b. 搜索所有 `void ...then(...)` 模式（fire-and-forget）：检查是否有对应的 `.catch()`。缺少 `.catch()` 意味着 rejection 被静默丢弃。特别注意 `void promise.then(...).finally(...)` —— `.finally()` 不处理 rejection，错误仍会被丢弃。
   c. 搜索所有 `.then(...)` 链（无 `void` 前缀）：检查链尾是否有 `.catch()`。无 `.catch()` 的链如果前面的 promise reject，异常消失。
   d. 搜索所有 `new Promise(executor)`：检查 executor 内部是否有 try-catch 包裹可能抛出的同步逻辑。executor 中的同步异常会导致 promise 永远不 settle（既不 resolve 也不 reject）。
   e. 对每个发现的异常吞掉，评估严重度：
      - **高**：失败导致状态永久卡死（如数据源卡在 fetching、表单提交无反馈）
      - **中**：失败导致 UI 显示陈旧数据（如字段值不更新）
      - **低**：失败影响非关键装饰性功能（如字数统计、可选 UI 特性）
6. 检查 DataSource / ApiDataSource 相关代码：
   a. 轮询场景是否在组件卸载或 dialog 关闭时停止
   b. 缓存失效策略是否有竞态风险
   c. 多个并发请求是否正确处理了 out-of-order 响应
7. 检查设计器的异步操作：
   a. 拖拽、自动保存、远程校验等是否有取消机制
   b. 大文件加载是否有超时和取消

输出格式：

对每个发现：
### [维度06] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **问题类别**: 竞态/取消安全/异常吞掉
- **异步操作**: 具体的异步操作描述
- **竞态场景或吞掉路径**: 竞态类——步骤 1 用户做 X → 步骤 2 在操作完成前用户做 Y → 结果 Z；吞掉类——promise reject 后的传播路径描述
- **用户可见故障**: 用户会看到什么
- **建议**: 防护方案
```

---

### 维度 07：生命周期与副作用归属

**子 Agent 提示词**：

```
以下为“维度 07”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 07：生命周期与副作用归属

目标：确保 useEffect 中的逻辑属于 React 层而非 runtime 层；副作用的生命周期由正确的层级管理。

必读文档：
- docs/architecture/renderer-runtime.md
- docs/bugs/15-setstate-during-render.md

历史教训：RenderNodes 曾在 render 阶段调用 store.setSnapshot()（Bug 15）；DataSource 轮询/缓存/去重曾放在 React effect 中，后移入 flux-runtime。

执行步骤：

1. 搜索所有 useEffect（非 test 文件）：
   a. 按职责分类：数据获取、订阅管理、DOM 操作、状态同步、轮询、缓存管理、定时器、事件监听
   b. 对每个判断：这个职责应该属于 React 层还是 runtime 层
2. 识别 "runtime 逻辑误放在 React effect" 的模式：
   a. useEffect 中管理 AbortController、数据订阅、缓存（应属于 runtime/store）
   b. useEffect 的 cleanup 做了应该是 store dispose 的操作
   c. useEffect 中执行轮询、去重、重试（应属于 runtime DataSource）
3. 检查 useEffect 依赖项正确性：
   a. 是否有遗漏的依赖（exhaustive-deps 未覆盖的）
   b. 是否有不必要的依赖导致 effect 过频执行
   c. 是否有依赖了 ref.current 的情况（ref 变化不触发 effect）
4. 检查 useEffect 中直接修改 Zustand store 的模式：
   a. 是否在 render 阶段调用了 store.setState（Bug 15 教训）
   b. 是否有 "pending buffer" 模式来避免 render 中 setState
5. 检查组件卸载清理：
   a. useEffect cleanup 是否清理了所有副作用
   b. 是否有全局事件监听器在卸载后仍然活跃
   c. 是否有 store 订阅在组件卸载后仍然存在
6. 检查 useLayoutEffect vs useEffect 选择是否合理：
   a. DOM 测量/修改应使用 useLayoutEffect
   b. 数据获取应使用 useEffect
7. 检查 React 19 特有模式：
   a. 是否有可以用 use(promise) + Suspense 替代的数据获取 effect
   b. 是否有可以用 useActionState 替代的表单 effect

输出格式：

按"应迁移到 runtime"和"正确位于 React 层"分类的 effect 清单。

对每个发现：
### [维度07] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **effect 职责**: 一句话描述
- **应归属层级**: React 层 / runtime 层
- **现状**: 当前问题
- **建议**: 修复方向
```

---

### 维度 08：验证系统一致性

**子 Agent 提示词**：

```
以下为“维度 08”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 08：验证系统一致性

目标：确保验证逻辑严格遵守 form-validation.md 定义的架构契约。

必读文档：
- docs/architecture/form-validation.md
- docs/references/form-validation-execution-details.md

执行步骤：

1. 验证所有权检查：
   a. 搜索所有执行验证的代码位置
   b. 对照"验证由最近的 validation-capable scope runtime 拥有"规则
   c. 是否有 React 组件直接触发验证（应通过 FormRuntime / ValidationScopeRuntime）
2. 验证时机检查：
   a. showErrorOn 策略（blur / change / submit）是否正确实现
   b. 是否有字段在不应验证时被验证（如 hidden 字段）
   c. 隐藏字段的验证参与策略是否符合文档规定
3. 验证状态管理：
   a. fieldStates 是否使用 single flat map（true | undefined 模式）
   b. 是否有组件为单个字段维护独立的验证状态（应从 store 订阅）
   c. touched / dirty / visited 状态是否由 FormRuntime 统一管理
4. 异步验证：
   a. 是否有 generation-aware stale run suppression
   b. submit/commit 是否 bypasses debounce
   c. 异步验证的取消机制是否正确
5. 编译时 vs 运行时验证结构：
   a. 验证结构是否优先在编译时确定
   b. 运行时参与是否仅作为补充
6. 验证错误显示：
   a. 错误信息是否从 FormRuntime 读取（而非组件本地 state）
   b. 错误信息是否在 field 级别可订阅（per-path）
   c. 是否存在全局重渲染来显示单个字段错误
7. 跨 scope 验证：
   a. dialog 内表单的验证是否独立于外部表单
   b. 嵌套 scope 的验证传播是否正确

输出格式：

按验证生命周期分类（编译 → 注册 → 触发 → 执行 → 结果展示）。

对每个发现：
### [维度08] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **验证生命周期阶段**: 编译/注册/触发/执行/结果展示
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向
```

---

## C. 渲染器与 UI

### 维度 09：渲染器契约合规性

**子 Agent 提示词**：

```
以下为“维度 09”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 09：渲染器契约合规性

目标：确保所有渲染器组件严格遵循 RendererComponentProps 模式和渲染器样式契约。

必读文档：
- docs/architecture/renderer-runtime.md
- docs/architecture/styling-system.md
- docs/architecture/renderer-markers-and-selectors.md

执行步骤：

1. 读取所有 flux-renderers-*/src/ 下的渲染器组件文件。
2. 对每个渲染器组件检查：
   a. 是否使用 RendererComponentProps<SchemaType> 类型
   b. 数据是否从正确的来源读取：
      - props.props（schema 驱动的值）
      - props.meta（控制状态）
      - props.regions（子渲染句柄）
      - props.events（事件处理器）
      - props.helpers（运行时辅助）
   c. 是否直接访问了 store（应使用标准 hooks）
   d. 是否在组件内部创建了 ad-hoc React context（应使用标准 hooks）
   e. 是否有 prop-drilling chain（应使用 useCurrentForm / useCurrentPage 等 hooks）
3. 检查渲染器注册：
   a. 每个渲染器是否正确导出 RendererDefinition
   b. 注册函数是否遵循 registerXxxRenderers(registry) 模式
   c. field metadata 是否完整定义（type、rules、slots 等）
4. 检查渲染器样式契约：
   a. 根 marker class 是否保持为 `nop-*` 语义标识，而不是把视觉规则绑定到 marker 本身
   b. 是否把本应由 schema、UI 组件 variant 或外部样式控制的默认布局/视觉偷偷固化在 renderer 里；但如果该 renderer 是明确拥有 UI 壳层、层级交互或高性能宿主表面的组件，要允许必要的局部实现样式和动态 style
   c. 是否在渲染器中使用 BEM 命名（__ 分隔符，应改用 data-slot）
   d. className 是否使用 cn() 合并（非 classNames 或模板字符串）
5. 检查本地状态时，区分：
   a. 不合理：与 form/scope/store 并存的字段值镜像、提交流状态双写、owner 状态冲突
   b. 合理：展开态、活动 tab、active variant、hover/selection 等局部 UI/交互状态，只要它们不是第二事实源且与当前 owner 文档一致
6. 检查 data-testid 和 data-cid 是否从 props.meta 正确传递
7. 检查 regions.render() 调用是否正确传递 key
8. 检查事件处理器是否使用 void 返回模式：onClick={(e) => void props.events.onClick?.(e)

输出格式：

对每个渲染器输出合规评分和具体违规项：
### [维度09] 渲染器名: xxx-renderer
- **合规评分**: A/B/C/D（A=完全合规，D=严重违规）
- **违规项**: 列表

对每个违规项：
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **契约条款**: 违反了哪条契约
- **现状**: 当前问题
- **建议**: 修复方向
```

---

### 维度 10：样式系统合规性

**子 Agent 提示词**：

```
以下为“维度 10”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 10：样式系统合规性

目标：确保样式系统严格遵循 styling-system.md 定义的分层契约。

必读文档：
- docs/architecture/styling-system.md
- docs/architecture/theme-compatibility.md
- docs/architecture/report-designer/spreadsheet-canvas-css.md（如有 spreadsheet 相关）

执行步骤：

1. Marker class 检查：
   a. 列出所有渲染器中使用的 nop-* marker class
   b. 检查是否有 marker class 带有隐式视觉样式（应为零样式纯标记）
   c. 检查是否有渲染器使用了非 marker class 作为布局类
2. classAliases 检查：
   a. 搜索所有 classAliases 定义和使用
   b. 检查递归展开是否正确实现
   c. 检查 scope 继承（子是否正确覆盖父）是否正确
   d. 在 playground schema 中检查 classAliases 是否被正确使用
3. 间距约定检查：
   a. 搜索 stack-* / hstack-* 别名的使用
   b. 检查是否有渲染器内部硬编码了 gap / padding / margin
   c. 检查 playground 的 styles-theme-utilities.css 中定义的别名是否覆盖了所有使用场景
4. BEM 残留检查：
   a. 搜索所有 __ 分隔符的 CSS class（如 .nop-button__icon）
   b. 检查是否已迁移为 data-slot / data-* 属性
5. 主题独立性检查：
   a. 是否有组件依赖 React ThemeProvider（应使用 CSS 变量）
   b. 是否有渲染器硬编码了颜色值（应使用 CSS 变量或 Tailwind 语义色）
   c. CSS 变量是否集中在 theme-tokens 包中定义
6. Tailwind 集成检查：
   a. apps/playground/src/styles.css 中的 @source 指令是否覆盖了所有包
   b. 是否有包使用了 Tailwind 类但未被 content scan 覆盖
   c. tailwind-safelist.txt 是否有未使用的条目或缺少的条目
7. Spreadsheet 画布 CSS 特殊规则：
   a. 检查 spreadsheet-renderers 中的 CSS 是否遵循 hybrid 策略
   b. 预定义 ss-* class + inline style + data-* 的组合是否正确
   c. 是否有 spreadsheet 画布区域使用了 Tailwind（不应使用）

输出格式：

按 renderer 分类的样式违规清单。

对每个发现：
### [维度10] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **违规类别**: marker/classAlias/间距/BEM/主题/Tailwind/spreadsheet
- **现状**: 一句话描述
- **建议**: 修复方向
```

---

### 维度 11：UI 组件使用合规性

**子 Agent 提示词**：

```
以下为“维度 11”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 11：UI 组件使用合规性

目标：优先使用 `@nop-chaos/ui`，但只在存在等价 UI 抽象且替换具有明确收益时报告原生 HTML 使用；不要机械把平台原生特例或高性能专用宿主表面判为违规。

必读文档：
- AGENTS.md "MANDATORY: UI Component Usage" 章节

执行步骤：

1. 读取 packages/ui/src/index.ts 获取完整的可用组件列表。
2. 在所有 packages/*/src/ 和 apps/*/src/ 下搜索以下原生 HTML 元素的使用（排除 test 文件）：
   a. <button> → 应使用 <Button>
   b. <input> → 应使用 <Input>
   c. <textarea> → 应使用 <Textarea>
   d. <select>/<option> → 应使用 <Select> 或 <NativeSelect>
   e. <label> → 应使用 <Label>
   f. <dialog> → 应使用 <Dialog>
   g. <table>/<tr>/<td> → 应使用 <Table> 系列
   h. <div role="checkbox"> → 应使用 <Checkbox>
   i. <div role="radio"> → 应使用 <RadioGroup>
   j. <div role="switch"> → 应使用 <Switch>
   k. <input type="range"> → 应使用 <Slider>
   l. <hr> → 应使用 <Separator>
   m. <div role="tooltip"> → 应使用 <Tooltip>
3. 对每个发现的候选项：
   a. 判断是否在渲染器组件中（渲染器中违规优先级更高）
   b. 判断是否在 ui 包本身的内部实现中（ui 包内部使用原生元素是合理的）
   c. 评估替换的可行性和风险
   d. 排除以下合理例外：
      - 浏览器原生能力控件：`input[type=file]`、`input[type=color]`、以及其他 UI 包没有等价能力封装的控件
      - 高性能/强语义宿主表面：如 `spreadsheet-renderers` 内部的 grid、virtualized table、命中测试和编辑层
      - 只有在替换成 `@nop-chaos/ui` 后能明显提升一致性、可访问性或维护性时，才输出为发现
4. 检查 @nop-chaos/ui 的导入模式是否一致（所有导入都从 '@nop-chaos/ui' 统一入口）。
5. 检查是否有包直接依赖了 radix-ui / @base-ui 而不通过 @nop-chaos/ui（ui 包除外）。

输出格式：

原生 HTML 使用清单（排除 ui 包内部实现，并区分合理例外 vs 建议整改）。

对每个发现：
### [维度11] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **原生元素**: 使用的 HTML 元素
- **应替换为**: 对应的 @nop-chaos/ui 组件
- **所在层**: 渲染器/flux-react/其他
- **替换可行性**: 高/中/低
```

---

### 维度 12：表单字段与 Slot 建模

**子 Agent 提示词**：

```
以下为“维度 12”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 12：表单字段与 Slot 建模

目标：确保 field metadata、value-or-region、事件字段等建模严格遵循 field-metadata-slot-modeling.md 的契约。

必读文档：
- docs/architecture/field-metadata-slot-modeling.md
- docs/architecture/field-frame.md

执行步骤：

1. 读取所有渲染器的 RendererDefinition 中的 field metadata。
2. 对每个字段规则检查：
   a. 规则类型（meta / prop / region / value-or-region / event / ignored）是否正确声明
   b. value-or-region 字段的编译器决策逻辑是否正确
   c. event 字段是否被正确识别为函数 props（而非 JSON 值）
3. 检查 deep region extraction：
   a. 嵌套字段（如 table.columns[].label）是否被编译器提取为稳定的 region key
   b. 数组类型的 region 是否正确处理了动态增删
4. 检查 render props 合成：
   a. 是否有 JSON schema 中出现了函数类型的 props（不应存在）
   b. render props 是否都在 renderer adapter layer 中合成
5. 检查 Slot 分类：
   a. field slot（标签、提示、错误）是否通过 FieldFrame 正确渲染
   b. content slot（自定义区域）是否通过 regions.render() 正确渲染
   c. 两种 slot 的数据来源是否隔离
6. 检查 FieldFrame 集成：
   a. 表单字段渲染器是否正确使用 FieldFrame
   b. frameWrap 是否按实例控制（per-instance）
   c. label / hint / error 的渲染是否由 FieldFrame 统一管理
7. 检查 resolveRendererSlotContent 的使用是否正确：
   a. 调用位置是否在渲染器组件中
   b. 返回值是否正确处理（ReactNode vs 空值）

输出格式：

对每个渲染器的 field metadata 审计报告：
### [维度12] 渲染器名: xxx
- **field metadata 完整性**: 完整/部分/缺失
- **违规项**: 列表

对每个违规项：
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **违规类别**: field-rule/value-or-region/event/deep-region/slot/field-frame
- **现状**: 当前问题
- **建议**: 修复方向
```

---

## D. 工程质量

### 维度 13：类型安全与动态边界

**子 Agent 提示词**：

```
以下为“维度 13”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

特别说明：
- 本项目是低代码引擎，any / Record<string, unknown> 在 schema、runtime payload、动态表单值等边界是合理的。
- 不要把"出现 any"本身当成问题，要关注 any 是否导致了真实的运行时错误风险。
- 低代码引擎的核心价值就是动态性，很多"类型擦除"是有意为之的设计，不是缺陷。
- `any` → `unknown` 的机械替换只会增加类型断言噪音，不会提升真正的安全性。

审核维度 13：类型安全与动态边界

目标：识别 any 使用中真正有运行时错误风险的场景，而不是追求"类型纯净"。

必读文档：
- docs/skills/react19-best-practices-review.md "低代码项目例外" 章节

### 低代码项目的类型边界特点（审核员必读）

低代码引擎与传统 TypeScript 应用有本质区别：

1. **Schema 是动态的** - 用户在运行时定义的 schema 本身就是 `unknown` 语义
2. **Host 注入是开放的** - `functions`/`filters` 由宿主环境提供，编译期无法约束
3. **Action 是多态的** - 事件处理链需要处理任意 schema 定义的 action
4. **表达式求值是动态的** - 公式系统天然需要处理任意类型的输入输出
5. **注册表是异构容器** - `RendererDefinition`、`ValidatorMap` 等必须用 existential 擦除

### 不应报告为问题的场景

以下场景的 `any` 是低代码引擎的有意设计，不应报告：

1. **异构容器的 existential 擦除**
   - `RendererDefinition<S>` 的 `component` 被定义为 `ComponentType<RendererComponentProps<any>>`
   - `builtInValidators` 被声明为 `Record<SyncValidationRuleKind, SyncValidator<any>>`
   - 原因：注册表无法在编译期知道所有泛型参数，擦除是唯一合理选择

2. **Host 注入边界的动态函数签名**
   - `RendererEnv.functions?: Record<string, (...args: any[]) => any>`
   - `FormulaFunction` 公开类型 `(...args: any[]) => any`
   - 原因：宿主环境注入的函数无法在引擎编译期约束，改成 `unknown` 只会增加无意义的类型断言

3. **公式/表达式系统的动态输入输出**
   - `evaluateCompiledValue<T>(..., state?: any)`
   - 公式函数的参数和返回值
   - 原因：表达式求值上下文本质上是动态的

4. **多态 Action 的 dispatch 链**
   - `TemplateNode.eventPlans` / `lifecycleActions` 用 `unknown` 保存
   - `helpers.dispatch(action: any)` 的实现签名
   - 原因：Action 是 schema 驱动的多态结构，强类型会导致大量无意义的类型体操

5. **Schema 字段的开放配置**
   - `CodeEditorSchema.expressionConfig?: any`
   - `ChartSchema.series?: any`、`source?: any`
   - 原因：这些配置直接透传给第三方库（CodeMirror、ECharts），引擎无需也无法约束

### 真正应该报告的场景

只有以下场景才值得作为问题报告：

1. **类型断言链过长** - `as unknown as Xxx as Yyy` 这种多重断言，表明类型设计有缺陷
2. **any 导致的运行时错误** - 有证据表明某处 any 导致了实际 bug
3. **内部已有更精确类型但未使用** - 如文件内部定义了 `FooConfig` 但公开字段仍用 `any`
4. **类型擦除导致 API 文档缺失** - 用户无法从类型了解如何使用某个 API

执行步骤：

1. 搜索所有 explicit any 使用（: any, as any, <any>, any[]）：
   a. 按包分组统计 any 使用频率
   b. 对每个 any 判断其合理性：
      - 合理：schema 动态对象、runtime payload、外部数据源返回值、action args、异构容器、Host 注入边界、公式系统
      - 可疑：内部已有更精确类型但未使用、类型断言链过长
      - 危险：有证据表明导致了运行时错误的 any
2. 检查类型断言链：
   a. 是否有 `as unknown as Xxx as Yyy` 这种多重断言
   b. 多重断言是否表明类型设计有缺陷
3. 检查内部已有更精确类型的场景：
   a. 文件内部是否定义了更精确的类型但公开字段仍用 any
   b. 是否可以简单地把公开字段类型改成已有的精确类型
4. 检查 @ts-expect-error 和 @ts-ignore：
   a. 是否有说明注释（eslint 要求）
   b. 注释的原因是否仍然有效
5. 检查 API 文档可读性：
   a. 公开 API 的类型是否足够让用户理解如何使用
   b. 如果类型是 any，是否有 JSDoc 或文档补充说明

注意：不要花时间检查以下内容（它们是低代码引擎的正常设计）：
- 注册表/异构容器的 existential 擦除
- Host 注入边界的动态函数签名
- 公式/表达式系统的输入输出
- 多态 Action 的 dispatch 链
- Schema 字段透传给第三方库的配置

输出格式：

1. any 使用统计（按包分组，每包统计合理/可疑/危险数量）
2. 注意：大部分 any 在低代码引擎中是合理的，只报告真正有问题的场景
3. 可疑/危险项详细清单（预期数量很少）：
### [维度13] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **分类**: 可疑/危险
- **现状**: 当前用法
- **真实风险**: 这个 any 可能导致什么运行时错误
- **建议**: 收敛方案（如有）
- **误报排除**: 说明为什么这不是低代码引擎的正常动态边界
```

---

### 维度 14：测试覆盖与质量

**子 Agent 提示词**：

```
以下为“维度 14”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 14：测试覆盖与质量

目标：评估测试覆盖的完整性、测试质量、以及测试结构是否有利于维护。

必读文档：
- AGENTS.md Testing 章节

执行步骤：

1. 统计每个包的测试文件数量和测试代码行数。列出测试文件数量为 0 的包。
2. 识别测试覆盖缺口：
   a. 列出所有 src/ 下有 .ts/.tsx 实现文件但没有对应 .test.ts/.test.tsx 的模块
   b. 特别关注：runtime 核心、scope 操作、验证逻辑、action 执行器、表达式编译器
3. 对每个超过 400 行的测试文件：
   a. 检查是否包含跨领域测试（应按领域拆分）
   b. 检查 setup 代码是否超过 50 行且未提取为 helper
   c. 检查 describe 嵌套是否超过 3 层
   d. 检查测试之间是否有隐式执行顺序依赖
4. 检查测试隔离性：
   a. 是否有测试依赖全局状态且未在 beforeEach/afterEach 中重置
   b. 是否有 mock 未正确清理
   c. 是否有测试依赖执行顺序
5. 检查测试模式一致性：
   a. 是否所有包都使用 Vitest
   b. mock 模式是否一致（vi.fn() vs jest.fn()）
   c. 测试环境声明是否一致（node vs jsdom）
6. 检查 E2E 测试：
   a. tests/ 目录下的 e2e 测试覆盖了哪些场景
   b. 是否有关键的渲染器/表单/验证场景缺少 e2e 覆盖
7. 检查测试可读性：
   a. 测试描述是否清晰描述了"在什么条件下应该得到什么结果"
   b. 是否有测试名是空的或过于泛化（如 "works correctly"）

输出格式：

1. 测试覆盖统计（按包）
2. 覆盖缺口清单
3. 测试质量问题清单：

### [维度14] 简短标题
- **文件**: packages/xxx/src/yyy.test.ts:行号
- **严重程度**: P0/P1/P2/P3
- **类别**: 覆盖缺口/跨域/setup膨胀/隔离性/一致性/可读性
- **现状**: 一句话描述
- **建议**: 改进方向

4. 优先级排序的测试改进建议
```

---

### 维度 15：安全与性能红线

**子 Agent 提示词**：

```
以下为“维度 15”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 15：安全与性能红线

目标：确保不违反安全红线（eval/new Function）和性能红线（O(n^2)、不可变更新、观察性）。

必读文档：
- docs/architecture/security-design-requirements.md
- docs/architecture/performance-design-requirements.md

执行步骤：

安全部分：
1. 搜索所有 eval( 和 new Function( 使用：
   a. 在 packages/**/src 或 apps/**/src 中出现即为违规（R2 规则）
   b. 检查是否有动态代码生成的替代方案（如表达式编译器）
2. 检查 fail-closed 行为：
   a. 权限检查 / 策略判断在异常时是否默认拒绝（而非默认允许）
   b. 条件分支中的 else / default 是否安全
3. 检查安全敏感边界的假设是否文档化（R5 规则）

性能部分：
4. 搜索 O(n^2) 模式：
   a. 嵌套循环中两个都依赖数据长度
   b. .find() / .filter() 在循环内部调用
   c. Array.indexOf 在大数组上重复调用
   d. 字符串拼接在循环中（大集合场景）
5. 检查不可变更新（P3 规则）：
   a. 是否有直接修改 store state 的情况（应通过 immutable update）
   b. 是否有 sort() / splice() 等原位修改操作
   c. Zustand store 的 set 是否正确使用 immer 或 spread
6. 检查热路径性能（P1 规则）：
   a. 是否有 JSON.stringify 用于变更检测（应使用 revision counter）
   b. 是否有全量数据对比用于渲染决策（应使用 per-path subscription）
7. 检查观察性（P6 规则）：
   a. 性能敏感路径是否有 performance.mark/measure
   b. 错误路径是否有结构化日志
   c. 异步失败是否有 telemetry 支持
8. 检查 React Compiler 兼容性：
   a. 是否有不必要移除 useMemo/useCallback 的情况（必须有 profiling 证据）
   b. startTransition 的使用是否合理（仅用于非紧急更新）
9. 检查虚拟化需求：
   a. 长列表渲染（如 table、select options、tree）是否使用了虚拟化
   b. 大型数据集的渲染是否有 content-visibility 或懒加载

输出格式：

分安全违规和性能违规两部分。

对每个发现：
### [维度15] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **类别**: 安全/性能
- **规则编号**: R2/R3/R5/P1/P3/P5/P6/P7
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向
```

---

## E. 文档与一致性

### 维度 16：文档-代码一致性

**子 Agent 提示词**：

```
以下为“维度 16”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 16：文档-代码一致性

目标：确保架构文档准确反映当前代码状态，没有 owner 漂移或过时描述。

必读文档：
- docs/plans/00-plan-authoring-and-execution-guide.md
- docs/references/maintenance-checklist.md

执行步骤：

1. 读取 docs/architecture/ 下的所有文档。对每个文档：
   a. 识别文档中描述的文件路径、模块名、函数名、类型名
   b. 检查这些路径和名称是否在当前代码库中仍然存在
   c. 检查文档描述的行为是否与当前代码行为一致
2. 重点检查以下文档的准确性：
   a. flux-runtime-module-boundaries.md：文件所有权映射是否与实际文件匹配
   b. renderer-runtime.md：描述的 hooks 和 contexts 是否与 flux-react 导出一致
   c. styling-system.md：描述的 classAliases 机制是否与 flux-core 实现一致
   d. form-validation.md：描述的验证阶段是否与当前实现匹配
3. 检查 docs/references/terminology.md：
   a. 术语定义是否与代码中的实际命名一致
   b. 是否有新增的概念缺少术语定义
4. 检查 docs/plans/ 下的活跃计划：
   a. 状态标记是否与实际代码状态匹配
   b. 是否有标记为 "in progress" 但已完成的计划
   c. 是否有标记为 "completed" 但检查清单未全部通过的计划
   d. Last Reviewed 日期是否在合理范围内
5. 检查 AGENTS.md 中的路由表：
   a. 文档路由表的路径是否都有效
   b. 包结构描述是否与实际包列表匹配
6. 检查 docs/bugs/ 的历史教训：
   a. "Notes For Future Refactors" 中提到的问题是否已解决
   b. 是否有 bug 修复后又重新引入了相同模式

输出格式：

### [维度16] 简短标题
- **文档路径**: docs/xxx.md:行号
- **代码路径**: packages/xxx/src/yyy.ts:行号（如果有对应代码）
- **严重程度**: P0/P1/P2/P3
- **漂移类型**: 路径失效/行为不一致/owner漂移/术语过时/计划状态失真
- **文档描述**: 文档说了什么
- **代码现状**: 代码实际是什么
- **建议**: 更新方向
```

---

### 维度 17：命名与术语一致性

**子 Agent 提示词**：

```
以下为“维度 17”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 17：命名与术语一致性

目标：确保同一概念在代码库中只有一个名称，不存在双词汇问题。

必读文档：
- docs/references/terminology.md
- docs/references/flux-json-conventions.md

执行步骤：

1. 对照 docs/references/terminology.md 检查代码中的命名：
   a. ScopeRef / scope / scopeRef 是否混用
   b. RendererRuntime / runtime / env 是否混用
   c. templateNode / compiledNode / nodeInstance 是否混用（注意：CompiledSchemaNode 已从代码库中移除；所有编译输出都使用 TemplateNode）
   d. FormStoreApi / FormRuntime / form 是否混用
   e. PageStoreApi / PageRuntime / page 是否混用
2. 检查字段命名一致性：
   a. 是否有遗留的 dataPath 字段（注意：dataPath 已从 ActionShapeFields 中移除；DataSourceSchema 使用 name 作为唯一发布标识）
   b. 是否有 items vs itemsSource 双字段问题
   c. 是否有 onClick vs handleClick 命名不一致
3. 检查 JSON schema 约定：
   a. 所有 key 是否为 camelCase
   b. 命名空间扩展是否使用 namespace:suffix 格式
   c. 图标命名是否遵循 kebab-case（config）和 PascalCase（runtime）
4. 检查函数命名模式：
   a. 工厂函数是否统一使用 create* 前缀
   b. 注册函数是否统一使用 register* 前缀
   c. use* 前缀是否仅用于 React hooks
   d. is* / has* 前缀是否仅用于布尔返回值函数
5. 检查文件命名模式：
   a. 同类文件是否使用一致的命名模式（如 *-renderer.tsx vs *.renderer.tsx）
   b. 测试文件是否统一使用 .test.ts / .test.tsx 后缀
   c. 工具文件命名是否一致（utils.ts vs utilities.ts vs helpers.ts）
6. 检查跨包命名一致性：
   a. flow-designer 和 report-designer 中相同概念是否使用相同名称
   b. 各 renderers 包中的注册函数是否遵循相同模式

输出格式：

命名冲突清单 + 统一建议。

对每个发现：
### [维度17] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **冲突名称**: 名称 A vs 名称 B
- **冲突位置**: 两处使用位置
- **统一建议**: 应统一为哪个名称
```

---

### 维度 18：跨包模式一致性

**子 Agent 提示词**：

```
以下为“维度 18”的维度正文。派发时必须与上文“共享提示词前缀”拼接。

审核维度 18：跨包模式一致性

目标：识别跨包之间那些已经造成真实维护成本、契约不一致或重复造轮子的模式分歧；不要为了统一而统一，也不要把可解释的共享复用或不同内部实现手法本身当作问题。

必读文档：
- docs/architecture/flux-design-principles.md
- docs/references/integrating-third-party-components.md

执行步骤：

1. 渲染器注册模式一致性：
   a. 比较所有 flux-renderers-* 包的注册模式
   b. 是否都使用 RendererDefinition[] + registerXxxRenderers
   c. field metadata 定义模式是否一致
   d. 导出结构是否一致
2. Domain core/renderers 分层一致性：
   a. 比较 flow-designer、spreadsheet、report-designer 的分层模式
   b. core 包是否都只包含状态、逻辑、类型（无 React 依赖）
   c. renderers 包是否都只包含 React 组件和适配器
   d. 两层之间的桥接模式是否一致
   e. 若某个 renderer 包本身是被其他 domain 复用的共享包（如 spreadsheet renderer/bridge），则把这种依赖视为公共复用候选，不要机械判为违规
3. Hook 使用模式一致性：
   a. 所有渲染器是否都使用相同的 hook 组合
   b. 表单字段渲染器是否都使用 useFormFieldController 或等价 hook
   c. 事件处理是否都使用 void props.events.xxx?.() 模式
4. 错误处理模式一致性：
   a. 异步操作的错误处理是否使用统一模式
   b. 验证错误是否使用统一的展示路径
   c. 运行时错误是否有统一的日志格式
5. Store 创建模式一致性：
   a. 所有 Zustand store 是否使用相同的创建模式
   b. 是否都使用 vanilla store + use-sync-external-store
   c. dispose/destroy 模式是否一致
6. 国际化 / 文本硬编码一致性：
   a. 用户可见文本是否集中管理（如错误消息、占位符）
   b. 是否有渲染器硬编码了中文/英文字符串

输出格式：

跨包不一致清单 + 统一方向建议。

注意：只有当“不一致”已经导致外部契约混乱、文档-代码不一致、重复维护成本或明显的迁移阻力时才报告。单纯内部实现不同、store 实现不同、bridge 形态不同、或者共享包被其他 domain 复用，本身不构成问题。

对每个发现：
### [维度18] 简短标题
- **涉及包**: 包 A vs 包 B
- **文件**: packages/xxx/src/yyy.ts 和 packages/zzz/src/www.ts
- **严重程度**: P0/P1/P2/P3
- **不一致类别**: 注册模式/分层/hook/错误处理/store/文本
- **包 A 模式**: 描述
- **包 B 模式**: 描述
- **统一建议**: 应统一为哪种模式
```

### 维度 19：错误传播保真度

**子 Agent 提示词**：

```
以下为"维度 19"的维度正文。派发时必须与上文"共享提示词前缀"拼接。

审核维度 19：错误传播保真度

目标：确保错误在跨层传播时不被静默吞没、替换为无关信息、或丢失诊断上下文。

必读文档：
- docs/architecture/flux-runtime-module-boundaries.md
- docs/architecture/action-scope-and-imports.md

执行步骤：

1. Bare catch 审查：
   a. 搜索所有 catch 块（catch {、catch (e) {、.catch(）
   b. 检查是否有 catch 块丢弃原始错误信息（不 re-throw、不保留 cause、返回通用消息）
   c. 特别关注跨包边界上的 catch（adapter、dispatcher、runtime-factory）
   d. 允许的模式：catch + 结构化日志 + re-throw/return with cause
   e. 违规模式：catch + 返回硬编码错误消息（丢失原始 cause）

2. Try/finally 保护审查：
   a. 搜索"保存-修改-恢复"模式（如 prev = x; x = new; ... x = prev）
   b. 检查恢复语句是否在 finally 块中（防止异常路径泄漏状态）
   c. 特别关注全局/模块级状态的临时修改

3. 错误替换审查：
   a. 搜索在 catch 中创建新 Error 但不保留 { cause: originalError } 的模式
   b. 检查错误消息是否包含足够的定位信息（文件、路径、上下文）

4. 诊断禁用审查：
   a. 搜索硬编码的 enabled: false、diagnostics: false、silent: true 等模式
   b. 检查开发模式下这些诊断是否能被启用
   c. 关注编译器、验证器等关键路径的诊断可见性

5. 非抛出型失败的错误计数：
   a. 搜索 retry/backoff 逻辑
   b. 检查 {ok: false} 或 Result.err 类返回是否也被计入失败计数
   c. 检查是否存在"只有 throw 才算失败"的逻辑偏差

输出格式：

对每个发现：
### [维度19] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **类别**: 错误吞没/状态泄漏/错误替换/诊断禁用/计数遗漏
- **证据片段**: 3-10 行代码
- **影响**: 描述在什么场景下会导致问题
- **修复建议**: 简述
```

### 维度 20：可访问性 (WCAG)

**子 Agent 提示词**：

```
以下为"维度 20"的维度正文。派发时必须与上文"共享提示词前缀"拼接。

审核维度 20：可访问性 (WCAG)

目标：确保所有交互式 UI 组件满足 WCAG 2.1 AA 级基本要求（键盘可操作、ARIA 属性正确、屏幕阅读器兼容）。

必读文档：
- docs/architecture/renderer-runtime.md
- packages/ui/src/index.ts（了解可用的无障碍组件）

执行步骤：

1. ARIA 属性完整性：
   a. 所有表单字段是否有 aria-label 或关联的 <Label>
   b. 错误消息是否通过 aria-describedby 关联到对应输入
   c. 必填字段是否有 aria-required="true"
   d. 禁用字段是否有 aria-disabled="true"
   e. 动态内容变更是否使用 aria-live 区域通知

2. 键盘可操作性：
   a. 所有可点击元素是否可通过 Tab 聚焦
   b. 自定义交互组件（tree、drag-drop、condition-builder）是否实现了键盘操作
   c. 模态框/弹出层是否实现了焦点陷阱（focus trap）
   d. Escape 键是否关闭弹出层/模态框

3. 焦点管理：
   a. 动态增删 DOM 元素后焦点是否合理（不能跳到 body）
   b. 表单验证错误后焦点是否移到第一个错误字段
   c. 页面/视图切换后焦点是否设置到合理位置

4. 颜色与对比度：
   a. 错误/警告状态是否不仅依赖颜色（需有图标或文字辅助）
   b. 交互反馈是否有非颜色指示（如 focus ring、underline）

5. 语义化 HTML：
   a. 列表内容是否使用 <ul>/<ol>
   b. 表格数据是否使用 <table> + <th>
   c. 分组内容是否使用 <fieldset> + <legend>
   d. 导航区域是否使用 <nav>

范围限定：
- 重点审查 flux-renderers-form、flux-renderers-form-advanced、flux-renderers-data 中的交互组件
- shadcn/ui 基础组件本身的 a11y 由上游保证，只检查使用方式是否正确
- 不要求所有装饰性元素都有 aria-hidden（这是实现细节）

输出格式：

对每个发现：
### [维度20] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **WCAG 准则**: 如 1.3.1 Info and Relationships / 2.1.1 Keyboard / 4.1.2 Name, Role, Value
- **证据片段**: 3-10 行代码
- **影响**: 哪类用户受影响、在什么场景下
- **修复建议**: 简述
```

---

## 附录 A：统一输出格式

### 单维度发现格式

每个维度的审核结果应按以下格式输出：

````markdown
### [维度NN] 简短标题

- **文件**: `packages/xxx/src/yyy.ts:行号范围`
- **证据片段**:
  ```ts
  // 贴出 3-10 行与结论直接相关的原文
  ```
````

- **严重程度**: P0（必须修）/ P1（应尽快修）/ P2（可排期）/ P3（可观察）
- **现状**: 一句话描述当前问题
- **风险**: 不修复的后果
- **建议**: 一句话描述修复方向
- **为什么值得现在做**: 当前 ROI，而非泛泛说"更优雅"
- **误报排除**: 说明为什么这不是合理 orchestrator、动态边界或刻意保留的兼容层
- **历史模式对应**: 对应到本仓库哪一类高频问题模式
- **参考文档**: 相关架构文档路径
- **复核状态**: `未复核` / `维度复核通过` / `子项复核通过` / `已降级` / `已驳回`

````

补充要求：

- 如果某维度“未发现需报告问题”，也要明确输出“零发现结论”，并说明读过哪些关键代码/文档后得出该判断。
- `证据片段` 必须能直接支撑结论；不要只给总结不给代码。
- 如果某条问题属于同文件中的重复模式，可在保留逐条文件/行号的前提下合并描述，但不能丢失逐条可定位性。

### 汇总报告格式

主 agent 收到所有初审与复核子 agent 的结果后，输出汇总报告：

```markdown
# 深度审核汇总报告

## 审核范围
- 执行的维度：[列表]
- 覆盖的包：[列表]
- 审核日期：YYYY-MM-DD
- 执行方式：每个维度多轮迭代深挖（初审+追加深挖）+ 维度复核 + 若干高风险逐项复核 / 低风险批量复核子 agent，共 N 个子 agent

## 深挖统计
- 维度总数：[N]
- 各维度深挖轮次：维度01=3轮, 维度02=1轮(零发现), ...
- 深挖总轮次：[N]
- 深挖总发现数：[N]（含初审+追加）

## 复核统计
- 深挖发现总数：[N]
- 已独立复核条目数：[N]
- 维度级复核完成数：[N]
- 子项逐条复核数：[N]
- 批量复核覆盖条目数：[N]
- 保留：[N]
- 降级：[N]
- 驳回：[N]

## P0 清单（按文件分组）
[table]

## P1 清单（按文件分组）
[table]

## 高频问题文件（出现在多个维度中的文件）
[table]

## 跨维度模式（多个维度报告的同类问题）
[描述]

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）
[list]

## 建议新增的自动化检查
[list]

## 可暂缓项（有问题但 ROI 暂时不高）
[list]

## 误报排除清单（看起来像问题但不建议动）
[list]
````

---

## 附录 B：执行优先级与并行策略

如果时间有限，建议按以下批次执行维度。同批次的维度互相独立，可以并行派发。

| 批次       | 维度                | 原因                       | 并行度 |
| ---------- | ------------------- | -------------------------- | ------ |
| **第一批** | 01 包边界           | 架构基础，影响所有其他维度 | 3 并行 |
|            | 04 状态所有权       | 历史高频 bug 来源          |        |
|            | 15 安全与性能红线   | 有硬性规则要求             |        |
| **第二批** | 05 订阅精度         | 直接影响用户可感知的性能   | 3 并行 |
|            | 06 异步模式         | 历史高频 bug 来源          |        |
|            | 09 渲染器契约       | 代码量最大，影响面最广     |        |
| **第三批** | 02 模块职责         | 可渐进改进                 | 4 并行 |
|            | 07 生命周期归属     | 架构分层关键               |        |
|            | 08 验证系统         | 复杂度最高的子系统         |        |
|            | 14 测试覆盖         | 质量保障基础               |        |
| **第四批** | 03 API 表面积       | 长期维护性                 | 4 并行 |
|            | 10 样式系统         | 视觉一致性                 |        |
|            | 13 类型安全         | 低代码项目的特殊约束       |        |
|            | 19 错误传播保真度   | 历史最高频对抗性发现       |        |
| **第五批** | 11 UI 组件使用      | 规则简单，可批量修正       | 6 并行 |
|            | 12 字段 Slot 建模   | 专业领域审核               |        |
|            | 16 文档-代码一致性  | 收尾完善                   |        |
|            | 17 命名与术语一致性 | 收尾完善                   |        |
|            | 18 跨包模式一致性   | 收尾完善                   |        |
|            | 20 可访问性 (WCAG)  | 交互质量保障               |        |

---

## 附录 C：执行注意事项

1. **子 agent 类型**: 所有维度使用 `subagent_type="explore"`，因为审核以代码搜索和阅读为主。
2. **派发时必须拼接共享前缀**: 下文维度章节默认只提供“维度正文”；主 agent 派发时必须把“共享提示词前缀 + 维度正文”拼接成完整 prompt。
3. **上下文隔离**: 每个子 agent 有独立的上下文窗口，不需要担心维度之间互相干扰。
4. **独立复核是强制步骤**: 每个维度必须经过“迭代深挖 → 维度复核”；高风险或不确定发现还必须继续做子项复核。
5. **复核 agent 必须独立**: 不能让深挖 agent 自己给自己复核；必须换新的子 agent。
6. **结果汇总**: 主 agent 负责收集所有子 agent 的输出，去重（同一问题可能被多个维度发现），仅汇总已通过独立复核的结果。
7. **增量审核**: 可以只选择部分维度执行，不必每次全量审核。用维度编号指定要执行的维度即可，但选中的维度仍需完整深挖+复核链路。
8. **与现有检查的关系**: 审核发现的机械问题应优先转化为 lint 规则或 check 脚本，而非持续依赖审核。
9. **先读项目校准文档**: 派发前先读取 `docs/references/deep-audit-calibration-patterns.md`；命中其中模式的候选问题，必须按校准要求抬高证据门槛或直接降级/驳回。
10. **结果归档**: 审核结果必须保存到 `docs/analysis/{YYYY}-{MM}-{DD}-deep-audit-{简短标识}/` 子目录中，每个维度一个 md 文件（含所有深挖轮次和复核结论），汇总报告写入 `summary.md`。详见"结果输出与归档"章节。
11. **需要命令基线的维度**: 若某维度依赖 `pnpm check:*`、依赖图、文件行数等命令输出，优先由主 agent 先跑命令并把结果传给子 agent，避免不同子 agent 对工具能力做出不一致假设。
12. **深挖轮次上限**: 每个维度最多 5 轮深挖（含初审），防止无限循环。达到上限后强制进入复核阶段。

---

## 附录 D：快速调度模板

主 agent 可以使用以下模板快速派发子 agent：

### 单维度调度（第 1 轮初审）

```
prompt = 共享提示词前缀 + 维度正文

Task(
  subagent_type="explore",
  description="维度01: 依赖图与包边界 (第1轮初审)",
  prompt=<共享提示词前缀 + 维度 01 正文>
)
```

### 深挖追加轮次调度

```
Task(
  subagent_type="explore",
  description="维度01: 依赖图与包边界 (第N轮深挖)",
  prompt=<共享提示词前缀 + 维度 01 正文 + 深挖追加指令（第 N 轮）+ 已有发现全文>
)
```

### 批量并行调度（第一批第 1 轮初审示例）

```
同时派发 3 个 Task（均为第 1 轮初审）：

Task(
  subagent_type="explore",
  description="维度01: 依赖图与包边界 (第1轮初审)",
  prompt=<共享提示词前缀 + 维度 01 正文>
)

Task(
  subagent_type="explore",
  description="维度04: 状态所有权与单一事实来源 (第1轮初审)",
  prompt=<共享提示词前缀 + 维度 04 正文>
)

Task(
  subagent_type="explore",
  description="维度15: 安全与性能红线 (第1轮初审)",
  prompt=<共享提示词前缀 + 维度 15 正文>
)
```

### 复核调度模板

```text
维度复核：
- 输入：该维度完整文件（含所有深挖轮次发现）
- 要求：重新读取 live code / 当前文档，不把深挖结论当事实；输出保留 / 降级 / 驳回清单，并指出哪些条目需要继续逐项复核

子项逐条复核（用于 P0/P1、高风险、或存在争议的条目）：
- 输入：单条发现全文 + 文件路径 + 行号范围 + 证据片段
- 要求：只复核这一条，输出成立 / 降级 / 驳回与理由

批量复核（用于低风险重复项）：
- 输入：同文件或同模式的一组发现
- 要求：逐条给出保留 / 降级 / 驳回结果，不得只输出总评
```

### 全量调度

```
阶段一（迭代深挖）—— 按 5 个批次顺序派发各维度第 1 轮初审，每批次内并行：
  批次 1: Task(01-R1) + Task(04-R1) + Task(15-R1)
  批次 2: Task(05-R1) + Task(06-R1) + Task(09-R1)
  批次 3: Task(02-R1) + Task(07-R1) + Task(08-R1) + Task(14-R1)
  批次 4: Task(03-R1) + Task(10-R1) + Task(13-R1) + Task(19-R1)
  批次 5: Task(11-R1) + Task(12-R1) + Task(16-R1) + Task(17-R1) + Task(18-R1) + Task(20-R1)

  对有发现的维度，串行追加深挖轮次（Task(NN-R2), Task(NN-R3), ...）直到无新发现。
  零发现维度跳过深挖，直接进入阶段二。

阶段二（复核）—— 各维度深挖结束后并行派发复核：
  各维度: Task(NN-维度复核) → Task(NN-子项复核)* → 写入最终复核结论
```

---

## 附录 E：主 Agent 执行说明

本节为主 agent 提供完整的端到端执行流程。主 agent 在开始审核前应先通读本节。

### 执行流程总览

```
1. 准备阶段
   └─ 读取本文档 + 校准文档 + 创建输出目录

2. 阶段一：迭代深挖（按批次）
   ├─ 批次 1：并行派发 01/04/15 第 1 轮
   │   ├─ 保存结果
   │   ├─ 对有发现的维度：串行追加第 2,3,... 轮深挖
   │   └─ 对零发现维度：标记为"待复核确认"
   ├─ 批次 2：并行派发 05/06/09 第 1 轮 → 同上
   ├─ 批次 3-5：同上
   └─ 全部维度深挖结束

3. 阶段二：复核
   ├─ 并行派发所有维度的维度复核子 agent
   ├─ 收到维度复核结果后：
   │   ├─ 高风险项 → 派发逐条复核子 agent
   │   └─ 低风险项 → 按文件/模式批量复核
   └─ 全部复核完成

4. 汇总阶段
   ├─ 仅汇总"已通过独立复核"的条目
   ├─ 写入 summary.md
   └─ 更新 docs/logs/ 开发日志
```

### 每个维度的详细执行步骤

对每个维度 NN，主 agent 执行以下步骤：

**步骤 1：派发第 1 轮（初审）**

```
Task(
  subagent_type="explore",
  description="维度NN: 名称 (第1轮初审)",
  prompt=<共享提示词前缀 + 维度 NN 正文>
)
```

**步骤 2：保存第 1 轮结果**

将子 agent 返回的发现写入 `docs/analysis/{日期}-deep-audit-{标识}/{NN}-{名}.md`。

**步骤 3：判断是否需要深挖**

- 如果第 1 轮有 ≥1 个发现：进入步骤 4（追加深挖）。
- 如果第 1 轮零发现：跳到步骤 7（维度复核确认零发现）。

**步骤 4：派发第 N 轮（追加深挖，N 从 2 开始）**

```
Task(
  subagent_type="explore",
  description="维度NN: 名称 (第N轮深挖)",
  prompt=<共享提示词前缀 + 维度 NN 正文 + 深挖追加指令（第 N 轮）+ 已有发现全文>
)
```

其中"深挖追加指令"使用本文档"深挖追加提示词模板"章节的模板，替换 N 为实际轮次。

**步骤 5：追加第 N 轮结果**

- 如果子 agent 返回了新发现：追加到同一维度文件末尾（标注 `## 深挖第 N 轮追加`），N 加 1，回到步骤 4。
- 如果子 agent 返回"未发现新的问题"：深挖结束，进入步骤 6。
- 如果 N 已达到 5（上限）：强制结束深挖，进入步骤 6。

**步骤 6：维度复核**

```
Task(
  subagent_type="explore",
  description="维度NN: 维度复核",
  prompt=<读取该维度完整文件，要求重新核对 live code，逐条输出保留/降级/驳回>
)
```

将复核结论追加到维度文件的 `## 维度复核结论` 段落。

**步骤 7：子项复核（分层）**

- P0/P1 及高风险条目：逐条派发独立子 agent 复核。
- P2/P3 低风险同类条目：按文件或模式批量复核。
- 零发现维度：仍需一个复核 agent 确认。

**步骤 8：写入复核结论**

将子项复核结果追加到维度文件的 `## 子项复核结论` 段落。

### 汇总报告生成

所有维度完成后：

1. 扫描每个维度文件的复核结论，仅保留"保留"和"子项复核通过"的条目。
2. 去重：同一问题被多个维度报告时合并，保留最详细的那个。
3. 按附录 A 的汇总报告格式输出，写入 `summary.md`。
4. 汇总报告必须包含"深挖统计"（每维度深挖轮次）和"复核统计"。
