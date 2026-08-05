# 1 Editor Mission E0 三项 spike 验证（leafer-editor 共存手势仲裁 / Editor 事件族载荷 / 编辑态覆盖物密集场景性能）

> Plan Status: draft
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi-editor.md`（E0、Cross-Cutting spike 先行纪律/人工确认阈值/文档共识审查）、`docs/components/industrial-hmi/editor-initiation.md`（§4.3 三项待验证项 / §4 选型考量 / §6 R1/R2 风险）、`docs/analysis/industrial-hmi/gate-3-review.md`（§3 leafer 真实 API 抽查口径 + mock↔真实漂移教训）、`docs/bugs/76-*.md`（hover-miss / 多边形覆盖物默认框 leafer 真实漂移先例）
> Related: `docs/plans/2026-08-03-1508-2-i1-research-gate-and-spike.md`（I1.2 选型可行性 spike 先例，spike 模式参考）、`docs/plans/2026-08-04-0902-2-i16-editor-initiation-entry.md`（上游 I16.1 立项入口 plan）
> Mission: industrial-hmi-editor
> Work Item: E0

## Purpose

执行 industrial-hmi-editor mission 首个 work item E0：在 scratch 目录（`~/sources/industrial-hmi-research/spike-editor/`）用真实 leafer-ui@2.2.9 + `@leafer-in/editor`@2.2.9 + `@leafer-in/viewport`@2.2.9 验证 `editor-initiation.md §4.3` 三项待验证项——① viewport+Editor 共存手势仲裁（决定选型主路径成立与否）；② Editor 事件族载荷面核对（决定适配层成本）；③ 编辑态覆盖物密集场景性能（决定编辑态包络数字候选）。

spike 结论作为 E1 选型 gate 的输入：**否决条件精确化（对齐 `editor-initiation.md §4.3` + roadmap 三处表述 + 本 plan Failure Paths）**——仅手势仲裁（E0.1）不成立或 API 漂移成本 ≥ 自研交互原语成本（E0.2）→ 转路径 B（自研交互层挂 sky）+ R1 人工确认；E0.3 性能不影响选型主路径，仅触发 R7 编辑态包络数字人工确认（详见 Failure Paths 三种失败处理）。spike 严格执行"真实 leafer 优先，禁止以 mock 推断"（Cross-Cutting「spike 先行纪律」+ gate-3 §3 教训 + `docs/bugs/76` 先例）。

## Current Baseline

- 前置 runtime mission（I0–I16）全部 done：`packages/flux-renderers-industrial/` 全链落地，10 个复用点 live 核对（`editor-initiation.md §3`）。
- 立项材料 `editor-initiation.md`（v1，2026-08-04 共识定稿）已明确选型主路径 = 路径 A（leafer-editor 插件底座）+ 否决条件（**§4.3 精确化为两项**：手势仲裁不成立 / API 漂移成本 ≥ 自研成本；spike 不成立 → 转路径 B）。
- `editor-initiation.md §4.1` 轻量核证已记录：① `@leafer-editor/partner` dependencies 同时含 `@leafer-in/editor` + `@leafer-in/viewport`（官方聚合默认共装）；② Editor `extends Group`（`Editor.ts:24`），独立节点模型；③ `editor/simulate.ts:11-18` 经 `zoomLayer.add(simulateTarget)` 挂模拟目标并 follow zoomLayer zoom/move——**Editor 与 zoomLayer（viewport 机制）存在官方设计内的直接交互**（spike E0.1 重点验证此交互在组态场景下的实际表现）。
- 前置 I1.2 spike（`~/sources/industrial-hmi-research/spike-leafer/`）已用真实 leafer-ui 验证：10 万矩形创建/拖动/命中 + 组态 JSON 加载 + viewport 插件 A1 固化（`tree: { type: 'viewport' }`）+ `move: { drag: 'auto', dragEmpty: true }` 让位语义（runtime 引擎已配，`scada-engine.ts` appConfig.tree，benchmark-report.md §3.3）。
- runtime 引擎交互面已固化：视口命令路径符号（applyViewportState/M-3 推导）、wheel/pinch 插件同步钳制（`scada-engine.ts:403-437`）、hover 命中反馈（event-bridge + InteractionOverlay）——spike 需在此固化的引擎交互面上验证 Editor 插件的接入路径。
- 真实 gap：① `tree: {type:'viewport'}` + `@leafer-in/editor` 共存的挂载形态与手势仲裁（拖拽图元 vs 平移画布）**未实测**——`drag:'auto'` 让位语义与 Editor 拖拽的交互优先级是 R1 关键；② Editor 事件族（EditorMoveEvent/EditorScaleEvent/EditorRotateEvent/EditorSkewEvent/EditorGroupEvent/InnerEditorEvent）载荷形状仅在 `research-render-engines.md §5 :122` 列名，**未做载荷面真实抽取**（gate-3 M-1 类载荷面核对教训）；③ 编辑态覆盖物密集场景（多选手柄/参考线/锚点）在 10 万图元组态上的交互帧率**未测**（决定编辑态包络数字候选）。

## Goals

- **E0.1**：完成 viewport+Editor 共存挂载 + 手势仲裁 spike，产出实测结论（手势仲裁成立/不成立 + 真实事件冲突点 + `drag:'auto'` 与 Editor 拖拽优先级机制 + 适配层成本估计）。
- **E0.2**：完成 Editor 事件族载荷 spike，产出真实载荷形状表（六大事件族 + 多选框选 + InnerEditor 场景），与 flux action 派发链衔接路径核对。
- **E0.3**：完成编辑态覆盖物密集场景性能 spike，产出编辑态包络数字候选（拖拽响应 fps / 编辑操作响应延迟 / 覆盖物密集上限）+ 覆盖物挂载形态建议（独立 sky Group vs leafer Editor 内置）。
- spike 报告写入 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`，作为 E1.1 选型 gate 的输入。
- spike 报告定稿前经独立子 agent（fresh session）文档共识审查（roadmap Cross-Cutting「文档共识审查」+ Rule 5）。
- roadmap Phase Status 回写（E0: `todo` → `planned` 本 plan 激活时；→ `done` closure 通过时）。

