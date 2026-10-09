# 558 审计提示词补充（G 类反馈通道污染 + 参考对齐）+ designer 家族页检查修正批

> Plan Status: completed（2026-10-09 draft review R1 revised→修订→R2 pass；closure audit R1 issues 0B/2M/3m——2M+3m 全部落盘后收口，agent_383859c9）
> Last Reviewed: 2026-10-09
> Source: 用户问询"为何多轮审计未发现 taskflow UI 问题"的归因分析（2026-10-09，session 内）；`docs/skills/interaction-state-audit-prompt.md`（现行 v2026-10-07）；`docs/skills/visual-page-quality-inspection-prompt.md`（分工边界）；plan 557 收口记录（D1 调试 toast、D2/D3 树卡设计债均系现行方法盲区）
> Related: `docs/plans/557`（盲区实证批）

## Purpose

把 557 批暴露的审计盲区落进方法论：①交互状态审计提示词补 G 类（反馈通道污染）+ V7 不变量 + 调试残留静态扫描 + 家族参考对齐节 + 覆盖语义澄清；②按补充后的方法对 designer 家族页执行一轮检查（静态扫描 + live toast 卫生探针 + 参考对齐走查），发现即分级修正或显式登记。

## Current Baseline

- 557 批实证的盲区机制：①调试遗留 toast（designer-page-body emit，557 已修）在 IS-4 审查读数中反复出现但无分类学挂钩（C 类只管假反馈不管噪声）；②taskflow 树卡/间距观感差距属视觉走查分工（§0 显式排除）——**修订（R1 M1 勘误）：视觉 pass 并非从未执行**——plan 493 / visual-quality-r2-roadmap R2-1b（2026-09-23，completed）已按 visual-page-quality-inspection-prompt 对设计器域 10 页（含 taskflow-designer，证据卡 `docs/analysis/2026-09-23-r2-1b-walkthrough/cards/taskflow-designer.md`，既有发现 R2-1b-G7-02 P1）完成走查；真实缺口是**增量性质**：R2-1b 先于 556/557 的 tree 重做（dingflow bootstrap + 9-variant 卡片均为 2026-10-09），且当时 tree tab 仅默认态抽查（简化矩阵）——走查结论已过时且无复跑编排；台账 `audited 257/257` 语义同时被窄化为"交互审计覆盖"；③+号锚定几何正确但比例失调，B 类 ±2px 锚定测试结构性通过；④§9 诚实条款下主观观感观察无立案出口被抑制（执行 session 自己在 556 也正常化了 layout dump toast，仅登记 004）。
- 现行提示词：127 行，§2 六类 A–F、§3 六不变量 V1–V6、§5 读数模板已采集 `toasts` 字段但无不变量消费它、§0 把视觉评审划给 visual-page-quality-inspection-prompt（该 pass 有多模态评审方法论但从未覆盖 taskflow/designer 家族页）。
- designer 家族页清单（live 域路由 id，R2-1b 同域）：flow-designer（4 tab）、taskflow-designer（2 tab）、report-designer、report-designer-host、spreadsheet、word-editor、scada-editor-demo、dashboard-demo（内嵌 dashboard-editor）、debugger-lab、print-designer——共 10 形态。dingtalk-flow-demo 已删页（555 裁定）。taskflow 已在 556/557 深度清理，本批作为 G 类回归锚点引用、不在检查范围内；**本批检查范围 = 其余 9 形态**。

## Goals

- 提示词补充落盘（G 类/V7/扫描/参考对齐/覆盖语义五件），含至少一次真实回填校验（新方法能在 557 已知案例上命中——D1 与 IS-taskflow-designer-004 作为 G 类回归锚点）。
- designer 家族其余 9 形态（不含 taskflow）按新方法完成一轮检查：调试残留静态扫描全仓 render 路径；live toast 卫生探针逐页枚举映射；参考对齐增量走查产出 design-debt candidates。
- 检查发现全量处置：可即修的修正（先红后绿），深根因的显式登记（watch/successor），零静默。

## Non-Goals

- 004（tree-session epoch/ack 握手）根因修复（既有 watch；本批静态扫描会再次命中其表现，登记引用不重复开案）。
- 257 页全量 toast 卫生普查（本批范围 = designer 家族 9 形态；全量普查另立批）。taskflow 2 tab 不重复检查（556/557 已清理，作回归锚点）。
- 视觉走查提示词本身的改动（visual-page-quality-inspection-prompt 已有方法论，本批只做编排/覆盖澄清）。
- design-debt candidates 的视觉修正实施（本批登记 + 显式裁定；实施按 severity 另立批）。

## Scope

### In Scope

- `docs/skills/interaction-state-audit-prompt.md`：§2 增 G 类、§3 增 V7、§5/§6 增取证与必测序列（调试残留静态扫描 + toast 映射 + 家族参考对齐）、§0/新增节覆盖语义澄清、B 类比例失调变体注记。
- designer 家族其余 9 形态（不含 taskflow）的一轮检查（静态扫描 + live 探针 + 参考对齐增量走查）与发现处置。
- ledger/roadmap/dev-log 回写。

