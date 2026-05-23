# 361 Slot Contract, Host Manifest, And Owner-Doc Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-deep-audit-full/{12-field-slot.md,16-doc-code-consistency.md,18-cross-package.md,summary.md}`
> Related: `docs/plans/209-renderer-definition-fields-only-convergence-plan.md`, `docs/plans/362-accessibility-contract-closure-plan.md`

## Purpose

收口 2026-05-18 深度审核中新确认的 slot contract、host manifest/runtime 契约漂移与 owner-doc 基线漂移。完成态是：`array-field` 参数化 slot、flow/spreadsheet host contract，以及 in-scope architecture/reference/components docs 都与当前 live baseline 对齐，并有 focused verification 防止回归。

## Current Baseline

- `array-field` 的 `item` region 已声明 `params: ['index', 'value']`，但 live 渲染路径同时传入显式 `scope` 与 `bindings`，导致 `$slot.index` / `$slot.value` 在 item region 内不会稳定发布：`docs/analysis/2026-05-18-deep-audit-full/12-field-slot.md`。
- `docs/architecture/field-binding-and-renderer-contract.md`、`docs/architecture/action-scope-and-imports.md`、`docs/references/renderer-interfaces.md` 的部分“权威/当前基线”表述已与 live code 分叉：`docs/analysis/2026-05-18-deep-audit-full/16-doc-code-consistency.md`。
- `flow-designer` manifest 宣布的 projection 字段没有完整进入 runtime host scope，`spreadsheet` manifest 公开能力面也显著落后于 live namespace provider：`docs/analysis/2026-05-18-deep-audit-full/18-cross-package.md`。
- `summary.md` 已把 `12-01`、`16-01/02/03`、`18-01/02` 标记为 retained must-fix items；`18-03` 与 `17-*` 已被明确驳回或降级，不应重新混入本计划。

### Retained Finding Ownership Matrix

| Finding | Code Owner Surface                                                                                                         | Doc Owner Surface                                                                                                                                                                              | Proof Owner Surface                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `12-01` | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`, `packages/flux-react/src/render-nodes.tsx`    | `docs/architecture/array-field.md`, `docs/architecture/scoped-render-slots.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`                   | focused regression test for `array-field` item `${$slot.index}` / `${$slot.value}`                     |
| `16-01` | `packages/flux-core/src/constants.ts`, `packages/flux-compiler/src/schema-compiler/fields.ts`                              | `docs/architecture/field-binding-and-renderer-contract.md`                                                                                                                                     | repo-observable cross-check that frozen `META_FIELDS` text matches live exported/compiler-consumed set |
| `16-02` | `packages/flux-core/src/types/renderer-component.ts`, `packages/flux-action-core/src/action-dispatcher/action-runners.ts`  | `docs/architecture/action-scope-and-imports.md`                                                                                                                                                | repo-observable cross-check that normative shape matches exported interface/runtime targeting fields   |
| `16-03` | `packages/flux-core/src/types/renderer-core.ts`                                                                            | `docs/references/renderer-interfaces.md`                                                                                                                                                       | repo-observable cross-check that `RendererResolvedProps` baseline matches current exported type        |
| `18-01` | `packages/flow-designer-renderers/src/designer-manifest.ts`, `packages/flow-designer-renderers/src/designer-context.ts`    | `docs/architecture/capability-projection-manifest.md`, `docs/architecture/flow-designer/runtime-snapshot.md`, `docs/components/designer-page/design.md`                                        | focused proof that manifest-declared fields and live published host scope align                        |
| `18-02` | `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`, `packages/spreadsheet-renderers/src/host-action-provider.ts` | `docs/architecture/capability-projection-manifest.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/api.md`, `docs/components/spreadsheet-page/design.md` | focused proof that manifest methods and runtime `listMethods()` are equal                              |

## Goals

- 修复 `array-field` 参数化 item region 的 `$slot` 发布缺口，并补 focused regression coverage。
- 让 flow-designer / spreadsheet 的 manifest 与 live host publisher/provider 使用同一份真实契约面。
- 让 in-scope architecture/reference docs 与 live baseline 完整对齐，不再把旧接口或旧冻结集写成当前权威状态。
- 让 in-scope components/architecture/reference docs 与上述 final baseline 保持单一真源，不再留存“当前基线”与 live code 分叉的 owner-doc drift。

## Non-Goals

- 不处理 `18-03` 已裁定的 word-editor saved-document 语义取舍。
- 不处理 `20-01/02/03` retained accessibility defects；这些由独立 successor plan 承接。
- 不重开 `11-ui-components` 与 `17-naming` 已驳回/零发现项。
- 不顺带收口 `summary.md` 中其余 retained runtime、validation、performance、test-hardening defects。
- 不进行 generic manifest tooling 重写，除非它们是修复 in-scope defect 的最小必要条件。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-react/src/render-nodes.tsx`
- any focused tests needed for parameterized region `$slot` publication
- `packages/flow-designer-renderers/src/designer-manifest.ts`
- `packages/flow-designer-renderers/src/designer-context.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`
- `packages/spreadsheet-renderers/src/host-action-provider.ts`
- `packages/spreadsheet-renderers/src/page-renderer.tsx` if manifest/provider alignment requires owner wiring changes
- `docs/architecture/scoped-render-slots.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/array-field.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/capability-projection-manifest.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/report-designer/api.md`
- `docs/architecture/flow-designer/runtime-snapshot.md`
- `docs/architecture/flow-designer/config-schema.md` if retained flow host scope examples need sync after final baseline adjudication
- `docs/references/renderer-interfaces.md`
- `docs/components/designer-page/design.md`
- `docs/components/spreadsheet-page/design.md`
- related focused tests and `docs/logs/2026/05-18.md`

