# N1 Industrial SCADA 设计文档文件树/引用漂移修复

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` Follow-up Backlog（P2-9 / P2-10 / P2-11，源 audit `docs/audits/2026-08-08-1712-multi-audit-industrial-hmi-component-audit.md`）
> Related: `docs/plans/2026-08-08-1931-2-industrial-scada-serialization-export-contract-polish.md`（N=2 serialization/contract polish，已 completed，遗留 i18n/doc/adjudication 轮）
> Mission: industrial-hmi-component-audit

## Purpose

收口 industrial-hmi / industrial-hmi-editor 三份 design doc 的「实现拆分建议」文件树与源码引用漂移：使文档列举的模块清单、文件名、消费 API 与 live 仓库 `packages/flux-renderers-industrial/src/` 完全一致。这是纯文档计划，不涉及任何代码或测试变更。

## Current Baseline

live 仓库实际结构（2026-08-09 核对）：

- `src/editor/inspector/` 实有 4 源文件：`schema-extractor.ts`、`field-errors.ts`、`inspector-field.tsx`、`inspector-panel.tsx`。**无** `panel-field.tsx`，**无** `panel-group.tsx`。
- `src/editor/connection/` 实有 6 源文件：`anchor-snap.ts`、`connection-adapter.ts`、`connection-drag-controller.ts`、`connection-link.ts`、`connection-overlay.ts`、`connection-overlay-renderer.ts`。
- `src/engine/` 实有 9 源文件：`scada-engine.ts`、`tree-registry.ts`、`viewport.ts`、`config-adapter.ts`、`hit.ts`、`test-handle.ts`、`event-bridge.ts`、`interaction-overlay.ts`、`batch-add-probe.ts`。

文档漂移（live 缺陷）：

- **P2-9** `docs/components/industrial-hmi-editor/design-property-panel.md:335-337` §11 文件树列 `panel-field.tsx`（应为 `inspector-field.tsx`）、列 `panel-group.tsx`（不存在，应删除）、`inspector-panel.tsx` 注释 `消费 useEditorSession`（live `inspector-panel.tsx` 经 `runtime.session` 消费选中图元，无 `useEditorSession` 导出）。另 `inspector-panel.tsx:19` 若有同名 stale 注释一并清理。
- **P2-10** `docs/components/industrial-hmi-editor/design-connection.md:270-274` §11 文件树仅列 4 文件，漏 `connection-drag-controller.ts`、`connection-overlay-renderer.ts`（与 sibling `design-renderer.md §11` 不一致）。
- **P2-11** `docs/components/industrial-hmi/design-engine.md:301-310` §11 文件树仅列 6 模块，漏 `event-bridge.ts`、`interaction-overlay.ts`、`batch-add-probe.ts`（live `engine/` 9 文件）。

前序已落地：所有 industrial 审计 work item（HCA0–HCA-CG）均 `done`；polish 第一波/第二波/runtime+symbols/editor+contract N=1/N=2 均 completed。本计划属 N=2 遗留的「doc 轮」。

## Goals

- `design-property-panel.md` §11 文件树与 live `src/editor/inspector/` 完全一致，删除不存在的文件项，纠正消费 API 描述。
- `design-connection.md` §11 文件树补齐 2 个缺失模块，与 live `src/editor/connection/` 6 文件一致。
- `design-engine.md` §11 文件树补齐 3 个缺失模块，与 live `src/engine/` 9 文件一致。
- 三处文件树均与各自 sibling design doc（`design-renderer.md §11` / `design-architecture.md`）口径一致，不引入新的不一致。

## Non-Goals

- 不改动任何 `packages/*/src/` 代码或测试。
- 不重写 design doc 的章节结构（仅修文件树/引用段落与单行 stale 注释）。
- 不处理 P2-6/P2-7（i18n，归 N=2 plan）、P2-5/本轮-12（test/adjudication，归 N=3 plan）。
- 不回写已 `completed` 的历史审计 plan。

## Scope

### In Scope

- `docs/components/industrial-hmi-editor/design-property-panel.md` §11 文件树 + `inspector-panel.tsx` stale 注释（若有）。
- `docs/components/industrial-hmi-editor/design-connection.md` §11 文件树。
- `docs/components/industrial-hmi/design-engine.md` §11 文件树。

### Out Of Scope

- runtime `design-renderer.md` / `design-data-binding.md` / `design-symbols.md` 的 §11 文件树（roadmap 未登记漂移；若执行中发现同型漂移，记录到 Non-Blocking Follow-ups，不在本计划扩展 scope）。
- `editor-initiation.md`（sibling 口径源，作为参照而非修改对象）。

## Test Strategy

本档选择：`不适用`

理由：纯文档修改，无代码/行为变更。Closure Gates 按 guide「纯文档计划」删除 typecheck/build/lint/test 条目。

## Execution Plan

### Phase 1 - design-property-panel.md 文件树/引用修正

Status: completed
Targets: `docs/components/industrial-hmi-editor/design-property-panel.md`

- Item Types: `Fix`

- [x] §11 文件树：`panel-field.tsx` → `inspector-field.tsx`（与 live 文件名一致，注释保留「按 widget 渲染，复用 @nop-chaos/ui」语义）
- [x] §11 文件树：删除不存在的 `panel-group.tsx` 行（live 无对应组件；若分组折叠语义已由 `inspector-panel.tsx` 内聚实现，在 `inspector-panel.tsx` 注释补一句说明）
- [x] §11 文件树：`inspector-panel.tsx` 注释「消费 useEditorSession」→「消费 `runtime.session` 选中图元」（与 live 消费路径一致）
- [x] 核对 `src/editor/inspector/inspector-panel.tsx:19` 区域是否存在 `useEditorSession`/`panel-field`/`panel-group` stale 注释，存在则一并纠正

Exit Criteria:

- [x] `design-property-panel.md` §11 文件树 4 项与 live `src/editor/inspector/`（`schema-extractor.ts`/`field-errors.ts`/`inspector-field.tsx`/`inspector-panel.tsx`）逐项对齐
- [x] 文件内不再出现字符串 `panel-field.tsx`、`panel-group.tsx`、`useEditorSession`

### Phase 2 - design-connection.md 文件树补齐

Status: completed
Targets: `docs/components/industrial-hmi-editor/design-connection.md`

- Item Types: `Fix`

- [x] §11 文件树补 `connection-drag-controller.ts`（一行职责说明：端点拖拽状态机，对照 HCA9 审计记录语义）
- [x] §11 文件树补 `connection-overlay-renderer.ts`（一行职责说明：sky 层吸附/连线覆盖物渲染）
- [x] 核对补齐后 6 项与 live `src/editor/connection/` 顺序/命名一致

Exit Criteria:

- [x] `design-connection.md` §11 文件树 6 项与 live `src/editor/connection/` 6 源文件逐项对齐
- [x] 新增 2 项的职责说明与 `design-renderer.md §11` / HCA9 审计记录口径一致，无矛盾

### Phase 3 - design-engine.md 文件树补齐

Status: completed
Targets: `docs/components/industrial-hmi/design-engine.md`

- Item Types: `Fix`

- [x] §11 文件树补 `event-bridge.ts`（一行职责说明：world↔screen 事件桥接/坐标解析，对照 design-engine.md §6/§8.2 已有引用语义）
- [x] §11 文件树补 `interaction-overlay.ts`（一行职责说明：sky 交互覆盖物生命周期/模式管理）
- [x] §11 文件树补 `batch-add-probe.ts`（一行职责说明：批量添加性能探针/benchmark 基座）
- [x] 核对补齐后 9 项与 live `src/engine/` 9 源文件一致

Exit Criteria:

- [x] `design-engine.md` §11 文件树 9 项与 live `src/engine/` 9 源文件逐项对齐
- [x] 新增 3 项的职责说明与本文档已存在的 `event-bridge.ts`/`interaction-overlay.ts` 引用（§6/§8.2）口径一致，无重复或矛盾

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent fresh session `ses_01c6c773affeOQtstN3tVlgZA6`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major / 3 Minor（M1 Phase 1 分组折叠注释条件句执行时预决；M2 design-engine §11 行号 301-310 vs 含 fence 311 off-by-one；M3 §6/§8.2 已引用 event-bridge/interaction-overlay 执行时核对——均为 executor-side 澄清，非起草缺陷，不阻塞）

## Closure Gates

> 纯文档计划：按 guide「纯文档计划」删除 typecheck/build/lint/test 条目。

- [x] 三份 design doc §11 文件树与 live `src/editor/inspector/`、`src/editor/connection/`、`src/engine/` 逐项一致（grep 校验：每个 live 源文件在对应文档可定位，文档不出现 live 不存在的文件名）
- [x] 文档内无残留 stale 引用（`panel-field.tsx`、`panel-group.tsx`、`useEditorSession` 清零）
- [x] 新增/修正的职责说明与 sibling design doc（`design-renderer.md §11`、`design-architecture.md`）及对应审计记录口径一致
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- 若执行中发现 runtime `design-renderer.md` / `design-data-binding.md` / `design-symbols.md` §11 文件树存在同型漂移，记录于此并标注「out-of-scope improvement」，不扩展本计划 scope。

## Closure

Status Note: 三 Phase 全部完成（纯文档 + 1 处 source stale 注释修正）。Closure Gates 1-4 全部通过：live inspector/connection/engine 源文件（4/6/9）在对应 §11 文件树逐项可定位；`panel-field.tsx`/`panel-group.tsx`/`useEditorSession` 全仓清零；新增职责说明与 design-renderer.md §11 sibling 及 design-engine §6/§8.2 既有引用口径一致；Closure Gate 4 由独立 fresh sub-agent session 完成（见下方 Closure Audit Evidence）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（closure audit，不复用执行 session 上下文）
- Evidence: fresh session 重新核对 live repo 与文档——(1) `ls src/editor/inspector/` 4 源文件（schema-extractor.ts/field-errors.ts/inspector-field.tsx/inspector-panel.tsx）与 `design-property-panel.md:333-336` §11 逐项对齐，`inspector-panel.tsx` 注释已改为「消费 `runtime.session` 选中图元」、补「分组折叠内聚于本组件，无独立 panel-group 模块」；(2) `ls src/editor/connection/` 6 源文件与 `design-connection.md:271-276` §11 逐项对齐，新增 `connection-drag-controller.ts`/`connection-overlay-renderer.ts` 职责说明与 `design-renderer.md §11`（:379/:382）口径一致；(3) `ls src/engine/` 9 源文件与 `design-engine.md:305-313` §11 逐项对齐，新增 `event-bridge.ts`/`interaction-overlay.ts`/`batch-add-probe.ts` 职责说明与本文档 §6/§8.2 既有引用口径一致；(4) grep `panel-field.tsx|panel-group.tsx|useEditorSession` 在 `docs/components/industrial-hmi-editor/` 与 `docs/components/industrial-hmi/` 双目录零命中；(5) 三 Phase Status 均 `completed`、Exit Criteria 全 `[x]`、Closure Gates 全 `[x]`、Closure 无 `*(pending)*`/`<<...>>` 占位符——五处文本一致。纯文档计划，无 typecheck/build/lint/test 条目（按 guide「纯文档计划」豁免）。

Follow-up:

- 无 plan-owned 剩余工作。Non-Blocking Follow-ups 仅记录同型 §11 漂移的潜在发现（runtime design-renderer/design-data-binding/design-symbols），roadmap 未登记，不扩展本计划 scope。
