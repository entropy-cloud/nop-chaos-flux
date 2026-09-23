# 496 视觉质量二期 R2-2a：控件族走查批一（basic/form/form-advanced，59 控件）

> Plan Status: draft
> Last Reviewed: 2026-09-23
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-2a work item）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径）、`docs/audits/visual-quality-r2/README.md`（R2-0 批次裁定：R2-2a = basic 18 + form 22 + form-advanced 19，fixtureRequired=0）
> Related: plan 492/493/494/495（R2-1 四批，流程与产出格式沿用；495 同日收口）

## Purpose

对 R2-2a 批 59 个 renderer 定义逐控件执行状态矩阵走查（载体 = 各控件 lab 路由，全部有 live labRoute、无 fixture 补齐需求），每控件 evidence card + 程序化取证 + A–H 评分卡 + 三态归族，台账 59 行 `pending → carded → digested`。R2-2a 是 R2-4 首批族终裁的第二个归族来源（roadmap：R2-4 范围 = R2-1a/R2-2a 归族后台账中最大的 local 族），本批 closure 时输出 R2-4 终裁所需的合并族清单。不做产品修复。

## Current Baseline（2026-09-23）

- R2-1 四批已全部 done（121 页 digested，reconcile uncovered=0；controls 139 行仍 pending，本批消化其中 59）。
- 本批控件（inventory batch=R2-2a 实数）：basic 18（badge/button/command-palette/container/dialog/drawer/dynamic-renderer/flex/fragment/icon/keyboard/loop/page/reaction/recurse/scope-debug/tabs/text）、form 22（button-group-select/checkbox/checkbox-group/date-range/fieldset/form/hidden/input-date/input-datetime/input-email/input-month/input-number/input-password/input-quarter/input-text/input-time/input-year/markdown-editor/radio-group/select/switch/textarea）、form-advanced 19（array-editor/array-field/combo/condition-builder/detail-field/detail-view/editor/icon-picker/input-file/input-image/input-table/key-value/object-field/picker/tag-list/transfer/tree-select/variant-field）。
- 矩阵档位：full 3（condition-builder、input-table、picker——复杂度阈值裁定）；simplified 56（matrixReason 已在 inventory）。fixtureRequired = 0。
- **两类控件的走查重心分野**（styling-system.md 契约）：layout/结构类（container/flex/fragment/loop/page/recurse/dynamic-renderer/reaction/keyboard/scope-debug/tabs）按「marker classes only、无硬编码视觉类」契约核对，视觉维度大量 n/a 须注明；widget 类（其余）按自完备 UI 控件全维度走查。
- 已知族（命中即"既有族扩面"引用，不另立）：弹层 actions 左对齐（R2-3b）、dark 平价 + `--primary` dark 过亮 + 对比度（R2-4）、A3 小目标、chip 遮挡（R2-3 候选）、窄视口 flex/固定壳层（R2-3c 候选）、schema 动态响应性缺口 / 表单 AMIS 契约缺口（validate.api、submit payload）/ 图标别名回环（R2-3 候选）、数值列左对齐（watch 族）、G7 双向同步（R2-3 候选）。宿主级已知：`--popover` dark 亮底、`.nop-theme-root` 钉死 color-scheme:light。
- 重叠说明：condition-builder 的 demo **页面**已在 R2-1d 走查（R2-1d-F4-51/52、A7-52 等条目）；本批走查的是该控件的 **lab 载体面**，是独立台账单元。R2-1d 已裁定条目在本批命中时引用原条目（族实例/同证），不重复立项。

## Goals

- 59 张控件 evidence card 落 `docs/analysis/2026-09-23-r2-2a-walkthrough/cards/`（卡 id = `control:<type>`）；台账 59 行 → `digested`。
- 独立复核覆盖全部 P0/P1 + P2 抽样；深挖至收敛；summary.md 评分卡 + 族归并（与 R2-1a–d 已裁定族去重合并）+ **R2-4 首批族终裁输入清单**。
- owner-doc drift（卡内发现与 `docs/components/<type>/design.md` 不一致处）逐条回写。
- `docs/components/amis-baseline-matrix.md` 如有对照漂移一并回写。

