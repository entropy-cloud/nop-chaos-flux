# 10 样式系统合规性

## 复核统计

- 初审条目: 3
- 维度复核: 完成
- 子项复核: 3 条
- 保留: 2
- 降级: 1
- 驳回: 0

## 保留

### [维度10] `flux-code-editor` 可复用壳层颜色仍写死在包内 CSS 中

- **文件**: `packages/flux-code-editor/src/code-editor-styles.css:6-17`, `packages/flux-code-editor/src/code-editor-styles.css:19-30`, `packages/flux-code-editor/src/code-editor-styles.css:83-90`, `packages/flux-code-editor/src/code-editor-styles.css:253-259`
- **证据片段**:
  ```css
  .nop-code-editor[data-fullscreen] {
    background-color: #fff;
  }
  .nop-code-editor[data-fullscreen][data-theme='dark'] {
    background-color: #1e1e1e;
  }
  ```
  ```css
  [data-slot='code-editor-header-title'] {
    color: #333;
  }
  [data-slot='code-editor-result-panel'][data-state='error'] {
    color: #c00;
  }
  ```
- **严重程度**: P2
- **违规类别**: 主题独立性
- **现状**: package-owned code editor shell 仍直接使用 hex / rgba 颜色，而不是稳定 CSS variable。
- **建议**: 把 fullscreen shell、toolbar、header、result panel 的颜色提取到 token/variable。
- **为什么值得现在做**: 同包的 `extensions/base.ts` 已经在使用 token hook，当前样式层明显不一致。
- **误报排除**: item review确认这不是第三方 passthrough 边界，而是包自带的 reusable shell visual。
- **历史模式对应**: package-owned surface 未 token 化
- **参考文档**: `docs/architecture/theme-compatibility.md`
- **复核状态**: `子项复核通过`

### [维度10] spreadsheet chrome / shell selector 仍大量写死颜色

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:24-30`, `packages/spreadsheet-renderers/src/canvas-styles.css:185-237`, `packages/spreadsheet-renderers/src/canvas-styles.css:303-353`, `packages/spreadsheet-renderers/src/canvas-styles.css:621-784`
- **证据片段**:
  ```css
  .rd-toolbar {
    background: #f6f7fa;
    border-bottom: 1px solid rgb(226, 232, 240);
  }
  ```
  ```css
  .ss-sheet-bar {
    background: linear-gradient(to bottom, #f5f5f5 0%, #e8e8e8 100%);
    color: #333333;
  }
  ```
- **严重程度**: P2
- **违规类别**: spreadsheet / 主题独立性
- **现状**: spreadsheet 允许 cell subtree 走 hybrid styling，但外壳 toolbar/panel/tab bar 仍没有走 token/variable。
- **建议**: 仅收口 chrome/shell selector，不触碰允许的 cell-style runtime 路径。
- **为什么值得现在做**: item review已把问题范围缩窄为 shell/chrome，收益明确。
- **误报排除**: `cell-style-map.ts` 的动态 inline style 不在本条范围内。
- **历史模式对应**: high-volume host surface 外壳未对齐 theme contract
- **参考文档**: `docs/architecture/report-designer/spreadsheet-canvas-css.md`, `docs/architecture/theme-compatibility.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度10] `ContainerRenderer` 的默认 gap 问题只发生在 flex-child 路径

- **文件**: `packages/flux-renderers-basic/src/container.tsx:24-29`, `packages/flux-react/src/default-spacing.css:53-57`
- **证据片段**:
  ```tsx
  27:   useFlexChild && !gap.className && !gap.style
  28:     ? { gap: 'var(--space-form-item-gap)' }
  ```
  ```css
  .nop-container > [data-slot='container-body']:not([data-flex]) {
    gap: var(--space-form-item-gap);
  }
  ```
- **严重程度**: P1
- **违规类别**: spacing
- **现状**: 非 flex 路径已通过 theme CSS 提供默认间距，只有 flex-child 路径仍把默认 gap 放在 renderer code 里。
- **建议**: 仅修 flex-child fallback，不要把整条 container spacing 路径误判为全面失效。
- **为什么值得现在做**: 修复范围很窄，价值高。
- **误报排除**: item review确认这是 narrowed issue，而不是 container 全面违约。
- **历史模式对应**: partial contract drift on one branch
- **参考文档**: `docs/architecture/styling-system.md`
- **复核状态**: `已降级`

## 零发现

- `classAliases` 递归展开与覆盖逻辑当前无可报告问题。
- `stack-*` / `hstack-*` 使用和 playground utilities 当前一致。
- 未发现 live BEM residue。
- Tailwind `@source` 与 safelist 当前未见明显缺口。
