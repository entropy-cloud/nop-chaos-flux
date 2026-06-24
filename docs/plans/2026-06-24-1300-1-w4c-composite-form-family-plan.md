# W4c 复合表单族（combo / picker / transfer / input-table）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md`（W4c 工作项）、`docs/components/amis-baseline-matrix.md`（L149-152）、`docs/components/{combo,picker,transfer,input-table}/design.md`
> Related: roadmap 依赖图 `W3d → W4c`（W3d plan `2026-06-24-0718-1` Follow-up 显式命名 W4c 为自然 successor，依赖 W3d form-advanced 基座 + 复合值 staged owner）；X1 successor plan `2026-06-22-1137-1`（composite editor handle `createCompositeFieldHandle` addItem/removeItem/moveItem，combo/input-table 复用；picker 的 open/clear 经 `useInputComponentHandle` 的 openMenu/clearValue slot）；W2a service/data-source（picker/transfer 候选集 source 走请求下沉）

## Purpose

把 roadmap W4c（复合表单组，4 个组件）从"4 份 design.md 已立约、代码 0%"推进到"4 个 renderer 实现 + 注册 + playground + e2e + roadmap W4c 标 done"，完成 main roadmap 全部 Wave 1–4 retained 组件交付。

本 plan 是 main roadmap Wave 1–4 的**收尾工作项**（W4c 之后仅剩 Follow-up 轨 D1a 与可选项 O1）。

## Current Baseline

- **W4c 已解锁**：W3d（高级输入族）`done`（roadmap:29、amis-baseline-matrix L157-162），form-advanced 基座与复合值 staged owner 已就绪。roadmap 依赖图 `W3d → W4c` 成立。
- **复合编辑器基座已落地于 `flux-renderers-form-advanced`**：
  - `array-editor.tsx` 是 canonical staged-owner 范例：`useFormFieldController(name,...)`（form/scope 值归属回退）+ `useCompositeFieldHandle({id,name,type,methods,...})`（X1 组件句柄 addItem/removeItem/moveItem）+ `currentForm.appendValue/removeValue/moveValue/validateField/validateSubtree`（staged owner 变更）+ `COMPOSITE_EDITOR_METHODS`/`COMPOSITE_EDITOR_CAPABILITY_CONTRACTS`（capability contracts，`composite-editor-capability-contracts.ts`）+ field 级 validation `{kind:'field',valueKind:'array',collectRules}`（minItems/maxItems 规则）+ `createNextCompositeItemId`（稳定 item id）。
  - `composite-field/`：`array-field.tsx`（`itemKind:'scalar'|'object'`、addable/removable/sortable、transformIn/Out/validateValue action staged owner）、`object-field.tsx`、`variant-field`、`projected-inline-form.ts`、`composite-item-id.ts`。
