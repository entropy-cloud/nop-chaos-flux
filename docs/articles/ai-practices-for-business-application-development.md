# 从 Spec-Driven Development 到 Attractor-Guided Engineering

副标题：一般业务开发如何借鉴 `nop-chaos-flux` 的 AI 工程实践。

`nop-chaos-flux` 是一个用 React 19、Zustand、TypeScript、Vite 和 pnpm workspace 重写 AMIS 低代码渲染器的实验性项目。它包含核心 DSL、公式、编译器、action runtime、React renderer runtime、表单/数据渲染器、Flow Designer、Spreadsheet、Report Designer、Word Editor 等多层模块，是一个由 AI 深度参与开发和维护的大型前端框架型仓库。

它的流程比普通业务系统重得多。一般业务开发不应该照搬它的多轮 deep audit、successor plan 和大型文档体系。

真正值得借鉴的是另一件事：它没有把文档当成“给 AI 生成代码的超大 spec”，而是把仓库组织成一套互补的真相结构。

- code 承载当前实现真相。
- design / owner docs 承载长期语义和边界真相。
- plan 承载一次变更的收口真相。
- logs 承载执行轨迹和关键判断。
- testing issues 承载人工测试发现的问题。
- bugs 承载复杂缺陷的诊断和防复发记忆。
- tests / harness 承载可重复的行为证据。
- audit tools / audit prompts 承载持续纠偏能力。
- `AGENTS.md` 把这些规则变成 AI 每次执行时都会读取的默认操作系统。

## 1. 典型 spec-driven AI 开发是什么

近年的 AI spec-driven development 通常是为了减少 vibe coding：先把需求整理成结构化 spec，再让 AI 生成 plan、tasks，最后按任务实现。

GitHub Spec Kit 是一个很典型的公开例子。它明确提出“specifications become executable”，并提供 `/speckit.constitution`、`/speckit.specify`、`/speckit.plan`、`/speckit.tasks`、`/speckit.implement` 这类命令。它的典型流程是：先写 what / why，再写技术实现计划，再生成任务，再执行实现。官方 README 中的 plan 阶段会引入技术栈、架构选择、数据模型、contracts、quickstart、research 等实现相关材料。

参考：`https://github.com/github/spec-kit`

Claude Code、GitHub Copilot、VS Code Copilot customization、Aider 这类工具也有类似方向：用 `AGENTS.md`、`CLAUDE.md`、custom instructions、prompt files、skills、hooks、conventions 文件给 AI 提供上下文、工作流和编码偏好。

参考：

- `https://docs.anthropic.com/en/docs/claude-code/common-workflows`
- `https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot`
- `https://code.visualstudio.com/docs/copilot/copilot-customization`
- `https://aider.chat/docs/usage/conventions.html`

这些实践很有价值，但常见倾向是：spec / plan / tasks 会成为 AI 的实现蓝图，里面经常写入具体技术实现细节，以减少 AI 搜索和猜测。

## 2. Flux 的做法为什么不同

`nop-chaos-flux` 不是反对 spec，也不是反对 plan。它反对的是把所有信息塞进同一份可执行 spec，导致文档、代码、测试、计划之间大量重复。

更准确地说，它采用的是一种 **Attractor-Guided Engineering**：先用 owner docs 定义系统长期应该收敛到的语义边界和结构关系，再让 code、plan、logs、testing issues、bugs、tests、audit tools 形成互补反馈，把 AI 的高速生成持续拉回这个 attractor。

它的基本判断是：大规模 AI 开发中，最危险的不是信息不够，而是同一信息在多个地方以不同版本存在。AI 会从这些重复信息中挑一个看似合理的版本继续生成，最后形成局部自洽但整体漂移的系统。

所以 Flux 的做法是：

- 实现细节以 live code 为准。
- 长期语义以 owner docs 为准。
- 本次执行边界以 plan 为准。
- 历史轨迹以 logs 为准。
- 人工测试发现的问题以 `docs/testing/` 为准。
- 复杂缺陷诊断以 `docs/bugs/` 为准。
- 低层机械偏离交给 hard gates。
- 高层语义漂移交给 audit prompts 和 closure audit。

这和普通 harness 的区别在于：harness 是测量仪表，而 Flux 的文档和审计结构定义“什么是当前真相、什么能算完成、哪些结论不能升格为基线”。

