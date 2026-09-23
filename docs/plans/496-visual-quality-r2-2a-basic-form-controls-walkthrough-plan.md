# 496 视觉质量二期 R2-2a：控件族走查批一（basic/form/form-advanced，59 控件）

> Plan Status: completed
> Last Reviewed: 2026-09-24
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-2a work item）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径）、`docs/audits/visual-quality-r2/README.md`（R2-0 批次裁定：R2-2a = basic 18 + form 22 + form-advanced 19，fixtureRequired=0）
> Related: plan 492/493/494/495（R2-1 四批，流程与产出格式沿用；495 同日收口）

## Purpose

对 R2-2a 批 59 个 renderer 定义逐控件执行状态矩阵走查（载体 = 各控件 lab 路由，全部有 live labRoute、无 fixture 补齐需求），每控件 evidence card + 程序化取证 + A–H 评分卡 + 三态归族，台账 59 行 `pending → carded → digested`。R2-2a 是 R2-4 首批族终裁的第二个归族来源（roadmap：R2-4 范围 = R2-1a/R2-2a 归族后台账中最大的 local 族），本批 closure 时输出 R2-4 终裁所需的合并族清单。不做产品修复。

## Current Baseline（2026-09-23）

- R2-1 四批已全部 done（121 页 digested，reconcile uncovered=0；controls 139 行仍 pending，本批消化其中 59）。
- 本批控件（inventory batch=R2-2a 实数）：basic 18（badge/button/command-palette/container/dialog/drawer/dynamic-renderer/flex/fragment/icon/keyboard/loop/page/reaction/recurse/scope-debug/tabs/text）、form 22（button-group-select/checkbox/checkbox-group/date-range/fieldset/form/hidden/input-date/input-datetime/input-email/input-month/input-number/input-password/input-quarter/input-text/input-time/input-year/markdown-editor/radio-group/select/switch/textarea）、form-advanced 19（array-editor/array-field/combo/condition-builder/detail-field/detail-view/editor/icon-picker/input-file/input-image/input-table/input-tree/key-value/object-field/picker/tag-list/transfer/tree-select/variant-field）。
- 矩阵档位：full 3（condition-builder、input-table、picker——复杂度阈值裁定）；simplified 56（matrixReason 已在 inventory）。fixtureRequired = 0。
- **两类控件的走查重心分野**（styling-system.md 契约）：layout/结构类（container/flex/fragment/loop/page/recurse/dynamic-renderer/reaction/keyboard/scope-debug/tabs）按「marker classes only、无硬编码视觉类」契约核对，视觉维度大量 n/a 须注明——例外：scope-debug 渲染可见调试面板本体（Button/树形 UI），其面板元素态照常检查；widget 类（其余）按自完备 UI 控件全维度走查。
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

Status: completed
Targets: `docs/analysis/2026-09-23-r2-2a-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/`

- Item Types: `Fix | Proof`

- [x] Fix：分 6 波并行（6 路 fresh agent，每波一域内聚簇；wave3/wave4 若限流则降并发重跑）：wave1 basic 前半 9（badge/button/command-palette/container/dialog/drawer/dynamic-renderer/flex/fragment）；wave2 basic 后半 9（icon/keyboard/loop/page/reaction/recurse/scope-debug/tabs/text）；wave3 form 前半 11（button-group-select/checkbox/checkbox-group/date-range/fieldset/form/hidden/input-date/input-datetime/input-email/input-month）；wave4 form 后半 11（input-number/input-password/input-quarter/input-text/input-time/input-year/markdown-editor/radio-group/select/switch/textarea）；wave5 form-advanced 前半 10（array-editor/array-field/combo/condition-builder/detail-field/detail-view/editor/icon-picker/input-file/input-image）；wave6 form-advanced 后半 9（input-table/input-tree/key-value/object-field/picker/tag-list/transfer/tree-select/variant-field）
- [x] Fix：interactions.mjs 扩面——form 控件族弹层/下拉打开态（select/picker/combo/date 族、transfer、icon-picker 等）注册可复现 interaction 键；键规约 = 载体页 id `lab-<type>`（lab 载体 124 条中 59 条为本批，键必须是 pages.json 真实 id——plan 491 M1 纪律）；**注册表为单文件，各波 agent 只产键定义随波报告回传，由主 session 在波次收齐后串行合并**，避免并行同文件冲突；无法注册的由走查 agent 即时取证并在卡内登记（理由记录）——主 session 收齐 wave1–6 共 44 键串行合并完成，无法注册项（native picker 原生弹窗、需 fill/clear 的态等）已随卡登记
- [x] Proof：逐控件状态矩阵取证——widget 类：默认/hover/focus/disabled/error/readonly + 弹层开（有则必查）+ 值态（空/填/超长）；full 3 控件加拖拽中/视图切换中间态；结构类：marker-only 契约核对 + 布局行为；全部截图落 `_tmp/visual-inspection-2026-09-23/r2-2a/`，探针落 `_tmp/r2-2a-probes/`；每条 P0–P2 附探针输出——59/59 卡齐备（截图 400+ 张，dark 全部真 data-mode 自采，R2-2a-B5-34 修正后口径）
- [x] Fix：台账 59 行 → `carded`，随归族 → `digested`（card 列同批填写）——59 行已翻 carded（card 列齐），digested 翻转归 Phase 3

