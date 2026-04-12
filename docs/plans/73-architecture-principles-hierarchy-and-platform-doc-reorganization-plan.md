# 73 Architecture Principles Hierarchy And Platform Doc Reorganization Plan

> Plan Status: planned
> Last Reviewed: 2026-04-12
> Source: `docs/index.md`, `docs/architecture/README.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/report-designer/design.md`, `docs/components/index.md`, `docs/standardization.md`, `docs/analysis/2026-04-01-docs-design-review-2026-03-29.md`, plus live audit of `docs/architecture/`, `docs/components/`, and root-level docs routing files
> Related: `docs/plans/57-architecture-docs-grouping-and-gradual-migration-plan.md`, `docs/plans/10-docs-accuracy-and-structure-correction-plan.md`

## Purpose

这份计划用于收口 `docs/architecture/` 当前仍未解决的一条结果面：

- 为 architecture 文档建立可长期维护的 hierarchy baseline 和 status matrix，并据此重写索引与后续迁移归属。

本计划额外冻结一个写作原则：`docs/architecture/` 只承载面向最终版的核心架构设计与当前 authoritative baseline，不承载历史演进叙事、迁移过程记录、争议对比、阶段性取舍日志或执行历史；这类内容应分别留在 `docs/discussions/`、`docs/analysis/`、`docs/plans/`、`docs/logs/` 等目录，避免 architecture 文档混入会让 AI 或读者分心的历史上下文。

同时，architecture 文档必须保留对“当前为什么这样设计”的清晰解释，但这种解释应服务于最终版设计本身：说明当前选择要防止什么误解、满足什么约束、与相邻概念如何区分，而不是展开完整历史沿革或旧方案演化过程。

具体表现为三个紧密相关的问题：

- 文档层级不清，尚未明确区分“纲领层 / 总规范层 / 平台扩展架构层 / 专题规范层”。
- `flow-designer` / `report-designer` 的文档地位被目录结构弱化，尚未被明确呈现为 Flux 承载复杂领域编辑器、工作台和 host-platform abstraction 的核心架构部分。
- `docs/architecture/` 中仍混有组件级设计、派生解释、活跃规范和历史/阶段性设计，导致读者难以判断哪些文档是最高优先级、哪些文档应迁往 `docs/components/`、哪些文档需要显式状态标记。

本计划的目标不是立刻做一次性全量路径迁移，也不是在本计划内完成所有 misplaced 文档的物理搬家；本计划只负责建立 hierarchy baseline、逐文档状态矩阵、核心索引改写，以及后续迁移 owner 归属。

## Current Baseline

- Plan 57 已完成；它只解决了“先提供 grouped index、避免一次性大搬家”，并未解决纲领层级、platform-extension 核心地位、逐文档状态矩阵和迁移 owner 归属问题。
- `docs/index.md` 已承担整个 `docs/` 树的任务路由，但 `docs/architecture/README.md` 目前仍更像 grouped navigation，而不是 architecture 子树内部的 hierarchy/index。
- `docs/architecture/flux-design-principles.md` 当前内容实际承担最高层设计原则/纲领说明，但文档自述仍将自己表述为从 `frontend-programming-model.md` 提炼出的派生参考，这与“核心纲领”定位不一致；同时，`frontend-programming-model.md` 目前仍是 live normative precedence 文档，这两个层级关系尚未被清楚表达。
- `docs/architecture/flow-designer/` 与 `docs/architecture/report-designer/` 已形成稳定文档族，但当前目录和索引表达仍容易让它们看起来像“specialized domains”，而不是 Flux 平台扩展架构的核心组成。
- `docs/architecture/condition-builder.md` 与 `docs/components/condition-builder/design.md` 已出现主题重叠；`docs/architecture/code-editor.md` 也更接近组件/复合控件设计，而不是通用架构层规则。
- `docs/architecture/complex-control-host-protocol.md`、`flow-designer/`、`report-designer/` 已经描述了跨复杂领域编辑器的 bridge、snapshot、host scope、action namespace、shell/wiring 抽象，但这套“平台扩展架构”尚未在 architecture index 中被明确前置。
- 现有 architecture 文档普遍缺少统一的 role/status/depends-on 标识，导致“governing principles / normative / platform architecture / reference / historical” 边界主要依赖读者自行判断。
- 多份 architecture 文档仍混有历史原因、阶段性迁移说明、旧方案对比或 plan-derived 叙事，这些内容更适合放在 `analysis` / `plans` / `logs`，不应继续占用 architecture 主文档注意力。
- 另一侧也存在相反风险：若只保留结论、不写当前选择的设计理由，AI 或新读者容易把架构规则误读成任意约定，从而在相邻方案之间产生幻觉式补全。

