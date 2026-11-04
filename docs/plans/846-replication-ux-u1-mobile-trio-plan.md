# 846 复刻页 UX 保真 U1：mobile 族三页深修（W1/M3/S1）

> Plan Status: completed
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U1）+ docs/analysis/replication-ux/upstream-mall-mobile-baseline.md（§3 对标卡权威）
> Related: plan 845（U0，completed）

## Purpose

mobile 族三页（W1 `wms-pda-receiving`、M3 `mes-andon-material`、S1 `mall-sku-picker`）以 §3 对标卡为基准逐页渲染面深修：显示彻底修复（含 S1 画廊占位色块正式取证与处置）、交互正确性手感动检，focused e2e `--retries=0` 全绿收口。

## Current Baseline

- 三页均以 375×667 mobile canvas host override 承载（`replication/*-host.tsx`，`.repl-mobile-canvas*`）；schema：`page-schemas/mall-sku-picker.json`（571 行）+ W1/M3 同目录 JSON。
- e2e 三 spec 在仓：`replication-mall-sku-picker.spec.ts`（12 test）/ `replication-wms-pda-receiving.spec.ts`（13 test）/ `replication-mes-andon-material.spec.ts`（14 test），当前全绿基线（business-page-replication 1.0 收口，docs/logs/2026/10-30.md、10-31.md）。
- S1 画廊占位色块为主审目检观察（roadmap §2，未入册——本 plan U1 走查正式取证）。
- 基准与判据：baseline §3.1（S1 八区块 G1-G8）、§3.2/§3.3（W1/M3 五轴）、§2 令牌表与移植裁决、§6 四 skill 分工。
- `replication.css`（169 行）现存浅色硬编码（P2 MIN-5 在册）。

## Goals

- 三页逐页三步法走查（自由 critique → A-H grounding → 程序化取证）+ 浅/深双主题 + 交互中间态；评分卡落档。
- S1 与上游 goods-detail 并排比对（375×667 双栏截图），形态/层级/密度代差修复。
- W1/M3 五轴（导航/吸底栏/触控目标/品牌令牌/列表密度）对齐。
- 修复后三 spec focused `--retries=0` 全绿；断言不为视觉修复弱化（调整须逐条裁决记录）。

## Non-Goals

- 渲染器级产品缺陷不在本 plan 就地改渲染器包源码（组件族共性根因登记 `existing-components-improvement-analysis.md` 或归族 U6；页面级 schema/CSS/host 修复在本 plan 内做）。
- 不改上游仓；不做 U2-U5 页面。
- `replication.css` 深色主题系统性收敛归 U6（本 plan 内页面临时直值允许，但须与令牌表一致）。

## Scope

### In Scope

- 三页 schema JSON / host tsx / `replication.css` 页面级类 / mock 数据形态（不得破坏 e2e 载荷断言）的显示修复。
- 评分卡与走查报告（`docs/analysis/replication-ux/u1-mobile-walkthrough.md` 或并入 daily log）。
- 三 spec focused 复跑与必要的断言裁决记录。

### Out Of Scope

- 渲染器包（packages/\*）源码修改。
- tab bar 等壳 chrome（豁免在案）。
- U6 归族、U7 复检。

## Test Strategy

必须自动化：三 spec focused `--retries=0` 为硬门；新增视觉判据以程序化断言（getComputedStyle/locator）落 spec 或探针，不以截图为证。

## Execution Plan

### Phase 1 - 走查取证（三页 + S1 上游并排）

Status: completed
Targets: findings 台账〔U8 勘误附注：走查截图为 IAB 会话内评审证据未持久化（当时处置），程序化取证以报告记载 + git diff 核证 + e2e 可复跑承担；后续批次证据已落 `_tmp/ux-fidelity/`〕

- Item Types: `Proof`

- [x] 启动 dev server，三页 375×667 浅/深双主题截图 + 交互中间态（hover/focus/面板开/错误/空态）取证
- [x] S1 与上游 goods-detail 并排比对（上游形态以 baseline §3.1 结构树 + §2 令牌表为对标权威——上游仓为独立 runtime，逐区块对标按 §3.1 G1-G8 表执行；并排截图以"上游形态锚点 vs flux 取证值"逐行核对替代）
- [x] W1/M3 五轴逐轴取证（导航/吸底栏/触控目标/令牌/密度）
- [x] 三步法评分卡（A-H）逐页落档；findings 表（Blocker/Major/Minor + 程序化证据）；S1 占位色块正式取证（内联 SVG 纯色块实锤）

Exit Criteria:

- [x] 评分卡 + findings 台账落档（`docs/analysis/replication-ux/u1-mobile-walkthrough.md`）；每条 finding 有程序化证据（截图 + computed style/locator/elementsFromPoint）；S1 占位色块取证结论明确（F-S1-1 实锤并修复）

