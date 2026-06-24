# X1 doAction 命令族统一（component:\* handle 全量补齐）

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（X1 行）、`docs/components/existing-components-improvement-analysis.md` §2.7、`docs/architecture/capability-contract-model.md`、5 个前序 plan 的 `Deferred But Adjudicated` / `Non-Blocking Follow-ups`（E1a/E2e/E2f/X4/E2h）
> Mission: components-improvement
> Work Item: X1 doAction 命令族统一
> Related: `2026-06-21-0254-x3-naming-conventions-baseline-plan.md`（done，命名基线）、`2026-06-21-0255-x5-flux-decision-tables-plan.md`（done，决策表基线）、`2026-06-21-1345-1-x4-data-source-request-layer-enhancement-plan.md`（done，deferred naming audit 归本 plan）、`2026-06-21-1345-3-e2f-surface-family-unified-closure-plan.md`（done，surface open/close/toggle deferred 归本 plan）

## Purpose

把 Flux `component:<method>` 句柄族从「少数 owner-renderer 已注册 + 大量 input/surface 控件 design.md 仅写 future」收敛为「全量补齐 + design.md 决策表一致 + 命名统一」。

本 plan 收口 X1 工作项，并同时落地前序 E1a/E2e/E2f/X4/E2h plan 显式路由到 X1 作为 successor 的全部 deferred 项。

## Current Baseline

### 基础设施已就绪（不重建）

- `RendererCapabilityContract` / `CapabilityMethodContract` / `RendererDefinition.componentCapabilityContracts?: readonly RendererCapabilityContract[]` 定义于 `packages/flux-core/src/types/renderer-definition-types.ts:40-43, 121`；`CapabilityMethodContract` 复用自 `packages/flux-core/src/schema-diagnostics/manifest.ts:126-131`。
- `ComponentHandle` / `ComponentCapabilities` / `ComponentHandleRegistryCore` 定义于 `packages/flux-core/src/types/component-handle-core.ts:37-71`。
- React hook `useCurrentComponentRegistry()` 在 `packages/flux-react/src/context-hooks.ts:28`，由 `packages/flux-react/src/hooks.ts:189` 导出。
- Compiler 消费 `componentCapabilityContracts`：`packages/flux-compiler/src/schema-compiler/action-selector-validation.ts` —— `classifyActionSelector()`（L64-143）+ `resolveComponentContract()`（L30-51）+ `validateActionSelector()`（L145-245，target 静态可知时 validateFluxValueShape，否则发 `unvalidated-component-target` 警告）；target 收集于 `shape-validation-traversal.ts:21-55`（`collectComponentTargets`）。
- Runtime adapter 消费 `componentCapabilityContracts`：`packages/flux-runtime/src/action-adapter.ts:349-428` —— `invokeComponentAction()` resolve handle（L358）→ `hasMethod`/`listMethods` 检查（L372-383）→ `resolveComponentCapabilityContract()`（L55-61）→ payload validation `validateHostMethodPayload`（L385-396）→ invoke（L405）→ result validation `matchesFluxValueShape`（L410-421）。
- Action dispatch 解析 `component:` 前缀：`packages/flux-action-core/src/action-dispatcher/action-parsing.ts:1-9`（`isComponentAction` / `extractComponentMethod`）；runner `action-runners.ts:70-137`（`runComponentAction` 构建 target、evaluate payload、invoke adapter）。
- 共享 handle 注册实现：`packages/flux-runtime/src/component-handle-registry.ts`（register L302、unregister L320）。
- `ResolvedAuthoringContract.componentCapabilityContracts` 在 `packages/flux-core/src/types/renderer-authoring-contract.ts:23, 83` 已 resolve。

### 已注册 handle 的 renderer（7 个 owner-renderer）

| Renderer      | 注册位置                                                                                                                                                 | 已发布方法                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `form`        | `packages/flux-renderers-form/src/renderers/form.tsx:498`（`createFormComponentHandle` from `packages/flux-runtime/src/form-component-handle.ts:15-82`） | `submit`、`validate`、`reset`、`setValue`、`setValues`、`getValues` |
| `table`       | `packages/flux-renderers-data/src/table-renderer/use-table-handle.ts:99`                                                                                 | `refresh`、`getSelection`、`setSelection`                           |
| `crud`        | `packages/flux-renderers-data/src/crud-renderer-state.ts:257`                                                                                            | `refresh`、`getSelection`、`clearSelection`                         |
| `chart`       | `packages/flux-renderers-data/src/chart-renderer.tsx:214`                                                                                                | `resize`                                                            |
| `data-source` | `packages/flux-renderers-data/src/data-source-renderer.tsx:82`                                                                                           | `refresh`、`cancel`、`start`                                        |
| `tabs`        | `packages/flux-renderers-basic/src/tabs.tsx:154`                                                                                                         | `setValue`、`getValue`                                              |
| `code-editor` | `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-handle.ts:89`                                                                        | `clear`、`reset`、`focus`、`getEditorView`                          |

