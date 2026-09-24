# 498 视觉质量二期 R2-2c：控件族走查批三（ai/scheduling/host-canvas 类，34 控件）

> Plan Status: completed
> Last Reviewed: 2026-09-24
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-2c work item）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径）、`docs/audits/visual-quality-r2/README.md`（R2-0 批次裁定：R2-2c = ai 14 + scheduling 4 + 其余宿主/画布类 16；fixtureRequired=16）
> Related: plan 496（R2-2a，done）、plan 497（R2-2b，active）、plan 492–495（R2-1 四批）

## Purpose

对 R2-2c 批 34 个 renderer 定义逐控件执行渲染面状态矩阵走查，每控件 evidence card + 程序化取证 + A–H 评分卡 + 三态归族，台账 34 行 `pending → digested`，R2-2 阶段（139 控件）全量闭合。批产出并入 R2-4 首批族终裁输入扩面。不做产品修复。

## Current Baseline（2026-09-24）

- R2-2a（plan 496）done：controls digested 59/139；R2-2b（plan 497）active 执行中：46 控件走查进行中（本 plan 立项不等 R2-2b 收口，执行排其后；台账翻转各自独立）。
- 本批控件（inventory batch=R2-2c 实数，34 = 18 lab 载体 + 16 demo 载体）：ai 14（ai-attachments/ai-bubble/ai-chat/ai-citations/ai-conversations/ai-feedback/ai-message-list/ai-prompts/ai-sender/ai-suggestions/ai-token-usage/ai-tool-call/ai-voice-input/ai-welcome，全有 lab 路由）、scheduling 4（barcode-input/calendar/gantt/kanban，全有 lab 路由）、宿主/画布类 16（dashboard/dashboard-editor/designer-canvas/designer-edge-row/designer-field/designer-node-card/designer-page/designer-palette/graph/map/pivot-table/scada-canvas/scada-editor-canvas/spreadsheet-page/three-canvas/word-editor-page，无 lab 路由 = R2-0 fixtureRequired 名单）。
- 矩阵档位：full 6（calendar/dashboard/dashboard-editor/gantt/graph/kanban）；simplified 28（matrixReason 已在 inventory）。
- **载体裁定（本批执行 fixtureRequired 补齐项，依据 roadmap「demo 页或最小 schema fixture」；README「最小 schema fixture」措辞由本裁定替代——demo 页满足 roadmap 原判据）**：16 个宿主/画布类控件的载体 = 各自所属域的既有 demo 页——dashboard 与 dashboard-editor → `dashboard-demo`（页题 Dashboard Editor；dashboard 渲染器经 editor Preview 态承载）；graph/map/pivot-table/three-canvas → 同名 demo 页；designer-\*（6）→ flow-designer 页；scada-canvas → scada-demo；scada-editor-canvas → scada-editor-demo；spreadsheet-page → spreadsheet 页；word-editor-page → word-editor 页。裁定理由：这些控件是宿主应用类渲染器，demo 页即其完整渲染面；为它们新建 lab schema 壳层等于重复实现整个编辑器宿主，不成比例且无既有基建。卡内必须注明载体为 demo 页，并与 R2-1b/c 已裁定的**页面级**发现做重叠引用（命中同根因引用原条目不重复立项；控件级契约面为本批独立走查单元）。
- 已知族：沿 plan 497 Current Baseline 同一清单（dark 平价/对比度族 R2-4、弹层 actions 左对齐 R2-3b、表格 sticky 操作列、校验呈现三不一致、A3 小目标、chip 遮挡、窄视口 flex/固定壳层、schema 动态响应性/表单 AMIS 契约/图标别名回环、lab 载体与环境基建族、i18n zh-CN 回退、数值列左对齐、G7 双向同步、默认栈宽基线、宿主级 `--popover` dark 亮底/`.nop-theme-root` 钉死 color-scheme:light；其余以 watch-pool.md 与 R2-2a/R2-2b summary §4/§5 为准）。
- 重叠说明：ai 14 控件的 demo 页面（ai-\* 14 页）已在 R2-1d 走查；scheduling 4 控件的 demo 页（gantt/kanban/calendar/barcode）已在 R2-1d 走查；16 宿主类控件的域页已在 R2-1b/c 走查。本批走查的是**控件 lab 载体/域页上的控件契约面**，独立台账单元；R2-1 已裁定条目命中时引用原条目。

