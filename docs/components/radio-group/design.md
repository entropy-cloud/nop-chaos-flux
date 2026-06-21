# Radio Group 组件设计

## 1. 组件定位

- `radio-group` 是离散单选集合字段控件。
- 它适合少量互斥选项的直接展示，不负责下拉式大数据选择。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `options`，并声明为 source-enabled field。
- 内联布局、说明文案和按钮式单选样式可后续补充，但不应改变“单选集合”的核心语义。

### Flux 决策表

| AMIS / 候选能力                 | 价值评估 | Flux 决策  | 理由                                                                                                                                                                                                                                                     |
| ------------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options` (`{label, value}`)    | 核心     | **实现**   | 单选集合的字段契约。`RadioGroupRenderer` 用 `stringValueAdapter`，表单存 option 的 `value`（任意字符串/数字/布尔标量）。                                                                                                                                 |
| `trueValue` / `falseValue`      | —        | **不采纳** | **E3 裁决**：boolean-radio 场景已被 `options` subsume。例如「是/否」单选可配 `options: [{label:'是', value:'Y'}, {label:'否', value:'N'}]`，表单直接存 `'Y'`/`'N'`，无需平行 trueValue/falseValue 字段。引入它会与 option.value 产生双真值源、契约漂移。 |
| `inline` 布局                   | 常用     | 后续       | 视觉字段，归独立增强（不改值契约）。                                                                                                                                                                                                                     |
| `optionType`（button 样式）     | 低       | 后续       | 按钮式单选是视觉变体，归独立增强。                                                                                                                                                                                                                       |
| amis `option` 数组 + value 别名 | 低       | 不采纳     | Flux 已用扁平 `options: [{label, value}]`；不保留 amis 旧 `option` 数组别名。                                                                                                                                                                            |
| source-enabled `options`        | 核心     | **实现**   | 已支持 `optionsSourceState` + 远程加载（见 `input-source-state` 测试）。                                                                                                                                                                                 |

## 3. Flux 中的 renderer/type 定义

- `type: 'radio-group'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`，`options` 为 `allowSource`

## 4. schema 设计

- 继承 `InputSchema` 并增加 `options`。
- 建议后续补充 `inline`、`optionType` 等视觉字段，但仍以单选值为唯一输出。

## 5. 字段分类

- `label`: `value-or-region`
- `options`: `value`，允许 source-enabled value

## 6. regions 与 slot 约定

- 首版不开放单个 option 的 schema slot。
- 如需复杂 option 内容，应在后续设计中提供受限的 value-or-region，而不是函数型 render prop。

## 7. 运行期状态归属

- 选中值归 form runtime。
- 焦点移动和 hover 状态归 UI 组件本地处理。

## 8. 事件、动作与组件句柄能力

- 主要交互是 `onChange`。
- X1 起落地 `component:focus` handle（choice 字段不暴露 clear/reset）。renderer definition 已发布 `componentCapabilityContracts: ['focus']`。

## 9. 数据源、表达式、导入能力接入点

- `options` 已具备 source-enabled 能力，可用于依赖字段变化后的选项更新。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-radio-group` marker。
- 视觉层复用 `@nop-chaos/ui` RadioGroup 与 FieldFrame 分组布局。

## 11. 实现拆分建议

- option 归一化与 source state 展示逻辑独立。

## 12. 风险、取舍与后续阶段

- 需要避免把复杂远程树形选择等需求继续叠加进 `radio-group`。