## Goals

- 明确建立 `docs/architecture/` 的分层基线：纲领/原则层、总规范层、平台扩展架构层、专题规范层。
- 把 `flux-design-principles.md` 正式确认为 Flux 架构的核心纲领文档，并明确它指导整体架构方向，但不取代 `frontend-programming-model.md` 的 normative precedence。
- 把 `flow-designer` / `report-designer` 与复杂控件 host 协议明确呈现为 Flux 核心平台扩展架构，而不是普通领域附录。
- 逐文档核实 `docs/architecture/` 当前 active baseline、派生解释、组件设计、重复主题和可能的历史残留，并形成状态矩阵。
- 为 `docs/architecture/README.md` 建立真正的 architecture index：说明重要性、阅读顺序、依赖关系、文档角色、迁移边界。
- 在一个明确的、文件可见的状态矩阵中记录哪些文档应继续留在 `docs/architecture/`，哪些应迁移到 `docs/components/`、`docs/references/` 或其他目录，并为后续迁移建立 successor 归属。
- 明确冻结 `docs/architecture/` 的内容约束：只写最终版核心架构设计与当前规范，不写历史变革、阶段性争论、执行过程和方案演进叙事。
- 明确冻结 `docs/architecture/` 的解释约束：每篇核心文档都应说明当前设计选择的理由和边界，避免 AI/读者把规则误解为任意结论，但这些理由应围绕当前 final-state design 展开，而不是转成历史回顾。

## Non-Goals

- 不在本计划内一次性移动所有 `docs/architecture/` 文件。
- 不为了目录整洁而立刻改写整个仓库的所有 cross-links。
- 不重写每一篇 architecture 文档的全部技术内容；只修改收口 hierarchy、role、status 和导航所必需的内容。
- 不把 `flow-designer` / `report-designer` 简化成“领域编辑器案例”；相反，本计划明确把它们作为 Flux 平台扩展架构的一部分来处理。
- 不把 `flux-design-principles.md` 降级为普通 reference；本计划以“核心纲领”定位为前提。
- 不在本计划内实际执行大规模 physical migration；若需要批量搬迁和 cross-link rewrite，应拆分为 successor plan。
- 不把 architecture 文档变成历史评审或决策过程档案；此类信息应迁出到 `analysis/plans/logs/discussions`。
- 不把“为什么这么设计”也一并删除；缺少 rationale 的 architecture 文档同样不合格，因为它会放大 AI 和读者的误读空间。

## Scope

### In Scope