## Goals

- 34 张控件 evidence card 落 `docs/analysis/2026-09-25-r2-2c-walkthrough/cards/`（卡 id = `control:<type>`）；台账 34 行 → `digested`（controls 139/139 全量 digested，R2-2 阶段闭合）。
- 独立复核覆盖全部 P0/P1；P2 以全查为执行目标（496 实绩，497 沿用同一门槛），closure 门槛 ≥1/3；深挖至收敛；summary.md 评分卡 + 族归并 + **R2-4 首批族终裁输入刷新**。
- owner-doc drift（卡内发现与 `docs/components/<type>/design.md` 不一致处）逐条回写或登记。

## Non-Goals

- 不修产品缺陷；不走查 R2-2a/b 已走查控件；不换口径；`verified` 翻转归后续批；R2-4 修复执行归 R2-4 批；新建 lab 壳层路由（载体裁定用 demo 页，见 Baseline）。

## Scope

### In Scope

- 34 控件走查、取证、评分卡、归族、台账翻转；独立复核；深挖轮；summary.md；owner-doc drift 回写；roadmap/logs 回写。

### Out Of Scope

- 产品代码改动；playground 新路由/新 lab 页；性能数值度量；R2-4/R2-3 修复执行。

## Failure Paths

| 可测场景编号       | 触发                                    | 行为                                                                        | 可重试 | 用户可见表现 |
| ------------------ | --------------------------------------- | --------------------------------------------------------------------------- | ------ | ------------ |
| lab-route-dead     | lab 路由打不开/控件不渲染               | 卡面 fail(A5) P0 归 local，console 留证；LEDGER 行注 dead-route             | 是     | 卡内标注     |
| interaction-dead   | 交互态无法程序化驱动（拖拽/缩放/画布）  | Playwright mouse/touch/keyboard 序列；仍失败 [visual-only]+复核，不静默裁剪 | 是     | 卡内注明     |
| heavy-canvas-frame | 全矩阵中间态（拖拽中/缩放中）截帧不稳定 | 固定操作序列 + 定时截帧多次取有效帧；仍失败登记 [visual-only]               | 是     | 卡内注明     |
| owner-doc-missing  | 控件无 docs/components/<type>/design.md | 卡内登记 drift，不新建 design.md（新建归后续 plan）                         | 否     | 卡内注明     |

## Test Strategy

档位选择：**不适用：走查产档 + 台账翻转 + interactions 注册表扩面（仅手动 runner 消费）+ owner-doc 文档回写，无产品代码与测试行为变更；程序化判据由每条发现的探针承担。**

## Execution Plan

### Phase 1 - 走查执行（34 控件，5 波）

Status: completed
Targets: `docs/analysis/2026-09-25-r2-2c-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/`

- Item Types: `Fix | Proof`