### 真正剩余 gap

1. **0 个 input 控件注册 handle**：`input-text`/`email`/`password`/`textarea`/`input-number`/`select`/`checkbox-group`/`radio-group`/`switch`/`input-tree`/`tree-select` 全部不调用 `componentRegistry.register(...)`。`clear`/`reset`/`focus` 在 input 控件上**完全未实现**（仅 `code-editor` 有）。
2. **dialog/drawer `component:open/close/toggle` 未注册**：design.md（dialog §8 L98-101 显式标 future；drawer §8 L87-89 用「推荐支持」措辞，同样表示尚未注册）二者均无对应 renderer definition `componentCapabilityContracts`；`docs/architecture/surface-owner.md:260` 显式警告勿当 live handle。当前打开/关闭走 runtime-owned `openDialog`/`openDrawer`/`closeSurface` action API（已稳定）。
3. **select `component:focus/open` 未注册**：E1a deferred（design.md §8 标「后续可考虑」）。
4. **button `component:focus` 未注册**：E2e deferred（Non-Blocking Follow-ups 路由到 X1）。
5. **data-source naming 并存**：`refreshSource`（action API）+ `component:refresh`（capability）共存；X4 plan L263 Follow-up 路由到 X1 做 naming audit。
6. **code-editor naming 残留**：E2h plan L234-239（`Deferred But Adjudicated`）+ L259（Follow-up 重申）注明 `clear`/`reset`/`focus` 在 X1 统一后可能 non-breaking rename（watch-only residual）。
7. **多组件 design.md 把 `component:*` 写成 future 但无统一词汇表**：input-text §L81、input-number §L109、input-date §L42、input-file §L41、switch §L42、editor §L51、dropdown-button §L37、picker §L39、pagination §L42、wizard §L118-119、collapse §L39、carousel §L37、cards §L45、alert §L44、service §L44、dynamic-renderer §L49、reaction §L42。

## Goals

- 为全部 P0/P1 input 控件（input-text/email/password/textarea/input-number/select/checkbox-group/radio-group/switch/input-tree/tree-select）注册 `component:<method>` handle，覆盖 `clear`/`reset`/`focus`（input-tree/tree-select 不含 `reset`，见 Phase 1 裁定）。
- 为 `dialog`/`drawer` 注册 `component:open`/`close`/`toggle` handle，与既有 `openDialog`/`openDrawer`/`closeSurface` action API 共存（关系在 Phase 1 裁定并写入 design.md）。
- 为 `select` 补 `focus`/`open` handle（收口 E1a deferred）。
- 为 `button` 补 `focus` handle（收口 E2e deferred）。
- 裁定 `data-source` `refreshSource` vs `component:refresh` naming audit，落地决策并同步文档（收口 X4 deferred）。
- 裁定 `code-editor` `clear`/`reset`/`focus` 是否需要 non-breaking rename，落地决策并同步文档（收口 E2h deferred）。
- 所有新增 handle 在对应 renderer definition 上发布 `componentCapabilityContracts`（含 `args`/`result` FluxValueShape），并被 compiler + runtime 自动 validate。
- 所有受影响 design.md（13+ 个）补/翻 Flux 决策表行，从「future」改为「实现」或显式「暂不实现」。
- 新增 playground 示例 + e2e 测试覆盖关键 handle 路径。

## Non-Goals

- **不重建 `componentCapabilityContracts` 基础设施**（已就绪，见 Current Baseline）。
- **不给 P2/P3 组件注册 handle**：pagination/wizard/collapse/carousel/cards/alert/service/dynamic-renderer/reaction/dropdown-button/picker 维持 design.md「future」状态，本 plan 不实现。若 Phase 1 裁定需要收口其中某些，移入 `Deferred But Adjudicated` 并写清 successor path。
- **不做 host/domain capability 统一**（`designer:*`/`spreadsheet:*` 等归 `capability-contract-model.md` 既有的 host manifest envelope，非本 plan）。
- **不做 WS/长连接 handle**（X4 已裁定 ws 低优先）。
- **不改变既有 `form`/`table`/`crud`/`chart`/`data-source`/`tabs`/`code-editor` 已注册方法的语义**（只可能做 non-breaking rename，且需 Phase 1 显式裁定）。
- **不替换 `openDialog`/`openDrawer`/`closeSurface` action API**（与新增 `component:open/close/toggle` 共存；二者关系由 Phase 1 裁定并写入 `docs/architecture/surface-owner.md`）。

## Scope

### In Scope

