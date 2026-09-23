# 497 视觉质量二期 R2-2b：控件族走查批二（data/content/layout/mobile，46 控件）

> Plan Status: active
> Last Reviewed: 2026-09-24
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-2b work item）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径）、`docs/audits/visual-quality-r2/README.md`（R2-0 批次裁定：R2-2b = content 20 + data 13 + layout 8 + mobile 5，fixtureRequired=0）
> Related: plan 496（R2-2a，流程与产出格式沿用，同日收口）、plan 492–495（R2-1 四批）

## Purpose

对 R2-2b 批 46 个 renderer 定义逐控件执行状态矩阵走查（载体 = 各控件 lab 路由，全部有 live labRoute、无 fixture 补齐需求），每控件 evidence card + 程序化取证 + A–H 评分卡 + 三态归族，台账 46 行 `pending → carded → digested`。批产出并入 R2-4 首批族终裁输入（合并 R2-1a/R2-2a 台账后复核排序，roadmap：R2-4 范围 = R2-1a/R2-2a 归族后最大 local 族，本批为其扩面证据源之一）。不做产品修复。

## Current Baseline（2026-09-24）

- R2-2a（plan 496）执行已收口（台账 59/139 翻转齐）：controls 台账 digested 59/139（pending 80 = 本批 46 + R2-2c 34）；pages 121/121 digested；reconcile uncovered=0。
- 本批控件（inventory batch=R2-2b 实数，按 sourcePackage 族分组、同 README 批次裁定；controls.json 的 category 字段为另一维度勿混用）：content 20（alert/audio/card/cards/carousel/diff-view/empty/html/image/json-view/link/mapping/markdown/progress/qrcode/result/separator/spinner/status/video）、data 13（batch-bar/chart/crud/data-source/echarts/list/pagination/query-filter/sparkline/stat-tile/statistics/table/tree）、layout 8（button-group/collapse/dropdown-button/grid/responsive/steps/timeline/wizard）、mobile 5（countdown/infinite-scroll/notice-bar/pull-refresh/swipe-cell）。
- 矩阵档位：full 3（crud、table、wizard——R2-0 六属性阈值裁定）；simplified 43（matrixReason 已在 inventory）。fixtureRequired = 0（46/46 有 lab 载体）。
- 已知族（命中即引用不另立，R2-1a–d + R2-2a 归并后清单）：dark 平价/对比度族（R2-4，本批 chart/echarts/sparkline 等数据可视控件的 dark 轴/图例为高危面）；弹层 actions 左对齐（R2-3b）；表格 sticky 操作列透明底（R2-2a summary §5.3，本批 crud/table 为高概率复现面）；校验呈现三不一致族（R2-2a summary §5.2，query-filter/wizard 校验呈现可能复现）；A3 小目标；chip 遮挡；窄视口 flex/固定壳层（R2-3c 候选）；schema 动态响应性缺口 / 表单 AMIS 契约缺口（validate.api、submit payload）/ 图标别名回环（R2-3 候选，home/house 死链已坐实）；lab 载体与环境基建族（notify no-op、runner dark、scope-debug 面板——R2-2a 新登记）；i18n zh-CN 回退（30+ 控件已有实例）；数值列左对齐（table/crud/sparkline 核对口）；宿主级 `--popover` dark 亮底、`.nop-theme-root` 钉死 color-scheme:light；其余既有裁定族（G7 双向同步、默认栈宽基线等）以 `watch-pool.md` 与 R2-2a summary §4/§5 为准，命中即引用原条目。
- 重叠说明：R2-1d 已走查 diff-view / carousel 等控件的 **demo 页面**（如 diff-perf-scale、w4a-multimedia）；本批走查各控件的 **lab 载体面**，独立台账单元；R2-1d 已裁定条目命中时引用原条目（族实例/同证），不重复立项。

## Goals

- 46 张控件 evidence card 落 `docs/analysis/2026-09-24-r2-2b-walkthrough/cards/`（卡 id = `control:<type>`）；台账 46 行 → `digested`。
- 独立复核覆盖全部 P0/P1；P2 以全查为执行目标（496 实绩），closure 门槛 ≥1/3；深挖至收敛；summary.md 评分卡 + 族归并（与 R2-1a–d/R2-2a 已裁定族去重合并）+ **R2-4 首批族终裁输入刷新**（合并 R2-1a/R2-2a/本批台账重排）。
- owner-doc drift（卡内发现与 `docs/components/<type>/design.md` 不一致处）逐条回写或登记。
- `docs/components/amis-baseline-matrix.md` 如有对照漂移一并回写。

