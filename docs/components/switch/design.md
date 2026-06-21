# Switch 组件设计

## 1. 组件定位

- `switch` 是即时开关型字段控件。
- 它强调状态切换语义，而不是“勾选一项”的表单文案语义。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `option.onLabel` 和 `option.offLabel`。
- `trueValue`/`falseValue` 自定义值映射已落地（E3）。loading 和确认切换仍作为后续增强。

### Flux 决策表

| AMIS / 候选能力            | 价值评估 | Flux 决策      | 理由                                                                                                                                   |
| -------------------------- | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `trueValue` / `falseValue` | 核心     | **实现**（E3） | 即时开关值契约：表单可存 `1/0`、`"yes"/"no"` 等业务值。与 `checkbox` 共用 `booleanMappingAdapter`；缺省回退 `true`/`false`（无回归）。 |
| `option.onLabel/offLabel`  | 常用     | **实现**       | 开/关内联文案，与值映射正交（文案不参与存值）。                                                                                        |
| amis `option` 数组语法     | 低       | 不采纳         | amis 旧式 `option: [{label, value}]` 数组不适用于单 switch；标量 `trueValue/falseValue` 已覆盖业务值映射需求。                         |
| amis 旧字段名              | 低       | 不采纳         | 不保留 amis 历史 `trueValue` 数组 / `value` 旧别名；新字段用 X3 命名基线（扁平标量）。                                                 |
| loading 状态               | 低       | 不采纳（后续） | switch 的 loading 是上游 source 状态的派生，当前由字段 chrome 统一展示；不单独开 schema 字段。                                         |
| 与 checkbox 的语义边界     | —        | 裁决           | `switch` = 即时开关（状态切换语义，强调即时性）；`checkbox` = 勾选项（确认/选择语义）。两者共用值映射契约，但交互语义不合并。          |

## 3. Flux 中的 renderer/type 定义

- `type: 'switch'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 继承 `InputSchema` 并增加 `option.onLabel`、`option.offLabel`、`trueValue`、`falseValue`。
- `trueValue` / `falseValue`（E3 落地）：标量 `SchemaValue`，缺省回退 `true` / `false`。runtime 通过 `booleanMappingAdapter(trueValue, falseValue)` 映射（与 `checkbox` 共用）。
- `onLabel` / `offLabel` 是显示文案，不参与值映射（正交）。

## 5. 字段分类

- `label`: `value-or-region`
- `option`: `value`
- `trueValue` / `falseValue`: `value`（标量，缺省回退 `true` / `false`）

## 6. regions 与 slot 约定

- 与 `checkbox` 一样，field label 和 switch 内联文案是两层概念。

## 7. 运行期状态归属

- 开关值归 form runtime。
- 动画和按压反馈是纯 UI 状态，不写入 scope。

## 8. 事件、动作与组件句柄能力

- 标准切换走 `onChange`。
- X1 起落地 `component:focus` handle（boolean 字段不暴露 clear/reset，语义不清；详见 vocabulary §字段类型裁定表）。renderer definition 已发布 `componentCapabilityContracts: ['focus']`。

## 9. 数据源、表达式、导入能力接入点

- 与 `checkbox` 类似，主要是值绑定与表达式驱动 disabled/visible。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-switch` marker。
- 视觉层复用 `@nop-chaos/ui` Switch，不再引入 `toggleMode` 等别名。

## 11. 实现拆分建议

- UI 切换壳与字段状态桥接逻辑继续分离。

## 12. 风险、取舍与后续阶段

- 需要避免和 `checkbox` 契约重复演化，只保留开关语义差异。
