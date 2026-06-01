# AI 编程闭环三卷系列 vs 渐进式 Spec vs nop-chaos-flux vs AGE Template: 实践对比分析

> Date: 2026-05-31
> Source: 微信公众号系列《AI 编程可闭环协作》卷一/卷二/卷三（https://github.com/Cyning12/ai-coding-closed-loop-articles） + 微信文档《2026 年 AI 编码的“渐进式 Spec”实战指南》（https://mp.weixin.qq.com/s/7Lgb3GfgXKI0J9L9e9sq0w，本地临时备份：`C:\Users\a758371\AppData\Local\Temp\opencode\wechat-progressive-spec-2026.html`） + nop-chaos-flux 仓库 + attractor-guided-engineering-template 仓库 + AGE/PHS 相关文章
> Scope: 对完整三卷系列、渐进式 Spec/code_copilot 框架、nop-chaos-flux 实践、AGE 模板进行方法论对比；区分技术图谱轨、Spec/任务过程轨、闭环后经验/Skill/knowledge 记忆轨，并识别 AGE/PHS 视角下的改进机会

> Note: `C:\can\nop\ai-coding-closed-loop-articles` 是 public narrative/publishing repo，包含三卷正文、粘贴版、配图 prompt 和发布脚本；它**描述**技术图谱/Harness 方法论，但本仓本身不是可运行的 AGE/Harness 模板，也不包含真实 `docs/_tech_graph/`、`graph.json`、manifest、图谱 CI 实现。

## 1. 四方定位

| 维度     | 三卷系列（技术图谱 + Harness/SDD）                                                                  | 渐进式 Spec（微信文档）                                                                                       | nop-chaos-flux                                                                      | AGE 模板                       |
| -------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| 性质     | 方法论论文（通用）                                                                                  | 实战框架 / 可复制目录模板                                                                                     | 实际落地的生产工程                                                                  | 可复制的项目脚手架             |
| 核心命题 | 技术图谱回答“改哪里、影响谁”；Harness/SDD 回答“谁签收、凭什么合并”                                  | 用渐进式 Spec 降低 AI 编码上下文成本，同时避免小需求承担重流程                                                | 吸引子引导 + 计划执行 + 审计闭环                                                    | 先有吸引子，Harness 才有意义   |
| 层次     | 双轨闭环：技术图谱（冷层/空间结构）+ Harness/SDD（温层/过程轨迹）+ 可选经验卡片/Skill（闭环后记忆） | `rules/` + `knowledge/` + `changes/`，用 `/propose → /apply → /fix → /review → /archive` 串起过程轨和知识沉淀 | 语义路由 / owner-doc 拓扑、计划执行、审计与验证高度落地；但没有卷二式机器技术图谱轨 | 过程 + 结构 + 认知框架完整定义 |

## 2. 高度一致的领域（多方交集）

### 2.1 任务定义必须先写清再动手

- **三卷系列**：卷一给出意图 / 成果 / 验收；卷三 §11.4 将任务单细化为验收清单、非范围、失败路径、测试策略、图谱入口。
- **渐进式 Spec**：`/propose` 阶段先 Research 代码现状，再分段生成 `spec.md`、`tasks.md`、`log.md`；待澄清全部解决前禁止进入 Apply。
- **nop-chaos-flux**：计划模板要求 Goals / Non-Goals / Scope / Exit Criteria / Closure Gates（24 条规则）。
- **AGE 模板**：计划模板要求 Goals / Non-Goals / Current Baseline / Exit Criteria / Closure Gates（13 条规则）。

### 2.2 非范围/Non-Goals 不可省

三卷系列、nop-chaos-flux 和 AGE 均将非范围视为硬性要求。卷一用“意图”覆盖“要达成什么、不做什么”，卷三 §11.4、nop-chaos-flux 规则 3、AGE 规则 2 都要求开工前写清“不做的事”。渐进式 Spec 文档没有突出 `Non-Goals` 字段，但在 `/propose` 中强调 YAGNI 裁剪、逐个澄清、确认前不编码，功能上覆盖了“不要做什么”的一部分。

### 2.3 合并前 CI 必绿

- **三卷系列**：卷一 §6 要求合并前命令；卷二 §9.5 将图谱 CI 纳入门禁；卷三 §11.6 将“合并前必绿”作为验收固定一条。
- **渐进式 Spec**：每个 task 完成后必须展示编译输出 / 测试输出 / 调用结果，Git 规范要求 commit 前执行编译检查。
- **nop-chaos-flux**：当前 `.github/workflows/ci.yml` 有 8 个 CI jobs：`check`、`typecheck`、`build`、`lint`、`test`、`coverage`、`e2e`、`format`；Closure Gate 中硬编码 `pnpm typecheck + build + lint + test`。
- **AGE 模板**：Closure Gate 第 3 条要求记录验证命令输出，但 CI 配置留给具体项目。

### 2.4 书面审查/签收不可省

- **三卷系列**：卷一给出“需求澄清 → 任务审核 → 实现 → 自检 → CI → 审查签收 → 合并”骨架；卷三 §12 细化任务审核（开工前）+ 审查签收（合并前）两类记录。
- **渐进式 Spec**：完整 spec + tasks 生成后必须等用户显式确认；Review 拆成 Spec Compliance 和 Code Quality 两个独立 Sub Agent 阶段。
- **nop-chaos-flux**：计划指南强制独立 `Closure Audit` 才能标记 `completed`，并通过 Collaboration Discipline 要求人类闸 / 不得自批准计划创建；但主项目当前没有像 AGE 模板那样把“每个 created plan 实现前必须通过独立 Plan Audit”写成统一硬门禁。
- **AGE 模板**：Plan Audit + Closure Audit，同样要求独立审查。

