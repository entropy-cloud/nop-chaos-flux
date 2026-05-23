# 维度 10：样式系统合规性

## 第 1 轮（初审）

### [维度10-01] `flux-renderers-form` 的包级样式表使用裸 `[data-slot]` 选择器，样式作用域会泄漏到包外

- **文件**: `packages/flux-renderers-form/src/form-renderers.css:1-71`, `packages/flux-renderers-form/src/index.tsx:1`
- **证据片段**:

  ```css
  [data-slot='select-wrapper'] {
    display: grid;
    gap: 0.5rem;
  }

  [data-slot='checkbox-wrapper'] {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
  }
  ```

  ```ts
  import './form-renderers.css';
  ```

- **严重程度**: P2
- **契约条款**: package-owned CSS 应锚定在稳定 root marker 或 package scope 下，避免裸 `[data-slot='...']` 作为文档级全局选择器泄漏。
- **现状**: `form-renderers.css` 被包入口直接导入，但所有规则都以裸 `[data-slot='...']` 开头，没有 `.nop-form`、`.nop-field` 或其他 package/renderer root 作为作用域前缀。
- **风险**: 任何宿主页面、其他 renderer、未来 shadcn/ui 组件只要复用了同名 `data-slot`，都会被 `flux-renderers-form` 的样式静默污染。
- **建议**: 将规则统一改为稳定作用域锚点下的选择器，例如 `.nop-form ...`、`.nop-field ...` 或更窄的 package-owned root；必要时同时把过于通用的 slot 名重命名为 package-specific 名称。
- **误报排除**: 不是反对使用 `data-slot`，问题在于这些规则没有任何祖先 scope。
- **复核状态**: 未复核

### [维度10-02] `flux-code-editor` 的样式表同时存在裸 `[data-slot]` 选择器和硬编码颜色，破坏作用域隔离与主题兼容

- **文件**: `packages/flux-code-editor/src/code-editor-styles.css:15-286`, `packages/flux-code-editor/src/code-editor-renderer.tsx:1`
- **证据片段**:

  ```css
  [data-slot='code-editor-toolbar'] {
    display: flex;
    justify-content: flex-end;
    padding: 2px 4px;
    background: rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }

  [data-slot='code-editor-header-title'] {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }
  ```

  ```css
  .nop-code-editor[data-fullscreen][data-theme='dark'] {
    background-color: var(--nop-code-editor-dark-surface, #1e1e1e);
  }
  ```

- **严重程度**: P2
- **契约条款**: widget renderer 应通过稳定 root marker 与 `data-slot` 做内部结构锚定；可复用视觉默认值应优先走 token 或 CSS 变量，而不是 `#333/#666/#999/#1e1e1e/rgba(...)` 字面量。
- **现状**: 文件里大量基础规则直接写成裸 `[data-slot='code-editor-*']`，仅 dark-state 的部分分支带了 `.nop-code-editor` 前缀；同时存在多处硬编码颜色和 alpha 值。
- **风险**: 同名 slot 会被包外结构直接命中，且颜色无法与宿主主题 token 对齐，只能靠覆盖字面量修补。
- **建议**: 将所有 `code-editor-*` slot 规则统一收口到 `.nop-code-editor ...` 之下，并把字面量颜色迁移到 `--nop-code-editor-*` 变量。
- **误报排除**: 不是否定 widget renderer 自带完整样式；问题是“未作用域化的 slot selector + 不可主题化字面量颜色”同时成立。
- **复核状态**: 未复核

## 维度复核结论

- [维度10-01]: 保留为 P2。
- [维度10-02]: 保留为 P2。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                          | 一句话摘要                                                                            |
| ----- | -------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 10-01 | P2       | `packages/flux-renderers-form/src/form-renderers.css:1-71`    | form renderers 包级样式使用裸 `[data-slot]` 选择器，作用域会泄漏到包外                |
| 10-02 | P2       | `packages/flux-code-editor/src/code-editor-styles.css:15-286` | code-editor 样式同时存在裸 `[data-slot]` 选择器和硬编码颜色，破坏作用域隔离与主题兼容 |
