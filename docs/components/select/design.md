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

| 能力                                                                                        | 采纳                                                                                                                        | 不采纳                                                   | 理由                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 单选 + 静态/异步 `options`（`{label,value}` 标准形状）                                      | **实现**：`options`（source-enabled，一次性异步加载）+ `placeholder`/`disabled`/`readOnly`/`required`                       | —                                                        | 当前基线；option 形状对齐 X3 §2（`{label,value}`，不用 amis 值编码）                                                                                                                                                                                                                                                     |
| 输入搜索过滤                                                                                | **实现**：`searchable` + `filterOption`（shadcn Combobox 命名）；ComboboxInput + 前端 contains 匹配                         | amis 组件级 `autoComplete` SchemaApi 生命周期            | 头号缺口；命名对齐 shadcn/ui Combobox；请求下沉 data-source + action（X3 §1/§3）                                                                                                                                                                                                                                         |
| 多选                                                                                        | **实现**：`multiple`（tag 模式渲染选中项，ComboboxChips + ComboboxChip）                                                    | amis `checkAll`/`defaultCheckAll`（归 `checkbox-group`） | 多选是 select 核心能力；全选语义归离散多选集合字段（checkbox-group）                                                                                                                                                                                                                                                     |
| `clearable` 清空                                                                            | **实现**：`clearable`（明确布尔，对齐 shadcn）；searchable 用 ComboboxInput showClear，non-searchable 用 ComboboxClear      | —                                                        | 命名对齐 X3 §2（肯定式布尔）                                                                                                                                                                                                                                                                                             |
| 虚拟滚动（大 option 集）                                                                    | **实现**：`virtual` + `@tanstack/react-virtual`（option 数 > 100 时虚拟化 ComboboxList）                                    | —                                                        | 大 option 集性能                                                                                                                                                                                                                                                                                                         |
| 分组 option                                                                                 | **实现**：`groups: { label: string; options: SelectOptionSchema[] }[]`（与 `options` 互斥）                                 | amis `children` 混合扁平编码                             | 命名对齐 X3 §4.3（不用 amis 扁平编码）                                                                                                                                                                                                                                                                                   |
| option 模板渲染                                                                             | **实现**：`optionTemplate`（受控 region，`params: ['option', 'index']`，per-option scope 绑定）                             | —                                                        | 选用受控 region（非函数型 slot）：`loop` renderer 证明 Flux region 编译通道支持 per-item scope 绑定（`props.regions.body.render({ bindings })` + `$slot` frame），允许任意 schema 内容（icon/描述/双行/嵌套文本）；`ComboboxItem value={option}` 选中值匹配契约不变；缺省回退 `option.label` 纯文本                      |
| 远程异步搜索（debounce）                                                                    | **实现（入口预留）**：`filterOption: false` 禁用前端过滤；搜索关键字驱动 data-source 刷新属组合层                           | amis 组件级 `api`/`initFetch`                            | 请求下沉 data-source + action（X3 §1/§3）。**B4.1 / S4 裁定**：select renderer 不内置 `searchSource`（远程搜索显式归组合层）；value 为真值源、option 刷新不丢底层值（仅影响 echo=S3）。需 renderer 内置搜索时 redirect tree-select/picker（已有 `searchSource`/lazy 能力）或拆 successor feature plan（镜像 input-tree） |
| echo-fallback（值无匹配 option 时的显示）                                                   | **实现**：值无匹配 option 时 trigger/chip 降级渲染原始值字符串（single 可用 `noMatchText` 覆盖）；multi 不丢 primitive 显示 | amis `showInvalidMatch`（皮肤级，不采纳）                | **B4.1 / S3**：确认 live 缺陷（trigger 空白）已 Fix；底层值不变，仅影响显示（见 §7 echo-fallback 契约）                                                                                                                                                                                                                  |
| `creatable`/`editable`/`removable` option                                                   | **暂不实现**                                                                                                                | —                                                        | 场景窄，后续按需                                                                                                                                                                                                                                                                                                         |
| amis 多模式 `selectMode`（table/group/tree/chained/associated）                             | —                                                                                                                           | **不采纳**                                               | 多模式归 tree-select/picker/transfer 等独立组件，不塞进 select（X3 §1 "核心已简化"）                                                                                                                                                                                                                                     |
| amis 值编码 `valueField`/`labelField`/`joinValues`/`extractValue`/`delimiter`/`simpleValue` | —                                                                                                                           | **不采纳**                                               | 用 shadcn `{label,value}` 标准形状；如需扩展按命名规范单独立项（X3 §3）                                                                                                                                                                                                                                                  |
| amis 皮肤/双实现 `borderMode`/`overlay`/`mobileUI`/`hideSelected`/`showInvalidMatch`        | —                                                                                                                           | **不采纳**                                               | amis 皮肤变体/双实现坏设计；移动端走响应式（见 mobile-roadmap，X3 §3）                                                                                                                                                                                                                                                   |

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
  - `noMatchText?: string`（B4.1 / S3）：single 值无匹配 option 时，trigger 降级显示的文案；缺省渲染原始值字符串 `String(value)`。multi 不受影响（chip 仍用原始值字符串以区分多项）。详见 §7 echo-fallback 契约。
  - `SelectOptionSchema.value` 放宽为 `string | number | boolean`（与 `sanitizeChoiceOptions` 实际行为对齐）
  - `SelectOptionSchema.disabled?: boolean`
  - `optionTemplate?: BaseSchema[]`（受控 region，E3 落地）：per-option 自定义展示。声明 `params: ['option', 'index']`，region 内通过 `${$slot.option.label}`、`${$slot.option.value}`、`${$slot.index}` 等引用当前 option 数据；region 子节点可为任意 schema（icon / 描述 / 双行 / 嵌套文本）。未声明时回退渲染 `option.label` 纯文本（无回归）。兼容 `groups`（per-group option 仍走同一 region）、`virtual`（虚拟项随滚动挂载/卸载，自定义内容随之挂载）、`multiple`（选中值匹配走 `ComboboxItem value={option}` 契约，与 region 内容解耦）。