- [x] Fix：分 5 波并行（5 路 fresh agent；wave1/wave3 首跑遇账户限流失败，按预案降并发重跑成功）：wave1 ai 前半 7（ai-attachments/ai-bubble/ai-chat/ai-citations/ai-conversations/ai-feedback/ai-message-list）；wave2 ai 后半 7（ai-prompts/ai-sender/ai-suggestions/ai-token-usage/ai-tool-call/ai-voice-input/ai-welcome）；wave3 scheduling 4（barcode-input/calendar/gantt/kanban）；wave4 可视化宿主 6（dashboard/dashboard-editor/graph/map/pivot-table/three-canvas）；wave5 设计器/编辑器宿主 10（designer-canvas/designer-edge-row/designer-field/designer-node-card/designer-page/designer-palette/scada-canvas/scada-editor-canvas/spreadsheet-page/word-editor-page）——34/34 卡落盘
- [x] Fix：interactions.mjs 扩面——本批交互态注册可复现 interaction 键（键规约 = 载体页真实 id：lab 控件用 `lab-<type>`，demo 载体控件用 pages.json 中该域页 id 如 `dashboard-demo`/`flow-designer`）；**既有键（如 `flow-designer`，plan 491 已注册）只允许扩展合并、禁止覆盖；同一 demo 载体页多控件共享一键时由主 session 合并为单一可复现序列，其余交互态以卡内探针取证并随卡登记注册理由**；**各波 agent 只产键定义随波报告回传，主 session 波次收齐后串行合并**；无法注册的随卡登记理由——25 新键合并 + flow-designer 既有键扩展合并（注册表 120 键零重复），无法注册项（拖拽/触摸手势类、需 type/fill、pivot/three 画布指针接管）已随卡登记
- [x] Proof：逐控件状态矩阵取证——ai 控件：流式中间态/HITL 审批态/工具调用展开态/错误态/空态；scheduling full 3：拖拽中/拖放落位/视图切换/事件编辑弹层；可视化宿主 full 3 + map/three-canvas：缩放/平移/图例交互/选中态；设计器宿主：G1–G8 全维；spreadsheet/word：编辑态/选区/格式化中间态；全部截图落 `_tmp/visual-inspection-2026-09-25/r2-2c/`，探针落 `_tmp/r2-2c-probes/`；每条 P0–P2 附探针输出；**dark 证据一律显式 `data-mode` 自采（R2-2a-B5-34 口径），渐变背景对比度判读须像素采样**——约 240 张截图 + 60+ 探针文件；wave5 复检 R2-1b watch 先例 12 项维持、1 项记录已修复（G6-01 redo 滞后——后经 review-b 反转为探针假阳性，恢复 open，见 Phase 2）
- [x] Fix：台账 34 行 → `carded`，随归族 → `digested`（card 列同批填写）——34 行已翻 carded（card 列齐），digested 翻转归 Phase 3

矩阵口径裁定（本批）：

- **全矩阵（6）**：calendar、dashboard、dashboard-editor、gantt、graph、kanban——含拖拽中/弹层开/视图切换/缩放中间态。
- **simplified 地板（28）**：light+dark（真 data-mode）、1280×800 + ~800 窄视口、元素态抽样（hover/focus/disabled 有则必查）、中间态有则必查；设计器/画布类（designer-_/scada-_/spreadsheet/word）G 维必查（G1 选中态/G2 悬停可供性/G8 双主题可读为最低集）；命中疑点升全矩阵。每卡注明裁剪理由与载体声明。

Exit Criteria:

- [x] 34 卡齐备（full 6 全矩阵；simplified 地板；每卡注明裁剪理由与载体）；台账全 `carded`（34/34；`digested` 翻转归 Phase 3）；`pnpm visual:reconcile` uncovered=0（2026-09-25 实测：pages 121 digested / controls 139 = carded 34 + digested 105，pending=0，uncovered=0）

### Phase 2 - 独立复核

Status: completed
Targets: `docs/analysis/2026-09-25-r2-2c-walkthrough/review-a|b.md`

- Item Types: `Proof`

- [x] Proof：两路 fresh agent（按域拆分）重开页面重截同态重跑探针：覆盖全部 P0/P1；P2 以全查为执行目标，地板 ≥1/3；根因下探至源码层；深挖并入复核轮至收敛——review-a（ai+scheduling 域，第三跑：前两跑分别因账户限流与内容安全误判中断，增量写盘完成）13 判定 = 12 保留 / 1 驳回（gantt A8-87 三项承重前提全证伪），根因实质修正 3 处（A9-122 根因②换位为 payload→动作参数桥接断链、B4-48 `--primary` 分量裸值 × fallback 写法、A6-88 列级 drop target 全宿主失效）；review-b（宿主/画布域）10 判定 = 9 保留 / 1 驳回（graph G2-128 实为 viewport pan），根因修正 2 处（A9-156 input.select 全选播种、G7-123 非响应式快照行级定位）；合计 23 判定，P1 3/3 + P2 10/10 全查；watch 先例复检：G1-01/G2-01 维持、G6-01 反转（wave5「已修复」系探针假阳性，恢复 open，两卡已标注）
- [x] Proof：owner-doc drift 清单复核（每条 drift 对照 live code 确认后回写 `docs/components/<type>/design.md`；owner-doc-missing 登记卡内不新建）——硬 drift 7 处回写（DA-1 kanban 空列 drop target 断言违反+属性断链、DA-2 gantt 键盘编辑死接线、DA-3 ai 包 JSON 高亮宣称不成立、D-1 spreadsheet type-to-edit 契约违反、D-2 pivot-table 主题监听 attributeFilter 失配〔dark 恒白块族根源〕、D-3 dashboard-editor 保存链路 doc↔impl 失配〔DA-4 勘误措辞已并〕、graph 无独立回写）+ 5 处 owner-doc-missing 卡内登记（dashboard/three-canvas/scada-canvas/scada-editor-canvas/designer-field 载体失配）

