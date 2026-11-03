# 850 复刻页 UX 保真 U5：桌面域 D 深修（V1/V2/V3）

> Plan Status: active
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U5）+ docs/analysis/replication-ux/upstream-mall-mobile-baseline.md（§2.3 desktop 口径 + §6 方法分工）
> Related: plan 845（U0）、846（U1）、847（U2）

## Purpose

桌面域 D 三页（V1 `iot-telemetry-device`、V2 `iot-ota-rollout`、V3 `iot-geofence-videowall`）逐页渲染面深修：浅/深双主题 + 交互中间态三步法走查，findings 全处置，focused e2e `--retries=0` 全绿。已知在册预警 V3 围栏可视性为本 plan 根因修复项；V3 绘制/轨迹/流媒体不做交互验收（D4 §6.2 收窄裁决沿用）。

## Current Baseline

- 三页 schema 均在 `page-schemas/`（通用 SchemaPage，无 host override）；V3 为新 type 临时形态页（pin 地图/region 围栏/video 墙）。
- 三 spec 在仓：`replication-iot-telemetry-device / replication-iot-ota-rollout / replication-iot-geofence-videowall`（test 计数实测 7/7/7，合计 21；以实跑为准）。
- 在册预警：V3 围栏可视性（F1 登记）——本 plan Fix 项；P2 MIN-5 深色未验证在册；plan 846/847 约定沿用；U5 无品牌令牌强制（§2.3 对本批约束仅为 repl-\* 基线 + §2.2 档位通则）。
- plan 846/847 确立的约定：`hsl(var(--token, fallback))` 令牌写法、shell 高度链模式、页面级 repl-\* 类落 replication.css。

## Goals

- 三页评分卡（A-H 双主题）+ findings 台账落档（`docs/analysis/replication-ux/u5-desktop-d-walkthrough.md`）。
- V3 围栏可视性根因修复收口（走查 findings 驱动其余修复项）。
- 修复后三 spec focused `--retries=0` 全绿；评分卡终态达标。

## Non-Goals

- 渲染器包源码修改（共性根因登记/U6）。
- U2-U4 页面；V3 绘制/轨迹/流媒体交互（收窄裁决不做）；新 type 缺口只登记不立项。

## Scope

### In Scope

- 三页 schema / replication.css 页面级类 / mock 形态的显示修复；走查报告；e2e 复跑与裁决记录。

### Out Of Scope

- 渲染器包、U6 全量归族、上游仓、其它域页面。

## Test Strategy

必须自动化：三 spec focused `--retries=0` 硬门；视觉判据程序化。

## Execution Plan

### Phase 1 - 走查取证

Status: planned
Targets: findings 台账

- Item Types: `Proof`

- [ ] 三页浅/深双主题截图（视口按各页 spec 同款）+ 交互中间态取证（playwright 探针，截图 `_tmp/ux-fidelity/u5/`）
- [ ] A-H 评分卡逐页 + findings 台账；V3 围栏可视性正式取证（region geojson 回显/pin 点位/事件表）

Exit Criteria:

- [ ] 台账落档；每条 finding 有程序化证据

### Phase 2 - 修复

Status: planned
Targets: 三页 schema/replication.css/mock

- Item Types: `Fix`

- [ ] findings 逐条处置（含 V3 围栏可视性根因修复）；断言调整逐条裁决
- [ ] 修复后逐页评分卡终态复录并判定达标

Exit Criteria:

- [ ] 处置表零未处置 Blocker/Major；终态达标；共性根因登记/归族标注完成

### Phase 3 - e2e 硬门与收口

Status: planned
Targets: 三 spec

- Item Types: `Proof`

- [ ] 三 spec focused `--retries=0` 全绿
- [ ] daily log；closure audit（独立子 agent）；roadmap §3 U5 回写同 commit

Exit Criteria:

- [ ] 全绿 + closure audit approved + 同 commit 回写

## Failure Paths

| 场景                  | 触发                 | 行为                        | 可重试 | 用户可见表现       |
| --------------------- | -------------------- | --------------------------- | ------ | ------------------ |
| visual-fix-breaks-e2e | 视觉修复破坏载荷断言 | 断言为准，回退或调实现      | 是     | e2e 绿为最终态     |
| renderer-level-defect | 组件族共性根因       | 页面侧 workaround + 登记/U6 | 是     | 页面达标，登记在案 |

## Draft Review Record

- Reviewer / Agent: agent_e35aac85（fresh session）
- Verdict: `pass`（round-1 fail → 修订 → round-2 一处"五 spec"残留（Test Strategy 硬门口径）→ 单点修订后 pass；零 Blocker/Major）
- Rounds: 2
- Findings addressed: round-1 Major-1（计数五处页/spec 口径改三）+Major-2（Goals 根因项 I1/I2 残留→V3 围栏可视性）、Minor-1（无品牌令牌强制说明移 Baseline 节）；round-2 Major-1（Test Strategy L42"五 spec"→"三 spec"）已修，Minor-2（条款落位）已移 Baseline

## Closure Gates

- [ ] Phase 1-3 Exit Criteria 全勾
- [ ] 三页 findings 零未处置 Blocker/Major
- [ ] 三 spec focused `--retries=0` 全绿
- [ ] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`（触达面）+ `pnpm check` 通过
- [ ] roadmap §3 U5 回写 `done` 同 commit
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