### 2.5 人工闸 / 半自动协作

- **三卷系列**：卷三 §14.3 定义“待批准/已批准”人工闸，Agent 不得代填。
- **渐进式 Spec**：Propose 后确认前禁止编码；Apply 默认逐 task 暂停确认，支持批量执行和紧急停车。
- **nop-chaos-flux**：AGENTS.md 规定 "NEVER commit unless explicitly asked"。
- **AGE 模板**：ai-autonomy-policy 中定义 protected areas。

### 2.6 独立审查 / 换上下文

- **三卷系列**：卷三 §14.5 定义 Fresh Context 纪律——审查时只贴三件套（diff + 命令输出 + 验收表）。
- **渐进式 Spec**：Review 通过 `spec-reviewer` 与 `code-quality-reviewer` 两类 Sub Agent 隔离实现上下文，并要求阶段一 PASS 后才进入阶段二。
- **nop-chaos-flux**：Closure Audit 要求独立子代理（fresh session）。
- **AGE 模板**：Closure Audit 同样要求独立 reviewer。

## 3. nop-chaos-flux / AGE 的额外结构

### 3.1 吸引子（Attractor）概念

三卷系列没有 AGE 意义上的显式“吸引子”概念。卷一/卷二并非假设结构地图已经存在，而是把技术图谱作为冷层结构轨来建立；但它主要定义“改哪里、影响谁”的实现导航拓扑，尚未定义“系统长期应收敛向什么”的 owner-doc / precedence / attractor 语义拓扑。nop-chaos-flux 和 AGE 模板以吸引子为核心：先定义“项目应收敛向什么”，Harness 是围绕吸引子的工程载体。

### 3.2 文档路由系统

卷三任务单中的“图谱入口”看起来是一行字段，但卷二展开后，它指向的是一套技术图谱系统：主流程图、分册流程图、`.ai.md` 导出源、`graph.json` 机器总图、入口清单、契约清单、表结构说明、查询子图和图谱 CI。它已经明显超过普通任务单指针。

与之相比，nop-chaos-flux 有完整的 `docs/index.md` 路由表 + `AGENTS.md` 双表（按任务/按代码位置）；AGE 模板同样有 `docs/index.md` + 分类路由。差异不在于三卷系列“没有拓扑”，而在于三卷系列主要保留**实现导航拓扑**，AGE/nop-chaos-flux 进一步保留 owner-doc、precedence、proof relation 等**语义权威拓扑**。

### 3.2.1 AGE 与 nop-chaos-flux 都没有卷二式机器技术图谱

需要区分 `docs/index.md` / owner-doc routing 与卷二技术图谱。当前 `nop-chaos-flux` 没有发现活跃的 `graph.json`、`*.ai.md`、`_manifest.json`、契约 manifest、查询子图裁切或图谱 CI。它的强项是语义权威拓扑和审计/验证闭环，而不是机器可查询的实现导航图谱。

AGE 模板同样没有卷二式技术图谱栈。它有 `docs/context/codebase-map.md`、`docs/index.md` 和 `tools/check-active-doc-code-anchors.mjs` 这类粗粒度路由/锚点新鲜度检查，但没有 `.md` / `.ai.md` / `graph.json` 三轨、query-subgraph extraction、entry/contract manifest 或 graph freshness CI。

如果 AGE 要吸收三卷系列的卷二贡献，较自然的 optional layer 是新增 `docs/_tech_graph/` 或项目自定义等价层：entry manifests、contract manifests、graph export sources、generated graph data、query-subgraph tooling 和 graph freshness checks。

### 3.3 审计维度的深度

三卷系列审查聚焦任务单字段、读图方式、图谱 CI、合并前 CI 与书面签收。nop-chaos-flux 在此基础上还有更深的审计维度：

- 20 维 Deep Audit
- 对抗式 Open-Ended Adversarial Review
- Diff Standards and Spec Review（双轴审查）
- 12 个 Hard Gate + 8 个 Heuristic Scanner
- 21 条 Audit Rules

AGE 模板有 Document Audit / Plan Audit / Closure Audit，并提供 Multi-Dimensional Audit 与 Open-Ended Audit 作为 audit styles；另有 index-routing-audit skill 用于路由审计。

### 3.4 渐进式升级机制（Progressive Promotion）

AGE 模板定义了 8 级升级路径：prose → audit prompt → checklist → heuristic script → static check → lint rule → CI guard → codemod。三卷系列没有这个显式升级阶梯。nop-chaos-flux 实际走了这条路但没有显式文档化升级阶梯。

### 3.5 Bug 诊断的结构化

卷一/卷三提到失败路径和测试策略，但不展开结构化 bug 诊断方法论。nop-chaos-flux 有 7 阶段 Bug Diagnosis Skill；AGE 模板也有 `bug-diagnosis-prompt.md` 和 bug note / audit workflow guidance。

### 3.6 Skills/可复用 Prompt 库

