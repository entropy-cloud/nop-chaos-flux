# 153 Complex Control Host Protocol 及相关 Designer Host 文档准确性对齐

> Plan Status: completed
> Last Reviewed: 2026-04-30
> Source: 2026-04-30 live repo audit of `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/*`, `docs/architecture/report-designer/*`, `docs/architecture/renderer-runtime.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/word-editor/design.md`, plus code audit of `packages/flux-core/src/workbench/types.ts`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-inspector.tsx`, `packages/spreadsheet-renderers/src/bridge.ts`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/report-designer-core/src/types.ts`, `packages/report-designer-core/src/core.ts`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/report-designer-inspector.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`
> Related: `docs/plans/33-complex-control-platform-convergence-refactor-plan.md`

## Purpose

将 `complex-control-host-protocol` 及其关联的 designer/workbench 架构文档收敛到同一套当前基线，避免共享 host 协议、Flow Designer、Report Designer、Word Editor 与 renderer contract 文档之间继续出现口径漂移。

本计划特别负责两类高风险漂移：

- 把 Flux 说成“它自己就是通用异构设计器内核”，而不是“execution/runtime core + 为通用异构设计器内核提供 runtime support”
- 把 inspector 继续写成 provider/panel-descriptor/第二套 inspector model，而不是 DSL-first 的 `selection-aware shell + SchemaInput/form runtime + action-based writeback`

## Current Baseline

### 共享设计基线（必须作为所有相关文档的同一前提）

- Flux 首先仍是 execution/runtime core。
- 在 designer/workbench 这一侧，Flux 共享的是 host boundary、host projection、namespaced action、`WorkbenchShell` 复用、per-family built-in default UI + explicit override surfaces、以及外部 `statusPath` 摘要发布规则。
- Flux 为通用异构设计器内核提供 runtime support，但不应把 Flux 自己直接写成该 designer kernel 本体。
- 共享 inspector 基线应写成：selection-aware shell + plain `SchemaInput` / form runtime + action-based writeback。
- 多 target / 多 panel / tabs / sections / byProfile 差异，优先通过上游 schema 组装/元编程生成最终 inspector schema；不应把 `InspectorProvider` / `InspectorPanelDescriptor` / provider composition / value-adapter model 继续写成规范主路径。
- 当某个 selection kind 没有显式可编辑 schema 时，不要求 fallback form。
- 属性编辑 UI 信息应集中在 `inspector`/schema；`propContracts.shape` / `required` / `defaultValue` / parse/validate 约束仍属于 authored schema 语义，不应被重新说成 designer property-editing 主路径。

### 共享 host protocol 的 live repo 事实

- `DomainBridge<TSnapshot, TCommand, TResult>` 定义于 `packages/flux-core/src/workbench/types.ts`。
- `SpreadsheetBridge` 当前是独立接口，结构兼容 `DomainBridge`，但未显式 `extends DomainBridge<...>`：`packages/spreadsheet-renderers/src/bridge.ts`。
- `ReportDesignerBridge extends SpreadsheetBridge`：`packages/report-designer-renderers/src/bridge.ts`。
- Flow Designer 与 Word Editor 都使用 bridge-like host patterns，但当前没有统一的独立 `DomainBridge` wrapper。
- `WorkbenchSessionState`、`BusyActionState`、`ResourceBrowserInteractionPolicy` 已存在于 `flux-core`，但当前没有直接 runtime consumer；它们更接近 protocol-level reserved types。
- 四个 host family 当前都已落地 host scope、namespace registration 与 `statusPath` 外部摘要发布。
- `WorkbenchShell` 当前由 Flow Designer、Report Designer、Word Editor 使用；`spreadsheet-page` 使用自定义 `<section>` 布局，说明 `WorkbenchShell` 是可复用视觉壳，而不是共享协议的强制前提。

### Flow Designer 文档当前缺口

- `design.md`、`api.md`、`config-schema.md` 中的 `DesignerPageSchema` 仍未一致写入 `statusPath?: string`，但 live `designer-page.tsx` 已发布 `DesignerHostStatusSummary`。
- `config-schema.md` 把 built-in `config.toolbar.items` 与 `designer-page.toolbar` 的 schema override surface 混写，还保留“方式二：使用完整 AMIS Schema”这类不符合 live baseline 的表述。
- 同一文件里的 toolbar 示例使用 `${canUndo}` / `${isDirty}` 这类顶层字段，但 live host scope 当前稳定字段是 `doc`、`selection`、`activeNode`、`activeEdge`、`runtime.*`。
- Flow Designer family docs 对 palette/canvas/default shell UI 与 explicit override surfaces 的边界仍不完全一致；当前 live baseline 不是“palette 也是 page region”。
- node inspector schema 已是 live 主路径，但 edge inspector 的 `inspector.body` / `mode` 仍是 schema 合同先行、renderer 未完整消费的状态，文档必须明确区分。

### Report Designer 文档当前缺口

- `complex-control-host-protocol.md` 与 `report-designer/inspector-design.md` 已经写成 DSL-first inspector baseline。
- 但 `report-designer/design.md`、`config-schema.md`、`api.md`、`contracts.md`、`nop-report-profile.md` 仍残留 provider/panel 旧语言，例如：
  - `InspectorProvider`
  - `InspectorPanelDescriptor`
  - `inspector.providers`
  - `providerIds` / `panelIds`
  - `inspectorPanels`
  - `InspectorValueAdapter`
  - “由多个 provider 组合成 tabs”
- live code 也仍然使用这套旧结构：
  - `packages/report-designer-core/src/types.ts`
  - `packages/report-designer-core/src/core.ts`
  - `packages/report-designer-renderers/src/host-data.ts`
  - `packages/report-designer-renderers/src/page-renderer.tsx`
  - `packages/report-designer-renderers/src/report-designer-inspector.tsx`
- 因此 report-designer 家族文档当前的真正任务不是“假装代码已经 DSL-first”，而是：
  - 规范文档必须明确 DSL-first target baseline
  - 如需提及当前 live code 的 provider/panel 结构，必须把它标成 implementation lag / compatibility detail，而不是 normative architecture

### 已基本对齐、主要作为 checkpoint 的文档

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/capability-contract-model.md`
- `docs/architecture/report-designer/README.md`
- `docs/architecture/word-editor/design.md`