- **form-advanced 已注册 renderer**（`src/index.tsx:57-71` `formAdvancedRendererDefinitions`）：tree-controls、tag-list、key-value、array-editor、condition-builder、object-field、array-field、variant-field、detail-field、detail-view、editor、input-file、input-image。**combo/picker/transfer/input-table 均未注册**。
- **form-advanced 依赖 `flux-renderers-form`**（已确立的 workspace 边）：`formFieldRules`、`useFormFieldController`、`useCompositeChildFieldState`、`getChildFieldUiState`、`getFieldValidationBehavior`、`shouldValidateOn`、`FieldHint`（见 `array-editor.tsx:21-30` import）。
- **选择类基座已存在于 `flux-renderers-form`**：`select`（options 归一化，固定 `SelectOptionSchema {label,value}` 形态——**无 valueKey/labelKey**，`schemas.ts:39`）、`input-tree`/`tree-select`（层级选择）；`dialog`/`drawer` surface owner（picker 弹层复用）。**注意：transfer/picker 的 design §4 指定 `valueKey`/`labelKey` 字段，但 select 不提供该映射模型——本 plan 在 form-advanced 内新建一个最小 valueKey/labelKey 归一化 helper（候选项→{label,value} 统一形态），不复制 select 的下拉协议。**
- **4 份 design.md 已立约**：combo/picker/transfer/input-table，但 §3 均写"预期归属 `@nop-chaos/flux-renderers-form`"——这是 **design §3 drift**（roadmap 权威为 `flux-renderers-form-advanced`，见 roadmap L113 + 组件覆盖表 L271-274），同 W4a/W4b/W3d 的 drift 模式，本 plan 收敛。
- **amis-baseline-matrix**（L149-152）：4 组件 = `targetContract` / `wave 4`（收口时翻 `runtime`/`landed`）。
- **X1 句柄基座（method-locked，不泛化）**：`createCompositeFieldHandle`/`useCompositeFieldHandle`（`flux-runtime/src/composite-field-handle.ts:3`、`flux-react/src/hooks/use-composite-field-handle.ts:16-18`）**硬编码** `addItem`/`removeItem`/`moveItem` 三方法（switch default 抛 `Unsupported method`）。combo/input-table 复用这 3 个 canonical 方法（design §8 的 `addRow/removeRow/moveRow` 为概念别名，映射到 canonical `addItem/removeItem/moveItem`）；picker 的 `open`/`clear` 非 item-op，经 `useInputComponentHandle`（`flux-react/src/hooks/use-input-component-handle.ts:18-20` 的 `openMenu`/`clearValue` slot）。**本 plan 不扩展/泛化句柄工厂。**

## Goals

- 4 个 renderer（combo/picker/transfer/input-table）落地于 `flux-renderers-form-advanced`，遵循 `RendererComponentProps`（读 `props.props`/`props.regions`/`props.meta`/`props.events`/`props.helpers`，field 类用标准 hooks 写回，不直接访问 store），随 `registerFormAdvancedRenderers` 注册。
- combo/input-table 复用复合值 staged owner 语义（form/scope 值归属 + append/remove/move + 子字段 staged validation），不重造第二套数组编辑协议；与 array-editor/array-field 边界清晰。
- transfer/picker 复用既有选择语义（options 归一化 + 新建最小 valueKey/labelKey 归一化 helper + 既有 select/tree/dialog surface），不重造平行选择子系统（不复制 select 下拉协议、不重建 dialog/table）；与 select/tree-select/dialog 边界清晰。
- 4 份 design.md §3 归属 drift 收敛为 form-advanced；field metadata/region/event 分类对齐实际实现。
- roadmap W4c 标 done + amis-baseline-matrix 4 组件 `targetContract→runtime`。

## Non-Goals

- 不实现 combo 的远程 items loader（首版聚焦静态 `items`/`itemSchema` + 表达式初值；远程候选归 data-source successor）。
- 不实现 transfer/picker 的拖拽排序或大量数据虚拟滚动（性能优化 successor）。
- 不实现 picker 的自定义 pickerDialog region 自由模板（首版 pickerDialog 为配置对象，复用 dialog/drawer；自由 region successor）。
- 不实现 input-table 的列拖拽/列宽自定义/合并单元格（首版聚焦行编辑 + 列定义）。
- 不重构既有 array-editor/array-field/object-field/select/dialog（仅复用其公共契约；如需抽取共享 helper 在 form-advanced 包内进行，不跨包改契约）。
- 不动 W1d（M5 已 done，roadmap W1d 仅状态滞后，非本 plan 范围）、不动 D1a（designer host bridge projection 未就绪，blocked）。

## Scope

### In Scope

- 4 个 renderer 实现 + `RendererDefinition` 注册（`formAdvancedRendererDefinitions` + 导出），field 类组件用 `useFormFieldController`/`useCompositeFieldHandle` 写回，输出 marker（`nop-combo`/`nop-picker`/`nop-transfer`/`nop-input-table`）。
- combo：重复对象/项字段编辑器（`items`/`itemSchema` + multiple/addable/removable/reorderable + `item` region），复用 staged owner + composite handle（addItem/removeItem/moveItem）。
- input-table：表格型对象数组字段编辑器（`columns`/`rowKey` + addable/removable/reorderable + 行内编辑），复用 staged owner + composite handle（addRow/removeRow/moveRow）。
- transfer：双栏转移选择字段（`options` + multiple/valueKey/labelKey/searchable + `onChange`），复用 options 归一化 + 选择→值写回。
- picker：弹层选择字段（`pickerDialog` 配置 + valueKey/labelKey/multiple + open/clear handle），复用 dialog/drawer surface owner + 选择结果映射写回。
- schema + field metadata + region/event 分类对齐 design；收敛 4 份 design §3 drift。
- focused 单测（每个组件）+ playground 演示页 + e2e（关键交互路径程序化断言）。
- roadmap W4c 标 done + amis-baseline-matrix 状态翻转。

