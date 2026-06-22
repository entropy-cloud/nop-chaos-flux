# X1-successor 复合字段编辑器 component handle（array-editor + key-value）

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Mission: components-improvement
> Work Item: X1 deferred successor（P2/P3 组件 handle —— 仅既有复合字段编辑器子集）+ E3 form-input plan `component:moveItem` 显式 follow-up
> Source: `docs/components/array-editor/design.md` §8、`docs/components/key-value/design.md` §8、`docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md` `Deferred But Adjudicated`、`docs/plans/2026-06-22-0330-2-e3-form-input-number-array-keyvalue-plan.md`（E3 已落地 addItem/removeItem/moveItem 行为，handle 注册为显式 follow-up）、`docs/references/component-handle-vocabulary.md`
> Related: `docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md`（X1 主 plan，落地 14 renderer handle）、`docs/plans/2026-06-22-0330-2-e3-form-input-number-array-keyvalue-plan.md`（E3 form-input 主 plan，落地 array-editor/key-value min/max+reorder 行为）

## Purpose

把 X1 plan 显式 deferred 的「P2/P3 组件 handle」successor 中**既有 runtime 实现**的复合字段编辑器子集收口：为 `array-editor` 与 `key-value` 注册 `component:addItem`/`removeItem`/`moveItem` capability handle + 发布 `componentCapabilityContracts`。

X1 主 plan 的 deferred 项原列 11 个组件（pagination/wizard/collapse/carousel/cards/alert/service/dynamic-renderer/reaction/dropdown-button/picker），其中**只有 `dynamic-renderer` 已有 runtime 实现**（且其 `component:refresh` 已由 E3 dynamic-renderer autoload-gate plan 落地）；其余 10 个要么是 main roadmap 未落地的目标组件（pagination/wizard/collapse/carousel/cards/alert/service/dropdown-button/picker），要么是无值/无语义需要 handle 的渲染原语（`reaction` 返回 null、无字段值，handle 无可 invoke 的能力）。本 plan **不**为这些不存在的组件预先设计 handle —— 那是 main roadmap 的职责，等组件落地后由其各自的落地 plan 顺带注册 handle。

E3 form-input plan (`2026-06-22-0330-2-...`) 已为 `array-editor`/`key-value` 落地 `addItem`（append 按钮）/`removeItem`（remove 按钮）/`moveItem`（上下移动按钮 + `moveValue`）的**行为**；该 plan design.md §8 决策表显式标注「对外 `component:moveItem` 句柄注册可作 follow-up」。本 plan 即该 follow-up。

## Current Baseline

- **X1 plan deferred 现状**：`docs/plans/2026-06-21-2146-1-x1-...-plan.md:258-263` `Deferred But Adjudicated` 节列「P2/P3 组件 handle」= `out-of-scope improvement`、`Successor Required: yes`、`Successor Path: E3 P2 体验完善批启动时的新 plan（或独立 follow-up plan）`。本 plan 即该 successor 的**既有 runtime 子集**。
- **E3 form-input plan 现状**：`docs/plans/2026-06-22-0330-2-e3-form-input-...-plan.md` 已为 `array-editor`/`key-value` 落地：
  - schema：`ArrayEditorSchema`（`packages/flux-renderers-form/src/schemas.ts:233-237`，`minItems?:235`/`maxItems?:236`）/`KeyValueSchema`（`packages/flux-renderers-form/src/schemas.ts:220-225`，`minItems?:223`/`maxItems?:224`）新增 `minItems?`/`maxItems?`。
  - behavior：append 按钮（`packages/flux-renderers-form-advanced/src/array-editor.tsx:461-491`）、remove 按钮、move up/down 按钮（`handleMoveUp`/`handleMoveDown` 调 `currentForm.moveValue(name, from, to)`，见 `array-editor.tsx` 内 `handleMoveUp`/`handleMoveDown` 实现）。`key-value.tsx` 对称实现。
  - design.md：`array-editor/design.md:20` 与 `key-value/design.md:20` 决策表均含「`component:moveItem` 句柄 — 实现（E3）— 从 §8 future 翻转为实现：...对外句柄可演进为 `component:moveItem`（与已落地的 `addItem/removeItem` 同族）；本 plan 落地的是 reorder 行为本身（按钮 + moveValue），句柄注册可作 follow-up」。§8（`array-editor/design.md:59-62` / `key-value/design.md:59-62`）注明「适合长期暴露 `component:addItem`、`component:removeItem`、`component:moveItem`」。
