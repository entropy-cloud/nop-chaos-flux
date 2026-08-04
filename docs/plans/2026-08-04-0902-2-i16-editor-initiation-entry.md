# 2 I16 组态编辑器后继 mission 立项入口

> Plan Status: active
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I16 预留立项入口、Cross-Cutting 文档共识审查/人工确认阈值）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§七 Q8 编辑器后置 + §八 决策 1）、`docs/analysis/industrial-hmi/gate-4-review.md`（§10 行 241：I16 复用点）、`docs/analysis/industrial-hmi/research-*.md`（编辑器调研素材）、`docs/analysis/industrial-hmi/gate-3-review.md`（§3 leafer 真实 API 抽查，选型考量教训）
> Related: 上游 `docs/plans/2026-08-04-0902-1-i15-test-harness-and-doc-closeout.md`（依赖其 I15.1 完成后激活）
> Mission: industrial-hmi
> Work Item: I16

## Purpose

产出组态编辑器后继 mission 立项材料（**不实现编辑器**）：编辑器功能范围与优先级（图元拖拽放置/属性面板 schema/连线/undo-redo/画布工具箱）、与 runtime 共享引擎层复用点盘点（sky 交互覆盖物/图元注册表/组态 JSON 序列化/component:\* 句柄扩展）、技术选型考量（leafer-editor 插件 vs 自研交互层，基于调研报告与 I1.2 spike 证据）、工作量与里程碑评估 → 产出后继 mission 建议文档，经独立子 agent 文档共识审查达成共识后收口，roadmap I16 回写 `done`。

## Current Baseline

- 范围裁定在案（讨论文件 §七 Q8 + §八 决策 1 + roadmap I16）：运行时引擎优先，编辑器后置为后继 mission；I16 仅立项入口（产出立项材料，不实现）。
- Runtime 全链已落地并收口（I0–I14 `done`；I15 为本轮 plan 1）：`scada-canvas` renderer（config/width/height/viewport/events + loading/empty regions）、24 内置符号、点表三源、组件句柄面（fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy + dev/test `setPointValues` 注入通道）、事件全链路（click/dblclick/hover，`createNormalizedActionEvent` + helpers.dispatch）、sky 交互覆盖物（InteractionOverlay，m-C points 包围盒兜底）、测试句柄 `window.__flux_scada_<cid>` 恒开。
- gate-4-review.md §10 行 241 裁定：编辑器后继 mission 立项（复用点：sky 交互覆盖物/图元注册表/组态 JSON 序列化/component:\* 句柄扩展）；本 gate 无新增编辑器范围项。
- 调研素材在案：`research-scada-apps.md`（Meta2d.js 编辑器/属性面板/事件体系、FUXA 画面导航、SceneV 低代码编辑器）、`research-render-engines.md`（leafer-editor 插件、Editor 插件、Konva/Fabric React 集成模式）、`research-summary.md`（对比矩阵与差距分析）；I1.2 spike 工程 `~/sources/industrial-hmi-research/spike-leafer/`（10 万图形性能 + 组态 JSON 加载验证 + viewport 插件 A1 固化）。leafer 真实 API 抽查结论（gate-3-review §3）记录 mock↔真实漂移历史基线，编辑器交互层设计须吸收该教训。
- 复用点候选已具形：组态 JSON schema（design-renderer.md §4.1，validate 严格校验 `config.version=1`）、ConfigAdapter nodeById O(1) 索引（I14 优化）、图元注册表（20+ 定义）、序列化/反序列化（exportConfig/importConfig 句柄）、组件句柄面（SCADA_HANDLE_METHODS）、sky 覆盖物层（InteractionOverlay）。
- roadmap I16 `todo`；依赖 I15.1（roadmap 依赖表）——本 plan 激活时机 = plan 1（I15）Phase 1 完成后。

## Goals

- 产出后继 mission 建议文档（`docs/components/industrial-hmi/editor-initiation.md`）：编辑器范围与优先级、runtime 复用点清单（逐项「已落地/需扩展/缺失」三态，live 核对）、技术选型考量（leafer-editor 插件 vs 自研交互层，含工作量评估）、里程碑拆分、风险清单与人工确认项预标记。
- 文档经独立子 agent（fresh session）文档共识审查达成共识（判据：连续一轮 0 新增修正项；≤3 轮超限升级人工，Cross-Cutting 第 1/4 条）。
- roadmap I16 `planned → done` 回写（closure audit 通过后由独立 audit 核验）；daily log 收口摘要。

