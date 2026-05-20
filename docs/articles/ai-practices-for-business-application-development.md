# 从 Spec-Driven Development 到 Attractor-Guided Engineering

副标题：一般业务开发如何借鉴 `nop-chaos-flux` 的 AI 工程实践。

`nop-chaos-flux` 是一个用 React 19、Zustand、TypeScript、Vite 和 pnpm workspace 重写 AMIS 低代码渲染器的实验性项目。它不只是一个页面应用，而是包含 DSL、公式、编译器、action runtime、React renderer runtime、表单和数据渲染器、Flow Designer、Spreadsheet、Report Designer、Word Editor 的大型前端框架型仓库。

这个项目长期使用 AI 辅助开发。值得注意的不是“AI 写了多少代码”，而是另一个结果：随着开发推进，模块边界越来越清楚，文档分类越来越稳定，测试和审计越来越能抓住真实问题，代码质量没有在演化中下滑，反而在不断改进。

我最近做了一次内部分享。分享之后发现，很多人并没有真正理解这套做法和 spec-driven development 的差别。问题不在于大家没有写 spec。很多人已经在使用 spec-driven，甚至使用的是 OpenSpec 这样有 `specs`、`changes`、`proposal`、`design`、`tasks`、`archive` 的工具。

我前面几版解释也犯了同一个错误：一直在问 OpenSpec 的这些 artifact 能不能对应 Flux 的 owner docs、plans、logs、bugs、tests、audit。这个问法本身就偏了。

AGE 的中心不是 spec，也不是 change package，而是 **attractor**。

## 先把层级摆正

`nop-chaos-flux` 的 attractor 方法论有一个很硬的层级：

**状态空间 -> 吸引子 -> 轨迹 -> 控制**。

这句话的意思不是“多写几条规则”。它说的是：AI 大规模开发首先是一个动力系统问题。AI 会快速展开大量可能状态。真正关键的不是先加更多 guardrail，而是先定义系统长期应该被拉回到什么结构。

这里的 attractor 也不是一个被完整写出的终点，不是项目路线图，不是“允许活动区域”，更不是边界的加强版。它更像少量高阶约束隐式定义出的稳定结构。局部实现可以变化，整体仍会被这些结构关系拉回同一类形态。

在这个仓库里，首先定义 attractor 的不是 plan、lint、test、audit，也不是某个 spec 文件，而是 `docs/architecture/` 下带 precedence 的 owner-doc 体系。

`docs/architecture/README.md` 定义架构文档层级和阅读顺序；`flux-design-principles.md` 定义方向；`frontend-programming-model.md` 定义顶层规范不变量；更窄的 architecture docs 在各自主题内定义局部 contract。

这些文档不是把所有正确实现枚举出来，而是像方程一样定义一个稳定结构：哪些原语存在，哪些依赖方向合法，哪些 owner 边界不能破，哪些旧模式不再属于正确状态空间。它们先定义可持续存在的状态簇，后面的实现、测试、计划和审计才有共同参照。

Plan、verification、audit、logs、bugs 都在后面。它们不是 attractor 本身，而是让系统轨迹持续贴近 attractor 的 harness。

这正是我前面理解不够准的地方：如果把讨论停在 “OpenSpec 是规格演化，Flux 是多事实源对齐”，仍然没有把第一性问题说出来。Flux/AGE 不是以 spec 演化为中心，而是以 attractor 定义和轨迹收敛为中心。

## OpenSpec 的结构强在哪里

OpenSpec 的长处是真实存在的。

它把一类工作结构化了：

- `openspec/specs/` 保存当前能力的行为规格。
- `openspec/changes/` 保存拟议变更。
- `proposal.md` 说明为什么改、改什么、影响什么。
- `design.md` 必要时记录本次 change 的技术设计。
- `tasks.md` 给 agent 和人一个实施 checklist。
- `changes/<name>/specs/` 用 `ADDED` / `MODIFIED` / `REMOVED` / `RENAMED` 记录规格 delta。
- archive / specs apply 通过固定规则把 delta 应用回 main specs。

这套机制的一个重要价值，是降低规格更新成本。OpenSpec 不是每次让 AI 自由理解整份需求再随意改文档，而是通过固定 section、requirement header matching、delta application，把结构化变更合并回主规格。

这很适合某些行为规格明确、希望可解析、可归档、可回写的场景。

## OpenSpec 的限制在哪里

OpenSpec 的限制不是“太弱”。它支持探索和自定义 workflow，但默认 spec-driven 主线仍是把很多协作材料组织进结构化 spec/change package。

它的 spec 格式很显式：`Requirement`、`Scenario`、`SHALL` / `MUST`、delta sections。这对工具解析友好，但作为通用项目知识组织方式就不够灵活。

很多仓库知识并不天然长成 requirement/scenario：