卷一已经提到“经验卡片 / Skill”，但明确把它定位为闭环后的可选经验沉淀，不替代技术图谱与任务单。nop-chaos-flux 当前 `docs/skills/` 有 22 个 `.md` 文件，其中 1 个是 README，约 21 个 prompt/playbook 文件；AGE 模板当前 `docs/skills/` 有 12 个 `.md` 文件，其中 1 个是 README，11 个 starter skills。它们更接近受 `docs/index.md`、owner docs 和审计流程约束的方法目录。AI agent runtime Skill 则仍更接近平面可调用 procedure bundle。

## 4. 三卷系列启发出的当前实践改进点

### 4.1 失败路径（Failure Paths）显式字段

卷一的最小任务单已有失败路径，卷三 §11.4 进一步要求在任务单中以表格形式写清“触发→行为→状态码→可否重试→用户可见类型”，并为每条失败路径关联可测场景编号。nop-chaos-flux 和 AGE 模板此前的计划模板中**没有这个显式字段**——失败路径更多隐含在 Exit Criteria 和 Bug Notes 中。

**已落地改进**：在计划模板中增加 `## Failure Paths` 可选章节，鼓励对涉及错误处理、API 契约、鉴权的计划显式列出预期错误行为。

### 4.2 测试策略档位（Must / Should / N/A）

卷一任务单已有测试策略，卷三 §11.5 定义了三级测试策略档位（必须自动化 / 建议有测 / 不适用），并明确“改对外 API、路由或鉴权时不得选不适用”。nop-chaos-flux 原有 Bug Fix Test Coverage Rule，但此前没有全局测试策略档位。AGE 模板同样没有显式档位。

**已落地改进**：在 `AGENTS.md` 的 Verification Checklist 之前增加 `## Test Strategy Tiers` 章节，并在 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 plan template / drafting rules 中增加 `## Test Strategy` 三档声明。

### 4.2.1 技术图谱实现层缺口

三卷系列中当前最具体、但 AGE 模板与 nop-chaos-flux 都未落地的实践，是卷二的机器技术图谱实现模型。它不是 `docs/index.md` 的替代，而是一条独立的实现导航轨：`docs/_tech_graph/`、entry manifest、contract manifest、graph export sources、generated graph data、query-subgraph tooling 和 graph freshness checks。

这对 nop-chaos-flux 的启发是：如果未来需要让 Agent 在复杂代码路径中稳定做影响面分析，应该考虑是否新增一个项目专用的技术图谱层，而不是继续把所有导航压力压到 `docs/index.md` 和人工阅读路径上。

### 4.3 冷/温/热分层的动力系统基础

卷一已经把技术图谱与协作流程叠放，卷二系统展开冷层技术图谱，卷三展开温层协作轨迹并正式引入冷/温/热术语。nop-chaos-flux 和 AGE 模板实际实现了冷层和温层的大部分内容，但没有使用这个温度术语。AGE 模板使用的是“attractor / carrier / implementation”三层模型。

**理论分析**：冷/温/热不是一个外在的运维标签，而是**同一动力系统在不同时间尺度上的投影**：

| 层       | 确定性动力系统                                            | 随机动力系统 (RDS)                                                         | 工程对应                         |
| -------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------- |
| **冷层** | 慢流形 / 吸引子拓扑。结构在参数慢变下不变，只有分岔才改变 | Pullback attractor / 随机吸引子。噪声下的不变集合，仍慢变                  | 架构文档、技术图谱、owner docs   |
| **温层** | 轨道 / 轨线。系统在相空间中走过的路径，编码历史           | 不变测度族。轨道退化为分布，但分布携带历史信息（经过哪个吸引域、转移概率） | 任务单、签收记录、关账摘要、日志 |
| **热层** | 快动力学 / 瞬态涨落。在慢变量的时间尺度上可被平均掉       | 被吸收进测度的涨落。个别样本路径不独立记录，贡献体现为测度的扩散和漂移     | 运行时事件、实时日志             |

核心关系：

1. **AGE 的 attractor/carrier/implementation 是内容分类**（这个东西在系统中扮演什么角色）。
2. **冷/温/热是时间尺度分类**（这个东西在系统的快慢谱上位于哪里）。
3. 两者正交。同一个 carrier document 在两个维度上可以位于不同位置。例如 `docs/bugs/14-tailwind-v4-*.md` 是 carrier，但因为 Tailwind 升级后不再触发，实际上已经是冷层。
4. **热层在 RDS 中可被建模为统计效应**：个别运行时事件不独立记录时，其影响可被视为在较慢时间尺度上进入协作轨迹的统计摘要。AGE 模板说“热层属远期场景，现阶段不必做”——从 RDS 类比看，这是一个合理截断，但不应表述为已严格证明的数学结论。

**结论**：AGE 已隐含了冷/温/热的主要结构（吸引子可对应冷层，carrier 可覆盖温层的一部分，热层在当前模板中通常被截断），但没有用时间尺度分离的语言把它说透。三卷系列的冷/温/热术语是对 AGE 的一个有价值的理论补充——它为 AGE 的设计选择提供了可继续发展的动力系统解释。

**改进建议**：保持现有 AGE 术语不变，但在 AGE 方法论文档中增加一段关于时间尺度分离的理论说明，解释为什么日常只维护冷层和温层是合理截断。RDS/不变测度解释应明确标注为理论延展，而不是三卷系列本身已经给出的结论。

### 4.4 半自动协作的显式建模

卷三 §14 详细讨论了“何时开链式、何时关”、“一个任务一个对话一个 PR”的默认路径。nop-chaos-flux 和 AGE 模板的 AGENTS.md 此前没有对“链式/非链式”协作模式做显式建模。

