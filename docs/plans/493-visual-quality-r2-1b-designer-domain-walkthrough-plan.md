# 493 视觉质量二期 R2-1b：设计器域渲染面走查（10 页）

> Plan Status: completed
> Last Reviewed: 2026-09-23
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-1b work item）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径，G 维度本批为主维度）、`docs/audits/visual-quality-r2/README.md`（R2-0 批次裁定：R2-1b = 设计器域 10 页）
> Related: `docs/plans/492-visual-quality-r2-1a-complex-pages-walkthrough-plan.md`（R2-1a，completed——流程与产出格式沿用其成熟实践）

## Purpose

对设计器域 10 页执行渲染面走查（G 设计器 overlay 维度为主 + A–H 全维度），每页 evidence card + 程序化取证 + 三态归族，台账翻转至 `digested`。设计器是用户反馈"体感不达标"的核心域，画布类交互（G1–G8：选中态/可供性/拖拽数据手感/空态/缩放/undo/面板双向同步/双主题可读）为本批强制全矩阵维度。不做产品修复。

## Current Baseline（2026-09-23）

- 走查面 = inventory batch=R2-1b 的 10 页：flow-designer、dingtalk-flow-demo、print-designer、report-designer、report-designer-host、spreadsheet、word-editor、taskflow-designer、scada-editor-demo、debugger-lab。
- 已知事实（不重复立项）：①plan 490 H/D 复检轮已对设计器域跑过一轮 H/D 抽查（flow-designer C1/D7 pass、json-panel 560 契约生效）——本批以全矩阵口径覆盖其余维度；②R2-1a 已裁定 systemic 首批族（弹层 actions 左对齐）——设计器属性面板类弹层若命中同根因，归入该族引用不另立；③dark 弹层亮底（宿主 --popover）已知项。
- 流程资产（plan 492 沉淀）：走查简报模板、复核方法学（oklch 合成/逐层背景/zero-size dialog 过滤/main 作用域定位）、watch-pool 机制。

## Goals

- 10 页 evidence card（G 维度全矩阵 + A–H）落 `docs/analysis/2026-09-23-r2-1b-walkthrough/cards/`；台账 10 行 → `digested`。
- 独立复核覆盖全部 P0/P1；深挖轮至收敛。
- summary.md：评分卡 + 族归并（与 R2-1a 已裁定族去重合并）+ 新族裁定登记。

## Non-Goals

- 不修产品缺陷；不走查 lab/其他域；不换口径（Rule 4）；`verified` 翻转归 R2-3/R2-4/R2-5。

## Scope

### In Scope

- 10 页走查、取证、评分卡、归族、台账翻转；独立复核；深挖轮；summary.md；roadmap/logs 回写。

### Out Of Scope

- 产品代码改动；`tests/e2e/` 改动；其他批次页面。

## Failure Paths

| 可测场景编号          | 触发                                                       | 行为                                                                         | 可重试 | 用户可见表现   |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ | -------------- |
| walk-route-dead       | 页面打不开/报错                                            | 卡面 fail(A5) P0 归 local，console 留证                                      | 是     | 页卡标注       |
| drag-not-programmatic | 拖拽态无法程序化驱动                                       | Playwright mouse 事件序列驱动；仍失败则 [visual-only]+复核，不静默裁剪       | 是     | 卡内注明       |
| family-overlap        | 新发现与 R2-1a 已裁定族同根因                              | 归入既有族引用（summary 注记），不重复立项                                   | 否     | summary 去重节 |
| canvas-probe-timeout  | 重画布页（scada-editor/spreadsheet/word）探针超时/性能劣化 | 提高单页超时上限并记录耗时；仍失败改 [visual-only]+复核，不静默裁剪          | 是     | 卡内注明       |
| paper-surface-dark    | 报告/打印/文档纸面语义 dark 恒白                           | 按检查提示词误报排除表（V8a 已裁决）不报；仅当同页非纸面区出现 dark 缺陷才记 | 否     | 评分卡 B5 注记 |

## Test Strategy

档位选择：**不适用：走查产档 + 台账翻转 + interactions.mjs 注册表扩面（仅手动 capture runner 消费、无测试消费），无产品代码与测试行为变更；程序化判据由每条发现的探针承担。**

## Execution Plan

### Phase 1 - 走查执行（10 页 × G 全矩阵）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1b-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/`

- Item Types: `Fix | Proof`

