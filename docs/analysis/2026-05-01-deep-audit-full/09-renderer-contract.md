# 09 渲染器契约合规性

## 复核结论

- 保留: 5
- 降级: 2
- 驳回: 0

## 保留

### `designer-page` 从 `props.schema` 读取关键业务输入

- 文件: `packages/flow-designer-renderers/src/designer-page.tsx`
- 结论: 保留，P1
- 依据: `config` / `document` / `treeDocument` / `statusPath` 均来自 `props.schema`，绕过 `props.props` resolved channel。

### code editor binding 直接读 store

- 文件: `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts`
- 结论: 保留，P1
- 依据: render 时直接 `currentForm.store.getState().values` 与 `scope.get(name)`，不走 reactive selector。

### container 仍注入 renderer-level fallback gap

- 文件: `packages/flux-renderers-basic/src/container.tsx`
- 结论: 保留，P2
- 依据: flex child 模式无显式 gap 时仍写入 `gap: var(--space-form-item-gap)`。

### host page renderer 根节点 meta 透传不完整

- 文件: `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`
- 结论: 保留，低严重度
- 依据: 多个 host page root 丢失 `meta.className` / `meta.testid` / `meta.cid` 的全部或部分透传。

### report subrenderer 仍使用自定义 class merge helper

- 文件: `packages/report-designer-renderers/src/helpers.ts`, `packages/report-designer-renderers/src/field-panel-renderer.tsx`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
- 结论: 保留，低严重度
- 依据: `joinClassNames(...)` 与 repo 统一 `cn()` 约定不一致。

## 已降级

### word editor `onBack` 丢失原生 click event

- 文件: `packages/word-editor-renderers/src/word-editor-page.tsx`
- 结论: 已降级
- 依据: 问题存在，但比 root meta drift 更局部。

### report/spreadsheet/word 三包 root meta 问题不是完全同态

- 结论: 已降级
- 依据: 三者都有 root contract drift，但缺失项并不完全一致，因此按 grouped low-risk pattern 收口更准确。
