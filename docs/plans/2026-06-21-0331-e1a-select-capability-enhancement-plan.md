# E1a Select 能力补齐

> Plan Status: completed
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E1a）、`docs/components/existing-components-improvement-analysis.md` §1.2/§2.6、`docs/components/select/design.md`、live-repo audit（select renderer + `@nop-chaos/ui` Combobox/Select 原语）
> Related: X3 `docs/references/naming-conventions.md`（done）、X5 select Flux 决策表（done）、E0a-E0d/X3/X5 已 done

## Purpose

把 `select` 从当前仅支持单选 + 静态/异步 `options` 的基线，补齐为支持 **搜索过滤、多选（tag 模式）、clearable、分组 option、大 option 集虚拟滚动** 的完整离散选择控件。命名对齐 shadcn/ui Combobox 体系（X3 §2），不采纳 amis `selectMode`/`joinValues`/`extractValue` 等值编码（X3 §3）。

## Current Baseline

经 live-repo audit（2026-06-21），当前 `select` 基线：

- **Schema**：`SelectSchema` 仅声明 `options?: SelectOptionsValue`（`packages/flux-renderers-form/src/schemas.ts:53-55`）。`SelectOptionSchema` 形状为 `{ label: string; value: string }`（L9-13），无 `disabled`/`group` 字段。
- **Renderer**：`SelectRenderer`（`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:100-164`）使用 `@nop-chaos/ui` **Select** 原语族（`Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`），**非** NativeSelect、**非** Combobox。
- **已实现**：单选、placeholder、disabled/readOnly/required、source-enabled `options`（异步加载 + loading/error 态）、aria 语义。
- **未实现（全部 "not declared at all"）**：`multiple`、`searchable`、`clearable`、`filterOption`、虚拟滚动、分组 option。这些在 `SelectSchema` 中无字段，renderer 中无代码路径。
- **UI 原语可用性**：`@nop-chaos/ui` `Combobox` 原语族（`packages/ui/src/components/ui/combobox.tsx`，268 行）已提供 multiple（`ComboboxChips`/`ComboboxChip`/`ComboboxChipRemove`）、searchable（`ComboboxInput`）、clearable（`ComboboxClear` + `ComboboxInput.showClear`）、grouped（`ComboboxGroup`/`ComboboxLabel`）的一等支持。已在 `condition-builder/field-select.tsx` 有真实使用先例。**虚拟滚动是唯一缺失原语**：`ComboboxList` 是普通 `<ul>`，无 virtualization。
- **测试**：无 dedicated `select-renderer` 测试文件。现有覆盖散布在 `input-source-state.test.tsx`（source error/loading/required）、`form-renderer-definition-contracts.test.ts`（renderer def）、`form-validation-rules.test.tsx`（校验载体）。

## Goals

- `select` 支持 `searchable`（Combobox 输入过滤 + 高亮）、`multiple`（tag 模式渲染选中项）、`clearable`、分组 option、大 option 集虚拟滚动。
- 所有新增字段命名对齐 X3 基线（shadcn 肯定式布尔、`{label,value}` 标准形状）。
- `select/design.md` Flux 决策表中标记 "计划实现（E1a）" 的行全部翻转为 "实现"，附实现证据。
- 每个 E1a 能力配有 focused 单测（建议有测档位）。

## Non-Goals

- `creatable`/`editable`/`removable` option（决策表标 "暂不实现"，场景窄）。
- amis 多模式 `selectMode`（table/group/tree/chained）——决策表 "不采纳"，归 tree-select/picker/transfer。
- amis 值编码（`valueField`/`labelField`/`joinValues`/`extractValue`/`delimiter`）——决策表 "不采纳"。
- 移动端响应式（归 `mobile-roadmap.md`）。
- option-level 自定义 region 渲染（design.md §6 首版不开放；option 模板渲染标 "计划实现（E1a）" 但降级为 follow-up，见 Deferred）。

## Scope

### In Scope

- `SelectSchema` 新增字段：`multiple`、`searchable`、`clearable`、`filterOption`、`searchPlaceholder`、`noResultsText`、`groups`（或嵌套 options 分组）。
- `SelectOptionSchema` 扩展：`disabled?: boolean`。
- Renderer 迁移到 `@nop-chaos/ui` Combobox 原语族（统一 single + multiple + searchable 路径）。
- 虚拟滚动：option 数超阈值时对 `ComboboxList` 应用 `@tanstack/react-virtual`。
- Focused 单测覆盖每个新能力。
- `select/design.md` 决策表翻转 + 语义节补齐。

### Out Of Scope

