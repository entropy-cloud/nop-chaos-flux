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
- `toolbar`：工具栏配置；`false` 隐藏，数组白名单，缺省/`true` 显示全部。按钮 id：`bold`、`italic`、`underline`、`strike`、`h1`、`h2`、`bulletList`、`orderedList`、`code`、`blockquote`、`link`、`image`、`highlight`、`undo`、`redo`。
- `placeholder`：透传给 `@tiptap/extensions` 的 `Placeholder` 扩展；扩展在空段落上挂 `data-placeholder` + `is-editor-empty` 装饰，由包级 `styles.css` 的 `::before` 规则渲染（未配置时不挂扩展、无占位符）。

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
- 内容根挂 `nop-editor-content`；TipTap 的 ProseMirror DOM 通过 CSS 变量对齐 `@nop-chaos/ui` 主题。
- 内容排版由包级 `styles.css` 的 `.nop-editor-content` scope CSS 承接（最小元素矩阵 h1-h3/ul/ol/blockquote/code/a/img + 段落/代码块节奏；令牌驱动 + 双 dark 触发，沿 ai-bubble-markdown 先例），不引 `@tailwindcss/typography`；`img` 有 `max-width: 100%` 兜底。
- 工具栏按钮规格与 markdown-editor 工具条、ai template-bar 三面统一：`ghost` + `h-7 min-w-7 px-1.5` + 图标 `size-4`；不带 `role="toolbar"` 组合角色（同 markdown-editor 20-07 Decision），激活态用 `aria-pressed` + `data-active` + `bg-accent` token。

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
- Link scheme 白名单（`protocols` + `validate: isSafeLinkUrl`）经 StarterKit v3 的 `link` 子配置透传（单一装配点；独立 `Link.configure` 会与 StarterKit 内建 Link 同名重复装配并触发运行期 dedupe 警告）。`javascript:` 类 href 在 set/ paste 双向被拒（`editor-link.test.tsx` 红线）。
- 扩展子集裁决（plan 480）：Underline、Image、Highlight 已落地——Underline 走 StarterKit 内建扩展；Image 只开 URL prompt 通道（src 经 `isSafeImageUrl` 守卫：http(s)/`data:image`/相对路径放行，`javascript:`/`data:text/html` 等拒绝；上传通道不开放）；Highlight 一键切换；`<u>/<mark>/<img>` 经 DOMPurify round-trip 白名单断言 pin（onerror 剥离、标签保留）。Table/TextAlign 否决：表格编辑 UI 面成本不成比例（且 `markdown-editor` 工具栏已覆盖表格源码场景），TextAlign 以 inline `style` 落盘与 token 驱动 styling contract 冲突——两者按 successor 路径按需再立项。
- 占位符：`placeholder` schema 值委托 `@tiptap/extensions` Placeholder 扩展（空段落装饰 `data-placeholder` + `is-editor-empty`），包级 `styles.css` 消费装饰渲染 `::before`；不再手写根节点 `data-placeholder` 属性。
- 与 `code-editor` 职责分离清晰：`editor` 是富文本 WYSIWYG，`code-editor` 是代码编辑。

## V12b 行为契约补记（plan 485）

- Link 工具条反馈通道：`editor-toolbar-config.ts` 的 link run 返回 `ToolbarRunFeedback`；unsafe scheme（`isSafeLinkUrl` 拒绝）不再静默丢弃，`editor-renderer.tsx` 经 `data-slot="editor-toolbar-feedback"` 渲染 inline `role="status"` destructive 提示（`flux.editor.unsafeLink`）。URL 输入维持 window.prompt（plan 480 Image 同先例；prompt→popover 为后续设计升级候选）。
- 外部值同步（G2-R4-视角5-01）：编辑器聚焦期间到达的外部 value 变更入 pending 队列（仅保留最新），blur 时应用；非聚焦期即时应用。渲染期禁止 ref 写入，经 effect 镜像转发（react-compiler 契约）。
- 工具条文案/几何 i18n 化（`flux.editor.*`、面板键 `flux.dashboard.editor.*` 属 dashboard-editor 面）。