CI 绿只说明检查通过，不说明检查选择正确。Flux 额外关心：测试是否证明了真实承诺，文档是否描述当前基线，plan 是否真的关闭，审计结果是否经过复核。

## 3. AGENTS.md 把实践变成默认行为

很多 AI 开发实践失败，不是因为规则不好，而是因为规则只存在于人的记忆里。`nop-chaos-flux` 把关键规则写进 `AGENTS.md`，让 AI 每次进入仓库时都读取这些操作约束。

这和普通 README 不一样。`AGENTS.md` 不是介绍项目，而是定义 agent 的执行纪律：

- 做代码变更后必须跑 `typecheck`、`build`、`lint`，相关时跑测试。
- 重大代码变更后必须更新 daily dev log。
- 改设计边界时必须同步相关 architecture docs。
- 起草、执行、审计 plan 前必须先读 plan guide。
- 非平凡 bug 修复后必须评估回归测试，复杂 bug 必须写入 `docs/bugs/`。
- e2e 和 unit tests 全绿时必须把 full-green baseline 记入 daily log，并在 commit message 中显式记录。
- 默认少写注释，只在约束容易误读时写。

这使得 logs、bugs、plans、architecture docs 不是“开发者想起来才写”的附加动作，而是 AI 工作流的一部分。

业务项目可以借鉴一个轻量版 `AGENTS.md`：