### Out Of Scope

- `summary.md` 中未列入本计划的其它 retained items
- `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts` 的 saved-document projection 语义调整
- repo-wide accessibility sweep
- generalized audit automation beyond the in-scope focused tests/guards needed to hold these fixes

## Execution Plan

### Phase 1 - Freeze Contract Decisions And Slot Baseline

Status: completed
Targets: `array-field.tsx`, `render-nodes.tsx`, `docs/architecture/{array-field.md,scoped-render-slots.md,renderer-runtime.md,field-metadata-slot-modeling.md}`, focused tests

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] 冻结 `array-field` 参数化 item region 的 supported contract：`params: ['index', 'value']` 必须在 live path 中稳定发布 `$slot.index` / `$slot.value`，不得继续依赖“显式 `scope` + 隐式 owner payload”这种未文档化双语义。
- [x] [Fix] 收敛 `array-field` item 渲染路径，使 parameterized region 在 owner 包装 scope 下仍获得稳定 `$slot` frame。
- [x] [Proof] 新增 focused regression tests，覆盖 `${$slot.index}` / `${$slot.value}` 在 `array-field` item region 内的 live authoring path。
- [x] [Fix] 同步真正拥有 slot 参数 contract 的 owner docs，仅保留最终 live slot contract：`docs/architecture/array-field.md`、`docs/architecture/scoped-render-slots.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/field-metadata-slot-modeling.md`。

Exit Criteria:

- [x] `12-01` retained defect 已修复，`array-field` item region 的 `$slot.index/$slot.value` live 可用
- [x] focused regression proof 已明确验证 `array-field` item region 内 `${$slot.index}` 与 `${$slot.value}` 的 supported path
- [x] 受影响 owner docs 已同步到 final live baseline，或明确写 `No owner-doc update required`
- [x] `docs/logs/2026/05-18.md` 已更新

### Phase 2 - Host Manifest And Runtime Publication Closure

Status: completed
Targets: flow/spreadsheet host manifest & publisher/provider files, `docs/architecture/capability-projection-manifest.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flow-designer/{design.md,api.md,runtime-snapshot.md,config-schema.md}`, `docs/architecture/report-designer/{design.md,api.md}`, `docs/components/{designer-page,spreadsheet-page}/design.md`, related tests

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] 冻结 flow-designer host projection 的真实 published surface，决定是补齐 `buildDesignerScopeData()` 还是收窄 manifest；无论选择哪条路径，manifest 与 live host scope 必须回到单一真源，并同步对应 owner docs。
- [x] [Fix] 修复 `18-01`：让 flow-designer manifest 与 runtime host scope 对齐，覆盖 `doc.*` 与 `runtime.*` 中当前漂移字段。
- [x] [Fix] 收敛 `18-01` 的 single-true-source 要求：`designer-manifest.ts` 与 runtime published flow host projection 不再维护两份可漂移字段清单，而是从同一份 contract source 或另一种已明确裁定的 non-drifting mechanism 派生。
- [x] [Decision] 冻结 spreadsheet host capability 的真实公开方法面。默认 closure 目标是让 manifest 补齐到当前 `host-action-provider.listMethods()` 已公开的 runtime surface；若需要收缩 runtime public methods，必须把它当成显式 supported-baseline 变更记录 caller impact、doc update 与验证要求，不能作为静默“对齐”处理。
- [x] [Fix] 修复 `18-02`：让 spreadsheet manifest 与 `host-action-provider` 的 `listMethods()` 完整对齐。
- [x] [Fix] 收敛 `18-02` 的 single-true-source 要求：`spreadsheet-manifest.ts` 与 `host-action-provider` 的 method publication 不再维护两份可漂移清单，而是从同一份 exported method contract source 派生。
- [x] [Proof] 新增 focused proof，至少覆盖：flow manifest 字段与 `buildDesignerScopeData()` 发布字段一致；spreadsheet manifest method set 与 `host-action-provider.listMethods()` 完全一致。

