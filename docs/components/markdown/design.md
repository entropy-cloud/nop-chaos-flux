# Markdown 组件设计

## 1. 组件定位

- `markdown` 是 Markdown 内容渲染 renderer。
- 它是 `text` 与 `html` 之间的中间层，负责受控富文本展示。

## 2. 与 AMIS 或既有产品的能力对照

- 当前尚未实现，但已明确列为高优先级内容 renderer。
- 首版应优先支持静态 Markdown 和表达式拼接后的字符串输入。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'markdown'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议字段为 `content`、`allowHtml`、`empty`。

## 5. 字段分类

- `content`: `value`，可允许 source-enabled value
- `empty`: `value-or-region`

## 6. regions 与 slot 约定

- 通常不需要 body region。
- 空态可使用 `empty`。

## 7. 运行期状态归属

- 无复杂状态。

## 8. 事件、动作与组件句柄能力

- 默认无专用事件。

## 9. 数据源、表达式、导入能力接入点

- `content` 支持表达式和 source-enabled value。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-markdown` marker。
- 需要与项目 Markdown 样式策略统一，避免 renderer 内置一套独立排版体系。

## 11. 实现拆分建议

- 解析、安全过滤和渲染样式拆开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是 `markdown` 与 `html` 边界不清，需要持续坚持“受控格式化文本”定位。