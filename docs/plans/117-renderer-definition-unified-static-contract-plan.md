# 117 Renderer Definition Unified Static Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-04-20
> Source: `docs/architecture/capability-contract-model.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/capability-projection-manifest.md`, `docs/architecture/action-scope-and-imports.md`, `docs/analysis/2026-04-20-tooljet-actionable-references-for-flux.md`
> Related: `docs/plans/112-capability-projection-manifest-implementation-plan.md`, `docs/plans/12-action-scope-imports-and-component-invocation-plan.md`, `docs/plans/114-crud-component-implementation-plan.md`

## Purpose

这份计划用于把 `RendererDefinition` 收敛为 Flux 的统一静态契约入口，同时保持 host manifest、普通 renderer metadata、component capability metadata 三者的语义边界清晰。

目标不是把所有 renderer contract 压平成一个 envelope，而是把：

- 普通 renderer 的 authoring / inspector / tooling metadata
- component-targeted capability contract
- host/domain manifest contract

统一挂到 `RendererDefinition` 这一入口下，并让 future type inference、在线编辑、schema diagnostics、action authoring tooling 都可以从同一个 renderer `type` 起步查询。

## Current Baseline

- `RendererDefinition.hostContract` 已经是 host/domain boundary 的稳定入口，包含 family、defaultVersion、manifest resolver、capability publication attribution 等语义；参见 `packages/flux-core/src/types/renderer-core.ts` 和 `docs/architecture/capability-projection-manifest.md`。
- `Capability Projection Manifest` 已完成第一阶段落地，且 owner docs 已明确：host manifest 只适用于 `designer-page`、`report-designer-page`、`spreadsheet-page`、`word-editor-page` 这类 domain-host boundary，不应外扩到普通 renderer。
- `FluxValueShape` 已存在于 `packages/flux-core/src/schema-diagnostics/manifest.ts`，适合作为 shared structural contract IR。
- `ActionScope` 与 `ComponentHandleRegistry` 已是当前运行时基线，前者解决 namespace-targeted capability，后者解决 instance-targeted capability。两者在运行时解析上是有意分离的。
- 普通 renderer 目前缺少足够丰富的静态 metadata：`RendererDefinition.propSchema` 基本未被生产 renderers 使用，component handle 的方法签名也主要停留在 runtime switch/case 层，没有统一静态 contract。
- 现有文档已补充 `capability-contract-model.md`，初步确立了：共享 `FluxValueShape` 与 method contract language，但不合并 host envelope 与 ordinary renderer envelope，也不合并 `ActionScope` 与 `ComponentHandleRegistry`。
- 当前 owner docs 已经决定：`RendererDefinition` 是统一静态入口，`hostContract` 保持 host-only，renderer 分类采用 `instance-renderer` / `flux-owner-renderer` / `domain-host-renderer`。本计划不再重开这些架构决策，而是把它们收敛到 reference docs、类型层、试点 renderer 和 tooling-facing adapter baseline。
- 仍然未解决的真实 gap 是：
  - `RendererDefinition` 尚无统一的普通 renderer contract 字段集合
  - editor/tooling 仍无法从 renderer `type` 直接拿到闭合的 prop/event/component capability contract
  - 缺少 renderer classification（`instance-renderer` / `flux-owner-renderer` / `domain-host-renderer`）在代码层和工具层的对齐方案
  - 目前还没有明确的 rollout 次序，避免一次性把 host manifest、普通 renderer、tooling 全部搅在一起

## Goals

- 让 `RendererDefinition` 成为 renderer `type` 的统一静态契约入口。
- 为普通 renderer 增加稳定的 prop / event / component capability metadata 方向。
- 明确 renderer classification：`instance-renderer`、`flux-owner-renderer`、`domain-host-renderer`。
- 保持 `hostContract` 只服务 host/domain boundary，不向普通 renderer 泛化。
- 复用 `FluxValueShape` 作为 shared structural IR，不引入第二套核心 contract type system。
- 为 future type inference、在线编辑、Inspector、Action authoring tooling、schema diagnostics 准备统一查询面。

## Non-Goals

- 不在本计划中直接修改 runtime dispatch order。
- 不把 `ActionScope` 与 `ComponentHandleRegistry` 合并成一个运行时 registry。
- 不把所有普通 renderer 立即一次性补齐完整 metadata。
- 不在本计划中引入完整在线编辑器或 Inspector 产品实现。
- 不把 Zod 替换为平台级 contract IR。
- 不在本计划中重写 host page 的 projection/capability runtime wiring。

