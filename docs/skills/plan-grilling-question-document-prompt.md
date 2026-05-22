# 计划盘问问题文档提示词

> **定位**: 这不是一问一答式访谈，也不是开放式散文讨论；它用于围绕一个计划、方案、架构方向或关键设计决策，一次性生成一份高价值问题文档。文档中的每个问题都附带推荐答案、可选项、影响分析，方便用户直接选择。
> **前提**: 执行前必须先阅读 `docs/index.md`、`AGENTS.md`、目标 area 的 owner 文档；如果输入对象是 `docs/plans/*.md`，还必须先阅读 `docs/plans/00-plan-authoring-and-execution-guide.md`；如果问题与历史反复 reopened 的设计判断相似，还必须回查 `docs/references/reopened-design-decisions-and-audit-adjudications.md`。
> **适用场景**: 需要把模糊计划压缩成“用户可选择的问题清单”，需要一次性暴露关键分支、术语冲突、owner 边界、迁移代价、验证方式，而不希望进入长回合问答。

---

## 产物定位

本提示词的产物是**决策前分析输入**，不是 active contract，也不是执行计划本身。

因此默认保存到 `docs/analysis/`，而不是 `docs/discussions/`：

1. `docs/analysis/` 适合 investigatory / decision-oriented 报告，本提示词产物本质上就是“供选择的决策问题包”。
2. `docs/discussions/` 更适合保留多轮对话过程与修正历史；本提示词目标恰恰是把对话压缩成一个可选问题文档。
3. 只有在用户明确要求保留逐轮需求演进记录时，才应改走 `docs/discussions/`。

---

## 输出落盘规则

结果必须落盘到 `docs/analysis/`，不允许只停留在对话输出里。

默认使用**单文件**，不新建目录：

- `docs/analysis/YYYY-MM-DD-plan-grilling-questions-<short-tag>.md`

规则：

1. 文件名必须带 `YYYY-MM-DD` 日期前缀。
2. `<short-tag>` 使用英文 kebab-case，概括本次 plan / decision 主题。
3. 同一天多次执行时，必须通过 `<short-tag>` 或递增后缀区分，不能覆盖旧文件。
4. 最终回复时必须给出保存路径。
5. 只有在一次执行需要保存多份中间稿、分主题子文档或复核稿时，才升级为目录结构。

---

## 适用范围

优先用于以下问题：

1. 审查一个 `docs/plans/*.md`，想知道哪些关键决策还没说透。
2. 审查一个架构方向，想把讨论收束成“用户只需要做选择”的问题包。
3. 某个方案已经有直觉方向，但仍存在术语冲突、owner 边界不清、迁移策略不确定、验证方式含糊。
4. 需要把散乱的 reviewer concern 整理成一个结构化 decision questionnaire。

不适用于以下场景：

1. 明确的 bug 诊断。
2. 已经收敛到直接改代码，只需要执行。
3. 需要保留完整多轮讨论过程与误解修正历史。

---

## 核心原则

1. 问题文档的目标不是“把所有能问的都问一遍”，而是只保留**会改变设计结果**的问题。
2. 每个问题必须满足至少一项：
   - 不同答案会改变架构边界
   - 不同答案会改变执行顺序
   - 不同答案会改变验证 / 测试策略
   - 当前 owner docs 与 live code 存在冲突或张力
   - 当前术语含糊，继续推进会制造 drift
3. 不要收集低价值问题，例如纯风格偏好、对最终行为无影响的命名喜好、已经被 owner doc 明确裁定且 live code 也一致的小问题。
4. 如果一个问题可以通过查 owner docs 或 live code 直接回答，就不要把它留给用户选择；先自行查清，再只保留真正的 unresolved branch。
5. 不要把“开放式 brainstorming”伪装成问题清单；每个问题都必须附带推荐答案。

---

## 仓库特定前置要求

执行时必须遵守以下仓库口径：

1. 先从 `docs/index.md` 找到最小 owner doc，再开始组织问题。
2. 如果输入对象是某个 plan，必须对照 `docs/plans/00-plan-authoring-and-execution-guide.md`，优先识别 closure 语义、scope、proof、owner-doc obligation 是否缺失。
3. 如果输入对象涉及 architecture / component baseline，必须把 live code 与 owner doc 对照，不能只围绕计划文本提问。
4. 如果某个 candidate question 本质上已经被 `docs/references/reopened-design-decisions-and-audit-adjudications.md` 明确裁定，默认不再保留为用户选择题；除非当前 live case 已越过原裁定边界。
5. 低代码框架中的动态边界、runtime orchestrator、compiler/runtime/react/renderer 分层有必要复杂度，不要机械把“复杂”转写成问题。

---

## 问题类型

优先从以下类型里挑选最关键的 5-15 个问题，不要求全部覆盖：

1. **术语与概念问题**
   - 一个词是否同时指代了两个不同概念？
   - 当前 plan 是否用了 owner docs 中不存在或冲突的词？

