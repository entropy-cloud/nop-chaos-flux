# Flex 组件设计

## 1. 组件定位

- `flex` 是显式的弹性布局 renderer，用来表达一组子节点的主轴、交叉轴和换行规则。
- 它是 `container` 的布局特化版，不承载业务数据语义。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `direction`、`wrap`、`align`、`justify`、`gap`。
- 文档建议保留 `items` 作为等价 region 名，以兼容未来更接近设计器的集合式建模。

## 3. Flux 中的 renderer/type 定义

- `type: 'flex'`
- `category: 'layout'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 regions: `body`、`items`

## 4. schema 设计

- 当前导出字段为 `direction`、`wrap`、`align`、`justify`、`gap`、`className`。
- 推荐正式契约允许 `body` 或 `items` 二选一作为子项集合输入，但对外只保留一个主集合字段更利于长期收敛；当前阶段优先以 `body` 为主、`items` 为兼容 region。

## 5. 字段分类

- `direction`、`wrap`、`align`、`justify`、`gap`: `value`
- `body`、`items`: `region`

## 6. regions 与 slot 约定

- `body` 适合和其他容器保持一致。
- `items` 更适合设计器和未来工具链的显式布局集合语义。
- 实现上不应同时要求两个 region 都有值。

## 7. 运行期状态归属

- `flex` 不维护内部交互状态。
- 子节点增删排布应由外部 schema/loader 负责，而不是在布局组件里维护可变 children 列表。

## 8. 事件、动作与组件句柄能力

- 首版无需专用事件。
- 拖拽排序等高级能力应作为独立组件或设计器能力处理，而不是加进 `flex`。

## 9. 数据源、表达式、导入能力接入点

- 布局字段支持表达式值。
- 动态子项推荐由 `dynamic-renderer`、loader 或上游迭代机制产出最终 region 内容。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-flex` marker。
- `direction`/`justify`/`align` 是布局语义，不应再发明第二套 `flexMode` 或 `layoutMode` 命名。

## 11. 实现拆分建议

- 布局 class 计算应在工具层完成。
- renderer 本体只负责 root 和 child region 渲染。

## 12. 风险、取舍与后续阶段

- `body` 和 `items` 的双 region 需要后续收敛为更清晰的外部契约。
- 响应式断点支持应与全局 styling system 一起设计，不宜让 `flex` 单独扩展。
