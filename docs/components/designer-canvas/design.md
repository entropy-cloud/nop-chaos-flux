# Designer Canvas 组件设计

## 1. 组件定位

- `designer-canvas` 是 Flow Designer 的画布 renderer 壳层。
- 它负责把 designer core 快照和 `@xyflow/react` 适配层连接起来。

## 2. 与 AMIS 或既有产品的能力对照

- 当前仓库已经以 `@xyflow/react` 为唯一画布实现。
- 文档应明确它不是 graph store 本身，只是交互与可视化适配层。

## 3. Flux 中的 renderer/type 定义

- `type: 'designer-canvas'`
- `sourcePackage: '@nop-chaos/flow-designer-renderers'`

## 4. schema 设计

- 当前最小 schema 为空壳 type。
- 长期建议补充局部覆盖字段，如 `zoom`, `fitView`, `showGrid` 的宿主级可选配置，但文档不应让这些字段越过 `config` 成为第二套核心配置入口。

## 5. 字段分类

- 现阶段无稳定公开字段。

## 6. regions 与 slot 约定

- 不暴露自由 region。
- 节点卡片、边行和 overlay 内容应通过 canvas bridge 或专用 renderer 接入。

## 7. 运行期状态归属

- 结构化 graph state 归 designer core。
- pointer capture、dragging 和连接预览等临时状态归画布适配层。

## 8. 事件、动作与组件句柄能力

- 画布事件应先归一化为 designer command，再走 `designer:*` action 或 command adapter。

## 9. 数据源、表达式、导入能力接入点

- 画布不直接读取业务数据源；它消费 designer host 提供的稳定快照。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-designer-canvas` marker。
- 视觉主题来自 designer config / themeStyles，而不是 renderer 内散落常量。

## 11. 实现拆分建议

- canvas bridge、xyflow node/edge adapters、selection overlay 和 host snapshot 投影继续拆分。

## 12. 风险、取舍与后续阶段

- 双向同步最容易形成事件回环，文档必须持续强调“core 是单一 source of truth”。