### Out Of Scope

- 见 Non-Goals（远程 loader、虚拟滚动、列拖拽/合并、pickerDialog 自由 region、跨包重构）。
- 不为 D1a designer 组件预注册句柄（归 D1a successor，host bridge 未就绪）。

## Failure Paths

| 场景                         | 触发                                      | 行为                                               | 可重试 | 用户可见表现                |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------- | ------ | --------------------------- |
| combo-item-required          | itemSchema 子字段 required 且项内值为空   | staged validation 标子字段 error，不阻塞其他项编辑 | 否     | 项内对应字段标红 + 校验提示 |
| input-table-row-remove-floor | 删除行数低于 minItems                     | 拒绝删除（handle 返回 skipped），按钮 disabled     | 否     | 删除按钮禁用，值不变        |
| transfer-options-empty       | `options` 为空 / 表达式求值为空           | 双栏渲染空态（候选区空），不报错，已选值保留       | 是     | 候选区显示 empty 提示       |
| picker-dialog-missing        | schema 未提供 `pickerDialog`              | open 按钮提示配置缺失，不静默打开空弹层            | 否     | 点击后提示配置缺失          |
| picker-selection-mismatch    | 已选值在候选集中找不到（valueKey 无匹配） | 已选区按 labelKey 降级显示原值或占位，不崩溃       | 否     | 已选项显示原值/占位         |
| combo-max-items              | multiple=false 或已达 maxItems            | add 按钮禁用 + handle 返回 skipped，不超量写回     | 否     | add 按钮禁用                |

## Test Strategy

档位选择：`建议有测`

理由：4 个均为表单复合/选择字段（非鉴权/对外 API/核心回归路径）。回归风险点：combo/input-table 的 staged owner 写回（append/remove/move 不丢子字段 validation）、transfer/picker 的选择→值映射（valueKey/labelKey 多对一/缺失降级）、input-table 行编辑与列模型对齐。这些配 focused 单测；关键交互路径（增删项、穿梭选择、弹层选择写回）配 e2e 程序化断言。按 AGENTS.md 每个新组件必须有 playground 示例 + e2e。

## Execution Plan

### Phase 1 - combo（重复项字段编辑器）

Status: completed
Targets: 新增 `packages/flux-renderers-form-advanced/src/combo-renderer.tsx`；`composite-field/composite-schemas.ts`（`ComboSchema`）；`index.tsx` 注册 + 导出；`docs/components/combo/design.md`；playground route-model + example；`tests/e2e/`

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：包归属裁定 —— 遵循 roadmap 权威：combo → `flux-renderers-form-advanced`（非 design §3 的 form）；收敛 `combo/design.md` §3 drift（form→form-advanced）。写入 design + log。
- [x] **Decision**：combo 与 array-editor/array-field 边界裁定 —— combo 是**重复对象/复合项字段编辑器**，item 模板来自 schema `itemSchema`（`item` region，每项独立复合字段），视觉为卡片/流式堆叠；array-editor 是**标量项**编辑器（单一 value 输入），array-field 是**底层 staged owner**（transformIn/Out action）。combo 复用 array-field 的 staged owner 内核但提供 item region + 复合项 UI，不重造数组操作协议。裁定写入 design §1/§12。
- [x] **Fix**：实现 combo（`useFormFieldController` 值归属 + `useCompositeFieldHandle` addItem/removeItem/moveItem + `currentForm.append/remove/moveValue` + staged validation；`multiple`/`addable`/`removable`/`reorderable`/`minItems`/`maxItems`/`itemSchema`→`item` region per-item 渲染；项操作按钮复用 `@nop-chaos/ui` Button + lucide 图标，复用 `array-editor.tsx` 的 pendingFocus 模式），输出 `nop-combo` + `nop-combo__item` marker。
- [x] **Fix**：`ComboSchema` + field metadata + `RendererDefinition`（`validation:{kind:'field',valueKind:'array',collectRules}` minItems/maxItems，`label` value-or-region，`onAdd`/`onRemove`/`onReorder` event）合入 `formAdvancedRendererDefinitions`。
- [x] **Proof**：focused 单测 —— add/remove/move 写回 + 子字段 staged validation 触发、minItems/maxItems clamp、multiple/single 态、disabled/readOnly、item region 渲染、不直接访问 store（经 hooks）。
- [x] **Proof**：playground 演示页（静态 items + itemSchema 复合项 + 增删排序）+ e2e（程序化断言：add 项→值数组增长、remove→减少、reorder→顺序变化、子字段 validation）。