## Non-Goals

- 不修产品缺陷；不走查 R2-2b/c 控件；不换口径；`verified` 翻转归后续批；R2-4 修复执行归 R2-4 批（本批只做终裁输入，不做终裁）；R2-3 字母批立项归 roadmap 队列。

## Scope

### In Scope

- 59 控件走查、取证、评分卡、归族、台账翻转；独立复核；深挖轮；summary.md；owner-doc drift 回写；roadmap/logs 回写。

### Out Of Scope

- 产品代码改动；R2-2b/c 批；性能数值度量；R2-4/R2-3 修复执行。

## Failure Paths

| 可测场景编号        | 触发                                    | 行为                                                                 | 可重试 | 用户可见表现 |
| ------------------- | --------------------------------------- | -------------------------------------------------------------------- | ------ | ------------ |
| lab-route-dead      | lab 路由打不开/控件不渲染               | 卡面 fail(A5) P0 归 local，console 留证；LEDGER 行注 dead-route      | 是     | 卡内标注     |
| interaction-dead    | 交互态无法程序化驱动（拖拽/弹层）       | Playwright mouse/touch 序列；仍失败 [visual-only]+复核，不静默裁剪   | 是     | 卡内注明     |
| marker-only-control | 结构类控件无独立视觉面                  | 简化矩阵 + 契约核对（marker only），卡内注明裁剪理由，视觉维度标 n/a | 否     | 评分卡 n/a   |
| owner-doc-missing   | 控件无 docs/components/<type>/design.md | 卡内登记 drift，不新建 design.md（新建归后续 plan）                  | 否     | 卡内注明     |

## Test Strategy

档位选择：**不适用：走查产档 + 台账翻转 + interactions 注册表扩面（仅手动 runner 消费）+ owner-doc 文档回写，无产品代码与测试行为变更；程序化判据由每条发现的探针承担。**

## Execution Plan

### Phase 1 - 走查执行（59 控件，6 波）

Status: planned
Targets: `docs/analysis/2026-09-23-r2-2a-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/`

- Item Types: `Fix | Proof`

- [ ] Fix：分 6 波并行（6 路 fresh agent，每波一域内聚簇；wave3/wave4 若限流则降并发重跑）：wave1 basic 前半 9（badge/button/command-palette/container/dialog/drawer/dynamic-renderer/flex/fragment）；wave2 basic 后半 9（icon/keyboard/loop/page/reaction/recurse/scope-debug/tabs/text）；wave3 form 前半 11（button-group-select/checkbox/checkbox-group/date-range/fieldset/form/hidden/input-date/input-datetime/input-email/input-month）；wave4 form 后半 11（input-number/input-password/input-quarter/input-text/input-time/input-year/markdown-editor/radio-group/select/switch/textarea）；wave5 form-advanced 前半 10（array-editor/array-field/combo/condition-builder/detail-field/detail-view/editor/icon-picker/input-file/input-image）；wave6 form-advanced 后半 9（input-table/key-value/object-field/picker/tag-list/transfer/tree-select/variant-field）
- [ ] Fix：interactions.mjs 扩面——form 控件族弹层/下拉打开态（select/picker/combo/date 族、transfer、icon-picker 等）注册可复现 interaction 键；键规约 = 载体页 id `lab-<type>`（lab 载体 124 条中 59 条为本批，键必须是 pages.json 真实 id——plan 491 M1 纪律）；无法注册的由走查 agent 即时取证并在卡内登记（理由记录）
- [ ] Proof：逐控件状态矩阵取证——widget 类：默认/hover/focus/disabled/error/readonly + 弹层开（有则必查）+ 值态（空/填/超长）；full 3 控件加拖拽中/视图切换中间态；结构类：marker-only 契约核对 + 布局行为；全部截图落 `_tmp/visual-inspection-2026-09-23/r2-2a/`，探针落 `_tmp/r2-2a-probes/`；每条 P0–P2 附探针输出
- [ ] Fix：台账 59 行 → `carded`，随归族 → `digested`（card 列同批填写）