Exit Criteria:

- [x] review-a/b.md 落盘；P0/P1 全覆盖；无未裁决驳回项；drift 回写完成并有 grep 可验证据（grep「R2-2c 复核 DA-/D-」命中 kanban/gantt/flux-renderers-ai/spreadsheet-page/pivot-table/dashboard-editor 六文件；5 张卡含 owner-doc 登记）

### Phase 3 - 归族与汇总

Status: completed
Targets: `docs/analysis/2026-09-25-r2-2c-walkthrough/summary.md`、`docs/audits/visual-quality-r2/watch-pool.md`

- Item Types: `Decision | Fix`

- [x] Fix：评分卡（口径：含正式 P1/P2 锚→fail / 仅 P3→有风险 / 无→pass；分布行与卡面 grep 同源复算，去重取带判级节防同 id 多卡顺序依赖）+ 族归并（与 R2-1a–d/R2-2a/R2-2b 已裁定族去重合并；新族裁定登记）+ Top3 + Quick Wins——summary.md §1 分布 fail 10 / 有风险 11 / pass 13（驳回锚剔除口径，compute-batch.cjs 同源复算）；§4 族归并 9 项（G7 编辑器同步族行级定位收敛、响应式断点/固定宽度族升格 P1 证据、R2-1b-G6-01 watch 反转等）
- [x] Decision：**R2-4 首批族终裁输入第三轮刷新**——summary §5（dark 平价族维持首批 = plan 500 active 执行中；R2-3 候选族排序更新：响应式断点/固定宽度族证据增强升 R2-3c 主修复面；R2-4 字母批输入 = 本批 local 19 条）
- [x] Fix：watch-only 逐条入 watch-pool.md（追加行实现，grep 计数回读验证）；台账 34 行 `digested`——watch-pool 追加 15 行（grep `^| R2-2c-` = 15 回读验证）；台账 34/34 digested（**controls 全量 139/139、R2-2 阶段闭合**），reconcile uncovered=0

Exit Criteria:

- [x] summary.md 落盘；台账 `digested`（34/34）；reconcile uncovered=0；controls 全量计数如实记载（R2-2b 已收口，本批完成 139/139 全量闭合）；R2-4 输入小节可复算（卡面 grep 自洽：39 唯一 id、P0×0/P1×3/P2×10/P3×26、systemic 5/local 19/watch 15）

## Closure Gates

