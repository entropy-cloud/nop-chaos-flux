# WeChat Harness Article Fit Analysis

> Date: 2026-06-03
> Source: 微信公众号文章《面向长期运行应用开发的 Harness 设计》 https://mp.weixin.qq.com/s/wToqBYoq0mG308x4mzf9-g
> External repo compared: `C:/can/nop/attractor-guided-engineering-template`
> Scope: 判断该文实践对 `nop-chaos-flux` 是否有用、`docs/skills` 是否需要新增 skill、以及是否需要深度理解 AGE template 仓库。

## 1. 结论先行

这篇文章对本项目有用，但主要价值不是“引入一个新的 planner-generator-evaluator skill 套件”，而是作为对现有 AGE / harness 实践的外部印证与局部补强。

结论分三条：

1. 对 `nop-chaos-flux` **有用，但大部分核心思想已经在仓库里以更强的 repo-level 形式存在**。
2. `docs/skills/` **当前不需要因为这篇文章单独新增一个通用 harness skill**。
3. `C:/can/nop/attractor-guided-engineering-template` **值得理解，但不需要为回答这篇文章而做全面深潜**；按主题选择性吸收即可。

## 2. 文章中哪些实践对本项目有用

### 2.1 已被本仓库显式吸收或超越的部分

文章最核心的两条经验是：

1. 不让同一上下文同时负责实现和完成判定。
2. 把生成与评估分离，通过独立 evaluator / QA 重新回看 live repo。

这两条在本仓库里已经是强基线，不是空白：

- `docs/articles/attractor-before-harness-ai-large-scale-development-methodology.md` 明确要求不要让同一上下文既做实现又做完成判定，并强调 fresh session / independent audit。
- `docs/articles/agent-skills-vs-age-practice.md` 明确区分了 skill 级执行能力和 repo-level 语义拓扑，避免把方法误降级成一次性调用包。
- `docs/skills/diff-standards-and-spec-review-prompt.md`、`docs/skills/deep-audit-prompts.md`、closure audit 相关规则，本质上都已经在承担 evaluator 的角色。
- `AGENTS.md` 与现有 plan / audit 纪律已经把 independent review、fresh context、closure judgement 外化到仓库工作流中。

因此，这篇文章并没有提出一个本仓尚未意识到的第一性原则。相反，它证明了当前仓库坚持的一个关键判断是对的：**生成与验收分离不是“可选 QA 优化”，而是 AI 协作下的必要基础设施。**

### 2.2 值得补强吸收的部分

虽然大原则已存在，但文章仍有几处可作为本仓的局部补强信号：

1. **更显式的 evaluator scoring language**
   对设计质量、原创性、工艺、功能性的分项评分语言，提示了某些主观审查场景可以更明确地写出评分维度，而不是只给开放式批评。对本仓最相关的场景是 UI / UX / playground / designer workbench 质量审查。
2. **contract-before-implementation 的强调**
   文章里的 sprint contract，与本仓 plan 中的 `Current Baseline`、`Goals`、`Non-Goals`、`Closure Gates`、`Proof obligations` 很接近，但它提醒我们：对于高层设计到可测试行为之间落差较大的任务，应该更显式写“本轮完成定义”。
3. **持续压力测试 harness 组件是否仍承重**
   文章主张随着模型进步，逐步删掉不再必要的 harness 组件。这个观点对本仓有价值，因为我们已经有较多 plan / audit / review prompt；未来应持续检查哪些仍然提供净收益，哪些只是历史残留复杂度。
4. **对主观领域使用更针对性的评估器**
   本仓已有 `ux-design-pattern-audit-prompt.md`、React 19 review、deep audit 等技能，但如果后续要强化“视觉原创性 / designer UX 品质 / playground 产品感”，文章说明了为什么单纯代码审查不足，需要面向体验的独立评价语义。

## 3. 为什么不建议因为这篇文章直接新增一个 skill

## 3.1 原因一：文章的方法主要是 harness orchestration，不是稳定的局部 work method

`docs/skills/` 在本仓的定位是 reusable internal prompts, review playbooks, and audit templates。它们解决的是：

- bug diagnosis
- diff review
- deep audit
- doc evaluation
- exploratory testing
- refactor discovery

也就是“当前任务该采用哪种稳定工作方法”。

而这篇文章讨论的主轴是：

- planner / generator / evaluator 多 agent 编排
- context reset vs compression
- sprint contract
- 根据模型能力裁剪 harness 组件

这些更像**执行架构和 control-loop 设计原则**，不是一个足够稳定、足够狭义、足够直接的单技能调用面。

如果现在新增一个例如 `long-running-harness-prompt.md` 或 `planner-generator-evaluator-skill.md`，大概率会出现两个问题：