### Phase 2 - 修复（显示 + 交互手感动检）

Status: completed
Targets: 三页 schema/host + `replication.css` 页面级类 + mock

- Item Types: `Fix`

- [x] findings 逐条处置：Blocker/Major 当场修；Minor 当场修或登记 residual（带 Why Not Blocking）——见 walkthrough 报告处置表（F-S1-1~5、F-M3-1/2/4、F-W1-1 修复；F-W1-2/3 Minor residual 登记）
- [x] 修复后逐页评分卡**终态复录**并判定达标（walkthrough 报告评分卡节；Minor residual 项不影响达标判定）
- [x] 组件族共性根因登记 improvement-analysis（floating-panel fallback + 裸 HSL 令牌陷阱，2026-11-04 条目）；U6 归族待复核项在案
- [x] 交互手感动检（滑动/步进/求交/倒计时/刷新经 e2e 手势通道全绿 + 浏览器实操作证：面板拖拽锚点、双钮点击、深色切换）

Exit Criteria:

- [x] findings 处置表零未处置 Blocker/Major；修复 diff 清单落档；共性根因登记完成；逐页评分卡终态复录并判定达标

### Phase 3 - e2e 硬门复跑与收口

Status: completed
Targets: 三 spec

- Item Types: `Proof`

- [x] 三 spec focused 复跑显式命令形态：`pnpm test:e2e -- tests/e2e/replication-*.spec.ts --retries=0`；**39/39 全绿**（12+13+14）；断言裁决一条：M3 交互④ 行选择 #5→#2（面板覆盖区物理前置，断言语义不变，裁决注在 spec 内 + walkthrough F-M3-4）
- [x] `pnpm typecheck`/`build`/`lint` + playground focused test + `pnpm check` 零新增命中
- [x] daily log 收口记录；closure audit（独立子 agent）；roadmap §3 U1 回写同 commit

Exit Criteria:

- [x] 三 spec 全绿 + 门禁零新增 + closure audit approved + 同 commit 回写

## Failure Paths

| 场景                  | 触发                   | 行为                                                           | 可重试 | 用户可见表现           |
| --------------------- | ---------------------- | -------------------------------------------------------------- | ------ | ---------------------- |
| visual-fix-breaks-e2e | 视觉修复破坏载荷断言   | 以断言为准回退视觉方案或调整实现（不得弱化断言）               | 是     | 修复以 e2e 绿为最终态  |
| renderer-level-defect | 走查发现渲染器共性根因 | 页面侧 workaround + 登记 improvement-analysis/U6，不改渲染器包 | 是     | 页面显示达标，登记在案 |

## Draft Review Record

- Reviewer / Agent: agent_61cd2ae0（fresh session，独立审查）
- Verdict: `pass-with-minors`（round-1 fail 3 Major → 修订 → round-2 pass-with-minors，零 Blocker/Major）
- Rounds: 2
- Findings addressed: round-1 M1/M2（测试计数勘误 12/13/14）、M3（Phase 2 补终态评分卡复录条目）；round-2 Minor-1（Phase 2 Exit Criteria 行同步补终态评分卡项，见下）

## Closure Gates

- [x] Phase 1-3 Exit Criteria 全勾
- [x] 三页 findings 零未处置 Blocker/Major
- [x] 三 spec focused `--retries=0` 全绿（39/39，复跑证据在 daily log）
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`（相关触达面：playground vitest 569/569）+ `pnpm check` 通过（exit 0）
- [x] roadmap §3 U1 回写 `done` 同 commit
- [x] daily log 收口记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

（无——执行中推翻条目时当场落本节）

## Non-Blocking Follow-ups

- U6 归族时收敛本批页面级直值为 `--repl-mall-*` 变量。

## Closure

Status Note: 三 Phase completed；10 findings 全处置（8 Major 修/裁决、2 Minor residual 带 Why Not Blocking）；三页评分卡终态达标；39/39 `--retries=0` + 全量门禁绿；closure audit approved（2 Minor 交叉引用勘误已顺手修正）。

Closure Audit Evidence:

- Auditor / Agent: agent_eb8b9400（独立 fresh session closure auditor）
- Evidence: 抽核 6 条处置落盘全数证实（git diff 逐文件）；e2e 39/39 计数实测吻合（12/13/14）；M3 裁决注与 plan 一致且语义未弱化；Deferred/residual 诚实性通过（无静默降级）；2 Minor（F-M3-1→F-M3-4、F-W1-3→F-W1-1 交叉引用勘误）已同 commit 修正。

Follow-up:

- U6 归族：裸 HSL 令牌陷阱全量复核、W1 表单深度重塑/导航头 residual、渲染器 fallback——均已登记（improvement-analysis / walkthrough 残留节），非本 plan-owned work。
