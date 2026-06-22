# Select 组件设计

## 1. 组件定位

- `select` 是离散单选或多选字段的基础下拉控件。
- 它负责 option 选择与值绑定，不负责数据查询和分页式远程列表浏览。
- E1a 已补齐：搜索过滤、多选（tag 模式）、clearable、分组 option、虚拟滚动。底层从 `Select` 原语族迁移到 `@nop-chaos/ui` Combobox 原语族（base-ui）。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。Flux 按 `existing-components-improvement-analysis.md` §0.2 原则裁决。E1a 已实现搜索过滤、多选、虚拟滚动、clearable、分组；E3 已实现 option 模板 region。未实现：creatable/editable/removable option、远程异步搜索 debounce（走 data-source 组合层）。
- `placeholder` **已实现**。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 X3 基线（`docs/references/naming-conventions.md` §2/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。`—` 表示该侧无内容。

| 能力                                                                                        | 采纳                                                                                                                   | 不采纳                                                   | 理由                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 单选 + 静态/异步 `options`（`{label,value}` 标准形状）                                      | **实现**：`options`（source-enabled，一次性异步加载）+ `placeholder`/`disabled`/`readOnly`/`required`                  | —                                                        | 当前基线；option 形状对齐 X3 §2（`{label,value}`，不用 amis 值编码）                                                                                                                                                                                                                                |
| 输入搜索过滤                                                                                | **实现**：`searchable` + `filterOption`（shadcn Combobox 命名）；ComboboxInput + 前端 contains 匹配                    | amis 组件级 `autoComplete` SchemaApi 生命周期            | 头号缺口；命名对齐 shadcn/ui Combobox；请求下沉 data-source + action（X3 §1/§3）                                                                                                                                                                                                                    |
| 多选                                                                                        | **实现**：`multiple`（tag 模式渲染选中项，ComboboxChips + ComboboxChip）                                               | amis `checkAll`/`defaultCheckAll`（归 `checkbox-group`） | 多选是 select 核心能力；全选语义归离散多选集合字段（checkbox-group）                                                                                                                                                                                                                                |
| `clearable` 清空                                                                            | **实现**：`clearable`（明确布尔，对齐 shadcn）；searchable 用 ComboboxInput showClear，non-searchable 用 ComboboxClear | —                                                        | 命名对齐 X3 §2（肯定式布尔）                                                                                                                                                                                                                                                                        |
| 虚拟滚动（大 option 集）                                                                    | **实现**：`virtual` + `@tanstack/react-virtual`（option 数 > 100 时虚拟化 ComboboxList）                               | —                                                        | 大 option 集性能                                                                                                                                                                                                                                                                                    |
| 分组 option                                                                                 | **实现**：`groups: { label: string; options: SelectOptionSchema[] }[]`（与 `options` 互斥）                            | amis `children` 混合扁平编码                             | 命名对齐 X3 §4.3（不用 amis 扁平编码）                                                                                                                                                                                                                                                              |
| option 模板渲染                                                                             | **实现**：`optionTemplate`（受控 region，`params: ['option', 'index']`，per-option scope 绑定）                        | —                                                        | 选用受控 region（非函数型 slot）：`loop` renderer 证明 Flux region 编译通道支持 per-item scope 绑定（`props.regions.body.render({ bindings })` + `$slot` frame），允许任意 schema 内容（icon/描述/双行/嵌套文本）；`ComboboxItem value={option}` 选中值匹配契约不变；缺省回退 `option.label` 纯文本 |
| 远程异步搜索（debounce）                                                                    | **实现（入口预留）**：`filterOption: false` 禁用前端过滤；搜索关键字驱动 data-source 刷新属组合层                      | amis 组件级 `api`/`initFetch`                            | 请求下沉 data-source + action（X3 §1/§3）                                                                                                                                                                                                                                                           |
| `creatable`/`editable`/`removable` option                                                   | **暂不实现**                                                                                                           | —                                                        | 场景窄，后续按需                                                                                                                                                                                                                                                                                    |
| amis 多模式 `selectMode`（table/group/tree/chained/associated）                             | —                                                                                                                      | **不采纳**                                               | 多模式归 tree-select/picker/transfer 等独立组件，不塞进 select（X3 §1 "核心已简化"）                                                                                                                                                                                                                |
| amis 值编码 `valueField`/`labelField`/`joinValues`/`extractValue`/`delimiter`/`simpleValue` | —                                                                                                                      | **不采纳**                                               | 用 shadcn `{label,value}` 标准形状；如需扩展按命名规范单独立项（X3 §3）                                                                                                                                                                                                                             |
| amis 皮肤/双实现 `borderMode`/`overlay`/`mobileUI`/`hideSelected`/`showInvalidMatch`        | —                                                                                                                      | **不采纳**                                               | amis 皮肤变体/双实现坏设计；移动端走响应式（见 mobile-roadmap，X3 §3）                                                                                                                                                                                                                              |

## 3. Flux 中的 renderer/type 定义

