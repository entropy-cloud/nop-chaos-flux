# Web Print P0 — 调研与设计

> Plan Status: completed
> Last Reviewed: 2026-09-05
> Source: `docs/backlog/web-print-roadmap.md`（P0.1–P0.5）, `missions/web-print.json`, `~/sources/print/`（8 个开源项目）
> Related: 后续 P1–P4 计划（本文档 Phase 4 产出调整建议后另行起草）

## Purpose

收口 roadmap P0 全部 5 个工作项：完成 `~/sources/print/` 8 个开源项目的调研与对比（P0.1/P0.2），分析本项目现有设计器框架的可复用部分（P0.3），设计 flux-json 打印模板 schema（P0.4），产出调研报告（P0.5）。交付物为两份文档：`docs/analysis/web-print-research.md` 与 `docs/components/print/design.md`，并据此给出 P1–P4 的调整建议。

## Current Baseline

- `~/sources/print/` 下 8 个调研项目齐全。许可证以各仓库 LICENSE 文件实测为准：openprint（AGPL-3.0）、vue-print-designer（AGPL-3.0，另有 COMMERCIAL_LICENSE.md）、myprint（**Apache 2.0**，实测 `LICENSE.txt`；roadmap 项目清单误写为"无 LICENSE"，本计划执行时一并修正）、fastprint-designer（木兰宽松 v2）、vue-plugin-hiprint（MIT）、vue-print（MIT）、report-designer（无 LICENSE）、open-press（Apache 2.0）。
- 本项目已有设计器体系：`flow-designer-core`/`flow-designer-renderers`、`report-designer-core`/`report-designer-renderers`、`spreadsheet-core`/`spreadsheet-renderers`、`word-editor-core`/`word-editor-renderers`、`flux-renderers-dashboard`（dashboard 编辑器，基于 editor-core）；`editor-core` 提供 `undo-command-stack.ts`（`UndoCommandStack`）。
- 已有 print 相关代码：`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts` + `utils/calendar-print.css`（日历打印导出）；`packages/word-editor-renderers/src/toolbar/page-controls.tsx`（word-editor 打印按钮）。
- `docs/components/print/` 目前不存在，schema 设计文档需从零创建；`docs/analysis/` 已有调研报告先例（如 `2026-06-21-amis-mobile-support-research.md`）。
- 尚无任何 `flux-print-*` 包；`packages/` 现有 36 个包。
- 文档新鲜度 `fresh`（`docs/context/project-context.md`），AI 自主权 `implement`；但本计划为纯调研/设计，不改任何产品代码。
- 粒度裁定：roadmap Rule 1 写"每个工作项对应一个 execution plan"，但 P0.1–P0.5 是同一条调研→设计工作流的顺序步骤、共享同一结果面（两份文档交付物），按 plan guide Minimum Rule 22–24 合并为单个 owner plan，5 个工作项映射为 plan 内 Phase 1–4。此裁定已由独立 draft review（round 1）确认合理。

## Goals

- 产出 `docs/analysis/web-print-research.md`：8 个项目的技术栈、架构分层、模板 schema、打印/分页方案、许可证合规结论的对比调研报告。
- 产出 `docs/components/print/design.md`：flux-json 打印模板 schema 设计（页面、元素类型、数据绑定、分页语义）+ 渲染/打印/导出链路设计。
- 明确本项目可复用能力清单（editor-core、设计器分包模式、flux-formula、@nop-chaos/ui 等）与不复用部分的理由。
- 给出 P1–P4 工作项的调整建议（供 roadmap Rule 3 使用）。

## Non-Goals

- 不写任何产品代码、不创建 `flux-print-*` 包（属 P1 及之后计划）。
- 不拷贝 AGPL-3.0（openprint、vue-print-designer）与无 LICENSE（report-designer）项目的代码；AGPL/无 LICENSE 项目仅提取设计思想。
- 不修改 roadmap 的 P1–P4 工作项定义本身（只输出调整建议）；roadmap 回写仅限：Phase Status/Work Items 状态流转，以及 myprint 许可证事实修正（Phase 4，有实测证据）。
- 不实现设计器 UI 或渲染器。

## Scope

### In Scope