- **array-editor/key-value renderer definition 现状**：`packages/flux-renderers-form-advanced/src/array-editor.tsx:496-539`（`arrayEditorRendererDefinition`）与 `key-value.tsx:546-603`（`keyValueRendererDefinition`）**均无 `componentCapabilityContracts` 字段**（grep `componentCapabilityContracts` 在 `flux-renderers-form-advanced/src/*.tsx` 0 命中除 tree-controls.tsx）。
- **handle 基础设施现状**：
  - 输入族共享工厂：`packages/flux-runtime/src/input-component-handle.ts:30` `createInputComponentHandle`（仅支持 `clear`/`reset`/`focus`/`open`）；不适用 composite editor（语义不同）。
  - 表面族共享工厂：`packages/flux-runtime/src/surface-component-handle.ts:22` `createSurfaceComponentHandle`（仅 `open`/`close`/`toggle`）；不适用。
  - 内联 handle 范本：`packages/flux-renderers-data/src/data-source-renderer.tsx:44-82`（`refresh`/`cancel`/`start`）、`packages/flux-renderers-data/src/chart-renderer.tsx:202-225`（`resize`）—— 均为内联 `ComponentHandle` 对象，不走共享工厂。
- **form runtime API 现状**：`packages/flux-runtime/src/form-runtime.ts:577-595` 已有 `appendValue(path, value)`/`insertValue(path, index, value)`/`removeValue(path, index)`/`moveValue(path, from, to)`，由 `form-runtime-array-ops.ts` 的 `appendValueOp`/`insertValueOp`/`removeValueOp`/`moveValueOp` 实现。注意：`appendValue()` 返回 void，`addItem` handle 返回的 `index` 须由 renderer 基于 `items.length` 派生（非 runtime 返回）。
- **vocabulary 现状**：`docs/references/component-handle-vocabulary.md:74-86` 字段类型裁定表含 `form/table/crud/chart/data-source/tabs`（既有，不扩展）；composite editor 未单列。
- **roadmap 现状**：`docs/components/existing-components-improvement-roadmap.md` Phase Status（L36-58）：X1 `done`、E3 `planned`（form-input 子项 ✅ done）。本 plan 收口 X1 deferred successor 子集 + E3 form-input follow-up，**不**新增 E3 工作项。
- **既有 handle 注册 hook**：`packages/flux-react/src/hooks/use-input-component-handle.ts:29` `useInputComponentHandle`（input 族专用）；`packages/flux-react/src/hooks/use-surface-component-handle.ts` `useSurfaceComponentHandle`（surface 族专用）。无 composite-editor 等价 hook。

## Goals

- **array-editor/key-value capability contracts**：在 `arrayEditorRendererDefinition`/`keyValueRendererDefinition` 发布 `componentCapabilityContracts`（3 个 handle：`addItem`/`removeItem`/`moveItem`），含 displayName/description/args FluxValueShape/result FluxValueShape。
- **共享 composite handle 工厂**：在 `flux-runtime` 新增 `createCompositeFieldHandle` 工厂（参数化 `type`/`addItem`/`removeItem`/`moveItem` callbacks），`array-editor` 与 `key-value` 共用；从 `flux-runtime/src/index.ts` 重新导出。新增 `useCompositeFieldHandle` hook（`flux-react/src/hooks/`）。
- **runtime 注册**：`ArrayEditorRenderer`/`KeyValueRenderer` 通过 `useCompositeFieldHandle` 在 `useCurrentComponentRegistry()` 注册 handle；卸载时 unregister（与 input/surface handle 同模式）。
- **handle 行为对接 form runtime**：`addItem` 调 `currentForm.appendValue(name, value)`（payload `{ value }` 可选，缺省空 item）；`removeItem` 调 `currentForm.removeValue(name, index)`（payload `{ index }`）；`moveItem` 调 `currentForm.moveValue(name, from, to)`（payload `{ from, to }`）。Failure Path：无 form runtime（scope owner 回退）时镜像 E3 form-input plan 的 `movevalue-scope-fallback` 回退（调 `scope.update`）；payload 校验失败返回 `{ok:false, code:'payload-validation-failed'}`；index 越界返回 `{ok:false, code:'index-out-of-bounds'}`。
- **owner docs 同步**：`array-editor/design.md` §8 + `key-value/design.md` §8 从「可作 follow-up」翻转为「实现（X1-successor plan）」+ 句柄 args/result 形状；`docs/references/component-handle-vocabulary.md` 字段类型裁定表新增 composite editor 行；roadmap Phase Status X1 行补 successor 注记、E3 form-input 子项补 `component:moveItem` handle ✅。
- **focused 单测 + playground demo + e2e**：覆盖 3 handle 的 happy path + 4 failure paths + 边界（minItems/maxItems）+ 注册/卸载。

## Non-Goals

