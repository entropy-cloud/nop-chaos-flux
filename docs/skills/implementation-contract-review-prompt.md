# Implementation Contract Review Prompt

> **定位**: 这不是 plan audit、也不是 diff review。它用于检查一个高层需求、设计方向、analysis 或 plan，是否已经被压缩成了足够可执行、可测试、可验收的 implementation contract。
> **前提**: 执行前必须先阅读 `docs/index.md`、`AGENTS.md`、相关 owner docs；如果输入对象是 `docs/plans/*.md`，还必须先阅读 `docs/plans/00-plan-authoring-and-execution-guide.md`。
> **适用场景**: 用户故事、架构方向、analysis 结论或 plan 已经大致成立，但开始编码前仍存在“到底这一轮算做完了什么”的不确定性；或 review 发现文本很完整，但 closure-critical behavior、proof obligations、failure modes 仍然发虚。

---

## 与相邻提示词的区别

1. **不是 `plan-grilling-question-document-prompt.md`**
   那个提示词用于把 unresolved branch 暴露成用户可选择的问题包。
   本提示词用于在主要方向已基本确定后，检查“执行契约是否已经足够具体”。

2. **不是 `diff-standards-and-spec-review-prompt.md`**
   那个提示词用于 review 已产生的 diff。
   本提示词发生在实现前或实现中前段，目标是减少“看起来很清楚，其实做起来会跑偏”的 contract drift。

3. **不是 plan audit 的替代**
   plan audit 看 scope honesty、hidden dependency、closure gate 真假。
   implementation contract review 更窄，重点只看：行为定义、完成定义、失败路径、proof relation 是否足够落地。

---

## 核心问题

执行这份提示词时，集中回答下面五个问题：

1. 当前文本是否清楚定义了本轮**具体会落地什么行为**，而不是只给了方向性表述？
2. 当前文本是否清楚定义了**什么算完成**，而不是只给了命令门禁或主观感觉？
3. 当前文本是否覆盖了关键**失败路径 / 边界情况 / 不做什么**？
4. 当前文本是否把每个关键行为和对应的**proof obligation** 绑在一起？
5. 当前文本是否仍把过多判断留给实现者临场决定，从而容易造成 drift？

---

## 适用输入

以下输入都可以作为 review 对象：

1. `docs/plans/*.md`
2. `docs/analysis/*.md`
3. `docs/architecture/*.md` 或 `docs/components/*/design.md` 中准备直接驱动实现的小节
4. 用户给出的 feature outline / sprint outline / task brief

当输入对象不是正式 plan 时，也可以执行本提示词；但要明确写出：`no formal plan yet`。

---

## 必读材料

至少阅读：

1. `docs/index.md`
2. `AGENTS.md`
3. 相关 owner docs
4. 若输入对象是 `docs/plans/*.md`：`docs/plans/00-plan-authoring-and-execution-guide.md`
5. 若输入对象涉及 renderer / UX surface：`docs/architecture/renderer-runtime.md`、相关 component design doc

必要时补读：

1. 当前 live code
2. 相关测试
3. 最近的 bug note / analysis / log

---

## 审查维度

### 1. Result Surface Clarity

检查文本是否明确了本轮结果面：

- 是哪个页面、组件、行为、命令面或数据流会变化
- 用户能做什么新动作或看到什么新结果
- 哪些看似相关但明确不在本轮范围内

如果文本只有“支持 X”“优化 Y”“完善 Z”这类方向语，而没有具体行为落点，判为问题。

### 2. Completion Definition

检查“完成”是否被定义为可观察行为，而不只是：

- 函数存在
- 类型通过
- 页面能打开
- `pnpm typecheck/build/test` 通过

完成定义必须回答：

- 用户或调用方实际能完成什么
- 在成功路径上会看到什么结果
- 哪些 failure mode 也必须满足

### 3. Failure Paths And Boundaries

检查是否明确了关键失败路径：

- 输入不合法时怎样表现
- 空数据 / loading / disabled / conflict / partial state 怎样表现
- 哪些边界情况是本轮必须覆盖的
- 哪些边界情况明确留给后续，并已写入非目标或 successor ownership

### 4. Proof Relation

检查每个关键结果是否已经绑到 proof obligation：

- 哪条测试 / focused verification 证明哪条行为
- 哪个 owner doc update 证明 baseline 已吸收该变化
- 哪些只是命令门禁，不能替代行为证明

如果文本把“跑全套命令”当作唯一完成证明，判为问题。

### 5. Hidden Implementer Degrees Of Freedom

检查文本是否仍把关键判断留给实现者即兴发挥，例如：

- 允许多种互不兼容实现，但没有裁定哪条是本轮 contract
- 对交互流程只写“按现有模式处理”，但仓库内现有模式并不唯一
- 把关键 UX、owner、failure semantics 留成默认推断

这类问题会在实现中制造 drift，即使实现者很认真也会偏。

---

## 每条发现必须包含的字段

1. **Severity**: `P1` / `P2` / `P3`
2. **Location**: 文件路径 + 行号范围，或输入对象中的 section 标识
3. **Gap Type**: `result-surface` / `completion-definition` / `failure-path` / `proof-relation` / `hidden-freedom`
4. **What is missing**: 缺的到底是什么
5. **Why it matters**: 为什么会影响实现收敛
6. **Evidence**: 引用原文片段 + 必要时引用 owner doc / live code 对照
7. **Fix direction**: 一句话指出如何把它压实成 contract

---

## 输出结构

推荐输出：

```text
# Implementation Contract Review

## Scope
- Review object
- Relevant owner docs
- Formal plan status: yes / no

## Verdict
- `contract-ready` / `contract-not-ready`
- one-paragraph reason

## Findings
- Severity-ordered findings
- Or `No findings`

## Contract Gaps Checklist
- Result surface clear: yes / no
- Completion definition clear: yes / no
- Failure paths covered: yes / no
- Proof obligations bound: yes / no
- Hidden implementer freedom acceptable: yes / no

## Minimal Fix Set
- the smallest edits required before implementation should proceed
```

---

## 输出限制

1. 不要把 review 扩写成一次全面 plan audit。
2. 不要把 owner doc 已经明确裁定的事实重新包装成“待定义 contract”。
3. 不要报告纯文风问题。
4. 不要把“实现方式不同”误判为 contract 缺失；只有当不同实现方式会改变用户行为、owner、proof 或 closure 时才算问题。

---

## 可直接复用的提示词正文

```text
请对当前 nop-chaos-flux 仓库执行一次 implementation contract review。

目标不是审核代码，也不是做完整 plan audit，而是判断当前高层需求 / plan / analysis 是否已经被压缩成足够可执行、可测试、可验收的 implementation contract。

执行前先阅读：
1. docs/index.md
2. AGENTS.md
3. 相关 owner docs
4. 如果输入对象是 docs/plans/*.md，再读 docs/plans/00-plan-authoring-and-execution-guide.md
5. 必要时核对相关 live code 和测试

重点检查：
1. result surface 是否清楚
2. completion definition 是否清楚
3. failure paths / boundary conditions 是否清楚
4. proof obligations 是否和关键行为绑定
5. 是否仍有过多 hidden implementer degrees of freedom

输出要求：
1. 给出 `contract-ready` 或 `contract-not-ready` verdict
2. 每条发现必须包含：Severity、Location、Gap Type、What is missing、Why it matters、Evidence、Fix direction
3. 如果无发现，明确写 `No findings`
4. 最后给一个 `Minimal Fix Set`，只列开始实现前最小必须补齐的 contract 项
```
