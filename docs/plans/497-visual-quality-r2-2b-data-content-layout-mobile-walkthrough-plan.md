# 497 视觉质量二期 R2-2b：控件族走查批二（data/content/layout/mobile，46 控件）

> Plan Status: completed
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

Status: completed
Targets: `docs/analysis/2026-09-24-r2-2b-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/`

- Item Types: `Fix | Proof`

- [x] Fix：分 6 波并行（6 路 fresh agent；若限流降并发重跑）：wave1 content 前半 10（alert/audio/card/cards/carousel/diff-view/empty/html/image/json-view）；wave2 content 后半 10（link/mapping/markdown/progress/qrcode/result/separator/spinner/status/video）；wave3 data 前半 7（batch-bar/chart/crud/data-source/echarts/list/pagination）；wave4 data 后半 6（query-filter/sparkline/stat-tile/statistics/table/tree）；wave5 layout 8（button-group/collapse/dropdown-button/grid/responsive/steps/timeline/wizard）；wave6 mobile 5（countdown/infinite-scroll/notice-bar/pull-refresh/swipe-cell）——46/46 卡落盘
- [x] Fix：interactions.mjs 扩面——本批弹层/抽屉/触摸交互态注册可复现 interaction 键（键规约 = 载体页 id `lab-<type>`，必须是 pages.json 真实 id）；**各波 agent 只产键定义随波报告回传，主 session 波次收齐后串行合并**；无法注册的随卡登记理由——35 键合并完成（注册表共 95 键无重复），无法注册项（手势类 swipe-cell/pull-refresh 触摸序列、需 type/fill 的态、display-only 控件）已随卡登记
- [x] Proof：逐控件状态矩阵取证——widget 类：默认/hover/focus/disabled/error/readonly + 弹层开（有则必查）+ 值态（空/填/超长）；full 3 控件（crud/table/wizard）加弹层开/增删行/步骤切换/校验中间态；mobile 5 控件加触摸/滚动手势态；异步控件（list/data-source/chart）加 loading/empty/error 态；全部截图落 `_tmp/visual-inspection-2026-09-24/r2-2b/`，探针落 `_tmp/r2-2b-probes/`；每条 P0–P2 附探针输出；**dark 证据一律显式 `data-mode` 自采（R2-2a-B5-34 口径），渐变背景下对比度判读须像素采样**——约 350 张截图全落 r2-2b/ 目录，dark 全部真 data-mode
- [x] Fix：台账 46 行 → `carded`，随归族 → `digested`（card 列同批填写）——46 行已翻 carded（card 列齐），digested 翻转归 Phase 3

矩阵口径裁定（本批）：

- **全矩阵（3）**：crud、table、wizard——含弹层开/行编辑增删/分页筛选/步骤切换/校验失败中间态。
- **simplified 地板（43）**：light+dark（真 data-mode）、1280×800 + ~800 窄视口、元素态抽样（hover/focus/disabled 有则必查）、中间态有则必查；mobile 5 控件触摸态必查；命中疑点升全矩阵。每卡注明裁剪理由。

Exit Criteria:

- [x] 46 卡齐备（full 3 全矩阵；simplified 地板；每卡注明裁剪理由）；台账全 `carded`（46/46；`digested` 翻转归 Phase 3）；`pnpm visual:reconcile` uncovered=0（2026-09-24 实测：pages 121 digested / controls 139 = carded 46 + digested 59 + pending 34，uncovered=0）

### Phase 2 - 独立复核

Status: completed
Targets: `docs/analysis/2026-09-24-r2-2b-walkthrough/review-a|b.md`

- Item Types: `Proof`

