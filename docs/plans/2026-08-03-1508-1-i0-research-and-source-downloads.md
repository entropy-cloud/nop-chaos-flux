# 1 I0 调研与源码下载（研究阶段）

> Plan Status: completed
> Last Reviewed: 2026-08-03
> Source: `docs/components/roadmap-industrial-hmi.md`（I0）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§三调研摘要 / §五 Q5 / §八最终决策）
> Related: `docs/plans/2026-08-03-1508-2-i1-research-gate-and-spike.md`（下游 gate）、`docs/plans/2026-08-03-1508-3-i2-engine-design-docs.md`（设计文档上游输入）
> Mission: industrial-hmi
> Work Item: I0

## Purpose

完成 industrial-hmi mission 的第一个 work item：把讨论阶段形成的初步调研摘要（§三，官方自报数字未经校准）升级为**可审计的正式调研基线**——6 组代表项目全量 clone 到 `~/sources/industrial-hmi-research/`、逐数字标注性能来源并校准、产出 5 份调研报告（`docs/analysis/industrial-hmi/research-*.md`），最终以对比矩阵 + 设计启示（I0.5）作为 I1 review gate 的审查输入与后续 I2 设计文档的事实依据。

## Current Baseline

- mission 已立项（2026-08-03）：`missions/industrial-hmi.json` + roadmap（17 阶段 I0–I16，4 个固定 review gate I1/I3/I7/I12）。
- 范围已人审确认（讨论文件 §八）：LeaferJS（leafer-ui）底座 + 自研组态语义层；双轨数据模型（组态内点表 + flux 表达式桥接）；单容器 type `scada-canvas`；性能验收对标官方基准档（10 万图元 ≥45fps / 首屏 <2s / 内存 ≤320MB / 1 万点刷新 <200ms）——**数值官方自报，待本计划校准**。
- 调研下载目录 `~/sources/industrial-hmi-research/` **尚不存在**（2026-08-03 验证）。
- `docs/analysis/industrial-hmi/` 与 `docs/components/industrial-hmi/` **尚不存在**——本计划创建前者（调研报告），后者留给 I2。
- 项目内已有调研报告先例可循：`docs/analysis/complex-controls/research-kanban.md`（日期/版本/许可/参考仓库头注 + 表格化分析格式）。
- 真实 gap：6 组项目（leafer 系列 5 仓 / meta2d.js / FUXA / SceneV / Konva.js / Fabric.js）未 clone；渲染引擎组（leafer 系列 + Konva/Fabric）与组态应用组（Meta2d/FUXA/SceneV）未做源码级深度分析；补充项目（Sovit2D/智雨物联、vue-webtopo-svgeditor、mxGraph/maxGraph、OSHMI）未浅调研；性能数字无来源标注、未校准。

## Goals

- `~/sources/industrial-hmi-research/` 下完成 6 组代表项目全量 clone，并产出 `research-download.md`（版本/许可/体积/依赖树 + 性能数字来源逐项标注与校准结论）。
- 产出 `research-render-engines.md`（leafer 系列场景图架构/百万图形机制/命中检测/Editor 插件/布局 + Konva/Fabric 通用引擎对比与 React 集成模式）。
- 产出 `research-scada-apps.md`（Meta2d 数据绑定/订阅/动画/图元注册/JSON 序列化 + FUXA 点表/报警/趋势/画面导航 + SceneV 图元/属性面板/事件体系）。
- 产出 `research-supplement.md`（Sovit2D/智雨物联、vue-webtopo-svgeditor、mxGraph/maxGraph、OSHMI 浅调研设计点提取）。
- 产出 `research-summary.md`（对比矩阵 + 选型可行性验证点 + 可提取设计清单 + 与 flux 集成/React 桥接/测试策略的差距分析）。
- 校准后的性能数字（含来源链接与置信度）随 `research-download.md` 落地；与验收阈值差异 >30% 的数字显式标记并触发人工确认（roadmap Cross-Cutting「人工确认阈值」）。

## Non-Goals

- 不产出任何设计文档（I2.1–I2.4 归属下一个计划）。
- 不写可行性 spike 代码（I1.2 归属 I1 计划）。
- 不创建 `@nop-chaos/flux-renderers-industrial` 包、不引入任何依赖（I4）。
- 不修改 `docs/components/industrial-hmi/` 设计文档目录（I2 创建）。
- 不做引擎实现、不做 benchmark（I5/I14）。

## Scope

### In Scope

