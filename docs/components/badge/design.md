# Badge 组件设计

## 1. 组件定位

- `badge` 用来展示短文本状态、数量或轻量强调信息。
- 它是内容型 renderer，不承担列表、过滤或选择语义。

## 2. 与 AMIS 或既有产品的能力对照

- 当前实现支持 `text` 和 `level`。
- 数字角标、dot 模式和可关闭标签不应都塞进 `badge`；可关闭能力更适合 `tag` 或 `tag-list`。

## 3. Flux 中的 renderer/type 定义

- `type: 'badge'`
- `category: 'content'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`

## 4. schema 设计

- 当前导出字段为 `text`、`level`。
- 建议长期与 `@nop-chaos/ui` Badge 的 `variant`/`level` 命名逐步对齐，但避免同时长期保留多套同义字段。

## 5. 字段分类

- `text`: `value`
- `level`: `value`

## 6. regions 与 slot 约定

- 首版不暴露 region。
- 如果需要复杂内容或图标复合，优先让 `text` 升级为 `value-or-region`，但不应影响其“短内容”边界。

## 7. 运行期状态归属

- 无内部状态。

## 8. 事件、动作与组件句柄能力

- 默认无事件。
- 可点击状态徽标应由外层 `button`/`link` 承担，不建议让 `badge` 自身变为交互型组件。

## 9. 数据源、表达式、导入能力接入点

- `text` 和 `level` 可接表达式结果。
- 数值格式化和状态到颜色的业务映射建议由 loader 或表达式层完成。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-badge` marker。
- 颜色级别使用标准 `level` 语言，不扩散 `statusType`、`badgeMode` 等别名。

## 11. 实现拆分建议

- 视觉映射和文案格式化逻辑与 renderer JSX 分离。

## 12. 风险、取舍与后续阶段

- `badge` 和 `tag` 边界需要持续保持清晰：前者偏展示状态，后者偏离散实体标签。