- 架构层级和 precedence。
- 术语误读历史。
- 外部研究材料。
- 某次源码审计的分析结论。
- 人工测试发现的现象。
- 一个复杂 bug 的排除路径。
- 一次 plan 为什么不能关闭。

如果都要先翻译成 spec/change 才能获得正式位置，就会增加转换成本，也会损失原始语境。外部文档、讨论记录、分析报告、PPT、bug 复盘，本来可以直接成为仓库记忆；强行转成 requirement/scenario，反而容易把信息压扁。

OpenSpec 的执行部分也没有 Flux plan 那么紧凑和严格。`tasks.md` 是 checklist，`/opsx:verify` 是可选的 agent 检查提示，不是 archive 的硬关闭门禁；archive 会检查 task 状态并提示风险，用户确认后仍可继续。但这和 Flux plan 的关闭机制不是一回事。

Flux plan 必须从 live repo 的 `Current Baseline` 开始，写清 `Goals`、`Non-Goals`、执行项、proof、`Closure Gates`。它不能只靠任务勾选关闭。标记 `completed` 前，还必须有独立子 agent 或独立 reviewer 回到 live repo 做 closure audit。

这比 OpenSpec 的 tasks/apply/verify 更紧凑，也更严格。紧凑在于一份 plan 就把当前基线、边界、执行、证明、关闭条件放在一起；严格在于“完成”不能由实现者或同一上下文自证。

## 为什么 spec-driven 容易变成任务导向

这不是说 spec-driven 一定会失败。它的问题在于，默认结构很容易把人和 AI 的注意力拉回“这次 change 怎么完成”。

一次 change 通常会有 proposal、design、tasks、delta specs。它当然比一句口头需求好得多，但它天然围绕一次变更组织：为什么改、改什么、怎么做、做完哪些 checklist。时间一长，spec-driven 很容易变成一种更正式的任务派发系统。

这种任务导向有一个隐蔽风险：spec 更新了，tasks 勾了，archive 做了，AI 和人都会获得很强的完成感。但系统是否真的更接近长期结构，不是由这次 change 自己证明的。它要回到 owner docs、live repo、测试、日志和独立审计里看。

如果试图把 spec 长期维护到 Flux 这种精度，成本通常会更高。因为 Flux 维护的不是单一规格树，而是一组职责不同的仓库记忆：architecture owner docs 定义 attractor，plans 定义局部轨迹收口，logs 记录演化，bugs 保存复杂缺陷诊断，testing issues 保存人工发现，analysis 保存研究判断，audit 负责回看 live repo。

把这些都压进 spec/change 结构，会产生持续转换成本：外部材料要改写成 requirement/scenario，bug 排查路径会被压扁，架构 precedence 不容易表达，closure evidence 也容易退化成任务勾选。最后维护的不是更轻的 spec，而是一套更重、更不自然的事实同步系统。

所以更稳妥的定位是：spec-driven 可以作为 AGE 的一个局部 harness，用来管理行为规格演化；但它不应该替代 architecture owner docs，也不应该替代 plan closure、logs、bugs、testing 和 audit 这些各自独立的仓库记忆。

## 单独要看 owner doc 怎么办

这能看出两种方法的根本差别。

如果在 Flux 里只是要查 renderer runtime 的当前 owner contract，可以直接从 `docs/index.md` 路由到 `docs/architecture/renderer-runtime.md` 和相关 reference。你不需要创建一个 change，不需要 proposal，不需要 tasks，也不需要把问题改写成 spec delta。

如果只是一次研究，可能写入 `docs/analysis/`。如果只是人工测试发现，先进入 `docs/testing/`。如果是复杂 bug，进入 `docs/bugs/`。如果是一次执行收口，才写 plan。稳定基线变化，才回到 owner doc。

Flux 的文档组织是自由的，但不是随意的。自由指的是：它不强迫所有知识先进入同一套 artifact workflow。约束指的是：每类材料都有明确职责，不能乱抢事实地位。

OpenSpec 的组织更结构化。它适合把拟议行为变更放进 change package，再把规格 delta 回写到 main specs。但通用仓库知识路由不是它默认主线要解决的问题。

## tasks 不是 plan

这一点必须说清楚。

OpenSpec 的 `tasks.md` 不对应 Flux 的 `plans`。

`tasks.md` 最多对应 Flux plan 里的执行清单片段，或者当前会话的 todo。它能帮助 AI 不漏步骤，但它不回答这些问题：

- 当前 live repo 基线是什么？
- 本次明确不做什么？
- 哪些证据能证明真的完成？
- 哪些缺陷不能降级成 follow-up？
- 谁独立复核完成状态？

Flux plan 的价值不在于“任务更多”，而在于它是一份局部轨迹的关闭合同。

所以 tasks 对 AI 有必要，但 tasks 不是事实源。`- [x]` 只能说明执行者声称某项完成了。真正的证明要回到当前代码、tests、owner docs 和独立审查。