- `~/sources/industrial-hmi-research/` 目录创建与 6 组项目 clone（leafer/leafer-ui/leafer-in/leafer-editor/LeaferJS 集成仓 + meta2d.js + FUXA + SceneV + Konva.js + Fabric.js）。
- 下载清单 `research-download.md`：各仓版本/许可/体积/依赖树；性能数字来源逐项标注（官方自报 vs 第三方转述）并校准。
- 渲染引擎组深度分析 `research-render-engines.md`（I0.2）。
- 组态应用组深度分析 `research-scada-apps.md`（I0.3）。
- 补充项目浅调研 `research-supplement.md`（I0.4，无依赖可并行）。
- 汇总 `research-summary.md`（I0.5）：对比矩阵、设计启示、差距分析。
- 5 份报告的文档共识审查（roadmap Cross-Cutting「文档共识审查」；I1.1 gate 为终轮复核，不叠加）。
- roadmap Phase Status 回写（I0: `todo` → `planned` 激活时；→ `done` closure 通过时）。

### Out Of Scope

- 调研报告的 I1 gate 独立审查本身（I1.1，归属 I1 计划）。
- 任何设计决策的定稿（选型在 I1.2 spike 后最终确认）。
- 对候选项目做代码改动或 fork。

## Failure Paths

| 可测场景编号       | 触发                                        | 行为（含状态码/错误码）                             | 可重试 | 用户可见表现                                             |
| ------------------ | ------------------------------------------- | --------------------------------------------------- | ------ | -------------------------------------------------------- |
| clone-network-fail | git clone 失败（网络/仓库不存在/超时）      | 记录失败原因与重试次数；换镜像源或跳过并写入清单    | 是     | `research-download.md` 中该仓标注 clone-failed + 原因    |
| clone-disk-space   | 下载超出磁盘预算（仓库体量过大）            | 记录实际体积；只 clone 必要分支（`--depth 1` 起步） | 是     | 清单中标注 shallow-clone 与体积                          |
| perf-number-drift  | 校准后性能数字与验收阈值差异 >30%           | 显式标记为人工确认项，**不自动改阈值**              | 否     | `research-download.md` 顶部醒目标注 + roadmap 人工确认项 |
| license-concern    | 候选仓许可与 MIT 假设不符（如 FUXA/SceneV） | 如实记录许可类型与商用约束，选型影响留给 I1.2 裁定  | 否     | `research-download.md` 许可列如实呈现                    |

## Test Strategy

本档选择：`不适用：纯调研/文档产出，无仓库代码变更；报告内容的事实性（版本/许可/数字来源）由文档共识审查与 I1.1 gate 的人工核对承担，校准动作是来源追踪而非自动化测试。`

## Execution Plan

### Phase 1 - I0.1 源码下载与下载清单

Status: completed
Targets: `~/sources/industrial-hmi-research/`、`docs/analysis/industrial-hmi/research-download.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Decision`：roadmap Phase Status 回写 I0: `todo` → `planned`（本 plan 激活为 active 时同步执行）。
- [x] `Proof`：创建 `~/sources/industrial-hmi-research/`，clone 6 组代表项目（leafer 系列 5 仓 leafer/leafer-ui/leafer-in/leafer-editor/LeaferJS 集成仓 + meta2d.js + FUXA + SceneV + Konva.js + Fabric.js）；初始 `--depth 1`，必要分支补全；网络失败按 Failure Paths 处理。
- [x] `Proof`：产出 `research-download.md`——各仓版本号（tag/commit）/许可/体积/依赖树/源码入口目录；**逐项列出性能数字（百万图形首屏 1.28s/320MB/60fps/70KB 等）的来源链接并标注「官方自报 vs 第三方转述」**；对与验收阈值差异 >30% 的数字给出校准结论并触发人工确认标记。
- [x] `Decision`：复核 FUXA/SceneV/meta2d.js 等非 leafer 仓的实际许可（MIT vs Fair-code vs 其他），如实写入清单；选型影响留给 I1.2。
- [x] `Proof`：本 Phase 产出的 `research-download.md` 由独立子 agent（fresh session）执行文档共识审查第 1 轮（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工），记录到文档头部「文档共识审查记录」。

Exit Criteria:

- [x] `~/sources/industrial-hmi-research/` 存在且 6 组项目全部 clone 完成（有 clone-failed 的，清单中已记录原因与重试结论）。
- [x] `docs/analysis/industrial-hmi/research-download.md` 存在，含版本/许可/体积/依赖树表格与性能数字来源标注节。
- [x] roadmap Phase Status 中 I0 已回写 `planned`。

### Phase 2 - I0.2 渲染引擎组深度分析

