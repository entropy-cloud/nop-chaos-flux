# Markdown Editor 组件设计

## 1. 组件定位

- `markdown-editor` 是 markdown 源码编辑 + 实时预览表单字段 renderer。
- 左侧 Textarea 编辑 markdown 源码，右侧 `react-markdown` 实时渲染预览。
- 面向开发者/技术人员（了解 markdown 语法），不是 WYSIWYG。
- Flux 独有组件，无 AMIS 对应（AMIS 仅有 `markdown` 渲染器和 `input-rich-text` WYSIWYG）。

## 2. 与相关组件的边界

| 组件              | 场景                      | 实现底层                  |
| ----------------- | ------------------------- | ------------------------- |
| `markdown-editor` | markdown 源码编辑 + 预览  | Textarea + react-markdown |
| `editor`          | 表单字段级 WYSIWYG 富文本 | TipTap                    |
| `markdown`        | 只读 markdown 渲染        | react-markdown            |

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'markdown-editor'`
- 预期归属 `@nop-chaos/flux-renderers-form`
- 预期 `wrap: true`
- 零新依赖：Textarea 来自 `@nop-chaos/ui`，react-markdown 复用 `flux-renderers-content` 中 `markdown` 组件的依赖

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`placeholder`、`mode`、`readOnly`、`required`。
- `mode`：`split`（默认，左编辑右预览）/ `edit`（仅编辑）/ `preview`（仅预览）。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`placeholder`、`mode`、`readOnly`、`required`: `value`
- `onChange`、`onFocus`、`onBlur`: `event`

## 6. 实现方案

自建，约 150-300 行：

- **编辑区**：`@nop-chaos/ui` Textarea
- **预览区**：复用 `flux-renderers-content` 的 `markdown` renderer 渲染逻辑
- **工具栏**（可选）：粗体/斜体/标题/链接/代码块按钮，在 Textarea 光标位置插入 markdown 语法
- **滚动同步**：编辑区与预览区可选滚动联动

## 7. 运行期状态归属

- 编辑器值（markdown 源码字符串）归最近表单或 owner scope。
- 光标位置、滚动同步状态属于字段内部交互状态。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onChange`、`onFocus`、`onBlur`。

## 9. 样式与 DOM marker 约定

- 根节点输出 `nop-markdown-editor` marker。
- 编辑区 `nop-markdown-editor-input`，预览区 `nop-markdown-editor-preview`。

## 10. 风险、取舍与后续阶段

- 预览区复用 `markdown` 组件渲染逻辑，保证渲染一致性。
- 后续可增加分屏拖拽、全屏编辑、图片粘贴等增强功能。
