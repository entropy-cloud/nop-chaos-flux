# List 组件设计

## 1. 组件定位

- `list` 是顺序型集合展示 renderer，用来渲染一组同构条目。

## 2. 与 AMIS 或既有产品的能力对照

- 当前尚未实现，但属于高优先级通用 renderer。
- 首版应优先聚焦静态或已装配好的 `items` 渲染，不预置复杂分页协议。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'list'`
- 预期归属 `@nop-chaos/flux-renderers-data`

## 4. schema 设计

- 建议字段为 `items`、`item`、`empty`、`selectionMode`。
- `items` 是唯一正式集合字段。

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