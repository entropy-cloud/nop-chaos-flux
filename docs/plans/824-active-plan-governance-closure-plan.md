# 824 活跃 plan 治理面收口（两份状态滞留 plan 的独立 closure audit）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/audits/deep-audit-2026-10-31.md` §5（E2）；`docs/plans/00-plan-authoring-and-execution-guide.md` Closure Audit Rule
> Related: `docs/plans/arc-gap-g2i-inline-edit-impl-plan.md`、`docs/plans/640-cross-roadmap-ur13-edge-router-plan.md`；~~806~~（编号让位，本队列改号 820-825）

## Purpose

深审发现两份 plan 的执行清单已全勾但状态滞留（g2i: `planned` + 25/25 `[x]`；640: `draft` + 18/18 `[x]` 且含"209/209 绿"执行结果文本）。本计划按 guide Closure Audit Rule 为各自由**独立 fresh 子代理**执行 closure audit：通过则翻转状态并记录证据；不通过则退回执行态并登记缺口。收口后 plan 文本状态与实况一致。

## Current Baseline

- `docs/plans/arc-gap-g2i-inline-edit-impl-plan.md`：status `planned（2026-10-24 草案审查 approved）`，Execution Plan 25/25 `[x]`、0 `[ ]`；其 Closure 节已有部分审计史（"closure audit R1 = fail → 修复…待独立 closure audit"）。
- `docs/plans/640-cross-roadmap-ur13-edge-router-plan.md`：status `draft`（Last Reviewed 2026-10-17），Execution Plan 18/18 `[x]`，正文含执行结果文本（:91 "209/209 绿"、"红→绿"）；Closure 节已有 R1/R2 轮次记录（"待 R3 确认或按 R2 指示收口"）。
- 评审已核实的落地面锚点：`packages/flow-designer-core/src/edge-router.test.ts`（5 用例，匹配 640 "5 用例红→绿"）、`edge-router.ts`；`packages/flux-renderers-form-advanced/src/detail-view/detail-field-inline.test.tsx`（9 例，匹配 g2i）、`detail-field-basic.test.tsx`。
- guide Rule 8/11/Closure Audit Rule：`completed` 必须来自独立子 agent 的 closure audit；执行 session 不得自审勾选；"接口存在 ≠ 语义完成"，审计须抽查 live code path 与 focused tests。
- 两份 plan 的执行均发生在历史会话；本会话只做审计与状态对齐，不代其补实现。
- 时序注记：`docs/logs/2026/10-31.md` 由 plan 823 先行建立，本计划在其上追加（823 → 824 顺序）。

## Goals

- 两份 plan 各获得一轮独立子代理 closure audit（fresh session，输入=plan 文本+live repo+guide 要求，不带本会话执行上下文；须先读各 plan Closure 节的既有轮次记录并在证据中显式承接/取代）。
- 审计 approved → plan 状态翻转为 `completed` + Closure Audit Evidence 落档；审计 issues → plan 状态对齐实况（`in progress`/`partially completed`）+ 缺口清单落档。
- 状态文本五处一致性（Plan Status / slice Status / Exit Criteria / Closure Gates / logs 记录）达标。

## Non-Goals

- 不代两份 plan 补实现或补测试（若审计发现缺口，缺口归各自 plan 所有，本计划只负责把状态与登记做实）。
- 不处理 87 份历史 completed plan 的未勾选项（Rule 21，deep-audit §7 Deferred）。
- 不新增门禁或检查脚本。

## Scope

### In Scope

- 两份指定 plan 的 closure audit 编排、证据落档、状态翻转/对齐、daily log 追加记录。

### Out Of Scope

- 任何产品代码/测试变更。
- 其余 900+ 份 plan 的状态普查。

## Failure Paths

| 编号                   | 触发                                                           | 行为                                                                                                                 | 可重试 | 用户可见表现        |
| ---------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | ------------------- |
| audit-issues           | 子代理审计报 issues（实现/测试未真落地或 deferred 分类不诚实） | 该 plan 状态改为 `in progress` 并落缺口清单（由其自身 ownership 承接）；本计划如实登记后对两份 plan 的编排义务即完成 | 是     | plan 状态与实况一致 |
| audit-rounds-exhausted | 两轮审计仍未 approved                                          | 同 audit-issues 处置，不无限循环                                                                                     | 否     | 缺口可见、状态诚实  |

## Test Strategy

不适用：本计划交付物是审计编排与状态回写，无代码变更。审计子代理按需实跑 focused tests 作为证据（其结果记入被审 plan 的 Closure Audit Evidence，不属本计划的 proof 义务）。

## Execution Plan

### Phase 1 - g2i closure audit

Status: completed
Targets: `docs/plans/arc-gap-g2i-inline-edit-impl-plan.md`