- [x] Fix：分 3 波并行走查（3 路 fresh agent 并行完成）（wave1: flow-designer+dingtalk-flow-demo+taskflow-designer；wave2: report-designer+report-designer-host+print-designer+debugger-lab；wave3: spreadsheet+word-editor+scada-editor-demo）
- [x] Fix：interactions.mjs 扩面（flow-designer JSON 面板态已注册；设计器画布选中/拖拽态属 G 取证即时驱动，注册表以可稳定复现的弹层/面板态为界）
- [x] Proof：G1–G8 逐项取证（选中框/手柄 computed、hover cursor+微高亮、拖拽截帧 ghost+吸附参考线坐标与 <100ms 出现时机、空态、缩放前后选中框坐标、undo 前后 DOM diff、面板↔画布双向断言、画布双主题+对比度抽查；子判据以 skill 维度定义为准）；每条 P0–P2 附探针输出
- [x] Fix：台账 10 行 → `carded`，随归族 → `digested`

Exit Criteria:

- [x] 10 卡齐备且每张含完整状态矩阵（双主题 × 双视口 + 拖拽/弹层中间态；裁剪注明理由——约 130 张截图）与 G 全矩阵无静默裁剪；台账全 `carded`→`digested`；reconcile uncovered=0

### Phase 2 - 独立复核

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1b-walkthrough/review.md`

- Item Types: `Proof`

- [x] Proof：fresh agent 复核 9 条（5 P1 全覆盖 + 4 P2 抽样）：9/9 保留、print G8-01 特别裁决维持 P1；2 存疑项澄清（scada 连线可用、flow dark 探针伪值）

Exit Criteria:

- [x] review.md 落盘；P0/P1 全覆盖；无驳回项（零误报流出）

### Phase 3 - 归族与汇总

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1b-walkthrough/summary.md`、`docs/audits/visual-quality-r2/watch-pool.md`

- Item Types: `Decision | Fix`

- [x] Fix：评分卡（fail 8/有风险 2/pass 0）+ 族归并（summary §4：新族 2 + 既有族扩面 3 + local 散项）（与 R2-1a 已裁定族去重合并）+ Top3 + Quick Wins + 去重对照
- [x] Decision：新族裁定登记（G7 双向同步契约 P1×3 → R2-3 字母批候选；chip 遮挡族 → R2-3 候选；dark 族增量 → R2-4；local 新族为 R2-4 输入非终裁）（如有；systemic 新族按 Rule 3 字母批预授权登记候选；local 新族为 R2-4 合并裁定的输入非终裁，后续走 R2-4 字母批）-[x] Fix：watch-only 4 条入 watch-pool.md；台账 10 行 `digested`

Exit Criteria:

- [x] summary.md 落盘；台账 `digested`（10/10）；reconcile uncovered=0

### Phase 4 - 深挖轮（至收敛）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1b-walkthrough/rounds/`

- Item Types: `Follow-up | Proof`

- [x] Proof：定向深挖并入复核轮完成（2 存疑项澄清即深挖实质：scada 连线判定伪命题、flow dark 探针伪值——无新 P0–P2 产生，1 轮收敛）

Exit Criteria:

- [x] 终止条件达成并记录（review.md 存疑节）；无悬挂发现

## Closure Gates

- [x] 10 卡齐备、台账全 `digested`（10/10）、reconcile uncovered=0
- [x] P0–P2 程序化证据/[visual-only]+复核；归族无空缺（正式条目 31 条：P1×5/P2×13/P3×13；另 watch 段 12 + 行内注记 2 + 族引用 5，合并口径见 summary §2）
- [x] 独立复核 P0/P1 全覆盖（5/5 保留 + 4 P2 抽样全保留）
- [x] 族归并与新族裁定落 summary §4
- [x] 深挖轮终止条件达成（并入复核轮，2 存疑澄清，无新 P0–P2）
- [x] 独立子 agent closure audit 完成并记录证据（见 Closure Audit Evidence）
- [x] roadmap R2-1b 行回写（done，按单元格值精确改写并回读验证）+ Rule 5 logs 同步
- [x] `pnpm typecheck`/`lint`/`check`/`build`/`test` 全过

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 探针提升 e2e 归 R2-5。

## Closure

Status Note: 四 Phase 全部 completed、Closure Gates 全勾（2026-09-23）。10 页设计器域走查产出 36 条发现（P1×5 全部独立复核保留），新族裁定 2 项（G7 双向同步契约、chip 遮挡）登记 R2-3 候选，dark 族增量并入 R2-4 输入。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session）
- Evidence: <<见下方审计记录>>

Follow-up:

- interactions.mjs 与探针提升归 R2-5；print G8-01 排期加权建议随 R2-4 立项评估。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮通过线）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 6 Minor，共识达成）
- Rounds: 1
- Findings addressed: 6 Minor 全部落——m1 引用笔误 D1→D7 更正；m2 Failure Paths 补 canvas-probe-timeout 与 paper-surface-dark（V8a 纸面豁免）两行；m3 G 括号补子判据并注明"以 skill 维度定义为准"；m4 Test Strategy 补注册表说明；m5 local 族补"R2-4 输入非终裁、走 R2-4 字母批"承接；m6 Exit 显式绑定完整状态矩阵（双主题×双视口+中间态）
