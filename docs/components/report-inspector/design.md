# Report Inspector 组件设计

## 1. 组件定位

- `report-inspector` 是报表设计器属性面板内容 renderer。
- 它根据当前选中目标和 panel 配置决定展示哪些 inspector panels。

## 2. 与 AMIS 或既有产品的能力对照

- 当前公开字段包括 `inspectorPanels`、`emptyLabel`、`noSelectionLabel`。
- 更复杂的 panel provider、profile 注入和表达式编辑器适配属于后续能力，但不改变其“面板编排器”定位。

## 3. Flux 中的 renderer/type 定义

- `type: 'report-inspector'`
- `sourcePackage: '@nop-chaos/report-designer-renderers'`
- 当前 fields: `inspectorPanels` 为 `prop`

## 4. schema 设计

- 当前正式字段核心是 `inspectorPanels`，并已包含 `emptyLabel`、`noSelectionLabel` 这类最小壳层文案。
- 若外层已使用 `report-inspector-shell`，应避免在最终页面 schema 中重复维护两份相同文案来源。

## 5. 字段分类

- `inspectorPanels`、`emptyLabel`、`noSelectionLabel`: `value`

## 6. regions 与 slot 约定

- 首版不暴露自由 region。
- 面板内部 schema 片段可由 panel 配置对象自身定义，而不是由 renderer 字段元数据再解释一次。

## 7. 运行期状态归属

- 当前选中目标、panel matching 结果和 adapter state 来自 report designer host。

## 8. 事件、动作与组件句柄能力

- inspector 中的编辑动作应最终转成 `report-designer:*` 或 `spreadsheet:*` 命令。

## 9. 数据源、表达式、导入能力接入点

- panels 定义可来自 profile/adapters。
- 表达式字段编辑器属于 adapter 预留位，不应硬编码在 inspector 核心里。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-report-inspector` marker。

## 11. 实现拆分建议

- panel matching、面板列表渲染和具体 editor adapters 分离。

## 12. 风险、取舍与后续阶段

- 如果不把 adapter 边界写清楚，报表设计器会被具体业务模型绑死。