矩阵口径裁定（本批）：

- **全矩阵（3）**：condition-builder、input-table、picker（README 复杂度裁定 full）——含拖拽中/弹层开/增删行中间态。
- **simplified 地板（56）**：≥ skill 必查项——light+dark、1280×800、~800 窄视口、元素态抽样（hover/focus/disabled 有则必查）、中间态有则必查；命中疑点升全矩阵。每卡注明裁剪理由（结构类注明契约核对替代视觉矩阵的范围）。

Exit Criteria:

- [ ] 59 卡齐备（full 3 全矩阵；simplified 地板；每卡注明裁剪理由）；台账全 `carded`→`digested`（59/59）；`pnpm visual:reconcile` uncovered=0

### Phase 2 - 独立复核

Status: planned
Targets: `docs/analysis/2026-09-23-r2-2a-walkthrough/review-a|b.md`

- Item Types: `Proof`

- [ ] Proof：两路 fresh agent（按域拆分）重开页面重截同态重跑探针：覆盖全部 P0/P1 + P2 抽样 ≥1/3；根因下探至源码层；深挖并入复核轮至收敛
- [ ] Proof：owner-doc drift 清单复核（每条 drift 对照 live code 确认后回写 `docs/components/<type>/design.md`）

Exit Criteria:

- [ ] review-a/b.md 落盘；P0/P1 全覆盖；无未裁决驳回项；drift 回写完成并有 grep 可验证据

### Phase 3 - 归族与汇总

Status: planned
Targets: `docs/analysis/2026-09-23-r2-2a-walkthrough/summary.md`、`docs/audits/visual-quality-r2/watch-pool.md`

- Item Types: `Decision | Fix`

- [ ] Fix：评分卡（口径：含正式 P1/P2 锚→fail / 仅 P3→有风险 / 无→pass；逐页标注与分布行必须同源复算）+ 族归并（与 R2-1a–d 已裁定族去重合并；新族裁定登记）+ Top3 + Quick Wins
- [ ] Decision：**R2-4 首批族终裁输入**——合并 R2-1a 与本批台账后按族内 findings 数量与影响面排序的最大 local 族清单（落 summary 独立小节，供 R2-4 plan 立项引用）
- [ ] Fix：watch-only 逐条入 watch-pool.md（追加行实现，grep 计数回读验证）；台账 59 行 `digested`

Exit Criteria:

- [ ] summary.md 落盘；台账 `digested`（59/59）；reconcile uncovered=0；R2-4 终裁输入小节可复算（卡面 grep 自洽）

## Closure Gates

- [ ] 59 卡齐备、台账全 `digested`（59/59）、reconcile uncovered=0
- [ ] P0–P2 程序化证据/[visual-only]+复核；归族无空缺（三态之一，计数可由卡面 grep 复算）
- [ ] 独立复核 P0/P1 全覆盖；19 判定级抽样全部有结论（保留/降级/驳回各有依据）
- [ ] 族归并落 summary §4；R2-4 终裁输入小节齐备
- [ ] owner-doc drift 全部回写或登记（无静默 drift）
- [ ] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项）
- [ ] roadmap R2-2a 行回写（done + Plan 列链接，按单元格值精确改写并回读验证）+ Rule 5 logs 同步
- [ ] `pnpm typecheck`/`lint`/`check`/`build`/`test` 全过

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 探针提升 e2e 归 R2-5。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立 closure audit>>
- Evidence: <<待填>>

Follow-up:

- <<完成时填写>>
