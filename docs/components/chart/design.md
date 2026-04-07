# Chart 组件设计

## 1. 组件定位

- `chart` 是图表展示 renderer，用来把结构化数据映射为折线、柱状、饼图和散点等视觉表达。
- 它只负责图表表现层和交互事件，不承担数据请求编排。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `chartType`、`title`、`series`、`source`、`xAxis`、`yAxis`、`empty` 和交互事件。
- 高级图表联动、双轴、数据缩放和复杂 tooltip 应在有真实场景后分阶段引入。

## 3. Flux 中的 renderer/type 定义

- `type: 'chart'`
- `category: 'data'`
- `sourcePackage: '@nop-chaos/flux-renderers-data'`
- 当前 fields: `onClick`、`onHover` 为 `event`，`empty` 为 `value-or-region`

## 4. schema 设计

- 当前导出字段为 `chartType`、`title`、`series`、`source`、`xAxis`、`yAxis`、`height`、`loading`、`empty`。
- `series` 和 `source` 的职责需要文档明确：前者更接近最终绘图配置，后者更接近原始数据集。

## 5. 字段分类

- `chartType`、`title`、`series`、`source`、`xAxis`、`yAxis`、`height`、`loading`: `value`
- `empty`: `value-or-region`
- `onClick`、`onHover`: `event`

## 6. regions 与 slot 约定

- 当前仅 `empty` 作为正式 slot。
- 数据点 tooltip、legend 自定义等复杂渲染不建议首版直接开放 arbitrary schema slot。

## 7. 运行期状态归属

- 图表数据和配置来自外部 scope/props。
- hover、tooltip 打开态、缩放窗口等为局部 UI 状态，不应默认持久化到页面 scope。

## 8. 事件、动作与组件句柄能力

- 当前最小事件是 `onClick`、`onHover`。
- 后续可补 `component:refresh`、`component:exportImage` 一类句柄，但应保持狭义。

## 9. 数据源、表达式、导入能力接入点

- 图表数据应由 loader 或 `data-source` 提供给 `source`/`series`。
- 图表 renderer 只消费最终结构，不承担查询协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-chart` marker。
- 高度、背景和留白由 schema 和宿主样式控制，不在 renderer 内写死主题色。

## 11. 实现拆分建议

- 数据归一化、图表库适配、事件桥接和空态处理分模块实现。

## 12. 风险、取舍与后续阶段

- `series` 与 `source` 的双入口如果不收敛，后续会产生重复语义，需要持续规范。