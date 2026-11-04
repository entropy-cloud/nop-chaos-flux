# 847 复刻页 UX 保真 U2：桌面域 A 深修（W2/W3/C1/C2/C3）

> Plan Status: completed
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U2）+ docs/analysis/replication-ux/upstream-mall-mobile-baseline.md（§2.3 desktop 对齐口径 + §6 方法分工）
> Related: plan 845（U0 completed）、plan 846（U1 completed）

## Purpose

桌面域 A 五页（W2 `wms-wave-picking`、W3 `wms-stock-ledger`、C1 `crm-opportunity-kanban`、C2 `crm-customer-360`、C3 `crm-sales-dashboard`）逐页渲染面深修：浅/深双主题 + 交互中间态三步法走查，findings 全处置，focused e2e `--retries=0` 全绿。已知在册预警 W3 透视列序、I1 双按钮对（属 U3）不在本 plan。

## Current Baseline

- 五页 schema 均在 `page-schemas/`（desktop 域，无 host override）；页面级 CSS 落点 `shared/replication.css`。
- 五 spec 在仓：`replication-wms-wave-picking / replication-wms-stock-ledger / replication-crm-opportunity-kanban / replication-crm-customer-360 / replication-crm-sales-dashboard`，合计 48 test，1.0 全绿基线。
- 对齐口径（baseline §2.3）：desktop 族以 replication.css repl-\* 令牌基线 + §2.2 间距/圆角/字号档位通则；商城品牌色仅 S2 域强制。深色主题：`data-mode='dark'`。
- P2 MIN-5（replication.css 浅色硬编码/深色未验证）在册——桌面族深色走查为首次系统覆盖。
- plan 846 系统根因②（裸 HSL 令牌陷阱）同样适用于桌面 repl-\* 类——走查时按 improvement-analysis 2026-11-04 条目复核。

## Goals

- 五页逐页评分卡（A-H，双主题 + 交互中间态）+ findings 台账落档（`docs/analysis/replication-ux/u2-desktop-a-walkthrough.md`）。
- findings 零未处置 Blocker/Major；Minor 当场修或登记 residual。
- 修复后五 spec focused `--retries=0` 全绿；评分卡终态达标。

## Non-Goals

- 渲染器包源码修改（共性根因登记/U6 归族）。
- W3 透视列序 residual 重裁（维持原裁决，除非走查出新证据）。
- U3-U5 页面。

## Scope

### In Scope

- 五页 schema / replication.css 页面级类 / mock 数据形态（不破坏 e2e 载荷断言）的显示修复。
- 走查报告 + e2e 复跑 + 裁决记录。

### Out Of Scope

- 渲染器包、U6 全量归族、壳 chrome、上游仓。

## Test Strategy

必须自动化：五 spec focused `--retries=0` 硬门；视觉判据程序化（getComputedStyle/locator），截图仅评审证据。

## Execution Plan

### Phase 1 - 走查取证（五页双主题）

Status: completed
Targets: findings 台账

- Item Types: `Proof`

- [x] 五页浅/深双主题截图（视口按各页 spec 同款：W2/W3/C2/C3 1440×900、C1 2160×1050） + 交互中间态（hover/focus/dialog/drawer/loading/空态）取证（playwright 探针脚本，截图落 `_tmp/ux-fidelity/u2/`，评审用 Read 读图）
- [x] A-H 评分卡逐页 + findings 台账（程序化证据）；裸 HSL 令牌写法全页复核
- [x] W3 透视列序在册 residual 复查（无新证据，维持原裁决）

Exit Criteria:

- [x] 评分卡 + findings 台账落档（u2-desktop-a-walkthrough.md）；每条 finding 有程序化证据

### Phase 2 - 修复

Status: completed
Targets: 五页 schema + replication.css 页面类 + mock

- Item Types: `Fix`

- [x] findings 逐条处置（Major 2 项修/登记；Minor 1 修 + 余登记 residual）；零断言调整
- [x] 修复后逐页评分卡终态复录并判定达标（五页全达标）

Exit Criteria:

- [x] 处置表零未处置 Blocker/Major；终态评分卡达标；共性根因两条登记 improvement-analysis（2026-11-04 U2 条目）

### Phase 3 - e2e 硬门与收口

Status: completed
Targets: 五 spec

- Item Types: `Proof`

- [x] 五 spec focused `--retries=0` 全绿
- [x] daily log；closure audit（独立子 agent）；roadmap §3 U2 回写同 commit

Exit Criteria:

- [x] 全绿 + 门禁零新增 + closure audit approved + 同 commit 回写

## Failure Paths

| 场景                  | 触发                 | 行为                           | 可重试 | 用户可见表现       |
| --------------------- | -------------------- | ------------------------------ | ------ | ------------------ |
| visual-fix-breaks-e2e | 视觉修复破坏载荷断言 | 断言为准，回退视觉方案或调实现 | 是     | e2e 绿为最终态     |
| renderer-level-defect | 组件族共性根因       | 页面侧 workaround + 登记/U6    | 是     | 页面达标，登记在案 |

## Draft Review Record

- Reviewer / Agent: agent_59a165b1（fresh session）
- Verdict: `pass`（零 Blocker/Major，3 Minor）
- Rounds: 1
- Findings addressed: Minor-1（走查视口改为各页 spec 同款：W2/W3/C2/C3 1440×900、C1 2160×1050）、Minor-2（Phase 3 Exit Criteria 去重全量门禁，归 Closure Gates）；Minor-3（Phase 3 以实跑为准）已按执行口径吸收

## Closure Gates

- [x] Phase 1-3 Exit Criteria 全勾
- [x] 五页 findings 零未处置 Blocker/Major
- [x] 五 spec focused `--retries=0` 全绿
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`（触达面）+ `pnpm check` 通过
- [x] roadmap §3 U2 回写 `done` 同 commit
- [x] daily log 收口记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

（无——执行中推翻条目当场落本节）

## Non-Blocking Follow-ups

- U6 归族收敛页面级直值。

## Closure

Status Note: 五页走查 12 findings（Major 2：F-C3-1 修复、F-W3-1 renderer 级登记）全处置；评分卡终态五页达标；48/48 `--retries=0` + 全量门禁绿；closure audit approved（2 Minor 勘误同 commit 修正：评分卡计数 9/9、registry 两条 U2 条目当场落档）。

Closure Audit Evidence:

- Auditor / Agent: agent_2b71b6bf（独立 fresh session closure auditor）
- Evidence: 抽核 6 条处置落盘全数证实（chart.tsx aspect-video 根因、pivot resolveDesignTokens probe 源码吻合、diff 面逐字一致）；48 计数实测吻合；residual/维持裁决诚实性通过。

Follow-up:

- U6 归族：裸 HSL × canvas probe 令牌收敛、ChartContainer aspect-video ui 族解法、5 项 residual——均已登记，非本 plan-owned work。
