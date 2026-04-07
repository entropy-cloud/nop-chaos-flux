# Separator 组件设计

## 1. 组件定位

- `separator` 是轻量分隔线 renderer，用来表达内容分段而不是布局容器。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库已具备 `@nop-chaos/ui` Separator primitive，但无通用 renderer。
- 它应保持极简，不吸收标题、按钮等复合语义。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'separator'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议字段为 `orientation`、`decorative`、`label`。

## 5. 字段分类

- `orientation`、`decorative`: `value`
- `label`: `value-or-region`

## 6. regions 与 slot 约定

- 仅在需要带文案分隔时考虑 `label` region。

## 7. 运行期状态归属

- 无内部状态。

## 8. 事件、动作与组件句柄能力

- 无专用事件。

## 9. 数据源、表达式、导入能力接入点

- `label` 和可见性可接表达式。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-separator` marker。
- 视觉交互复用 `@nop-chaos/ui` Separator。

## 11. 实现拆分建议

- schema 到 UI primitive props 的映射单独维护即可。

## 12. 风险、取舍与后续阶段

- 需要避免把它演化成 section/header 组件，保持“分隔线”边界。