- 11 个 input 控件 handle 注册：`input-text`/`input-email`/`input-password`/`textarea`/`input-number`/`select`/`checkbox-group`/`radio-group`/`switch`/`input-tree`/`tree-select`。
- `dialog`/`drawer` `open`/`close`/`toggle` handle 注册。
- `button` `focus` handle 注册。
- `data-source` naming audit 裁定（可能：保留双入口/ deprecate action API entry / 文档分层）。
- `code-editor` naming audit 裁定（可能：保持现状 / non-breaking rename）。
- 对应 renderer definition 的 `componentCapabilityContracts` 发布。
- 对应 design.md 的 Flux 决策表行更新。
- 共享 handle 工厂（input 控件族）抽取到 `flux-runtime` 或 `flux-react`（避免每个 input renderer 重复实现 focus/clear/reset 逻辑）。
- 新增 playground 示例 + e2e 测试。
- `existing-components-improvement-roadmap.md` X1 状态翻 `done`。

### Out Of Scope

- P2/P3 组件 handle（pagination/wizard/collapse/carousel/cards/alert/service/dynamic-renderer/reaction/dropdown-button/picker）。
- host/domain capability manifest（`HostCapabilityProjectionManifest`）变更。
- `componentCapabilityContracts` IR 本身演进（如引入 generic 类型参数）。
- amis `rendererEvent` 兼容（归 X2）。
- mobile 响应式 handle 行为（归 `mobile-roadmap.md`）。

## Failure Paths

| 场景编号               | 触发                                                                                                            | 行为                                                                                                                 | 可重试 | 用户可见表现                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------- |
| `x1-focus-not-mounted` | `component:focus` 调用但目标 input 已卸载                                                                       | 返回 `{ok:false, code:'not-mounted'}`；不抛异常                                                                      | 否     | focus 无效果；dev console 警告  |
| `x1-clear-disabled`    | `component:clear` 调用但字段 `disabled` 或 `readOnly`                                                           | no-op；返回 `{ok:true, skipped:true}`                                                                                | 否     | 值不变                          |
| `x1-reset-no-initial`  | `component:reset` 调用但字段无 initial value                                                                    | 清空到 `defaultValue` 或空字符串；返回 `{ok:true, fellBackToDefault:true}`                                           | 否     | 字段变空或默认值                |
| `x1-open-no-target`    | `component:open` 调用但目标（componentId/componentName/surfaceId，最终寻址模型由 Phase 1 裁定）未注册或无法解析 | 返回 `{ok:false, code:'no-target'}`                                                                                  | 否     | dialog 不弹出；dev console 错误 |
| `x1-close-not-open`    | `component:close` 调用 dialog 但当前未打开                                                                      | no-op；返回 `{ok:true, skipped:true}`                                                                                | 否     | 无变化                          |
| `x1-payload-mismatch`  | `component:setSelection` payload 不匹配 published FluxValueShape                                                | runtime adapter reject；返回 `{ok:false, code:'payload-validation-failed'}`（既有 `action-adapter.ts:385-396` 行为） | 否     | dev console 错误 + 诊断         |
| `x1-focus-hidden`      | `component:focus` 调用但字段 `when:false`（不可见）                                                             | 返回 `{ok:false, code:'not-visible'}`；不强制滚动                                                                    | 否     | focus 无效果                    |

## Test Strategy

档位选择：**必须自动化**

理由：本 plan 改变公开 `component:<method>` 契约面（新增 30+ 个 handle 方法跨 14 个 renderer），属于公共 API 契约扩展。按 plan guide Rule 12 + AGENTS.md「Test Strategy Tiers」，对外 API 契约必须自动化。Proof（RED test）必须先于 Fix（GREEN impl）。

## Execution Plan

### Phase 1 - 词汇表裁定与 naming audit

Status: completed
Targets: `docs/references/component-handle-vocabulary.md`（新建）、`docs/components/data-source/design.md`、`docs/components/code-editor/design.md`、`docs/components/dialog/design.md`、`docs/components/drawer/design.md`、`docs/architecture/surface-owner.md`、`docs/architecture/capability-contract-model.md`

- Item Types: `Decision`、`Follow-up`

- [x] **Decision**：定义 Flux component handle 统一词汇表，写入新建 `docs/references/component-handle-vocabulary.md`。至少裁定以下术语语义：
  - `clear` = 清空字段值到 empty（`''`/`null`/`[]` 视字段类型）
  - `reset` = 还原到 initial value（form init 时的值或 `defaultValue`）；无 initial 时 fallback 到 `clear` 行为
  - `focus` = DOM focus + accessibility announcement（无值语义）
  - `open`/`close`/`toggle` = surface 状态翻转（dialog/drawer/dropdown）；与既有 `openDialog`/`closeSurface` action API 的关系（并存/分层）
  - boolean/choice 字段（`checkbox-group`/`radio-group`/`switch`）不暴露 `clear`/`reset`（语义不清），只暴露 `focus`（裁定结果写入文档；若裁定为应暴露则后续 Phase 2 实施）
  - tree 字段（`input-tree`/`tree-select`）是否暴露 `reset`（initial value 可能是复杂 tree state，裁定）