### Out Of Scope

- 上列 Non-Goals。
- 557 已修面（taskflow）重复检查（作为 G 类回归锚点引用）。

## Failure Paths

| 编号                | 触发                                      | 行为                                        | 可重试 | 用户可见表现 |
| ------------------- | ----------------------------------------- | ------------------------------------------- | ------ | ------------ |
| scan-false-positive | 静态扫描命中合法 notify（如真实业务反馈） | 人工映射裁定后豁免并注记，不误修            | 是     | 无           |
| probe-flaky         | live 探针 toast 采集受时序影响            | initScript 单调记录器（556 先例）+ 双次访问 | 是     | 无           |

## Test Strategy

本档选择：**必须自动化**（提示词文档为方法论无行为面——文档部分"不适用：纯文档"；检查与修正部分必须自动化）。

- 方法有效性判别：G 类/V7 的新方法论必须能在两个已知案例上命中（557 前的 D1 已修——以 556 提交树 stash 对照或读数记录复现；004 在 live 即现役命中）。至少 004 为 live 现役命中。
- 修正项（若有）：先红后绿。

## Execution Plan

### Phase 1 - 提示词补充

Status: completed
Targets: `docs/skills/interaction-state-audit-prompt.md`

- Item Types: `Fix | Proof`

- [x] Proof：现行方法红态在案读数——旧分类学逐条套用：D1（调试 info toast）：A 视图跳变×、B 锚定×（非定位控件）、C 假反馈×（dump 内容真实、无成功承诺）、D 可辨×（toast 可见）、E 能力×、F 接线×；V1/V2/V4/V5 ×（不涉及）、V3 反馈真实性×（信息真实非虚假承诺）、V6 ×。004（宿主拒绝 error toast）：C ×（内容真实——宿主确实拒绝了）、V3 ×、其余同上。结论：**A–F/V1–V6 全部不命中，旧法结构性必漏**。
- [x] Fix：§2 增 **G 类 反馈通道污染**（定义/坐实案例：557 D1 + 004/违反信号/取证方法）；§3 增 **V7 通知通道卫生**（判定问句 + 取证读数 = §5 模板 toasts 全量映射清单）。
- [x] Fix：§6 增两条必测序列——**调试残留静态扫描**（render 路径 grep notify/console.debug/\*-debug，每批必做）与**反馈通道映射**（访问+交互全量 toast 逐条映射，无映射即立案）；**家族参考对齐**节（designer/demo 家族页必做：截图+DOM 结构对比 vs 同族参考，差异以 design-debt candidate 入账——§9 的主观观察立案出口）。
- [x] Fix：§0.5 新增节**覆盖语义澄清**（三 pass 覆盖矩阵表 + 基线过时须增量复跑条款）+ §2 B 类比例失调变体注记（audited = 交互状态覆盖；designer 家族页收口前三 pass 覆盖矩阵或显式豁免）；§2 B 类补比例失调变体注记（锚定正确但控件尺寸/间隙比偏离同族参考亦立案，P2/P3，归属设计配置）。
- [x] Proof：回填校验——新 G 类判据对两个已知案例命中（D1：556 提交树的设计在案记录复现判据；004：live 现役命中读数）；全文编号一致性（§4 步骤 5 与 §7 的类目枚举现行漂移为 A–E——F 类已定义未纳入，一并修至 A–G；不变量 V1–V7）。

Exit Criteria:

- [x] 提示词五件补充落盘，全文编号/交叉引用一致（grep A–E/六类/六条 零残留；§4 步骤5、§7 输出格式已修至 A–G）；G 类判据对已知案例命中验证在案（红态读数 + 004 live 现役）。

### Phase 2 - designer 家族页检查（静态扫描 + live 探针 + 参考对齐）

Status: completed
Targets: 9 形态——flow-designer、report-designer、report-designer-host、spreadsheet、word-editor、scada-editor-demo、dashboard-demo、debugger-lab、print-designer + 全仓 render 路径静态扫描

- Item Types: `Proof | Fix`

- [x] Proof：调试残留静态扫描——全仓 render 路径（排除 tests/docs/dist）grep `env.notify|\.notify\(|console\.(log|debug)` 与 `*-debug` 模块/testid，逐命中映射（合法业务反馈 vs 调试遗留）；候选清单落证据。
- [x] Proof：live toast 卫生探针——9 形态逐页（initScript 单调记录器，556 先例）：进入 → 最小交互（切换/选中/打开面板）→ 退出，全量 toast 枚举 + 逐条动作映射；无映射条目立案（taskflow 页预期能命中 004 现役 toast——引用既有行不重复开案）。
- [x] Proof：参考对齐增量走查——9 形态截图 + DOM 结构对比 vs flow-designer 基准（节点卡解剖/间距/控件布局），**明示为 vs R2-1b 基线的增量走查**（R2-1b 先于 556/557 tree 重做且仅默认态抽查）；R2-1b 既有发现（如 R2-1b-G7-02 P1）处置引用不重复立案；新增 design-debt candidates 清单（主观观察立案，标注需人工裁决）。
- [x] Fix：可即修发现逐项先红后绿修正（P2×2：word-editor 预览条 / dashboard KPI——判别 e2e designer-family-visual-fixes.spec.ts 红 1645px/visible → 绿 ≤1px/hidden+ellipsis）；深根因/低置信发现显式登记（P3×7 + B2 残影 → visual-quality-r2-roadmap R2-1c 行待人工裁决；004 引用既有行）。

