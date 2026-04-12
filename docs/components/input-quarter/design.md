# Input Quarter 组件设计

## 1. 组件定位

- `input-quarter` 是季度字段 family 的 canonical owner。
- 它统一承接单季度与季度范围 authoring。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-quarter` 与 `input-quarter-range`。
- Flux 不保留第二个 canonical range type，而是把范围语义放在 family 内模式字段。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-quarter'`
- 预期归属 `@nop-chaos/flux-renderers-form`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`selectionMode`、`valueFormat`、`displayFormat`、`delimiter`、`minDate`、`maxDate`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`selectionMode`、`valueFormat`、`displayFormat`、`delimiter`、`minDate`、`maxDate`: `value`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。

## 7. 运行期状态归属

- 值与校验状态归最近表单或 owner scope。

## 8. 事件、动作与组件句柄能力

- 继续沿用统一字段写回与 handle 语言。

## 9. 数据源、表达式、导入能力接入点

- 范围限制可由表达式控制。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-quarter` marker。

## 11. 实现拆分建议

- 季度值归一化、显示格式化、field bridge 分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是季度和月份/年份家族在命名上再次走散。