Exit Criteria:

- [x] combo 落地于 `flux-renderers-form-advanced`，随 `registerFormAdvancedRenderers` 注册，输出 `nop-combo` marker；staged owner add/remove/move + 子字段 validation focused 单测通过；增删排序 e2e 程序化断言通过。
- [x] `combo/design.md` §3 归属收敛为 form-advanced；combo vs array-editor/array-field 边界写入 design。

### Phase 2 - input-table（表格型对象数组字段编辑器）

Status: completed
Targets: 新增 `packages/flux-renderers-form-advanced/src/input-table-renderer.tsx`；`composite-field/composite-schemas.ts`（`InputTableSchema`）；`index.tsx` 注册；`docs/components/input-table/design.md`；playground + e2e

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：input-table 与通用 `table` 及 `array-editor` 边界裁定 —— input-table 是**字段编辑器**（值 owner = 表单字段体系，行列内为可编辑 field，复用 staged owner + composite handle）；通用 `table` 是**数据展示** renderer（数据来自 scope/data-source，非字段 owner）。input-table 复用 array-field staged owner + 列定义模型，不复制通用 table 的展示协议。裁定写入 design §1/§12。
- [x] **Decision**：input-table 句柄裁定 —— 复用既有 canonical composite handle `addItem`/`removeItem`/`moveItem`（`createCompositeFieldHandle` method-locked，不泛化），design §8 的 `addRow`/`removeRow`/`moveRow` 为概念别名，映射到 canonical 方法名（design §8 注明别名映射）；不扩展句柄工厂。
- [x] **Fix**：实现 input-table（`columns` 列定义 → 行内 field 渲染 + `rowKey` + addable/removable/reorderable；复用 `useFormFieldController` + `useCompositeFieldHandle`（canonical `addItem`/`removeItem`/`moveItem` methods）+ staged validation；表格视觉复用 `@nop-chaos/ui` Table 组件族，不裸 HTML），输出 `nop-input-table` + `nop-input-table__row` marker。
- [x] **Fix**：`InputTableSchema` + field metadata（`columns`/`rowKey`/addable/removable/reorderable/`required`，`label` value-or-region，`onAdd`/`onRemove`/`onReorder` event）+ `RendererDefinition`（valueKind array）合入注册。
- [x] **Proof**：focused 单测 —— 行增删移写回 + 列内 field staged validation、rowKey 稳定、minItems floor（remove 拒绝）、列定义渲染、disabled/readOnly。
- [x] **Proof**：playground 演示页（多列对象数组 + 行内编辑 + 增删移）+ e2e（程序化断言：编辑单元格→值更新、addRow/removeRow→行数变化、reorder）。

Exit Criteria:

- [x] input-table 落地于 `flux-renderers-form-advanced`，注册 + `nop-input-table` marker；行编辑 + staged validation focused 单测通过；行增删移 e2e 程序化断言通过。
- [x] `input-table/design.md` §3 收敛 form-advanced；input-table vs table/array-editor 边界写入 design。

### Phase 3 - transfer（双栏转移选择字段）