## Non-Goals

- 不实现编辑器任何功能、不引入 leafer-editor 依赖、不改 runtime 代码（复用点只盘点描述，不落地改造）。
- 不做新的联网深度调研（复用既有 5 份调研报告 + 讨论文件 + spike 工程；如需补充仅限轻量核证并记录来源）。
- 不产出可执行 plan（立项材料供后继 mission 编排启动，不预写后续 execution plan）。

## Scope

### In Scope

- 编辑器功能范围盘点与优先级（图元拖拽放置/属性面板 schema/连线/undo-redo/画布工具箱的功能边界与里程碑拆分；对齐讨论 Q8 边界）。
- runtime 复用点清单（引擎/ConfigAdapter/图元注册表/序列化句柄/SCADA_HANDLE_METHODS/sky 覆盖物/测试句柄）与编辑器缺口分析。
- 技术选型考量：leafer-editor 插件（许可/能力/与 viewport 插件兼容性）vs 自研交互层（吸收 gate-3 mock↔真实漂移教训）；证据链引用 research-\*.md + spike 工程，缺证据项标「待后继 spike 验证」。
- 工作量与里程碑评估、风险清单、人工确认项预标记（含 benchmark 包络对编辑器的适用性说明）。
- 文档共识审查 + roadmap I16 状态回写 + daily log。

### Out Of Scope

- 编辑器实现、spike 工程、依赖引入、runtime 代码改动、可执行 plan 起草。

## Failure Paths

| 可测场景编号           | 触发                                          | 行为                                                                         | 可重试 | 用户可见表现         |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- | ------ | -------------------- |
| reuse-overclaim        | 立项材料把 runtime 能力写成编辑器现成可用能力 | 逐项标注「已落地/需扩展/缺失」三态，复用点以 live 代码核对为准               | 是     | 立项文档口径诚实     |
| selection-evidence-gap | leafer-editor 能力/兼容性证据不足             | 以调研报告与 spike 证据为准；缺证据项标「待后继 spike 验证」，不臆断         | 是     | 立项材料标注验证项   |
| consensus-overrun      | 文档共识审查 >3 轮                            | 升级人工裁决（Cross-Cutting 第 4 条），roadmap 标记人工确认项                | 是     | 标记人工决策         |
| scope-creep            | 立项材料滑向编辑器设计文档/可执行 plan        | Non-Goals 收紧：只产出立项材料（范围/复用点/选型/工作量/风险），不写设计细节 | 是     | 立项材料保持立项粒度 |

## Test Strategy

本档选择：`不适用：纯文档交付`——本 plan 只产出立项材料（`docs/` 下文件），无代码变更，不新增测试；验证手段 = 文档共识审查（独立子 agent）+ live 代码核对（复用点三态清单）。文档共识审查记录写入文档头部「文档共识审查记录」块。

## Execution Plan

### Phase 1 - 立项材料起草

Status: planned
Targets: `docs/components/industrial-hmi/editor-initiation.md`、`docs/logs/2026/08-04.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Follow-up`：roadmap I16 `todo → planned` 回写（激活期同步执行，I3/I15 先例）
- [ ] `Proof`：复用点逐项 live 核对（引擎层/ConfigAdapter nodeById/图元注册表/exportConfig-importConfig 序列化句柄/SCADA_HANDLE_METHODS/sky 交互覆盖物/测试句柄——以 `packages/flux-renderers-industrial/src/` 源码为准），产出「已落地/需扩展/缺失」三态清单
- [ ] `Decision`：编辑器范围与优先级裁定（拖拽放置/属性面板 schema/连线/undo-redo/画布工具箱的功能边界、里程碑拆分、讨论 Q8 边界约束），裁定记录入文档
- [ ] `Fix`：立项材料起草——技术选型考量（leafer-editor 插件评估 vs 自研交互层，证据链引用 research-render-engines.md/research-scada-apps.md/research-summary.md + spike 工程；缺证据项标「待后继 spike 验证」；吸收 gate-3 §3 mock↔真实漂移教训）、工作量评估、风险清单、人工确认项预标记（含编辑器交互性能对 benchmark 包络的适用性说明）
- [ ] `Follow-up`：daily log 记录起草过程关键裁定