```md
# AGENTS.md

- 修改核心业务代码后，必须运行相关测试。
- 重要业务规则变化后，必须更新 `docs/domain/*.md`。
- 重要变更必须记录到 `docs/logs/{year}/{month}-{day}.md`。
- 人工测试发现的问题记录到 `docs/testing/{year}/{month}-{day}.md`。
- 非显然 bug 修复必须写 `docs/bugs/NN-*.md`，并说明回归测试。
- 复杂 plan 标记完成前，必须由独立会话或独立 reviewer 复核。
```

关键点是：不要把流程只写在团队规范里，而要写进 AI 每次都会读的仓库级指令。

## 4. 为什么代码是实现真相源

Flux 的代码注释很少，这不是因为不重视可读性，而是为了降低大规模重构时的信息腐烂。

实现细节变化很快：文件会拆，函数会改名，hook 会迁移，状态结构会重组，测试夹具会重写。如果这些细节大量写进注释、design、plan 或 log，重构时就必须同步维护多份副本。AI 后续读取这些过期细节时，很容易把旧实现误认为当前规则。

因此 Flux 更倾向于：

- 代码表达当前实现。
- 类型和测试保护当前行为。
- 少量注释只解释不容易从代码看出的约束。
- owner docs 解释长期语义，而不是解释某段代码怎么写。
- plan 引用 owner docs，而不是复述 owner docs。

对业务项目来说，这意味着：不要在 design 里写“在 `OrderService.cancel()` 第 42 行调用 `createRefund()`”。应该写“已支付未发货订单取消后必须先进入退款等待态，支付渠道退款成功回调是关闭订单的事实来源”。

前者是实现形状，后者是业务语义。

## 5. Design 应该包含什么

业务项目里的 design / owner doc 不是实现说明书，而是当前业务合同和系统边界的正式说明。

它应该包含：

- 当前支持的业务状态和状态转换。
- 核心术语定义。
- 数据事实来源。
- 哪些入口可以修改事实来源。
- 同步、异步、回调、重试的语义。
- 权限、金额、审计、幂等、回滚等关键约束。
- 对外可观察行为。
- 与相邻模块的边界。
- 明确拒绝的常见误解。

例如订单状态 design 应该写：

- `refund_pending` 表示退款单已创建但支付渠道尚未确认。
- 用户取消和客服取消都必须走同一个退款创建语义。
- 支付回调是订单从 `refund_pending` 进入 `closed` 的唯一事实来源。
- 重复回调必须幂等。
- 已发货退货不属于订单取消状态机。

这些信息能帮助 AI 判断“什么结构是合法的”。它不需要先知道具体代码在哪个文件里，也能避免生成违反业务语义的实现。

## 6. 为什么 design 不写具体实现细节

design 不写大量具体实现细节，不是因为实现细节不重要，而是因为它们的生命周期不同。

业务规则可能稳定几年，但实现会频繁变化。如果 design 绑定实现细节，后果是：

- 文档很快过期。
- AI 会把旧实现细节误读为当前规则。
- 重构时需要同步大量无价值文字。
- 测试容易绑定偶然实现，而不是绑定业务承诺。
- 真正重要的边界被细节淹没。

design 可以写“约束级实现信息”：

- 退款成功以支付渠道回调为准，不以前端轮询结果为准。
- 订单关闭必须在事务内同时写审计日志。
- 所有支付回调处理必须幂等。

但不应该写“代码导游”：

- 在 `OrderService.cancel()` 第 42 行调用 `createRefund()`。
- 使用某个 React hook 保存临时状态。
- 某个测试 mock 应该被调用两次。

前者是长期语义约束，后者是当前实现形状。AI 最需要稳定的语义约束，而不是会快速腐烂的代码导游。

## 7. Plan 和一般 plan 有什么区别

一般 plan 常常是任务清单或路线图：做 A、做 B、做 C。它的问题是看起来有进度，但不一定能判断什么时候真的完成。

Flux 风格的 plan 是可关闭的执行文档。它回答的是：这一轮变更要把哪个结果面收口到什么状态，凭什么算完成。

它不是 design 文档，也不应该复制 design 细节。它应该引用已有 design，说明本次要让 live repo 和 design 的哪一部分重新对齐。

业务项目里的轻量 plan 可以这样写：

```md
# 订单取消退款收口计划

Related: `docs/domain/order-state.md`

## Current Baseline

- 已支付未发货订单取消后当前直接 `closed`。
- `docs/domain/order-state.md` 已规定应先进入 `refund_pending`。
- 支付系统实际需要先创建退款单，再等待异步回调。

## Goals

- 已支付未发货订单取消后进入 `refund_pending`。
- 退款成功回调后订单进入 `closed`。
- 重复回调不会重复关闭或重复记账。

## Non-Goals

- 不处理已发货退货。
- 不处理部分退款。
- 不重写支付渠道适配层。

## Closure Gates

- 状态机单测覆盖取消、退款成功、重复回调。
- API 集成测试覆盖用户取消入口。
- 手动或 E2E 走通一条真实用户路径。
- `docs/domain/order-state.md` 已同步，或明确记录 No owner-doc update required。
```

关键点是：

- plan 从当前事实开始，不从愿望开始。
- plan 写 `Non-Goals`，防止 AI 顺手扩张。
- plan 有 closure gates，不只是待办列表。
- plan 引用 design，不复述 design。
- plan 完成后应能被另一个人或另一个 AI 会话复核。

普通业务项目不需要每个小改动都写 plan。只有跨模块、改核心规则、有迁移、有外部系统、有非显然 bug 时才值得写。

## 8. Plan 的关闭为什么必须独立审查

Flux 里 `completed` 不是实现者自己宣布的状态。plan guide 明确要求：标记 `completed` 前，必须由独立审阅者或独立子 agent 执行 closure audit，并把证据写进 plan 或 daily log。

这条规则针对的是 AI 开发里最常见的“虚假完成”：

- 代码已经改了，但 owner doc 没同步。
- 测试已经补了，但没有证明标题承诺的最终行为。
- plan 的 phase 已打勾，但 Closure Gates 仍缺项。
- repo-wide gates 还没跑，只是 focused test 通过。
- 剩余 live defect 被写成 follow-up 或 deferred。

独立 closure audit 要重新回到 live repo，而不是复述实现者总结。它至少检查：

- in-scope finding 是否全部处理。
- `Goals` / `Non-Goals` 是否仍成立。
- 每个 phase 的 exit criteria 是否完成。
- `Closure Gates` 是否全部满足。
- owner docs、logs、tests 是否与 live code 一致。
- 是否存在被静默降级的缺陷或 contract drift。

这就是为什么 Flux 的 plan 和普通任务列表不同。普通任务列表只追踪“做没做”，Flux plan 还追踪“能不能诚实关闭”。

## 9. Logs 具体怎么记

logs 不是流水账，也不是 source of truth。它是按时间记录的执行轨迹索引，帮助后续 AI 或开发者理解“这件事当时是如何收敛的”。

Flux 的日志是每天一个文件：`docs/logs/{year}/{month}-{day}.md`。`AGENTS.md` 要求重大代码变更后必须更新这个 daily dev log。日志 guide 要求新条目放在文件顶部，保持反向时间顺序。

一般业务项目可以采用很轻的格式，每次重要变更写 3 到 6 行：

```md
### 2026-05-20 (订单取消退款规则)

- 调整订单取消规则：已支付未发货订单取消时进入 `refund_pending`，不再直接回到 `closed`。
- 影响入口：用户取消订单、客服取消订单、支付回调补偿任务。
- 验证：新增订单状态机单测；手动走通“支付后取消 -> 退款成功 -> 订单关闭”路径。
- 非本次范围：部分退款、已发货退货流程仍按旧规则处理。
- 相关文档：`docs/domain/order-state.md`。
```

记录重点是：

- 改了什么业务规则。
- 为什么这样改。
- 影响哪些入口、任务、外部系统。
- 用什么证据验证过。
- 哪些内容明确不在本次范围内。

不要在 logs 里写正式业务规则的完整定义。正式规则应回到 design / owner doc。logs 只负责保留轨迹，避免后续 AI 只能从代码里反向猜历史原因。

## 10. Testing issues 记录人工测试发现的问题

Flux 还有一类容易被忽略的记忆：`docs/testing/`。

它记录人工测试、探索性测试、回归验证中发现的问题，每天一个文件：`docs/testing/{year}/{month}-{day}.md`。每条问题包含：

- 所属组件。
- 问题描述和复现步骤。
- 预期行为。
- 发现方式。
- 状态。

这类记录和 `docs/bugs/` 不一样。`docs/testing/` 更靠近“人工发现的现象队列”，可以先记录未完全诊断的问题；`docs/bugs/` 则记录已经修复并值得长期记忆的复杂缺陷。

它对 AI 开发很重要，因为人工测试经常发现自动化测试没覆盖的真实交互问题。例如：按钮点了没反应、抽屉输入框无法输入、表格排序方向不清楚、某个场景看起来卡死。这些问题被记录后，可以反向推动：

- 新增 E2E 测试。
- 收紧已有 E2E 的最终断言。
- 改进 component lab 场景。
- 更新 e2e standards。
- 把人工复现路径转成可重复的 Playwright 路径。

业务项目可以照搬这个轻量格式。不要只把人工测试问题留在聊天窗口或口头反馈里，否则下一轮 AI 不会知道哪些真实用户路径曾经坏过。

## 11. Bugs 记录复杂缺陷的诊断和防复发经验

`docs/bugs/` 的作用不是记录每个小 bug，而是记录重要 bug 的诊断路径和防复发知识。它的 guide 要求保留：

- 用户或开发者看到的问题。
- 诊断方法，特别是被排除的假设。
- 根因。
- 修复意图。
- 回归测试。
- 未来重构注意事项。

这对 AI 特别关键。AI 不只需要知道“最后怎么修”，还需要知道“为什么其他看似合理的解释是错的”。这些排除路径如果不记录，后续 AI 很容易在相似问题上重新走一遍弯路。

业务项目可以采用简单规则：

- 非显然 bug 写 bug note。
- 跨模块 bug 写 bug note。
- 修复时补了回归测试的 bug 写 bug note。
- 未来重构容易重犯的 bug 写 bug note。

bug note 不要贴大段 diff。代码仍然是实现真相源；bug note 记录的是诊断知识和防复发约束。

## 12. 文档如何形成互补收敛结构

Flux 的关键不是“文档多”，而是“不同文档不抢同一个职责”。

| 材料               | 负责什么                             | 不负责什么                   |
| ------------------ | ------------------------------------ | ---------------------------- |
| code               | 当前实现真相                         | 解释长期业务意图             |
| design / owner doc | 当前语义、边界、合同、拒绝的误解     | 复述函数调用链和临时代码形状 |
| plan               | 本次变更范围、目标、非目标、关闭条件 | 重新设计整个系统             |
| logs               | 时间线、决策轨迹、验证证据索引       | 定义正式规则                 |
| testing issues     | 人工测试发现的问题和复现线索         | 定义长期设计合同             |
| bugs               | 复杂缺陷的诊断、根因、回归保护       | 替代当前代码或架构文档       |
| tests              | 可重复行为证据                       | 证明测试标题一定选对了       |
| hard gates         | 机械规则的快速失败                   | 判断高层语义是否正确         |
| audit prompts      | 找出语义漂移、假完成、测试证明力不足 | 直接替代修复计划             |

这个结构的目的，是避免同一事实在 design、plan、logs、testing、bugs、comments、tests 中各写一遍。重复越多，AI 越容易在重构后读到过期版本。

## 13. 审计工具和审计提示词的作用

Flux 的审计不是只靠人读代码，也不是只靠 AI 随便挑刺。它把审计分成几层：

- hard gates：确定性规则，失败就是硬问题，例如源目录构建产物、React 旧 API、workspace manifest 依赖、i18n key 缺失。
- suspect scanners：启发式嫌疑扫描，例如响应式读取、异步失败路径、FieldFrame 绕过、测试全局泄漏、缺失 renderer marker、性能可疑模式。
- deep audit prompts：按依赖、状态、异步、验证、渲染器、测试、文档、安全、可访问性等维度系统扫描。
- open-ended adversarial review：不按固定维度，而从异常路径、时序攻击、规模压力、契约考古等角度寻找灯下黑。
- calibration patterns：记录历史误报模式，避免审计变成噪音制造机。
- closure audit：计划关闭前由独立视角回到 live repo 核对，防止实现者自报完成。

本仓库中这些工具和文档对应到 `scripts/audit/*.mjs`、`docs/references/audit-tooling.md`、`docs/skills/deep-audit-prompts.md`、`docs/skills/open-ended-adversarial-review-prompt.md`。

业务项目可以做轻量版：

- 金额字段变更扫描。
- 状态机非法跳转扫描。
- 支付回调未做幂等扫描。
- `catch` 后吞错扫描。
- E2E 标题和最终断言不一致审查。
- 人工测试 issue 是否已转成回归测试的审查。
- bug note 中的未来重构约束是否已有测试保护的审查。

重点不是工具复杂，而是把反复出现的错误家族固定成可复用检查，而不是每次都靠人或 AI 从零想起。

## 14. 和 spec 开发的核心差别

可以把两种方式粗略对比为：

| 维度           | 常见 spec-driven AI 开发 | Attractor-Guided Engineering                                        |
| -------------- | ------------------------ | ------------------------------------------------------------------- |
| spec 角色      | 实现蓝图，驱动生成       | 语义边界，不承载实现细节                                            |
| plan 角色      | 技术方案和任务拆解       | 当前切片的收口合同                                                  |
| tasks 角色     | 指导 AI 按步骤写代码     | 只在计划内部服务关闭条件                                            |
| code 角色      | spec 的产物              | 实现真相源                                                          |
| comments       | 可承载解释和代码说明     | 尽量少，避免重构腐烂                                                |
| logs           | 可选记录                 | AGENTS 驱动的 daily dev log，跨 session 轨迹索引                    |
| testing / bugs | 通常不成体系             | 人工问题队列 + 复杂缺陷诊断记忆                                     |
| audit          | 多为 review / checklist  | 工具、提示词、复核、校准组成闭环                                    |
| 完成判断       | 任务完成、测试通过       | live repo、owner docs、tests、logs、独立子 agent closure audit 一致 |

两者不是谁替代谁。Spec-driven 很适合 greenfield、边界清晰、希望快速生成完整应用的场景。Flux 这套更适合长期演化、频繁重构、概念边界比具体实现更重要的系统。

一般业务开发通常介于两者之间。可以借鉴 spec-driven 的结构化需求，也可以借鉴 Flux 的 repo truth 分层。关键是不要把 spec 写成会快速腐烂的代码导游。

## 15. 一般业务项目的最小落地版本

如果只借鉴最小集合，可以这样做：

1. 为核心业务规则写短 design / owner doc。
2. 复杂变更写轻量 plan，包含 `Current Baseline`、`Goals`、`Non-Goals`、`Closure Gates`，并引用相关 design。
3. 重要变更写 logs，记录影响面、验证证据和非本次范围。
4. 人工测试发现的问题写入 `docs/testing/{year}/{month}-{day}.md`，并定期转成 E2E 或回归测试。
5. 非显然 bug 写入 `docs/bugs/`，记录诊断路径、根因、测试保护和未来重构注意事项。
6. 测试审查时检查标题是否真的对应最终业务结果。
7. 重要 plan 关闭前由独立会话、独立 reviewer 或独立子 agent 做 closure audit。
8. 把高频错误家族沉淀成轻量扫描器或审计 prompt。

这样做的目标不是增加仪式，而是让 AI 的高产出建立在可复核的业务真相之上。普通 harness 只能告诉你“检查通过了”，Attractor-Guided Engineering 进一步告诉你“通过的检查是否真的对应业务完成，以及这次变化是否仍然朝正确结构收敛”。

`nop-chaos-flux` 仓库：`https://gitee.com/canonical-entropy/nop-chaos-flux`
