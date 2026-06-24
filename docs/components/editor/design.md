# Editor 组件设计

## 1. 组件定位

- `editor` 是 WYSIWYG 富文本表单字段 renderer。
- 对应 AMIS `input-rich-text`，使用 TipTap 实现。
- 用户在表单中直接看到格式化效果（加粗、标题、列表、链接），无需了解 markdown 语法。
- 与 `word-editor`（页面级文档编辑器）和 `markdown-editor`（markdown 源码编辑）职责不同。

## 2. 与相关组件的边界

| 组件              | 场景                          | 实现底层                  |
| ----------------- | ----------------------------- | ------------------------- |
| `editor`          | 表单字段级 WYSIWYG 富文本输入 | TipTap                    |
| `markdown-editor` | markdown 源码编辑 + 预览      | Textarea + react-markdown |
| `code-editor`     | 代码/公式/SQL 编辑            | CodeMirror                |
| `word-editor`     | 页面级文档编辑（类 Word）     | 领域包独立                |

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'editor'`
- 预期归属 `@nop-chaos/flux-renderers-form-advanced`
- 预期 `wrap: true`
- 新增依赖：`@tiptap/react` + `@tiptap/starter-kit` + 按需扩展（~50-70KB gzip，MIT 协议）

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`placeholder`、`toolbar`、`outputFormat`、`readOnly`、`required`。
- `outputFormat`：`html`（默认）或 `json`（TipTap JSON）。
- `toolbar`：工具栏配置，控制显示哪些格式按钮。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`placeholder`、`toolbar`、`outputFormat`、`readOnly`、`required`: `value`
- `onChange`、`onFocus`、`onBlur`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。
- 工具栏属于组件内部 feature surface，不由外部 region 驱动。

## 7. 运行期状态归属

- 编辑器值（HTML 或 TipTap JSON）归最近表单或 owner scope。
- 光标位置、选区、工具栏激活态属于字段内部交互状态。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onChange`、`onFocus`、`onBlur`。
- 如需句柄，优先复用统一字段 `component:focus`、`component:setValue` 语言。

## 9. 数据源、表达式、导入能力接入点

- 配置和只读态可由表达式驱动。
- `editor` 不拥有平台级导入协议。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-editor` marker。
- TipTap 的 ProseMirror DOM 需要通过 CSS 变量对齐 `@nop-chaos/ui` 主题。

## 11. 实现拆分建议

- TipTap 适配器、工具栏 bridge、值序列化/反序列化（HTML ↔ TipTap JSON）、sanitization 边界分开实现。
- 工具栏按钮样式复用 `@nop-chaos/ui` Button/Tooltip。

## 12. 风险、取舍与后续阶段

- TipTap 是积极维护的 MIT 库（3.0 稳定，有 2026 路线图），~50-70KB gzip。
- 如需图片上传、表格编辑等高级功能，通过 TipTap 扩展渐进引入。

### W3d TipTap 引入裁定 + sanitize 边界

- `flux-renderers-form-advanced` 新增 `@tiptap/react` + `@tiptap/starter-kit`（MIT，~50-70KB gzip）依赖，并新增 `@nop-chaos/flux-renderers-content` workspace 依赖以复用 W1a 的 `sanitizeHtml`（DOMPurify 门禁）。
- `outputFormat: html`（默认）时，进入编辑器的存储 HTML 先经 `sanitizeHtml` 受控（白名单裁剪危险标签/事件处理器/`javascript:` URI），ProseMirror 再按自身 schema 解析；`outputFormat: json` 存 TipTap JSON，不需 sanitize。
- 工具栏 bridge 复用 `@nop-chaos/ui`；工具栏按钮 `onMouseDown` preventDefault，避免抢占焦点导致选区丢失。
- 受控渲染边界：编辑器输出（getHTML）只含 ProseMirror schema 允许的安全子集，永不泄漏 `<script>`（见 sanitize Failure Path）。
- TipTap 高级扩展（图片上传节点 / 表格编辑 / 协同 / mentions）归 successor，按 design §12 渐进引入，首版不实现。
- 与 `code-editor` 职责分离清晰：`editor` 是富文本 WYSIWYG，`code-editor` 是代码编辑。
