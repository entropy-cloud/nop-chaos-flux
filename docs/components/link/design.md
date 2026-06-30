# Link 组件设计

## 1. 组件定位

- `link` 是导航或可点击文本 renderer。
- 它负责语义化链接，而不是按钮式主操作。

## 2. 与 AMIS 或既有产品的能力对照

- 已 shipped：注册于 `flux-renderers-content`（`content-renderer-definitions.ts`）。
- 保留 `label`、`href`、`target`、`rel` 与 `onClick`，负责语义化链接而非按钮式主操作。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'link'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `label`、`href`、`target`、`rel`、`disabled`、`onClick`。

## 5. 字段分类

- `label`: `value-or-region`
- `href`、`target`、`rel`: `value`
- `onClick`: `event`

## 6. regions 与 slot 约定

- `label` 可为简单文本或受限 schema 片段。

## 7. 运行期状态归属

- 无复杂状态。

## 8. 事件、动作与组件句柄能力

- `onClick` 可与导航并存，但需要明确优先级与默认阻止策略。
- `example.json` 应展示 `onClick` 与基础导航字段并存的最小写法。

## 9. 数据源、表达式、导入能力接入点

- `href` 和 label 支持表达式。
- 更复杂的路由跳转仍应与 action/runtime 集成。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-link` marker。

## 11. 实现拆分建议

- 导航适配、action-click 兼容和文本内容渲染分离。

## 12. 风险、取舍与后续阶段

- 需要清楚区分 `link` 与 `button`：前者偏导航文本，后者偏动作触发。
