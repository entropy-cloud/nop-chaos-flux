# Progress 组件设计

## 1. 组件定位

- `progress` 是进度展示 renderer，用来显示完成比例和阶段状态。

## 2. 与 AMIS 或既有产品的能力对照

- 当前尚未实现，但 UI primitive 已具备基础能力。
- 首版建议只支持线性进度和标签，圆形/仪表盘可后续补充。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'progress'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议字段为 `value`、`max`、`label`、`variant`、`showValue`。

## 5. 字段分类

- `value`、`max`、`variant`、`showValue`: `value`
- `label`: `value-or-region`

## 6. regions 与 slot 约定

- 仅 `label` 可能需要 `value-or-region`。

## 7. 运行期状态归属

- 无复杂内部状态。

## 8. 事件、动作与组件句柄能力

- 默认无事件；必要时可支持点击事件。

## 9. 数据源、表达式、导入能力接入点

- `value` 可来自表达式或 source-enabled value。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-progress` marker。
- 视觉层复用 `@nop-chaos/ui` Progress。

## 11. 实现拆分建议

- 数值归一化与 label 呈现分离。

## 12. 风险、取舍与后续阶段

- 进度组件不应吸收任务状态机；它只显示值与少量状态标签。
