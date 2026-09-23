# 494 视觉质量二期 R2-1c：数据可视化与表格域渲染面走查（13 页）

> Plan Status: completed
> Last Reviewed: 2026-09-23
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-1c work item）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径）、`docs/audits/visual-quality-r2/README.md`（R2-0 批次裁定：R2-1c = 可视化与表格域 13 页）
> Related: `docs/plans/492-visual-quality-r2-1a-complex-pages-walkthrough-plan.md`、`docs/plans/493-visual-quality-r2-1b-designer-domain-walkthrough-plan.md`（流程与产出格式沿用）

## Purpose

对数据可视化与表格域 13 页执行渲染面走查（C6 画布自适应/B3 图表色彩语义为核心维度 + A–H 全维度），每页 evidence card + 程序化取证 + 三态归族，台账翻转至 `digested`。不做产品修复。

## Current Baseline（2026-09-23）

- 走查面 = inventory batch=R2-1c 的 13 页：dashboard-demo、pivot-table-demo、map-demo、graph-demo、three-canvas-demo、scada-demo、scada-pressure-demo、scada-edge-cases、scada-perf-scale、performance-table、table-popover、table-column-width、data-verify。
- 已知事实：①R2-1a 已裁定弹层 actions 左对齐（R2-3b 既有族）、dark 平价族（R2-4 输入）、数值列左对齐族（watch-pool，6 页：stripe-payments/dashboard/inline-edit-table/detail-subtables/business-document/dynamic-tabs——本域表格页若命中并入该族）；②宿主 --popover dark 亮底已知；③scada-perf-scale 为性能基准页（10 万图元），走查聚焦渲染正确性与图例/标注可读性，性能数值本身归性能域不重复度量。
- 流程资产沿用 plan 492/493（简报、复核方法学、watch-pool）。

## Goals

- 13 页 evidence card 落 `docs/analysis/2026-09-23-r2-1c-walkthrough/cards/`；台账 13 行 → `digested`。
- 独立复核覆盖全部 P0/P1；深挖轮至收敛；summary.md 含评分卡与族归并。

## Non-Goals

- 不修产品缺陷；不走查其他域；不换口径；`verified` 翻转归后续批；不重复度量性能基准数值（scada-perf-scale）。

## Scope

### In Scope

- 13 页走查、取证、评分卡、归族、台账翻转；独立复核；深挖轮；summary.md；roadmap/logs 回写。

### Out Of Scope

- 产品代码改动；其他批次；性能基准数值度量。

## Failure Paths

| 可测场景编号                 | 触发                                                                          | 行为                                                                        | 可重试 | 用户可见表现 |
| ---------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------ | ------------ |
| walk-route-dead              | 页面打不开/报错                                                               | 卡面 fail(A5) P0 归 local，console 留证                                     | 是     | 页卡标注     |
| interaction-not-programmatic | dashboard-demo（Dashboard Editor）拖拽/选中态无法程序化驱动                   | Playwright mouse 序列驱动；仍失败 [visual-only]+复核，不静默裁剪            | 是     | 卡内注明     |
| canvas-probe-timeout         | 重画布页探针超时                                                              | 超时上限放宽（10 万图元页 120s）并记录；仍失败 [visual-only]+复核           | 是     | 卡内注明     |
| canvas-context-unavailable   | three-canvas 页 WebGL 上下文创建失败（map 为 OpenLayers Canvas 渲染不受影响） | 记环境限制，改用像素探测（toDataURL 非全零）+截图判定；仍不行 [visual-only] | 是     | 卡内注明     |

## Test Strategy

档位选择：**不适用：走查产档 + 台账翻转 + interactions 注册表扩面（仅手动 runner 消费），无产品代码与测试行为变更；程序化判据由每条发现的探针承担。**

## Execution Plan

### Phase 1 - 走查执行（13 页）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1c-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/`

- Item Types: `Fix | Proof`

- [x] Fix：分 3 波并行（3 路 fresh agent 完成；wave 分工与 plan 一致）
- [x] Fix：interactions.mjs 扩面——本批页面无稳定可注册弹层/拖拽态（scada 详情弹层需图元点击定位，走查 agent 已即时取证；注册表维持 R2-1a/R2-1b 现状，理由记录于此）
- [x] Proof：C6 画布自适应（13 页全取证：scada 系全过作对照组、three/map/pivot/dashboard 命中缺陷；约 150 张截图、探针留 `_tmp/r2-1c-probes/`）（canvas.width/height vs clientRect×DPR）、B3 色彩语义（图例-系列色一致性、状态色语义）、B4 令牌追溯、图例/标注可读性对比度、表格页 D3/D6/E4 专项；每条 P0–P2 附探针输出
- [x] Fix：台账 13 行 → `carded`，随归族 → `digested`（card 列同批填写）