Status: completed
Targets: 新增 `packages/flux-renderers-form-advanced/src/transfer-renderer.tsx`；`index.tsx` 注册；`docs/components/transfer/design.md`；playground + e2e

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：transfer 与 select/tree-select 边界裁定 —— transfer 承接"候选集 ↔ 已选集"双栏穿梭语义（一次性多选 + 可见候选全量），select/tree-select 是单弹层下拉选择。transfer 复用 `select` 的 options 归一化思路，但 **select 用固定 `{label,value}` 形态、无 valueKey/labelKey**（`schemas.ts:39`），故 transfer 在 form-advanced 内新建最小 valueKey/labelKey 归一化 helper（候选项→统一 `{label,value}`），渲染为左右双栏 + 穿梭按钮，不复制 select 的下拉协议。`options` 可由表达式/source value 提供（请求下沉：不声明挂载期 source 字段）。裁定写入 design §1/§12。
- [x] **Fix**：实现 transfer（新建 valueKey/labelKey 归一化 helper → options 统一为 `{label,value}` → 候选栏 + 已选栏；穿梭按钮移动项；`multiple`/`searchable`（左/右栏搜索为组件内交互态，design §7）；选择→值写回经 `useFormFieldController` + `currentForm.setValue`；`onChange` event；空态降级），输出 `nop-transfer` + `nop-transfer__candidate`/`-selected` marker。
- [x] **Fix**：`TransferSchema` + field metadata（`options`/multiple/valueKey/labelKey/searchable/required，`label` value-or-region，`onChange` event）+ `RendererDefinition`（valueKind 取决于 multiple：array/scalar）合入注册。
- [x] **Proof**：focused 单测 —— 选中/取消写回、multiple/single、valueKey/labelKey 映射 + 已选值在候选缺失时降级、searchable 过滤、空 options 空态、disabled/readOnly。
- [x] **Proof**：playground 演示页（候选→已选穿梭 + 搜索）+ e2e（程序化断言：选中候选→已选值数组增长、移除→减少、搜索过滤）。

Exit Criteria:

- [x] transfer 落地于 `flux-renderers-form-advanced`，注册 + `nop-transfer` marker；穿梭选择 + 值映射 focused 单测通过；穿梭 e2e 程序化断言通过。
- [x] `transfer/design.md` §3 收敛 form-advanced；transfer vs select/tree-select 边界写入 design。

### Phase 4 - picker（弹层选择字段）

Status: completed
Targets: 新增 `packages/flux-renderers-form-advanced/src/picker-renderer.tsx`；`index.tsx` 注册；`docs/components/picker/design.md`；playground + e2e

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：picker 与 dialog/drawer/table/list 边界裁定 —— picker 是**字段值选择壳**：值 owner = 表单字段；打开态 = 复用既有 dialog/drawer surface owner（pickerDialog 为配置对象，非自由 region，首版）；选择 UI 内部复用 table/list/tree 既有 owner 语义，不重造平行子系统（design §9/§12）。picker 复用 transfer Phase 3 新建的 valueKey/labelKey 归一化 helper + dialog/drawer surface，通过 handle 对外（design §8）。裁定写入 design §1/§12。
- [x] **Decision**：pickerDialog 形态裁定 —— 首版 `pickerDialog` 为配置对象（引用 dialog/drawer schema），不开放自由 region（自由 region successor）。写入 design §6。
- [x] **Decision**：picker 句柄裁定 —— picker 的 `open`/`clear` 非 item-op，不复用 `createCompositeFieldHandle`（method-locked addItem/removeItem/moveItem）；经 `useInputComponentHandle`（`use-input-component-handle.ts:18-20` 的 `openMenu`/`clearValue` slot）注册，与既有 input 句柄基座一致，不重造 open/clear 协议。
- [x] **Fix**：实现 picker（只读已选展示 + open 按钮触发 pickerDialog surface；surface 内选择结果经 valueKey/labelKey 归一化 helper → `useFormFieldController` + `currentForm.setValue` 写回；`open`/`clear` 经 `useInputComponentHandle` 的 `openMenu`/`clearValue` slot；`multiple`；pickerDialog 缺失提示），输出 `nop-picker` marker。
- [x] **Fix**：`PickerSchema` + field metadata（`valueKey`/`labelKey`/`pickerDialog`/multiple/required，`label` value-or-region，`onPick` event）+ `RendererDefinition` 合入注册。
- [x] **Proof**：focused 单测 —— open→surface→选择→写回、clear、multiple/single、valueKey/labelKey 映射 + 缺失降级、pickerDialog 缺失提示、disabled/readOnly、handle open/clear 可调用。
- [x] **Proof**：playground 演示页（pickerDialog 引用 dialog + 内嵌 table/list 选择）+ e2e（程序化断言：open→选择→已选值更新、clear→清空）。

