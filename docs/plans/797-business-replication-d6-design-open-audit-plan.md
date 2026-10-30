# 797 D6 设计阶段开放审计（business-page-replication roadmap M2-D6）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M2-D6（依赖 D5 done，已满足）
> Related: D1-D5 交付与审计（`docs/analysis/business-replication/d{1..4}-*.md`、`docs/audits/business-replication/d5-design-deep-audit.md` 含附录 A 复审轨迹、plan 792-796）

## Purpose

对 M2 设计阶段执行开放审计：独立 fresh 子 agent **开放评审**（不复用执行者与 D5 深审上下文），自由挑战设计阶段结论的可实施性、方法论盲区与对 M3 实现阶段的下游可用性。Pass 后 M2（D1-D6）全部 done。收口为 roadmap §2 D6 状态 `todo → planned → done`。

## Current Baseline

- M2 现状：D1-D4 设计交付 + D5 深审（首轮 Fail 14M+9m → 两轮复审 Pass）全部在案；plan 792-796 均 completed。
- D5 深审已覆盖：schema 片段属性矩阵（33 组）、缺口登记对账（12 条）、countDown 移交项、跨文档一致性（8 项）。开放审计的**增量价值**在深审范围之外：设计可实施性挑战（照设计实现会不会在运行时/e2e 层面失败）、方法论盲区（设计方法有什么系统性遗漏）、下游可用性（M3 实现者拿到这批设计是否够用/会否被误导）。
- 开放审计纪律：fresh sub-agent，不复用执行者上下文；输入三件套（D1-D4 交付清单+设计摘要+D5 结论/验证输出）；Pass = 零 Blocker 零 Major（`docs/audits/00-audit-execution-guide.md`）。

## Goals

- 新建 `docs/audits/business-replication/d6-design-open-audit.md`：开放评审报告，至少覆盖三个自由评审面——①可实施性挑战（抽 3-5 个设计片段/机制尝试反驳：schema 照抄能否真渲染、mock 方案能否真跑通、断言能否真成立）；②方法论盲区（设计方法系统性遗漏，如状态管理/schema 演进/i18n/主题兼容等横切面是否被忽略）；③下游可用性（M3 实现者视角：信息够不够、顺序清不清晰、会不会被误导）。
- 评审发现分级处置：Blocker/Major → 修复→复审循环（≤2 轮，耗尽则 plan 保持 active + residual/人工裁决）；Minor → 当场修复或登记 residual（写明 Why Not Blocking）。
- roadmap §2 D6 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时；含头部括注同步勘误）；D6 done 后 M2 里程碑达成。

## Non-Goals

- 不重复 D5 深审的属性级核对项；不实现页面；不裁决 retention。

## Scope

### In Scope

- 开放审计任务书与 fresh 子 agent 派遣；发现处置与报告归档；roadmap §2 D6 回写。

### Out Of Scope

- M3 实现；D5 深审项重跑；缺口落地。

## Failure Paths

| 编号                        | 触发               | 行为                                                                             | 可重试 | 用户可见表现                     |
| --------------------------- | ------------------ | -------------------------------------------------------------------------------- | ------ | -------------------------------- |
| open-audit-major            | 发现 Blocker/Major | 修复→复审循环（≤2 轮）直至 Pass                                                  | 是     | 报告 verdict 终态 Pass           |
| open-audit-rounds-exhausted | 2 轮后仍未 Pass    | plan 保持 `active`，剩余 findings 登记 residual 或升级人工裁决；不得标 completed | 否     | plan 停留 active + residual 清单 |
| open-audit-unresolvable     | 结论性错误不可修复 | 对应交付加 Outdated/勘误标注，roadmap 加注，本 plan 不得标 completed             | 是     | 勘误标注 + 报告记载              |

## Test Strategy

不适用：纯文档审计组织，无行为变更。

## Execution Plan

### Phase 1 - 开放审计组织与归档

Status: completed
Targets: `docs/audits/business-replication/d6-design-open-audit.md`