## Non-Goals

- 不裁定选型主路径（E1.1 选型 gate 职责，本 plan 只产出 spike 实测数据与事实结论）。
- 不确立编辑态 benchmark 包络数字（E1.2 职责，本 plan 只产出候选数字）。
- 不产出任何设计文档（E2 职责）。
- 不创建 `flux-renderers-industrial-editor` 包 or 修改 `flux-renderers-industrial`（E4 职责）——spike 依赖仅存在于 scratch 目录。
- 不实现任何引擎代码 / 编辑器代码（E5+ 职责）。
- 不修改 runtime mission 的 roadmap / 设计文档（本 plan 仅消费 runtime 已落地能力，不反向影响）。
- 不执行 E1/E3/E6/E8/E10 后续 gate。
- 不因 spike 发现的问题直接修改 editor mission roadmap 结构——只标记人工确认项（R1），结构性调整仍由人审裁决（Rule 3）。

## Scope

### In Scope

- E0.1 spike（手势仲裁）：scratch 目录基于 leafer-ui + `tree: {type:'viewport'}` + `@leafer-in/editor` + `move: { drag: 'auto', dragEmpty: true }` 的最小 demo，验证：① Editor 接入后视口平移是否仍可用；② Editor 拖拽图元时画布是否不联动平移；③ 多选框选时手势归属；④ 事件冲突点（pointerdown/dragstart 触发序）记录；⑤ 真实 API 锚点（leafer-in/packages/editor/src/ + leafer-editor/packages/partner/）逐一记录。
- E0.2 spike（事件族载荷）：scratch 目录最小 demo 触发六大事件族（EditorMoveEvent/EditorScaleEvent/EditorRotateEvent/EditorSkewEvent/EditorGroupEvent/InnerEditorEvent），用 `page.evaluate` 抽取真实载荷形状；多选框选 + 内部编辑器（InnerEditor）场景覆盖；与 flux `createNormalizedActionEvent` 载荷格式衔接路径核对。
- E0.3 spike（性能）：scratch 目录 10 万图元组态 + 编辑态多选手柄/参考线/锚点覆盖物 + Playwright headless Chromium 程序化实测（`page.evaluate` 计时 + 读场景树，禁截图判定；必要时 `--use-gl=swiftshader`）；测试矩阵：① 覆盖物密集度梯度（10/100/1k/10k 选区）；② 独立 sky Group vs leafer Editor 内置覆盖物对比；③ 编辑操作响应延迟（拖拽/缩放/旋转）。
- spike 报告产出 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`：三章节（E0.1/E0.2/E0.3）+ 真实 API 锚点附录 + 选型路径建议（不裁定，仅供 E1.1 参考）+ 编辑态包络数字候选（不确立，仅供 E1.2 参考）+ R1 人工确认标记（若 spike 否决主路径）。
- spike 报告的文档共识审查（独立子 agent，fresh session）。
- roadmap Phase Status 回写。

### Out Of Scope

- 选型裁定 / 编辑态包络确立（E1）。
- 设计文档（E2）。
- 包基建 / 依赖引入（E4）。
- 任何编辑器实现代码（E5+）。
- runtime mission 任何代码或文档变更。
- Benchmark 正式化（spike 只产候选数字，编辑态包络由 E1.2 确立）。

## Failure Paths

| 可测场景编号          | 触发                                                                                 | 行为（含状态码/错误码）                                                                                                                                | 可重试           | 用户可见表现                                                                       |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------- |
| spike-gesture-fail    | E0.1 验证「viewport+Editor 共存手势仲裁」不成立（Editor 拖拽与画布平移冲突不可调和） | 记录真实冲突点 + 转路径 B（自研交互层挂 sky）+ 标记 R1 人工确认（`editor-initiation.md §4.3 项 1 + §6 R1`）                                            | 否（直接转路径） | spike 报告标注「主路径否决」+ roadmap 出现 R1 人工确认标记，mission 暂停至人工裁决 |
| spike-event-drift     | E0.2 Editor 事件族真实载荷与 `research-render-engines.md §5 :122` 列名不一致         | 记录真实载荷形状差异；事件桥适配层 cost 重估（gate-3 M-1 类载荷面核对教训适用）                                                                        | 是               | spike 报告列出真实载荷 + 适配层 cost 估计，供 E2.1 编辑器架构设计规避              |
| spike-perf-fail       | E0.3 编辑态覆盖物密集场景性能未达候选包络（拖拽 <30fps 候选阈值）                    | 记录实测数字；调整覆盖物挂载形态建议（独立 sky Group vs Editor 内置）；R7 编辑态包络数字确立标记人工确认                                               | 是               | spike 报告列出性能瓶颈 + 挂载形态建议；E1.2 包络数字确立经 R7 人工确认             |
| spike-env-fail        | Playwright headless 无法跑 canvas 渲染（字体/GPU/头less 差异）                       | 加 `--enable-precise-memory-info`（内存）/ 必要时 `--use-gl=swiftshader` 重试（Canvas 2D 通常无需 GPU flag，实测后按需启用）；对齐 I1.2 spike env 处理 | 是               | 实测数据注明 headless 环境与真实浏览器的差异边界                                   |
| spike-mock-leak       | 发现 spike 中任何 API 行为是以 mock 推断的（违反「禁止以 mock 推断真实 API」纪律）   | 立即停手，回滚到真实 leafer-ui@2.2.9 + `@leafer-in/editor`@2.2.9 dist 验证；记录泄漏点                                                                 | 否               | spike 报告 R2 风险条款触发，spike 重跑                                             |
| consensus-round-limit | spike 报告文档共识审查循环超 3 轮                                                    | 停止循环并升级人工裁决（roadmap Cross-Cutting）                                                                                                        | 否               | spike 报告头部记录超限事实，等待人工                                               |

## Test Strategy

本档选择：`建议有测` —— spike 实测脚本（Playwright headless + `page.evaluate` 计时/读场景树/抽事件载荷）即本 plan 的核心验证手段，但 spike 目录位于 scratch（`~/sources/industrial-hmi-research/spike-editor/`），**不落入仓库、不产出仓库级测试**；实测数字与结论写入 spike 报告供 E1.1/E1.2 引用。spike 不属于自动化测试范畴（runtime mission 测试纪律：禁截图判定、不引 node-canvas）。

**真实 leafer 优先纪律**：所有 API 行为必须基于真实 leafer-ui@2.2.9 + `@leafer-in/editor`@2.2.9 dist 验证；spike 中若发现某行为只在 mock 出现而真实 leafer 不复现，立即标记 R2 风险并重跑真实 leafer；记录方式对齐 gate-3 §3 抽查口径（"✅ 一致 / ❌ 漂移（live defect）/ ⚠️ 漂移（无害）"三态）。

## Execution Plan

### Phase 1 - E0.1 viewport+Editor 共存手势仲裁 spike

Status: planned
Targets: `~/sources/industrial-hmi-research/spike-editor/`（scratch，不入仓库）、`docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（spike 报告 E0.1 章节）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Decision`：roadmap Phase Status 回写 E0: `todo` → `planned`（本 plan 激活为 active 时同步执行）。
- [ ] `Proof`：在 scratch 目录创建 spike 工程（Vite + leafer-ui@2.2.9 + `@leafer-in/editor`@2.2.9 + `@leafer-in/viewport`@2.2.9），编写最小 demo：① `tree: { type: 'viewport' }` 配置 + `move: { drag: 'auto', dragEmpty: true }`（对齐 runtime `scada-engine.ts` appConfig.tree）；② Editor 接入（`new App({ tree: ..., editor: {} })`）；③ 10 矩形作为可编辑图元（覆盖最小可观察场景，无需 10 万量级，性能留 E0.3）。
- [ ] `Proof`：Playwright headless Chromium 实测（`page.evaluate` 读场景树 + 事件日志，禁截图判定）以下场景的真实行为：① 不选图元时画布平移（wheel/pinch）是否仍可用；② 选中图元时拖拽图元（不触发画布平移）；③ 多选框选（EditSelect.selectArea）手势归属；④ 图元外空白区拖拽（应触发画布平移，`drag: 'auto'` 让位语义）；⑤ 双向手势切换（图元拖拽 ↔ 画布平移）事件冲突点（pointerdown/dragstart 触发序）记录。
- [ ] `Proof`：真实 API 锚点逐一记录（`leafer-in/packages/editor/src/` + `leafer-editor/packages/partner/` + `editor/simulate.ts`）：① Editor 构造与 tree 关系；② Editor 接管 pointer 事件的路径；③ `drag: 'auto'` 在 Editor 启用时的优先级机制；④ zoomLayer（viewport）与 Editor 的官方设计交互（`editor-initiation.md §4.1` 轻量核证③ 的实际表现）。
- [ ] `Decision`：基于实测结论判定 E0.1 主路径成立性——成立：记录手势仲裁机制 + 适配层 cost（应极小）；不成立：记录真实冲突点（不可调和）+ 标记 R1 人工确认 + 提出路径 B（自研交互层挂 sky）落地草案供 E1.1 裁定。
- [ ] `Fix`：将 E0.1 章节写入 spike 报告（实测数据 + 真实 API 锚点 + 主路径成立性判定 + 适配层 cost 估计 + R1 标记若触发）。

Exit Criteria:

- [ ] scratch spike 工程就绪（含 leafer-ui + leafer-editor + viewport 三依赖 + Vite 启动）；E0.1 五个测试场景的实测数据可追溯（spike 报告 E0.1 章节含数据表）。
- [ ] 真实 API 锚点表完成（≥10 项 leafer-editor API 真实行为对照表，对齐 gate-3 §3 抽查格式）。
- [ ] E0.1 主路径成立性判定有事实依据（不是 mock 推断，是真实 leafer 行为）；若 R1 触发，标记完整且人工确认路径清晰。

### Phase 2 - E0.2 Editor 事件族载荷 spike

Status: planned
Targets: `~/sources/industrial-hmi-research/spike-editor/`（scratch，沿用 Phase 1 工程）、`docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（spike 报告 E0.2 章节）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Proof`：扩展 Phase 1 spike demo，触发以下六大 Editor 事件族并经 `page.evaluate` 抽取真实载荷（JSON 序列化）：① EditorMoveEvent（拖拽移动）；② EditorScaleEvent（缩放，含 shift 锁比例 / alt 锚点场景）；③ EditorRotateEvent（旋转）；④ EditorSkewEvent（斜切）；⑤ EditorGroupEvent（成组/解组）；⑥ InnerEditorEvent（内部编辑器进入/退出/控制点变更）。
- [ ] `Proof`：多选框选场景载荷抽取（EditSelect.selectArea 触发的事件序 + 选区变更载荷）。
- [ ] `Proof`：InnerEditor 场景载荷抽取（双击进入内部编辑 / 控制点拖拽 / 退出内部编辑）。
- [ ] `Proof`：与 flux action 派发链衔接路径核对——基于真实载荷形状评估与 `createNormalizedActionEvent`（runtime mission 既有能力）的衔接：① 哪些事件族可直接映射为 flux action；② 哪些需要适配层转换（如 EditorGroupEvent 的 group/ungroup 操作需映射为组态模型 addSymbol/removeSymbol diff）；③ 适配层 cost 估计。
- [ ] `Decision`：基于实测载荷判定 E0.2 是否触发 spike-event-drift（与 `research-render-engines.md §5 :122` 列名不一致）——一致：记录确认；不一致：标记 drift 类型（载荷字段缺失 / 字段名变化 / 载荷结构变化）+ 适配层 cost 重估（gate-3 M-1 教训：载荷读取面错误会让事件永不派发）。
- [ ] `Fix`：将 E0.2 章节写入 spike 报告（六大事件族真实载荷表 + 多选框选/InnerEditor 场景 + flux action 衔接路径评估 + drift 标记若触发）。

Exit Criteria:

- [ ] 六大事件族真实载荷表完成（每族含触发条件 + JSON 载荷样本 + 字段语义注释）。
- [ ] 多选框选 + InnerEditor 场景载荷覆盖（≥2 个非基本场景）。
- [ ] flux action 派发链衔接路径有评估（直接映射 / 需适配层 / 适配层 cost 三态）；若 spike-event-drift 触发，drift 类型与 cost 重估清晰。

### Phase 3 - E0.3 编辑态覆盖物密集场景性能 spike

Status: planned
Targets: `~/sources/industrial-hmi-research/spike-editor/`（scratch，沿用 Phase 1+2 工程）、`docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（spike 报告 E0.3 章节 + 编辑态包络数字候选 + 覆盖物挂载形态建议）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Proof`：扩展 spike demo 支持 10 万图元组态（对齐 runtime mission benchmark-report.md §3.1 实例化 88.5ms 基线），程序化生成 + 固定随机种子（对齐 scada-perf-scale-demo.tsx 模式）。
- [ ] `Proof`：编辑态覆盖物挂载形态对比——方案 A：leafer Editor 内置覆盖物（EditBox/EditSelect，跟随 Editor 实例）；方案 B：独立 sky Group 自研覆盖物（对齐 runtime InteractionOverlay 模式 + `editor-initiation.md §4.2 路径 B`）。两方案分别实测。
- [ ] `Proof`：Playwright headless Chromium 实测以下性能矩阵（`page.evaluate` 计时 + rAF fps 计数，禁截图判定；`--enable-precise-memory-info` 内存；必要时 `--use-gl=swiftshader`）：① 覆盖物密集度梯度（10/100/1k/10k 选区，每梯度测拖拽响应 fps + 内存增量）；② 编辑操作响应延迟（拖拽/缩放/旋转操作从 pointerdown 到视觉响应的延迟，目标候选 <100ms）；③ 拖拽响应 fps（候选 ≥30fps，编辑态包络低于运行态 ≥45fps 红线）；④ 同时选区+视口平移的复合场景 fps。
- [ ] `Decision`：基于实测数据判定 E0.3 编辑态包络数字候选——产出三个候选档位（保守 / 中性 / 激进），每个含实测依据；同时给出覆盖物挂载形态建议（方案 A vs B 实测对比 + 建议路径）。
- [ ] `Decision`：若 E0.3 性能未达最保守候选（拖拽 <30fps），触发 spike-perf-fail + R7 人工确认项预标记（编辑态包络数字确立需人工确认，`editor-initiation.md §5.2 + §6 R7`）；调整覆盖物挂载形态建议。
- [ ] `Fix`：将 E0.3 章节写入 spike 报告（性能矩阵实测数据表 + 覆盖物挂载形态对比 + 编辑态包络数字候选 + R7 标记若触发）。

Exit Criteria:

- [ ] 10 万图元组态 spike demo 就绪 + 程序化生成可重现（固定种子）。
- [ ] 覆盖物挂载形态两方案（A 内置 / B 独立 sky Group）实测数据表完成。
- [ ] 性能矩阵四组（密集度梯度 / 编辑操作延迟 / 拖拽 fps / 复合场景）实测数据完整。
- [ ] 编辑态包络数字候选（三档位）有实测依据；覆盖物挂载形态建议清晰；若 R7 触发，标记完整且人工确认路径清晰。

### Phase 4 - spike 报告整合 + 文档共识审查 + roadmap 回写

Status: planned
Targets: `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（spike 报告全文）、`docs/components/roadmap-industrial-hmi-editor.md`（头部记录 + Phase Status 回写）、`docs/logs/2026/08-05.md`（每日日志）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Fix`：spike 报告整合——头节（目的/范围/方法/环境）+ E0.1/E0.2/E0.3 三章节 + 真实 API 锚点附录 + 选型路径建议（不裁定）+ 编辑态包络数字候选（不确立）+ R1/R7 人工确认标记（若触发）+ spike 局限性声明（scratch 单层 App vs runtime 3 层 App 的差异，对齐 I1.2 spike 与 runtime benchmark 的差异先例）。
- [ ] `Decision`：启动独立子 agent（fresh session，不复用本 plan 执行上下文）对 spike 报告执行文档共识审查——输入 = 本 plan + `editor-initiation.md §4` + spike 报告全文；输出 = review 结论 + 修正项清单（Blocker/Major/Minor 分级）。轮次 ≤3，超限升级人工（Rule 5 + Cross-Cutting）。
- [ ] `Fix`：修正项全部落地——回写 spike 报告；涉及 spike 结论 reversal 的修正项回写 roadmap（Rule 4）+ 标记人工确认项。
- [ ] `Proof`：spike 报告头部记录共识审查轮次与判定（AGREE / REVISE 各轮次事实）。
- [ ] `Fix`：spike 结论摘要回写 editor mission roadmap 头部「文档共识审查记录」+ Phase Status（E0: `planned` → `done` 留待 closure-audit 通过；本 plan 暂保持 `planned`）+ Rule 4 review gate 修正项回写（若有）。
- [ ] `Fix`：daily log 追加 E0 spike 收口条目（按 industrial-hmi runtime mission 先例格式：plan path + Phase 摘要 + 包级/workspace 验证状态 + closure-audit 状态 + Follow-up）。

Exit Criteria:

- [ ] spike 报告全文整合完成（头节 + 3 章节 + 附录 + 标记），结构对齐 industrial-hmi runtime mission 的 gate-/research- 报告先例。
- [ ] 独立子 agent 文档共识审查完成（轮次 ≤3，AGREE 判定），修正项全部落地，证据记录在报告头部。
- [ ] editor mission roadmap 头部记录追加 spike 收口摘要；Phase Status 待 closure-audit 后回写 `done`。
- [ ] daily log 追加 E0 条目。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_02ebf5257ffeeXf5npPaV6zmyO`（Round 2）+ `ses_02eb8c9a0ffetLu1ZasS657b0v`（Round 3）
- Verdict: `AGREE`（Round 3 达成共识，2026-08-05）
- Rounds: 3（R1 REVISE 6 项 [含 roadmap] → R2 REVISE 1 项 m-5 [本 plan] → R3 AGREE）
- Findings addressed:
  - **R1（roadmap 同审，6 项）**：M-1 否决条件过宽 / m-1 复用点遗漏 / m-2 包裁定归属 / m-3 R8 标注 / m-4 E5.1 依赖 / N-1 Phase 3 标题——全部在 roadmap 落地，详见 roadmap 头部 Round 1 记录。
  - **R2（本 plan，1 项）**：**m-5** spike plan Purpose line 14 否决条件「任一项否决 → 转路径 B」与 roadmap M-1 修正跨文档不同步 → 改为精确条件（仅手势仲裁不成立或 API 漂移成本 ≥ 自研成本，E0.3 性能仅触发 R7）+ line 19 概括补「§4.3 否决条件仅两项」防误读。修正后与 roadmap 三处（line 29/96/191）+ editor-initiation §4.3 line 95 + 自身 Failure Paths（line 69-71）全链跨文档一致。
  - **R3**：m-5 复核 ✅ 真实落地 + 全文复扫 0 新增修正项 → **AGREE，共识达成**。