1. 它会和现有 AGE / owner-doc / plan / closure audit 规则重叠。
2. 它会把 repo-level workflow 误包装成“需要时才加载的局部能力”，这与 `docs/articles/agent-skills-vs-age-practice.md` 的原则冲突。

## 3.2 原因二：现有 skill 已覆盖文中 evaluator 面的大部分需求

当前仓库已经有这些等价或近似角色：

- `diff-standards-and-spec-review-prompt.md`：固定点 diff 的 standards/spec evaluator
- `deep-audit-prompts.md`：多维 evaluator
- `open-ended-adversarial-review-prompt.md`：更怀疑、更对抗式 evaluator
- `ux-design-pattern-audit-prompt.md`：UI/UX evaluator
- `doc-evaluation.md`：设计/文档 evaluator

换句话说，本仓已经不是“缺 evaluator”；真正更有价值的问题是：**什么时候选哪个 evaluator，是否还缺某个窄而稳定的审查维度。**

## 3.3 真正可能值得新增的不是“harness skill”，而是更窄的专项审查 skill

如果要从这篇文章吸收出新的 skill，比较合理的方向不是 planner-generator-evaluator 总控，而是更窄的东西，例如：

1. 面向 designer / playground / 落地页质量的 `visual-originality-and-product-quality-review` 类 prompt。
2. 面向“完成定义不够清楚”的 `implementation-contract-review` 类 prompt，用于把高层需求压成可测 contract。

但是否真的新增，前提是先出现重复场景，证明现有 `ux-design-pattern-audit`、doc evaluation、plan audit 仍不足以支撑这些任务。当前证据还不够。

## 4. 对 `attractor-guided-engineering-template` 的判断

## 4.1 不需要为了本次问题做“全面深度理解”

原因很简单：`nop-chaos-flux` 不是 template 的下游实现，而是 template 的来源之一，而且在 framework-level 上比 template 更强、更重、更细。

模板仓更适合回答这些问题：

- 小中型应用项目如何以较低流程成本采用 AGE
- 何时引入 `docs/input/`、`docs/design/`、`docs/audits/`、`docs/skills/`
- 如何把 plan audit / closure audit / skill routing 做成轻量默认路径

而当前问题是判断一篇 harness 文章对 `nop-chaos-flux` 是否有用。对这个问题而言，只需要理解 template 中几个与 skill 边界、plan / closure audit、input routing 直接相关的文件即可，不需要通读整个仓库。

## 4.2 但它值得做“主题式理解”

如果后续你要做下面这些事，template 值得继续深读：

1. 想把 `nop-chaos-flux` 的实践提炼成更轻的可复制工作流。
2. 想判断哪些 flux 仓库内规则是 framework 特有，哪些可以下沉为 app-template 默认规则。
3. 想继续澄清 `docs/skills/` 应该长到什么程度、在哪里停止，避免变成“结构化 vibe coding prompt 库”。
4. 想把当前 repo 中部分重型规范抽象成更清晰的 app-layer / framework-layer 分层叙事。

## 4.3 本次对 template 的直接收获

本次快速对照已经能确认三件事：

1. template 明确把 skill 定位为 `method selector`，这与本仓现有立场一致。
2. template 把 `plan audit` 和 `closure audit` 设为 created plans 的强制路径，这与本文的 evaluator 分离精神一致。
3. template 明确把外部文章等材料放到 `docs/input/`，这说明把本文原文落到输入层是合适的，而不是直接写进 `docs/skills/` 或只留在聊天记录中。

## 5. 结论

### 5.1 对本项目有用吗

有用，但主要是**作为外部佐证和局部优化方向**，不是作为一套要整体移植的新机制。

最值得吸收的是：

- 对独立 evaluator / fresh-session acceptance 的再次确认
- 对主观质量评估维度的显式化
- 对 contract-before-implementation 的强调
- 对 harness 复杂度持续做承重性审查

### 5.2 `docs/skills` 下需要增加 skill 吗

当前判断：**不需要立即新增。**

更合理的动作是：

1. 先把这篇文章作为输入材料和分析结论沉淀下来。
2. 继续观察 UI / UX / designer quality review 是否反复暴露现有 skill 不够细。
3. 只有当重复场景稳定出现时，再新增一个更窄的专项评审 skill，而不是新增一个笼统的 harness skill。

### 5.3 需要深度理解 `C:/can/nop/attractor-guided-engineering-template` 吗

当前任务下：**不需要全面深潜，只需要按主题选择性理解。**

如果后续目标转向“抽象工作流模板”“精简规则分层”“定义 app-layer AGE 最小集”，那就值得深入读。
