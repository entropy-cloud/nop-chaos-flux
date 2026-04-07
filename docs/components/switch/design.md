# Switch 组件设计

## 1. 组件定位

- `switch` 是即时开关型字段控件。
- 它强调状态切换语义，而不是“勾选一项”的表单文案语义。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `option.onLabel` 和 `option.offLabel`。
- true/false 自定义值、loading 和确认切换都应作为后续增强。

## 3. Flux 中的 renderer/type 定义

- `type: 'switch'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 继承 `InputSchema` 并增加 `option.onLabel`、`option.offLabel`。
- 建议后续允许 `trueValue`、`falseValue`，但字段名应与布尔型控件统一。

## 5. 字段分类

- `label`: `value-or-region`
- `option`: `value`

## 6. regions 与 slot 约定

- 与 `checkbox` 一样，field label 和 switch 内联文案是两层概念。

## 7. 运行期状态归属

- 开关值归 form runtime。
- 动画和按压反馈是纯 UI 状态，不写入 scope。

## 8. 事件、动作与组件句柄能力

- 标准切换走 `onChange`。
- 若需要外部强制切换，后续可以通过统一 field handle 暴露 `component:setValue`。

## 9. 数据源、表达式、导入能力接入点

- 与 `checkbox` 类似，主要是值绑定与表达式驱动 disabled/visible。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-switch` marker。
- 视觉层复用 `@nop-chaos/ui` Switch，不再引入 `toggleMode` 等别名。

## 11. 实现拆分建议

- UI 切换壳与字段状态桥接逻辑继续分离。

## 12. 风险、取舍与后续阶段

- 需要避免和 `checkbox` 契约重复演化，只保留开关语义差异。