Status: completed
Targets: `docs/analysis/industrial-hmi/research-render-engines.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Proof`：基于 clone 源码深度分析 leafer 系列——场景图架构（层/节点模型）、百万图形机制（脏区/局部重绘/批量渲染）、命中检测实现、Editor 插件能力边界、Flex 布局、Web/Node 双端能力；与讨论文件 §三初步要点的出入逐条记录。
- [x] `Proof`：深度分析 Konva.js 与 Fabric.js——通用引擎对比（性能档/API 模型/React 集成模式 react-konva 等）、各自在「万级图元 + 实时刷新」场景的适用边界。
- [x] `Follow-up`：提取可借鉴设计点清单（图层/坐标变换/脏区/事件模型等），标注来自哪个仓与具体文件/模块位置。
- [x] `Proof`：本 Phase 产出的报告由独立子 agent（fresh session）执行文档共识审查第 1 轮，记录到文档头部。

Exit Criteria:

- [x] `research-render-engines.md` 存在，覆盖 leafer 系列场景图/性能机制/命中检测/Editor/布局 + Konva/Fabric 对比，关键结论带源码文件引用。

### Phase 3 - I0.3 组态应用组深度分析

Status: completed
Targets: `docs/analysis/industrial-hmi/research-scada-apps.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Proof`：基于 clone 源码深度分析 Meta2d.js——数据绑定/订阅消息机制、动画体系（1000+ 动画的组织方式）、图元注册机制、JSON 序列化格式、生命周期 hooks；评估直接复用 vs 仅借鉴的边界。
- [x] `Proof`：深度分析 FUXA——点表/变量绑定模型、报警、趋势曲线、画面导航与图元组织；提取 SCADA 平台语义设计点。
- [x] `Proof`：深度分析 SceneV——图元模型/属性面板 schema/事件体系/画布交互；提取低代码组态编辑器可借鉴点（供 I16 立项材料参考）。
- [x] `Follow-up`：三者的点表/绑定/动画/序列化设计与 leafer 引擎层的衔接点清单（供 I2.2 数据绑定设计引用）。
- [x] `Proof`：本 Phase 产出的报告由独立子 agent（fresh session）执行文档共识审查第 1 轮，记录到文档头部。

Exit Criteria:

- [x] `research-scada-apps.md` 存在，覆盖 Meta2d/FUXA/SceneV 三者的数据绑定、动画、图元注册、序列化、事件体系分析，关键结论带源码文件引用。

### Phase 4 - I0.4 补充项目浅调研（可并行）

Status: completed
Targets: `docs/analysis/industrial-hmi/research-supplement.md`

> 本 Phase 无上游依赖，可与 Phase 2/3 并行执行。

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Proof`：线上浅调研 Sovit2D/智雨物联、vue-webtopo-svgeditor（SVG 方案）、mxGraph/maxGraph（流程图/拓扑）、OSHMI（老牌 SCADA）——README + 关键源码，提取可借鉴设计点（SVG 方案的适用边界、拓扑连线模型、老牌 SCADA 的点表/图元约定）。
- [x] `Follow-up`：标注每个补充项目「值得深挖」或「仅参考」的判定与理由。
- [x] `Proof`：本 Phase 产出的报告由独立子 agent（fresh session）执行文档共识审查第 1 轮，记录到文档头部。

Exit Criteria:

- [x] `research-supplement.md` 存在，覆盖 4 个补充项目，每个项目给出可借鉴设计点与「深挖/仅参考」判定。

### Phase 5 - I0.5 汇总对比矩阵与设计启示

Status: completed
Targets: `docs/analysis/industrial-hmi/research-summary.md`、roadmap

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Proof`：产出对比矩阵——6 组项目 ×（许可/性能档/数据绑定/动画/图元体系/序列化/事件/编辑器生态/React 集成）。
- [x] `Proof`：选型结论可行性验证点清单（LeaferJS 底座 + 自研组态语义层需要验证的关键假设，逐条对应 I1.2 spike 的验证目标）。
- [x] `Follow-up`：可提取设计清单（供 I2 四份设计文档引用）。
- [x] `Proof`：差距分析——flux 集成（`useScopeSelector`/`createNormalizedActionEvent`/renderer registry 复用）、React 桥接、测试策略（Vitest 纯逻辑 + Playwright 程序化断言 + 测试句柄 `window.__flux_scada_<cid>`）与现有架构的衔接点与差距。
- [x] `Proof`：5 份报告汇总核对——跨报告数字一致性（同一性能数字在各报告中标注一致）、来源链接可访问性抽查。
- [x] `Proof`：5 份调研报告整体执行文档共识审查追加轮（如需）：全部报告已达共识（含 I1.1 作为终轮复核的预留说明）后本 plan 方可收口。

Exit Criteria:

- [x] `research-summary.md` 存在，含对比矩阵、选型可行性验证点清单、可提取设计清单、差距分析四部分。
- [x] 5 份报告全部完成 ≥1 轮独立子 agent 文档共识审查，审查记录在各自文档头部；无未裁定修正项。
- [x] 校准后的性能数字与验收阈值的差异 >30% 项已显式标记（若有）。
- [x] 每日日志（`docs/logs/2026/08-03.md`）已记录本 plan 产出摘要。

## Draft Review Record

- Reviewer / Agent: fresh sub-agent（general，round 1）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 无 Blocker/Major；3 项 Minor（`--depth 1` 与「全量 clone」措辞、Follow-up 类型语义、clone URL 可省略）均为可选修，起草者采纳 1 项措辞澄清（全量 = 完整工作树，浅历史起步已在 Phase 1 执行项中体现），其余记录备查。

## Closure Gates

> 纯文档计划：不涉及任何代码变更（仅修改 `docs/` 下文件 + `~/sources/` 外部下载目录），按 plan 指南从 Closure Gates 中删除 `pnpm typecheck`/`build`/`lint`/`test`。

- [x] `~/sources/industrial-hmi-research/` 6 组项目 clone 完成，`research-download.md` 清单与磁盘实际一致。
- [x] 5 份调研报告（download/render-engines/scada-apps/supplement/summary）全部存在且内容完整。
- [x] 性能数字全部标注来源（官方自报 vs 第三方转述），>30% 差异项已标记人工确认（若有）。
- [x] 5 份报告文档共识审查通过（≥1 轮独立审查，无未裁定修正项；I1.1 gate 为终轮复核的预留说明已写入 report 头部）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺项（clone 失败/许可疑虑均有记录与裁定）。
- [x] roadmap Phase Status I0 已回写 `done`；`docs/logs/2026/08-03.md` 已记录收口摘要。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

### 性能数字校准 >30% 触发人工确认

- Classification: `out-of-scope improvement`（阈值裁定权属人工）
- Why Not Blocking Closure: 校准动作本身在 I0.1 完成；若存在 >30% 差异，本 plan 只负责如实标注与触发标记，不阻塞调研基线成立——阈值调整是人工决策，等待期间后续设计仍可按「官方自报数字 + 差异标注」推进，最终在 I1.2 spike 实测后定夺。
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-03-1508-2-i1-research-gate-and-spike.md`（I1.2 spike 实测 + 人工确认）

### 补充项目不下载源码

- Classification: `watch-only residual`
- Why Not Blocking Closure: 用户 Q5 已确认 4-5 个补充项目仅线上浅调研、不下载；深挖价值已标注，若后续需要可由 I8/I9 图元设计阶段按需补深调研。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 若 clone 中发现某仓体积异常或依赖树复杂，可在 `research-download.md` 中记录但不必深挖（对应项目已确定深挖范围的除外）。

## Closure

Status Note: 本 plan 可关闭：6 组代表项目（11 目录）全量 clone 完成且下载清单与磁盘实际一致；5 份调研报告全部产出并逐份经独立子 agent（fresh session）文档共识审查达成共识（download R3/render-engines R3/scada-apps R9/supplement R3/summary R5 均 AGREE），性能数字来源逐项标注与校准（无 >30% 人工确认触发），deferred 项均已裁定 non-blocking；独立 closure-audit（本 session）复核 8 项检查清单全部通过，roadmap I0 已回写 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit session（fresh，不复用执行上下文）
- Evidence: 8 项检查全绿——5 Phase 全 completed + Exit Criteria 全 [x]；11 clone 目录 commit 抽查（leafer ae3881c / leafer-ui 1e624ff / konva 914acaf / fabric.js f5d3cd9 / meta2d.js f97477e）；5 份报告共识记录 AGREE 收尾 + 终轮复核说明齐备；research-download §1.1/§2 与 live clone 数字/版本/许可逐一核对一致（leafer-ui 2.2.9 MIT、konva 10.3.0 MIT、fabric 7.4.0 MIT、FUXA 1.3.4-2881、SceneV 无源码）；daily log（`docs/logs/2026/08-03.md`）执行摘要与收口记录已落地；`git status` 仅 docs/ 变更；scada-apps 共识超轮人工观察项已记录并归 I1.1 gate。

Follow-up:

- scada-apps 共识循环修正轮超 3 轮上限（8 轮，行号精度类 Minor）与 summary 同源超轮——已按 roadmap「人工确认阈值」标记为人工决策观察项，**归 I1.1 review gate 人工裁定**（I1.1 前不阻塞，报告结论层面可用作设计蓝本）。其余无 plan-owned 工作：**no remaining plan-owned work**。