- [x] Proof：两路 fresh agent（按域拆分）重开页面重截同态重跑探针：覆盖全部 P0/P1；P2 以全查为执行目标（496 实绩），地板 ≥1/3；根因下探至源码层；深挖并入复核轮至收敛——review-a（content 域）9/9 保留（P1×2+P2×3 全查+P3×4 抽样，证据锐化 5 处：link `.nop-link` 全量级联 0 规则、markdown table 19px、status 数值修正、alert 收口点 L101）；review-b（data/layout/mobile 域）15 项判定 = 12 保留 / 1 降级（F5-87 P2→P3，design.md L56 文档化裁定）/ 1 驳回（A1-156 真实热区有 pointer），根因实质修正 7 处（chart 主题化空匹配、crud id/name 条件、query-filter 影子 scope、table 占位令牌、wizard 方向反转等）；合计 24 判定，P1 2/2 + P2 12/12 全查（降级前口径）
- [x] Proof：owner-doc drift 清单复核（每条 drift 对照 live code 确认后回写 `docs/components/<type>/design.md`；owner-doc-missing 登记卡内不新建）——11 条处置：8 处 design.md 回写（diff-view 注册过期、link marker 零消费、markdown 样式契约+跨包寄居、alert 间距注记、list showSizeChanger 零消费、timeline alternate 几何断裂、crud queryForm 条件+Enter、chart 轴 label 不渲染）+ 3 处 owner-doc-missing 卡内登记（query-filter/batch-bar/result）

Exit Criteria:

- [x] review-a/b.md 落盘；P0/P1 全覆盖；无未裁决驳回项；drift 回写完成并有 grep 可验证据（grep 命中：diff-view/link/markdown/alert/list/timeline/crud/chart 各含「R2-2b 复核」注记；3 张卡含「owner-doc 登记」）

### Phase 3 - 归族与汇总

Status: completed
Targets: `docs/analysis/2026-09-24-r2-2b-walkthrough/summary.md`、`docs/audits/visual-quality-r2/watch-pool.md`

- Item Types: `Decision | Fix`

- [x] Fix：评分卡（口径：含正式 P1/P2 锚→fail / 仅 P3→有风险 / 无→pass；分布行与卡面 grep 同源复算，去重取带判级节防同 id 多卡顺序依赖）+ 族归并（与 R2-1a–d/R2-2a 已裁定族去重合并；新族裁定登记）+ Top3 + Quick Wins——summary.md §1 分布 fail 12 / 有风险 19 / pass 15（compute-batch.cjs 同源复算 + 驳回锚剔除口径）；§4 族归并 7 项（dark 平价族持续增重、schema 声明静默失效族 +6 例异型断点、渲染器样式/布局矩阵缺口新 systemic 组 5 条、lab 载体族扩面、R2-1d watch 先例现状复检：2 项维持 1 项已修复）
- [x] Decision：**R2-4 首批族终裁输入刷新**——合并 R2-1a/R2-2a/本批台账后按族内 findings 数量与影响面重排最大 local 族清单（落 summary 独立小节；R2-4 立项若已发生则改为扩面增量清单）——summary §5：dark 平价族维持建议首批（≈50 面 P1×9 P2 14+）；R2-3 候选族排序更新（schema 静默失效族累计 ≥9 例建议升 R2-3 第二字母批）
- [x] Fix：watch-only 逐条入 watch-pool.md（追加行实现，grep 计数回读验证）；台账 46 行 `digested`——watch-pool 追加 20 行（grep `^| R2-2b-` = 20 回读验证）；台账 46/46 digested（controls 全量 105/139），reconcile uncovered=0

Exit Criteria:

- [x] summary.md 落盘；台账 `digested`（46/46）；reconcile uncovered=0；R2-4 输入小节可复算（卡面 grep 自洽：48 唯一 id、P0×0/P1×2/P2×11/P3×35 复核后口径、systemic 17/local 11/watch 20）

## Closure Gates

