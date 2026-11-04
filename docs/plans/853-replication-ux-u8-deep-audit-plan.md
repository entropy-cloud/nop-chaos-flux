# 853 复刻页 UX 保真 U8：阶段深度审计

> Plan Status: draft
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U8）
> Related: 845-852（U0-U6）、851（U7）；先例 F3（plan 843 深审）/R5/R6/D5/P1

## Purpose

U0-U7 全部落地后的阶段深度审计：对照 live repo 与上游基准核对修复保真度、断言真实性、评分卡证据；审计报告落档 `docs/audits/replication-ux-u8-deep-audit.md`，findings 按 Anti-Slacking 处置（live 缺陷不得降级 follow-up）。

## Current Baseline

- U0-U7 七个 work item 已完成（plans 845-852 全 completed + 851 待本批次收口）；roadmap §3 U0-U6 已 done。
- 审计对象面：8 份 execution plan + 7 份走查/归族/复检报告 + improvement-analysis 登记 + replication.css/渲染器修复 diff + 21 页 spec 族（209 test）。
- 审计输入纪律（Fresh Context）：审计子 agent 输入 = plan + diff 摘要 + 验证输出，不带执行过程史。

## Goals

- 三个独立 fresh 审计子代理分组深审（分组：①mobile 族+归族/渲染器修复保真度；②desktop 族四批走查保真度与断言真实性；③基准卡/方法/复检对账与登记台账）。
- 审计报告落档（verdict + findings 分级 + 处置建议）。
- findings 处置：审计发现 Blocker/Major → 逐条裁决落地（就地修/另立 plan），Minor 登记。

## Non-Goals

- 新功能/新页面；渲染器重构（登记路径不变）。

## Scope

### In Scope

- 审计报告 + findings 处置（就地小修允许；大项另立 plan）。

### Out Of Scope

- U9 开放审计（后续 plan 854）；上游仓。

## Test Strategy

必须自动化：审计抽核声称需程序化取证复现（探针/单测实跑）。

## Execution Plan

### Phase 1 - 三组独立深审

Status: planned
Targets: `docs/audits/replication-ux-u8-deep-audit.md`

- Item Types: `Proof`

- [ ] 三组 fresh 子代理深审（输入三件套：plan + diff 摘要 + 验证输出），汇总报告落档
- [ ] findings 分级处置：Blocker/Major 当轮处置或另立 plan；Minor 登记

Exit Criteria:

- [ ] 报告落档且 verdict 无未处置 Blocker/Major

### Phase 2 - 收口

Status: planned

- Item Types: `Proof`

- [ ] daily log；closure audit（独立子 agent）；roadmap §3 U8 回写同 commit

Exit Criteria:

- [ ] closure audit approved + 同 commit 回写

## Draft Review Record

- Reviewer / Agent: （待独立子 agent 审查）
- Verdict: 待审
- Rounds: —
- Findings addressed: —

## Closure Gates

- [ ] Phase 1-2 Exit Criteria 全勾
- [ ] 审计 findings 零未处置 Blocker/Major
- [ ] roadmap §3 U8 回写 `done` 同 commit
- [ ] daily log 收口记录
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm check` 零新增

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent: （待独立审计）
- Evidence: —

Follow-up:

- （待收口）
