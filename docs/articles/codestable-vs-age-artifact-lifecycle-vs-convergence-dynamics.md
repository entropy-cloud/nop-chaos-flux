# 制品生命周期与收敛拓扑：CodeStable 与 AGE 的真实差异

> 相关材料：[CodeStable](https://github.com/liuzhengdongfortest/CodeStable)、[attractor-guided-engineering-template](https://github.com/entropy-cloud/attractor-guided-engineering-template)、[nop-chaos-flux](https://github.com/entropy-cloud/nop-chaos-flux)
> AGE 文章：[Attractor Before Harness: AI 大规模开发的方法论](attractor-before-harness-ai-large-scale-development-methodology.md)、[为什么 Attractor Guided Engineering 不能被降级为 AI Agent Skill](agent-skills-vs-age-practice.md)

---

## 一、先校准比较对象

CodeStable 的 README 把自己定义为：

> 面向严肃工程的 AI 编码工作流

它的起点不是“代码变便宜了”，而是 AI 在真实项目里反复犯错后，需要一套可持续工作流：

> 直到有一天 Codex 反复解决不了一个我认为比较简单的问题，并且反复在同一个地方犯错。我就知道项目需要一套工作流来维持它继续进行了。

CodeStable 的核心命题是：

> 编排的不是 Agent，而是软件本身的生命周期。围绕的实体是构成软件的要素——每一个需求、每一个架构决定、每一个特性、每一个 bug、每一条历史里留下来的约束。

AGE 的起点不同。AGE 文章的第一句话是：

> 在 AI 深度参与开发的系统中，第一性的问题不是“如何约束 AI 的行为”，而是“系统应当收敛到怎样的长期结构”。

AGE 模板不是一个固定技能包，也不是固定文档 taxonomy。它更像一套可复制的 repo governance skeleton：把项目事实源、owner doc、过程记录、计划闭合、审计和技能使用的关系先搭起来，然后由具体项目按领域自然拓扑定制。`nop-chaos-flux` 是一个高强度 AGE 实例，不等于 AGE 模板的最低要求。

所以本文不把二者说成“同一个观察出发”。更准确的比较是：

- CodeStable 是一个即装即用、围绕软件生命周期制品和 `/cs-*` skill 入口组织的 AI 编码工作流。
- AGE 是一个围绕 repo truth、owner-doc authority、timeliness、plan closure、audit independence 和 trajectory convergence 组织的收敛框架。

---

## 二、制品拓扑：`codestable/` 聚合根 vs repo-wide owner 拓扑

CodeStable 的运行时结构集中在一个 `codestable/` 聚合根下：

```text
codestable/
  requirements/
  architecture/
  roadmap/
  features/
  issues/
  refactors/
  compound/
  tools/
  reference/
```

这套结构对应它的“6 个实体 + 3 个流程”：需求、架构、路线图、特性、问题、知识；特性引入、问题修改、代码重构。它的强项是把“上次那个 feature / bug 当时怎么搞的”集中收纳，三秒能找到。

AGE 模板的结构不是单一聚合根，而是 repo-wide ownership map。`docs/index.md` 明确说：

> This `docs/` tree is the durable memory and routing surface for `<project-name>`.

它把不同事实放到不同 owner 区域：

- `docs/context/`：强制 AI 上下文、source-of-truth precedence、项目规则
- `docs/backlog/`：可选下一步工作和 AI autonomy 状态
- `docs/input/`：原始输入
- `docs/discussions/`：需求澄清与未决问题
- `docs/requirements/`：implementation-ready requirement synthesis
- `docs/design/`：稳定 app-layer feature / business-flow owner docs
- `docs/architecture/`：稳定技术基线和跨特性结构规则
- `docs/plans/`：非平凡工作的执行与闭合条件
- `docs/audits/`：审计方法和审计证据
- `docs/logs/`、`docs/bugs/`、`docs/testing/`：过程记忆和证明记录

这不是“AGE 文档更多”，而是组织轴不同。CodeStable 以软件生命周期实体为主轴；AGE 以“哪个文件对哪类事实有权威”为主轴。

---

## 三、时效模型：长效档案 vs owner doc / time-sensitive record 分离

CodeStable 也区分长效档案和过程制品：

> requirements/ 和 architecture/ 是长效档案（只记现状），roadmap/ 是规划层（接下来怎么走），两者刻意分开

特性、问题、重构放进 dated 目录；`compound/` 用 `YYYY-MM-DD-{doc_type}-{slug}.md` 累积 learning / trick / decision / explore。

AGE 模板把这个问题进一步规范化为两类文件。`document-naming-and-timeliness.md` 明确区分：

> stable owner docs：回答 “what is the current supported baseline?”
> time-sensitive records：回答 “what happened in this round / this day / this investigation?”

稳定 owner docs 通常用稳定文件名、原地更新，包括 `docs/design/`、`docs/architecture/`、`docs/process/`、`docs/references/`。过程记录通常带日期，包括 logs、testing notes、discussions、analysis、audits、retrospectives、大多数 plans 和一次性 requirements。

这个分离很关键：AGE 不允许把历史演进混进规范性 owner doc。模板的 `docs/architecture/README.md` 要求：

> explain current rationale and constraints, not step-by-step history

并且：

> when implementation changes supported architecture, update the owner doc in the same change

CodeStable 也说 architecture “只记现状”，但 AGE 把“稳定 owner doc 必须保持最新、过程历史放到 dated records”变成了跨目录的命名与权威规则。

---

## 四、路由顺序：先选 skill vs 先找 owner truth

CodeStable 的日常入口是 `/cs`：

> `cs` 会读你的诉求，告诉你这次该走哪个 `cs-xxx`。

也就是说，开放式用户诉求会被路由到一个具体 skill：`cs-req`、`cs-roadmap`、`cs-feat-design`、`cs-issue-fix`、`cs-learn` 等。CodeStable 不是只靠 skill，它有 `codestable/` 制品树；但它的可操作入口主要是 skill。

AGE 模板的顺序相反。`AGENTS.md` 要求先分类任务类型，再读 `docs/index.md`，再读 owner docs，再检查可复用 skill：

> Determine the task type ... Use `docs/index.md` to read the owner docs for that task type before acting. Check `docs/skills/README.md` for candidate reusable skills before drafting or revising a plan.

`docs/index.md` 也明确说：

> Skills select the work method. They do not replace requirements, design, architecture, or owner-doc routing.

AGE 对 skill 的批评不是“skill 没用”，而是 skill 不能变成事实源。`agent-skills-vs-age-practice.md` 的核心句是：

> Skill 解决的是能力调用问题。AGE 解决的是领域结构在仓库长期演化中如何被保持，并如何抑制轨迹漂移的问题。

它进一步给出判断标准：

> 删除所有 skills 后，仓库是否仍知道什么是对的、谁拥有它、如何证明它？

这一点是非常明确的区别：CodeStable 的 skill 是生命周期流程的主要执行入口；AGE 的 skill 是 owner truth 已经确定之后的工作方法选择。

---

## 五、Plan 机制：roadmap/design/acceptance vs closure contract

CodeStable 没有 AGE 意义上的 `docs/plans/`。它有三类相近制品。

CodeStable 的 `roadmap/` 用于大需求事前规划：

> 概设（模块拆分）+ 架构层详设（接口契约 / 共享协议）+ 子 feature 拆解清单

`features/` 下面则是：

```text
{slug}-design.md
{slug}-checklist.yaml
{slug}-acceptance.md
```

其中 `cs-feat-design` 起草 design 作为后续唯一输入，`cs-feat-impl` 按 design 顺序实现，`cs-feat-accept` 逐层对照 design 核对实现。

AGE 模板中的 plan 不是 roadmap，也不是 feature design。`docs/plans/00-plan-authoring-and-execution-guide.md` 开头定义得很窄：

> `docs/plans/` is for non-trivial execution slices that need explicit scope, closure criteria, and proof.

它只在非平凡工作触发：API、数据库/模型、auth、integration、public contract、多模块共享行为、多 session、超过约 5 文件或 200 行、需要 staged implementation 或 explicit proof。模板同时明确允许低风险本地修改跳过 formal plan。

AGE plan 的关键不是“计划得更详细”，而是 closure semantics：

- 必须从 live baseline 开始，不能靠记忆或旧计划
- 必须写 Goals / Non-Goals，防止 scope drift
- execution item 必须标 `Fix | Add | Decision | Proof | Follow-up`
- confirmed live defect 或 contract drift 必须是 `Fix`，不能降级为 `Follow-up`
- skill usage 要写明，但 skill 选择方法，不决定 business truth
- before closure，所有 checklist 和 closure gates 必须一致
- created plan 必须独立 plan audit，完成前必须 independent closure audit
- source-of-truth conflict 或 protected risk 需要 human/subagent review 或保持 open

这和 CodeStable 的 design → impl → accept 链条不同。CodeStable 的验收重点是“实现是否符合 design”。AGE plan 的闭合重点是“这一轮执行是否真的在 live repo 中满足 closure criteria，并且没有把 in-scope 缺陷偷偷降级”。

`nop-chaos-flux` 中的 400+ 编号 plan 是更高强度实例，包含更细的 closure gates、audit 证据和 full-green 记录；但这些是项目定制结果，不是 AGE 模板要求所有项目照抄的固定结构。

---

## 六、人的位置：人在环 workflow vs repo-governed autonomy

CodeStable 明确把自己称为：

> 围绕**人在环**的 AI Harness

并说：

> 程序员是软件编码中的在环对象——可以对黑盒实现不了解，但对整体实现必须有所把控，必要时也可深入

这不是偶然措辞。CodeStable 的流程呈现方式就是人通过 `/cs-*` 入口驱动工作：整理需求、规划 roadmap、设计 feature、实现、验收、报告 issue、分析根因、修复、沉淀知识。

AGE 不等于“无人自动开发”。AGE 的人机边界更细：人类判断优先放在 attractor 定义、方向裁决、protected risk、source-of-truth conflict、plan/closure audit 等关键位置；细粒度实现可更多交给 AI，但必须受 repo truth、owner docs、plan gates、verification 和 independent audit 约束。

AGE 文章说：

> 人定义新的 attractor
> AI 围绕既定 attractor 高速展开
> harness 持续将轨迹拉回正轨

AGE 模板的 `backlog/README.md` 则把 autonomy 变成可见状态：`implement`、`plan-first`、`ask-first`、`research-only`、`blocked`。它还规定 AI 可以把 stale row 降级，但不能自行升级为 ready 或清除 blocker：

> Agents must not upgrade rows to `ready`, change autonomy to `implement`, or clear blockers without human confirmation or human-approved owner-doc evidence.

所以准确区别不是“CodeStable 有人、AGE 没人”，而是：CodeStable 把人放在 workflow driver 位置；AGE 把人类裁决和 AI 自主边界写进 repo 状态与 audit gates。

---

## 七、知识反馈：compound 复用库 vs authority-preserving memory topology

CodeStable 的知识沉淀集中在 `compound/`：

> compound 是复利工程的知识库，沉淀踩过的坑、好做法、技术决策

它的飞轮是：

> 下一次 cs-arch / cs-feat-design / cs-issue-analyze 会回头读 compound/，让经验在新工作里被复用

也就是说，CodeStable 把 learning、trick、decision、explore 放入一个可搜索的复用库，再由后续 skill 读取。

AGE 的 memory 分布更分层：

- owner docs 保存当前 baseline，不保存逐步历史
- logs 保存 dated implementation memory
- bugs 保存非显然回归历史和根因
- audits 保存挑战过程和审计证据
- testing 保存手工或探索性证明
- lessons 保存可复用工程经验
- skills 保存可复用 prompt / review playbook

AGE 模板还定义了经验升级路径。`AGENTS.md` 说同类错误反复出现时，不要只写 prose lesson：先提升成 audit prompt、checklist、review playbook；若仍复发，再评估 heuristic script、static check、lint rule、CI guard、codemod。

这比“记下来下次读”多了一层控制升级逻辑。CodeStable 的 compound 主要是跨工作流复用库；AGE 的 memory topology 同时维护当前真相、过程证据、复盘经验和可自动化 guardrail 的升级路径。

---

## 八、架构文档：当前结构档案 vs attractor carrier

CodeStable 把 architecture 放在长效档案层：

> 第 1 层 · 长效档案（“系统现在长什么样”，只记现状）

AGE 也要求 owner docs 描述当前 supported baseline，而不是历史。但 AGE 额外强调这些 owner docs 是 attractor 的工程载体：它们不只是记录现在长什么样，还定义系统应向哪里收敛。

AGE 文章给出分层裁决：

> 问当前实现行为，代码权威；问系统应向哪里收敛，文档权威；问某条路径为什么被放弃，logs/bugs/analysis 权威。

这就是区别：CodeStable README 中的 architecture 更像当前结构档案；AGE 中的 design / architecture owner docs 是稳定 owner truth，也是 attractor carrier。两者都反对把历史过程塞进架构文档，但 AGE 把“当前 baseline + source-of-truth precedence + convergence direction”放在同一个 owner-doc 系统里。

---

## 九、结论

CodeStable 和 AGE 都反对把 AI 开发只理解为“让 agent 更会写代码”。但它们解决的问题不同。

CodeStable 是一个 packaged workflow：用 22 个 skill 和 `codestable/` 制品树，把需求、架构、roadmap、feature、issue、refactor、compound 串成可执行生命周期。它的优势是即装即用、入口明确、适合让程序员以人在环方式管理 AI 编码过程。

AGE 是一个 repo-governance / convergence framework：先建立 source-of-truth routing、stable owner docs、dated process evidence、backlog readiness、plan closure、audit independence 和 skill-as-method 的关系，再让 AI 在这个拓扑中执行。它的优势不是提供更多 skill，而是让仓库在多轮 AI 扰动后仍知道：什么是当前真相，谁拥有它，怎么证明它，什么时候必须停下来审计或问人。

压缩成一句话：

> CodeStable packages lifecycle work into callable skills and durable artifacts. AGE preserves domain truth and convergence constraints across repository transformations.
