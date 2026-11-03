# 848 复刻页 UX 保真 U3：桌面域 B 深修（I1/I2/K1/K2/K3）

> Plan Status: active
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U3）+ docs/analysis/replication-ux/upstream-mall-mobile-baseline.md（§2.3 desktop 口径 + §6 方法分工）
> Related: plan 845（U0）、846（U1）、847（U2）

## Purpose

桌面域 B 五页（I1 `itam-asset-inventory`、I2 `itam-depreciation-dashboard`、K1 `ai-knowledge-chat`〔host override〕、K2 `ai-ticket-console`、K3 `ai-approval-trail`）逐页渲染面深修：浅/深双主题 + 交互中间态三步法走查，findings 全处置，focused e2e `--retries=0` 全绿。已知在册预警 I1 双按钮对、I2 趋势量纲压扁为本 plan 明确根因修复项；K2 横滚裁切归 U4 域描述（roadmap §3 U4 注），本 plan 走查中若取证坐实则就地处置（K2 页面在本 plan）。

## Current Baseline

- 五页：4 页 schema 在 `page-schemas/`（通用 SchemaPage）；K1 为 host override（`replication/ai-knowledge-chat-host.tsx`，`.repl-ai-*` 类族在 replication.css）。
- 五 spec 在仓：`replication-itam-asset-inventory / replication-itam-depreciation-dashboard / replication-ai-knowledge-chat / replication-ai-ticket-console / replication-ai-approval-trail`（test 计数实测 11/10/9/12/9，合计 51；以实跑为准）。
- 在册预警：I1 双按钮对（F1 登记）、I2 趋势量纲（F1 登记）——本 plan Fix 项；P2 MIN-5 深色未验证在册。
- plan 846/847 确立的约定：`hsl(var(--token, fallback))` 令牌写法、shell 高度链模式、页面级 repl-\* 类落 replication.css。

## Goals

- 五页评分卡（A-H 双主题）+ findings 台账落档（`docs/analysis/replication-ux/u3-desktop-b-walkthrough.md`）。
- I1 双按钮对、I2 趋势量纲两项根因修复收口。
- 修复后五 spec focused `--retries=0` 全绿；评分卡终态达标。

## Non-Goals

- 渲染器包源码修改（共性根因登记/U6）。
- U2/U4/U5 页面；K2 横滚裁切若属渲染器共性根因则只登记。

## Scope

### In Scope

- 五页 schema / K1 host / replication.css 页面级类 / mock 形态的显示修复；走查报告；e2e 复跑与裁决记录。

### Out Of Scope

- 渲染器包、U6 全量归族、上游仓、其它域页面。

## Test Strategy

必须自动化：五 spec focused `--retries=0` 硬门；视觉判据程序化。

## Execution Plan

### Phase 1 - 走查取证

Status: planned
Targets: findings 台账

- Item Types: `Proof`

- [ ] 五页浅/深双主题截图（视口按各页 spec 同款）+ 交互中间态取证（playwright 探针，截图 `_tmp/ux-fidelity/u3/`）
- [ ] A-H 评分卡逐页 + findings 台账；I1 双按钮对、I2 趋势量纲正式取证
- [ ] K1 host 页 `.repl-ai-*` 类族与 K2/K3 抽屉/看板面取证

Exit Criteria:

- [ ] 台账落档；每条 finding 有程序化证据

### Phase 2 - 修复

Status: planned
Targets: 五页 schema/K1 host/replication.css/mock

- Item Types: `Fix`

- [ ] findings 逐条处置（含 I1 双按钮对、I2 量纲根因修复）；断言调整逐条裁决；若 K2 横滚裁切坐实就地修复：Deferred But Adjudicated 当场落节 + roadmap U4 行就地勘误附注 + 同 commit 回写（跨行记账，审查 Minor-1 裁决要求）
- [ ] 修复后逐页评分卡终态复录并判定达标

Exit Criteria:

- [ ] 处置表零未处置 Blocker/Major；终态达标；共性根因登记/归族标注完成

### Phase 3 - e2e 硬门与收口

Status: planned
Targets: 五 spec

- Item Types: `Proof`

- [ ] 五 spec focused `--retries=0` 全绿
- [ ] daily log；closure audit（独立子 agent）；roadmap §3 U3 回写同 commit

Exit Criteria:

- [ ] 全绿 + closure audit approved + 同 commit 回写

## Failure Paths

| 场景                  | 触发                 | 行为                        | 可重试 | 用户可见表现       |
| --------------------- | -------------------- | --------------------------- | ------ | ------------------ |
| visual-fix-breaks-e2e | 视觉修复破坏载荷断言 | 断言为准，回退或调实现      | 是     | e2e 绿为最终态     |
| renderer-level-defect | 组件族共性根因       | 页面侧 workaround + 登记/U6 | 是     | 页面达标，登记在案 |

## Draft Review Record

- Reviewer / Agent: agent_e9a10213（fresh session）
- Verdict: `pass-with-minors`（零 Blocker/Major，3 Minor）
- Rounds: 1
- Findings addressed: Minor-1（K2 跨行记账裁决要求预置进 Phase 2 条目——若就地修复须 Deferred 落节 + roadmap U4 行就地勘误 + 同 commit）、Minor-2（测试计数实测登记：11/10/9/12/9 合计 51，以实跑为准）、Minor-3（K1 spec 无 describe 包裹，focused 复跑命令注意定位写法）

## Closure Gates

- [ ] Phase 1-3 Exit Criteria 全勾
- [ ] 五页 findings 零未处置 Blocker/Major
- [ ] 五 spec focused `--retries=0` 全绿
- [ ] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`（触达面）+ `pnpm check` 通过
- [ ] roadmap §3 U3 回写 `done` 同 commit
- [ ] daily log 收口记录
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- U6 归族收敛页面级直值。

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent: （待独立审计）
- Evidence: —

Follow-up:

- （待收口）
