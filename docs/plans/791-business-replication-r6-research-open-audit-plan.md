# 791 R6 调研阶段开放审计（business-page-replication roadmap M1-R6）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M1-R6（依赖 R5 done，已满足）
> Related: R1-R5 交付与审计（`docs/analysis/business-replication/r{1..4}-*.md`、`docs/audits/business-replication/r5-research-deep-audit.md`、plan 786-790）

## Purpose

对 M1 调研阶段执行开放审计：由独立 fresh 子 agent 做**开放评审**（不复用执行者与 R5 深审上下文），自由挑战调研阶段的结论可信度、方法论盲区与对 M2 设计阶段的下游可用性。Pass 后 M1（R1-R6）全部 done。收口为 roadmap §2 R6 状态 `todo → planned → done`。

## Current Baseline

- M1 现状：R1-R4 交付 + R5 深审报告（Pass，7 Minor 已修复）全部在案；plan 786-790 均 completed。
- R5 深审已覆盖：type 归属/上游锚点/分级承重/依据链/跨文档计数/contract drift 六类核对。开放审计的**增量价值**在深审范围之外：方法论盲区（盘点覆盖面是否有系统性遗漏）、结论可信度挑战（三色分级是否有依据不足的裁定）、下游可用性（M2 设计阶段拿到的输入是否够用、是否会误导设计）。
- 开放审计纪律：fresh sub-agent，不复用执行者上下文；输入三件套（交付清单 + 摘要 + 验证输出）；评审结论落审计报告。

## Goals

- 新建 `docs/audits/business-replication/r6-research-open-audit.md`：开放评审报告，至少覆盖三个自由评审面——①结论可信度挑战（抽任何一条分级/可行性结论尝试反驳）；②方法论盲区（盘点方法有什么系统性遗漏，上游 roadmap 之外是否有关键输入源被忽略）；③下游可用性（M2-D1/D2 消费这些交付时会不会被误导，缺什么）。
- 评审发现分级处置：Blocker/Major → 修复→复审循环（≤2 轮）直至 Pass；Minor → 当场修复或登记 residual（写明 Why Not Blocking）。
- roadmap §2 R6 状态回写（含头部 L4 括注同步勘误，guide When Closing 12）；R6 done 后 M1 里程碑达成。

## Non-Goals

- 不重复 R5 深审的核对项（type 归属/锚点行号逐条核对已覆盖，开放审计不重跑）。
- 不做 M2 设计；不裁决 retention。

## Scope

### In Scope

- 开放审计任务书撰写与 fresh 子 agent 派遣（输入三件套）。
- 评审发现处置与报告归档。
- roadmap §2 R6 回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

### Out Of Scope

- M2-M4 全部工作项；R5 深审项重跑；缺口实现。

## Failure Paths

| 编号                        | 触发                   | 行为                                                                                        | 可重试 | 用户可见表现                          |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- | ------ | ------------------------------------- |
| open-audit-major            | 评审发现 Blocker/Major | 修复→复审循环（≤2 轮）直至 Pass；记录进报告                                                 | 是     | 报告 verdict 终态 Pass                |
| open-audit-rounds-exhausted | 2 轮修复后仍未 Pass    | plan 保持 in progress，剩余 findings 登记 residual 或升级人工裁决；本 plan 不得标 completed | 否     | plan 停留 in progress + residual 清单 |
| open-audit-unresolvable     | 发现结论性错误不可修复 | 对应交付加 Outdated/勘误标注，roadmap 相应行加注，本 plan 不得标 completed                  | 是     | 勘误标注 + 报告记载                   |

## Test Strategy

不适用：纯文档审计组织，无行为变更。

## Execution Plan

### Phase 1 - 开放审计组织与归档

Status: planned
Targets: `docs/audits/business-replication/r6-research-open-audit.md`

- Item Types: `Fix | Decision | Proof`

- [x] 撰写开放审计任务书（三件套输入 + 三个自由评审面 + Pass 判定对齐 `00-audit-execution-guide.md`"零 Blocker 零 Major"+ R5 已覆盖范围摘要清单防重复深审）
- [x] 派独立 fresh 子 agent 执行开放评审，产出报告
- [x] 发现处置（首轮 Fail：2 Major+6 Minor→全部修复→原审计员复审 round 1 **Pass**（1 个新引入引用瑕疵 R2-O2→R3-O2 已随手勘误）；0 残余）
- [x] 报告归档 + M1 达成核验（核验 R1-R5 done；R6 done 随 closure audit 同 commit 回写后 M1 即达成）

Exit Criteria:

- [x] `docs/audits/business-replication/r6-research-open-audit.md` 存在，含三个评审面的结论、issue 清单、最终 verdict（首轮 Fail + 复审 Pass 全程记录于 plan Closure 与 daily log）
- [x] 全部 Blocker/Major 有修复闭环记录（零 Blocker；2 Major 修复后复审 Pass）；Minor 有处置口径（6 条全处置+1 复审新引入瑕疵勘误）
- [x] roadmap §2 R6 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，4 Minor 已当场修订）
- Rounds: 1
- Findings addressed:
  - Minor 1：补 open-audit-rounds-exhausted Failure Path（2 轮耗尽态归属）
  - Minor 2：任务书增补 R5 已覆盖范围摘要 + Pass 判定对齐 audit guide
  - Minor 3：roadmap 头部 L4 括注同步勘误纳入回写范围
  - Minor 4：Phase 1 item 4 时序措辞修正（R1-R5 done 核验 + R6 随 closure 回写）

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用，按 guide 从 Closure Gates 删除。

- [x] in-scope 工作全部落地（开放审计报告 + 处置闭环 + roadmap 回写）
- [x] 审计报告事实声称与 live repo 对照无 drift（复审员对新引入声称做了 live 验证：map-demo L25 精确、improvement-analysis §4 契约漂移登记表 L157/keepOnPageChange L166 实存）
- [x] 不存在被静默降级的 in-scope 缺口（6 Minor 全处置+1 复审瑕疵勘误，0 残余）
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——开放审计复审 Pass，无遗留裁决）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 开放审计三面评审完成（结论可信度挑战 4 次反驳被击退、方法论盲区、下游可用性），首轮 Fail 的 2 Major（G9 登记断链、可行性结论超评估面）修复后原审计员复审 round 1 Pass；R5 事实层未被推翻。**R6 done 即 M1 调研里程碑全部达成（R1-R6），M2 设计阶段解锁。**

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；开放评审与修复复审为同一审计员两轮）
- Evidence: 首轮 verdict `Fail`（零 Blocker、2 Major、6 Minor）→ 修复 → 复审 verdict `Pass`（round 1/2，Major-1 4/4、Major-2 2/2、Minor 6 条处置核对，2 处新引入声称 live 验证）；详见 `docs/logs/2026/10-30.md` 与 `docs/audits/business-replication/r6-research-open-audit.md`。

Follow-up:

- no remaining plan-owned work（M1 收口；§4.1 对 M2 的强制设计输入由 D1-D4 计划承接）
