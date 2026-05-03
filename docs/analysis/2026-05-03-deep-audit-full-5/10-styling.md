# 10 样式系统合规性

- 初审发现数: 3
- 维度复核: 完成
- 子项复核: 2
- 最终结果: 保留 2 / 降级 1 / 驳回 0

## 保留

### [维度10] `flux-code-editor` 包级样式仍硬编码主题色

- **文件**: `packages/flux-code-editor/src/code-editor-styles.css:6-17,19-31,68-90,127-170,245-280`
- **证据片段**:
  ```css
  .nop-code-editor[data-fullscreen] {
    background-color: #fff;
  }
  .nop-code-editor[data-fullscreen][data-theme='dark'] {
    background-color: #1e1e1e;
  }
  [data-slot='code-editor-header-title'] {
    color: #333;
  }
  [data-slot='code-editor-result-panel'][data-state='error'] {
    color: #c00;
  }
  ```
- **严重程度**: P1
- **违规类别**: 主题
- **现状**: 可复用 code editor widget 的包级视觉仍直接写死背景、边框、标题与错误色，只通过 `data-theme="light|dark"` 在包内切换，没有接入共享主题 token。
- **建议**: 将颜色和边框提升为稳定 CSS 变量，由 theme layer 提供默认值。
- **为什么值得现在做**: 这是当前 theme compatibility 的真实违约，宿主无法通过统一 token 稳定换肤。
- **误报排除**: 复核明确区分了“widget 可拥有自带样式”与“包拥有视觉仍应读 token”；这里命中的是后者。
- **参考文档**: `docs/architecture/theme-compatibility.md`, `docs/architecture/styling-system.md`
- **复核状态**: 子项复核通过

### [维度10] `report-field-panel.css` 仍使用固定调色板

- **文件**: `packages/report-designer-renderers/src/report-field-panel.css:20-24,38-52,61-69`
- **证据片段**:
  ```css
  [data-slot='report-field-panel-source-label'] {
    color: rgb(15 23 42);
  }
  [data-slot='report-field-panel-item'] {
    border: 1px solid rgb(226 232 240);
    background: rgb(255 255 255);
  }
  ```
- **严重程度**: P2
- **违规类别**: 主题
- **现状**: 可复用 field panel 已使用 `data-slot`，但视觉颜色仍写死在包级 CSS 中。
- **建议**: 保留结构槽位，改为 `--nop-*` 或语义色 token。
- **为什么值得现在做**: 这是 report designer 公共面板的主题兼容缺口。
- **误报排除**: 不是在否定 widget 的局部 spacing 或 panel 布局；问题只在色彩与边框未主题化。
- **参考文档**: `docs/architecture/theme-compatibility.md`
- **复核状态**: 维度复核通过

## 已降级

- `packages/spreadsheet-renderers/src/canvas-styles.css` 混入 toolbar/panel/tab bar 外壳 UI: **已降级**
  - 子项复核确认文件范围确有漂移，但这些样式仍归 `@nop-chaos/spreadsheet-renderers` 包自身所有，不构成当前 owner 越界；更像文件范围命名与样式装配待收敛问题。
