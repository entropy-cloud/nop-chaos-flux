# Markdown 组件设计

## 1. 组件定位

- `markdown` 是 Markdown 内容渲染 renderer。
- 它是 `text` 与 `html` 之间的中间层，负责受控富文本展示。

## 2. 与 AMIS 或既有产品的能力对照

- 已 shipped：注册于 `flux-renderers-content`（`content-renderer-definitions.ts`），基于 `react-markdown` + `remark-gfm`；`allowHtml` 开启时先经 DOMPurify 清洗再由 `rehype-raw` 渲染存活标签。
- 支持静态 Markdown 与表达式拼接后的字符串输入；`allowHtml` 默认关闭（标签按字面转义）。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'markdown'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `content`、`allowHtml`、`empty`。

## 5. 字段分类

- `content`: `value`，可允许 source-enabled value（指 `content:"${...}"` 经 loader/表达式注入，**非 renderer 持有远程 src**，见 §9 内容契约）
- `empty`: `value-or-region`

## 6. regions 与 slot 约定

- 通常不需要 body region。
- 空态可使用 `empty`。

## 7. 运行期状态归属

- 无复杂状态。

## 8. 事件、动作与组件句柄能力

- 默认无专用事件。

## 9. 数据源、表达式、导入能力接入点

- **内容契约（content-only）**：renderer 仅渲染 `content` 字段，**不持有 `src`/fetch 能力**（`markdown.tsx:11-56`、`schemas.ts:124-132` 均无 `src` 字段）。所谓「远程内容」由 `content:"${...}"` 表达式/source 绑定经 loader/组装层注入（`kind:'prop'`），renderer 始终只接收已解析好的字符串。
- **响应式（DD8）**：`content` 为 `kind:'prop'`，经 propsProgram **reactive 于 scope**——mutate 绑定 scope 值会重新解析并更新渲染的 markdown HTML（非 mount 快照）。回归锚见 `markdown-reactivity.test.tsx`。
- 循环属性（「不按 src 反复 fetch」）因能力缺失而按构造成立（vacuously true）。若未来产品判断需要 markdown 远程 `src` fetch，为 successor feature（见 §12 / roadmap B7），不在 renderer 层引入。
- `content` 支持表达式和 source-enabled value（注入方式同上，非 renderer 自带 fetch）。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-markdown` marker。
- 需要与项目 Markdown 样式策略统一，避免 renderer 内置一套独立排版体系。

## 11. 实现拆分建议

- 解析、安全过滤和渲染样式拆开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是 `markdown` 与 `html` 边界不清，需要持续坚持"受控格式化文本"定位。
- 受控渲染安全门禁（sanitize 双策略）：
  - **(a) HTML 清洗**：`allowHtml` 默认 off（react-markdown 按字面转义标签）；开启时 markdown 源先经 DOMPurify allowlist 清洗（剥离 `<script>`/事件处理器/`javascript:` URI，保留常见展示标签），再由 `rehype-raw` 渲染存活安全标签（`sanitize.ts:28-42`、`markdown.tsx:40-41`）。已实现+已测（`sanitize.test.ts`、`markdown.test.tsx`）。
  - **(b) 代码块逐字保留**：代码块（` `）内的字面内容（含 `'`、`"`、`<`、`>`）按构造逐字保留，不做 entity 转义（markdown 管线仅 `remarkGfm` + 条件 `rehypeRaw`，无转义插件，`markdown.tsx:51`）。回归锚见 `markdown.test.tsx`。
  - 两者是 distinct concerns：(a) 针对 `allowHtml` 开启时内嵌 HTML 的 XSS 防护；(b) 针对代码块内容不被二次转义。决策见 `docs/plans/2026-06-24-0040-2-w1a-content-family-sanitization-plan.md`，`docs/architecture/security-design-requirements.md` 为安全边界父文档。
- 远程 `src` fetch 为 successor（roadmap B7，见 §9 内容契约）。