- `placeholder` 已实现。

## 5. 字段分类

- `label`: `value-or-region`
- `options`: `value`，允许 source-enabled value
- `groups`: `value`
- `optionTemplate`: `region`（`params: ['option', 'index']`）
- `placeholder`、`multiple`、`searchable`、`clearable`、`filterOption`、`searchPlaceholder`、`noResultsText`、`noMatchText`、`virtual`: `value`

## 6. regions 与 slot 约定

- option-level region（`optionTemplate`）已由 E3 落地：受控参数化 region（`params: ['option', 'index']`），通过 `props.regions.optionTemplate.render({ bindings: { option, index } })` per-option 调用，子节点通过 `$slot` frame 引用 option 数据。这是「在 renderer adapter 层转换」的形态——region 由编译通道预编译、renderer 控制调用时机与 scope 绑定，**不是**把 schema 直接暴露为函数型 slot。
- trigger（选中后展示位）自定义渲染仍未开放（归后续按需评估）。
- 如果未来需要 trigger 自定义渲染，应在 renderer adapter 层转换，而不是把 schema 直接暴露为函数型 slot。

## 7. 运行期状态归属

- 当前选中值归 form runtime 或 scope。
- 打开态、搜索关键字等纯 UI 状态归本地组件状态，不应默认写入表单。
- **echo-fallback 契约（B4.1 / S3）**：trigger 显示派生自 form/scope 的当前值（真值源），而非 option 列表的交集。当值已设置但当前 `options`/`groups` 无匹配项时（async 未加载、option 被替换/过滤、外部 set了一个不在 option 集内的值），single trigger 降级渲染**原始值的字符串形式**（`String(value)`），multi 把 value 中无对应 option 的 primitive 渲染为以原始值为 label 的 chip。绝不显示空白/placeholder 误导用户「未提交」。声明 `noMatchText` 时，single 的降级 label 用该文案替代原始值字符串（multi chip 仍用原始值字符串，以便区分多项）。底层 form/scope 值**不被 echo-fallback 修改**——它只影响显示。option 回填后，匹配项恢复其正常 `option.label`。该契约覆盖 desktop（ComboboxValue/ComboboxInput/ComboboxChip）与 mobile（trigger 文本）两条渲染路径。

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
- **echo-fallback 与 remote 搜索的边界（B4.1 / S3+S4）**：value 是真值源，option 列表是派生显示输入。option 异步刷新/替换时，已提交的 value 不会丢失（form/scope 保留），仅 trigger 显示可能短暂降级（echo-fallback 兜底）。remote 搜索本身归组合层（`filterOption:false` + data-source 驱动 keyword 刷新），renderer 不内置 `searchSource`（S4 裁定）；这与 input-tree 的 `searchSource` 不同——tree 的层级/lazy 语义需要 renderer 内置搜索，select 的扁平 option 集合适合组合层。
- **multi 值契约 LOCK（B4.1 / S1）**：multi 的 form 值恒为「whole primitive 数组」（`selectMultipleAdapter` 保数组身份；`handleValueChange` 写 `(options).map(o => o.value)`，无 join/编码）。option 匹配用 `Object.is`，**不**采用 amis 的 `delimiter`/`joinValues`/`valueField` 值编码。因此 option value 含 `,`/`@`/unicode 等特殊字符时，其在 multi 数组中仍是单个完整 primitive（分隔符免疫）——这是刻意契约（NOT-ADOPTED amis 值编码），回归锚见 `select-controlled-value-echo.test.tsx`。
- **api cache key 含全依赖（B4.1 / S5）**：data-source 请求的 cache key 由 `generateCacheKey`（`api-cache.ts:245`）从**完整 materialized 请求**（method/url/headers/data）派生。上游 `evaluateSingleAjaxAction` 在请求前把每个 `${dep}` 解析进 `data`，故任一依赖变量变化（即使搜索 keyword 不变）→ materialized data 变 → cache key 变 → 新请求（不命中缓存）。回归锚见 `api-cache-key-dependencies.test.ts`。
- **程序式写值发 onChange（B4.1 / S8）**：所有 value 写入路径（`form.setValue`/`setValues`、action `setValue`/`setValues`、data-source `onSuccess` 写 scope）都经统一 store update + `setLastChange({paths,kind})`，被依赖字段的表达式 prop（`disabled`/`visible`/`options` 等）与 reaction 消费。即 data-source default 与用户交互走同一 canonical change observable。回归锚见 `programmatic-setvalue-reaction.test.tsx`。
- **optionTemplate click-anywhere 契约与 nested-anchor 边界（B4.1 / S12）**：base-ui `ComboboxItem value={option}`（`select-combobox-lists.tsx:39`）在 option wrapper 上 commit selection。点 optionTemplate 内任意**普通**后代（文本/icon/双行）→ 事件冒泡到 wrapper → 选中（capture pointerdown preventDefault + bubbling click commit）。**边界**：commit 在**冒泡 click** 阶段，故 optionTemplate 内若渲染自带 `stopPropagation` 的 `<a>`/`<button>`（或拦截 click 的交互元素），会吞掉 commit 导致不选中。契约：optionTemplate 内容不得在 click 上 stopPropagation（需要嵌套交互时用 pointerdown 或重新设计）。回归锚见 `select-option-template-click.test.tsx`。
- Combobox 迁移后，`SelectOptionSchema.value` 从 `string` 放宽为 `string | number | boolean`；renderer 内部以 `Object.is` 匹配 option，不需 amis 值编码。
- 虚拟滚动（`virtual: true`）对 base-ui Combobox 的键盘导航有影响：仅可见 option 参与导航（scroll 后其余 option 进入 DOM）。对 < 100 option 的场景无影响（走 `StaticComboboxList`）。
- option 模板 region（`optionTemplate`）已由 E3 落地：受控参数化 region，per-option scope 绑定，`ComboboxItem value={option}` 选中值匹配契约不变。虚拟滚动 + region 兼容（自定义内容随虚拟项挂载/卸载，见 Failure Path `option-template-virtual-compat`）；region 编译失败时回退 `option.label` 纯文本（Failure Path `option-template-region-compile-fail`）。

