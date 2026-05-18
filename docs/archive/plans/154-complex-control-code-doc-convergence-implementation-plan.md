# 154 Complex Control Host Protocol 与 Inspector DSL-First 代码收敛计划

> Plan Status: completed
> Last Reviewed: 2026-04-30
> Source: 2026-04-30 live repo audit against `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/*`, `docs/architecture/report-designer/*`, `docs/architecture/word-editor/design.md`, plus code audit of `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-inspector.tsx`, `packages/spreadsheet-renderers/src/bridge.ts`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/report-designer-core/src/types.ts`, `packages/report-designer-core/src/adapters.ts`, `packages/report-designer-core/src/core.ts`, `packages/report-designer-core/src/runtime/inspector-panels.ts`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`, `packages/report-designer-renderers/src/report-designer-inspector.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`
> Related: `docs/plans/153-complex-control-host-protocol-doc-accuracy-alignment-plan.md`, `docs/plans/33-complex-control-platform-convergence-refactor-plan.md`

## Purpose

将复杂控件相关 live code 收敛到 2026-04-30 已完成的 owner-doc 基线，确保共享 host protocol、Flow Designer、Spreadsheet/Report Designer、Word Editor 的实现与文档完全一致，尤其是把 Report Designer inspector 从 legacy provider/panel 运行时模型迁回到 DSL-first 的 Flux schema/form 主路径。

## Current Baseline

- 文档基线已经对齐完成：`docs/plans/153-complex-control-host-protocol-doc-accuracy-alignment-plan.md` 已关闭。
- 但 `docs/architecture/report-designer/api.md` 与 `docs/architecture/report-designer/contracts.md` 仍然是 target-contract / future-contract 文档，不能单独被当作 live code 已经收敛完成的证明。
- 共享 host protocol 文档当前明确：Flux 是 execution/runtime core；复杂控件共享的是 host boundary、host projection、namespaced action、`WorkbenchShell`、`statusPath` 发布规则、selection-aware shell；inspector 主路径是 plain Flux `SchemaInput` + form runtime + action-based writeback。
- Flow Designer live code 已基本符合文档：`statusPath`、region host scope、`designer` namespace、`WorkbenchShell`、renderer-owned palette/canvas default UI 均已落地。
- Spreadsheet live code 已符合文档中的核心事实：`SpreadsheetBridge` 结构兼容 `DomainBridge` 但未显式 `extends`，`spreadsheet-page` 使用 custom `<section>` shell 而不是 `WorkbenchShell`，这是允许的 live variation。
- Word Editor live code 已接入 host scope、`word-editor` namespace 和 `statusPath`，并使用 `WorkbenchShell`。
- Report Designer live code 仍明显落后于文档：
- `packages/report-designer-core/src/types.ts` 仍把 `ReportDesignerConfig.inspector.providers`、`InspectorRuntimeState.providerIds/panelIds` 作为一等 contract。
- `packages/report-designer-core/src/adapters.ts` 仍公开 `InspectorProvider`、`InspectorPanelDescriptor`、`InspectorValueAdapter`。
- `packages/report-designer-core/src/core.ts` 与 `runtime/inspector-panels.ts` 仍按 provider -> panels 的旧运行时路径组装 inspector。
- `packages/report-designer-renderers/src/host-data.ts`、`page-renderer.tsx`、`inspector-shell-renderer.tsx` 仍暴露/消费 `inspectorPanels`。
- 当前 renderer 侧其实已经有更接近目标的 `report-designer-inspector.tsx`，但 page 默认路径仍没有把它作为规范主渲染路径。

## Owner-Doc Precedence

### Closure-Gating Docs

- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/flow-designer/runtime-snapshot.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/report-designer/config-schema.md`
- `docs/architecture/report-designer/inspector-design.md`
- `docs/architecture/word-editor/design.md`

### Advisory / Target-Shape References

- `docs/architecture/report-designer/api.md`
- `docs/architecture/report-designer/contracts.md`

这些文档可以作为迁移目标和命名参考，但本计划的 closure 判断以 closure-gating docs 为准；若执行中需要同步更新 advisory docs，必须明确记录。

## Goals

- 让共享复杂控件代码边界与 `docs/architecture/complex-control-host-protocol.md` 完全一致。
- 保持 Flow Designer、Spreadsheet、Word Editor 与当前文档基线一致，并补齐必要测试，防止再次漂移。
- 将 Report Designer inspector 实现收敛到 DSL-first 路径：selection-aware shell + final Flux schema/form + namespaced action writeback。
- 去除 report-designer code 中把 provider/panel/value-adapter 当作规范长期 contract 的公开接口与主执行路径。
- 在修改后完成 targeted tests 与全仓验证，并同步日志/相关文档。

## Non-Goals

- 不修改 2026-04-30 已对齐完成的架构结论本身，除非代码实现反向证明文档有误。
- 不把 Spreadsheet 强制迁移到 `WorkbenchShell`。
- 不改动各 domain 的底层文档模型与外部引擎选择。
- 不在本计划内设计新的 inspector DSL。
- 不把 Word Editor 重写成 `designer-page` 风格 renderer 架构。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-inspector.tsx`
- `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`
- `packages/flow-designer-renderers/src/designer-provider-and-manifest.test.tsx`
- `packages/spreadsheet-renderers/src/bridge.ts`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/report-designer-core/src/types.ts`
- `packages/report-designer-core/src/adapters.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/runtime/inspector-panels.ts`
- `packages/report-designer-core/src/runtime/registry.ts`
- `packages/report-designer-core/src/index.ts`
- `packages/report-designer-core/src/__tests__/*.ts`
- `packages/report-designer-renderers/src/host-data.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
- `packages/report-designer-renderers/src/report-designer-inspector.tsx`
- `packages/report-designer-renderers/src/renderers.tsx`
- `packages/report-designer-renderers/src/*.test.tsx`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `docs/logs/2026/04-30.md`
- 任何被修改代码直接影响到的 owner docs

### Out Of Scope

- `packages/flow-designer-core`、`packages/spreadsheet-core`、`packages/word-editor-core` 的领域模型重构
- 引入新的 shared package 或重新设计 shared host protocol 类型层次
- 非复杂控件相关的 renderer/runtime 整体重构
- `docs/analysis/`、`docs/discussions/` 清理

## Execution Plan

### Phase 1 - Shared Host Contract Checkpoint Hardening

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/spreadsheet-renderers/src/bridge.ts`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`, related tests, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/runtime-snapshot.md`, `docs/architecture/word-editor/design.md`, `docs/logs/2026/04-30.md`

- [x] 复核并最小化修正 shared host contract 的 live code 细节，确保 `statusPath`、host scope、namespace registration、`WorkbenchShell` / custom shell 边界与文档完全一致
- [x] 为 Flow Designer 补 focused tests，锁定 `statusPath` 发布、`toolbar` / `inspector` / `dialogs` region host scope 字段、`designer` namespace 可用性、node inspector schema 主路径，以及 edge selection 仍走当前 fallback/empty-state 路径这一 live qualifier
- [x] 为 Spreadsheet 补 focused tests，锁定 `statusPath` 发布、host scope 可见字段、namespace wiring、以及 custom shell 边界事实
- [x] 对 Word Editor 做窄实现修正与 tests：默认保存路径改为经 `word-editor:*` namespace/provider，离开确认不再由 page 内部 `window.confirm` 直接承担，而是对齐 host/session `leaveGuardActive` 语义
- [x] 若 `complex-control-host-protocol.md`、`flow-designer/runtime-snapshot.md`、`word-editor/design.md` 因实现侧收尾需要补一两处 wording，则同步更新

Exit Criteria:

- [x] Flow Designer、Spreadsheet、Word Editor 的实现事实与当前 owner docs 无冲突
- [x] `statusPath`、host scope、namespace wiring 都有 focused regression tests 覆盖
- [x] `docs/architecture/complex-control-host-protocol.md`、`docs/architecture/flow-designer/runtime-snapshot.md`、`docs/architecture/word-editor/design.md` 已更新为最终设计状态
- [x] `docs/logs/2026/04-30.md` 已更新

### Phase 2 - Report Designer Inspector Contract Rewrite

Status: completed
Targets: `packages/report-designer-core/src/types.ts`, `packages/report-designer-core/src/adapters.ts`, `packages/report-designer-core/src/index.ts`, `packages/report-designer-core/src/runtime/registry.ts`, related tests, `docs/architecture/report-designer/config-schema.md`, `docs/architecture/report-designer/inspector-design.md`, `docs/architecture/report-designer/api.md`, `docs/logs/2026/04-30.md`

Contract Rules:

- Inspector schema resolution order 固定为：

1. `byProfile[profileId][target.kind]`
2. `byTarget[target.kind]`
3. `body`
4. 若均不存在，则进入显式 empty state

- 没有 schema 时不提供 fallback form
- `selectionTarget` 是 canonical selection 字段
- `selection`、`target` 仅在现有 renderer/tests 仍需要时保留为兼容别名
- 本计划将 inspector contract rewrite 视为 workspace 内的 breaking cleanup：`InspectorProvider`、`InspectorPanelDescriptor`、`InspectorValueAdapter`、`providerIds`、`panelIds` 不再作为 package-level public contract 保留；如必须保留临时兼容层，也只能内部使用、不得继续 re-export 为规范公共 API

- [x] 重写 `ReportDesignerConfig.inspector` 公共 contract，使其与文档一致：直接表达 `body` / `byTarget` / `byProfile` 这类 Flux schema/form 入口，而不是 `providers`
- [x] 将 `ReportDesignerRuntimeSnapshot.inspector` 收敛到 selection-aware shell 所需最小运行时状态，不再把 `providerIds` / `panelIds` 作为公开主 contract
- [x] 把 `InspectorProvider`、`InspectorPanelDescriptor`、`InspectorValueAdapter` 从规范公共入口中降级或删除，避免继续作为 package-level endorsed baseline 导出
- [x] 更新测试，锁定新的 public contract、schema resolution precedence 与必要兼容边界

Exit Criteria:

- [x] `report-designer-core` 不再公开与 owner docs 冲突的 inspector 主 contract
- [x] package public types 与 `docs/architecture/report-designer/config-schema.md`、`inspector-design.md` 以及必要时同步后的 `api.md` 一致
- [x] focused tests 覆盖新 contract
- [x] `docs/architecture/report-designer/config-schema.md`、`docs/architecture/report-designer/inspector-design.md`，以及如有必要的 `docs/architecture/report-designer/api.md` 已更新为最终设计状态
- [x] `docs/logs/2026/04-30.md` 已更新

### Phase 3 - Report Designer Runtime Path Migration

Status: completed
Targets: `packages/report-designer-core/src/core.ts`, `packages/report-designer-core/src/runtime/inspector-panels.ts`, `packages/report-designer-core/src/core-dispatch.ts`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`, `packages/report-designer-renderers/src/report-designer-inspector.tsx`, related tests, `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/inspector-design.md`, `docs/logs/2026/04-30.md`

Target Runtime Shape:

- canonical host scope fields: `designer`, `runtime`, `spreadsheet`, `selectionTarget`, `meta`, `fieldSources`, `preview`
- compatibility aliases allowed only if documented: `selection`, `target`
- `inspectorPanels` 不再发布为规范 host-scope 字段
- `providerIds` / `panelIds` 不再属于 public runtime snapshot
- 任何 legacy helper 若暂时保留，必须同时满足：不再被默认 `report-designer-page` 路径消费、且不再作为 public export 暴露

- [x] 把 Report Designer 默认 inspector 执行路径改成：按 `byProfile -> byTarget -> body -> empty state` 解析最终 schema，并直接挂载 Flux schema/form，而不是 provider -> panels -> shell 的旧链路
- [x] 保留最小 selection-aware shell 能力，但让 tabs/sections/profile 差异通过最终 schema 或 schema 组装结果表达
- [x] 从 host scope 中移除 `inspectorPanels` 作为规范主字段；如需要短期兼容，明确为过渡层并限定内部消费范围
- [x] 让默认 `report-designer-page` 路径真正使用 DSL-first inspector renderer，而不是旧 `inspector-shell-renderer` 作为唯一默认路线
- [x] 调整 writeback 路径，确保属性编辑仍通过 `report-designer:*` / `spreadsheet:*` action 完成
- [x] 增加 focused renderer/core integration tests，覆盖 `body` / `byTarget` / `byProfile`、无 schema 时空态、已有 expression-adapter-backed 字段不回退、以及 action writeback

Exit Criteria:

- [x] 默认 Report Designer inspector 运行路径与 DSL-first 文档完全一致
- [x] `inspectorPanels` 不再是规范主路径的 host-scope 输入
- [x] 没有 runtime 路径继续依赖 provider/panel/value-adapter 模型才能成立
- [x] focused tests 覆盖 selection-aware shell、schema/form mount、action writeback、empty state
- [x] `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/inspector-design.md` 已更新为最终设计状态
- [x] `docs/logs/2026/04-30.md` 已更新

### Phase 4 - Verification And Closure Audit

Status: completed
Targets: touched packages, touched docs, `docs/logs/2026/04-30.md`

- [x] 运行 targeted package tests，修复所有与新基线相关的失败
- [x] 运行 `pnpm typecheck`
- [x] 运行 `pnpm build`
- [x] 运行 `pnpm lint`
- [x] 运行 `pnpm test`
- [x] 由独立子 agent 或独立审阅者重审实现与文档一致性，并记录 closure evidence

Exit Criteria:

- [x] 所有 in-scope package verification 通过
- [x] 全仓验证通过
- [x] 独立 closure audit 确认代码与文档无残留冲突
- [x] `docs/logs/2026/04-30.md` 已更新

## Validation Checklist

- [x] `complex-control-host-protocol.md` 中描述的 shared host facts 已被 in-scope code 满足
- [x] Flow Designer code 与 docs 对 `statusPath`、default UI vs override surfaces、toolbar contract、live host scope 字段形状完全一致
- [x] Report Designer code 与 docs 对 inspector = plain Flux schema/form 路径完全一致
- [x] `report-designer-core` 不再把 provider/panel/value-adapter 作为规范主 contract 暴露
- [x] 无 in-scope runtime path 要求“没有 schema 时必须 fallback form”
- [x] 所有新增或修改的行为都有 focused regression tests
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据

## Closure

Status Note: 2026-04-30 closure audit confirmed that plan-owned work is complete. Report Designer inspector now runs on the owner-doc DSL-first schema/form path, `selectionTarget` is the canonical host field with `selection` / `target` kept only as compatibility aliases, Flow/Spreadsheet/Word shared-host checkpoints are covered by focused regression tests, and workspace verification completed with `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent closure audit `ses_22413d2c4ffetva7mhJ1BpjOge`
- Evidence: audit verdict was `CLOSEABLE` after re-checking the closure-gating docs against live source/test paths. It confirmed `packages/report-designer-core/src/runtime/inspector-panels.ts` resolves inspector schema as `byProfile -> byTarget -> body -> undefined`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx` and `packages/report-designer-renderers/src/report-designer-inspector.tsx` render explicit empty state when no schema exists, `packages/report-designer-renderers/src/page-renderer.tsx` defaults to `report-inspector-shell`, `packages/report-designer-renderers/src/host-data.ts` keeps `selectionTarget` canonical with `selection` / `target` as compatibility aliases, and `packages/word-editor-renderers/src/word-editor-page.tsx` plus focused tests confirm save/back now follow the host action surface without page-local `window.confirm`.

Follow-up:

- 如果 Report Designer inspector 代码迁移后仍需要删除一批 compatibility-only types 或 adapter helpers，可另开小范围 cleanup plan
- 如果后续希望把 Spreadsheet 视觉壳也统一到 `WorkbenchShell`，另开独立计划，不与本计划混合
- 非阻塞 repo hygiene：清理仍残留旧 inspector 结构的 `packages/report-designer-core/dist/*` 与 `packages/report-designer-renderers/dist/*` 产物，避免 generated output 继续携带历史符号造成误判