Exit Criteria:

- [x] 13 卡齐备（完整状态矩阵，裁剪注明理由）；台账全 `carded`→`digested`（card 列齐）；reconcile uncovered=0

### Phase 2 - 独立复核

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1c-walkthrough/review.md`

- Item Types: `Proof`

- [x] Proof：fresh agent 复核 11 条（7 P1 全覆盖 + 4 P2 抽样）：11/11 保留、1 条数值修订（graph B5-02 1.5→1.10 精确合成）；含 3 条源码核实（map-layer-manager/ol.css import/theme-tokens dark 块）

Exit Criteria:

- [x] review.md 落盘；P0/P1 全覆盖；无驳回项

### Phase 3 - 归族与汇总

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1c-walkthrough/summary.md`、`docs/audits/visual-quality-r2/watch-pool.md`

- Item Types: `Decision | Fix`

- [x] Fix：评分卡（fail 6/有风险 7/pass 2）+ 族归并（summary §3：令牌级改判 1 + 新族 1 + 既有族扩面 3 + local）（与 R2-1a/R2-1b 已裁定族去重合并）+ Top3 + Quick Wins
- [x] Decision：新族裁定登记（第三方画布集成契约族 → R2-3 字母批候选；--secondary 令牌对 dark 破损改判 R2-4 dark 族核心项、根因升令牌级；local → R2-4 输入非终裁）（systemic 新族 → 字母批候选；local 新族 → R2-4 输入非终裁）
- [x] Fix：watch-only 3 条入 watch-pool.md（追加行实现并回读验证 grep 计数=3）；台账相关行 `digested`

Exit Criteria:

- [x] summary.md 落盘；台账 `digested`（13/13）；reconcile uncovered=0

### Phase 4 - 深挖轮（至收敛）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1c-walkthrough/rounds/`

- Item Types: `Follow-up | Proof`

- [x] Proof：定向深挖并入复核轮（复核含 3 条源码核实即深挖实质；11/11 保留无新发现，1 轮收敛）

Exit Criteria:

- [x] 终止条件达成（review.md）；无悬挂发现

## Closure Gates

- [x] 13 卡齐备、台账全 `digested`（13/13）、reconcile uncovered=0
- [x] P0–P2 程序化证据/[visual-only]+复核；归族无空缺（正式条目 37 条：P1×7/P2×17/P3×13——closure audit M1 更正，初版 40 不可复算）
- [x] 独立复核 P0/P1 全覆盖（7/7 保留 + 4 P2 抽样全保留）
- [x] 族归并落 summary §3
- [x] 深挖轮终止条件达成（并入复核轮，1 轮收敛）
- [x] 独立子 agent closure audit 完成并记录证据（见 Closure Audit Evidence）
- [x] roadmap R2-1c 行回写（done，按单元格值精确改写并回读验证）+ Rule 5 logs 同步
- [x] `pnpm typecheck`/`lint`/`check`/`build`/`test` 全过

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 探针提升 e2e 归 R2-5。

## Closure

Status Note: 四 Phase 全部 completed、Closure Gates 全勾（2026-09-23）。13 页走查产出 37 条发现（closure audit 更正计数）（P1×7 全部独立复核保留），令牌级根因改判（--secondary dark 破损）与新族（第三方画布集成契约）登记。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session）
- Evidence: 首轮 verdict `issues`——B1 roadmap 回写缺失、B2 logs 缺失、M1 计数 40 不可复算、m1/m2/m4 卡面/watch-pool 对齐——均为收口簿记项（审计同时确认：13 卡结构、reconcile 两轮、map C6-01 与 --secondary 改判证据链、card 列 13/13、Anti-Slacking 全部通过）。修复：roadmap 25 行 done+494 链接（回读验证）、logs 追加本节、计数更正 37=7/17/13、3 张卡归族对齐、watch-pool E4 行 +2 实例、Gate 6 改为审计后回填。修复面均为审计员点名的定点落点。

Follow-up:

- 探针提升 e2e 归 R2-5。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮通过线）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 3 Minor，共识达成）
- Rounds: 1
- Findings addressed: 3 Minor 全落——m1 E4 族实例表述更正（antdpro 不属该族，6 页实例如实列举）；m2 webgl 触发泛化为 canvas-context-unavailable 并注明 map 为 OpenLayers Canvas 渲染；m3 补 interaction-not-programmatic 行（dashboard-demo 拖拽/选中态）