## 13. 响应式行为

引用 `docs/architecture/mobile-responsive-baseline.md`（M0 基线 + M0.1 基础设施）。

| 断点              | 行为                                                                                      | 实现方式                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| < 768px (mobile)  | 选项面板从 Combobox Popover 切换为 `@nop-chaos/ui` `Sheet`（`side="bottom"`）底部滑入面板 | renderer 内部 `useIsMobile()` 运行时分支；trigger 渲染为 Button（显示当前选中 label），Sheet 内复用 option/groups/optionTemplate/search/clearable/loading/error 渲染逻辑 |
| ≥ 768px (desktop) | Combobox Popover（行为不变）                                                              | 同 E1a 后 Combobox 原语族渲染路径                                                                                                                                        |

### 实现细节

- **schema 透明**：无新 `type`、无 `mobileUI` 标志位、无 `*-mobile` 组件。mobile 分支完全在 renderer 内部，由 `useIsMobile()`（断点 768）决定。
- **trigger**：mobile 触发器是普通 `Button`（`variant="outline"`），右侧带 `ChevronDownIcon`；显示当前选中 label（多选为逗号拼接），无选中时显示 placeholder。
- **Sheet 内容**：`SheetContent side="bottom"` + `nop-safe-bottom`（M0.1a）+ `nop-hairline--bottom`（M0.1b）分隔 header。可选 search input（`searchable: true`）+ 滚动 option 列表（每行 `min-h-touch` 满足触摸目标）。
- **选择行为**：单选点击 option 后立即 `handlers.onChange` + 关闭 Sheet；多选点击 option 切换选中态但保持 Sheet 打开。
- **clearable**：mobile 触发器右侧额外渲染清除按钮（`select-mobile-clear` slot），与 desktop `ComboboxClear` 对齐。
- **optionTemplate region**：mobile 列表项复用 `optionTemplate` region 渲染逻辑（与 desktop `ComboboxItem` 一致），region 失败回退 `option.label`。
- **z-index**：Sheet 经 `SheetContent` 内 `useGlobalZIndex()`（M0.1d）取值，多浮层叠加按打开顺序正确叠放。
- **disabled / readOnly**：mobile 触发器 `disabled`，不响应点击。
- **根 marker 不变**：`data-slot="select-wrapper"` + `nop-select-wrapper` class 不变；mobile 仅在内部增加 `data-slot="select-mobile-trigger"` / `select-mobile-option` / `select-mobile-sheet` 等子 marker。

### 触摸适配

- 触摸目标：option 行 `min-h-touch`（44px），符合 baseline §3。
- 手势：Sheet 遮罩点击关闭（base-ui 默认），无下滑手势关闭（归 Non-Blocking Follow-up）。
- 软键盘：search input 聚焦时 Sheet 内容区可滚动（`overflow-y-auto`），不被键盘遮挡。

## 14. 风险、取舍与后续阶段（合并）

原 §12 内容向上合并到本节后续维护。响应式 mobile 分支不引入新 schema surface；mobile 虚拟化（> 100 option 时 mobile Sheet 内是否虚拟化）归 Non-Blocking Follow-up。
