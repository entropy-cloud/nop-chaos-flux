# 843 M4-F3 验证阶段深度审计（business-page-replication roadmap M4-F3）

> Plan Status: completed
> Last Reviewed: 2026-11-02
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M4-F3（依赖 F1 done——plan 838 收口后满足）
> Related: F1 统一验收（`docs/audits/business-replication/f1-unified-ux-acceptance.md`、plan 838）；F2 沉淀（`docs/analysis/business-replication/f2-replication-summary-and-gap-ledger.md`、plan 842）；P1/P2 审计先例；deep audit 先例 R5/D5

## Purpose

对 M4 验证阶段执行深度审计：对照 live repo 核对 F1 验收覆盖的完整性与证据真实性、F2 沉淀与底账的 contract drift。交付 `docs/audits/business-replication/f3-verification-deep-audit.md`。收口为 roadmap §2 F3 `todo → planned → done`。

## Current Baseline

- F1（plan 838）四支柱 Pass：快照 21/21、axe 28 项零新增、focus 抽查 15/15、mobile viewport 分支 B + 页 spec；唯一复跑红 K2 focus③ 按 contention 登记 flake 台账。
- F2（plan 842）沉淀文档四节落档，closure audit 逐锚点核验 approved。
- 深度审计的增量价值：①验收覆盖面是否有漏（roadmap F1 行四要素之外，验收口径是否遗漏某类页面/分支——如分支 C V3 的 axe 实测、mobile 三页的 hasTouch 断言深度）；②快照评审结论的可复核性（4 项 residual 定级是否恰当、有无漏检页面级缺陷）；③F2 §2 汇总与底账的 drift 抽查（closure audit 已逐锚点核验，深审做独立复抽 + 找「底账有汇总无」反向遗漏）；④contract drift：F 阶段产出的文档（f1/f2 报告、roadmap 行、勘误注）与 live repo 行为的一致性。

## Goals

- 新建 `docs/audits/business-replication/f3-verification-deep-audit.md`：至少覆盖四个审计面——①F1 验收覆盖完整性（对照 roadmap F1 行四要素 + D1 §3/§4 口径逐项核对证据与覆盖，抽查快照 3-5 页独立目检）；②F1 证据真实性（命令可复跑性/计数口径/台账行）；③F2 汇总反向核对（底账有、汇总无的遗漏 + 锚点行号漂移）；④contract drift 扫描（F 阶段文档 vs live repo）。
- Findings 分级处置：Blocker/Major → 本 plan 内修复或显式 successor；Minor → 当场修复或登记 residual。
- roadmap §2 F3 状态回写（`planned` 于草案评审通过——F2 已 done、条件自然满足；`done` 于 closure audit 通过时）。

## Non-Goals

- 不重跑 P1/P2 审计项；不做 F4 开放审计（独立 fresh 子 agent 另立 plan）；不修组件 owner 债；不处理并行会话 WIP。

## Scope

### In Scope

- 深度审计任务书与独立 fresh 子 agent 派遣（对照 live repo）；发现处置与报告归档；roadmap §2 F3 回写。

### Out Of Scope

- F4 开放审计；页面功能实现；retention 裁决。

## Failure Paths

| 编号              | 触发                     | 行为                                                    | 可重试 | 用户可见表现     |
| ----------------- | ------------------------ | ------------------------------------------------------- | ------ | ---------------- |
| coverage-gap      | 发现验收覆盖缺口         | 本 plan 内补最小验收断言并复跑；超范围者显式 successor  | 是     | 报告 findings 表 |
| evidence-drift    | 证据声称与实况不符       | 就地勘误或复跑取证；结论级不符则 F1 verdict 复议        | 是     | 勘误注/复跑记录  |
| audit-blocked     | 子 agent 无法形成可判定结论 | 换 agent 重派（≤2 次）；仍受阻则升级 human gate，plan 保持 active | 是 | 报告记 blocked 轨迹 |

> Minor findings 按 Goals 第 2 条口径处置（当场修复或登记 residual），不入 Failure Paths 表。

## Test Strategy

不适用：纯审计组织（涉及补断言时按 Failure Path 以「必须自动化」口径先证后修）。

## Execution Plan

### Phase 1 - 深度审计组织与归档

Status: completed
Targets: `docs/audits/business-replication/f3-verification-deep-audit.md`（新）

- Item Types: `Proof | Decision | Fix`

- [x] 撰写审计任务书（四审计面 + Pass 判定零 Blocker 零 Major）；派独立 fresh 子 agent 对照 live repo 执行（round-1 Fail：MAJ-1 roadmap 头部 F1/F2 漏更 + 4 Minor）
- [x] 主审汇编复核（Major/Blocker 逐条打开证据）；发现处置（Failure Paths）——MAJ-1 头部勘误；MIN-1/2 f1 报告口径勘误；MIN-3/4 观测登记
- [x] 报告归档 + roadmap §2 F3 回写（done 于 closure audit 通过时）——round-2 复核 Pass（final）

执行期证据（2026-11-02）：报告 verdict 终态 **Pass final**（round-1 agent_9838dfca-1d4d-4def-878c-023956d97fb5 → round-2 同 agent 复核）；F1 证据链真实性全过、F2 双向核对零遗漏、锚点抽查 7 处零漂移。

Exit Criteria:

- [x] 报告落档（结论 + findings 表 + 证据命令）
- [x] 全部 Blocker/Major 已处置或显式 successor
- [x] roadmap F3 行与报告一致

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_3058b768-d2b6-4bf7-8858-37276b19e70a）
- Verdict: pass（round-1，零 Blocker/Major + 3 Minor 已采纳）
- Rounds: 1
- Findings addressed: M-1 planned 前置措辞与 roadmap 依赖列对齐；M-2 Failure Paths 补 audit-blocked 行；M-3 Minor 处置口径在 Failure Paths 节加注对齐 Goals。

## Closure Gates

> 纯文档计划（预期仅 `docs/` 变更；若 Failure Path 触发补断言则恢复全量门禁项）。

- [x] in-scope 工作全部落地（审计 + 报告 + roadmap 回写）
- [x] 全部 Blocker/Major 已处置（MAJ-1 勘误 + round-2 复核消除）
- [x] 必要 focused verification 已完成（本 plan 零代码变更，纯文档审计）
- [x] 不存在被静默降级的 in-scope 缺口（4 Minor 全部可追溯：MIN-1/2 勘误、MIN-3/4 observation 登记）
- [x] 受影响 owner docs 已同步（daily log；f1 报告勘误；roadmap 头部+行）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（执行期如有裁决当场落节）

## Non-Blocking Follow-ups

- F4 开放审计（roadmap M4-F4，独立 plan）

## Closure

Status Note: 2026-11-02 收口。四审计面完成：F1 验收覆盖完整性（分支 C/mobile 口径勘误后无缺口）、证据真实性全过、F2 双向核对零遗漏、contract drift 一项（roadmap 头部漏更）勘误闭环。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（agent_e430453e-066a-4c7c-8f10-fd01c159cdbc），2026-11-02
- Evidence: verdict **approved**（零 Blocker/Major）。逐条实证：报告 round 轨迹双处一致；MAJ-1/MIN-1..4 落点实地核验（roadmap :4 头部、f1 报告 mobile viewport 行、报告 round-2 表 :62-65）；触达面纯 docs；roadmap/daily log 回写属收口 commit 动作。

Follow-up:

- 快照单 viewport 口径外 responsive 边界与 K2 横滚观察留 F4 裁量（报告 observation 在案）——no remaining plan-owned work
