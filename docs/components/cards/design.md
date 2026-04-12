# Cards 组件设计

## 1. 组件定位

- `cards` 是卡片集合 renderer，用来把一组记录渲染成统一的卡片列表或卡片网格。
- 它是有 UI 的 collection renderer，不是 `card` 的简单重复，也不是 `list` 的视觉别名。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `cards`，但 Flux 应优先保留清晰的 collection owner 语义，而不是复制历史字段面。
- `cards` 与 `card`、`list`、`crud` 关系紧密，但边界不同：`card` 是单项壳层，`cards` 是卡片集合，`crud` 是复合数据工作流。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'cards'`
- 预期归属 `@nop-chaos/flux-renderers-data`
- 组件性质：`category: 'data'`

## 4. schema 设计

- 建议正式字段为 `items`、`card`、`empty`、`rowKey`、`selectionMode`、`selectionOwnership`、`selectionStatePath`、`pagination`。
- `items` 是唯一正式集合字段。
- `card` 是单条记录的卡片模板 region，不单独发明 `itemCard`、`cardTpl` 之类平行命名。

## 5. 字段分类

- `items`、`rowKey`、`selectionMode`、`selectionOwnership`、`selectionStatePath`、`pagination`: `value`
- `card`: `region`
- `empty`: `value-or-region`
- `onItemClick`、`onSelectionChange`、`onPageChange`: `event`

## 6. regions 与 slot 约定

- `card` 是单项卡片模板，运行在当前记录作用域内。
- `empty` 是空态区域。

## 7. 运行期状态归属

- `cards` 自己拥有的是集合展示相关交互态，例如选择和分页。
- 数据加载和错误状态默认仍属于上游 `source` / `data-source` owner。

## 8. 事件、动作与组件句柄能力

- 推荐最小事件为 `onItemClick`、`onSelectionChange`、`onPageChange`。
- 推荐最小句柄为 `component:refresh`、`component:getSelection`、`component:setSelection`。

## 9. 数据源、表达式、导入能力接入点

- `items` 应优先接收最终记录数组或标准列表载荷中的 `items`。
- 原始业务数据到卡片视图模型的投影应优先在 loader 或 source adaptor 中完成。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-cards` marker。
- 视觉壳应复用 `@nop-chaos/ui` Card 体系或相关 primitive，不在 renderer 内硬编码布局策略。

## 11. 实现拆分建议

- 集合迭代、选择状态桥接、分页桥接、卡片模板渲染分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是把 `cards` 重新做成 `list` 的视觉变体而失去独立的 collection contract。
- 第二个风险是把卡片集合的查询、分页、批量操作都塞回 `cards`，与 `crud` 发生 owner 重叠。