- `component:focus`/`component:open` 句柄（design.md §8 "后续可考虑"，归 X1）。
- 远程异步搜索 debounce（走 data-source，已有 `optionsSourceState`；搜索关键字驱动 data-source 刷新是组合层职责，不在 select renderer 开 api 短路径）。
- option 模板 region（见 Deferred）。

## Failure Paths

| 场景                        | 触发                                 | 行为                                                      | 可重试                   | 用户可见表现 |
| --------------------------- | ------------------------------------ | --------------------------------------------------------- | ------------------------ | ------------ |
| searchable + 无匹配 option  | 输入关键字无命中                     | 渲染 `ComboboxEmpty` + `noResultsText`（默认 "无匹配项"） | 否（用户修改输入即刷新） | 空态文案     |
| multiple + 已达上限         | （未来 maxSelected，本 plan 不引入） | —                                                         | —                        | —            |
| 大 option 集 + 未开虚拟滚动 | option 数超阈值但未声明 virtual      | 全量渲染（性能退化但不报错）                              | 否                       | 可能卡顿     |
| source 加载中 + searchable  | `optionsSourceState.loading`         | Combobox 内容区显示 loading 态                            | 是（source 重试）        | loading 指示 |

## Test Strategy

档位选择：`建议有测`

本档选择：建议有测。select 是 P0 核心选择控件，但本次为能力补齐（非 auth/API 契约/流控），focused 单测覆盖每个新能力的 happy path + 边界即可。

## Execution Plan

### Phase 1 - Schema 契约 + 命名裁定

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`docs/components/select/design.md`

- Item Types: `Decision | Proof`

- [x] 裁定新增字段最终命名与形状（以下为提案，Phase 1 终裁）：
  - `multiple?: boolean`（肯定式布尔，X3 §4.1）
  - `searchable?: boolean`（肯定式布尔）
  - `clearable?: boolean`（肯定式布尔）
  - `filterOption?: boolean | { ignoreCase?: boolean }`（默认随 `searchable: true` 开启；`false` 禁用前端过滤用于远程搜索场景）
  - `searchPlaceholder?: string`
  - `noResultsText?: string`
  - 分组方案裁定：采用 `groups?: { label: string; options: SelectOptionSchema[] }[]`（与 `options` 互斥；不用 amis `children` 扁平编码，X3 §4.3）
  - `SelectOptionSchema` 扩展 `disabled?: boolean`
  - 值类型扩展：`SelectOptionSchema.value` 从 `string` 放宽为 `string | number | boolean`（与 renderer `sanitizeChoiceOptions` 实际行为对齐）
- [x] 将以上字段写入 `SelectSchema` / `SelectOptionSchema`，字段分类标注 `value`（进入 `props` 通道）。
- [x] 在 `input.tsx` renderer definition 中注册新字段（`fields: [..., { key: 'multiple', kind: 'prop' }, ...]`）。
- [x] `select/design.md` §4 schema 设计节补齐新字段；§5 字段分类同步。

Exit Criteria:

- [x] `SelectSchema` 与 `SelectOptionSchema` 的 TypeScript 类型声明可在 `schemas.ts` 中被 import 且 `pnpm --filter @nop-chaos/flux-renderers-form typecheck` 通过。
- [x] `select/design.md` 的 schema/字段分类节与新类型一致。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Combobox 迁移：searchable + clearable + 分组（单选）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`

- Item Types: `Fix | Proof`

> 前置：Phase 1 schema 已落地。本 Phase 把单选路径从 `Select` 原语迁移到 `Combobox` 原语族，同时引入 searchable/clearable/分组。

- [x] 将 `SelectRenderer` 的渲染从 `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` 迁移到 `Combobox`/`ComboboxTrigger`(或 `ComboboxInput` 当 searchable)/`ComboboxContent`/`ComboboxList`/`ComboboxItem`。
- [x] `searchable: true` 时渲染 `ComboboxInput`（含搜索过滤），前端默认 contains 匹配（`filterOption` 不为 `false` 时）。
- [x] `clearable: true` 时渲染 `ComboboxClear`（或 `ComboboxInput.showClear`）。
- [x] `groups` 声明时渲染 `ComboboxGroup` + `ComboboxLabel`。
- [x] 无匹配时渲染 `ComboboxEmpty` + `noResultsText`。
- [x] 保持现有 source-enabled `options` + loading/error 态行为不变（`optionsSourceState` 透传到 Combobox loading）。
- [x] 保持现有 `nop-select-wrapper` marker + `data-slot="select-wrapper"`。
- [x] 保持 aria 语义（aria-invalid/describedby/errormessage/required）。

Exit Criteria:

- [x] `searchable: true` 时可在 popup 内输入关键字过滤 option，匹配高亮，无匹配显示 `noResultsText`。
- [x] `clearable: true` 时有清空按钮，点击后值清空为 `undefined`。
- [x] `groups` 声明时 option 按分组渲染，带组标题。
- [x] 现有单选 + 静态/异步 options 行为不退化（focused 回归测试通过）。
- [x] `select/design.md` 决策表中 searchable/clearable/分组行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Multiple 多选（tag 模式）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`