- [x] **Decision**：data-source naming audit —— `refreshSource`（action API）vs `component:refresh`（capability）裁定。三选一：(a) 保留双入口 + 文档分层说明（action API = 跨 target，capability = 同 component）；(b) deprecate action API entry；(c) deprecate capability。裁定写入 `docs/components/data-source/design.md` 和 `docs/architecture/api-data-source.md`。收口 X4 plan L263 Follow-up。
- [x] **Decision**：code-editor naming audit —— `clear`/`reset`/`focus` 是否需要 non-breaking rename。默认保持现状（已是 Flux 标准 vocabulary），除非 Phase 1 发现与词汇表裁定不一致。裁定写入 `docs/components/code-editor/design.md` §决策表，收口 E2h plan L131/L254 watch-only residual。
- [x] **Decision**：surface family `component:open/close/toggle` vs runtime-owned `openDialog`/`openDrawer`/`closeSurface` 关系裁定。写入 `docs/architecture/surface-owner.md` + `docs/components/dialog/design.md` §8 + `docs/components/drawer/design.md` §8。收口 E2f plan L233-238 deferred。
- [x] **Follow-up**：把裁定结果同步到 `docs/references/naming-conventions.md`（如需要新增「component handle 命名」章节）。

Exit Criteria:

- [x] `docs/references/component-handle-vocabulary.md` 文件存在，含全部 6 条 Decision 的裁定结果。
- [x] data-source/design.md、code-editor/design.md、dialog/design.md、drawer/design.md、surface-owner.md 文本已反映 Phase 1 裁定。
- [x] capability-contract-model.md 如有 vocabulary 引用，已对齐。

### Phase 2 - Input 控件 handle 全量补齐（含 select focus/open + button focus）

Status: completed
Targets: `packages/flux-runtime/src/`（共享 input handle 工厂）、`packages/flux-renderers-form/src/renderers/input.tsx`、`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`、`packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx`、`packages/flux-renderers-form/src/renderers/radio-group-renderer.tsx`、`packages/flux-renderers-form/src/renderers/switch-renderer.tsx`、`packages/flux-renderers-form-advanced/src/renderers/input-tree*.tsx`、`packages/flux-renderers-form-advanced/src/renderers/tree-select*.tsx`、`packages/flux-renderers-basic/src/button.tsx`、对应 `*-definition.ts` 发布 contracts、对应 `docs/components/*/design.md`

- Item Types: `Proof`（RED）、`Fix`（GREEN）、`Follow-up`

- [x] **Proof**：先写 RED 测试，覆盖以下 handle 路径（每条至少 1 个 focused test）。测试目录：`packages/flux-renderers-form/src/__tests__/component-handles-input.test.tsx`、`packages/flux-renderers-form-advanced/src/__tests__/component-handles-tree.test.tsx`、`packages/flux-renderers-basic/src/__tests__/component-handles-button.test.tsx`、`packages/flux-runtime/src/__tests__/input-component-handle.test.ts`（4 个 failure paths 的 focused unit test）。
  - `component:clear` on input-text/email/password/textarea/input-number（值清空）
  - `component:reset` on input-text/email/password/textarea/input-number（还原 initial）
  - `component:focus` on input-text/email/password/textarea/input-number/select/checkbox-group/radio-group/switch（DOM focus）
  - `component:clear` on input-tree/tree-select（选中态清空）
  - `component:focus` on input-tree/tree-select
  - `component:open` on select（下拉打开）
  - `component:focus` on button
  - Failure paths：`x1-focus-not-mounted`、`x1-clear-disabled`、`x1-reset-no-initial`、`x1-focus-hidden`
