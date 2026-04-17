# 10 样式系统合规性

- Task ID: `ses_268cac48affe9LucoGdwsnD938`
- Source prompt: `docs/skills/deep-audit-prompts.md`

# 样式系统合规性审计（维度 10）

## `@nop-chaos/flux-renderers-basic`
未发现需要报告的问题。

## `@nop-chaos/flux-renderers-form`

已复核并修复真实问题。

- **修复**: `packages/flux-renderers-form/src/{renderers/input.tsx,index.tsx,form-renderers.css}`, `packages/flux-renderers-form/package.json`
- **结论**: `nop-select-wrapper`、`nop-checkbox-wrapper` 等根 wrapper 保留为语义壳层可接受，但 renderer 内部结构已改用 `data-slot`，默认样式也已迁入包内 CSS，不再依赖 playground `styles.css`。原审计把“包内默认样式存在”与“playground 耦合”混为一谈，真实问题只在后者。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`

## `@nop-chaos/flux-renderers-data`
未发现需要报告的问题。

## `@nop-chaos/flux-code-editor`
未发现需要报告的问题。

## `@nop-chaos/flow-designer-renderers`

### [维度10] Flow Designer 主题收敛已有进展，但仍有残余字面量颜色
- **文件**: 已收敛部分：`packages/flow-designer-renderers/src/{index.tsx,designer-page.tsx,designer-toolbar.tsx,designer-inspector.tsx,designer-palette.tsx,designer-xyflow-canvas/DesignerXyflowCanvas.tsx,designer-xyflow-canvas/DesignerXyflowEdge.tsx,designer-theme.css}`；残余热点：`designer-inspector.tsx:6-23`, `designer-canvas.tsx`, `dingflow/*`
- **严重程度**: P2
- **违规类别**: 主题
- **现状**: 本轮已把 page/panel/canvas/edge-action 这类包拥有的壳层视觉迁入 `designer-theme.css`，并经 `.fd-theme-root` / `--fd-*` token 消费；但节点类型语义色和 DingFlow overlay/button 仍保留部分字面量颜色，`themeStyles` escape hatch 也仍在。
- **建议**: 后续继续把节点语义色和 DingFlow overlay 颜色收敛到 `--fd-*` token；这部分是剩余主题债务，不再是“默认面板与画布大面积硬编码”的原始 P1。
- **参考文档**: `docs/architecture/theme-compatibility.md`, `docs/architecture/styling-system.md`

### [维度10] Flow Designer playground 节点样式仍保留 BEM 区域类
- **文件**: `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer-nodes.css:1-215`; `C:\can\nop\nop-chaos-flux\apps\playground\src\schemas\dingtalk-workflow-tree-schema.json:92-176`; `C:\can\nop\nop-chaos-flux\apps\playground\src\schemas\action-flow-tree-schema.json:105-162`
- **严重程度**: P2
- **违规类别**: BEM
- **现状**: `nop-dt-node__header`、`nop-af-node__meta--when` 等 BEM 类仍是当前 playground schema 的主路径，未迁移到 `data-slot` / `data-*`；现有自动化未覆盖这组残留。
- **建议**: 将示例 schema 与样式同步迁移到 root marker + `data-slot` / `data-*` 协议，清理 `__` / `--` 风格命名。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`

## `@nop-chaos/report-designer-renderers`
未发现需要报告的问题。

## `@nop-chaos/spreadsheet-renderers`

### [维度10] Spreadsheet grid 审计项已部分修正，原结论存在机械化过度
- **文件**: `packages/spreadsheet-renderers/src/{spreadsheet-grid.tsx,cell-style-map.ts,canvas-styles.css}`
- **严重程度**: 已处理/例外说明
- **违规类别**: spreadsheet
- **现状**: 本轮已将 `spreadsheet-grid.tsx` 接到 `cell-style-map.ts`，有限集合样式改走 `ss-*` class，连续值仍保留 inline style。原审计要求把 `spreadsheet-grid` / `row-header` / `col-header` 等结构类一律改成 `ss-*`，这部分不应教条化处理；对于 spreadsheet/cell 这类大批量一致控件，包拥有的结构类和混合样式策略本身就是文档允许的性能特例。
- **建议**: 保持当前 hybrid 策略，后续只在确有收益时再收敛命名，不把“非 `ss-*` 结构类”本身当作缺陷。
- **参考文档**: `docs/architecture/report-designer/spreadsheet-canvas-css.md`, `docs/architecture/styling-system.md`

### [维度10] Spreadsheet toolbar 的包级视觉仍依赖 playground CSS
- **状态**: 已修复
- **修复**: `packages/spreadsheet-renderers/src/{index.ts,styles.d.ts,canvas-styles.css}`
- **结论**: `rd-toolbar`、`bg-btn`、`color-btn`、`find-replace-panel`、`cell-editor` 等样式已迁入 `@nop-chaos/spreadsheet-renderers` 包入口，playground 不再承担这些 renderer 视觉样式。
- **参考文档**: `docs/architecture/theme-compatibility.md`, `docs/architecture/report-designer/spreadsheet-canvas-css.md`

## `@nop-chaos/word-editor-renderers`
未发现需要报告的问题。

## 跨项复核（本轮未发现需要报告的问题）

- `classAliases` 递归展开、父子覆盖、`NodeRenderer` provider 发布：未发现需要报告的问题。核对文件：`packages/flux-core/src/class-aliases.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`
- playground `stack-*` / `hstack-*` 工具类定义与当前使用面：未发现需要报告的问题。核对文件：`apps/playground/src/styles-theme-utilities.css`
- `ThemeProvider` 依赖检查：未发现需要报告的问题。
- Tailwind `@source "../../../packages"` 覆盖与 `tailwind-safelist.txt` 基线：未发现需要报告的问题。