**已落地改进**：在 AGENTS.md 的 Verification Checklist 之后增加 `## Collaboration Discipline` 章节，定义默认路径和显式闸。

### 4.5 存量/无 CI 降级

卷三 §15 专门讨论无 CI 时的降级策略。nop-chaos-flux 已有完整 CI 不需要降级；AGE 模板暗示了这种灵活性但没有显式讨论。

**观察**：对 nop-chaos-flux 不适用（已有完整 CI）。AGE 模板可通过 project-context 的验证命令表隐含支持。

### 4.6 可追责包（Accountability Package）

卷三 §12.9 明确定义“交付物不止是 PR”——任务单、书面审查、结构地图、版本记录、机器验收构成可追责包。nop-chaos-flux 在实际上产出了所有这些要素，但没有用“可追责包”这个聚合概念来组织。

**观察**：这是一个有用的聚合概念，但不需改变文档结构——当前 Closure Gates 已隐含了可追责包的所有要素。

## 5. AGE 模板的独立贡献

### 5.1 需求澄清流水线

三卷系列包含“需求澄清 → 任务审核 → 实现...”阶段，但 AGE 模板仍更完整地定义了 `input → discussions → requirements → design/architecture` 的前置需求澄清与归档流水线。

### 5.2 文档新鲜度（Freshness）

AGE 模板定义了 `fresh / partially stale / stale / unknown` 四级新鲜度，并据此限制 AI 行为。三卷系列没有这个概念。

### 5.2.1 Freshness 与 Autonomy 是一等仓库状态

AGE 最强的新增控制变量之一，不只是“更多文档”，而是把文档是否可被信任、AI 是否可行动变成 repo-visible state。`project-context.md` 记录 freshness 和 active autonomy；`ai-autonomy-policy.md` 定义 protected areas、reviewer availability，以及 AI 不能自行放宽约束的规则。

三卷系列有人工闸、Fresh Context、无 CI 降级和诚实边界，但没有把 freshness / autonomy 参数化为仓库状态机。nop-chaos-flux 也有强路由和审计规则，但目前没有独立的 freshness/autonomy policy 文件。

### 5.3 AI 自主权策略（Autonomy Policy）

AGE 模板有显式的 `ai-autonomy-policy.md`，定义 protected areas 和 reviewer availability。文章通过"人工闸"隐含了类似概念但没有参数化。

### 5.4 Retrospectives / Lessons

卷一已经给出闭环后经验卡片 / Skill 的最小定位；渐进式 Spec 也给出 `knowledge/` 与 `archives/` 的轻量沉淀路径。AGE 模板作为 scaffold 更系统：它提供 logs、bugs、lessons、testing、retrospectives 的目录角色、指南、prompt 和维护规则。AGE 模板不自带项目特定记忆内容，复制后的项目仍需通过真实工作逐步填充。

## 5A. 渐进式 Spec 文档的独立贡献

### 5A.1 渐进式复杂度：流程按需求重量暴露

渐进式 Spec 的核心贡献是把 Spec Coding 从“一刀切流程”改成复杂度自适应流程。它明确指出 70% 需求是小需求，改字段/修小 bug 不应承担完整 spec + task 拆解成本；Rules 始终生效，Spec 按复杂度加载。

这与 AGE 的 Progressive Promotion 相邻但不等价：AGE 讨论的是规则/约束从 prose 到 CI guard/codemod 的长期升级阶梯；渐进式 Spec 讨论的是单个需求在当下应承担多少流程成本。一个是制度演化维度，一个是任务执行维度。

### 5A.2 Spec 是沟通协议，不是自动代码生成合同

渐进式 Spec 同时提出三条强口号：`No Spec, No Code`、`Spec is Truth`、`Reverse Sync`；但在后文又修正“规范是唯一真理来源”的误读，强调实际模式是人在回路中的 Spec 辅助，而不是“规范 → 代码”的全自动线性映射。

这点与 AGE/nop-chaos-flux 的 owner-doc 语义权威存在重要差异：AGE 的 truth 是多源有优先级的 source-of-truth graph，代码、owner docs、active requirements、audit evidence 各有位置；渐进式 Spec 更偏向单变更目录下的沟通协议，能降低对话成本，但若把 `Spec is Truth` 绝对化，就会和“代码事实 + owner-doc precedence”冲突。

### 5A.3 `rules/knowledge/changes` 三层目录是轻量 Carrier 拓扑

code_copilot 框架给出 `rules/`、`knowledge/`、`changes/` 三类载体：

- `rules/` 保存长期规则、编码规范、安全红线、领域规则。
- `knowledge/` 保存领域 Know-How、架构决策前因后果、踩坑经验。
- `changes/` 保存单次变更的 `spec.md`、`tasks.md`、`log.md`，归档后进入 `archives/`。

这比平面 prompt 更强，因为它开始区分长期规则、领域记忆和单轮过程记录；但它仍不是卷二式机器技术图谱，也不是 AGE 式完整语义权威图。它缺少显式 owner、precedence、新鲜度状态、文档路由表和跨文档 proof relation。

### 5A.4 Reverse Sync 与知识飞轮

渐进式 Spec 对 Reverse Sync 的强调很强：发现 bug 或 spec 偏差时，先修文档，再修代码；每次 `/fix` 必须同步更新 spec、tasks、log。它还把 prompt、模板、rules 本身纳入知识飞轮：需求实践 → 踩坑 → 沉淀 knowledge / 更新 prompt / 修改模板 → AI 更准。