- [x] **Fix**：在 `packages/flux-runtime/src/` 新建共享 input handle 工厂（参考 `form-component-handle.ts:15-82` 的工厂模式），导出 `createInputComponentHandle({ getRootElement, getFieldName, getFormFieldController, getInitialValue })` 之类的高阶 API，避免每个 input renderer 重复实现。（落地：`packages/flux-runtime/src/input-component-handle.ts`）
- [x] **Fix**：把 `input-text`/`email`/`password` renderer（`packages/flux-renderers-form/src/renderers/input.tsx`，共享 `createInputRenderer` 工厂）接入共享 handle 工厂，注册 `clear`/`reset`/`focus`。
- [x] **Fix**：把 `textarea`、`input-number` 接入共享 handle 工厂（textarea 共用 input renderer，input-number 单独 renderer）。
- [x] **Fix**：把 `select` 接入，注册 `focus`（DOM focus trigger element）+ `open`（open dropdown menu，复用 shadcn Combobox/Popover open state）。
- [x] **Fix**：把 `checkbox-group`/`radio-group`/`switch` 接入，注册 `focus`（focus 第一个 option 或 switch trigger）。
- [x] **Fix**：把 `input-tree`/`tree-select` 接入，注册 `clear`（清空 selection）+ `focus`（focus tree container）。
- [x] **Fix**：把 `button` 接入，注册 `focus`（focus button DOM）。
- [x] **Fix**：在每个 renderer 的 `*-definition.ts` 发布 `componentCapabilityContracts`，含每个方法的 `args`/`result` FluxValueShape（参照 `code-editor-renderer/use-code-editor-handle.ts` 既有 contracts 范本）。
- [x] **Proof**：Phase 2 RED 测试转 GREEN；payload validation 已由 `packages/flux-runtime/src/__tests__/action-adapter.capabilities.test.ts` 覆盖（compiler + runtime 双路径）。
- [x] **Follow-up**：更新 11 个 input 控件 design.md（`input-text`、`input-email`、`input-password`、`textarea`、`input-number`、`select`、`checkbox-group`、`radio-group`、`switch`、`input-tree`、`tree-select`）+ `button/design.md`：Flux 决策表行从「future」翻「实现」；标注与 `form.reset` 的语义区别（form-level reset vs field-level reset）。

Exit Criteria:

- [x] 11 个 input 控件 + button 在 runtime 注册 handle，且 renderer definition 发布 `componentCapabilityContracts`。
- [x] 共享 input handle 工厂存在于 `flux-runtime`，被所有 input renderer 复用（无复制粘贴）。
- [x] Focused test 文件存在并通过（RED → GREEN 全部翻转）。
- [x] 4 个 Failure paths（`x1-focus-not-mounted` / `x1-clear-disabled` / `x1-reset-no-initial` / `x1-focus-hidden`）有 focused test 覆盖（`packages/flux-runtime/src/__tests__/input-component-handle.test.ts`）。
- [x] 12 个 design.md 文件 Flux 决策表已更新。
- [x] 局部 typecheck 通过：`pnpm --filter @nop-chaos/flux-renderers-form typecheck && pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck && pnpm --filter @nop-chaos/flux-renderers-basic typecheck && pnpm --filter @nop-chaos/flux-runtime typecheck`。

### Phase 3 - Surface family handle 补齐（dialog/drawer open/close/toggle）

Status: completed
Targets: `packages/flux-renderers-basic/src/dialog.tsx`、`packages/flux-renderers-basic/src/drawer.tsx`、`packages/flux-runtime/src/surface-runtime.ts`（或对应 surface state registry）、对应 `*-definition.ts`、`docs/components/dialog/design.md`、`docs/components/drawer/design.md`、`docs/architecture/surface-owner.md`

- Item Types: `Proof`（RED）、`Fix`（GREEN）、`Follow-up`

- [x] **Proof**：先写 RED 测试 `packages/flux-renderers-basic/src/__tests__/component-handles-surface.test.tsx`：
  - `component:open` on dialog（按 componentId/componentName 定位 → surface state open）
  - `component:close` on dialog（已打开 → closed）
  - `component:toggle` on dialog（closed ⇄ open）
  - 同上 3 条 on drawer
  - Failure paths：`x1-open-no-target`、`x1-close-not-open`
  - 与既有 `openDialog`/`closeSurface` action API 共存验证（dialog/drawer design.md §Surface Handle Coexistence 文档化；contract assertion 测试覆盖 dialog/drawer 都发布 `open`/`close`/`toggle` contracts）
- [x] **Fix**：在 dialog/drawer renderer 接入 ComponentHandleRegistry 注册。集成路径走 `SurfaceRuntime`（dialog/drawer 已通过 surface-runtime 注册 surface entry，本 phase 把 component handle 桥接到同一 surface state，避免双状态源）。落地：`packages/flux-runtime/src/surface-component-handle.ts` + `packages/flux-react/src/hooks/use-surface-component-handle.ts` + `packages/flux-renderers-basic/src/use-surface-renderer.ts`。
- [x] **Fix**：在 dialog/drawer `*-definition.ts` 发布 `componentCapabilityContracts` for `open`/`close`/`toggle`（`packages/flux-renderers-basic/src/surface-renderer-definitions.ts` 的 `surfaceHandleCapabilityContracts`）。
- [x] **Proof**：Phase 3 RED 测试转 GREEN（`packages/flux-renderers-basic/src/__tests__/component-handles-surface.test.tsx`，9 tests pass）。
- [x] **Follow-up**：dialog/drawer design.md §8 已从「future」翻「实现」；`docs/architecture/surface-owner.md` 第 260 行附近的警告已改为「已支持 component handle，与 action API 共存关系见 §Surface Handle Coexistence」（Phase 1 已落地）。

Exit Criteria:

- [x] dialog/drawer 注册 `open`/`close`/`toggle` handle，通过 `componentCapabilityContracts` 发布。
- [x] Focused test 文件存在并通过（含与既有 action API 共存的 state-consistency 验证）。
- [x] 2 个 Failure paths（`x1-open-no-target`、`x1-close-not-open`）有 focused test 覆盖。
- [x] dialog/drawer design.md + surface-owner.md 同步到「实现」基线。
- [x] E2f plan L233-238 Deferred But Adjudicated 在 source plan 注记「已由 X1 plan 收口」。
- [x] 局部 typecheck 通过：`pnpm --filter @nop-chaos/flux-renderers-basic typecheck`。

### Phase 4 - data-source / code-editor naming alignment + owner-doc 全量同步

Status: completed
Targets: `docs/components/data-source/design.md`、`docs/components/code-editor/design.md`、`docs/components/_shared/*`（如需）、`apps/playground/src/`、`tests/e2e/`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`

- Item Types: `Fix`、`Follow-up`

- [x] **Fix**：按 Phase 1 裁定（option (a) 保留双入口 + 文档分层），data-source naming 变更落地为文档同步：`docs/components/data-source/design.md` §refresh 双入口表 + `docs/architecture/api-data-source.md` L669-672 双入口说明已含裁定。无 code change（裁定 (a) 不 deprecate）。
- [x] **Fix**：按 Phase 1 裁定（保持现状 = no code change），code-editor naming 仅 doc 同步：`docs/components/code-editor/design.md` §决策表 L38 已含 X1 naming audit note。收口 E2h watch-only residual。
- [x] **Follow-up**：新建 playground 示例页面 `apps/playground/src/pages/component-handles-demo.tsx`，演示 14 个 renderer 的 handle 调用（input 族 `clear`/`reset`/`focus`、select `open`、switch/radio-group/checkbox-group `focus`、tree `clear`、form `submit`/`reset`、dialog/drawer `open`/`toggle`/`close`、button `focus`），注册到 playground 路由 `#/component-handles`。
- [x] **Follow-up**：新建 e2e 测试 `tests/e2e/component-handles.spec.ts`（6 个 test：input clear/reset/focus、button focus、dialog open+toggle、drawer open+close），并在 `tests/e2e/playground-entry-pages.spec.ts` 补 component-handles route assertion 以满足 route coverage matrix。
- [x] **Follow-up**：更新 `docs/components/existing-components-improvement-roadmap.md`：X1 状态 `planned` → `done`；工作项表 X1 行加 ✅。
- [x] **Follow-up**：`docs/components/amis-baseline-matrix.md` 无变化（X1 是 capability enhancement，dialog/drawer/button 仍 `landed`，retained 决策不变 —— "No update required"，与 E2a/E2b/.../E2h 裁定一致）。
- [x] **Follow-up**：在 E1a plan L51/L223/L247、E2e plan L203、E2f plan L46/L71/L238/L271、X4 plan L263、E2h plan L234-239/L259 注记「已由 X1 plan 收口」并引用本 plan 路径。
- [x] **Follow-up**：更新 `docs/logs/2026/06-22.md`，记录 X1 closure。

Exit Criteria:

- [x] data-source / code-editor naming 裁定已落地（code 或 doc）。
- [x] playground 示例页面存在并注册路由；e2e 测试文件存在并通过 route coverage matrix。
- [x] roadmap X1 状态翻 `done`；amis-baseline-matrix 同步（如需要 —— 本 plan 无变化）。
- [x] 5 个 source plan 的 deferred/follow-up 项已注记收口。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh-session sub-agent（`ses_1158cba71ffeFxIlHSg9Y6sJ0b`，独立 general agent，不复用起草者上下文）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major/Blocker: 无（零 Blocker、零 Major）
  - Minor M1（已处理）：`Current Baseline` gap #6 与 Phase 4 Follow-up 的 E2h 行号 `L131/L254` 修正为 `L234-239, L259`（L131 实际是 Phase 3 header，L254 在 Closure Audit Evidence 内；真实 `Deferred But Adjudicated` 在 L234-239 + Follow-up 在 L259）。
  - Minor M2（已处理）：Source 头 `6 个前序 plan` 修正为 `5 个前序 plan`（parenthetical 只列 5 个：E1a/E2e/E2f/X4/E2h）。
  - Minor M3（已处理）：`Current Baseline` gap #2 drawer design.md 措辞从「标 future」改为「用『推荐支持』措辞，同样表示尚未注册」（dialog §8 L98 显式 future；drawer §8 L87 用「推荐支持」措辞）。
  - Minor M4（已处理）：Failure Path `x1-open-no-target` trigger 从「surfaceId 未注册」（presuppose Phase 1 决策）改为「目标（componentId/componentName/surfaceId，最终寻址模型由 Phase 1 裁定）未注册或无法解析」。
  - Minor M5（已知，不改）：Phase 1 → Phase 2 条件依赖（boolean/choice 字段是否暴露 clear/reset）已在 Phase 1 Decision item 显式 flag，Phase 2 Proof 按 default 写；若 Phase 1 翻转则 Phase 2 scope 扩展。Reviewer 确认 acceptable。
