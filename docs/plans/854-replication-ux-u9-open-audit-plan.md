# 854 复刻页 UX 保真 U9：阶段开放审计与 roadmap 收口

> Plan Status: draft
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U9）
> Related: 845-853（U0-U8）；先例 F4（plan 844 开放审计）/R6/D6/P2/F4

## Purpose

独立 fresh 子 agent 开放评审（adversarial open audit）：以用户验收视角对 replication-ux-fidelity roadmap 全部交付做无预设清单的开放评审；通过后 roadmap §3 U9 → done 并收口整个 roadmap（Status: active → done）。

## Current Baseline

- U0-U8 全部完成：plans 845-853 全 completed；roadmap §3 U0-U8 done；U8 深审 verdict Pass（docs/audits/replication-ux-u8-deep-audit.md）。
- 交付面：21 页走查修复、mobile 三页上游对标、令牌体系归族、四渲染器包共性修复 + 判别单测、复检对账 21/21 uncovered=0、209/209 e2e 全绿。

## Goals

- ≥2 轮独立 fresh 开放审计（对抗视角，无预设清单）：输入 = roadmap + 八 plan + 报告族 + live repo，输出 verdict 与 findings。
- findings 处置：Blocker/Major 逐条处置（就地修/另立 plan），roadmap 收口仅在全处置后。
- roadmap 收口：§3 U9 → done；头部 Status active → done（收口盘 Bugs/Lessons 按 roadmap 指南）。

## Non-Goals

- 新功能；审计员的修复执行（审计只读，处置由本 plan 执行会话落地后复审）。

## Scope

### In Scope

- 开放审计（≥2 轮）+ findings 处置 + roadmap 收口回写 + daily log。

### Out Of Scope

- U0-U8 范围外的新页面/新功能。

## Test Strategy

必须自动化：审计员取证须程序化；处置后 21 页 spec 抽验绿。

## Execution Plan

### Phase 1 - 开放审计（≥2 轮对抗评审）

Status: planned
Targets: 审计记录（daily log / 报告附录）

- Item Types: `Proof`

- [ ] 独立 fresh 子代理开放评审 round-1（无预设清单，用户视角）→ findings 分级
- [ ] findings 处置（Blocker/Major 逐条落地或另立 plan；Minor 登记）→ round-2 复审直至 pass

Exit Criteria:

- [ ] verdict Pass（零未处置 Blocker/Major，共识达成）

### Phase 2 - roadmap 收口

Status: planned

- Item Types: `Decision | Proof`

- [ ] roadmap §3 U9 → done；头部 Status → done；收官盘（Bugs/Lessons 摘要按 roadmap-and-mission-authoring 指南）
- [ ] daily log 收口记录；closure audit（独立子 agent）通过后同 commit

Exit Criteria:

- [ ] roadmap 收口完成 + closure audit approved + 同 commit

## Draft Review Record

- Reviewer / Agent: （待独立子 agent 审查）
- Verdict: 待审
- Rounds: —
- Findings addressed: —

## Closure Gates

- [ ] Phase 1-2 Exit Criteria 全勾
- [ ] 开放审计 verdict Pass（零未处置 Blocker/Major）
- [ ] roadmap §3 U9 回写 `done` 同 commit；roadmap 头部收口
- [ ] daily log 收口记录
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 族 G watch-only residual 与 improvement-analysis 清单移交后续治理轮。

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent: （待独立审计）
- Evidence: —

Follow-up:

- （待收口）