Exit Criteria:

- [x] 三项检查证据落盘（扫描三控豁免清单 / 探针 9/9 零无映射 committed spec / 对齐 9 候选 + R2-1b 残留销项清单）；发现全量处置零静默；修正项红→绿。

### Phase 3 - 台账收口

Status: completed
Targets: ledger、roadmap、dev log

- Item Types: `Proof`

- [x] Proof：检查发现入 ledger（IS-word-editor-003 / IS-dashboard-demo-005 verified；初插撞既有 001 行号——map 按 id 去重顶掉新行、reconcile 计数差 2 定位，改号重插）；004 作 G 类锚点命中**不改动其 ledger 类别列**（类别重考随 004 专案收口对账）；reconcile exit 0（audited 257 / findings 173 = found 118 + verified 55）。
- [x] Proof：roadmap Successor 区 558 登记行 + visual-quality-r2-roadmap R2-1c 候选行 + dev log 558 条目。（均落盘）

Exit Criteria:

- [x] 三面回写一致；reconcile exit 0。

## Draft Review Record

- Reviewer / Agent: agent_1e2e2f26（fresh session 独立子 agent，2026-10-09）
- Verdict: `pass`（R1 revised——2 Major：M1 "视觉 pass 从未执行"声称被 plan 493/R2-1b 实况证伪（R2-1b 2026-09-23 已走查设计器域 10 页含 taskflow，真实缺口系增量性质：先于 tree 重做 + 仅默认态抽查）+ M2 页面清单计数不自洽（含 taskflow 的 9 vs "除 taskflow 外 9"、漏 print-designer）；4 Minor（§4/§7 类目枚举漂移 A–E、Phase 1 缺红态 Proof 前置、live route id 简写、004 锚点类别列注记）；修订后达零 Blocker/Major）
- Rounds: 2
- Findings addressed: 6/6（M1 baseline 机制②改写为增量缺口 + 参考对齐改"vs R2-1b 增量走查"并引用既有发现；M2 定版 10 形态清单/检查范围 9 形态 + print-designer 纳入 + dingtalk 已删注明；m1 一致性 Proof 扩至 §4/§7 A–G；m2 增红态 Proof 前置项；m3 统一 live route id；m4 004 类别列不动注记）

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（或显式登记 watch/successor）——静态扫描零新候选；P2×2 修复 verified；P3×7+残影登记 R2-1e 待裁决；004 引用既有行
- [x] 所有 in-scope confirmed contract drifts 已收敛（本批无 contract 面）
- [x] 行为/契约结果已达成（提示词五件落盘 + 三项检查证据 + 发现全量处置；审计员独立复跑 11/11 spec）
- [x] 必要 focused verification 已完成（G 类判据已知案例命中验证：红态读数 + 004 live 命中；修正项红→绿实测）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（P3 候选登记 R2-1e open 行；004 未吞——审计确认）
- [x] 受影响的 owner docs 已同步到 live baseline（提示词/ledger/roadmap×2/dev-log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_383859c9 R1 issues 0B/2M/3m——2M+3m 已全部落盘，本条随证据回填勾选）
- [x] `pnpm typecheck`（42 tasks；审计实跑复验）
- [x] `pnpm build`（42 tasks；审计实跑复验）
- [x] `pnpm lint`（42 tasks；审计实跑复验）
- [x] `pnpm test`（78/78 任务；审计实跑复验 playground 411 用例）
- [x] `pnpm check`（exit 0 零新增未登记红；审计实跑复验）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 2026-10-09 收口。提示词五件补充落盘（G 类/V7/三序列/覆盖语义/B 类变体/A–G 编号修正）；designer 家族 9 形态三项检查完成（静态扫描三控豁免零新候选 / live toast 卫生 9/9 零无映射 committed 守护 / 参考对齐增量走查 9 候选）；P2×2 即修 verified（判别 e2e 红→绿）；P3×7+低置信残影登记 visual-quality-r2-roadmap R2-1e 行待人工裁决。closure audit Minor 处置：M-1 门禁补勾（本节）；M-2 全量 e2e 补跑取证（结果见 Evidence）；m-1 候选行键改 R2-1e 避让既有 R2-1c/1d；m-2 ledger 行 "Phase 2c" 改 "Phase 2" + R2-1e 行指针改指本行；m-3 spec 注释补"重复同文案反馈不在守护射程"。

Follow-up:

- 见 Deferred But Adjudicated。