- 审查范围：21/22 cited file:line 经 live repo 核对准确；1 处 drift（E2h L131）已修正。Rule 22/23/24/25/26 consolidation 评估为 appropriate（5 个前序 plan 的 deferred 项共享同一 `componentCapabilityContracts` infra + 同一 vocabulary + 同一 closure criteria，合并避免 one-finding micro-plan 碎片化）。Rule 12 Proof-before-Fix 满足（Phase 2/3 RED 在 Fix 之前）。Rule 18 全量验证归 Closure Gates 满足。

## Closure Gates

- [x] Phase 1-4 所有 Exit Criteria 全勾。
- [x] 全部 14 个 renderer（11 input + dialog + drawer + button）注册对应 handle 且发布 `componentCapabilityContracts`。
- [x] 共享 input handle 工厂已抽出（无复制粘贴）。
- [x] 不存在 in-scope 已确认 live defect 或 contract drift 被静默降级到 deferred（E1a/E2e/E2f/X4/E2h deferred 项已显式收口）。
- [x] 受影响 owner docs（`docs/references/component-handle-vocabulary.md` + 13+ design.md + `docs/architecture/surface-owner.md` + `docs/architecture/capability-contract-model.md` + roadmap + amis-baseline-matrix）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### P2/P3 组件 handle（pagination/wizard/collapse/carousel/cards/alert/service/dynamic-renderer/reaction/dropdown-button/picker）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 这些组件在 roadmap 标 P2/P3，且其 design.md 已显式标「future」，不属于 X1 roadmap 工作项的「全部输入控件」范围。Phase 1 词汇表裁定后，它们可在未来按同一 vocabulary 单独立项。
- Successor Required: yes
- Successor Path: E3 P2 体验完善批启动时的新 plan（或独立 follow-up plan）。
- Successor 收口注记（2026-06-22）：既有 runtime 实现的复合字段编辑器子集（`array-editor`/`key-value` 的 `component:addItem`/`removeItem`/`moveItem`）已由 `docs/plans/2026-06-22-1137-1-x1-successor-composite-editor-handles-plan.md`（completed）收口。`dynamic-renderer` 的 `component:refresh` 已由 E3 dynamic-renderer autoload-gate plan 落地。其余不存在 runtime 实现的组件（pagination/wizard/collapse/carousel/cards/alert/service/dropdown-button/picker）仍归 main roadmap 各自落地 plan；`reaction` 无 handle 语义（successor no）。
- 收口注记（2026-06-24）：`carousel` 的 `component:next`/`prev`/`setValue` 句柄已由 `docs/plans/2026-06-24-0718-2-w4a-multimedia-family-plan.md`（W4a）落地收口——carousel renderer 复用 ui Carousel(embla) 并注册三句柄。剩余 pagination/wizard/collapse/cards/alert/service/dropdown-button/picker 仍归各自 main roadmap 落地 plan。

## Non-Blocking Follow-ups

- 共享 input handle 工厂如发现可推广到 `form`/`table`/`crud` 既有 handle（重构去重），归后续 refactor plan。
- `componentCapabilityContracts` 的 `args`/`result` FluxValueShape 在 Phase 2/3 手写；如后续需要从 zod schema 自动推导，按 `capability-contract-model.md` "Zod And Runtime Validation Libraries" 章节既定方向（adapter only）。
- playground demo 页面若需要更复杂的 handle 编排演示（如 chained `component:focus` → `component:open`），归 playground 体验迭代。

## Closure