- [x] 34 卡齐备、台账全 `digested`（34/34，controls 139/139 全量闭合）、reconcile uncovered=0（audit 实测 281 张截图 + 142 探针文件；reconcile 审计员本机重跑通过）
- [x] P0–P2 程序化证据/[visual-only]+复核；归族无空缺（39 条正式条目：P0×0/P1×3/P2×10/P3×26，systemic 5/local 19/watch 15；三态齐 none=0）
- [x] 独立复核 P0/P1 全覆盖；P2 全查为执行目标、closure 门槛 ≥1/3 抽样全部有结论（保留/降级/驳回各有依据）（P1 3/3 + P2 10/10 全查 = 23 判定：21 保留/2 驳回，均有三前提证伪级依据）
- [x] 族归并落 summary §4；R2-4 终裁输入刷新小节齐备（§5.3 local 19 = 17 列示 + B4-48 §5.1 路由 + 卡面兜底，M1 修复后无遗漏）
- [x] owner-doc drift 全部回写或登记（无静默 drift）（6 处 design.md 回写 + 5 处 owner-doc-missing/失配卡内登记，grep 可验）
- [x] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项；复审 verdict 落定后再回填 Closure 段）（单轮 verdict `approved`（0B/0M/5m 文档级）→ M1/M2/M5 已顺手修复，M3 复核者文档保留原文、M4 记 follow-up，见 Closure Audit Evidence）
- [x] roadmap R2-2c 行回写（done + Plan 列链接，按单元格值精确改写并回读验证）+ Rule 5 logs 同步
- [x] `pnpm typecheck`/`lint`/`check`/`build`/`test` 全过（2026-09-25 全部 exit 0；unit 29 包 10650 tests 全过；审计员抽查确认）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 探针提升 e2e 归 R2-5。
- README「124 lab carrier」lab-index 括注（沿 496 follow-up）。
- review-b D-5 软 drift（map/design.md 能力表未记 drag-pan 归属）留一行跟踪：归 map 修复/文档批次顺带（closure audit M4）。
- review-a 提请的 R2-1d 卡勘误（gantt A8 措辞、kanban A6 pass 适用范围）按 Rule 21 留档于 review-a/本批 summary，不改写历史卡。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮 revised）
- Verdict: `revised`（0 Blocker / 1 Major / 4 Minor）→ M1 + 4 Minor 定点修复后升 active
- Rounds: 1
- Findings addressed: M1 interactions 既有键冲突裁定缺失（补「既有键只扩展合并禁止覆盖 + 同页多控件共享一键由主 session 合并为单一序列 + 其余态卡内探针取证登记」）；m1 dashboard-editor「同名 demo 页」陷阱（pages.json 无该页 id，改「→ dashboard-demo，页题 Dashboard Editor，dashboard 渲染器经 editor Preview 态承载」）；m2「497 实绩」改「496 实绩，497 沿用同一门槛」（497 未收口）；m3 Phase 3 全量计数补两批收口顺序依赖记法；m4 README「最小 schema fixture」措辞替代声明括注。审查核实：34 名单/波次/full 6/载体 10 页/台账基线/家族清单/目录惯例全部与 live repo 程序化对账一致（含 flow-designer 既有键位置与 designer-\* 六控件同页映射）。

## Closure

Status Note: 三 Phase 全部 completed、Closure Gates 全勾（2026-09-25）。34 控件走查产出 39 条正式发现（P1×3 全部独立复核保留；P2 10/10 全查；2 条驳回均有三前提证伪级依据），G7 编辑器同步族行级定位收敛、响应式断点/固定宽度族 P1 证据升格、R2-1b-G6-01 watch 反转（假阳性识别）；**controls 台账 139/139 全量 digested——R2-2 阶段（页面 121 + 控件 139 = 260 单元）走查闭合**。独立 closure audit 单轮 verdict `approved`（0 Blocker / 0 Major / 5 Minor 文档级），M1（字母批遗漏风险）/M2（计数口径）/M5（G6-01 指针）已顺手修复，M3 沿先例保留复核者原文，M4 记 follow-up。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，单轮 approved）
- Evidence: 10 项逐项 verdict 全 pass——34 卡深查 8 张（4 个 P1 载体必查）零空壳、full 6 中间态齐；compute-batch.cjs 复算 unique 39/三口径全自洽（含驳回锚剔除手工验证）；23 判定与两 review 文件逐条一致（review-a 第三跑独立性声明 + ra-\* 前跑数据仅交叉参照声明在案）；watch-pool 15 行集合严格相等；drift 6 文件 grep 全命中实质注记 + 5 卡登记；interactions 25 新键 + flow-designer 纯扩展合并（diff 零删除行）、120 键零重复；reconcile 139/139 + uncovered=0 审计员独立重跑；test 10650 passed 零失败。5 Minor：M1 §5.3 枚举补 E2-01/B4-48 路由（必修项已修）、M2 P3 抽样计数口径、M3 review-a 头部范围行（保留原文）、M4/M5 观察项处置如上。

Follow-up:

- 探针提升 e2e、README 括注、map D-5 软 drift 跟踪、R2-1d 卡勘误留档（见 Non-Blocking Follow-ups，均不阻塞本 plan 收口）。