Exit Criteria:

- [x] picker 落地于 `flux-renderers-form-advanced`，注册 + `nop-picker` marker；open/select/clear 写回 focused 单测通过；弹层选择 e2e 程序化断言通过。
- [x] `picker/design.md` §3 收敛 form-advanced；picker vs dialog/drawer/table 边界 + pickerDialog 配置对象裁定写入 design。

## Draft Review Record

> 由独立子 agent（fresh session，不复用起草者上下文）审阅，两轮达成共识（零 Blocker/Major）。

- Reviewer / Agent: fresh sub-agent round 1（`ses_107ab964a...` general）+ round 2（`ses_1079e0d7...` general）
- Verdict: `pass`（round 2）
- Rounds: 2
- Findings addressed:
  - **Major 1（句柄基座）→ resolved**：round 1 指出 plan 误称 input-table 可注册 `addRow/removeRow/moveRow`、picker `open/clear` 经 `useCompositeFieldHandle`，但 `flux-runtime/src/composite-field-handle.ts:3` 硬编码 `addItem|removeItem|moveItem`（switch default 抛错）、`use-composite-field-handle.ts:16-18` 仅接受这 3 callback。修正：input-table 复用 canonical `addItem/removeItem/moveItem`（design §8 addRow/removeRow/moveRow 为概念别名），picker 经 `useInputComponentHandle`（`use-input-component-handle.ts:18,20` openMenu/clearValue slot）；plan 显式声明不扩展/泛化句柄工厂。round 2 经 live repo 复验 `resolved`。
  - **Major 2（valueKey/labelKey）→ resolved**：round 1 指出 plan 误称复用 select 的 valueKey/labelKey 映射，但 `flux-renderers-form/src` 零 valueKey/labelKey、`schemas.ts:39 SelectOptionSchema` 固定 `{label,value}`。修正：transfer/picker 在 form-advanced 内新建最小 valueKey/labelKey 归一化 helper（候选项→统一 {label,value}），不再声称复用 select；Current Baseline/Goals/Phase 3/4/Closure Gates 同步。round 2 经 grep 复验 `resolved`。
  - **Minors → resolved**：M1 Targets 路径 `composite-schemas.ts`→`composite-field/composite-schemas.ts`（Phase 1/2）；M2 `array-editor.tsx:22-30`→`:21-30`；M3 Related 行 picker 句柄措辞对齐 `useInputComponentHandle`。round 2 复验全 `resolved`。
  - round 2 fresh-look 未发现新 Blocker/Major；picker 经 `useInputComponentHandle` 的 getFocusTarget/isVisible/isInteractive 可自然提供（picker 为可见字段输入 + trigger 元素），`InputHandleMethod` 含 `'open'/'clear'` 与 design §8 `component:open/clear` 精确匹配。

## Closure Gates

- [x] combo/picker/transfer/input-table 4 个 renderer 落地于 `flux-renderers-form-advanced` 并随 `registerFormAdvancedRenderers` 注册（`formAdvancedRendererDefinitions` 含 4 项 + 导出），各输出 marker。
- [x] combo/input-table 复用 staged owner（append/remove/move + 子字段 validation，canonical addItem/removeItem/moveItem handle），transfer/picker 新建 valueKey/labelKey 归一化 helper + 复用既有 dialog/drawer surface（picker handle 经 useInputComponentHandle）；边界裁定写入 4 份 design §1/§12。
- [x] 4 份 design.md §3 归属 drift 收敛为 form-advanced。
- [x] roadmap W4c 标 `done` + amis-baseline-matrix 4 组件 `targetContract→runtime`（L149-152）。
- [x] 每个组件 focused 单测 + playground 演示页（注册 playground 路由）+ e2e（关键交互路径程序化断言）齐备。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### combo 远程 items loader

