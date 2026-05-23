# 维度 10：样式系统合规性

## 第 1 轮（初审）

### [维度10-01] `canvas-styles.css` 含有多组与 spreadsheet canvas 无关的全局选择器

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:223-245,341-385`
- **证据片段**:
  ```css
  .rd-toolbar { ... }
  .rd-toolbar-group { ... }
  .find-replace-panel,
  .cell-editor,
  .comment-editor { ... }
  .find-row input { ... }
  ```
- **严重程度**: P1
- **现状**: 包级 CSS 使用未根植到 `spreadsheet-*` / `ss-*` canvas 表面的全局类选择器。
- **风险**: 其他宿主/页面上只要复用了同名类，就可能被 spreadsheet 包 CSS 静默污染。
- **建议**: 将非 canvas shell 样式迁移到稳定 `data-slot="spreadsheet-*"` 或 package root 作用域之下。
- **为什么值得现在做**: 这是当前样式 contract 的真实跨包泄漏风险。
- **误报排除**: 不包含 `ss-*` 头/格子等文档允许的 canvas 内部 class。
- **历史模式对应**: package-level selector leakage。
- **参考文档**: `docs/architecture/report-designer/spreadsheet-canvas-css.md`
- **复核状态**: 未复核

### [维度10-02] spreadsheet 外层 shell 仍有部分样式绕开 `--nop-*` token contract

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:642-645,736-745,776-778`
- **证据片段**:
  ```css
  border-top: 1px solid var(--border, #e2e8f0);
  border: 2px solid var(--ring, hsl(223 64% 48%));
  background-color: var(--background, #ffffff);
  color: var(--foreground, #0f172a);
  color: var(--destructive, hsl(0 84% 60%));
  ```
- **严重程度**: P2
- **现状**: 外层 shell 仍混用 shadcn token 与硬编码色，而非统一 `--nop-*` 主题变量。
- **风险**: host 主题切换时，部分外层 chrome 会与全仓主题 contract 脱节。
- **建议**: 将 outer chrome 收敛到 `--nop-*` 语义 token。
- **为什么值得现在做**: 复核确认问题真实，但范围并非“全部 outer chrome”。
- **误报排除**: 不把高性能 canvas 内部格子颜色当作本条问题的一部分。
- **历史模式对应**: partial theme-token bypass。
- **参考文档**: `docs/architecture/theme-compatibility.md`
- **复核状态**: 未复核

### [维度10-03] spreadsheet header 基础样式重复定义且互相冲突

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:81-112,397-429`
- **证据片段**:

  ```css
  .ss-col-header,
  [data-slot='spreadsheet-column-header'] {
    font-size: 12px;
    background: linear-gradient(...);
  }

  .ss-col-header {
    font-size: 10pt;
    background-color: #f8f9fa;
  }
  ```

- **严重程度**: P1
- **现状**: 同一 class 的基础外观被分散到两处互相冲突的 base rule 中。
- **风险**: 实际显示效果依赖 cascade 顺序，维护时很容易出现静默视觉漂移。
- **建议**: 合并为单一 canonical base rule，只保留 additive state rules。
- **为什么值得现在做**: 这是典型的 live style-contract 冲突，修复收益直接。
- **误报排除**: 不包含 hover/active 等状态 selector；仅保留基础样式冲突本身。
- **历史模式对应**: duplicated base style contract。
- **参考文档**: `docs/architecture/styling-system.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度10-04] `canvas-styles.css` 通过 `.find-row input` 直接耦合 `Input` 内部 DOM，而非稳定 slot/root hook

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:375-386`
- **证据片段**:
  ```css
  .find-row input {
    flex: 1;
  }
  .find-row input:focus {
    outline: none;
  }
  ```
- **严重程度**: P2
- **现状**: 该样式直接命中原生 `input`，而不是命中 `@nop-chaos/ui` `Input` 的稳定 slot/root 约定。
- **风险**: 一旦 `Input` 内部 DOM 结构调整，当前 shell 样式会静默失配。
- **建议**: 改为以 `data-slot="input"` 或局部 wrapper marker 为选择器。
- **为什么值得现在做**: 复核确认这是 partial issue，不应泛化到 Button，但 Input coupling 已真实存在。
- **误报排除**: 已经把“Button/Input 全面耦合”降级为更窄的 Input-specific 事实。
- **历史模式对应**: UI primitive internal DOM coupling。
- **参考文档**: `docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度10-01]：保留 (P1)。global selector leakage 成立。
- [维度10-02]：降级为 P2。问题真实，但不是所有 outer chrome 都绕开 `--nop-*`。
- [维度10-03]：保留 (P1)。header base selector duplication 成立。
- [维度10-04]：降级为 P2。仅确认 `Input` internal DOM coupling，不扩展到 Button。

## 最终保留项

| 编号  | 严重程度 | 文件                                                           | 一句话摘要                                               |
| ----- | -------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| 10-01 | P1       | `packages/spreadsheet-renderers/src/canvas-styles.css:223-245` | spreadsheet package CSS 含有与 canvas 无关的全局选择器   |
| 10-03 | P1       | `packages/spreadsheet-renderers/src/canvas-styles.css:81-112`  | spreadsheet header 基础样式重复定义且冲突                |
| 10-02 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css:642-645` | spreadsheet 外层 shell 部分绕开 `--nop-*` token contract |
| 10-04 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css:375-386` | stylesheet 通过 `.find-row input` 耦合 `Input` 内部 DOM  |