- Item Types: `Fix | Proof`

- [x] `multiple: true` 时切换值适配器为数组适配器（`stringValueAdapter` → `selectMultipleAdapter` 等效）。
- [x] 渲染 `ComboboxChips` + `ComboboxChip` + `ComboboxChipRemove`（tag 模式，选中项以 chip 展示，可单独移除）。
- [x] `Combobox` Root 传 `multiple` prop。
- [x] multiple + searchable 共存验证（搜索过滤 + 多选 tag）。
- [x] multiple + clearable 共存验证（清空所有选中）。
- [x] multiple + groups 共存验证。

Exit Criteria:

- [x] `multiple: true` 时选中值以 tag 渲染，每个 tag 有移除按钮；值绑定为数组。
- [x] multiple + searchable/clearable/groups 可组合使用，无冲突。
- [x] `select/design.md` 决策表中 multiple 行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - 虚拟滚动（大 option 集）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`（或提取 helper）

- Item Types: `Fix | Proof`

> `ComboboxList` 当前是普通 `<ul>`，无 virtualization。复用 table 已有的 `@tanstack/react-virtual`（workspace 已有依赖）对 ComboboxList 内容做虚拟化。

- [x] 引入虚拟滚动阈值（`virtualThreshold = 100`；select 级 `virtual?: boolean` 字段在 Phase 1 已裁定）。
- [x] option 数超阈值时，`ComboboxList` 内部用 `useVirtualizer` 渲染可见 option + spacer。
- [x] 搜索过滤后若结果仍超阈值，虚拟滚动继续生效。
- [x] 与 multiple/searchable/分组共存验证。

Exit Criteria:

- [x] option 数 > 阈值时 DOM 中仅渲染可见 option（可通过 `page.evaluate()` 查 `ComboboxItem` 数量验证）。
- [x] 滚动 + 搜索 + 多选组合下虚拟滚动不 break。
- [x] `select/design.md` 决策表中虚拟滚动行翻转为 "实现"。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 5 - 测试 + design.md 收口

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/select-enhancements.test.tsx`（新建）、`docs/components/select/design.md`

- Item Types: `Proof | Follow-up`

- [x] 新建 dedicated `select-enhancements.test.tsx`，覆盖：searchable 过滤 + 高亮、clearable 清空、multiple tag 渲染 + 移除、groups 分组渲染、虚拟滚动 DOM 节点数、source loading/error 态不退化。
- [x] 补齐 negative case：`searchable: false` 时不渲染 input、`multiple: false` 时值为 string 非 array、`filterOption: false` 时不过滤。
- [x] `select/design.md` §2 Flux 决策表所有 "计划实现（E1a）" 行翻转为 "实现"；§10 样式 marker 节同步（Combobox 迁移后的 marker/data-slot）；§12 风险节更新。
- [x] `amis-baseline-matrix.md` select 行无 retained 决策变化则标注 No update required。

Exit Criteria:

- [x] `select-enhancements.test.tsx` 全部通过。
- [x] `select/design.md` 决策表 E1a 行全部为 "实现"，无残留 "计划实现"。
- [x] `docs/logs/` 对应日期条目已更新。

## Draft Review Record

> 待 REVIEW_PLANS 步骤由独立子 agent 填写。

## Closure Gates

- [x] searchable 过滤 + 高亮已实现且有 focused test
- [x] multiple tag 模式已实现且有 focused test
- [x] clearable 已实现且有 focused test
- [x] 分组 option 已实现且有 focused test
- [x] 虚拟滚动已实现且有 focused test
- [x] 不存在被静默降级到 deferred 的 in-scope 能力
- [x] `select/design.md` 决策表 E1a 行全部翻转为 "实现"
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### option 模板 region（自定义 option 展示）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 决策表标 "计划实现（E1a）：受控 option label region"，但当前 `SelectOptionSchema` 的 `label` 已承载文本展示；自定义模板（icon/描述/双行）场景窄，且需要 region 编译通道支持，复杂度高于 E1a 核心能力（search/multiple/clearable/virtual/group）。
- Successor Required: yes
- Successor Path: 后续按需启动的 option-template plan（或归 E3 P2 批）。