## Non-Goals

- 不修产品缺陷；不走查 R2-2c 控件；不换口径；`verified` 翻转归后续批；R2-4 修复执行归 R2-4 批（本批只刷新终裁输入）；R2-3 字母批立项归 roadmap 队列。

## Scope

### In Scope

- 46 控件走查、取证、评分卡、归族、台账翻转；独立复核；深挖轮；summary.md；owner-doc drift 回写；roadmap/logs 回写。

### Out Of Scope

- 产品代码改动；R2-2c 批；性能数值度量；R2-4/R2-3 修复执行。

## Failure Paths

| 可测场景编号      | 触发                                    | 行为                                                               | 可重试 | 用户可见表现 |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------ | ------ | ------------ |
| lab-route-dead    | lab 路由打不开/控件不渲染               | 卡面 fail(A5) P0 归 local，console 留证；LEDGER 行注 dead-route    | 是     | 卡内标注     |
| interaction-dead  | 交互态无法程序化驱动（拖拽/弹层/触摸）  | Playwright mouse/touch 序列；仍失败 [visual-only]+复核，不静默裁剪 | 是     | 卡内注明     |
| async-state-miss  | 异步中间态（loading/error）无法稳定截帧 | 交互键 waitFor selector 稳态 + 截帧序列；无法程序化登记卡内        | 是     | 卡内注明     |
| owner-doc-missing | 控件无 docs/components/<type>/design.md | 卡内登记 drift，不新建 design.md（新建归后续 plan）                | 否     | 卡内注明     |

## Test Strategy

档位选择：**不适用：走查产档 + 台账翻转 + interactions 注册表扩面（仅手动 runner 消费）+ owner-doc 文档回写，无产品代码与测试行为变更；程序化判据由每条发现的探针承担。**

## Execution Plan

### Phase 1 - 走查执行（46 控件，6 波）

Status: planned
Targets: `docs/analysis/2026-09-24-r2-2b-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/`

- Item Types: `Fix | Proof`

- [ ] Fix：分 6 波并行（6 路 fresh agent；若限流降并发重跑）：wave1 content 前半 10（alert/audio/card/cards/carousel/diff-view/empty/html/image/json-view）；wave2 content 后半 10（link/mapping/markdown/progress/qrcode/result/separator/spinner/status/video）；wave3 data 前半 7（batch-bar/chart/crud/data-source/echarts/list/pagination）；wave4 data 后半 6（query-filter/sparkline/stat-tile/statistics/table/tree）；wave5 layout 8（button-group/collapse/dropdown-button/grid/responsive/steps/timeline/wizard）；wave6 mobile 5（countdown/infinite-scroll/notice-bar/pull-refresh/swipe-cell）
- [ ] Fix：interactions.mjs 扩面——本批弹层/抽屉/触摸交互态注册可复现 interaction 键（键规约 = 载体页 id `lab-<type>`，必须是 pages.json 真实 id）；**各波 agent 只产键定义随波报告回传，主 session 波次收齐后串行合并**；无法注册的随卡登记理由
- [ ] Proof：逐控件状态矩阵取证——widget 类：默认/hover/focus/disabled/error/readonly + 弹层开（有则必查）+ 值态（空/填/超长）；full 3 控件（crud/table/wizard）加弹层开/增删行/步骤切换/校验中间态；mobile 5 控件加触摸/滚动手势态；异步控件（list/data-source/chart）加 loading/empty/error 态；全部截图落 `_tmp/visual-inspection-2026-09-24/r2-2b/`，探针落 `_tmp/r2-2b-probes/`；每条 P0–P2 附探针输出；**dark 证据一律显式 `data-mode` 自采（R2-2a-B5-34 口径），渐变背景下对比度判读须像素采样**
- [ ] Fix：台账 46 行 → `carded`，随归族 → `digested`（card 列同批填写）

矩阵口径裁定（本批）：

- **全矩阵（3）**：crud、table、wizard——含弹层开/行编辑增删/分页筛选/步骤切换/校验失败中间态。
- **simplified 地板（43）**：light+dark（真 data-mode）、1280×800 + ~800 窄视口、元素态抽样（hover/focus/disabled 有则必查）、中间态有则必查；mobile 5 控件触摸态必查；命中疑点升全矩阵。每卡注明裁剪理由。

