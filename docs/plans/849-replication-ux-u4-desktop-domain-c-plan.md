# 849 复刻页 UX 保真 U4：桌面域 C 深修（M1/M2/S2/O1/O2）

> Plan Status: active
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U4）+ docs/analysis/replication-ux/upstream-mall-mobile-baseline.md（§2.3 desktop 口径 + §6 方法分工）
> Related: plan 845（U0）、846（U1）、847（U2）

## Purpose

桌面域 C 五页（M1 `mes-shopfloor-board`、M2 `mes-work-reporting`、S2 `mall-distribution`、O1 `doc-ocr-workbench`、O2 `doc-hitl-inbox`）逐页渲染面深修：浅/深双主题 + 交互中间态三步法走查，findings 全处置，focused e2e `--retries=0` 全绿。已知在册预警 K2 横滚裁切登记于 roadmap §3 U4 说明列，实际页面属 K2（U3 域）；本 plan 的 S2 为商城域页——desktop 族中唯一强制品牌令牌对齐（baseline §2.3）。

## Current Baseline

- 五页 schema 均在 `page-schemas/`（通用 SchemaPage，无 host override）；O1 为新 type 临时形态页（detail-field/bbox 整图近似，G19/G20 收窄裁决在案）。
- 五 spec 在仓：`replication-mes-shopfloor-board / replication-mes-work-reporting / replication-mall-distribution / replication-doc-ocr-workbench / replication-doc-hitl-inbox`（test 计数执行时实测登记）。
- S2 商城域：desktop 族唯一强制品牌令牌对齐——经 baseline §2.3 等价类移植裁决落地为 `--repl-mall-*`/repl-_ 类，不引入上游 `.mall-_` 类名。
- P2 MIN-5 深色未验证在册；plan 846/847 约定（hsl(var()) 写法、shell 高度链、令牌移植裁决）沿用。
- plan 846/847 确立的约定：`hsl(var(--token, fallback))` 令牌写法、shell 高度链模式、页面级 repl-\* 类落 replication.css。

## Goals

- 五页评分卡（A-H 双主题）+ findings 台账落档（`docs/analysis/replication-ux/u4-desktop-c-walkthrough.md`）。
- S2 商城域品牌令牌对齐收口（本批唯一强制项；走查 findings 驱动其余修复项）。
- 修复后五 spec focused `--retries=0` 全绿；评分卡终态达标。

## Non-Goals

- 渲染器包源码修改（共性根因登记/U6）。
- U2/U3/U5 页面；新 type 缺口只登记不立项。

## Scope

### In Scope

- 五页 schema / replication.css 页面级类 / mock 形态的显示修复；走查报告；e2e 复跑与裁决记录。

### Out Of Scope

- 渲染器包、U6 全量归族、上游仓、其它域页面。

## Test Strategy

必须自动化：五 spec focused `--retries=0` 硬门；视觉判据程序化。

## Execution Plan

### Phase 1 - 走查取证

Status: planned
Targets: findings 台账

- Item Types: `Proof`

- [ ] 五页浅/深双主题截图（视口按各页 spec 同款）+ 交互中间态取证（playwright 探针，截图 `_tmp/ux-fidelity/u4/`）
- [ ] A-H 评分卡逐页 + findings 台账；S2 品牌令牌对齐逐项取证（§2.1/§2.2 表）
- [ ] O1 新 type 临时形态页（wizard/detail-field 低置信高亮/image-compare）与 M1 大屏（scada-canvas/dashboard 轮询）取证

Exit Criteria:

- [ ] 台账落档；每条 finding 有程序化证据

### Phase 2 - 修复

Status: planned
Targets: 五页 schema/replication.css/mock

- Item Types: `Fix`

- [ ] findings 逐条处置（含 S2 品牌令牌对齐）；断言调整逐条裁决
- [ ] 修复后逐页评分卡终态复录并判定达标

Exit Criteria:

- [ ] 处置表零未处置 Blocker/Major；终态达标；共性根因登记/归族标注完成

### Phase 3 - e2e 硬门与收口

Status: planned
Targets: 五 spec

- Item Types: `Proof`

- [ ] 五 spec focused `--retries=0` 全绿
- [ ] daily log；closure audit（独立子 agent）；roadmap §3 U4 回写同 commit（回写时对 U4 行说明列"含 K2 横滚裁切 residual"做归属勘误附注——K2 页面属 U3/plan 848，审查 Minor-2）

Exit Criteria:

- [ ] 全绿 + closure audit approved + 同 commit 回写

## Failure Paths

| 场景                  | 触发                 | 行为                        | 可重试 | 用户可见表现       |
| --------------------- | -------------------- | --------------------------- | ------ | ------------------ |
| visual-fix-breaks-e2e | 视觉修复破坏载荷断言 | 断言为准，回退或调实现      | 是     | e2e 绿为最终态     |
| renderer-level-defect | 组件族共性根因       | 页面侧 workaround + 登记/U6 | 是     | 页面达标，登记在案 |

## Draft Review Record

- Reviewer / Agent: agent_e35aac85（fresh session）
- Verdict: `pass`（round-1 fail → 修订 → round-2 pass；零 Blocker/Major）
- Rounds: 2
- Findings addressed: round-1 Major-1（Goals I1/I2 残留→S2 品牌令牌收口）/Minor-1（In Scope 删 K1 host）/Minor-2（Phase 3 补 U4 行 K2 归属勘误条款）/Minor-3（等价类移植措辞）；round-2 行级复核确认全消

## Closure Gates

- [ ] Phase 1-3 Exit Criteria 全勾
- [ ] 五页 findings 零未处置 Blocker/Major
- [ ] 五 spec focused `--retries=0` 全绿
- [ ] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`（触达面）+ `pnpm check` 通过
- [ ] roadmap §3 U4 回写 `done` 同 commit
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