- Classification: `optimization candidate`
- Why Not Blocking Closure: design §9 标注初值/重复项可由表达式驱动；首版聚焦静态 `items`/`itemSchema` + 表达式初值，远程候选集走 data-source 请求下沉层，不影响 combo 字段编辑契约成立。
- Successor Required: `no`（按需启动时独立评估，走 data-source composition）

### transfer/picker 大量数据虚拟滚动

- Classification: `optimization candidate`
- Why Not Blocking Closure: 候选集首版聚焦常规量级；虚拟滚动属性能增强，不影响"候选↔已选"值契约成立。
- Successor Required: `no`

### picker 自由 pickerDialog region 模板

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 首版 pickerDialog 为配置对象（复用 dialog/drawer schema），已兑现"弹层选择写回"契约；自由 region 模板属扩展。
- Successor Required: `no`

### input-table 列拖拽 / 列宽自定义 / 合并单元格

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design §11 标注行编辑 + 列定义为首版；列级高级交互不影响表格型字段编辑契约成立。
- Successor Required: `no`

## Non-Blocking Follow-ups

- combo/input-table 若后续出现第三/第四种重复项编辑器，可把 `array-editor.tsx` 的 pendingFocus + staged validation helper 推广为共享 `createRepeatedItemEditor` 工具（先观察再抽取，避免过早抽象）。
- transfer 的 `options` 远程 source（经 data-source 请求下沉）可随 data-source X4 增强按需接入。

## Closure

Status Note: 收口完成。4 个 renderer（combo/input-table/transfer/picker）落地于 `flux-renderers-form-advanced` 并随 `registerFormAdvancedRenderers` 注册；combo/input-table 复用 array-field staged owner 内核 + canonical composite handle（addItem/removeItem/moveItem），transfer/picker 新建 valueKey/labelKey 归一化 helper（`option-normalize.ts`）、picker 复用 dialog surface + `useInputComponentHandle`（open/clear）；4 份 design §3 drift 收敛 form-advanced；roadmap W4c 标 done + amis-baseline-matrix 4 组件 runtime/landed。验证全绿（typecheck/build/lint/unit 55+29+29+55 task OK，W4c e2e 8/8）。

Closure Audit Evidence:

- Auditor / Agent: closure-auditor（fresh session `ses_10758a5a7ffe2HAlheCdZnSF11`，independent — 非执行 session）
- Evidence: 4 renderers 注册/导出/marker 复验（`index.tsx:85-88`；combo `:458/159`、input-table `:489`、transfer `:229/314`、picker `:213`）；canonical composite handle 复用未扩展（combo `:385`、input-table `:415`；`composite-field-handle.ts:56-101` method-locked）；picker 经 `useInputComponentHandle` `['open','clear']`（`:163-174`）；`option-normalize.ts` 由 transfer/picker 共享，无 select 协议复制；4 份 design.md §3 drift 修复 + §1/§12 边界；roadmap W4c=done（`roadmap.md:32`）；matrix 4×runtime/landed（L149-152）；schema + fields 覆盖复验；auditor 重跑 88 files/834 unit + 8/8 e2e 全绿。Minor（已修）：input-table 行级 `nop-input-table__row` marker class 已补齐。

Follow-up:

- W4c 为 main roadmap Wave 1–4 收尾；剩余 Follow-up 轨 D1a（designer host bridge projection 未就绪，blocked）与可选项 O1。combo 远程 items loader / transfer 远程 source 可随 data-source 增强按需接入；picker 自由 pickerDialog region 模板、input-table 列拖拽/列宽/合并、transfer/picker 虚拟滚动均为已裁定 deferred（见 Deferred But Adjudicated）。
