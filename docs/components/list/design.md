# List 组件设计

## 1. 组件定位

- `list` 是顺序型集合展示 renderer，用来渲染一组同构条目。
- `list` 是 **有 UI 的 collection renderer**：它有自己的视觉壳、空态与条目容器语义。
- 它不是纯结构节点；纯结构展开应使用 `loop`。

## 2. 与 AMIS 或既有产品的能力对照

- 当前尚未实现，但属于高优先级通用 renderer。
- 首版应优先聚焦静态或已装配好的 `items` 渲染，不预置复杂分页协议。
- 内部实现可以复用与 `loop` 相同的 repeated-instance substrate，但外部 schema 契约仍应保持 `list` 自己的视觉/容器语义。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'list'`
- 预期归属 `@nop-chaos/flux-renderers-data`

## 4. schema 设计

- 建议字段为 `items`、`item`、`empty`、`selectionMode`。
- `items` 是唯一正式集合字段。
- `list` 首版不需要重复暴露 `itemName` / `indexName` 这类结构字段；如果确有需要，应优先评估是否直接使用 `loop` + `container`/`card` 组合更自然。

## 5. 字段分类

- `items`: `value` 或 source-enabled value
- `item`: `region`
- `empty`: `value-or-region`

## 6. regions 与 slot 约定

- `item` 是单个条目的模板 region。
- `empty` 是空态区。

## 7. 运行期状态归属

- 首版不默认持有分页或排序状态。
- 如果后续支持选择态，需要明确 `selectionOwnership`。
- `list` 即使内部复用 repeated-item instantiation，也不应把自己降格成无 UI 的结构节点；视觉壳、item 容器和空态仍属于 `list` renderer 自己。

## 8. 事件、动作与组件句柄能力

- 推荐最小事件为 `onItemClick`、`onSelectionChange`。

## 9. 数据源、表达式、导入能力接入点

- `items` 应优先接最终条目数组。
- 原始业务数据到条目视图模型的映射应尽量在 loader 完成。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-list` marker。

## 11. 实现拆分建议

- 集合迭代、item region 渲染和空态处理分开实现。

## 12. 风险、取舍与后续阶段

- 最主要风险是再次引入“列表 + 私有模板协议”的双轨模型，需要坚持单一 `items` 字段原则。
- 第二个风险是把 `list` 与 `loop` 混成一类：`loop` 负责无 UI 的结构展开，`list` 负责有 UI 的集合展示，二者不应互相吞并。
