# 10 样式系统合规性

- Task ID: `ses_268cac48affe9LucoGdwsnD938`
- Source prompt: `docs/skills/deep-audit-prompts.md`

# 样式系统合规性审计（维度 10）

## `@nop-chaos/flux-renderers-basic`
未发现需要报告的问题。

## `@nop-chaos/flux-renderers-form`

### [维度10] 表单输入 renderer 仍把内部 `nop-*` 类当作带样式的布局类使用
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:106-126,163-199,216-239,257-288`; `C:\can\nop\nop-chaos-flux\apps\playground\src\styles.css:866-958`
- **严重程度**: P1
- **违规类别**: marker
- **现状**: `nop-select-wrapper`、`nop-checkbox-wrapper`、`nop-radio-group-item` 等内部 `nop-*` 类在 renderer 中直接输出，并在 playground CSS 中承载 `display/grid/inline-flex/gap/font-weight` 等视觉与间距；这不是零样式 root marker，且未见对应自动化守卫覆盖此类回归。
- **建议**: 内部结构改用 `data-slot` / `data-*`；默认布局移到包内可复用 UI 样式或显式 schema `className` / `classAliases`，不要再依赖 playground CSS 给 renderer 补样式。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`

## `@nop-chaos/flux-renderers-data`
未发现需要报告的问题。

## `@nop-chaos/flux-code-editor`
未发现需要报告的问题。

## `@nop-chaos/flow-designer-renderers`

### [维度10] Flow Designer 默认面板与画布仍在 renderer 代码中硬编码主题色和背景
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-inspector.tsx:6-23,58-86,222-298`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-palette.tsx:57-98`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\DesignerXyflowCanvas.tsx:309-397`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\DesignerXyflowEdge.tsx:55-87,101-126`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx:410-455`
- **严重程度**: P1
- **违规类别**: 主题
- **现状**: inspector、palette、canvas、edge actions、dialog 壳层大量直接写入 hex/rgba/hsl/gradient，而不是经由 `--nop-*` / `--fd-*` token；这类问题主要仍靠人工审计发现。
- **建议**: 把包拥有的视觉收敛到 `.nop-theme-root` / `.fd-theme-root` 和共享 token，renderer 仅保留稳定结构与状态钩子，颜色/背景交给 CSS 变量层。
- **参考文档**: `docs/architecture/theme-compatibility.md`, `docs/architecture/styling-system.md`

### [维度10] Flow Designer playground 节点样式仍保留 BEM 区域类
- **文件**: `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer-nodes.css:1-215`; `C:\can\nop\nop-chaos-flux\apps\playground\src\schemas\dingtalk-workflow-tree-schema.json:92-176`; `C:\can\nop\nop-chaos-flux\apps\playground\src\schemas\action-flow-tree-schema.json:105-162`
- **严重程度**: P2
- **违规类别**: BEM
- **现状**: `nop-dt-node__header`、`nop-af-node__meta--when` 等 BEM 类仍是当前 playground schema 的主路径，未迁移到 `data-slot` / `data-*`；现有自动化只覆盖了个别 `nop-icon--` 场景，未覆盖这组残留。
- **建议**: 将示例 schema 与样式同步迁移到 root marker + `data-slot` / `data-*` 协议，清理 `__` / `--` 风格命名。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`

## `@nop-chaos/report-designer-renderers`
未发现需要报告的问题。

## `@nop-chaos/spreadsheet-renderers`

### [维度10] Spreadsheet grid 主路径未按 hybrid 策略消费 `ss-*` 与 `cell-style-map`
- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid.tsx:153-185,188-247,253-295`; `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\cell-style-map.ts:1-135`
- **严重程度**: P1
- **违规类别**: spreadsheet
- **现状**: grid 仍把 `fontWeight`、`fontStyle`、`textDecoration`、`textAlign`、`verticalAlign`、`borderStyle` 等有限集合样式直接塞进 inline style，并使用 `spreadsheet-grid` / `row-header` / `col-header` 等非 `ss-*` 命名；仓内虽已有 `cell-style-map.ts`，但主渲染路径未接线。
- **建议**: 让 cell/header/grid 统一走 `ss-*` class + 连续值 inline style + `data-*` 状态的 hybrid 策略，并把结构类命名收敛回文档定义的 `ss-*` 集合。
- **参考文档**: `docs/architecture/report-designer/spreadsheet-canvas-css.md`, `docs/architecture/styling-system.md`

### [维度10] Spreadsheet toolbar 的包级视觉仍依赖 playground CSS
- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-toolbar.tsx:147-272`; `C:\can\nop\nop-chaos-flux\apps\playground\src\styles.css:220-259,450-598`
- **严重程度**: P1
- **违规类别**: 主题
- **现状**: `rd-toolbar`、`bg-btn`、`color-btn`、`find-replace-panel`、`cell-editor` 等样式只定义在 playground CSS，`@nop-chaos/spreadsheet-renderers` 自身未携带对应样式入口，导致包级 renderer 视觉依赖 app shell；未见自动化覆盖这一耦合。
- **建议**: 将 toolbar / editor / comment / find-replace 的样式迁入 `spreadsheet-renderers` 包或共享样式入口，并改为 token/CSS-variable 驱动。
- **参考文档**: `docs/architecture/theme-compatibility.md`, `docs/architecture/report-designer/spreadsheet-canvas-css.md`

## `@nop-chaos/word-editor-renderers`
未发现需要报告的问题。

## 跨项复核（本轮未发现需要报告的问题）

- `classAliases` 递归展开、父子覆盖、`NodeRenderer` provider 发布：未发现需要报告的问题。核对文件：`C:\can\nop\nop-chaos-flux\packages\flux-core\src\class-aliases.ts`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer.tsx`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer-providers.tsx`
- playground `stack-*` / `hstack-*` 工具类定义与当前使用面：未发现需要报告的问题。核对文件：`C:\can\nop\nop-chaos-flux\apps\playground\src\styles-theme-utilities.css`
- `ThemeProvider` 依赖检查：未发现需要报告的问题。
- Tailwind `@source "../../../packages"` 覆盖与 `tailwind-safelist.txt` 基线：未发现需要报告的问题。