## Closure Gates

> **关闭条件**：所有条目 + 每个 Phase Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。
>
> **纯文档 + scratch spike plan**：本 plan 不涉及任何仓库代码变更（仅修改 `docs/` 下文件 + scratch 目录 `~/sources/industrial-hmi-research/spike-editor/`，不入仓库），`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm build` 这些条目可从 Closure Gates 删除（plan guide「纯文档计划」条款）。但 spike 报告定稿前须经独立子 agent 文档共识审查（Phase 4 已含）。

- [ ] E0.1/E0.2/E0.3 三 Phase 全部 Exit Criteria 勾选。
- [ ] spike 报告全文整合 + 独立子 agent 文档共识审查达成共识（AGREE 判定，≤3 轮）。
- [ ] spike 结论摘要回写 editor mission roadmap 头部记录 + Phase Status（`planned` 待 closure-audit 后 → `done`）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope spike 验证项（E0.1/E0.2/E0.3 三项必须全部有事实结论）。
- [ ] 若 R1/R7 人工确认项触发，标记完整 + 人工确认路径清晰 + roadmap 出现标记。
- [ ] daily log 追加 E0 条目。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

_（无——本 plan 为 E0 spike，所有验证项必须在 Exit Criteria 收口；任何无法收口的项触发对应 Failure Path + 人工确认标记，不允许 deferred）_

## Non-Blocking Follow-ups

- spike 报告中发现的非阻断性 API 漂移（无害漂移类，对齐 gate-3 §3 的 ⚠️ 分类）登记到 editor mission Follow-up Backlog（本 plan 不收口，按 mission 节奏择期处理）。
- spike 局限性声明中的差异点（scratch 单层 App vs runtime 3 层 App）登记为 E1.1 gate 审查输入（不阻断本 plan 收口）。

## Closure

Status Note: _待 plan 执行完成后填写_

Closure Audit Evidence: _待 closure-audit 通过后填写（独立 fresh-session sub-agent task id + verdict + 日期）_
