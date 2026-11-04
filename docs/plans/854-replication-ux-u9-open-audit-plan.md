# 854 复刻页 UX 保真 U9：阶段开放审计与 roadmap 收口

> Plan Status: completed
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U9）
> Related: 845-853（U0-U8）；先例 F4（plan 844 开放审计）/R6/D6/P2/F4

## Purpose

独立 fresh 子 agent 开放评审（adversarial open audit）：以用户验收视角对 replication-ux-fidelity roadmap 全部交付做无预设清单的开放评审；通过后 roadmap §3 U9 → done 并收口整个 roadmap（Status: active → done）。

## Current Baseline

- U0-U8 全部完成：plans 845-853 全 completed（853 于 854 起草同窗收口，起草时曾观测到 header active/roadmap U8 todo 的瞬时簿记漂移，已随 U8 收口 commit 消除并经复审确认）；roadmap §3 U0-U8 done；U8 深审 verdict Pass（docs/audits/replication-ux-u8-deep-audit.md）。
- 交付面：21 页走查修复、mobile 三页上游对标、令牌体系归族、四渲染器包共性修复 + 判别单测、复检对账 21/21 uncovered=0、209/209 e2e 全绿。

## Goals

- ≥2 轮独立 fresh 开放审计（对抗视角，无预设清单）：输入 = roadmap + 八 plan + 报告族 + live repo，输出 verdict 与 findings。
- findings 处置：Blocker/Major 逐条处置（就地修/另立 plan），roadmap 收口仅在全处置后。
- roadmap 收口：§3 U9 → done；头部 Status active → done（收口盘 Bugs/Lessons 按 roadmap 指南）。

## Non-Goals

- 新功能；审计员的修复执行（审计只读，处置由本 plan 执行会话落地后复审）。

## Failure Paths

| 可测场景编号     | 触发                                     | 行为                                                                      | 可重试             | 用户可见表现                   |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------- | ------------------ | ------------------------------ |
| open-audit-major | 开放审计发现 Blocker/Major               | 逐条处置落地（就地修/另立 plan）后复审；≤2 轮修复循环直至 Pass            | 是                 | verdict Pass 后 roadmap 才收口 |
| rounds-exhausted | 2 轮修复循环后仍有未处置 Blocker/Major   | plan 不得标 completed；roadmap 收口暂停，另立 successor plan 承载剩余处置 | 否（转 successor） | roadmap 保持 active            |
| audit-overturns  | 审计推翻既有交付结论（如复检销单被反驳） | 结论性错误加就地勘误标注（不改写历史），受影响交付回退处置并复审          | 是                 | 勘误附注在案                   |

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
Targets: `docs/audits/replication-ux-u9-open-audit.md`（daily log 由 Phase 2 承载）

- [x] 独立 fresh 子代理开放评审 round-1（无预设清单，用户视角）→ findings 分级；round-1 即零未处置 Blocker/Major 时加 1 轮独立复核确认终态，否则 ≤2 轮修复循环直至 Pass（Failure Paths 口径）
- [x] findings 处置（Blocker/Major 逐条落地或另立 plan；Minor 登记）

Exit Criteria:

- [ ] 开放审计报告落档 `docs/audits/replication-ux-u9-open-audit.md`，verdict 行 Pass（零未处置 Blocker/Major）+ 审计 agent id 在案

### Phase 2 - roadmap 收口

Status: planned

- Item Types: `Decision | Proof`

- [x] roadmap §3 U9 → done；头部 Status → done；收官盘（Bugs/Lessons 摘要，权威操作条款：docs/backlog/00-roadmap-authoring-guide.md §"Completion: Bugs And Lessons Summary" + docs/skills/roadmap-and-mission-authoring-with-consensus-review.md，写入前对 docs/bugs、docs/lessons 查重）
- [x] daily log 收口记录；closure audit（独立子 agent）通过后同 commit

Exit Criteria:

- [ ] roadmap 收口完成 + closure audit approved + 同 commit

## Draft Review Record

- Reviewer / Agent: agent_2295ac8e（fresh session）
- Verdict: `pass`（round-1 fail 2 Major + 3 Minor → 修订 → round-2 pass）
- Rounds: 2
- Findings addressed: MAJ-1（Baseline 瞬时簿记漂移已随 U8 收口 commit 消除并显式登记；收口动作已含 853/roadmap U8——复审确认实况一致）、MAJ-2（补 Failure Paths 三行）、MIN-1（报告定名 docs/audits/replication-ux-u9-open-audit.md）、MIN-2（轮次终止语义明确）、MIN-3（verdict 可观测化 + 收官指南双点名）

## Closure Gates

- [x] Phase 1-2 Exit Criteria 全勾
- [x] 开放审计 verdict Pass（零未处置 Blocker/Major；round-1 agent_0be03ec1 + round-2 复核 agent_06ba0cfc）
- [x] roadmap §3 U9 回写 `done` 同 commit；roadmap 头部收口
- [x] daily log 收口记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 族 G watch-only residual 与 improvement-analysis 清单移交后续治理轮。

## Closure

Status Note: 开放审计 round-1 Pass（4 Minor 全处置）+ round-2 独立复核确认；roadmap §3 U9 → done、头部 Status → done 同 commit 收口；收官盘 bugs/lessons 已入册；closure audit approved。replication-ux-fidelity roadmap 收口。

Closure Audit Evidence:

- Auditor / Agent: agent_ba0ecee2（独立 fresh session closure auditor）
- Evidence: 开放审计真实性抽核 3 条（四态表 spec 对照/勘误附注/登记在案）、round-2 cosmetic 修正核实、K2 列宽三落点独立互证、收官盘查重确认；V3 loading 标注精度 Minor 已随手修正（间接形态 ⚠）。

Follow-up:

- 族 G watch-only residual 与 improvement-analysis 清单移交后续治理轮；无本 plan-owned work。