Exit Criteria:

- [x] `18-01` 与 `18-02` retained contract drift 已收敛
- [x] focused proof 已明确证明 flow host projection 与 spreadsheet capability manifest 分别和 live publisher/provider 对齐
- [x] flow manifest 与 runtime published host projection 已实现 shared-source ownership，或已落地另一种明确记录的 non-drifting mechanism
- [x] spreadsheet manifest 与 runtime provider 已实现 shared-source ownership，而不是继续人工同步两份 method list
- [x] 若 spreadsheet runtime public methods 出现移除或重命名，caller impact、最终 supported method set、以及受影响的 API-level owner docs 已明确记录并完成同步验证
- [x] `docs/architecture/capability-projection-manifest.md`、`docs/architecture/action-scope-and-imports.md`、`docs/architecture/flow-designer/{design.md,api.md}`、`docs/architecture/report-designer/{design.md,api.md}` 以及受影响的 `docs/components/designer-page/design.md`、`docs/components/spreadsheet-page/design.md` 已同步到 final live baseline，或明确写 `No owner-doc update required`
- [x] `docs/architecture/flow-designer/runtime-snapshot.md` 已与 final flow host published surface 对齐，并明确裁定 `docs/architecture/flow-designer/config-schema.md` 中 `${doc.nodes.length}` 相关示例是否需要同步
- [x] `docs/logs/2026/05-18.md` 已更新

### Phase 3 - Owner-Doc Baseline Closure

Status: completed
Targets: in-scope architecture/reference docs, focused tests

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] 收窄并修复 `16-01`：让 `field-binding-and-renderer-contract.md` 的 `Frozen Contract Matrix / Global META_FIELDS Frozen Set` 与 final live baseline 一致。
- [x] [Fix] 修复 `16-02`：让 `action-scope-and-imports.md` 的 `ComponentHandleRegistry` / `ComponentTarget` 规范形状回到 live exported/runtime contract。
- [x] [Fix] 修复 `16-03`：让 `renderer-interfaces.md` 的 `RendererResolvedProps` current typing baseline 回到当前导出类型。
- [x] [Proof] 新增 repo-observable proof，分别证明：`META_FIELDS` frozen text、`ComponentHandleRegistry` normative shape、`RendererResolvedProps` current typing baseline 都已与 live exports/runtime shape 对齐。

Exit Criteria:

- [x] `16-01`、`16-02`、`16-03` 均已收口
- [x] repo-observable proof 已覆盖 in-scope docs baseline，不依赖抽象“focused verification”表述
- [x] in-scope architecture/reference docs 已同步到 final live baseline
- [x] `docs/logs/2026/05-18.md` 已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] `12-01`、`16-01/02/03`、`18-01/02` 全部达到最终行为/契约结果
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Word Editor Saved-Document Projection Semantics

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `18-03` 已在本轮独立复核中裁定为当前已文档化语义取舍，而不是 manifest/runtime 漂移；它不属于本计划的 must-fix 集合。
- Successor Required: no

## Non-Blocking Follow-ups

- 如 Phase 2 证明 manifest/provider drift 适合后续抽成 shared host-contract generation guard，可在本计划关闭后单独立 successor plan，但不得阻塞本计划内 retained defects 的直接修复。

## Closure

Status Note: `12-01`、`16-01/02/03`、`18-01/02` 的 retained slot/manifest/doc drift 已全部落到 live code、focused proof 与 owner docs。`array-field` 的 parameterized slot 发布、flow/spreadsheet shared contract source、以及 in-scope architecture/reference baselines 都已与当前实现对齐，且 workspace verification 与独立 closure audit 都已通过。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit agent
- Evidence: initial audit `ses_1c55a694cffez9SDKin6SfqwYw` found Plan 361 closure-ready before the last cross-plan cleanup; final re-audit `ses_1c535e086ffevAPe86bOliyo0S` reported `Plan 361 verdict: Closure-ready` with `No findings.` after workspace verification (`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`) completed green.

Follow-up:

- None.