- Item Types: `Proof | Decision`

- [x] 启动 fresh 子代理（agent_6f198da5，2026-10-31）：逐条核对 + 实跑 detail-field-inline 9/9、包 176 文件/1235 用例、四处语义代码级抽查——verdict **issues**（1 Major：inline-commit-fail 判别测试缺失而清单已勾 + 三处"七场景全盖"过拟声称）
- [x] 按裁定落状态：issues → Plan Status planned→**active**、Phase 1 slice → in progress、缺口项显式未勾、Closure Evidence/过拟声称就地勘误、gap 清单落 Follow-up（镜像 surface crash 测试一个 focused test，补齐即可关）

Exit Criteria:

- [x] 该 plan 的 `## Closure Audit Evidence` 有独立子代理证据（含实跑命令输出摘要），并显式承接既有 R1/R2 记录
- [x] Plan Status 与裁定一致（issues → active/in-progress 口径），五处状态文本一致

### Phase 2 - 640 closure audit

Status: completed
Targets: `docs/plans/640-cross-roadmap-ur13-edge-router-plan.md`

- Item Types: `Proof | Decision`

- [x] 启动 fresh 子代理（agent_8373ccc3，2026-10-31）：edge-router 5/5 + defensive 3/3、三包 220/220 + 56/56 + 314/314 实测、四处语义抽查、default 分支与收口前逐字节恒等比对——verdict **approved**（零 Blocker/Major，4 Minor），取代待决 R3
- [x] 按裁定落状态：approved → Plan Status draft→**completed**；4 Minor 同 commit 同步（Rounds 关闭/SKIP 补注/209 快照注记/首边残留补披露）

Exit Criteria:

- [x] 同 Phase 1 两条，对 640 成立（R3 Evidence 落档、五处一致）

### Phase 3 - 收口与登记

Status: completed
Targets: `docs/logs/2026/10-31.md`、本文件

- Item Types: `Proof`

- [x] daily log 追加记录两轮审计编排与裁定摘要（823 建档后追加）
- [x] g2i audit 报 issues：缺口（settle-fail 判别测试）已逐条登记至该 plan 正文（Execution Plan 显式未勾 + Closure Evidence 勘误 + Follow-up gap）

Exit Criteria:

- [x] daily log 有本轮记录
- [x] 两份 plan 无"状态已 completed 但 Evidence 空"的中间态（g2i 未 completed；640 completed 且 R3 Evidence 落档）

## Draft Review Record

- Reviewer / Agent: 独立子代理（general-purpose fresh session，2026-10-31）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 3 Minor 全数就地修订——①"25 项 Exit Criteria"措辞改为"Execution Plan 清单与各 slice Exit Criteria"②补两份 plan 既有审计史（R1/R2 轮次）并要求 fresh audit 显式承接/取代 ③补 823 → 824 的 daily log 时序注记

## Closure Gates

- [ ] Phase 1-3 Exit Criteria 全勾
- [ ] 两份被审 plan 的状态翻转/对齐回写与审计证据同 commit（guide Rule 9）
- [ ] 本计划自身由独立子 agent 执行 meta closure audit（审计编排是否按 guide 完成且证据齐备）
- [ ] `docs/logs/` 记录已更新

## Deferred But Adjudicated

（执行中如发生改判，当场落本节）

## Non-Blocking Follow-ups

- 若 audit-issues 发生：缺口承接归各自 plan，后续由其 owner 轮次收口

## Closure

Status Note: 两份状态滞留 plan 各获一轮 fresh 独立 closure audit 并按裁定落状态：640 R3 approved → completed（4 Minor 同步）；g2i issues（1 Major：settle-fail 判别测试缺失）→ active + 缺口显式化（不代做，respect 824 Non-Goals）。824 自身 meta audit（agent_225cfe16）approved 零 Blocker/Major。

Closure Audit Evidence:

- Auditor / Agent: g2i=agent_6f198da5（issues）、640=agent_8373ccc3（approved，取代待决 R3）、824 meta=agent_225cfe16（approved）——三者均为与执行会话隔离的 fresh session
- Evidence: meta 审计五项核验（两 plan 裁定与 824 声称一致且审计者 id 在案、640 抽查独立复跑 edge-router 5/5+defensive 3/3+220/220、g2i 缺口独立实证〔settle/rollback grep 零命中 + 9/9 复跑〕、824 文本无过度声称、三 plan+daily log 交叉一致）；2 非阻断 Minor（g2i Closure Gates 沿用 R2 时代全勾〔重关时需复核覆盖新测试〕、640 M-a 披露位置标注 imprecision）

Follow-up:

- g2i settle-fail 判别测试补齐（g2i 自有 ownership，非本 plan 剩余）