Exit Criteria:

- [ ] 46 卡齐备（full 3 全矩阵；simplified 地板；每卡注明裁剪理由）；台账全 `carded`（46/46；`digested` 翻转归 Phase 3）；`pnpm visual:reconcile` uncovered=0

### Phase 2 - 独立复核

Status: planned
Targets: `docs/analysis/2026-09-24-r2-2b-walkthrough/review-a|b.md`

- Item Types: `Proof`

- [ ] Proof：两路 fresh agent（按域拆分）重开页面重截同态重跑探针：覆盖全部 P0/P1；P2 以全查为执行目标（496 实绩），地板 ≥1/3；根因下探至源码层；深挖并入复核轮至收敛
- [ ] Proof：owner-doc drift 清单复核（每条 drift 对照 live code 确认后回写 `docs/components/<type>/design.md`；owner-doc-missing 登记卡内不新建）

Exit Criteria:

- [ ] review-a/b.md 落盘；P0/P1 全覆盖；无未裁决驳回项；drift 回写完成并有 grep 可验证据

### Phase 3 - 归族与汇总

Status: planned
Targets: `docs/analysis/2026-09-24-r2-2b-walkthrough/summary.md`、`docs/audits/visual-quality-r2/watch-pool.md`

- Item Types: `Decision | Fix`

- [ ] Fix：评分卡（口径：含正式 P1/P2 锚→fail / 仅 P3→有风险 / 无→pass；分布行与卡面 grep 同源复算）+ 族归并（与 R2-1a–d/R2-2a 已裁定族去重合并；新族裁定登记）+ Top3 + Quick Wins
- [ ] Decision：**R2-4 首批族终裁输入刷新**——合并 R2-1a/R2-2a/本批台账后按族内 findings 数量与影响面重排最大 local 族清单（落 summary 独立小节；R2-4 立项若已发生则改为扩面增量清单）
- [ ] Fix：watch-only 逐条入 watch-pool.md（追加行实现，grep 计数回读验证）；台账 46 行 `digested`

Exit Criteria:

- [ ] summary.md 落盘；台账 `digested`（46/46，全批 105/139）；reconcile uncovered=0；R2-4 输入小节可复算（卡面 grep 自洽）

## Closure Gates

- [ ] 46 卡齐备、台账全 `digested`（46/46）、reconcile uncovered=0
- [ ] P0–P2 程序化证据/[visual-only]+复核；归族无空缺（三态之一，计数可由卡面 grep 复算）
- [ ] 独立复核 P0/P1 全覆盖；P2 全查为执行目标、closure 门槛 ≥1/3 抽样全部有结论（保留/降级/驳回各有依据）
- [ ] 族归并落 summary §4；R2-4 终裁输入刷新小节齐备
- [ ] owner-doc drift 全部回写或登记（无静默 drift）
- [ ] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项）
- [ ] roadmap R2-2b 行回写（done + Plan 列链接，按单元格值精确改写并回读验证）+ Rule 5 logs 同步
- [ ] `pnpm typecheck`/`lint`/`check`/`build`/`test` 全过

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 探针提升 e2e 归 R2-5。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮 pass-with-minors）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 5 Minor）→ 5 Minor 定点修复后升 active
- Rounds: 1
- Findings addressed: M1 P2 覆盖口径三处不一致（统一为"P0/P1 全覆盖；P2 以全查为执行目标，closure 门槛 ≥1/3"）；M2 已知族清单缺 4 项既有裁定族（补表格 sticky 操作列底、校验呈现三不一致两行 + watch-pool/R2-2a summary §4/§5 权威指针）；M3 "R2-2a 已收口"措辞改"执行已收口（台账 59/139 翻转齐）"（roadmap↔496 文件状态差异归 closure audit 流程收敛）；M4 controls.json category 与 sourcePackage 族分组同名不同值（括注"按 sourcePackage 族、同 README 批次裁定"）；M5 Draft Review Record 补模板三行占位（本行即回填）。审查核实：46 控件名单/波次/矩阵档位/fixtureRequired=0/载体 id/台账基线/R2-4 接口口径全部与 live repo 程序化对账一致。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立 closure audit>>
- Evidence: <<待填>>

Follow-up:

- <<完成时填写>>