- 不为 X1 deferred 列表中**不存在 runtime 实现**的组件（pagination/wizard/collapse/carousel/cards/alert/service/dropdown-button/picker）预先设计或注册 handle —— 它们归 main roadmap 各自的落地 plan；本 plan 仅在 Deferred But Adjudicated 注记此裁定。
- 不为 `reaction`（返回 null、无字段值、无可 invoke 语义）注册 handle —— design.md 未要求，vocabulary 字段类型裁定表无此行。
- 不为 `dynamic-renderer` 补 handle —— 已由 E3 dynamic-renderer autoload-gate plan 落地 `component:refresh`。
- 不引入 drag-and-drop（E3 form-input plan 已裁定用上下移动按钮，drag 是 DX 糖归后续）。
- 不为 `tag-list`/`condition-builder`/`variant-field`/`detail-view` 等其它 form-advanced renderer 补 handle —— 无 design.md §8 显式 follow-up，本 plan 不发明 scope（Rule 22）。
- 不改 schema（minItems/maxItems 已由 E3 form-input plan 落地；handle 是 runtime capability，不是 schema 字段）。
- 不改 `addItem`/`removeItem`/`moveItem` 的按钮 UI 或行为（E3 form-input plan 已稳定）—— 本 plan 只在其之上**叠加** capability handle 入口。

## Scope

### In Scope