Status Note: 全 4 Phase 执行完成，Plan Status → `completed`（按 mission-driver 指令）。Phase 1（vocabulary 裁定）已于 2026-06-21 完成；Phase 2/3/4 于 2026-06-22 完成。14 个 renderer 全部注册对应 handle 且发布 `componentCapabilityContracts`：11 个 input 控件（input-text/email/password/textarea/input-number/select/checkbox-group/radio-group/switch/input-tree/tree-select）+ button + dialog + drawer。共享 input handle 工厂 `createInputComponentHandle` + 共享 surface handle 工厂 `createSurfaceComponentHandle` 已抽出（无复制粘贴）。4 个 failure paths（`x1-focus-not-mounted`/`x1-clear-disabled`/`x1-reset-no-initial`/`x1-focus-hidden`）+ 2 个 surface failure paths（`x1-open-no-target`/`x1-close-not-open`）均有 focused test 覆盖。5 个前序 plan（E1a/E2e/E2f/X4/E2h）deferred 项已注记收口。技术验证：`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26（1 pre-existing warning）、`pnpm test` = 49/49 tasks 全过。e2e 测试 `tests/e2e/component-handles.spec.ts` 已创建但未在本 session 运行（mission-driver 未要求 full-green e2e；route coverage matrix test `playground-entry-pages.spec.ts` 已含 component-handles assertion）。

Closure Gates 状态：技术验证项（typecheck/build/lint/test/design sync/roadmap/no-silent-defect/source-plan annotation）+ 独立 closure-audit 全 `[x]`。本 plan 横跨 flux-runtime/flux-react/flux-renderers-form/flux-renderers-form-advanced/flux-renderers-basic/playground 6 个 package + 改变 14 个 renderer 的 public capability contract 面，属于架构级变更；closure-audit 已由 fresh-session 子 agent 完成（见 Closure Audit Evidence）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent（独立 closure auditor，不复用执行 session 上下文；本 session 即为该独立审计 session）
- Evidence:
  - **Phase 1-4 Exit Criteria 全勾**：本 plan 文件内 Phase 1/2/3/4 Exit Criteria 全部 `[x]`（live 核对：`docs/references/component-handle-vocabulary.md` 存在；5 个 source plan 含「已由 X1」注记：`grep -l "已由 X1" docs/plans/*.md` 命中 E1a/E2e/E2f/X4/E2h）。
  - **14 renderer handle + contracts 落地**：`packages/flux-renderers-form/src/renderers/input.tsx` 发布 `SCALAR_INPUT_CAPABILITY_CONTRACTS` / `SELECT_CAPABILITY_CONTRACTS` / `FOCUS_ONLY_CAPABILITY_CONTRACTS`；`textarea-renderer.tsx`、`input-number-renderer.tsx`、`input-choice-renderers.tsx`（checkbox-group/radio-group/switch）、`packages/flux-renderers-form-advanced/src/tree-controls.tsx`（input-tree/tree-select）、`packages/flux-renderers-basic/src/button.tsx`、`packages/flux-renderers-basic/src/surface-renderer-definitions.ts`（dialog/drawer `surfaceHandleCapabilityContracts`）均发布 contracts；renderer 通过 `useInputComponentHandle` / `useSurfaceComponentHandle` hook 注册 handle。
  - **共享工厂存在**：`packages/flux-runtime/src/input-component-handle.ts:30` 导出 `createInputComponentHandle`；`packages/flux-runtime/src/surface-component-handle.ts:22` 导出 `createSurfaceComponentHandle`；二者均从 `packages/flux-runtime/src/index.ts` 重新导出并被 `packages/flux-react/src/hooks/use-input-component-handle.ts` / `use-surface-component-handle.ts` 消费（无复制粘贴）。
  - **Anti-hollow**：handle 真正接入 runtime —— `useInputComponentHandle` 调用 `useCurrentComponentRegistry().register(...)`，组件卸载时 unregister；surface handle 通过 `SurfaceRuntime` 桥接同一 surface state。
  - **Failure paths 有 focused test**：`packages/flux-runtime/src/__tests__/input-component-handle.test.ts`（11 tests，覆盖 `x1-focus-not-mounted`/`x1-clear-disabled`/`x1-reset-no-initial`/`x1-focus-hidden`）；`packages/flux-renderers-basic/src/__tests__/component-handles-surface.test.tsx`（9 tests，覆盖 `x1-open-no-target`/`x1-close-not-open`）。
  - **全量验证通过**：`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26（1 pre-existing warning `flux-renderers-form/src/renderers/select.tsx:219 react-hooks/incompatible-library`，与 X1 无关）、`pnpm test` = 49/49 tasks 全过。
  - **Owner docs 同步**：14 个 design.md（input-text/email/password/textarea/input-number/select/checkbox-group/radio-group/switch/input-tree/tree-select/button/dialog/drawer）已翻「X1 起落地」；`docs/architecture/surface-owner.md` 含 `§Surface Handle Coexistence`；`docs/components/existing-components-improvement-roadmap.md:55,119` X1 行 `done` + ✅；`docs/logs/2026/06-22.md` 记录 X1 closure。
  - **Deferred honesty**：`§Deferred But Adjudicated` 仅含 P2/P3 组件（pagination/wizard/collapse/carousel/cards/alert/service/dynamic-renderer/reaction/dropdown-button/picker），分类 `out-of-scope improvement`，successor path 显式（E3 P2 批），无 in-scope live defect 被静默降级。

Follow-up:

- 已记录的 Non-Blocking Follow-ups（共享 input handle 工厂推广、`componentCapabilityContracts` zod 自动推导、playground 复杂 handle 编排演示）见 plan §Non-Blocking Follow-ups。
- P2/P3 组件 handle（pagination/wizard/collapse/carousel/cards/alert/service/dynamic-renderer/reaction/dropdown-button/picker）归 E3 P2 批 successor plan（见 §Deferred But Adjudicated）。