nop-chaos-flux/AGE 已有 docs maintenance、bug note、daily log、lessons 等机制，但渐进式 Spec 更明确地把“每个 task 后立即检查是否沉淀知识”放进执行循环。这是一个可吸收的微实践。

### 5A.5 两层 AI 架构与透明度底线

渐进式 Spec 提出“编排层 + 执行层”：强模型做模糊需求理解、跨仓库分析和审查决策；编码优化模型做文件读写、shell 执行和快速迭代。它还提出工具透明度底线：模型型号/版本可见、完整 context 可查、原始输出不被篡改、token 用量透明。

这部分是三卷系列、AGE 模板和 nop-chaos-flux 文档中相对弱的工程操作层。它不是文档拓扑理论，但对可复现调优和成本/质量控制很关键。

### 5A.6 Git 纪律与本项目冲突点

渐进式 Spec 建议“每个 task/fix 完成后自动 commit，保持一个 task 一个 commit”，并要求 commit 前编译检查、禁止自动 push。这个规则适合它的 code_copilot 独立工作流，但与本项目 AGENTS.md 的 `NEVER commit unless explicitly asked` 直接冲突。

因此该实践不能直接移植到 nop-chaos-flux。可吸收的是“task 级 proof 和可编译边界”，不是“自动 commit”。

## 6. 理论深度对比

### 6.1 理论定位

| 框架         | 理论基础                      | 回答的核心问题                                       |
| ------------ | ----------------------------- | ---------------------------------------------------- |
| 三卷闭环系列 | 上下文工程 + 过程纪律论       | "改哪里、影响谁？怎么验证并签收？"                   |
| 渐进式 Spec  | 偶然复杂度控制 + 人机沟通协议 | "这类需求值得多重的 Spec 流程？如何降低上下文成本？" |
| AGE          | 系统收敛论                    | "'对'是什么？系统怎么收敛到它？"                     |

AGE 高一个抽象层次：它回答了 Harness/技术图谱/Spec 的先验问题。三卷系列已经回答“如何给 Agent 地图、如何签收合并”，渐进式 Spec 回答“如何按需求复杂度控制上下文投入和流程成本”；二者仍主要依赖技术图谱、任务单或变更 Spec 来表达当前可操作结构。AGE 进一步解释“对”从哪里来、如何演化、如何判断文档是否还可信。

### 6.2 卷三 Harness / 渐进式 Spec 是 AGE 的过程子集；三卷系列是 AGE 的部分同构

AGE 明确说："Harnesses such as plans, tests, audits, logs, bug notes, and CI only become meaningful after the attractor exists." 这意味着：

- 任务单 = carrier document 的一种
- `changes/spec.md` / `tasks.md` / `log.md` = carrier documents 的一种
- 签收 = convergence verification 的一种
- CI 门禁 = automated convergence guard
- 文档路由 = attractor navigation

若只看卷三，Harness 可视为 AGE carrier/control 的过程子集；渐进式 Spec 的 `changes/` 工作流同样是 carrier/control 子集，但更强调偶然复杂度控制和 task 级执行节奏。若看三卷整体，它已经包含技术图谱冷层和闭环后记忆雏形，因此应称为“部分同构但缺少 attractor/owner-precedence 元理论”，而不是简单真子集。

AGE 把三卷系列中的任务单、签收、CI、图谱、经验卡片，以及渐进式 Spec 中的 spec/tasks/log、rules/knowledge、两阶段 review 等实践解释为“围绕吸引子的工程载体”。三卷系列可以解释“如何减少上下文浪费、如何按图施工、如何签收合并”；渐进式 Spec 可以解释“如何让小需求不被流程拖垮”；AGE 进一步解释“为什么两个项目使用相似图谱、Spec 和 Harness 流程，长期效果仍可能不同”——答案在于吸引子、owner-doc 权威拓扑和文档新鲜度是否清晰。

### 6.3 AGE 的元理论优势

1. **渐进式升级阶梯**（prose → audit prompt → checklist → script → static check → lint rule → CI guard → codemod）是一套**流程自身的演化理论**。三卷系列描述了图谱与流程应该长什么样，但没有解释流程如何从零起点逐步长成。
2. **可控参数**（文档新鲜度 freshness、AI 自主权 autonomy）能解释“为什么同一个团队在不同阶段需要不同的纪律强度”。三卷系列给出诚实边界和降级路径，渐进式 Spec 给出需求复杂度驱动的流程裁剪，但二者都没有像 AGE 那样把 freshness/autonomy 参数化为仓库状态。
3. **权威拓扑**可以解释 `Spec is Truth` 的边界。渐进式 Spec 把 spec 作为沟通协议很有效，但如果没有 owner-doc precedence，`Spec is Truth` 容易退化为单变更文档覆盖长期架构承诺。

### 6.4 三卷系列的独立理论贡献

冷/温/热时间尺度分离是三卷系列对 AGE 的真正补充。AGE 的 attractor/carrier/implementation 是内容分类，冷/温/热是时间尺度分类，两者正交。RDS/不变测度视角可以作为进一步理论延展：在团队内部 AI 协作这种低运行时事件密度场景下，日常只维护冷层和温层、暂不建设热层记忆是合理截断。但这应表述为理论类比，而不是三卷系列或 PHS 文章已经严格证明的数学结论。

### 6.5 三卷系列实践对照 PHS 理论的盲区