矩阵口径裁定（本批）：

- **全矩阵（3）**：condition-builder、input-table、picker（README 复杂度裁定 full）——含拖拽中/弹层开/增删行中间态。
- **simplified 地板（56）**：≥ skill 必查项——light+dark、1280×800、~800 窄视口、元素态抽样（hover/focus/disabled 有则必查）、中间态有则必查；命中疑点升全矩阵。每卡注明裁剪理由（结构类注明契约核对替代视觉矩阵的范围）。

Exit Criteria:

- [x] 59 卡齐备（full 3 全矩阵；simplified 地板；每卡注明裁剪理由）；台账全 `carded`（59/59；`digested` 翻转归 Phase 3 归族交付）；`pnpm visual:reconcile` uncovered=0（2026-09-24 实测：pages 121 digested / controls 139 = carded 59 + pending 80，uncovered=0）

### Phase 2 - 独立复核

Status: completed
Targets: `docs/analysis/2026-09-23-r2-2a-walkthrough/review-a|b.md`

- Item Types: `Proof`

- [x] Proof：两路 fresh agent（按域拆分）重开页面重截同态重跑探针：覆盖全部 P0/P1 + P2 抽样 ≥1/3；根因下探至源码层；深挖并入复核轮至收敛——review-a（basic 域）14/14 保留（P1×4 + P2×10）、review-b（form/form-advanced 域）13/13 保留（P2×5 全查 + 抽样×8，含名义入抽样组、卡面实为 P2 的 A9-60）；合计 27 判定 0 驳回 0 降级，P2 覆盖 16/16（超出 ≥1/3 地板），含 9 处证据/根因订正（badge B5-01 像素复测、button B1-05 fg/bg 对调、keyboard A9-23 根因改判 defaults.ts notify no-op、icon A5-21 命名空间精确化、tabs H5-32 form-actions 根因锐化、B1-40 alpha 合成后家族方向反转、A9-42/A9-60 契约键静默丢弃改判、A9-82 行级定位）
- [x] Proof：owner-doc drift 清单复核（每条 drift 对照 live code 确认后回写 `docs/components/<type>/design.md`）——10 条 drift 处置完毕：6 处 design.md 回写（drawer footer 差异、icon 死链别名、picker 搜索框不实 + labelField 回显契约、array-field itemValidationOwner 恒空投影、input-table 补 readOnly、scope-debug 裸结构），3 处 owner-doc-missing 卡内登记（keyboard/command-palette/hidden，按 Failure Paths 不新建），1 处裁为无 drift（page D7 间距归 schema 有文档明文）

Exit Criteria:

- [x] review-a/b.md 落盘；P0/P1 全覆盖；无未裁决驳回项；drift 回写完成并有 grep 可验证据（review-a.md 34.4KB / review-b.md 32.6KB；drift 回写 grep 命中：drawer/icon/picker×2/array-field/input-table×2/scope-debug 各 1+）

### Phase 3 - 归族与汇总

Status: completed
Targets: `docs/analysis/2026-09-23-r2-2a-walkthrough/summary.md`、`docs/audits/visual-quality-r2/watch-pool.md`

- Item Types: `Decision | Fix`

- [x] Fix：评分卡（口径：含正式 P1/P2 锚→fail / 仅 P3→有风险 / 无→pass；逐页标注与分布行必须同源复算）+ 族归并（与 R2-1a–d 已裁定族去重合并；新族裁定登记）+ Top3 + Quick Wins——summary.md §1 分布 fail 15 / 有风险 22 / pass 22（`_tmp/r2-2a-probes/compute-scorecard.cjs` 同源复算与卡面 grep 自洽）；§4 族归并 8 项（dark 平价族大幅增重、form-actions 根因锐化、icon 别名 P1 升格、表单契约族第 4/5 实例合流、lab 载体基建新族候选、scope-debug 四卡归并等）
- [x] Decision：**R2-4 首批族终裁输入**——合并 R2-1a 与本批台账后按族内 findings 数量与影响面排序的最大 local 族清单（落 summary 独立小节，供 R2-4 plan 立项引用）——summary §5：①dark 主题平价/对比度族（≈40 面 P1×9，建议终裁首批）②校验呈现三不一致族 ③表格 sticky 操作列透明底 ④本批 local 散项 15 条
- [x] Fix：watch-only 逐条入 watch-pool.md（追加行实现，grep 计数回读验证）；台账 59 行 `digested`——watch-pool 追加 21 行（`grep -c "^| R2-2a-"` = 21 回读验证）；台账 59/59 digested，reconcile uncovered=0

Exit Criteria:

- [x] summary.md 落盘；台账 `digested`（59/59）；reconcile uncovered=0；R2-4 终裁输入小节可复算（卡面 grep 自洽：57 唯一 id、P0×0/P1×4/P2×16/P3×37、systemic 21/local 15/watch 21；compute-scorecard.cjs 去重取带判级节后遍历顺序无关，三连跑可复现）

## Closure Gates

- [x] 59 卡齐备、台账全 `digested`（59/59）、reconcile uncovered=0（audit 实测 596 张截图 + 复核侧 45 张；reconcile 审计员本机重跑通过）
- [x] P0–P2 程序化证据/[visual-only]+复核；归族无空缺（57 条正式条目：P0×0/P1×4/P2×16/P3×37，systemic 21/local 15/watch 21；58 归族行三态齐全，grep 非三态命中 0）
- [x] 独立复核 P0/P1 全覆盖；P2 抽样 ≥1/3 全部有结论（保留/降级/驳回各有依据）（P1×4 全覆盖 + P2×16 全查 = 27 判定 27 保留）
- [x] 族归并落 summary §4；R2-4 终裁输入小节齐备（§5.4 已按卡面 local 15 集合重写，A9-82 移除、F4-33 去重、补 D7-25/A9-62）
- [x] owner-doc drift 全部回写或登记（无静默 drift）（6 处 design.md 回写 + 3 处 owner-doc-missing 卡内登记 + 1 处裁无 drift，grep 可验）
- [x] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项）（首轮 verdict `issues`（2M/4m，均文档簿记级）→ 主 session 完成 M-1 计数口径统一 + M-2 §5.4 清单重写 + m-1/m-2 顺手修复 → 审计员复审确认 `approved`，见 Closure Audit Evidence）
- [x] roadmap R2-2a 行回写（done + Plan 列链接，按单元格值精确改写并回读验证）+ Rule 5 logs 同步
- [x] `pnpm typecheck`/`lint`/`check`/`build`/`test` 全过（2026-09-24 全部 exit 0；unit 29 包 10650 tests 全过；check newHits=0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 探针提升 e2e 归 R2-5。
- pages.json 的 lab 前缀 id 实数 125（124 载体 + lab-index 索引路由），README/roadmap「124 lab carrier」口径不含 index，两处表述各有语境；R2-5 收口时可考虑在 README 补一句括注防误读（closure audit m-4，不阻塞）。
- review-b.md 头部将 A9-60（卡面 P2）列入「P3 抽样」组为标注瑕疵——实际已按 P2 全查并判定保留，覆盖无缺口（closure audit m-1，复核者文档保留原文不改写）。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮 revised）
- Verdict: `revised` → 2 Major 定点修复后达通过线（0B/0M）
- Rounds: 1 + 定点修复
- Findings addressed: M1 form-advanced 名单与 wave6 漏 `input-tree`（枚举 58≠59，补齐后 6 波=59 与 inventory 一致）；M2 Closure Gate 硬编码前批实数「19 判定」（改为可预知判据"P2 抽样 ≥1/3"）。4 Minor：Draft Review Record 节补记、Phase 1 Exit 的 digested 措辞收窄归 Phase 3、scope-debug 面板本体保留元素态检查说明、interactions.mjs 扩面改主 session 波后串行合并。

## Closure

Status Note: 四 Phase 全部 completed、Closure Gates 全勾（2026-09-24）。59 控件走查产出 57 条正式发现（P1×4 全部独立复核保留、P2×16 全查），新族候选 1 项（lab 载体与环境基建族）+ 既有族扩面 7 项；controls 台账 59/139 翻转 digested（R2-2 批次首批）；R2-4 首批族终裁输入清单落 summary §5（dark 主题平价/对比度族 ≈40 面 P1×9 建议终裁首批）。首轮独立 closure audit 判 `issues`（2 Major 均为文档簿记：M-1 计数口径三处不一致、M-2 §5.4 local 清单成员错误），按审计员给定路径完成定点修复后复审确认 `approved`（0B/0M）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，两轮：issues → 定点修复 → approved）
- Evidence: 首轮审计报告 10 项逐项 verdict + 独立复算（评分卡 fail 15/risk 22/pass 22 与归族 21/15/21 复算成立；27 判定与两 review 文件逐条一致；44 键 100% 对照 pages.json；drift 6+3+1 grep 全命中；git 落点无产品代码变更），2 Major = M-1 计数口径、M-2 §5.4 成员 → 修复证据（compute-scorecard.cjs 去重取带判级节、三连跑可复现；summary §2/§3/§5.4、plan Phase 2/3、daily log 五处计数统一为 57/P2×16；§5.4 重写为卡面 local 15 集合；5 张卡补交互键登记）→ 复审 verdict `approved`（0 Blocker / 0 Major）。

Follow-up:

- 探针提升 e2e、README lab 计数括注、review-b 标注瑕疵备注（见 Non-Blocking Follow-ups，均不阻塞本 plan 收口）。
