# Collapse 组件设计

## 1. 组件定位

- `collapse` 是折叠内容组 renderer，用来组织一组可展开/收起的面板项。
- 它是有 UI 的交互容器，不是 `fragment`、`container` 或 `tabs` 的别名。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `collapse` 与 `collapse-group`。
- Flux 应保留一个 canonical `collapse` family，并把单项/多项展开策略收敛到明确状态字段，而不是长期保留两套 type 名称。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'collapse'`
- 归属 `@nop-chaos/flux-renderers-layout`

## 4. schema 设计

- 建议正式字段为 `items`、`value`、`defaultValue`、`valueOwnership`、`valueStatePath`、`multiple`、`collapsible`。

## 5. 字段分类

- `items`、`value`、`defaultValue`、`valueOwnership`、`valueStatePath`、`multiple`、`collapsible`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- `items` 中每一项建议包含 `title` 与 `body` 两个自然内容位。

## 7. 运行期状态归属

- 当前展开项属于 `collapse` 自己的交互状态。
- 外部若需要可写持久化，应通过 `valueStatePath`；只读摘要则可通过未来 `statusPath` 发布。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onChange`。
- 推荐句柄为 `component:setValue`、`component:openItem`、`component:closeItem`。

## 9. 数据源、表达式、导入能力接入点

- `items` 可由表达式或 source-enabled value 产出最终折叠项集合。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-collapse` marker。
- 视觉层复用 `@nop-chaos/ui` Collapsible/Accordion 相关 primitive。

## 11. 实现拆分建议

- 展开态桥接、item 归一化、标题与内容渲染分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是和 `tabs`、`card`、`tree` 混淆边界，导致状态语言再次碎片化。