- `docs/architecture/README.md`
- `docs/index.md` 中与 architecture 路由直接相关的条目
- `docs/architecture/flux-design-principles.md`
- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/README.md`
- `docs/architecture/flow-designer/`
- `docs/architecture/report-designer/README.md`
- `docs/architecture/report-designer/`
- `docs/architecture/condition-builder.md`
- `docs/architecture/code-editor.md`
- `docs/components/index.md`
- `docs/components/condition-builder/design.md`
- `docs/standardization.md`
- `docs/references/architecture-doc-status-matrix.md`
- 其他被核定需要 role/status/placement 判定的顶层 `docs/architecture/*.md` 与 stable doc-family README entries
- 新的 architecture 文档状态矩阵与渐进迁移说明
- `docs/logs/2026/04-12.md`

### Out Of Scope

- 非文档源码改动
- 一次性 physical move 全仓所有 architecture 文档
- 全量修补仓库中所有历史 cross-links
- 对 `flow-designer` / `report-designer` 内部所有专题文档进行全面内容重写
- 逐一修改所有被矩阵标记为未来迁移候选的文档正文

## Execution Plan

### Phase 1 - Freeze The Hierarchy Model

Status: planned
Targets: `docs/architecture/README.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-core.md`

- [ ] 冻结 architecture 顶层层级模型：`governing principles`、`normative architecture`、`platform extension architecture`、`focused subsystem docs`。
- [ ] 明确 `flux-design-principles.md` 作为“核心纲领/原则层”文档的正式定位，并与 normative precedence 分离表达。
- [ ] 明确 `frontend-programming-model.md`、`flux-core.md`、`renderer-runtime.md` 等总规范层文档与纲领层之间的依赖关系与职责边界。
- [ ] 明确总规范层内部的 precedence 模型：`frontend-programming-model.md` 拥有 primitive/core-boundary 级 precedence，其他专题规范文档保留各自领域内的 local precedence。
- [ ] 明确 `flow-designer` / `report-designer` / `complex-control-host-protocol.md` 归属于“platform extension architecture”，并解释其核心性来自“复杂领域编辑器抽象通用化”，而不是单纯领域功能。
- [ ] 核对并收口 `flux-dsl-vm-extensibility.md` 与上述 platform-extension 定位之间是否存在冲突或过时表述。
- [ ] 冻结 architecture 文档写作边界：architecture 只描述 final-state core design 与 current baseline，历史演进和执行过程统一转移到其他 docs families。
- [ ] 冻结 architecture 文档解释边界：必须写清当前选择的 rationale、约束和边界，但不展开完整历史演进。

Exit Criteria:

- [ ] `docs/architecture/README.md` 明确写出四层 hierarchy，并在阅读顺序中单独列出 `flux-design-principles.md`。
- [ ] `docs/architecture/README.md` 或相关文档明确写出：`flux-design-principles.md` 指导总体方向，但 `frontend-programming-model.md` 保持 normative precedence。
- [ ] `docs/architecture/README.md` 或相关文档明确写出：normative precedence 既有顶层 primitive/core-boundary precedence，也有专题文档的 local precedence。
- [ ] `docs/architecture/README.md` 不再把 `flow-designer` / `report-designer` 与组件级设计文档放在同一逻辑桶中。
- [ ] `flux-dsl-vm-extensibility.md` 不再与新的 platform-extension hierarchy 公开冲突，或已在矩阵中被明确标记为需后续处理。
- [ ] `docs/architecture/README.md` 明确写出 architecture 文档只关注 final-state design，而不是历史演进记录。
- [ ] `docs/architecture/README.md` 明确写出 architecture 文档仍必须包含 current-design rationale，避免把规范写成无解释的结论列表。

### Phase 2 - Build The Document Status Matrix

Status: planned
Targets: `docs/references/architecture-doc-status-matrix.md`, top-level `docs/architecture/*.md`, `docs/architecture/flow-designer/README.md`, `docs/architecture/report-designer/README.md`, `docs/components/index.md`, `docs/standardization.md`, overlapping component/design docs

- [ ] 在 `docs/references/architecture-doc-status-matrix.md` 中为顶层 `docs/architecture/*.md` 逐文档建立状态矩阵。
- [ ] 在同一矩阵中加入 stable doc-family README entries 与 root-level routing summary docs（至少 `flow-designer/README.md`、`report-designer/README.md`、`docs/standardization.md`）的状态行。
- [ ] 状态矩阵至少标出：`role`、`status`、`primary owner directory`、`depends on`、`overlap/migration note`。
- [ ] 明确哪些文档可以继续留在 architecture 主干，哪些需要迁移到 `docs/components/` 或其他目录。
- [ ] 明确哪些文档存在主题重叠或双份并存，并给出 owner 文档和 successor 处理方式。
- [ ] 对 `condition-builder.md`、`code-editor.md`、以及其他边界不清文档给出是否迁移、合并、保留但降层的明确结论。
- [ ] 对混入历史演进、迁移记录、旧方案对比的 architecture 文档给出“删除 / 精简 / 外移到 analysis-plans-logs”结论。
- [ ] 对“只有结论、缺少当前设计理由”的 architecture 文档给出补充 rationale 的结论，避免清理历史时把设计动机也一并删空。

Exit Criteria:

- [ ] `docs/references/architecture-doc-status-matrix.md` 已列出所有顶层 `docs/architecture/*.md` 文档，以及受 hierarchy 影响的 stable doc-family README / root routing docs，而不是抽样记录。
- [ ] 每个被标记为 overlap/misplaced 的文档都有明确 owner decision 或 successor note。
- [ ] `condition-builder.md` 与 `code-editor.md` 的去向在矩阵中是显式结论，不是开放问题。
- [ ] 每个被标记为“历史噪音过重”的 architecture 文档都有明确的清理策略。
- [ ] 每个被标记为“rationale 不足”的 architecture 文档都有明确的补充策略。

### Phase 3 - Independent Review Passes And Corrections

Status: planned
Targets: 本计划、`docs/references/architecture-doc-status-matrix.md`, `docs/architecture/README.md`, `docs/index.md`

- [ ] 进行独立子 agent 审核 pass A：核对 hierarchy/placement/status-matrix 结论是否与 live repo 一致。
- [ ] 进行独立子 agent 审核 pass B：核对本计划的 scope、phase、exit criteria 和 successor boundary 是否可执行。
- [ ] 根据 pass A/B 的 findings 回写计划、状态矩阵和索引草案。
- [ ] 进行一次独立子 agent follow-up pass，确认已无未解决的高优先级 hierarchy 或 owner 问题。
- [ ] 在 `docs/logs/2026/04-12.md` 和/或本计划 `Closure Audit Evidence` 中记录三次独立审阅的 task id、结论和后续修订点。

Exit Criteria:

- [ ] 已记录至少三次 fresh-session 独立审阅结果：doc-role audit、plan-quality audit、follow-up audit。
- [ ] 三次独立审阅结果已在仓库文件中留下可追溯证据，而不是只存在会话记录里。
- [ ] follow-up audit 不再报告高优先级 hierarchy 误判、owner 漏项或 open-ended phase 问题。

### Phase 4 - Rewrite The Architecture Index And Routing Notes

Status: planned
Targets: `docs/architecture/README.md`, `docs/index.md`, `docs/architecture/flow-designer/README.md`, `docs/architecture/report-designer/README.md`

- [ ] 将 `docs/architecture/README.md` 改写为真正的 architecture index，说明文档层级、阅读顺序、依赖关系、角色说明和迁移规则。
- [ ] 在 `docs/index.md` 中保留面向整个 `docs/` 树的任务路由，同时避免与 architecture index 重复承担同一层级说明。
- [ ] 显式增加“纲领层 / 总规范层 / 平台扩展架构层”的阅读路径。
- [ ] 更新 `docs/architecture/flow-designer/README.md` 与 `docs/architecture/report-designer/README.md`，使它们与新的 platform-extension 架构定位一致。
- [ ] 视需要更新 `docs/standardization.md`，避免其与新的 architecture hierarchy 或 owner 归属冲突。
- [ ] 为 future physical migration 提供稳定过渡层，避免在无 index 的情况下直接搬家。
- [ ] 在 architecture index 中显式说明：历史变革、方案比较、执行过程不属于 architecture 主文档阅读路径。

Exit Criteria:

- [ ] `docs/architecture/README.md` 明确列出 reading order、role legend 和 migration rule。
- [ ] `docs/index.md` 与 `docs/architecture/README.md` 分工清楚：前者负责全局 routing，后者负责 architecture hierarchy。
- [ ] `flow-designer/README.md` 和 `report-designer/README.md` 不再让读者误读为普通 specialized-domain 附录。
- [ ] `docs/standardization.md` 未因新的 hierarchy/owner 规则而变成 stale summary。
- [ ] architecture index 已明确把历史材料路由到 `analysis/plans/logs/discussions`，避免把历史内容继续塞回 architecture。
- [ ] architecture index 已明确要求核心文档解释当前选择的 rationale、约束和边界，避免 AI 因为缺少解释而自行脑补。

### Phase 5 - Record Owner Decisions And Successor Work

Status: planned
Targets: `docs/references/architecture-doc-status-matrix.md`, `docs/architecture/README.md`, `docs/logs/2026/04-12.md`

- [ ] 对已经达成共识的 overlap/misplaced 文档，记录 owner decision、recommended destination 和是否需要 successor move。
- [ ] 若 physical move 成本过高，则只记录 successor scope 和 redirect strategy，不在本计划内执行大规模搬迁。
- [ ] 为需要后续执行的 physical migration 或大规模 cross-link rewrite 建立明确的 successor scope，避免本计划无限膨胀。
- [ ] 在 daily log 中记录 hierarchy 决策、platform-extension 定位、状态矩阵落点和后续承接工作。

Exit Criteria:

- [ ] `docs/references/architecture-doc-status-matrix.md` 对每个需迁移/合并文档都写出 destination 或 successor note。
- [ ] 剩余 physical move 工作有明确 successor owner，而不是隐含 debt。

## Validation Checklist

- [ ] `flux-design-principles.md` 的“核心纲领/原则层”定位被 architecture index 和相关文档明确承认
- [ ] `frontend-programming-model.md` 仍被明确保留为 normative precedence，同时其与纲领层关系被写清楚
- [ ] `flux-core.md`、`renderer-runtime.md` 等总规范层与纲领层的依赖关系被写清楚
- [ ] `flow-designer` / `report-designer` / `complex-control-host-protocol.md` 被明确为 Flux 平台扩展架构，而不是普通 specialized domain
- [ ] `docs/architecture/README.md` 明确说明重要性、阅读顺序、依赖关系和文档角色
- [ ] `docs/index.md` 与 architecture index 的职责边界清晰
- [ ] `docs/references/architecture-doc-status-matrix.md` 已建立并经过独立子 agent 审核
- [ ] 重叠主题至少有 owner decision 或 successor 处理路径
- [ ] architecture 文档体系已明确冻结为 final-state/core-design-only，不再把历史演进叙事当作 architecture 主内容
- [ ] architecture 文档体系已明确要求保留 current-design rationale，避免把架构规则写成无上下文的黑盒结论
- [ ] `docs/logs/2026/04-12.md` 已记录本轮计划和关键决策
- [ ] 独立子 agent review evidence 已记录并表明主要分歧已收敛

## Risks And Rollback

- 最大风险不是路径迁移本身，而是错误地下调 `flow-designer` / `report-designer` 的架构地位，或者继续让 `flux-design-principles.md` 与 `frontend-programming-model.md` 角色重叠。
- 第二风险是把“目录重组”当成主目标，反而掩盖 hierarchy 和 owner 问题。
- 第三风险是重复主题处理不彻底，导致 index 改好了，但 owner 文档仍是双份并存。

Rollback guidance:

- 先冻结 hierarchy 和状态矩阵，再做任何 physical move。
- 如果某份文档的 owner 归属尚有争议，先加 status/redirect note，不要强行迁移。
- 若审阅结果发现某个 phase 过宽，应拆出 successor plan，而不是在执行中临时扩 scope。

## Closure

Status Note: fill after execution and closure audit.

Closure Audit Evidence:

- Reviewer / Agent: fill after independent closure audit.
- Evidence: fill with task ids, cited findings, and daily-log references before marking the plan `completed`.

Follow-up:

- If physical directory migration across doc families is still required after hierarchy/index stabilization, create a dedicated successor plan for path migration and cross-link rewrite.
- If specific component-design docs need migration out of `docs/architecture/`, assign each family to a concrete successor slice instead of leaving the move implicit.