- 阅读 `~/sources/print/` 全部 8 个项目的 README、核心源码目录结构与关键实现文件。
- 提取并对比：技术栈、架构分层、模板 JSON schema、渲染流程、浏览器打印调用链、分页算法思想、数据绑定机制、设计器交互模式。
- 本项目复用分析：对照 `Framework / Platform Reuse` 表逐项核实（引用 live 路径）。
- `docs/components/print/design.md`：打印模板 schema（flux-json 风格）、元素类型集（文本/图片/表格/条码/二维码等）、分页语义、渲染与打印/导出链路。
- `docs/analysis/web-print-research.md`：调研报告（含许可证合规结论与 P1–P4 调整建议）。

### Out Of Scope

- P1–P4 的实现（基础设施、设计器、渲染器、Playground/E2E）。
- 与打印无关的任何代码或文档改动。
- 向上游开源项目回馈改动。

## Failure Paths

> 本计划为纯调研/设计文档计划，无运行时错误路径，不适用。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`不适用` —— 纯调研与设计文档变更，不涉及任何代码行为变更。

## Execution Plan

### Phase 1 - 开源项目调研（P0.1 + P0.2）

Status: completed
Targets: `docs/analysis/web-print-research.md`（创建报告骨架 + 逐项目章节）

- Item Types: `Proof`

- [x] 通读 8 个项目 README 与 package.json，确认技术栈、协议、入口与包结构
- [x] 对 MIT/Apache/木兰项目（vue-plugin-hiprint、vue-print、open-press、myprint、fastprint-designer）阅读核心源码：模板 schema、渲染流程、打印调用链、分页逻辑、数据绑定
- [x] 对 AGPL/无 LICENSE 项目（openprint、vue-print-designer、report-designer）仅阅读架构与操作模式，记录设计思想，不摘抄代码
- [x] 在报告中为每个项目写一节结构化调研内容（技术栈/架构/schema/打印链路/分页/数据绑定/许可证合规）

Exit Criteria:

- [x] `docs/analysis/web-print-research.md` 存在，含全部 8 个项目的逐项结构化章节（技术栈/架构/schema/打印链路/分页/数据绑定/许可证合规）
- [x] 章节内容中已标注各项目的许可证档位（以 LICENSE 文件实测为准）与对应的合规约束（可参考代码 / 仅参考思想）

### Phase 2 - 本项目复用分析（P0.3）

Status: completed
Targets: roadmap `Framework / Platform Reuse` 表逐项核实 → 写入报告复用章节

- Item Types: `Proof`

- [x] 逐项核实 roadmap 复用表：editor-core `UndoCommandStack`、flow-designer-core/renderers 分包模式、designer-inspector/designer-canvas 参考、flux-formula 表达式、flux-compiler schema 编译、@nop-chaos/ui、calendar print 已有实现
- [x] 识别复用表未覆盖但实际可复用的能力（如 `packages/word-editor-core/src/paper-settings.ts` 的纸张模型）
- [x] 识别不可复用、需要新建的能力及理由

Exit Criteria:

- [x] 报告含"本项目复用分析"章节，每项复用结论都带 live repo 路径证据（文件路径），新增复用项与不可复用项均有理由

### Phase 3 - flux-json 打印模板 schema 设计（P0.4）

Status: completed
Targets: `docs/components/print/design.md`

- Item Types: `Decision`

- [x] 设计打印模板 schema：页面（纸张、边距、方向）、元素类型集（文本、图片、表格、条码、二维码、线条/矩形等）、元素通用属性（位置/尺寸/样式/数据绑定）、数据源与表达式绑定方式（对齐 flux-json 惯例）
- [x] 设计渲染链路：模板 + 数据 → HTML → 浏览器打印 / PDF 导出；分页语义（固定元素 vs 流式表格分页）
- [x] 按本仓库组件文档惯例组织文档（对照 `docs/components/calendar/design.md` 结构），注明设计决策与被拒绝的替代方案、AGPL 项目思想借鉴处

Exit Criteria:

- [x] `docs/components/print/design.md` 存在，含 schema 类型定义（TypeScript 形式）、元素类型集、分页语义、渲染/打印/导出链路
- [x] schema 中的表达式绑定、数据作用域写法与 `flux-guide/` 现有惯例一致（引用对应 flux-guide 章节：`02-expression-syntax.md` 的 `${var | FILTER}` tpl 语法与内置变量）
- [x] 文档不含任何从 AGPL/无 LICENSE 项目复制的代码片段

