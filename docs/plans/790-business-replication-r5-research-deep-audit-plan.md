# 790 R5 调研阶段深度审计（business-page-replication roadmap M1-R5）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R5（依赖 R4 done）、roadmap 审计纪律（L21：deep audit 对照 live repo 与上游 roadmap 核对复刻保真度与 contract drift）
> Related: R1-R4 交付（`docs/analysis/business-replication/r{1,2,3,4}-*.md`、plan 786-789）；`docs/audits/` 惯例（round2-index 先例）

## Purpose

对 M1 调研阶段四份交付（R1-R3 盘点 + R4 矩阵）执行深度审计：由独立 fresh 子 agent 对照 live repo 与上游 roadmap，核对 renderer 能力引用、上游锚点与 contract drift，产出审计报告与 issue 清单。收口为 roadmap §2 R5 状态 `todo → planned → done`。

## Current Baseline

- R1-R4 交付在案且各自 plan（786-789）均 completed（789 closure 已落地并核验：头部 completed + 复核 approved）。
- 累计交付面：21 页盘点、G1-G26 分级、41 候选页、两条登记冲突裁定（G6/G26）。
- 审计纪律（roadmap L21 + AGENTS.md 协作纪律）：deep audit 输入只用三件套（工作项清单 + diff 摘要 + 验证输出），不复用执行者上下文；Pass = 零 Blocker 零 Major（`docs/audits/00-audit-execution-guide.md` 词汇）。
- 本计划执行 session 的职责是**组织审计**（写审计任务书、派 fresh 子 agent、归档报告、处置 issue），不得自审。

## Goals

- 新建 `docs/audits/business-replication/r5-research-deep-audit.md`：独立 fresh 子 agent 的审计报告，含逐项核对表（R1-R4 每份交付的 renderer type 引用、上游锚点、缺口分级的抽查结果）+ issue 清单（Blocker/Major/Minor + 证据）+ verdict。
- Major/Blocker issue 当场处置（修复→复审循环）直至 Pass；Minor 登记 issue 清单并明确处置口径（限期修复或接受为残余债）。
- roadmap §2 R5 状态回写。

## Non-Goals

- 不重写 R1-R4 交付文档（修复以勘误/定点修订方式落，不改结论结构）。
- 不审计上游仓库本身的正确性（上游 roadmap 是需求输入，不是审计对象）。
- 不做 M2 设计阶段内容（D5/D6 另有审计）。

## Scope

### In Scope

- 审计任务书撰写（核对范围：R1-R4 全部 renderer type 归属声称、上游 roadmap 行号锚点抽核、G1-G26 分级与登记去向的承重结论、21 页可行性结论的依据链）。
- 派独立 fresh 子 agent 执行审计（输入三件套，迭代至 Pass）。
- issue 处置与审计报告归档；roadmap §2 R5 回写。

### Out Of Scope

- R6 开放审计（另立工作项，不复用本审计上下文）。
- 缺口实现、retention 裁决。

## Failure Paths

| 编号               | 触发                         | 行为                                                                                     | 可重试 | 用户可见表现               |
| ------------------ | ---------------------------- | ---------------------------------------------------------------------------------------- | ------ | -------------------------- |
| audit-major-found  | 审计发现 Blocker/Major       | 修复→复审循环直至 Pass（≤2 轮）；修复记录进审计报告                                      | 是     | 审计报告 verdict 终态 Pass |
| audit-unresolvable | 审计发现不可修复的结论性错误 | 回写对应 R1-R4 交付的 Outdated/勘误标注，roadmap R1-R4 相应行加注，plan 不得标 completed | 是     | 勘误标注 + issue 清单      |

## Test Strategy

不适用：纯文档审计组织，无行为变更。

## Execution Plan

### Phase 1 - 审计组织与归档

Status: completed
Targets: `docs/audits/business-replication/r5-research-deep-audit.md`

- Item Types: `Fix | Decision | Proof`

- [x] 核验前置：plan 786-789 均 completed、roadmap R1-R4 状态就绪（发现 R4 行注记残留"active"与状态 done 矛盾 → 已就地勘误后放行，Failure Path 同款处置）
- [x] draft review 通过后回写 roadmap §2 R5 `todo → planned`（评审 pass-with-minors 5 Minor 修订后升 active 时完成）
- [x] 撰写审计任务书（三件套输入：R1-R4 交付清单 + 交付摘要 + 各 plan 验证输出；核对范围与 Pass 判定标准——六类核对范围与最低工作量写入审计任务 prompt）
- [x] 派独立 fresh 子 agent 执行审计，修复→复审循环直至 Pass（首轮即 Pass：零 Blocker/零 Major，无需复审轮）
- [x] issue 处置记录与审计报告归档（7 Minor 全部当场修复：R2 行数 124/127 与 M2 锚点 L129、R2/R3 echarts 8→9 勘误闭环、R1 C1 拖拽裁决补文件名、R1 footer 统计带与 R4 C1/W2 互相承接标注、R4 底账 L182-183 收窄；0 残余债。报告已归档 `docs/audits/business-replication/r5-research-deep-audit.md`）

Exit Criteria:

- [x] `docs/audits/business-replication/r5-research-deep-audit.md` 存在，含审计员标识、逐项核对表、issue 清单、最终 verdict `Pass`
- [x] 全部 Blocker/Major issue 有"修复→复审"闭环记录（本审计零 Blocker/Major，该条款空满足并已在报告核对表覆盖面中体现）
- [x] Minor issue 有明确处置口径（7 Minor 全部当场修复，0 残余债；处置清单见 Phase 1 执行项与 daily log）
- [x] roadmap §2 R5 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，5 Minor 已当场修订）
- Rounds: 1
- Findings addressed:
  - Minor M1：Current Baseline 括注更新为"789 closure 已落地并核验"；核验前置项补就地勘误失败分支（执行中发现 R4 行注记漂移已按此处置）
  - Minor M2：Phase 1 增"roadmap §2 R5 todo→planned 回写"归属项
  - Minor M3：Item Types 补 `Fix`（audit 修复属 Fix 不可降级）
  - Minor M4：修复→复审循环加 ≤2 轮上限，超出走 audit-unresolvable
  - Minor M5：审计报告文件名对指南惯例的有意识偏离在执行项内注明（按 R/D/P/F 子目录组织）

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用，按 guide 从 Closure Gates 删除。

- [x] in-scope 工作全部落地（审计报告 + issue 闭环 + roadmap 回写）
- [x] 审计报告事实声称与 live repo 对照无 drift（closure audit 抽 5 条报告内证据全部精确可追溯：timeline L110、schema L305-306、ECHARTS_EVENT_CONTRACTS=9、palette iframe L26+skip L103、15 包/21 行计数）
- [x] 不存在被静默降级的 in-scope 缺口（7 Minor 全修复 0 残余债）
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——closure audit 零 findings）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 深度审计 verdict Pass（零 Blocker/Major），type 归属 30 条/上游锚点 35+ 条/G 分级 12 条/依据链 12 行/跨文档计数全量核对；7 Minor 当场修复 0 残余债；closure audit approved 零 findings。M1 调研阶段含审计纪律全部收口，R6 开放审计就绪。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: closure audit verdict `approved`（零 Blocker/Major/Minor）——报告结构四要素齐备、证据抽样 5/5 可追溯、7 项 Minor 修复逐一实证落点、审计独立性核验通过（执行 session 未自审）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（M2 设计阶段的 D5 深审由 roadmap 后继工作项承接）