## Scope

### In Scope

- `docs/architecture/capability-contract-model.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/capability-projection-manifest.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/references/renderer-interfaces.md`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/schema-diagnostics/manifest.ts`
- 选定少量试点 renderer package（如 `flux-renderers-basic`, `flux-renderers-form`, `flux-renderers-data`）
- focused tests / docs examples / diagnostics baseline for the new static contract fields

### Out Of Scope

- host manifest envelope redesign
- runtime action lookup unification
- full builder UI implementation
- full codebase-wide renderer metadata backfill in one batch
- host-family projection-path diagnostics beyond current manifest baseline

## Execution Plan

### Phase 1 - Contract Surface Freeze

Status: planned
Targets: `docs/architecture/capability-contract-model.md`, `docs/architecture/renderer-runtime.md`, `docs/references/renderer-interfaces.md`, `packages/flux-core/src/types/renderer-core.ts`

- [ ] 把 owner docs 已确定的 `RendererDefinition` 字段集合和 renderer classification 同步到 `docs/references/renderer-interfaces.md`。
- [ ] 在 `docs/references/renderer-interfaces.md` 中为 `propContracts`、`eventContracts`、`componentCapabilityContracts`、`scopeExportContracts`、`hostContract` 分别写出职责、消费者、以及与 runtime contract 的关系。
- [ ] 在 references docs 中明确 `editableProps` 与 runtime `props` 的区别，避免 authoring contract 与 resolved runtime props 混淆。
- [ ] 为三类 renderer 提供固定代表映射：`button`、`form`、`crud`、`designer-page`。

Exit Criteria:

- [ ] `docs/references/renderer-interfaces.md` 明确列出统一的 `RendererDefinition` 字段集合，且字段命名与 `docs/architecture/capability-contract-model.md` 一致。
- [ ] `docs/references/renderer-interfaces.md` 明确写出 `editableProps` 与 runtime `props` 的区别。
- [ ] owner docs 与 reference docs 都明确写出 `hostContract` 仅用于 `domain-host-renderer`。

### Phase 2 - Shared Method And Shape Type Landing

Status: planned
Targets: `packages/flux-core/src/schema-diagnostics/manifest.ts`, `packages/flux-core/src/types/renderer-core.ts`, related docs

- [ ] 在 `packages/flux-core/src/schema-diagnostics/manifest.ts` 或相邻 dependency-safe contract 层中落地 shared method signature type。
- [ ] 在 `packages/flux-core/src/types/renderer-core.ts` 落地普通 renderer metadata 复用 `FluxValueShape` 的类型定义。
- [ ] 在 code comments / doc comments 中明确 `RendererCapabilityContract` 与 host manifest `HostCapabilityMethod` 的关系：共享 shape language，不共享 envelope。
- [ ] 冻结 `scopeExportContracts` 的语义：narrow readonly Flux-native exports，不等同于 host projection。

Exit Criteria:

- [ ] `packages/flux-core/src/types/renderer-core.ts` 能表达 `propContracts`、`eventContracts`、`componentCapabilityContracts`、`scopeExportContracts`。
- [ ] `packages/flux-core/src/schema-diagnostics/manifest.ts` 与 `packages/flux-core/src/types/renderer-core.ts` 之间不存在重复定义的 shape/method contract type。
- [ ] 文档和类型层都明确区分 editable props、instance capabilities、scope exports、host projection 四种 contract。

### Phase 3 - Core Interface Landing

Status: planned
Targets: `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/index.ts`, focused type tests if needed

- [ ] 在不改变 runtime 语义的前提下，为 `RendererDefinition` 增加新的可选静态 contract 字段。
- [ ] 保持 `hostContract` 原语义和已有 host manifest 实现不回归。
- [ ] 如果需要，为 shared method contract 增加 dependency-safe type export，供 host manifest 和 ordinary renderer metadata 共同引用。
- [ ] 增加 focused type-level / compile-level coverage，证明新字段不破坏既有 renderer registration。

Exit Criteria:

- [ ] `packages/flux-core/src/types/renderer-core.ts` 中 `RendererDefinition` 能表达三类 renderer（instance / flux-owner / domain-host）。
- [ ] `packages/flux-core/src/index.ts` 导出新增 contract types，且现有 renderer packages 无需破坏性签名修改即可继续编译。
- [ ] focused type tests 或 compile-time tests 覆盖新增可选字段的注册场景。

### Phase 4 - Pilot Renderer Metadata Adoption

Status: planned
Targets: `packages/flux-renderers-basic/src/button.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`

- [ ] 为少量代表性 renderer 做试点 metadata 补齐：
  - `button` 代表 `instance-renderer`
  - `form` 代表 `flux-owner-renderer` + `semantic-owner`
  - `crud` 代表 `flux-owner-renderer` + `composite`
  - `designer-page` 代表 `domain-host-renderer`
- [ ] 为试点 renderer 声明 prop/event/component capability contract。
- [ ] 核对这些静态 contract 与 live runtime 行为是否一致，避免只出现接口壳而无语义对应。

Exit Criteria:

- [ ] `button`、`form`、`designer-page` 至少三种 renderer class 都有 live code 试点样例。
- [ ] 试点 renderer 的静态 contract 与各自 runtime capability/props/event semantics 有 focused tests 或 explicit docs/test fixture 对照。

### Phase 5 - Tooling And Diagnostics Integration Baseline

Status: planned
Targets: `docs/architecture/capability-contract-model.md`, `docs/references/renderer-interfaces.md`, `packages/flux-core/src/types/renderer-authoring-contract.ts` or equivalent adapter contract file, one focused diagnostics fixture/test path

- [ ] 将 `ResolvedAuthoringContract` 从方向性描述收敛为明确的 adapter contract，并落在 `packages/flux-core/src/types/renderer-authoring-contract.ts` 或等效 dependency-safe contract 文件中。
- [ ] 在 `docs/references/renderer-interfaces.md` 写清在线编辑/自动补全/Action 参数编辑器优先消费哪些 contract 字段。
- [ ] 增加一个 focused diagnostics fixture 或 test，明确 schema diagnostics 当前只消费哪些普通 renderer contract 字段，以及哪些字段仍然只是 tooling metadata。
- [ ] 在 owner/reference docs 中固定 Zod 之类 runtime schema library 只作为 adapter/runtime guard，而不进入核心 contract path。

Exit Criteria:

- [ ] `docs/architecture/capability-contract-model.md` 明确列出 `ResolvedAuthoringContract` 的字段来源、组装顺序、缺省行为、以及哪些字段只在 `domain-host-renderer` 存在。
- [ ] `docs/references/renderer-interfaces.md` 明确列出 tooling-facing contract 与 runtime-resolved renderer `props` 的区别。
- [ ] repo 中存在 `packages/flux-core/src/types/renderer-authoring-contract.ts` 或等效 adapter contract 文件。
- [ ] repo 中存在一个 focused diagnostics fixture 或 test 文件，证明普通 renderer contract 字段与 diagnostics 消费边界已被记录。
- [ ] 文档明确说明不需要重新设计 `hostContract` 即可支持 future online editing / type inference baseline。

## Validation Checklist

- [ ] `RendererDefinition` 统一静态入口的语义在 architecture docs 中已明确
- [ ] `hostContract` host-only 的边界在 docs 与 code-level plan 中一致
- [ ] renderer classification（instance / flux-owner / domain-host）已在 owner docs 中稳定出现
- [ ] `FluxValueShape` 作为 shared IR 的定位已与 Zod adapter 边界写清
- [ ] focused docs/examples/references 已同步
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- 风险 1：把 `RendererDefinition` 做成“万能类型桶”，导致 envelope 再次混淆。
  - 回避：始终要求每个新字段都回答“它属于 ordinary renderer metadata、component capability、scope export、还是 host contract”。
- 风险 2：在线编辑需求驱动下，把 readonly host projection 误并入 editable prop metadata。
  - 回避：保持 `hostProjection` 只通过 `hostContract` 导出，不进入 `propContracts`。
- 风险 3：把 component capability 与 namespace capability 强行统一 runtime lookup。
  - 回避：计划明确只统一 contract language，不统一 runtime resolver。
- 风险 4：只补了类型壳，没有 live pilot renderer 对应语义。
  - 回避：Phase 4 必须选择试点 renderer 并核对 live behavior。

## Closure

Status Note: 待执行完成后填写。只有当文档、类型层、试点 renderer、以及 tooling-facing adapter baseline 都完成，并通过独立 closure audit 后，本计划才能标记为 completed。

Closure Audit Evidence:

- Reviewer / Agent: 待补充
- Evidence: 待补充

Follow-up:

- 若 Phase 5 收敛后仍需要单独推进 Inspector/productized online editor，可拆出 successor plan。
- 若 pilot renderer adoption 暴露出 `scopeExportContracts` 等字段需要独立 owner doc，可在本计划 closure 时显式拆出 successor plan。