这并不违反“代码是当前实现事实源”。任务清单只是执行控制面，不应该描述当前实现真相，也不应该被当成完成证明。

## 变化来源不是只有 spec change

OpenSpec 的路径很清楚：围绕 specs 和 changes 组织行为规格演化。

Flux 的变化来源更广：

- 用户提出的新需求。
- 阅读源码发现的架构漂移。
- audit 发现的 owner boundary 问题。
- testing issue 暴露的交互问题。
- bug note 记录的历史回归风险。
- 外部研究或 analysis 得出的设计判断。
- plan closure audit 推翻了此前“已完成”的判断。

这些来源不一定都应该先变成 spec delta。它们可以先进入 analysis、testing、bugs、logs、plans，或者直接更新 owner doc。是否需要最终变成某种行为 contract，取决于它是不是长期基线的一部分。

这就是 Flux 文档组织自由度的意义。它允许不同来源的信息先停在合适的位置，而不是全部塞进一个规格演化通道。

## 文件进文件出为什么重要

我反复强调日常开发要尽量做到文件进、文件出。它不是文档洁癖，而是让 attractor 和 harness 有承载物。

文件进，是指输入不要只停留在聊天窗口里。哪怕内容比较散乱，也先写到需求文件、分析文件或计划文件里，再在 OpenCode 中 `@` 这个文件。

文件出，是指输出不要直接打印在窗口里就结束。重要结论、分析、计划、测试记录、bug 诊断、架构约束，都应该写入 `docs/`，并按照职责分类保存。

这一步的重点不是“多写文档”。输出一旦分类落盘，就进入了仓库记忆：该成为长期规则的，进 owner doc；该描述本次收口的，进 plan；该记录执行轨迹的，进 log；该保存人工发现的，进 testing；该沉淀复杂缺陷诊断的，进 bugs；该保留研究判断的，进 analysis。

聊天窗口是临时上下文，文件才是仓库记忆。

## 代码是当前实现事实，不是唯一事实

“代码是事实源”这句话也容易被说错。

更准确地说：代码是当前实现事实源。类型和测试保护当前行为。architecture owner docs 定义 attractor，也就是系统长期应该收敛到的结构。logs、bugs、analysis、testing issues 记录轨迹和外部化记忆。

这些并不冲突。冲突发生在两种情况下：

- 文档开始复述易腐烂的实现细节。
- 文档的完成状态被当成代码已经正确的证明。

OpenSpec 的 behavior-first boundary 其实也在避免第一个问题：behavior spec 应该写可验证行为，不写内部实现细节。Flux 进一步强调第二个问题：即使文档写的是正确行为，也不能替代当前仓库验证。真正关闭时必须回到代码、测试、owner docs、logs 和审计证据。

## 真正的差别

OpenSpec 解决的是：如何用结构化 specs / changes / delta / archive 组织行为规格的更新。

AGE 解决的是：在 AI 高速展开状态空间时，系统如何先定义 attractor，再通过 plan、verification、audit、logs、bugs、analysis、testing issues 等 harness，让轨迹持续收敛。

这不是“OpenSpec 不好，Flux 更高级”。它们解决的问题层级不同。

OpenSpec 的强项是结构化规格工作流。Flux/AGE 的强项是以 architecture owner docs 定义吸引子，再用自由但有职责边界的文档路由和严格 closure harness 让仓库长期收敛。

从 spec-driven development 到 Attractor-Guided Engineering，不是从“写 spec”走向“不写 spec”，而是从“把变更组织成规格更新”，走向“定义系统应向哪里长期收敛，并让每一轮 AI 生成都被这个结构持续拉回”。

## 一般业务开发可以借什么

普通业务项目不需要照搬 `nop-chaos-flux` 的完整治理，也不需要照搬 OpenSpec 的所有 artifact。

最小可以先借四件事：

第一，文件进文件出。输入先写到需求、分析或计划文件，再 `@` 给 AI；输出写入 `docs/`，不要只留在聊天窗口。

第二，为核心业务写 owner doc，先定义业务吸引子。它不写代码导游，只写事实来源、状态转换、所有权边界和明确拒绝的误解。

第三，复杂变更写轻量 plan。它包含当前基线、目标、非目标、执行清单、证明项和关闭条件。完成前最好由独立会话或独立 reviewer 复核。

第四，把反复出现的问题变成仓库记忆。人工问题进 testing，复杂 bug 进 bugs，研究结论进 analysis，高频错误进审计脚本或审计 prompt。

规格更新是必要的一层。系统收敛还需要 attractor。

延伸阅读：

- `https://github.com/github/spec-kit`
- `https://docs.anthropic.com/en/docs/claude-code/common-workflows`
- `https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot`
- `https://code.visualstudio.com/docs/copilot/copilot-customization`
- `https://aider.chat/docs/usage/conventions.html`
- `https://gitee.com/canonical-entropy/nop-chaos-flux`