- `packages/flux-runtime/src/composite-field-handle.ts`（新增）：`createCompositeFieldHandle` 工厂 + `CompositeFieldHandleMethod`/`CompositeFieldHandleBindings` 类型；从 `index.ts` 重新导出。
- `packages/flux-react/src/hooks/use-composite-field-handle.ts`（新增）：`useCompositeFieldHandle` hook（注册/unregister pattern 对齐 `use-input-component-handle.ts`）；从 `flux-react/src/index.ts` 重新导出。
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`：renderer 内调 `useCompositeFieldHandle`（提供 addItem/removeItem/moveItem callbacks 对接 currentForm + scope fallback）；renderer definition 加 `componentCapabilityContracts`（3 contract）。
- `packages/flux-renderers-form-advanced/src/key-value.tsx`：同上对称实现。
- `packages/flux-renderers-form-advanced/src/__tests__/composite-field-handles.test.tsx`（新增）：focused 单测覆盖 array-editor/key-value 各 3 handle happy path + 4 failure paths + 注册/卸载 + min/maxItems 边界。
- `docs/components/array-editor/design.md` §8 + §10（DOM marker，如有）+ §2 决策表行更新；`docs/components/key-value/design.md` 同上。
- `docs/references/component-handle-vocabulary.md`：字段类型裁定表新增 `array-editor`/`key-value` 行；Failure Paths 汇总表新增 `index-out-of-bounds`。
- `docs/components/existing-components-improvement-roadmap.md`：Phase Status X1 行补 successor 注记 + E3 form-input 子项补 `component:moveItem` handle ✅；Last Updated 翻转。
- `apps/playground/src/pages/composite-editor-handles-demo.tsx`（新增或扩展现有 array-editor/key-value demo）：演示 `component:addItem`/`removeItem`/`moveItem` action 调用。
- `tests/e2e/composite-editor-handles.spec.ts`（新增）：e2e 程序化断言 action 触发 handle → 值变化。
- `docs/logs/{year}/06-22.md` 或执行当日：closure 条目。

### Out Of Scope

- X1 deferred 列表中不存在 runtime 实现的组件 handle（归 main roadmap）。
- `reaction`/`dynamic-renderer` handle（前者无语义、后者已落地）。
- drag-and-drop（已裁定）。
- tag-list/condition-builder/variant-field/detail-view handle（无 design.md §8 follow-up）。
- 共享 handle 工厂向 form/table/crud 既有 handle 的推广重构（X1 plan Non-Blocking Follow-ups 已记，归后续 refactor plan）。

## Failure Paths

| 场景编号                       | 触发                                          | 行为                                                                   | 可重试 | 用户可见表现                     |
| ------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------- | ------ | -------------------------------- |
| payload-validation-failed      | `addItem` payload `value` 类型不符 / 缺 index | runtime adapter reject（既有 `payload-validation-failed` 行为）        | 否     | action 报错，UI 不变             |
| index-out-of-bounds            | `removeItem`/`moveItem` 的 index/from/to 越界 | `{ok:false, code:'index-out-of-bounds'}`，不调 form runtime            | 否     | action 报错，UI 不变             |
| composite-no-form-runtime      | 无 form runtime（scope owner 回退模式）       | 镜像 E3 `movevalue-scope-fallback`：调 `scope.update` 重排/增删数组    | 否     | 操作仍生效（与按钮一致）         |
| composite-field-not-registered | component registry 无此 componentId/name      | action runtime 既有 `no-target` 行为（`{ok:false, code:'no-target'}`） | 否     | action 报错                      |
| minitems-remove-blocked        | 已达 minItems 时调 `removeItem`               | 与按钮一致：返回 `{ok:true, skipped:true}`（不绕过 minItems 约束）     | 否     | 操作 skip，UI 不变（与按钮一致） |
| maxitems-add-blocked           | 已达 maxItems 时调 `addItem`                  | 与按钮一致：返回 `{ok:true, skipped:true}`（不绕过 maxItems 约束）     | 否     | 操作 skip，UI 不变（与按钮一致） |

## Test Strategy

本档选择：`必须自动化`

理由：component handle 是 runtime 公共 capability contract，影响「action graph 能否寻址 composite editor 实例并执行值变更」—— 这是核心表单数据回归路径（`component:addItem`/`removeItem`/`moveItem` 直接改 form runtime 数组值）。按 plan guide「鉴权、对外 API 契约、核心回归路径应选必须自动化」，选「必须自动化」：Proof-before-Fix，先写 RED 用例锁定预期值/顺序/边界/failure code，再实现 factory + 注册。Failure Path `composite-no-form-runtime` 用 StubScopeOwnerRenderer 测回退；`index-out-of-bounds`/`payload-validation-failed` 用 action adapter 测 reject；`minitems-remove-blocked`/`maxitems-add-blocked` 用 schema 配 minItems/maxItems 后调 handle 断言 skipped。

## Execution Plan

### Phase 1 - 裁定 + design.md/vocabulary 同步前置

Status: completed
Targets: `docs/components/array-editor/design.md`、`docs/components/key-value/design.md`、`docs/references/component-handle-vocabulary.md`、`docs/components/existing-components-improvement-roadmap.md`

- Item Types: `Decision | Fix | Follow-up`

- [x] **Decision**：handle 形态裁定 —— 共享 `createCompositeFieldHandle` 工厂 vs 内联 handle。**裁定共享工厂**：理由 (a) `array-editor` 与 `key-value` 的 handle 语义同构（addItem/removeItem/moveItem 三态 + 对接 form runtime array API）；(b) 已有 `createInputComponentHandle`/`createSurfaceComponentHandle` 先例；(c) 避免复制粘贴。工厂参数：`{ id, name, type, methods, bindingsHolder }`（bindingsHolder 模式对齐 input-component-handle.ts:18-20 ref-as-holder）。
- [x] **Decision**：handle method 命名裁定 —— `addItem`/`removeItem`/`moveItem` vs `add`/`remove`/`move`。**裁定 `addItem`/`removeItem`/`moveItem`**（与 design.md §8 既有措辞一致、与 `array-editor-design.md:20`/`key-value-design.md:20` 决策表行一致、语义明确「item」级操作，避免与 form-level `add`/`remove` 混淆）。写入 vocabulary 命名规则节。
- [x] **Decision**：handle 调 form runtime 还是直接改 local items state。**裁定走 form runtime**（`currentForm.appendValue`/`removeValue`/`moveValue`），与 E3 form-input plan 按钮路径同源；scope owner 回退时镜像按钮的 scope.update 回退（Failure Path `composite-no-form-runtime`）。
- [x] **Decision**：minItems/maxItems 在 handle 路径的处理。**裁定 handle 也遵守**（与按钮一致：达到 minItems 时 `removeItem` skipped:true、达到 maxItems 时 `addItem` skipped:true），handle 不绕过 schema 验收。
- [x] **Decision（执行期细化）**：capability contract **仅发布 `args` FluxValueShape，不发布 `result` 形状**。理由：action-adapter（`action-adapter.ts:410-413`）对已发布 result 形状做强校验 `matchesFluxValueShape(result.data, result)`，而 `maxItems`/`minItems` 受限与 `disabled`/`readOnly` 时须返回 `{ok:true, skipped:true}`（无 data），发布 result 形状会导致 skipped 用例被误判为 result-contract 失败。这与既有 vocabulary（`clear`/`reset`/`focus`/`open` 均不发布 result）一致；`data:{index}` 仍作为信息性返回供 action graph 后续节点读取。已在 design.md §8 + vocabulary 注记。
- [x] **Fix**：`array-editor/design.md` §8 翻转「可作 follow-up」→「实现（X1-successor plan）」+ handle args/result FluxValueShape（`addItem` args `{value?: unknown}` 成功返回 `data:{index}`；`removeItem` args `{index: number}`；`moveItem` args `{from: number, to: number}`）；§2 决策表 `component:moveItem` 行注记「句柄注册已由 X1-successor plan 收口」。
- [x] **Fix**：`key-value/design.md` §8 + §2 同上对称更新。
- [x] **Fix**：`docs/references/component-handle-vocabulary.md` 字段类型裁定表新增 `array-editor`/`key-value` 行（`addItem`/`removeItem`/`moveItem` 三 handle、其它 —）；Failure Paths 汇总表新增 `index-out-of-bounds` + `x1-composite-disabled` 行；命名规则节补 `addItem`/`removeItem`/`moveItem` 词汇。
- [x] **Follow-up**：`existing-components-improvement-roadmap.md` Phase Status X1 行补 successor 注记（既有 runtime 子集已由本 plan 收口；不存在组件归 main roadmap），E3 form-input 子项补 `component:moveItem` handle ✅；Last Updated 翻转。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。
>
> **写法原则**：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。不要写 boilerplate；全量 `pnpm typecheck/build/lint/test` 是 Closure Gates 的事，不是每个 Phase 的默认项（见 Minimum Rule 18）。

- [x] design.md §8（array-editor/key-value）已从「可作 follow-up」翻转为「实现（X1-successor）」+ handle args/result 形状
- [x] vocabulary 字段类型裁定表新增 array-editor/key-value 行 + Failure Paths 新增 `index-out-of-bounds`
- [x] roadmap Phase Status X1 行 successor 注记 + E3 form-input `component:moveItem` ✅ 已补

### Phase 2 - 共享 factory + hook + focused 测试草稿（RED）

Status: completed
Targets: `packages/flux-runtime/src/composite-field-handle.ts`、`packages/flux-runtime/src/index.ts`、`packages/flux-react/src/hooks/use-composite-field-handle.ts`、`packages/flux-react/src/index.ts`、`packages/flux-renderers-form-advanced/src/__tests__/composite-field-handles.test.tsx`

- Item Types: `Fix | Proof`

- [x] **Fix**：`packages/flux-runtime/src/composite-field-handle.ts` 新增 `createCompositeFieldHandle` 工厂：参数 `{ id, name, type, methods, bindingsHolder }`；`CompositeFieldHandleMethod = 'addItem' | 'removeItem' | 'moveItem'`；bindings 形状执行期细化见下；invoke 路径含 Failure Path `x1-composite-disabled`（`isInteractive()` false 时 skipped:true）、`index-out-of-bounds`（bindings 内部裁定 via `outOfBounds`，外加非 number index 守卫 + moveItem `from===to` skipped）。
  - bindings 形状执行期细化：三 callback 统一返回 `CompositeFieldHandleOpResult = { skipped?: boolean; outOfBounds?: boolean; index?: number }`（plan 原写 moveItem `void`/removeItem `{skipped?}`，无法承载 `index-out-of-bounds` failure path，故统一为 result object）；省略 `isVisible()`（composite 操作是值级而非 DOM 级，visibility 无关，避免 dead field）。
- [x] **Fix**：从 `packages/flux-runtime/src/index.ts` 重新导出 `createCompositeFieldHandle` 及其类型（`CompositeFieldHandleBindings`/`BindingsHolder`/`Method`/`OpResult`）。
- [x] **Fix**：`packages/flux-react/src/hooks/use-composite-field-handle.ts` 新增 `useCompositeFieldHandle` hook，模式对齐 `use-input-component-handle.ts:29-67`（bindingsHolder ref-as-holder + `useCurrentComponentRegistry().register(handle, { cid })` + 卸载 unregister）；从 `flux-react/src/index.tsx` 重新导出。
- [x] **Proof**：`composite-field-handles.test.tsx` 新增用例：
  - factory 单元（11 例，已 GREEN）：3 method invoke happy path + addItem 传 value + removeItem 传 index + moveItem 传 from/to + `isInteractive:false` → skipped（三 method）+ addItem/removeItem skipped（max/min）+ outOfBounds → index-out-of-bounds + 非 number index → index-out-of-bounds + moveItem `from===to` skipped no-op（不调 bindings）+ unsupported method → `{ok:false, error}` + hasMethod/listMethods。
  - hook 注册（1 例，随 Phase 3 GREEN）：mount 时 registry resolve 命中、unmount 后 resolve undefined。
  - integration（array-editor 8 + key-value 6 = 14 例，随 Phase 3 GREEN）：`addItem` append + value payload；`removeItem` 按 index；`moveItem` reorder；minItems/maxItems 边界 skipped；out-of-bounds 不变；scope owner 回退（无 currentForm 时 `scope.update`）。

Exit Criteria:

- [x] `createCompositeFieldHandle` 工厂 + 类型从 `flux-runtime` 导出（typecheck flux-runtime 通过）
- [x] `useCompositeFieldHandle` hook 从 `flux-react` 导出，注册/unregister 模式对齐既有 hook（typecheck flux-react 通过）
- [x] RED 用例草稿存在且 grep `composite-field-handles.test` 在 `flux-renderers-form-advanced/src/__tests__/` 命中（factory 11 例已 GREEN，hook+integration 随 Phase 3 转 GREEN）

### Phase 3 - renderer 注册 + capability contracts + 测试转绿

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/array-editor.tsx`、`packages/flux-renderers-form-advanced/src/key-value.tsx`

