# 837 M3-P2 开发阶段开放审计（business-page-replication roadmap M3-P2）

> Plan Status: active
> Last Reviewed: 2026-11-01
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-P2（依赖 P1 done——plan 819 收口后满足）
> Related: P1 深审（`docs/audits/business-replication/p1-dev-deep-audit.md`、plan 819）；开放审计先例 R6/D6（`docs/audits/business-replication/{r6-research,d6-design}-open-audit.md`、plans 791/797）；`docs/audits/00-audit-execution-guide.md`

## Purpose

对 M3 开发阶段执行开放审计：独立 fresh 子 agent **开放评审**（不复用执行者与 P1 深审上下文），自由挑战二十一页复刻的保真度结论、断言真实性与登记面盲区。Pass 后 M3（W1-V3 + P1 + P2）全部 done。收口为 roadmap §2 P2 状态 `todo → planned → done`。

## Current Baseline

- M3 现状：W1-V3 二十一页 done；P1 深审（plan 819）交付 `p1-dev-deep-audit.md`——首轮 5 Major + 1 登记 Major 全部闭环（C3 筛选参数链 / K2 classify / M1 工单四档 / M2 reworkQty / S1 有界重转 / REG-1 L7.9 补登），C2 时区窗口红根因修复 + 判别性回归。复跑证据（replication 全族 + axe `--retries=0`、全仓 e2e 逐红归因表）以 plan 819 Phase 2 执行期适配段落档为准（P1 收口时落档）；该段落未落档前，本 plan 不得执行 Phase 1 派遣。
- 开放审计的增量价值在深审范围之外：①保真度结论可反驳性（深审"修复后 Pass"是否成立——抽查修复是否真改变页面能力而非仅改测试）；②方法论盲区（二十一页逐页审计有无系统性遗漏面，如并发/错误态/i18n/主题兼容）；③登记面完整性（收窄裁决、勘误、demand-gated 登记是否自洽、有无"改测试不改页"型伪装收敛）。
- 开放审计纪律：fresh sub-agent，不复用执行者上下文；输入三件套（页面清单 + diff 摘要 + e2e 输出）；Pass = 零 Blocker 零 Major。

## Goals

- 新建 `docs/audits/business-replication/p2-dev-open-audit.md`：开放评审报告，至少覆盖三个自由评审面——①保真度结论挑战（抽 3-5 页对 P1 修复做对抗验证：mock/schema 改动是否真承载上游交互要素，e2e 断言是否锁住该能力）；②方法论盲区（逐页审计的系统性遗漏面，给出具体页/具体场景）；③登记与勘误自洽（D2-D4 勘误节、missing-components L7.9、improvement-analysis 新登记与 live repo 对账）。
- 评审发现分级处置：Blocker/Major → 修复→复审循环（≤2 轮，耗尽则 plan 保持 active + residual/人工裁决）；Minor → 当场修复或登记 residual（写明 Why Not Blocking）。
- roadmap §2 P2 状态回写（`planned` 于本 plan 草案评审通过**且 P1 收口后**、`done` 于 closure audit 通过时）；P2 done 后 M3 里程碑达成。

## Non-Goals

- 不重复 P1 深审的逐页核对项（分组审计/弱断言加强已覆盖）；不实现新页面；不裁决 retention；不处理 PH-9 台账红与 plan 836 在途收敛项（归因表随 plan 819 Phase 2 落档）。

## Scope

### In Scope

- 开放审计任务书与 fresh 子 agent 派遣；发现处置与报告归档；roadmap §2 P2 回写。

### Out Of Scope

- M4 验证；P1 深审项重跑；台账外红收敛（plan 836）。

## Failure Paths

| 编号                        | 触发               | 行为                                                                             | 可重试 | 用户可见表现                     |
| --------------------------- | ------------------ | -------------------------------------------------------------------------------- | ------ | -------------------------------- |
| open-audit-major            | 发现 Blocker/Major | 修复→复审循环（≤2 轮）直至 Pass                                                  | 是     | 报告 verdict 终态 Pass           |
| open-audit-rounds-exhausted | 2 轮后仍未 Pass    | plan 保持 `active`，剩余 findings 登记 residual 或升级人工裁决；不得标 completed | 否     | plan 停留 active + residual 清单 |
| open-audit-unresolvable     | 结论性错误不可修复 | 对应交付加 Outdated/勘误标注，roadmap 加注，本 plan 不得标 completed             | 是     | 勘误标注 + 报告记载              |

## Test Strategy

不适用：纯文档审计组织，无行为变更（审计中发现的产品/测试缺陷按 Failure Paths 处置并复跑对应 spec）。

## Execution Plan

### Phase 1 - 开放审计组织与归档

Status: planned
Targets: `docs/audits/business-replication/p2-dev-open-audit.md`

- Item Types: `Fix | Decision | Proof`

- [ ] 撰写开放审计任务书（三件套=二十一页清单+P1 diff 摘要+全族 e2e 输出摘要；三个评审面；P1 深审已覆盖范围摘要；Pass 判定对齐 `docs/audits/00-audit-execution-guide.md` 零 Blocker 零 Major）
- [ ] 派独立 fresh 子 agent 执行开放评审（不复用执行者上下文）；发现逐条分级
- [ ] 发现处置：Blocker/Major 修复→复审循环（≤2 轮）；Minor 当场修复或登记 residual；对应 spec 修复后 `--retries=0` 复跑
- [ ] 报告归档（verdict + findings 表 + 证据命令）；roadmap §2 P2 回写 planned→done（closure audit 后）

Exit Criteria:

- [ ] `docs/audits/business-replication/p2-dev-open-audit.md` 落档，verdict 终态 Pass（或 Failure Paths 触发的显式非 Pass 状态）
- [ ] 全部 Blocker/Major 已处置（修复+复跑或人工裁决记录）
- [ ] roadmap §2 P2 行状态与头部说明一致

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_40b0cd0e-ea77-4277-a960-0c8fd7f6af6f）
- Verdict: pass（round-1 fail：2 Major〔M-1 计数无出处 / M-2 归因表锚点不存在〕→ 修订为待证表述 + Minor-3 时序 → round-2 pass，残留 1 Minor L26 括号已顺手修正）
- Rounds: 2
- Findings addressed: M-1/M-2 Current Baseline 复跑证据改显式待证并附执行门禁（未落档前不得派遣）；Minor-3 回写时序改「草案评审通过且 P1 收口后」；Minor（L26 括号残留）就地修正。

## Closure Gates

- [ ] in-scope 工作全部落地（任务书 + 派遣 + 处置 + 报告 + roadmap 回写）
- [ ] 全部 Blocker/Major 已闭环
- [ ] 必要 focused verification 已完成（涉及 spec 修复时的复跑证据）
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

（执行期如有裁决当场落节）

## Non-Blocking Follow-ups

- M4 验证阶段（roadmap F1-F4，各自独立 plan）

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
