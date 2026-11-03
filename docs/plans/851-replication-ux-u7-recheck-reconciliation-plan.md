# 851 复刻页 UX 保真 U7：同探针复检轮 + 覆盖对账

> Plan Status: draft
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U7）
> Related: 845（U0）、846（U1）、847（U2）、848（U3）、849（U4）、850（U5）、8xx（U6，编号待 U6 启动时顺延）

## Purpose

U6 归族整改完成后，21/21 页以 R2 固化探针同口径复检：零未处置 Major、截图证据归档 `_tmp/ux-fidelity/`、逐页台账对账（走查/修复/复检三态 21/21 uncovered=0）。

## Current Baseline

- U0 基准卡 §1 21 页枚举清单为对账权威；U1-U6 各批走查报告落 `docs/analysis/replication-ux/`（u1-mobile / u2-desktop-a / …）。
- R2 固化探针在仓可复用：`tests/e2e/helpers/` visual-contrast.ts / form-actions-alignment.ts / overlay-actions-alignment.ts / interaction-state-probes.ts + visual-assert.ts / visual-theme.ts。
- 21 页 focused spec 族在仓（各 replication-\*.spec.ts）。

## Goals

- 21/21 页同探针复检报告（评分卡终态复核 + 截图归档 `_tmp/ux-fidelity/recheck/`）。
- 覆盖对账表：页 × （走查批 / findings 处置态 / 复检结论），uncovered=0。
- 零未处置 Major；新发现零新增 fail（新增 finding 按严重度回退处置或登记 residual）。

## Non-Goals

- 新一轮修复批（复检发现的新 Blocker/Major 按 roadmap §8 字母后缀拆批预授权另立 plan 处置）。
- 渲染器包源码修改。

## Scope

### In Scope

- 复检探针脚本（`_tmp/` 或提升 `scripts/__tests__/`）、复检报告 `docs/analysis/replication-ux/recheck-report.md`、对账表、截图归档。

### Out Of Scope

- 新修复批、渲染器包、上游仓。

## Test Strategy

必须自动化：探针程序化取证；21 页 focused e2e 全量复跑（`--retries=0`）作为回归底座。

## Execution Plan

### Phase 1 - 探针复检

Status: planned
Targets: `_tmp/ux-fidelity/recheck/`

- Item Types: `Proof`

- [ ] 21 页双主题截图 + 探针取证（对比度/动作对齐/弹层对齐/交互态四件套适用面逐页过）
- [ ] 21 页 focused e2e 全量复跑 `--retries=0`

Exit Criteria:

- [ ] 截图归档 + 取证数据落盘；e2e 全量绿

### Phase 2 - 对账与报告

Status: planned
Targets: `docs/analysis/replication-ux/recheck-report.md`

- Item Types: `Proof | Decision`

- [ ] 21/21 对账表（页 × 走查批 × 处置态 × 复检结论），uncovered=0
- [ ] 零未处置 Major 复核；新发现分级处置裁决（回退修复批/登记 residual）

Exit Criteria:

- [ ] 报告落档；对账 21/21 uncovered=0；零未处置 Major

## Failure Paths

| 场景              | 触发                     | 行为                                            | 可重试 | 用户可见表现                        |
| ----------------- | ------------------------ | ----------------------------------------------- | ------ | ----------------------------------- |
| recheck-new-major | 复检发现新 Blocker/Major | 按 §8 拆批预授权另立修复 plan；本 plan 记录裁决 | 是     | 台账 uncovered=0 维持（新项入新批） |

## Draft Review Record

- Reviewer / Agent: （待独立子 agent 审查）
- Verdict: 待审
- Rounds: —
- Findings addressed: —

## Closure Gates

- [ ] Phase 1-2 Exit Criteria 全勾
- [ ] 21/21 对账 uncovered=0；零未处置 Major
- [ ] 21 页 focused e2e 全量 `--retries=0` 绿
- [ ] `pnpm check` 零新增
- [ ] roadmap §3 U7 回写 `done` 同 commit
- [ ] daily log 收口记录
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 探针脚本若具备回归价值，提升进 `tests/e2e/helpers/`（按 AGENTS.md \_tmp 晋升通道）。

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent: （待独立审计）
- Evidence: —

Follow-up:

- （待收口）