用 PHS 结构保持动力学对照三卷系列，揭示以下盲区。这里的 PHS 是工程类比语言，不是严格动力学建模。

#### 6.5.1 签收是过程门禁，不是守恒检查

Harness 签收主要检查“流程走了没有”（checkbox 勾了没、CI 绿了没、签收证据是否落盘）。PHS 的语义承诺泄漏检查问的是：**有没有语义承诺消失了、弱化了、或转移到非权威载体上？**

一个 PR 可以 CI 全绿、所有 checkbox 勾选、签收记录齐全，但同时悄悄丢失了一个语义承诺——比如 owner doc 里某个约束被“简化”了、某个失败路径被“合并”了。三卷系列强调任务单、图谱、CI 和签收，但没有显式要求 closure audit 做这类语义承诺泄漏检查。

**改进建议**：签收环节增加语义承诺泄漏检查——“本轮是否有语义承诺消失、弱化、或转移到非权威载体？”

#### 6.5.2 没有 J-flow vs R-flow 判别

三卷系列区分了“字段齐全”“读图方式正确”“CI 绿”，但没有显式区分：

- **J-flow**：信息只是从 input 搬到 discussion 搬到 plan 搬到 code——承诺在载体间路由，但不确定性没有被消解。
- **R-flow**：通过决策、证明、owner-doc 对齐、审计，不确定性被真正消解。

常见反模式：任务单写得非常完整，图谱入口也给了，plan 非常详细，但 $F_{repo}$ 实际上没降——所有字段都填满了，但只是在搬运信息，不是在消解不确定性。卷二提供了很强的 J-flow / Park transform substrate（查询子图、入口清单、契约切片、代码锚点），卷三提供了 R-flow 的过程门禁（审核、CI、签收），但两者之间没有显式 J/R 判别标准。

**改进建议**：任务审核增加 J/R 判别——"填写这些字段是在真正消解不确定性，还是只是在搬运？"

#### 6.5.3 没有 $q$/$p$ 对偶

三卷系列的任务单和图谱主要是执行/导航视图。PHS 要求每个语义承诺同时有两个表示：$q$（当前稳定形态）和 $p$（变化义务——对未来演化施加的压力）。缺少这个对偶意味着：流程可以检测“任务做完了”（$q$ 到位了），但检测不到“变化义务还在”（$p$ 没有被吸收）。具体表现：一个任务标记 `completed`，但它引入的某个设计约束实际上还在等待下游确认。

**改进建议**：计划关闭时检查残留 $p$——"本轮引入的变化义务是否全部被吸收，还是有残留等待下游？"

#### 6.5.4 任务单本身的压平风险

PHS 明确警告“反馈线性化”反模式：把所有知识压成一种统一 artifact 会破坏语义拓扑。若只采用卷三任务单模板而忽略卷一/卷二的图谱轨，确实会产生这种压平风险。但三卷系列本身明确要求技术图谱、任务单、CI、审查和可选 Skill 分工，不主张任务单替代技术图谱、测试或经验记忆。

**改进建议**：任务单模板加注——"本单是协调工具，不替代 owner docs / architecture docs / test code 中的语义承诺。"

#### 6.5.5 测试策略缺少承诺对齐

卷三的“必须自动化 / 建议有测 / 不适用”是风险导向的分类。PHS 多问一层：**这些测试保护的是正确的语义承诺，还是偶然通过了？** CI 全绿的 PR，其测试可能只是在保护代码行为的一致性，而不是在保护 owner doc 中声明的语义承诺。

**改进建议**：测试策略增加承诺对齐列——"每个'必须自动化'的测试对应保护哪条语义承诺？"

#### 6.5.6 没有空间均匀性检查

三卷系列把任务单视为一轮交付的执行单元，卷二通过图谱和入口/契约清单补充局部拓扑。PHS 的空间均匀性要求：同类型的语义承诺无论出现在哪个组件、哪个模块，都应遵循相同的所有权规则、路由规则和证明规则。三卷系列的任务单模板和图谱 CI 不显式检查“你在这个任务里处理失败路径的方式，和上个月那个类似任务一致吗？”

**改进建议**：Closure audit 检查空间均匀性——"同类失败路径的处理方式是否与已有 precedent 一致？"

### 6.6 三类拓扑：AI Agent Skill、三卷技术图谱与 AGE Docs

这里需要区分三类结构：

- **AI agent runtime Skill**：例如 Claude Code / Agent Skills 标准中的 skill。它是可发现、可调用、可注入上下文的能力单元。
- **三卷系列的技术图谱**：卷二在方法论层面定义的实现导航图，包含主图、分册、导出源、机器总图、入口清单、契约清单、表结构说明、查询子图和图谱 CI。
- **AGE `docs/skills/`**：仓库文档拓扑中的方法目录。它不是运行时插件系统，也不是自足真理源，而是被 `docs/index.md`、owner docs、source-of-truth precedence、plan/audit 流程约束的 method note 集合。

补充：`ai-coding-closed-loop-articles` public repo 当前 `prompts/` 目录主要是配图/发布辅助 prompt（`prompts/README.md` 明确写着“多模态配图提示词（非正文）”），不是 operational AI coding skill library；因此“完整三卷系列及 prompts”不能被解读为文章仓已经提供了一套可运行的 AI runtime Skills。

AI agent runtime Skill 在设计思想上是一个**平面哈希表**：

```text
skill-name / description -> SKILL.md procedure bundle
```

