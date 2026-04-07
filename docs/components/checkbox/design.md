# Checkbox 组件设计

## 1. 组件定位

- `checkbox` 是单个布尔或二值字段控件。
- 它适合确认、开关式选择和布尔表单项，不负责多项集合选择。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `option.label` 和基础 field chrome。
- 半选态、true/false 自定义值和描述文本可作为下一阶段增强。

## 3. Flux 中的 renderer/type 定义

- `type: 'checkbox'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 继承 `InputSchema` 并增加 `option`。
- 建议后续允许 `trueValue`、`falseValue` 和 `indeterminate`，但需明确与 `switch` 的语义边界。

## 5. 字段分类

- `label`: `value-or-region`
- `option`: `value`
- `required`: `value`

## 6. regions 与 slot 约定

- `label` 是 field frame 标签。
- `option.label` 是选项文案，不应与外层 field label 混为一谈。

## 7. 运行期状态归属

- 选中值归 form runtime 或 scope。
- 半选 UI 如果加入，应作为局部显示态或由上游显式传入。

## 8. 事件、动作与组件句柄能力

- 交互事件遵循标准字段 `onChange`。
- 不建议为单个 checkbox 单独定义复杂句柄。

## 9. 数据源、表达式、导入能力接入点

- `label`、`option.label`、`disabled` 可接表达式。
- option 本身通常是静态值对象，不需要额外 source 协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-checkbox` marker。
- 视觉层复用 `@nop-chaos/ui` Checkbox，并服从 field frame 的组布局规则。

## 11. 实现拆分建议

- 单选布尔值映射、字段状态展示和文案渲染应保持分离。

## 12. 风险、取舍与后续阶段

- 需要持续区分 `checkbox` 与 `switch`：前者强调勾选项，后者强调即时开关。