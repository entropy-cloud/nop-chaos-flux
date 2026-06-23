# Html 组件设计

## 1. 组件定位

- `html` 是原始 HTML 内容展示 renderer。
- 它用于明确需要渲染 HTML 字符串的场景，而不是替代所有富文本需求。

## 2. 与 AMIS 或既有产品的能力对照

- 当前尚未实现，但已明确列入高优先级内容 renderer。
- 首版必须把安全过滤作为一等关注点。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'html'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `content`、`sanitize`、`empty`。

## 5. 字段分类

- `content`、`sanitize`: `value`
- `empty`: `value-or-region`

## 6. regions 与 slot 约定

- 通常不需要 body region。

## 7. 运行期状态归属

- 无复杂状态。

## 8. 事件、动作与组件句柄能力

- 默认无专用事件。

## 9. 数据源、表达式、导入能力接入点

- `content` 支持表达式和 source-enabled value。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-html` marker。
- 输出 DOM 需要稳定边界，避免外部全局样式意外污染。

## 11. 实现拆分建议

- sanitize、trusted-html policy 和渲染层解耦。

## 12. 风险、取舍与后续阶段

- 安全边界是核心风险；任何 `html` 能力都必须与安全设计要求文档对齐。
- 受控渲染安全门禁决策见 `docs/plans/2026-06-24-0040-2-w1a-content-family-sanitization-plan.md`：DOMPurify sanitize 默认 on（strip `<script>`/事件处理器/`javascript:` URI），`sanitize:false` 为显式 trusted 逃生口；`dangerouslySetInnerHTML` 仅承载 sanitized 输出。以 `docs/architecture/security-design-requirements.md` 为安全边界父文档。