即使 skill 支持 supporting files、scope precedence、plugin namespace、subagent fork，这些也只是让单个 value 更丰富，或让 key 有命名空间；它并不会把 skills 组织成一个系统级语义拓扑。调用者按 key 或 description 匹配，拿到一个倾向自完备的 procedure bundle，不需要理解这个 skill 与其他 skill 之间的 owner、precedence、proof 或 routing 关系。

三卷系列的技术图谱不是平面 Skill。它在方法论层面通过 entry/query → subgraph + anchors + manifests，把任务坐标转换为 repo/code 坐标。它定义了节点、边、入口、契约、代码锚点、查询裁切和 CI freshness guard，是明显的**实现导航拓扑**。

AGE 的文档系统则是更高层的**语义权威图**。每个文档节点的语义由它在图中的位置决定——谁是它的 owner、它路由到谁、它的优先级低于谁、它证明或约束哪类承诺。`docs/index.md` 的路由表不是普通索引，而是这个图的显式邻接结构之一。删掉路由表，每个文档仍然存在，但系统失去结构。

AGE `docs/skills/` 的强项不是 runtime packaging，而是被安置在这个语义权威图内。它们没有 runtime skill manifest、自动调用语义、bundled executable resources 或独立 truth authority；其价值在于必须服从 `AGENTS.md`、`docs/index.md`、source-of-truth precedence、active requirement 和 owner docs。

用 PHS 语言说：

- **AI agent Skill = 解耦能力单元**：每个 skill 是独立的 $H_i$，skills 之间没有系统级 $J$-互联。调用哪个 skill 主要靠 key/description 匹配。信息不会天然在 skill 之间按 owner topology 无损路由。
- **三卷技术图谱 = 实现导航拓扑**：`graph.json`、查询子图、manifest、contract slice 和代码锚点提供任务到代码的 Park-transform-like 坐标变换，是很强的 J-flow substrate。
- **AGE docs = 语义权威耦合系统**：文档之间通过 routing、ownership、authority、proof relation、freshness 构成更高层 $J$-互联。文档的交叉引用不是冗余，而是语义承诺在不同载体之间保持可恢复性的拓扑功能。

卷三任务单模板本身更接近平面协调界面：它把验收、非范围、失败路径、测试策略、图谱入口封装在一个执行文档中。但三卷系列不止任务单；卷二提供了独立的技术图谱轨。需要避免的错误是把“卷三任务单”误读成“完整系列的全部拓扑”。

因此，这不是“有没有文档”的区别，而是**拓扑类型**的区别。AI agent Skill 提供可调用 procedure bundle；三卷技术图谱提供实现导航拓扑；AGE durable docs 刻意保留语义权威拓扑。字段可以复制，导航图可以查询，权威拓扑必须维护。

### 6.7 三卷系列的 PHS 映射：已有 J/Park 基础，缺少 H/F/q/p 显式审计

卷一给出意图 / 成果 / 验收和“图谱 + 流程”叠放，可视为把 $p$（变化义务）导向 $q$（稳定结果）的最小闭环。卷二的 GPS 查询子图、入口清单、契约切片和代码锚点，是最接近 Park transform 的部分：它把 chat/task 坐标转换成 repo/code 坐标。卷三的任务审核、CI、书面签收和可追责包提供 R-flow 的门禁面。

对应关系如下：

| PHS 概念   | 三卷系列中的对应                                                             |
| ---------- | ---------------------------------------------------------------------------- |
| $H_{repo}$ | 意图/成果/验收、图谱、manifest、contract、任务单、签收证据共同保存语义承诺   |
| $F_{repo}$ | “改哪里、影响谁”不清、“何时做完”不清、失败路径未裁定等自由不确定性           |
| $q$        | 已落到代码、图谱、合同、测试、签收记录中的稳定状态                           |
| $p$        | 任务目标、非范围、失败路径、图谱漂移、合并前待证明义务                       |
| J-flow     | 技术图谱、查询子图、manifest、contract slice、任务单字段将承诺路由到正确载体 |
| R-flow     | 人类决策、测试证明、CI、任务审核、审查签收消解不确定性                       |
| ports      | 入口清单、契约清单、PR、CI、人类签收闸                                       |
| proof      | 测试策略、合并前命令、图谱 CI、审查记录                                      |
| memory     | 经验卡片 / Skill、关账摘要、后续卷四预期的温层摘要                           |

缺口在于：三卷系列没有显式定义 $H_{repo}$ / $F_{repo}$，没有要求 $q$/$p$ phase state，没有显式区分 J-flow 与 R-flow，没有 owner-doc precedence 和语义承诺泄漏检查，也没有 AGE 的 freshness/autonomy 策略。

### 6.8 渐进式 Spec 的 PHS 映射：强 R-flow 节奏，弱权威拓扑

渐进式 Spec 的贡献更偏 R-flow 控制：逐段确认、硬确认门、零偏差执行、Verification 铁律、Reverse Sync、两阶段 review，都是降低 $F_{repo}$ 的过程装置。`rules/knowledge/changes` 则构成轻量 $H_{repo}$ carrier 分层。

对应关系如下：

