# 维度10 样式系统合规性

- 初审发现数: 4
- 复核结果: 保留 3 / 降级 1 / 驳回 0

### [维度10] `word-editor-renderers` 直接依赖 playground 私有 `--nop-*` token

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:352-371,446,482-484`, `packages/word-editor-renderers/src/preview/doc-preview-page.tsx:61-79,87-113`, `packages/word-editor-renderers/src/panels/dataset-panel.tsx`, `packages/word-editor-renderers/src/panels/field-list.tsx`
- **证据片段**:

```tsx
className = 'bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)]';
```

- **严重程度**: P1
- **违规类别**: 主题独立性
- **现状**: 包源码直接消费 `--nop-*`，但这些默认值只在 `apps/playground/src/styles.css` 的 `.nop-theme-root` 下定义，`packages/theme-tokens/src/styles.css` 未提供对应契约。
- **风险**: 组件离开 playground 宿主后可能失去背景/边框/文本颜色默认值，破坏包级自洽性。
- **建议**: 将这组 token 下沉到共享 theme-tokens，或在包内提供稳定 fallback。
- **为什么值得现在做**: 这是实际 shipped package 对 app 私有 CSS 的反向依赖。
- **误报排除**: 问题不是“用了 CSS 变量”，而是“变量只存在于 playground 私有入口”。
- **历史模式对应**: package depends on app theme root.
- **参考文档**: `docs/architecture/theme-compatibility.md`
- **复核状态**: `子项复核通过`

### [维度10] `ReportFieldPanel` 公开组件依赖 playground CSS

- **文件**: `packages/report-designer-renderers/src/report-field-panel.tsx:16-39`, `packages/report-designer-renderers/src/index.ts:29-30`, `apps/playground/src/styles.css:260-318`
- **证据片段**:

```tsx
<div className="field-source"> ...
```

- **严重程度**: P2
- **违规类别**: 主题独立性 / 样式归属
- **现状**: 公开导出的 `ReportFieldPanel` 依赖 `.field-source/.field-group/.field-item`，样式只在 playground 中定义。
- **风险**: 组件作为包公共面时没有自有样式契约，离开 playground 就失真。
- **建议**: 若保留为公共组件，则迁到包内 CSS/`data-slot` 契约；否则停止从公共入口导出。
- **为什么值得现在做**: 公开 surface 已经与 playground 样式绑定。
- **误报排除**: 问题不在 `field-panel-renderer.tsx`，而在另一个被公开导出的 helper 组件。
- **历史模式对应**: public component piggybacks on app CSS.
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`
- **复核状态**: `维度复核通过`

### [维度10] Flow Designer 默认 token 层未优先复用共享 `--nop-*`

- **文件**: `packages/flow-designer-renderers/src/designer-theme.css:1-24`, `packages/flow-designer-renderers/src/designer-page.tsx:346`
- **证据片段**:

```css
.fd-theme-root {
  --fd-panel-bg: rgba(...);
  --fd-toolbar-bg: linear-gradient(...);
}
```

- **严重程度**: P3
- **违规类别**: 主题独立性 / token 分层
- **现状**: `--fd-*` 默认层以字面量为主，没有系统性映射到共享 `--nop-*` token。
- **风险**: cross-surface 主题一致性较弱，host override 需要记忆更多私有 token。
- **建议**: 优先用 `--nop-*` 推导 `--fd-*`，再保留局部 fallback。
- **为什么值得现在做**: 这能降低 host 主题接入的认知成本。
- **误报排除**: 不是在否定包内 CSS 本身；只针对共享 token 继承链未收敛。
- **历史模式对应**: local token family not layered on shared base.
- **参考文档**: `docs/architecture/theme-compatibility.md`
- **复核状态**: `维度复核通过`

## 已降级

- `apps/playground/src/flow-designer-nodes.css` 与示例 schema 中仍有 BEM 残留：真实存在，但主要位于 playground demo 层，降为 P3。
