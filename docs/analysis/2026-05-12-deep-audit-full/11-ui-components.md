# 维度 11：UI 组件使用合规性

## 范围与状态

- 审核范围：UI primitive 使用合规性，重点识别生产 renderer/debugger 代码中绕过 `@nop-chaos/ui` 的 visible controls。
- 来源限定：本文件仅基于同目录 `stage-1-full-findings-11-15.md`、`raw-findings-07-20.md`、`final-review-results-11-15.md`、`summary.md` 重写。
- 当前状态：最终归档维度文件。运行时代码未修改。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 1 项：`11-01`。
- 第 2-5 轮追加深挖发现 2 项：`11-02`、`11-03`。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

- 最终复核条目数：3。
- 最终保留：3。
- 最终驳回：0。
- 严重程度分布：P3 3 项。

## 最终保留项

### [11-01] Debugger JSON viewer 折叠控件使用 raw `<button>`

- 文件：`packages/nop-debugger/src/panel/json-viewer.tsx:58-66`, `103-111`
- 严重程度：P3
- 当前行为：`JsonViewer` 直接渲染 native button 作为 array/object expand-collapse 控件。
- 风险：绕过 `@nop-chaos/ui` Button 的 shared focus styling、sizing、theme 行为。
- 建议：替换为 `@nop-chaos/ui` 的 `Button`，保留 `aria-expanded`、`aria-label` 和 debugger marker class。
- 误报排除：不在 `packages/ui`、不是测试代码、不是隐藏 browser-control；debugger 其他 panel 已使用 UI Button。
- 最终复核结论：保留，P3。
- 修订标题/理由：标题保持为 debugger JSON viewer collapse controls 使用 raw `<button>`；最终复核确认它不是 tests/UI 内部/hidden browser control。
- 证据片段：

```tsx
<button
  type="button"
  className="ndbg-json-toggle"
  aria-expanded={!collapsed}
  aria-label={`${collapsed ? 'Expand' : 'Collapse'} JSON array`}
  onClick={() => setCollapsed((value) => !value)}
>
  {collapsed ? `▶ Array(${data.length})` : `▼ Array(${data.length})`}
</button>
```

### [11-02] SpreadsheetGrid 生产代码使用 raw input/table/button 绕过 UI primitives

- 文件：`packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:316-330`, `455`, `547-554`
- 严重程度：P3
- 当前行为：spreadsheet production renderer 使用 raw `input`、`table`、`button`，而 `@nop-chaos/ui` 已提供 `Input`、`Table`、`Button`。
- 风险：共享 focus、disabled、density、token 和 a11y 约定无法统一；spreadsheet 表面与设计系统漂移。
- 建议：尽量替换为 UI primitives；若因 grid、virtualization 或 semantics 需要 raw DOM，应在 renderer contract 附近写明豁免。
- 误报排除：排除了 `packages/ui` 内部实现和测试文件；这里是生产 renderer package。
- 最终复核结论：保留，P3。
- 修订标题/理由：标题保持为 SpreadsheetGrid production renderer raw input/table/button；最终复核补充 table 可能需要豁免但未文档化，input/button 仍可优先 UI primitive。
- 证据片段：

```tsx
<input
  type="text"
  className="ss-cell-edit-input"
```

```tsx
<table key={activeSheetId}>
```

```tsx
<button
  type="button"
  className="ss-row-header-button"
  aria-label={`Select row ${r + 1}`}
```

### [11-03] Word editor 字体工具栏使用 visible raw color inputs

- 文件：`packages/word-editor-renderers/src/toolbar/font-controls.tsx:110-123`
- 严重程度：P3
- 当前行为：visible toolbar controls 使用 raw `input type="color"`，而同文件已使用 UI select/cn。
- 风险：颜色控件无法继承设计系统尺寸、focus ring、disabled 和 theme 约定。
- 建议：新增/导出 UI color input primitive，或确认 `Input` 支持 color type 后替换。
- 误报排除：hidden file input 属于浏览器 file picker 特例，本条针对可见 toolbar controls。
- 最终复核结论：保留，P3。
- 修订标题/理由：标题保持为 Word editor font toolbar visible `input type="color"`；最终复核明确可用 UI `Input type="color"` 或 dedicated primitive 替换。
- 证据片段：

```tsx
<input
  type="color"
  value={selection.color || '#000000'}
  onChange={(e) => bridge?.command?.executeColor(e.target.value)}
/>
...
<input
  type="color"
  value={selection.highlight || '#ffff00'}
  onChange={(e) => bridge?.command?.executeHighlight(e.target.value)}
/>
```

## 最终驳回项

无。