- Item Types: `Fix | Proof`

- [x] **Fix**：`array-editor.tsx` `ArrayEditorRenderer` 调 `useCompositeFieldHandle({ id: props.id, name, type: 'array-editor', cid: props.meta.cid, methods: COMPOSITE_EDITOR_METHODS, addItem, removeItem, moveItem, isInteractive })`；bindings 内 callbacks 复用既有 append/remove/move 逻辑（`currentForm.appendValue`/`removeValue`/`moveValue` + `syncItems` scope 回退 + `pendingFocusRef`），并返回 `{skipped|outOfBounds|index}`；`addItem` 接受可选 value payload（object→normalize 为 `{id,value}`，缺省空 item）。
- [x] **Fix**：`arrayEditorRendererDefinition` 加 `componentCapabilityContracts: COMPOSITE_EDITOR_CAPABILITY_CONTRACTS`（共享常量，从 `composite-field/composite-editor-capability-contracts.ts` 导入；array-editor/key-value 共用）。FluxValueShape 用 `kind:'unknown'`（addItem args `{kind:'object', fields:{value:{kind:'unknown'}}, optional:['value']}`；removeItem args `{kind:'object', fields:{index:{kind:'number'}}}`；moveItem args `{kind:'object', fields:{from:{kind:'number'}, to:{kind:'number'}}}`）。按 Phase 1 裁定**不发布 result 形状**（兼容 skipped 语义 + 与既有 vocabulary 一致）；`addItem` 成功返回 `data:{index}`（renderer 基于 `items.length` 派生）。
- [x] **Fix**：`key-value.tsx` `KeyValueRenderer` 与 `keyValueRendererDefinition` 对称实现（addItem 构造 `{id,key,value}` 空 pair；removeItem 含 focus 恢复；moveItem reorder）。
- [x] **Proof**：Phase 2 用例全部 GREEN（factory 11 + hook 1 + array-editor integration 8 + key-value integration 6 = 26 用例全过）。
- [x] **Proof**：anti-hollow 抽查 —— `useCompositeFieldHandle` 在 `ArrayEditorRenderer`/`KeyValueRenderer` 内被调用、callbacks 真正调 `currentForm.appendValue`/`removeValue`/`moveValue`（非空函数体，含 scope.update 回退）；既有 `array-keyvalue-min-max-reorder`/`component-handles-tree` 回归测试 16 例无破坏。