### 远程异步搜索 debounce

- Classification: `optimization candidate`
- Why Not Blocking Closure: `options` 已是 source-enabled field（`allowSource: true` + `optionsSourceState`）。远程搜索 = 搜索关键字驱动 data-source 刷新，属组合层（data-source + action）职责，不在 select renderer 开 api 短路径（X3 §1/§3）。`filterOption: false` 为远程搜索场景预留了"禁用前端过滤"入口。
- Successor Required: no
- Successor Path: 无独立 successor；由 data-source + action 组合覆盖。

## Non-Blocking Follow-ups

- `component:focus`/`component:open` 句柄归 X1（doAction 命令族统一）。
- `maxSelected`/`minSelected`（多选数量限制）若未来需要，归后续增强。

## Closure

Status Note: All 5 Phases executed and verified; all code + doc changes landed. Independent closure audit (fresh session) re-walked live repo and confirmed each Phase's exit criteria against actual code/docs, not just checklist marks. Plan can be closed: no remaining plan-owned in-scope work; option 模板 region and 远程异步搜索 debounce are honestly deferred with explicit non-blocking rationale.

Closure Audit Evidence:

- Reviewer / Agent: independent closure-audit sub-agent (fresh session, distinct from implementer session)
- Evidence:
  - Phase 1 verified live: `packages/flux-renderers-form/src/schemas.ts:9-22,60-70` declares `SelectOptionSchema.disabled`, `SelectOptionSchema.value: string | number | boolean`, `SelectOptionGroup`, and `SelectSchema.{multiple,searchable,clearable,filterOption,searchPlaceholder,noResultsText,groups,virtual}`. `select/design.md` §4/§5 reflect the same fields.
  - Phase 2 verified live: `input-choice-renderers.tsx:248-419` `SelectRenderer` uses `Combobox`/`ComboboxTrigger`/`ComboboxValue` (non-searchable), `ComboboxInput`+`showClear` (searchable+clearable), `ComboboxGroup`+`ComboboxLabel` (groups), `ComboboxEmpty`+`noResultsText`. `nop-select-wrapper` + `data-slot="select-wrapper"` markers retained; aria props preserved in `controlProps`. `select/design.md` §2 decision table searchable/clearable/分组 rows flipped to "实现".
  - Phase 3 verified live: `selectMultipleAdapter` (`input-choice-renderers.tsx:50-59`) + `ComboboxChips`/`ComboboxChip`/`ComboboxChipsInput` rendered when `multiple: true` (`input-choice-renderers.tsx:349-361`); `multiple` prop forwarded to `Combobox` Root. `select/design.md` §2 multiple row flipped to "实现".
  - Phase 4 verified live: `useVirtualizer` imported from `@tanstack/react-virtual`; `VirtualizedComboboxList` (`input-choice-renderers.tsx:197-246`) renders only visible items with absolute-positioned spacer; `virtualThreshold = 100` gates activation (`input-choice-renderers.tsx:269,286`). `select/design.md` §2 虚拟滚动 row flipped to "实现".
  - Phase 5 verified live: `packages/flux-renderers-form/src/__tests__/select-enhancements.test.tsx` (417 lines, 15 cases) covers searchable filter/highlight/noResultsText/filterOption:false negative, clearable single-searchable, multiple chip render + array binding + single-string negative, groups label render, virtual DOM node count (mocked useVirtualizer) + virtual:false full render, source loading/error regression, disabled option aria-disabled. `select/design.md` §1/§2/§10/§11/§12 fully updated; no residual "计划实现（E1a）" rows.
  - `docs/logs/2026/06-21.md` E1a entry records all 5 Phases + owner-doc sync + verification (typecheck 49/49, build 26/26, lint 26/26, test 49 tasks).
  - Anti-hollow check: new code paths are reachable at runtime — `SelectRenderer` is the registered `select` renderer; `VirtualizedComboboxList`/`StaticComboboxList` are called from the render body; `selectMultipleAdapter` is selected when `multiple: true`. No empty bodies, no swallowed exceptions, no registered-but-unreachable components.
  - Deferred honesty: option 模板 region (`out-of-scope improvement`, successor required) and 远程异步搜索 debounce (`optimization candidate`, no successor — covered by data-source composition) are genuinely non-blocking; no in-scope live defect or contract drift hidden in deferred/follow-up.

Follow-up:

- option 模板 region (deferred — see Deferred But Adjudicated).
- 远程异步搜索 debounce (covered by data-source + action composition; `filterOption: false` is the entry hook).
- `component:focus`/`component:open` 句柄归 X1.
- `maxSelected`/`minSelected` 若未来需要归后续增强.
