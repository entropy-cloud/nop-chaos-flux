# 10 样式系统合规性

## 复核结论

- 保留: 4
- 降级: 2
- 驳回: 0

## 保留

### code editor 可复用视觉壳层落在 playground CSS

- 文件: `packages/flux-code-editor/src/code-editor-renderer.tsx`, `apps/playground/src/styles.css`
- 结论: 保留，P1
- 依据: 包自身没有 CSS side-effect import；`.nop-code-editor` 与 toolbar/panel/result 等 chrome 全在 playground 样式里。

### Flow Designer token 默认值仍过度依赖字面量

- 文件: `packages/flow-designer-renderers/src/designer-theme.css`, `packages/flow-designer-renderers/src/designer-node-appearance.ts`
- 结论: 保留，P2
- 依据: 多数 `--fd-*` 默认值仍直接写 `rgba` / gradient / hex，而不是优先衔接共享 `--nop-*` token。

### spreadsheet 结构类命名协议漂移

- 文件: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, `packages/spreadsheet-renderers/src/canvas-styles.css`
- 结论: 保留，P1
- 依据: live grid 使用 `spreadsheet-grid` / `row-header` / `col-header` 等非 `ss-*` 结构类，但 CSS 与 doc 仍同时保留另一套 `ss-*` 命名。

### spreadsheet canvas CSS owner 边界扩张到 toolbar / overlay / tab chrome

- 文件: `packages/spreadsheet-renderers/src/canvas-styles.css`
- 结论: 保留，P2
- 依据: `.rd-toolbar`、`.find-replace-panel`、`.cell-editor`、sheet tab 等外层 UI 也被并入 canvas CSS，而 owner doc 只为高密度画布子树保留此例外。

## 已降级

### container 默认 gap 问题需缩窄为 flex path 特例

- 文件: `packages/flux-renderers-basic/src/container.tsx`
- 结论: 已降级
- 依据: base default spacing 本身已在 `flux-react/default-spacing.css` 中作为文档化默认存在，真正的问题是 flex path 仍由 renderer inline 注入。

### code editor 主题问题需缩窄为硬编码 literal / owner split

- 文件: `packages/flux-code-editor/src/code-editor-renderer.tsx`, `apps/playground/src/styles.css`
- 结论: 已降级
- 依据: `editorTheme` 不是本地状态 owner 违规，但 light/dark 颜色大量硬编码且 owner 分散依旧成立。