Exit Criteria:

- [x] `arrayEditorRendererDefinition`/`keyValueRendererDefinition` 各发布 3 个 `componentCapabilityContracts`
- [x] `ArrayEditorRenderer`/`KeyValueRenderer` 通过 `useCompositeFieldHandle` 在 component registry 注册 handle
- [x] Phase 2 RED 用例全部 GREEN（26 用例）

### Phase 4 - playground demo + e2e + roadmap/log 同步 + Closure

Status: completed
Targets: `apps/playground/src/pages/component-handles-demo.tsx`（扩展）、`tests/e2e/composite-editor-handles.spec.ts`（新增）、`docs/components/existing-components-improvement-roadmap.md`、`docs/logs/2026/06-22.md`、`docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md`（successor 注记）、`docs/plans/2026-06-22-0330-2-e3-form-input-number-array-keyvalue-plan.md`（follow-up 收口注记）

- Item Types: `Fix | Proof | Follow-up`

- [x] **Fix**：扩展现有 `apps/playground/src/pages/component-handles-demo.tsx`（component-handle vocabulary 的 canonical 页面；plan 允许「新增或扩展」，选扩展以复用 route/entry-page scaffolding）：form `data` 加 `reviewers`/`metadata` 数组；form body 加 array-editor（`id:'arr-field'`）+ key-value（`id:'kv-field'`）+ 6 个 `component:addItem/removeItem/moveItem` 触发按钮（含 `args`）+ live count text block（`testid`）。**附带修复 pre-existing bug**：demo 一直未把已注册的 `registry` 传给 `SchemaRenderer`（dead code）→ 补 `registry={registry}`，demo 方能在 e2e 下渲染（clean HEAD 验证 6/6 component-handles e2e 原本全失败）。route `#/component-handles` 已存在，无需新增。
- [x] **Proof**：`tests/e2e/composite-editor-handles.spec.ts`（新增 5 cases，程序化断言）：addItem（array-editor + key-value）→ count +1；moveItem → 顺序变化（读 input value）；removeItem → count -1；minItems 时 removeItem skipped（failure path）。全 GREEN。
- [x] **Proof**：`tests/e2e/playground-entry-pages.spec.ts` 无需新增 route assertion（扩展既有 `component-handles` route，非新增 route）；该 route 的 entry-page smoke 已通过（demo 渲染正常）。
- [x] **Fix**：`docs/components/existing-components-improvement-roadmap.md` Phase Status X1 行补 successor 收口注记、E3 form-input 子项补 `component:moveItem` handle ✅、Last Updated 翻转（Phase 1 已完成）。
- [x] **Fix**：`docs/logs/2026/06-22.md` 加 closure 条目（含验证输出）。
- [x] **Follow-up**：X1 plan `Deferred But Adjudicated` P2/P3 handle 条目注记「既有 runtime 子集（composite editor）已由本 plan 收口；不存在组件归 main roadmap」。
- [x] **Follow-up**：E3 form-input plan `Non-Blocking Follow-ups` `component:moveItem` 句柄 follow-up 注记「已由本 plan 收口」。
- [x] **Fix（执行期附带，跨包 flux-compiler）**：发现 compiler/runtime 不对称——runtime coerce undefined payload → `{}` 但 compiler 不 coerce，导致无 args 的 `component:addItem`（addItem primary 用例）在 strict schema 下误报。修 `action-selector-validation.ts`（undefined args → `{}`）+ regression test。flux-compiler 489/489 全绿。
- [x] **Fix（执行期附带，pre-existing test bug）**：`tests/e2e/component-handles.spec.ts` focus-button `Target Button` substring ambiguity → `exact:true`（转绿）。dialog toggle / drawer close 仍失败 = pre-existing（modal 打开后 page-level trigger 被 inert；clean HEAD 已失败，git stash 验证），与本 plan 无关，已 NOTE 注记。