Exit Criteria:

- [ ] 立项材料落盘且逐节可核对（范围/复用点三态/选型/工作量/风险/人工确认项）；复用点每项均能指向 live 代码路径或明确标注「需扩展/缺失」

### Phase 2 - 文档共识审查与收口

Status: planned
Targets: `docs/components/industrial-hmi/editor-initiation.md`、`docs/components/roadmap-industrial-hmi.md`、`docs/logs/2026/08-04.md`

- Item Types: `Fix | Proof | Follow-up`

- [ ] `Proof`：独立子 agent（fresh session，不复用起草者上下文）文档共识审查直至达成共识（判据：连续一轮 0 新增修正项；≤3 轮超限升级人工），轮次/修正项/结论记录入文档头部「文档共识审查记录」块
- [ ] `Fix`：修正项全部落地，或作为待定项提交人工/推迟到后继 review gate 裁定（编写者不得单方拒绝，roadmap Cross-Cutting 裁决条款）
- [ ] `Follow-up`：roadmap I16 `planned → done` 回写（closure audit 通过后）与 daily log 收口摘要

Exit Criteria:

- [ ] 文档共识审查记录块含轮次/修正项摘要/共识结论（AGREE），修正项全部落地或作为待定项裁定（提交人工/后继 gate）
- [ ] roadmap I16 状态回写与 daily log 收口记录在案（closure audit 通过后由独立 audit 核验）

## Draft Review Record

- Reviewer / Agent: independent sub-agent (general, fresh session), task `ses_035b16040ffeYZAonpHdCwG1nX`（R1）；`ses_035abeb03ffedzZNVMG5RXpUMw`（R2 确认轮）
- Verdict: `revised`（R1：1 Major + 2 Minor + 2 Nit）→ 修正全部落地 → `pass`（R2 确认，零 Blocker/零 Major/零 Minor）
- Rounds: 2
- Findings addressed: R1 Major（roadmap I16 `todo → planned` 激活期回写项缺失 → Phase 1 首项补入，对齐 I3/I15 先例）/Minor（Phase 2 Item Types 补 `Follow-up`；修正项裁决条款收紧为「落地或作为待定项提交人工/推迟后继 gate 裁定」）+ Nit（Q8 引用补 §七；SCADA_HANDLE_METHODS 改称组件句柄面）

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。纯文档计划：不涉及代码变更，`pnpm test/lint/typecheck/build` 条目按 guide（Minimum Rule 18 + 模板注释）从 Closure Gates 删除，不执行。

- [ ] 立项材料已落盘且与 live runtime 能力一致（复用点三态清单逐项 live 核对证据在案）
- [ ] 文档共识审查达成共识（记录块含轮次/修正项/结论）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 项（无代码缺陷适用；选型证据缺口已显式标注「待后继 spike 验证」而非静默省略）
- [ ] 受影响的 owner docs 已同步：roadmap I16 `planned → done` 回写由独立 closure-audit 核验后执行；daily log 收口摘要
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无 in-scope deferred 项——立项材料即本 plan 最终交付物；编辑器实现本身是后继 mission 的 scope，不属于本 plan 的 deferred 语义）

## Non-Blocking Follow-ups

- 立项材料交后继 mission 编排启动（编辑器范围/复用点/选型/工作量作为其输入）；编辑器所需 spike（leafer-editor 兼容性验证）由后继 mission 决策，本 plan 仅在材料中标注验证项。

## Closure

Status Note: <<完成或关闭时填写：为什么这个 plan 可以关闭>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>

## Risks And Rollback

- **范围膨胀风险**：立项材料易滑向编辑器设计文档——Non-Goals 与 Scope Out Of Scope 收紧（只产出立项材料，不产出可执行 plan/设计细节）。
- **复用点高估风险**：三态清单强制 live 核对，防止把 runtime 能力直接当编辑器能力（reuse-overclaim Failure Path）。
- **选型臆断风险**：leafer-editor 与 viewport 插件的兼容性证据不足时显式标注「待后继 spike 验证」，不臆断结论。
