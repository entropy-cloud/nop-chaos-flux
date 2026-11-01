# 842 M4-F2 复刻总结与缺口沉淀（business-page-replication roadmap M4-F2）

> Plan Status: draft
> Last Reviewed: 2026-11-01
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M4-F2（依赖 F1 done）
> Related: P1 深审登记一致性节（`docs/audits/business-replication/p1-dev-deep-audit.md`）；`docs/backlog/missing-components-and-designer-roadmap.md` L7.9；`docs/components/existing-components-improvement-analysis.md`（§3 地图族/日历观察、§4 #9 inputClassName）；roadmap §Authority

## Purpose

汇总复刻 1.0 中新登记的缺口条目形成单一沉淀文档，并对上游八个 roadmap 逐域落「flux 侧能力已验证」备忘。交付 `docs/analysis/business-replication/f2-replication-summary-and-gap-ledger.md`。收口为 roadmap §2 F2 `todo → planned → done`。

## Current Baseline

- M3 二十一页 + P1 深审完成；本阶段新增登记已在案但**分散多处**：missing-components L7.9（G5 库位平面图/G9 桌面 SLA 倒计时/G10 翻牌器，demand-gated）、improvement-analysis §4 #9（inputClassName 类型死字段）、§3 地图族 pin+geojson 叠加候选、§3 scheduling 日历 UTC 日模型观察项、axe 基线 owner 债（table 列宽 separator、tree role、checkbox-group aria-required、壳 badge 对比度）、scanner-baselines map 名称碰撞。
- 上游八个 roadmap 位于本仓库之外（`~/app/nop-app-erp|nop-app-mall-wt|nop-entropy|nop-app-iot`）。roadmap §Authority 明确「本 roadmap 只在 playground 复刻页面与验证 UX 能力，**不改上游业务项目**」——F2 的「对上游各 roadmap 回写备忘」以**本仓库内沉淀备忘文本**为交付（逐域一段、可直接粘贴上游的措辞），跨仓库写回本身不在本 plan 内（out-of-scope 裁决，见 Non-Goals）。

## Goals

- 沉淀文档四节：①二十一页复刻清单终态（页/上游来源/复刻形态/验收面/收窄裁决指针）；②缺口登记汇总（上列全部条目，逐条：登记处/分类〔新 type 候选/能力扩展/观察项/owner 债〕/demand gate/与 §Authority 关系）；③逐域「flux 侧能力已验证」备忘文本（八域各一段：已验证能力 + 近似形态 + demand-gated 缺口，措辞可直接被上游 roadmap 引用）；④跨仓库回写裁决记录（为何不在本 plan 内直改上游、后续路径）。
- roadmap §2 F2 状态回写。

## Non-Goals

- 不直改上游仓库任何文件（§Authority 边界）；不新立缺口登记（只汇总已在案条目，发现漏登则当场补登后汇总）；不裁决 retention。

## Scope

### In Scope

- 沉淀文档撰写与 live repo 对账；漏登条目当场补登；roadmap §2 F2 回写。

### Out Of Scope

- 跨仓库写回；缺口落地实现；retention 裁决。

## Failure Paths

| 编号           | 触发                     | 行为                                             | 可重试 | 用户可见表现       |
| -------------- | ------------------------ | ------------------------------------------------ | ------ | ------------------ |
| ledger-drift   | 汇总与登记底账不一致     | 以底账为准就地勘误后落档                         | 是     | 沉淀文档与底账一致 |
| missing-entry  | 发现漏登条目             | 先补登底账（对应文件），再纳入汇总               | 是     | 底账+汇总双处在案  |

## Test Strategy

不适用：纯文档沉淀，无行为变更。

## Execution Plan

### Phase 1 - 沉淀文档与回写

Status: planned
Targets: `docs/analysis/business-replication/f2-replication-summary-and-gap-ledger.md`（新）

- Item Types: `Proof | Fix | Decision`

> 前置：plan 838（F1）已 `done`；未满足则本 Phase 状态保持 `blocked`（F1 执行可能产生新登记/新缺口，先写汇总会产出不完整台账）。

- [ ] 逐条核对底账（missing-components L7.9、improvement-analysis 新登记、axe 基线各 route `_notes` 的 owner 债、scanner-baselines）与二十一页终态，撰写沉淀文档四节
- [ ] 发现漏登条目则先补登底账再汇总（Failure Path missing-entry）
- [ ] roadmap §2 F2 回写 + **F2 行就地勘误注**（不改写原文，附注：上游回写以仓内备忘沉淀交付，跨仓库写回另行授权，见 plan 842）

Exit Criteria:

- [ ] 沉淀文档落档且每条登记项可在底账文件观测到（文件+行级对应）
- [ ] roadmap F2 行状态回写 + 就地勘误注在案

## Draft Review Record

- Reviewer / Agent: 待独立子 agent 填写
- Verdict: 待审
- Rounds: —
- Findings addressed: —

## Closure Gates

> 纯文档计划（仅 `docs/` 变更）：`pnpm typecheck/build/lint/test/check` 按 guide 模板注记删除，不需执行。

- [ ] in-scope 工作全部落地（沉淀文档 + roadmap 回写与就地勘误注）
- [ ] 全部登记项底账对应在案，无「汇总有底账无」幻条目
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（执行期如有裁决当场落节）

## Non-Blocking Follow-ups

- 上游仓库回写（跨仓库动作，需上游 owner/用户授权后另行执行）

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
