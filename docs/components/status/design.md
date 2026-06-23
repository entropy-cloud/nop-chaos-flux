# Status 组件设计

## 1. 组件定位

- `status` 是业务状态展示 renderer，用来把状态值渲染为带语义级别的文本、徽标或图标组合。
- 它不是 `badge` 的简单别名；`badge` 是更基础的视觉 primitive，`status` 是更强业务语义层。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `status`。
- Flux 应优先保留面向业务状态的简洁 contract，而不是继续扩散大量历史样式枚举。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'status'`
- 归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议正式字段为 `value`、`labelMap`、`levelMap`、`iconMap`、`placeholder`。

## 5. 字段分类

- `value`、`labelMap`、`levelMap`、`iconMap`、`placeholder`: `value`

## 6. regions 与 slot 约定

- `status` 首版不要求自由 regions。

## 7. 运行期状态归属

- `status` 无复杂 owner 状态。

## 8. 事件、动作与组件句柄能力

- 首版不要求专门事件或句柄。

## 9. 数据源、表达式、导入能力接入点

- 状态值和映射表都可由表达式或上游数据装配提供。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-status` marker。
- 视觉层可投影到 `Badge` 或其他共享 primitive，但 contract 以业务状态语义为主。

## 11. 实现拆分建议

- label/level/icon 映射和最终 primitive 适配分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是与 `mapping`、`badge` 之间重复建模。