- Item Types: `Fix | Decision | Proof`

- [x] 撰写开放审计任务书（三件套=D1-D4 交付清单+设计摘要+D5 深审结论/验证输出；三个评审面；R5/D5 已覆盖范围摘要；Pass 判定对齐 `docs/audits/00-audit-execution-guide.md` 零 Blocker 零 Major）
- [x] 派独立 fresh 子 agent 执行开放评审
- [x] 发现处置（首轮 Fail 0B/3M/8m → 修复（含两项设计裁决：K1 host override、mobile 三页移动画布）→ 复审轮 1 **Pass** 0/0/0（复审记录由独立复审员追加入报告附录 A）；8 Minor 全部实际落地非降级）
- [x] 报告归档 + M2 达成核验（核验 D1-D5 done；D6 done 随 closure 同 commit 回写后 M2 即达成）

Exit Criteria:

- [x] `docs/audits/business-replication/d6-design-open-audit.md` 存在，含三个评审面结论（可实施性挑战 7 组反驳判定/方法论盲区 6 横切面/下游可用性 4 项走查）、issue 清单、最终 verdict（首轮 Fail + 附录 A 复审 Pass）
- [x] 全部 Blocker/Major 有修复闭环记录（零 Blocker；3 Major 裁决经独立复审 3/3 落地核验）；Minor 有处置口径（8 条全部实际落地）
- [x] roadmap §2 D6 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，5 Minor 已当场修订）
- Rounds: 1
- Findings addressed:
  - Minor 1：Phase 1 第 4 项"R?"笔误改"核验 D1-D5 done"
  - Minor 2：roadmap planned/done 两步流转括注补齐
  - Minor 3：Pass 判定补对齐 00-audit-execution-guide.md
  - Minor 4：三件套构成补括注
  - Minor 5：Minor 处置口径补"Why Not Blocking"

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用。

- [x] in-scope 工作全部落地（开放审计报告 + 处置闭环 + roadmap 回写）
- [x] 审计报告事实声称与 live repo 对照无 drift（收口审计 4 条修复抽验+追加核验全部命中；3 Major 逐项到文档定位核验勘误注与新写法）
- [x] 不存在被静默降级的 in-scope 缺口（8 Minor 全部实际落地；MIN-5 warn 观测增强按审计口径为可选且强制半句已落；复审非阻断备忘为 M3 指引非 plan-owned 债）
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——closure audit approved 零 Blocker/Major）

## Non-Blocking Follow-ups

- d4 §3.1 O1 映射行补 form token（收口审计 advisory；既有非穷举行文惯例，M3 顺带）
- mobile 页 axe 分支 A/B 同画布基线近值的一元登记建议、K1 host 组件 M3 定名（复审非阻断备忘，M3 指引）

## Closure

Status Note: 开放审计三面评审（可实施性 7 组反驳/方法论盲区 6 横切面/下游可用性 4 项走查），首轮 Fail 的 3 Major 全部落于 P0 页的宿主装配层/页面形态层，经两项设计裁决（K1 host override 全语义可验收不收窄、mobile 三页 375×667 移动画布）+8 Minor 修复后，独立复审轮 1 **Pass** 0/0/0。正面结论：六项落地决策在"接起来能不能跑"层面全部站得住（零 Blocker）。**D6 done 即 M2 设计里程碑达成（D1-D6），M3 实现阶段解锁。**

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；开放审计员与复审员同一独立会话两轮，收口审计员另一 fresh 会话）
- Evidence: 首轮 verdict `Fail`（0B/3M/8m）→ 修复 → 复审轮 1 **`Pass`**（0/0/0，3/3 Major 落地核验+8/8 Minor 处置核验+无回归确认，记录入报告附录 A）→ 收口审计 `approved`（4 条抽验+追加核验全命中）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- 见 Non-Blocking Follow-ups（O1 form token、axe 基线一元登记、K1 host 定名——均 M3 指引级）