- [x] 46 卡齐备、台账全 `digested`（46/46，controls 全量 105/139）、reconcile uncovered=0（audit 实测 455 张截图 + 221 探针文件；reconcile 审计员本机重跑通过）
- [x] P0–P2 程序化证据/[visual-only]+复核；归族无空缺（48 条正式条目：P0×0/P1×2/P2×11/P3×35 复核后口径，systemic 17/local 11/watch 20；三态齐 none=0）
- [x] 独立复核 P0/P1 全覆盖；P2 全查为执行目标、closure 门槛 ≥1/3 抽样全部有结论（保留/降级/驳回各有依据）（P1 2/2 + P2 12/12 全查 = 24 判定：22 保留/1 降级/1 驳回）
- [x] 族归并落 summary §4；R2-4 终裁输入刷新小节齐备（§5.4 local 11 与卡面集合 comm 全等，审计确认）
- [x] owner-doc drift 全部回写或登记（无静默 drift）（8 处 design.md 回写 + 3 处 owner-doc-missing 卡内登记，grep 可验）
- [x] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项）（首轮 verdict `approved`（0B/0M/3m 均文档口径级）→ 执行者顺手修复 F1/F2，F3 按 496 m-1 先例保留复核者原文记 follow-up，见 Closure Audit Evidence）
- [x] roadmap R2-2b 行回写（done + Plan 列链接，按单元格值精确改写并回读验证）+ Rule 5 logs 同步
- [x] `pnpm typecheck`/`lint`/`check`/`build`/`test` 全过（2026-09-24 全部 exit 0；unit 29 包 10650 tests 全过；审计员本机独立重跑确认）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 探针提升 e2e 归 R2-5。
- review-b.md 附录 artifact 计数与磁盘漂移（自述 14 mjs/15 json/17 png，磁盘 17/24/25 超集）——复核者文档保留原文不改写，记录于 closure audit F3（不阻塞）。
- i18n 修复后 query-filter 交互键 `clickText '搜索'` 需同步改英文文案（wave4 卡内注记，归 i18n 修复批顺带）。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮 pass-with-minors）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 5 Minor）→ 5 Minor 定点修复后升 active
- Rounds: 1
- Findings addressed: M1 P2 覆盖口径三处不一致（统一为"P0/P1 全覆盖；P2 以全查为执行目标，closure 门槛 ≥1/3"）；M2 已知族清单缺 4 项既有裁定族（补表格 sticky 操作列底、校验呈现三不一致两行 + watch-pool/R2-2a summary §4/§5 权威指针）；M3 "R2-2a 已收口"措辞改"执行已收口（台账 59/139 翻转齐）"（roadmap↔496 文件状态差异归 closure audit 流程收敛）；M4 controls.json category 与 sourcePackage 族分组同名不同值（括注"按 sourcePackage 族、同 README 批次裁定"）；M5 Draft Review Record 补模板三行占位（本行即回填）。审查核实：46 控件名单/波次/矩阵档位/fixtureRequired=0/载体 id/台账基线/R2-4 接口口径全部与 live repo 程序化对账一致。

## Closure

Status Note: 三 Phase 全部 completed、Closure Gates 全勾（2026-09-24）。46 控件走查产出 48 条正式发现（P1×2 全部独立复核保留；P2 12/12 全查：11 保留 + 1 降级 F5-87；1 驳回 A1-156），新 systemic 组裁定 1 项（渲染器样式/布局矩阵缺口 5 条）+ schema 静默失效族 +6 例异型断点 + dark 平价族持续增重；controls 台账 105/139 digested；R2-4 首批族终裁输入刷新落 summary §5（dark 平价族 ≈50 面维持建议首批）。独立 closure audit 首轮 verdict `approved`（0 Blocker / 0 Major / 3 Minor 文档口径级），F1（Phase 1 状态头）与 F2（6 卡交互键登记）已顺手修复，F3 按 496 先例保留复核者原文记 follow-up。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，单轮 approved）
- Evidence: 10 项逐项 verdict 全 pass——46 卡抽查 9 张（full 3 必查）零空壳；compute-batch.cjs 复算 unique 48/P0×0-P1×2-P2×11-P3×35/family 17-11-20 与 summary 逐项一致（含 steps 驳回锚剔除口径手工核对）；24 判定与两 review 文件汇总表逐条一致（独立性佐证：ra-_/rb-_ 前缀隔离 + 交错时间窗 + 24 份 JSON 实数据抽读）；watch-pool 20 行与卡面集合严格 diff 1:1；8 处 design.md 回写 + 3 处登记 grep 全命中；interactions 35 新键 100% 对照 pages.json 零越界、注册表 95 键零重复；五项验证 exit 0 审计员本机独立重跑（10650 tests）。

Follow-up:

- 探针提升 e2e、review-b 计数口径注记、query-filter 键 i18n 联动（见 Non-Blocking Follow-ups，均不阻塞本 plan 收口）。