| PHS 概念   | 渐进式 Spec 中的对应                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| $H_{repo}$ | `rules/`、`knowledge/`、`changes/spec.md`、`changes/tasks.md`、`changes/log.md` 保存约束、领域知识和单轮承诺 |
| $F_{repo}$ | 需求不清、代码现状未核实、Spec 偏差、实现偏离 plan、隐性领域规则未沉淀                                       |
| $q$        | 已确认 spec、已完成 task、通过验证的代码、归档后的 knowledge                                                 |
| $p$        | 待澄清问题、待执行 task、Review findings、Reverse Sync obligations                                           |
| J-flow     | `rules/knowledge/changes` 载体分层、命令式路由、spec/tasks/log 之间的信息搬运                                |
| R-flow     | 用户确认门、Verification 证据、Sub Agent Review、Fix 后文档同步                                              |
| ports      | `/propose`、`/apply`、`/fix`、`/review`、`/archive`、Git commit boundary                                     |
| proof      | 编译输出、测试输出、调用结果、spec compliance review、code quality review                                    |
| memory     | `knowledge/`、`archives/`、prompt/rules/template 迭代                                                        |

盲区在于：它的 J-flow 主要是目录分层和命令路由，不是机器技术图谱；它的 truth model 主要围绕单变更 spec，不是 owner-doc precedence graph；它的 Git 自动 commit 纪律与某些协作仓库的人工提交闸会冲突。

## 7. 改进清单

基于对比分析，以下改进值得在 nop-chaos-flux 中落地：

| #   | 改进                                                                                  | 来源                          | 落地点                                                | 优先级 | 状态      |
| --- | ------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------- | ------ | --------- |
| 1   | 计划模板增加 `## Failure Paths` 可选章节                                              | 卷三 §11.4                    | `docs/plans/00-plan-authoring-and-execution-guide.md` | 高     | ✅ 已完成 |
| 2   | AGENTS.md 增加 `## Test Strategy Tiers` 章节                                          | 卷三 §11.5                    | `AGENTS.md`                                           | 高     | ✅ 已完成 |
| 3   | AGENTS.md 增加 `## Collaboration Discipline` 章节                                     | 卷三 §14                      | `AGENTS.md`                                           | 中     | ✅ 已完成 |
| 4   | AGE 方法论文档增加时间尺度分离的理论说明                                              | §4.3 分析                     | `docs/articles/` 或 AGE 模板                          | 低     | 待定      |
| 5   | 签收环节增加语义承诺泄漏检查                                                          | PHS $H_{repo}$ 类比           | Closure Audit 流程                                    | 高     | 待定      |
| 6   | 任务审核增加 J/R 判别（搬运 vs 消解）                                                 | PHS J-flow vs R-flow          | Plan Audit 流程                                       | 高     | 待定      |
| 7   | 计划关闭时检查残留 $p$（变化义务是否被吸收）                                          | PHS $q$/$p$ 对偶              | Closure Audit 流程                                    | 中     | 待定      |
| 8   | 测试策略增加承诺对齐（每个必自动化测试对应哪条语义承诺）                              | PHS $H_{proof}$               | `## Test Strategy` 章节                               | 中     | 待定      |
| 9   | Closure audit 增加空间均匀性检查                                                      | PHS 空间均匀性                | Closure Audit 流程                                    | 低     | 待定      |
| 10  | 将三卷系列的技术图谱纳入对比，避免把卷三过程轨误当全文框架                            | 卷一/卷二复核                 | 本分析文档                                            | 高     | ✅ 已完成 |
| 11  | 在 AGE/PHS 对比中区分“实现导航拓扑”与“语义权威拓扑”                                   | 卷二 + PHS                    | §6.6/§6.7                                             | 高     | ✅ 已完成 |
| 12  | 将 Skill 定位修正为“闭环后可选记忆”，不是图谱/任务替代品                              | 卷一                          | §3.6/§6.6                                             | 中     | ✅ 已完成 |
| 13  | 明确 AGE 与 nop-chaos-flux 都缺少卷二式机器技术图谱等价层                             | 卷二 + AGE/nop 复核           | §3.2.1 / §4.2.1                                       | 高     | ✅ 已完成 |
| 14  | 增加 AGE freshness/autonomy 作为一等仓库状态的比较                                    | AGE context docs              | §5.2.1                                                | 高     | ✅ 已完成 |
| 15  | 澄清 article repo 的 `prompts/` 是配图/发布 prompt，不是 operational AI coding skills | article repo prompts          | §6.6                                                  | 中     | ✅ 已完成 |
| 16  | 区分 public narrative repo 与实际方法论实现/模板 repo                                 | article repo README           | Source note                                           | 中     | ✅ 已完成 |
| 17  | 将《渐进式 Spec》纳入对比，补充 complexity-adaptive Spec 和 code_copilot 框架         | 微信文档                      | §1/§2/§5A/§6.8                                        | 高     | ✅ 已完成 |
| 18  | 在计划流程中考虑“需求复杂度 → 流程重量”声明，避免小任务过度流程化                     | 渐进式 Spec §2.3              | plan template 或 AGENTS.md                            | 中     | 待定      |
| 19  | 在每个 execution item 完成后显式检查是否有 knowledge/log 沉淀价值                     | 渐进式 Spec §2.4/§2.6         | When Executing / docs logs                            | 中     | 待定      |
| 20  | 增加工具透明度底线：模型版本、context、原始输出、token/cost 可追踪                    | 渐进式 Spec §3.2              | AGENTS.md 或 docs/context                             | 低     | 待定      |
| 21  | 明确禁止照搬“每 task 自动 commit”，保留本项目显式提交闸                               | 渐进式 Spec §3.3 vs AGENTS.md | 本分析文档                                            | 高     | ✅ 已完成 |