Exit Criteria:

- [x] playground demo + route 可访问，演示 3 handle action 触发（`#/component-handles`，含 array-editor + key-value 各 3 按钮）
- [x] e2e 5 cases GREEN（程序化断言，含 1 failure path）
- [x] X1 plan successor 注记 + E3 form-input plan follow-up 注记已回填
- [x] roadmap Phase Status 与 Last Updated 同步

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan-authoring-and-execution-guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 sub-agent round 1（fresh session `ses_11290c13affeha3RGIBVKh8vKU`）
- Verdict: `revised`
- Rounds: 1
- Findings addressed:
  - Major 1（schemas.ts 行号漂移：`:224-226`/`:213-216` → 实际 `:233-237`/`:220-225`）：已修正 Current Baseline 行号引用。
  - Minor（Phase 3 contract `kind:'any'` 不存在）：已改为 `kind:'unknown'` + 显式 FluxValueShape 注释。
  - Minor（`addItem` result `{ok,index}` 中 index 由 renderer 派生）：已在 Current Baseline + Phase 3 显式注明 `appendValue()` void + renderer-derived index。
  - Minor（`key-value.tsx:551-589` 子集）：已修正为 `:546-603`。
  - Minor（`form-runtime.ts:577-594` off-by-one）：已修正为 `:577-595`。
- Reviewer / Agent: 独立 sub-agent round 2（fresh session `ses_112887925ffeUZ7Z1q1TK6T1EH`，re-review）
- Verdict: `pass`
- Rounds: 2（总）
- Findings addressed: 5 项 Major/Minor 全部 verified fixed；0 new Blocker / 0 new Major / 0 new Minor。Plan 升级为 `active`。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] array-editor/key-value capability contracts 发布（3 handle × 2 renderer）
- [x] `createCompositeFieldHandle` 工厂 + `useCompositeFieldHandle` hook 落地（共享、无复制粘贴）
- [x] handle 真正对接 form runtime `appendValue`/`removeValue`/`moveValue`（anti-hollow）
- [x] Failure Path 4 类（`payload-validation-failed`/`index-out-of-bounds`/`composite-no-form-runtime`/min-max-blocked）有 focused test 覆盖
- [x] vocabulary 字段类型裁定表 + Failure Paths 汇总同步
- [x] array-editor/key-value design.md §8/§2 翻转
- [x] roadmap Phase Status X1 successor + E3 form-input handle 注记 ✅；Last Updated 翻转
- [x] X1 plan Deferred successor 注记 + E3 form-input plan follow-up 注记回填
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（X1 deferred 中不存在组件归 main roadmap，明确注记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（auditor: fresh sub-agent `ses_1124aa52affec4k8eLaUdpCxOM`，verdict `approved`，0 Blocker/Major/Minor）
- [x] `pnpm typecheck`（49/49）
- [x] `pnpm build`（26/26）
- [x] `pnpm lint`（0 errors；1 pre-existing warning）
- [x] `pnpm test`（49/49 unit tasks；含 flux-compiler 489、flux-renderers-form-advanced 787、composite-field-handles 26；e2e composite-editor-handles 5/5；e2e component-handles 4/6，dialog/drawer = pre-existing 经 git stash clean-HEAD 验证）

## Deferred But Adjudicated

### X1 deferred 列表中不存在 runtime 实现的组件（pagination/wizard/collapse/carousel/cards/alert/service/dropdown-button/picker）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 这些组件在 main roadmap 仍是 `targetContract → runtime` 未落地目标，design.md 未建或标 future。X1 plan Deferred 罗列它们仅作为「Phase 1 vocabulary 裁定后可按同 vocabulary 单独立项」的占位；预先为不存在组件设计 handle 是 main roadmap 的越权。等组件由 main roadmap 落地后，其各自的落地 plan 顺带按 vocabulary 注册 handle。
- Successor Required: yes
- Successor Path: main roadmap 各组件的落地 plan（W1c list / W2a cards / 等等）。