### Phase 4 - 调研报告与 P1–P4 调整建议（P0.5）

Status: completed
Targets: `docs/analysis/web-print-research.md`（汇总章节）、`docs/backlog/web-print-roadmap.md`（许可证事实修正）、执行当日 daily log（`docs/logs/2026/09-05.md`）

- Item Types: `Proof | Decision`

- [x] 在报告中补齐汇总章节：8 项目对比表、架构模式提取、打印链路对比、分页算法思想、许可证合规结论
- [x] 写出 P1–P4 调整建议（包结构、schema 落点、实现顺序），供 roadmap Rule 3 使用
- [x] 修正 roadmap 项目清单中 myprint 的许可证事实错误（Apache 2.0，非"无 LICENSE"），并在 daily log 记录该修正
- [x] 更新执行当日 daily log 记录 P0 完成

Exit Criteria:

- [x] `docs/analysis/web-print-research.md` 含：8 项目对比表、许可证合规结论、复用分析引用、P1–P4 调整建议
- [x] roadmap 项目清单 myprint 行已修正且与实测 LICENSE 一致
- [x] 执行当日 daily log 有 P0 收口记录

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_2e29b32f-3059-4b1b-a2d4-312c3e980c54）
- Verdict: `pass-with-minors`（零 Blocker、零 Major）
- Rounds: 2
- Findings addressed:
  - Round 1 M1（Phase 1 Exit 观测点落在临时笔记，不可复核）→ 改为直接落 `docs/analysis/web-print-research.md` 逐项目章节
  - Round 1 M2（myprint 许可证事实错误，实测为 Apache 2.0）→ baseline/Phase 1 分组/roadmap 修正项/Non-Goals 四处同步
  - Round 1 m1–m5（包数、dashboard-editor 包名、未落地的纸张模型示例、粒度裁定与回写粒度、daily log 措辞）→ 全部修复
  - Round 2 m-r2-1（Non-Goals myprint 分类未同步）→ 已修复
  - Round 2 新增声称抽查（vue-print-designer COMMERCIAL_LICENSE.md）→ 实测属实

## Closure Gates

> 纯文档计划（仅修改 `docs/` 下文件，无任何代码变更），按 guide 约定删除构建/测试类条目。

- [x] Phase 1–4 全部 Exit Criteria 逐条满足
- [x] 两份交付文档内部一致：`design.md` 的 schema 与 `web-print-research.md` 的建议不互相矛盾
- [x] 许可证合规：文档中无 AGPL/无 LICENSE 项目代码复制（仅设计思想引用且标注来源）——审计对 20+ 特征标识符全文 grep 零命中
- [x] roadmap P0 状态回写（两处同步）：Phase Status 区的 `P0. 调研与设计` 行，以及 Work Items 表中 P0.1–P0.5 五行的 Status 列——`todo` → `planned`（draft review 通过后）、→ `done`（closure audit 通过后）
- [x] 执行当日 daily log 已记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-09-05 收口。P0.1–P0.5 全部落地：8 项目调研 + 复用分析 → `docs/analysis/web-print-research.md`（含四维对比与 P1–P4 调整建议）；schema 设计 → `docs/components/print/design.md`；roadmap myprint 许可证事实修正；daily log 记录。独立子 agent closure audit 一次通过（approved，零 issues），全部 Exit Criteria 与 Closure Gates 满足，无剩余 plan-owned work。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_cdb8108f-155b-4bbd-bfce-6c4c02790822）
- Evidence: 审计报告 verdict `approved`——7 项核对全 PASS：报告 8 章节与许可证实测吻合；复用分析 19 条路径抽查全存在；design.md schema/分页/链路齐备且 AGPL 特征标识符 grep 零命中；汇总章节与 roadmap 修正、daily log 均落实；文本五处一致；deferred 诚实；roadmap 状态自洽。记录同步至 `docs/logs/2026/09-05.md`。

Follow-up:

- no remaining plan-owned work（P1–P4 由后续 plan 承接，非本 plan 债务）