这些文档目前大体符合讨论结果，但执行本计划时仍需复核，避免 cross-reference 或局部 wording 再次漂移。

## Goals

- 让 `docs/architecture/complex-control-host-protocol.md` 准确反映 live repo host protocol 事实与共享设计边界。
- 让 Flow Designer owner docs 一致描述 `statusPath`、default UI + override surfaces、toolbar contract、以及 schema 合同 vs live renderer 现状。
- 让 Report Designer owner docs 一致描述 DSL-first inspector 设计，并明确区分当前设计基线与 provider/panel legacy implementation。
- 去除仍把 Flux 直接写成“generic heterogeneous designer kernel”的过强表述。
- 去除仍把 provider/panel/value-adapter inspector model 写成规范主路径的残留口径。

## Non-Goals

- 不修改任何运行时代码、类型定义或 renderer 行为。
- 不在本计划内删除 `report-designer-core` / renderers 中现存的 provider/panel legacy code。
- 不推动 `SpreadsheetBridge` 代码上补 `extends DomainBridge<...>`。
- 不推动 `spreadsheet-page` 迁移到 `WorkbenchShell`。
- 不修改 `docs/architecture/` 之外的 analysis/discussions 文档；这些若仍有历史残留，另开 successor cleanup。
- 不把本计划扩展成 report-designer inspector 的代码迁移计划。

## Scope

### In Scope

- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/README.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/flow-designer/runtime-snapshot.md`
- `docs/architecture/report-designer/README.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/report-designer/config-schema.md`
- `docs/architecture/report-designer/api.md`
- `docs/architecture/report-designer/contracts.md`
- `docs/architecture/report-designer/inspector-design.md`
- `docs/architecture/report-designer/nop-report-profile.md`
- checkpoint review of `docs/architecture/renderer-runtime.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/word-editor/design.md`
- `docs/logs/2026/04-30.md`

### Out Of Scope

- 任何 `packages/*` 代码改动
- `docs/analysis/`、`docs/discussions/`、`docs/components/` 的额外清理
- 新的 host/runtime feature 设计
- report-designer inspector code migration / deprecation execution

## Execution Plan

### Phase 1 - 共享 Host Protocol 基线对齐

Status: completed
Targets: `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/word-editor/design.md`, `docs/logs/2026/04-30.md`

- [x] 统一 kernel 定位表述，明确 Flux 是 execution/runtime core，提供的是 generic heterogeneous designer kernel 的 runtime support，而不是该 kernel 本体
- [x] 修正 `SpreadsheetBridge` 与 `DomainBridge` 的关系描述：结构兼容但未显式 `extends`
- [x] 为 `WorkbenchSessionState`、`BusyActionState`、`ResourceBrowserInteractionPolicy` 增补 protocol-level reserved / no live consumer 的状态说明
- [x] 将 Word Editor namespace / host adoption 状态更新为 live 已接入，而不是“计划中/未来采用者”
- [x] 记录 `WorkbenchShell` 的准确边界：可复用但不强制；Spreadsheet 当前 custom layout 是允许的 live variation
- [x] 明确 `statusPath` 是对外窄摘要发布路径，不与 host projection 混用
- [x] 复核 `renderer-runtime.md`、`capability-contract-model.md`、`word-editor/design.md` 是否仍需小幅 wording / cross-reference 对齐；如无漂移则只记录 checkpoint 结果

Exit Criteria:

- [x] `complex-control-host-protocol.md` 不再把 Flux 直接说成 designer kernel 本体
- [x] `complex-control-host-protocol.md` 准确反映 bridge / namespace / statusPath / WorkbenchShell live 事实
- [x] Word Editor 在跨域基线中的状态与 live repo 一致
- [x] `WorkbenchShell` 被写成 reusable shell，而不是共享协议成立的前提
- [x] 相关 `docs/architecture/` 已更新为最终设计状态
- [x] `docs/logs/2026/04-30.md` 已更新

### Phase 2 - Flow Designer Host 文档对齐

Status: completed
Targets: `docs/architecture/flow-designer/README.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/flow-designer/api.md`, `docs/architecture/flow-designer/runtime-snapshot.md`, `docs/logs/2026/04-30.md`

- [x] 在 `DesignerPageSchema` 相关 owner docs 中一致补齐 `statusPath?: string` 与 `DesignerHostStatusSummary` 外部发布说明
- [x] 明确 Flow Designer 的 built-in default UI 与 explicit override surfaces：page 级 override surface 是 `toolbar` / `inspector` / `dialogs`，palette/canvas 仍是 renderer-owned default UI
- [x] 拆清 `config.toolbar.items` 与 `designer-page.toolbar` schema override 的边界，不再把 `config.toolbar` 写成完整 schema 容器
- [x] 删除或改写 `config-schema.md` 中不符合 live baseline 的“完整 AMIS Schema” toolbar 模式示例
- [x] 将 toolbar/shell 示例改成 live host scope 形状（`doc` / `selection` / `activeNode` / `activeEdge` / `runtime.*`），不再使用过时顶层 `${canUndo}` / `${isDirty}`
- [x] 在 `design.md` / `api.md` / `runtime-snapshot.md` 中统一 schema contract 与 live implementation qualifier：node inspector.body 已接线，edge inspector.body / mode 仍是 schema 合同先行

Exit Criteria:

- [x] `statusPath` 在 Flow Designer owner docs 中被一致记录
- [x] Flow Designer docs 对 default UI vs override surfaces 的边界不再互相矛盾
- [x] `config.toolbar` 与 `designer-page.toolbar` 的职责拆分清楚
- [x] host scope 示例与 live injected field shape 一致
- [x] schema 合同与 live renderer 落地状态的区别已明确写清
- [x] 相关 `docs/architecture/` 已更新为最终设计状态
- [x] `docs/logs/2026/04-30.md` 已更新

### Phase 3 - Report Designer Inspector 与 DSL-First 基线对齐

Status: completed
Targets: `docs/architecture/report-designer/README.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/config-schema.md`, `docs/architecture/report-designer/api.md`, `docs/architecture/report-designer/contracts.md`, `docs/architecture/report-designer/inspector-design.md`, `docs/architecture/report-designer/nop-report-profile.md`, `docs/logs/2026/04-30.md`

- [x] 将 report-designer 家族 owner docs 的 inspector 主路径统一写成：selection-aware shell + plain `SchemaInput` / form runtime + action-based writeback
- [x] 在 `design.md` 中移除或改写 `panel provider` / `schema or provider` / `provider 组合 tabs` 等规范性描述
- [x] 在 `config-schema.md` 中把 `nop-report` 适配方式从“专用 inspector providers”改为 profile/schema 组装（`body` / `byTarget` / `byProfile`）
- [x] 在 `api.md` 中移除 `inspector.providers = [...]` 这类与当前 DSL-first baseline 冲突的 target API 示例
- [x] 在 `contracts.md` 中清理会把 provider/panel/value-adapter 重新立成一等 inspector contract 的文本；如确需保留与 live code 对应的术语，明确标注为 implementation lag / compatibility detail，而不是 normative target
- [x] 在 `inspector-design.md` 中统一用 Flux schema/form runtime 语言，避免继续使用过时 AMIS wording 或隐含第二套 inspector model
- [x] 在 `nop-report-profile.md` 中把 workbook/sheet/cell tabs、expression/reference 字段、profile 差异改写为 profile-generated inspector schema，而不是 provider/panel composition
- [x] 明确写清：没有可编辑 schema 时不要求 fallback form；property-editing UI 信息集中在 inspector/schema，而不是 `editorType` / `propContracts`
- [x] 对照 live code (`report-designer-core/src/types.ts`, `core.ts`, `report-designer-renderers/src/host-data.ts`, `page-renderer.tsx`, `report-designer-inspector.tsx`) 增补必要的 implementation-lag 注释，避免文档假装代码已完成 DSL-first migration

Exit Criteria:

- [x] 没有 in-scope report-designer architecture doc 继续把 provider/panel inspector composition 说成规范主路径
- [x] DSL-first inspector 规则在 `design.md` / `config-schema.md` / `api.md` / `contracts.md` / `inspector-design.md` / `nop-report-profile.md` 间完全一致
- [x] target design 与 current implementation lag 的界线被明确记录
- [x] `statusPath`、host scope、action writeback 规则与共享 host protocol doc 一致
- [x] 相关 `docs/architecture/` 已更新为最终设计状态
- [x] `docs/logs/2026/04-30.md` 已更新

### Phase 4 - 独立 Closure Audit

Status: completed
Targets: 所有修改过的 architecture docs, `docs/logs/2026/04-30.md`

- [x] 由独立子 agent 或独立审阅者重审所有 in-scope architecture docs
- [x] 逐条核对 Phase 1-3 的 exit criteria
- [x] 对照 live repo 代码抽查 host protocol、`statusPath`、Flow Designer toolbar/scope、Report Designer inspector legacy implementation 等关键证据
- [x] 确认没有 active architecture doc 继续把 Flux 说成 generic heterogeneous designer kernel 本体
- [x] 确认没有 active architecture doc 继续把 provider/panel inspector model 说成 endorsed baseline
- [x] 把审计证据写回本 plan 与 `docs/logs/2026/04-30.md`

Exit Criteria:

- [x] 独立审阅确认所有 phase exit criteria 满足
- [x] 无残留 in-scope architecture contradiction
- [x] `docs/logs/2026/04-30.md` 已更新

## Validation Checklist

- [x] `complex-control-host-protocol.md` 与 live bridge / namespace / statusPath / WorkbenchShell 事实一致
- [x] Flow Designer docs 一致描述 `statusPath`、override surfaces、toolbar contract、以及 live host scope 字段形状
- [x] Report Designer docs 一致描述 inspector = DSL-first schema/form 路径
- [x] 任何仍保留的 provider/panel/value-adapter 术语都被明确标成 implementation lag / compatibility detail，而不是 normative architecture
- [x] 无 in-scope architecture doc 要求“没有 schema 时必须 fallback form”
- [x] 无 in-scope architecture doc 把 `editorType` / `propContracts` 说成 property-editing 的主架构路径
- [x] 无 in-scope architecture doc 把 Flux 自己直接说成 generic heterogeneous designer kernel 本体
- [x] 独立子 agent / 独立审阅者 closure audit 已完成并记录证据
- [x] `docs/logs/2026/04-30.md` 已更新

## Closure

Status Note: Shared host-protocol, Flow Designer, and Report Designer owner docs are now aligned on the same current baseline. Inspector is documented as plain Flux schema/form plus action-based writeback, and any remaining report-designer provider/panel runtime structures are explicitly treated as implementation lag rather than normative architecture.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent `ses_2245411bdffeBADAIH75eQtYKP`
- Evidence: initial audit found one remaining Flow Designer toolbar item-shape drift; after doc correction, re-audit passed with no remaining findings. See `docs/logs/2026/04-30.md` for the recorded closure note.

Follow-up:

- 如文档对齐完成后 live code 仍保留 provider/panel legacy inspector path，另开 successor plan 负责 report-designer inspector code migration
- 如后续希望让 `SpreadsheetBridge` 显式 `extends DomainBridge<...>`，另开代码收敛计划
- 如后续希望统一 `spreadsheet-page` 的 shell 体验，再评估是否需要迁移到 `WorkbenchShell`