- `type: 'select'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`，`options` 为 `prop + allowSource`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 继承 `InputSchema` 并增加 `options`。
- E1a 补齐字段（命名对齐 shadcn/ui Combobox，X3 §2；不采纳 amis `joinValues`/`extractValue`/`selectMode` 等命名，见 §2 决策表）：
  - `multiple?: boolean`（肯定式布尔；多选 tag 模式）
  - `searchable?: boolean`（肯定式布尔；popup 内输入过滤）
  - `clearable?: boolean`（肯定式布尔；清空按钮）
  - `filterOption?: boolean | { ignoreCase?: boolean }`（默认随 `searchable: true` 开启；`false` 禁用前端过滤用于远程搜索场景）
  - `searchPlaceholder?: string`
  - `noResultsText?: string`（默认 "无匹配项"）
  - `groups?: { label: string; options: SelectOptionSchema[] }[]`（与 `options` 互斥；不用 amis `children` 扁平编码，X3 §4.3）
  - `virtual?: boolean`（option 数超阈值时虚拟滚动）
  - `SelectOptionSchema.value` 放宽为 `string | number | boolean`（与 `sanitizeChoiceOptions` 实际行为对齐）
  - `SelectOptionSchema.disabled?: boolean`
  - `optionTemplate?: BaseSchema[]`（受控 region，E3 落地）：per-option 自定义展示。声明 `params: ['option', 'index']`，region 内通过 `${$slot.option.label}`、`${$slot.option.value}`、`${$slot.index}` 等引用当前 option 数据；region 子节点可为任意 schema（icon / 描述 / 双行 / 嵌套文本）。未声明时回退渲染 `option.label` 纯文本（无回归）。兼容 `groups`（per-group option 仍走同一 region）、`virtual`（虚拟项随滚动挂载/卸载，自定义内容随之挂载）、`multiple`（选中值匹配走 `ComboboxItem value={option}` 契约，与 region 内容解耦）。
- `placeholder` 已实现。

## 5. 字段分类

- `label`: `value-or-region`
- `options`: `value`，允许 source-enabled value
- `groups`: `value`
- `optionTemplate`: `region`（`params: ['option', 'index']`）
- `placeholder`、`multiple`、`searchable`、`clearable`、`filterOption`、`searchPlaceholder`、`noResultsText`、`virtual`: `value`

## 6. regions 与 slot 约定

- option-level region（`optionTemplate`）已由 E3 落地：受控参数化 region（`params: ['option', 'index']`），通过 `props.regions.optionTemplate.render({ bindings: { option, index } })` per-option 调用，子节点通过 `$slot` frame 引用 option 数据。这是「在 renderer adapter 层转换」的形态——region 由编译通道预编译、renderer 控制调用时机与 scope 绑定，**不是**把 schema 直接暴露为函数型 slot。
- trigger（选中后展示位）自定义渲染仍未开放（归后续按需评估）。
- 如果未来需要 trigger 自定义渲染，应在 renderer adapter 层转换，而不是把 schema 直接暴露为函数型 slot。

## 7. 运行期状态归属

- 当前选中值归 form runtime 或 scope。
- 打开态、搜索关键字等纯 UI 状态归本地组件状态，不应默认写入表单。

## 8. 事件、动作与组件句柄能力

- 标准 `onChange` 由 field 交互自然触发。
- X1 起落地 `component:clear`/`focus`/`open` handle（收口 E1a deferred）。renderer definition 已发布 `componentCapabilityContracts`：
  - `clear`：清空选中（单选 → `undefined`，多选 → `[]`）。
  - `focus`：focus trigger 元素（ComboboxTrigger/ComboboxInput）。
  - `open`：focus trigger + 打开 dropdown menu（controlled `open` state 驱动 base-ui Combobox）。
- 详见 `docs/references/component-handle-vocabulary.md`。

## 9. 数据源、表达式、导入能力接入点

- `options` 已是 source-enabled field，是当前表单族里最明确的数据源入口之一。
- 真正的远程请求、依赖注入和缓存仍应遵循统一 `data-source`/API 语义。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-select-wrapper` marker and `data-slot="select-wrapper"` marker.
- E1a 后 renderer 使用 `@nop-chaos/ui` Combobox 原语族（base-ui）：`Combobox`/`ComboboxTrigger`/`ComboboxValue`（non-searchable）/`ComboboxInput`（searchable）/`ComboboxChips`+`ComboboxChip`（multiple）/`ComboboxContent`/`ComboboxList`/`ComboboxItem`/`ComboboxGroup`+`ComboboxLabel`（分组）/`ComboboxEmpty`/`ComboboxClear`。
- loading 态保留 `data-slot="select-loading"`（role=status）；error 态保留 `data-slot="select-error"`（role=alert）。
- 不再使用 `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`（已迁移到 Combobox）。
- 视觉层复用 `@nop-chaos/ui` Combobox，不再引入第二套 mode 命名。

## 11. 实现拆分建议

- option 归一化（`sanitizeChoiceOptions`/`sanitizeChoiceGroups`）、source state 展示、field chrome、虚拟滚动（`VirtualizedComboboxList`/`StaticComboboxList`）已分离。
- searchable 过滤逻辑在 renderer 内（`matchChoiceLabel` + `filterOption` 配置），不走 base-ui 内建 filter（自行控制以保证 `filterOption: false` 远程搜索场景）。

## 12. 风险、取舍与后续阶段

- 多选、搜索和远程源一旦混在一起，很容易使契约过宽；文档需要持续强调"单一 value 字段 + 明确 option 输入"原则。
- Combobox 迁移后，`SelectOptionSchema.value` 从 `string` 放宽为 `string | number | boolean`；renderer 内部以 `Object.is` 匹配 option，不需 amis 值编码。
- 虚拟滚动（`virtual: true`）对 base-ui Combobox 的键盘导航有影响：仅可见 option 参与导航（scroll 后其余 option 进入 DOM）。对 < 100 option 的场景无影响（走 `StaticComboboxList`）。
- option 模板 region（`optionTemplate`）已由 E3 落地：受控参数化 region，per-option scope 绑定，`ComboboxItem value={option}` 选中值匹配契约不变。虚拟滚动 + region 兼容（自定义内容随虚拟项挂载/卸载，见 Failure Path `option-template-virtual-compat`）；region 编译失败时回退 `option.label` 纯文本（Failure Path `option-template-region-compile-fail`）。