### `reaction` handle

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `reaction` renderer 返回 null，无字段值/无 DOM 可 focus/无状态可 toggle，handle 无可 invoke 的语义。design.md 未要求 handle。
- Successor Required: no

### 共享 handle 工厂向 form/table/crud 既有 handle 的推广重构

- Classification: `optimization candidate`
- Why Not Blocking Closure: X1 plan Non-Blocking Follow-ups 已记；既有 form/table/crud handle 已稳定，重构去重是内部清理，不影响本 plan 的 contract closure。
- Successor Required: no

## Non-Blocking Follow-ups

- `tag-list`/`condition-builder`/`variant-field`/`detail-view` 等其它 form-advanced renderer 的 handle（如后续 design.md §8 显式要求，独立立项）。
- 共享 `createCompositeFieldHandle` 若后续出现第三种 composite editor（如 main roadmap 的 `combo`/`input-table`），可回头推广为更通用 `createCollectionHandle`。

## Closure

Status Note: 全 4 Phase 执行完成。array-editor/key-value 发布 `component:addItem`/`removeItem`/`moveItem` capability contracts（args-only，args 形状 addItem `{value?:unknown}`/removeItem `{index}`/moveItem `{from,to}`；不发布 result 形状以兼容 skipped 语义 + 与既有 vocabulary 一致），经共享 `createCompositeFieldHandle` 工厂 + `useCompositeFieldHandle` hook 注册；bindings 真正对接 form runtime `appendValue`/`removeValue`/`moveValue`（含 scope-owner 回退）+ min/max 边界 + out-of-bounds 守卫。Failure Path 4 类有 focused test 覆盖。design.md/vocabulary/roadmap 同步；X1 plan successor 注记 + E3 form-input plan follow-up 注记回填。执行期附带修复 2 个跨包问题：(1) flux-compiler undefined-args coerce（对齐 runtime，+ regression test）；(2) component-handles-demo pre-existing dead-registry bug（补 `registry` prop）+ focus-button selector bug。技术 Closure Gates 全过：typecheck 49/49、build 26/26、lint 0 errors、unit test 49/49（含新增 26 composite-field-handles）、e2e composite-editor-handles 5/5。dialog/drawer component-handles e2e 仍失败 = pre-existing（modal-overlay 交互，clean-HEAD 验证，与本 plan 无关）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent `ses_1124aa52affec4k8eLaUdpCxOM`（general，不复用执行者上下文）
- Verdict: `approved`（0 Blocker / 0 Major / 0 Minor）
- Evidence:
  - Phase 2 exports verified: `flux-runtime/src/index.ts:19-24`（factory + 4 types）、`flux-react/src/index.tsx:75-77`（hook + options type）。
  - Phase 3 contracts verified: `composite-editor-capability-contracts.ts:5-34`（3 contracts，args-only）；两 definition 引用（`array-editor.tsx:587`、`key-value.tsx:644`）。
  - Anti-hollow verified: `array-editor.tsx:389-465`、`key-value.tsx:426-499` — addItem/removeItem/moveItem callbacks 非空，真正调 `currentForm.appendValue`/`removeValue`/`moveValue`（scope.update 回退），min/max 边界 + outOfBounds 守卫在场。
  - Failure-path test 覆盖 verified: `index-out-of-bounds`（test:125-147）、`composite-no-form-runtime`（test:454-477, 623-646）、min-max-blocked（test:106-123, 379-428, 573-621）、payload-validation-failed（adapter 层 + compiler regression test）。
  - 26/26 composite-field-handles test GREEN（独立重跑）。
  - Pre-existing failures: agree（dialog/drawer = modal-overlay 交互，working tree un-stashed，registry fix 反而 unblock 4/6；与本 plan 无关）。
  - Compiler fix: justified（runtime `value-shape-runtime.ts:88` 已 coerce undefined→{}，compiler 对齐；regression test 在 `schema-compiler-host-action-validation.xui-actions.test.ts:428-463`）。
- Daily log: `docs/logs/2026/06-22.md`（X1-successor 复合字段编辑器 component handles 条目）。

Follow-up:

- dialog/drawer component-handles e2e（modal 打开后 page-level trigger 被 inert 的测试设计问题）—— pre-existing，归 X1 surface 测试迭代（非本 plan 引入、非本 plan 范围）。
- tag-list/condition-builder/variant-field/detail-view 等 form-advanced renderer handle（见 Non-Blocking Follow-ups，独立立项）。
- 共享 `createCompositeFieldHandle` 推广为更通用 `createCollectionHandle`（若 main roadmap 出现第三种 composite editor，见 Non-Blocking Follow-ups）。
