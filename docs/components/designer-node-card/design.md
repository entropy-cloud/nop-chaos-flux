# Designer Node Card 组件设计

## 1. 组件定位

- `designer-node-card` 是 Flow Designer 节点卡片的候选专用 renderer。
- 当前它已作为 schema 类型存在，但尚未注册为公开 renderer definition。

## 2. 与 AMIS 或既有产品的能力对照

- 当前更像设计器内部视觉 building block，而不是独立业务组件。
- 文档先定义目标契约，待节点卡真正 schema 化后再落代码。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'designer-node-card'`
- 预期归属 `@nop-chaos/flow-designer-renderers`
- 当前状态：schema 已导出，renderer 未注册

## 4. schema 设计

- 当前最小字段是 `nodeId`。
- 建议后续补充 `title`、`subtitle`、`ports`、`badges`、`selected`、`invalid` 等目标投影字段，但最终值应由 designer snapshot 投影得到。

## 5. 字段分类

- `nodeId`: `value`
- 其他目标展示字段优先为 `value`，避免早期开放复杂 slot。

## 6. regions 与 slot 约定

- 节点卡内部如需标题或扩展操作区，可在后续阶段增加受限 `header`、`body`、`footer` regions。

## 7. 运行期状态归属

- 节点选中、校验状态、端口可连接性都应来自 designer snapshot。

## 8. 事件、动作与组件句柄能力

- 交互应转成 designer command，如选中、展开、聚焦节点。

## 9. 数据源、表达式、导入能力接入点

- 不直接接数据源；通过 host snapshot 读取规范化节点视图。

## 10. 样式与 DOM marker 约定

- 建议保留 `nop-designer-node-card` marker。
- 视觉风格需与 palette preview 和 canvas node shell 一致。

## 11. 实现拆分建议

- 节点投影模型、端口渲染和卡片壳层拆分实现。

## 12. 风险、取舍与后续阶段

- 过早公开 renderer 会把内部画布实现细节固定下来，需要等 host bridge 稳定后再注册。