2. **Owner 与边界问题**
   - 某个行为究竟属于 compiler、runtime、React integration、renderer、designer shell、host，还是 application 侧？
   - 某个状态、生命周期或验证语义应由谁拥有？

3. **Contract 与 authoring surface 问题**
   - 不同选择会不会改变 schema / JSON / props / public API / command surface？
   - 这个方案是否要求新增字段、复用旧字段，还是 lowering 到既有 contract？

4. **迁移与兼容问题**
   - 是一次性切换、局部 lowering，还是阶段性迁移？
   - 是否需要兼容层？兼容层是否会污染主路径？

5. **执行与验证问题**
   - 哪种答案会改变计划 phase 划分、proof obligations、focused tests 或 doc update obligations？

6. **代码-文档冲突问题**
   - plan 说的是 A，但 owner doc / live code 实际更像 B；必须逼用户选定哪一个才是目标 baseline。

---

## 每个问题必须包含的字段

每个问题必须按以下结构输出：

1. **Question**
   - 用一句话写出真正需要用户选择的决策点。

2. **Why this matters**
   - 说明这个问题为什么会改变方案成立方式，而不是可有可无的补充问题。

3. **Evidence**
   - 引用 owner docs、plan 内容、live code 路径或历史 adjudication，说明为什么这个问题现在是 unresolved。

4. **Recommended answer**
   - 明确给出最推荐的答案，不能含糊。

5. **Options**
   - 列出 2-5 个可选项。
   - 如果某个选项实际上不成立，也可以保留，但必须明确标为不推荐。

6. **Consequences**
   - 逐项说明每个选项的后果：会改变什么边界、实现顺序、文档义务、测试义务、迁移成本。

7. **Dependencies**
   - 说明这个问题依赖或影响了哪些其他问题。

8. **Default if no choice**
   - 如果用户未选择，默认应按什么走，以及为什么。

---

## 输出结构

推荐保存为以下结构：

```text
# Plan Grilling Questions

## Scope
- 本次审查对象
- 已阅读的 owner docs / plans / code paths

## Decision Summary
- 本次最关键的 3-7 个决策点摘要

## Questions

### Q1. <标题>
- Question:
- Why this matters:
- Evidence:
- Recommended answer:
- Options:
- Consequences:
- Dependencies:
- Default if no choice:

## Recommended Path
- 如果用户按推荐答案一路选择，方案将如何收敛

## Excluded Questions
- 看起来像问题、但不应留给用户选择的点及原因
```

---

## 输出限制

1. 不要进入一问一答模式。
2. 不要把可以从文档或代码直接确认的事实问题留给用户选。
3. 不要把问题写成空泛哲学问句；必须是能驱动具体决策的分支问题。
4. 不要只给推荐答案，不给备选项和后果。
5. 不要为了完整性凑 20+ 个问题；宁可少，但必须高价值。
6. 不要把已经被 owner docs 充分裁定、且当前 live code 一致的问题再次包装成“待用户选择”。
7. 不要把 discussion transcript 写进该文档；它是问题包，不是逐轮聊天记录。

---

## 可直接复用的提示词正文

```text
请围绕当前 nop-chaos-flux 仓库中的目标 plan / 方案 / 架构方向，生成一份“计划盘问问题文档”。

目标不是一问一答地继续追问，而是一次性生成一个高价值问题包，供用户直接选择。

执行前先阅读：
1. docs/index.md
2. AGENTS.md
3. 目标 area 的 owner docs
4. 如果输入对象是 docs/plans/*.md，再读 docs/plans/00-plan-authoring-and-execution-guide.md
5. 如命中历史反复 reopened 的设计判断，再读 docs/references/reopened-design-decisions-and-audit-adjudications.md
6. 必要时核对相关 live code

关键要求：
1. 只保留会改变设计结果的问题；不要收集低价值补充问题。
2. 如果某个问题可以通过读 owner docs 或 code 直接回答，就不要留给用户选择。
3. 每个问题都必须附带：Why this matters、Evidence、Recommended answer、Options、Consequences、Dependencies、Default if no choice。
4. 推荐答案必须明确，不能模糊。
5. 产物必须落盘到 docs/analysis/YYYY-MM-DD-plan-grilling-questions-<short-tag>.md。
6. 这不是 discussion transcript；不要写成逐轮对话。

请按以下结构输出并保存：

# Plan Grilling Questions

## Scope
- 本次审查对象
- 已阅读的 docs / code 范围

## Decision Summary
- 本次最关键的 3-7 个决策点摘要

## Questions

### Q1. <标题>
- Question:
- Why this matters:
- Evidence:
- Recommended answer:
- Options:
- Consequences:
- Dependencies:
- Default if no choice:

### Q2. <标题>
...

## Recommended Path
- 如果用户按推荐答案一路选择，方案会如何收敛

## Excluded Questions
- 哪些看起来像问题、但经审查不应留给用户选择，以及原因
```
