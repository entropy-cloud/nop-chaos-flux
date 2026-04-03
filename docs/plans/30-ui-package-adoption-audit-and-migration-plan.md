# UI 包统一化审计与迁移计划

> Plan Status: in-progress
> Last Reviewed: 2026-04-03
> Source: 全仓库通用组件审计——检查所有包是否正确使用 `@nop-chaos/ui` 的通用组件，仅领域特殊组件才自行实现。包含 toolbar 统一策略分析。

## 1. 审计结论总览

| 包 | ui 依赖 | 审计结果 |
|---|---|---|
| `flux-renderers-basic` | ✅ 有 | 正确使用 Button、Badge |
| `flux-renderers-form` | ✅ 有 | 正确使用 Input、Select、Checkbox、Switch、Textarea、Popover、RadioGroup |
| `flux-renderers-data` | ✅ 有 | 正确使用 Table、Checkbox、NativeSelect、Spinner |
| `flux-react` | ✅ 有 | 正确使用 Dialog |
| `flow-designer-renderers` | ✅ 有 | 正确使用 Dialog、Badge、Button、Input、Select、DataViewer |
| `spreadsheet-renderers` | ✅ 有 | **部分使用**——主 toolbar 用了 Button/Tooltip/Dialog，但 find/replace 和 sheet tab 仍用原生 HTML |
| `word-editor-renderers` | ✅ 有 | **极少使用**——仅导入 ScrollArea，大量原生 button/input/select/textarea 和手写 modal |
| `report-designer-renderers` | ❌ 无 | **零导入**——全部原生 button 做 tab 切换和表单提交 |
| `flux-code-editor` | ❌ 无 | **零导入**——`<span role="button">` 做按钮，自建 dropdown/spinner/table |
| `nop-debugger` | ❌ 无 | **零导入**——但经评估应保持独立（见下文） |
| `apps/playground` | ❌ 无 | demo 应用，低优先级 |

## 2. 按包分析与方案

---

### 2.1 `@nop-chaos/nop-debugger`：保持独立（不迁移）

**现状**：整个面板 UI 用自包含的 CSS 变量系统（28 个 `--nop-debugger-*` 变量），运行时注入 `<style>`，不依赖宿主主题。所有组件（tabs、badge、card、input、button、JsonViewer）均为自建。

**结论：不迁移。理由如下：**

1. **主题隔离是架构决策**。调试器设计为可嵌入任何宿主应用的自包含 widget，不能依赖宿主的 CSS 变量体系。`@nop-chaos/ui` 的组件依赖 shadcn 主题变量（`--background`、`--foreground` 等），二者无法对接。
2. **JsonViewer 不重复**。调试器的 JsonViewer（84 行、零依赖）有按深度展开、字符串/数组截断、调试器主题配色等定制能力。`@nop-chaos/ui` 的 JsonViewer 基于 `react-json-view-lite`，API 不同（boolean 展开 vs 数字深度），引入额外依赖得不偿失。
3. **所有通用组件都有 debugger 特定定制**。badge 有 7 种领域色彩变体、input 用 pill 形状、card 用自定义间距——强行映射到 ui 组件需要大量 className 覆写，净收益为负。
4. **无等价替代**。浮动可拖拽面板、launcher 按钮、inspect overlay、resize handle 等核心交互在 `@nop-chaos/ui` 中无对应组件。

**不需要任何改动。**

---

### 2.2 `@nop-chaos/flux-code-editor`：高优先级迁移

**现状**：零 `@nop-chaos/ui` 导入，无自己的主题体系，CSS 定义在 playground 的 `styles.css` 中。大量 `<span role="button">` 附带手动 `onKeyDown` 处理器实现可访问性。

**需要做的事：**

#### P1 — toolbar 按钮（消除大量样板代码）

| 文件 | 当前 | 替换为 |
|------|------|--------|
| `code-editor-renderer.tsx:283,305,328,345,364` | `<span role="button" tabIndex={0} onKeyDown={...}>` | `Button variant="ghost" size="icon-xs"` |
| `sql-result-panel.tsx:31,56` | `<span role="button">` close 按钮 | `Button variant="ghost" size="icon-xs"` + X icon |
| `variable-panel.tsx:23,59,93,105` | `<span role="button">` toggle/copy/insert | `Button variant="ghost" size="xs"` |

**收益**：消除约 50 行手动 role/tabIndex/onKeyDown 样板，自动获得键盘可访问性和一致的 focus/hover 样式。

#### P1 — snippet 下拉框

| 文件 | 当前 | 替换为 |
|------|------|--------|
| `extensions/snippet-panel.tsx` | 手动 click-outside + `useRef` 管理开关 | `Popover` + `PopoverTrigger` + `PopoverContent` |

**收益**：消除约 20 行手动事件处理，自动获得定位、焦点管理、可访问性。

#### P2 — SQL 结果表格

| 文件 | 当前 | 替换为 |
|------|------|--------|
| `sql-result-panel.tsx:69` | 无样式的 `<table>` | `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` |

**收益**：获得完整的表格样式（边框、内边距、对齐、响应式溢出）。当前完全无 CSS 定义。

#### P2 — 加载 spinner

| 文件 | 当前 | 替换为 |
|------|------|--------|
| `sql-result-panel.tsx:18` | `<span>` 无 CSS 定义，不可见 | `Spinner` |

**收益**：真正显示加载指示器。

#### P3 — 变量面板

| 文件 | 当前 | 替换为 |
|------|------|--------|
| `variable-panel.tsx` | 原生 `<div>` 列表 | `ScrollArea` 包裹列表区域 |
| `variable-panel.tsx` | `<span role="button">` 操作按钮 | `Button variant="ghost" size="xs"` |

#### 前置条件

在 `packages/flux-code-editor/package.json` 中添加：
```json
"@nop-chaos/ui": "workspace:*"
```

---

### 2.3 `@nop-chaos/word-editor-renderers`：高优先级迁移（toolbar 基元 + 对话框）

**现状**：有 `@nop-chaos/ui` 依赖但仅导入 `ScrollArea`。大量原生 HTML + 手写 modal。

#### Toolbar 基元

word editor 有三个自建 toolbar 基元（`toolbar/shared.tsx`）：

- **`ToolbarButton`**：带 icon、active/disabled 状态的按钮，inline Tailwind。
- **`ToolbarSeparator`**：`w-px h-6 bg-gray-200` 竖线分隔符。
- **`ToolbarGroup`**：`flex items-center gap-0.5` 容器。

**方案：迁移到 `@nop-chaos/ui` 的 Button/Separator（详见第 3 节 toolbar 策略）。** 其中 `ToolbarButton` 替换为 `Button variant="ghost" size="icon"` + active className；`ToolbarSeparator` 替换为 `Separator orientation="vertical"`；`ToolbarGroup` 就是 flex div，保留。

#### 迁移清单

| 优先级 | 当前 | 替换为 |
|--------|------|--------|
| P1 | `ToolbarButton` 组件 | `Button variant="ghost" size="icon"` + active 态 className |
| P1 | `ToolbarSeparator` | `Separator orientation="vertical"` |
| P1 | 4 处手写 modal overlay（`fixed inset-0 bg-black/50`） | `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` |
| P2 | 7 处原生 `<select>`（字体/字号/标题/行距/纸张/数据集类型/列类型） | `NativeSelect` + `NativeSelectOption`（简单下拉）或 `Select`（需要搜索/分组时） |
| P2 | 多处原生 `<input type="text">` | `Input` |
| P2 | 2 处原生 `<textarea>` | `Textarea` |
| P2 | 多处原生 `<button>`（Cancel/Save/Submit/Apply 等） | `Button` 及其 variant |
| P3 | 自定义 tabs（WordEditorPage 侧边栏 Datasets/Fields） | `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` |

#### 特殊控件——保持自定义

| 控件 | 原因 |
|------|------|
| `<input type="color">` 颜色选择器 | `@nop-chaos/ui` 无颜色选择器，原生控件是合理选择 |
| `<input type="file">` 文件上传 | 同上 |
| Canvas editor bridge 命令调度 | 领域逻辑，非 UI 层 |

---

### 2.4 `@nop-chaos/report-designer-renderers`：中优先级迁移

**现状**：零 `@nop-chaos/ui` 导入，无 `@nop-chaos/ui` 依赖。report designer **没有自己的 toolbar**——playground demo 直接导入并实例化 `SpreadsheetToolbar`（来自 `@nop-chaos/spreadsheet-renderers`），绕过了 page renderer 的 `toolbar` region slot。

#### Toolbar 现状与问题

1. **Playground demo 直接实例化 SpreadsheetToolbar**（`ReportDesignerDemo.tsx:224-266`），传入 40+ props。
2. **Page renderer 有 toolbar region slot**（`page-renderer.tsx:92,112`），但 demo 未使用——toolbar 是在 renderer 外部硬编码的。
3. **SpreadsheetToolbar 的局限**：
   - 无字体/字号下拉（word editor 有完整的 `<select>` 下拉）
   - 无颜色自由选择（仅预设色块：红/蓝/黑/黄/绿，word editor 用 `<input type="color">`）
   - 无 active 状态反馈（Bold/Italic/Underline 按钮不反映当前样式）
   - 无删除线/上标/下标
   - 样式依赖 `apps/playground/src/styles.css` 中的 `.rd-toolbar` / `.rd-toolbar-group` / `.rd-toolbar-separator` CSS 类（散落在 playground，不在组件包内）
4. **SpreadsheetToolbar 适合纯 spreadsheet，不适合 report designer**——report designer 需要：字段绑定、元数据标注、预览/导出、模板管理等，这些不在 spreadsheet toolbar 的职责范围内。

#### 方案

Report designer 应该有**自己的 toolbar 组件**（`ReportDesignerToolbar`），而不是复用 SpreadsheetToolbar：

1. **组合共享 toolbar 控件**（见第 3 节）——Bold/Italic/Underline + active 态、字体/字号下拉、颜色选择、对齐、撤销/重做、复制/剪切/粘贴。
2. **叠加 report designer 特有控件**——字段绑定、元数据查看/编辑、预览/导出、模板设置。
3. **通过 page renderer 的 `toolbar` region slot 注入**，而非在 demo 中直接实例化。
4. 保留对 spreadsheet 桥的命令调用（底层仍是 spreadsheet 操作），只是 UI 层和 props 接口由 report designer 自己控制。

#### 迁移清单

| 优先级 | 当前 | 替换为 |
|--------|------|--------|
| P1 | 原生 `<button className="nop-report-designer__tab">` | `Tabs` / `TabsList` / `TabsTrigger` |
| P1 | 原生 `<button>` Save/Submit | `Button` |
| P1 | 直接复用 SpreadsheetToolbar | 新建 `ReportDesignerToolbar`，组合共享控件 + 领域控件 |
| P2 | `styles.css` 中的 `.rd-toolbar-*` CSS | Tailwind inline classes（迁移后清理） |

#### 前置条件

在 `packages/report-designer-renderers/package.json` 中添加：
```json
"@nop-chaos/ui": "workspace:*"
```

---

### 2.5 `@nop-chaos/spreadsheet-renderers`：低优先级补全

**现状**：已有 `@nop-chaos/ui` 依赖，主 toolbar 正确使用 Button/Tooltip/Dialog，但部分面板仍用原生 HTML。

#### 迁移清单

| 优先级 | 当前 | 替换为 |
|--------|------|--------|
| P2 | find/replace 面板的 `<input type="text">` | `Input` |
| P2 | find/replace 面板的 `<button>`（Find Next/Replace/Replace All） | `Button variant="ghost" size="xs"` |
| P2 | sheet tab bar 的 `<button>` | `Button variant="ghost" size="xs"` |
| P2 | sheet tab bar 行内重命名 `<input>` | `Input` |
| P3 | comment 区域的 `<input>` | `Input` |

---

### 2.6 `apps/playground`：低优先级

demo 应用，不影响包的规范性。如需迁移：
- `FlowDesignerExample.tsx` 的 toolbar 按钮用 `Button`
- `DebuggerLabPage.tsx` 的 `ActionButton`/`SectionCard` 用 `Button`/`Card`

---

## 3. Toolbar 统一策略

### 3.1 两个 toolbar 的对比

经审查 word editor 和 spreadsheet 的 toolbar 实现，两者有大量重叠：

| 控件组 | Word Editor (`RibbonToolbar`) | Spreadsheet (`SpreadsheetToolbar`) | 共享？ |
|--------|------|------|------|
| Undo/Redo | ✅ `Undo2` / `Redo2`，基于 `selection.undo/redo` disabled | ✅ `Undo2` / `Redo2`，基于 `hasSelection` disabled | ✅ 相同 icon，不同状态源 |
| Copy/Cut/Paste | ✅ `Copy`/`Scissors`/`ClipboardPaste` | ✅ 同 | ✅ 完全相同 |
| Bold/Italic/Underline | ✅ 有 **active 态**（`selection.bold` 等） | ✅ **无 active 态** | ⚠️ 控件相同，spreadsheet 缺反馈 |
| Strikethrough | ✅ | ❌ | ❌ |
| Superscript/Subscript | ✅ | ❌ | ❌ |
| Alignment | ✅ `AlignLeft/Center/Right` | ✅ 同 | ✅ 相同 |
| Font dropdown | ✅ `<select>` 6 种字体 | ❌ | ❌ |
| Font size dropdown | ✅ `<select>` 16 种字号 | ❌ | ❌ |
| Color picker | ✅ `<input type="color">` 自由选色 | ⚠️ 预设色块（红/蓝/黑/黄/绿） | ⚠️ 功能差距大 |
| Background color | ✅ `<input type="color">` | ⚠️ 预设色块（黄/绿/蓝/无） | ⚠️ 同上 |
| Format Painter | ✅ `Paintbrush` | ❌ | ❌ |
| Find/Replace | ✅ 独立 `SearchReplace` 子组件 | ✅ 行内面板 | ⚠️ UI 不同，功能相同 |
| Merge/Unmerge | ❌ | ✅ `TableCellsMerge`/`TableCellsSplit` | ❌ spreadsheet 特有 |
| Insert/Delete Row/Col | ❌ | ✅ `Plus`/`Minus` | ❌ spreadsheet 特有 |
| Freeze/Unfreeze | ❌ | ✅ `Snowflake`/`Sun` | ❌ spreadsheet 特有 |
| Fill Down/Right | ❌ | ✅ `ArrowDown`/`ArrowRight` | ❌ spreadsheet 特有 |
| Comments | ❌ | ✅ `MessageSquare` | ❌ spreadsheet 特有 |
| Insert controls | ✅ 表达式/标签/水印/图片/表格 | ❌ | ❌ word 特有 |
| Template controls | ✅ 数据集/字段插入 | ❌ | ❌ word 特有 |
| Page controls | ✅ 纸张/边距/方向 | ❌ | ❌ word 特有 |

**结论：约 40% 的控件可在两个 toolbar 间共享。**

### 3.2 架构差异

| 维度 | Word Editor | Spreadsheet |
|------|------------|-------------|
| 渲染模式 | 硬编码 JSX，分 7 个子组件（`FontControls`/`ParagraphControls`/`InsertControls`/`TemplateControls`/`PageControls`/`SearchReplace`/`RibbonToolbar`） | 单文件 261 行，全部 inline |
| UI 组件 | 原生 `<button>` + inline Tailwind（`ToolbarButton` 自建） | `@nop-chaos/ui` Button + Tooltip |
| 状态绑定 | bridge + Zustand store hook（`useSyncExternalStoreWithSelector` 读 `selection`） | 纯 props（40+ 回调） |
| 样式来源 | 全部 inline Tailwind | `.rd-toolbar-*` CSS 类（定义在 `apps/playground/src/styles.css`） |
| 颜色选择 | `<input type="color">` 自由选色 | 预设色块 |

### 3.3 共享 toolbar 控件组

提取以下可复用的 toolbar 控件组。每组接收统一的 callback 接口，不绑定具体的状态管理：

#### Tier 1 — 高共享度，立即提取

| 控件组 | 包含 | Props 接口 |
|--------|------|-----------|
| **TextFormatControls** | Bold/Italic/Underline/Strikethrough（带 active 态） | `{ onStyle: (tool: string) => void; getActive: (tool: string) => boolean; disabled?: boolean }` |
| **AlignmentControls** | AlignLeft/Center/Right（带 active 态） | `{ onAlign: (align: string) => void; getActive?: (align: string) => boolean; disabled?: boolean }` |
| **ClipboardControls** | Copy/Cut/Paste/Clear | `{ onCopy, onCut, onPaste, onClear, disabled?: boolean }` |
| **UndoRedoControls** | Undo/Redo | `{ onUndo, onRedo, canUndo?, canRedo? }` |

#### Tier 2 — 中共享度，可提取但需适配

| 控件组 | 包含 | 说明 |
|--------|------|------|
| **FontFamilySelect** | 字体下拉 | word editor 有 6 种字体，spreadsheet 暂无；report designer 需要。提取为 `<NativeSelect>` 包装。 |
| **FontSizeSelect** | 字号下拉 | 同上。提取为 `<NativeSelect>` 包装。 |
| **ColorPickerButton** | 颜色选择按钮 | word editor 用 `<input type="color">`，spreadsheet 用预设色块。统一为：自由选色 + 可选预设色板。 |
| **FindReplacePanel** | 查找替换 | 两者都有，但 UI 不同。可提取共享逻辑（find/replace/findNext/replaceAll），UI 各自适配。 |

#### Tier 3 — 不共享，各包自有

| 控件组 | 归属 | 原因 |
|--------|------|------|
| Merge/Unmerge/FillControls | spreadsheet, report designer | 单元格操作，word 无概念 |
| Insert/Delete Row/Col | spreadsheet, report designer | 同上 |
| Freeze/Unfreeze | spreadsheet, report designer | 同上 |
| InsertControls (Expr/Tag/Watermark/Table) | word editor | 文档模型特有 |
| TemplateControls (Dataset/Field) | word editor | 文档模板特有 |
| PageControls (Paper/Margin/Orientation) | word editor | 文档页面设置 |
| FieldBinding/Inspect/Preview/Export | report designer | 报表特有 |

### 3.4 放置位置

**共享控件放在 `@nop-chaos/ui` 中**。理由：

1. 这些控件是对 `@nop-chaos/ui` 基础组件（Button、Separator、NativeSelect、Input）的组装，无领域逻辑。
2. 与现有 `@nop-chaos/ui` 组件（Button/Separator/Tabs）同层级，消费方一致。
3. 不需要新建包——增加维护成本，且共享控件数量有限（4 组 Tier 1 + 可选 Tier 2）。
4. Flow designer 的 schema-driven toolbar 不受影响——它不使用这些控件组。

命名约定：`packages/ui/src/components/toolbar/` 目录，导出：
- `TextFormatControls` / `AlignmentControls` / `ClipboardControls` / `UndoRedoControls`
- 可选：`FontFamilySelect` / `FontSizeSelect` / `ColorPickerButton`

### 3.5 各编辑器 toolbar 路线图

#### Word Editor (`RibbonToolbar`)

1. 迁移 `ToolbarButton` → `Button variant="ghost" size="icon"`
2. 用共享控件替换 `FontControls` 中的 Bold/Italic/Underline/Strikethrough、`ParagraphControls` 中的 Alignment
3. `UndoRedoControls`、`ClipboardControls` 替换对应部分
4. 领域特有控件（Insert/Template/Page）保留在 word-editor-renderers 包内

#### Spreadsheet (`SpreadsheetToolbar`)

1. 用共享 `TextFormatControls` 替换 Bold/Italic/Underline，**补上 active 态**（当前缺失）
2. 用共享 `AlignmentControls` 替换对齐按钮
3. 用共享 `ClipboardControls` 和 `UndoRedoControls` 替换对应部分
4. 清除 `apps/playground/src/styles.css` 中的 `.rd-toolbar-*` CSS，改用 inline Tailwind
5. 可选：添加 `FontFamilySelect` / `FontSizeSelect` / `ColorPickerButton`（提升功能到与 word editor 对齐）
6. 领域特有控件（Merge/Fill/RowCol/Freeze/Comment）保留在 spreadsheet-renderers 包内

#### Report Designer（新建 `ReportDesignerToolbar`）

1. **不复用 SpreadsheetToolbar**。新建 `ReportDesignerToolbar` 组件。
2. 组合共享控件：`UndoRedoControls` + `ClipboardControls` + `TextFormatControls` + `AlignmentControls` + 可选 `FontFamilySelect`/`FontSizeSelect`/`ColorPickerButton`
3. 叠加 spreadsheet 操作控件（从 SpreadsheetToolbar 提取）：Merge/Unmerge/Fill/Insert Row-Col/Freeze
4. 叠加 report designer 特有控件：字段绑定、元数据查看、预览/导出
5. 通过 `page-renderer.tsx` 的 `toolbar` region slot 注入，而非在 demo 中直接实例化
6. 状态绑定：通过 `ReportDesignerBridge` 统一调度 spreadsheet core + designer core

### 3.6 不做的事

1. **不建完整的 ribbon/toolbar 框架**——没有 toolbar layout engine、没有 tab 分页、没有动态配置。只是提取可复用的控件组（React 组件 + props 接口）。
2. **不改 flow designer 的 toolbar**——它用 schema-driven 渲染，架构不同，共享控件对它无收益。
3. **不统一状态管理**——各编辑器的状态源不同（bridge/store/props），共享控件通过 callback props 解耦。

---

## 4. 执行顺序

0. **@nop-chaos/ui 新增 size 变体 + 共享 toolbar 控件组**（前置步骤）：
   - Size 变体：Input `sm`、Dialog `size` prop、SelectTrigger `xs`、NativeSelect `xs`
   - Toolbar 控件组：`TextFormatControls`、`AlignmentControls`、`ClipboardControls`、`UndoRedoControls`（Tier 1）
   - 可选 Tier 2：`FontFamilySelect`、`FontSizeSelect`、`ColorPickerButton`
1. **flux-code-editor**（最简单，无主题冲突，收益最高——消除最多样板代码）
2. **word-editor-renderers**（toolbar 基元迁移 + 共享控件替换 + dialog 统一）
3. **report-designer-renderers**（新建 `ReportDesignerToolbar`，组合共享控件 + 领域控件，不再复用 SpreadsheetToolbar）
4. **spreadsheet-renderers**（用共享控件替换 + 补 active 态 + 清理 `.rd-toolbar-*` CSS）
5. ~~nop-debugger~~（不迁移）
6. ~~apps/playground~~（低优先级）

每个包迁移后需要：
- `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- playground 中实际验证 UI 渲染正常
- 更新 `docs/logs/` 开发日志

## 5. `@nop-chaos/ui` 组件 size 现状与需要新增的变体

### 5.1 现有 size 支持

| 组件 | 现有 size/variant | 样式细节 |
|------|-------------------|----------|
| **Button** | `default` / `xs` / `sm` / `lg` / `icon` / `icon-xs` / `icon-sm` / `icon-lg` | `xs`: h-6, text-xs, gap-1; `icon-xs`: size-6 square |
| **Input** | 无 size prop | 固定 h-9, px-3 |
| **Textarea** | 无 size prop | 固定 min-h-16, px-3 py-2 |
| **SelectTrigger** | `default` / `sm` | `default`: h-9; `sm`: h-8 |
| **NativeSelect** | `default` / `sm` | `default`: h-8; `sm`: h-7 |
| **Dialog** | 无 size prop | 固定 sm:max-w-lg, p-6 |
| **Tabs** | TabsList 有 `default` / `line` variant，无 size | `default`: bg-muted rounded-lg; `line`: 透明背景 + 下划线指示 |
| **Badge** | 8 种 variant，无 size | 固定 px-2 py-0.5 text-xs rounded-full |
| **Separator** | `horizontal` / `vertical` orientation | 固定 h-px / w-px |
| **Popover** | 无 size prop | 固定 w-72, p-4 |
| **Spinner** | 无 size prop | 固定 size-4 (16px) |
| **Table** | 无 size prop | 固定 text-sm, TableHead h-10, TableCell py-2.5 |
| **ScrollArea** | 无 size prop | scrollbar 固定 2.5 单位宽/高 |

### 5.2 需要新增的 size 变体

#### Button — ✅ 无需新增

已有完整的 `xs` / `sm` / `default` / `lg` / `icon` / `icon-xs` / `icon-sm` / `icon-lg`。迁移中所有 toolbar 按钮、icon 按钮、操作按钮均有对应 size。

#### Input — 需要新增 `sm` size

**使用场景**：
- word-editor toolbar 行内输入（超链接 URL/显示文本、搜索/替换、水印文字、数据集字段）
- spreadsheet 行内重命名输入、cell editor、find/replace 输入
- code-editor snippet 面板搜索

这些场景中输入框嵌入紧凑的 toolbar 或面板，当前 h-9 (36px) 过高，需要更小的尺寸。

**建议新增**：

```tsx
// 在 Input 组件的 className 合并中加入 data-[size=sm] 支持
// size="sm" → h-8 px-2 text-sm
```

| size | 高度 | 内边距 | 字号 |
|------|------|--------|------|
| `default` | h-9 (36px) | px-3 | text-base md:text-sm |
| `sm` | h-8 (32px) | px-2 | text-sm |

**实现方式**：Input 当前无 CVA，改用 `data-[size=sm]` data attribute 匹配（与 NativeSelect 一致），或在 className 中通过 `cn()` 条件合并。

#### Textarea — 无需新增

word-editor 的 textarea 用在独立 dialog 中（数据集描述、表达式输入），h-16 的最小高度足够。紧凑场景不存在。

#### SelectTrigger / NativeSelect — 需要新增 `xs` size

**使用场景**：
- word-editor toolbar 中的字体下拉、字号下拉、标题级别、行距、纸张大小——这些控件嵌入单行 toolbar，h-8 (sm) 仍然偏高，需要 h-7 左右的 `xs`。

**建议新增**：

| 组件 | size | 高度 | 说明 |
|------|------|------|------|
| `SelectTrigger` | `xs` | h-7 (28px) | 与 NativeSelect `sm` 对齐，用于紧凑 toolbar |
| `NativeSelect` | `xs` | h-6 (24px) | 与 Button `xs` 对齐，极紧凑场景 |

#### Dialog — 需要新增 `size` prop

**使用场景**：
- word-editor 的 hyperlink/margin/watermark/expression insert dialog 都是小型弹窗（w-80 ~ w-96），当前 Dialog 固定 `sm:max-w-lg` (512px) 过大
- code-editor 不需要（fullscreen 模式保持自定义）

**建议新增**：

```tsx
interface DialogContentProps extends ... {
  size?: "sm" | "default" | "lg"
}
```

| size | max-width | 说明 |
|------|-----------|------|
| `sm` | max-w-sm (384px) | 小型表单弹窗（hyperlink、margin、watermark） |
| `default` | sm:max-w-lg (512px) | 当前默认值，向后兼容 |
| `lg` | sm:max-w-2xl (672px) | 大型内容弹窗 |

#### Tabs — 无需新增

word-editor 侧边栏的 Datasets/Fields tabs 和 report-designer 的 tab bar 可直接使用 `TabsList variant="line"` 或 `variant="default"`，尺寸合适。

#### Badge — 无需新增

Badge 固定 text-xs 已足够。各包的 badge 场景（flow designer toolbar 的状态标记等）已在使用且效果良好。

#### Separator — 无需新增

`orientation="vertical"` 已满足 toolbar 分隔符需求。

#### Spinner — 无需新增

固定 size-4 足够。如果需要更小，可通过 `className="size-3"` 覆盖（接受 SVG props）。

#### Popover — 无需新增

固定 w-72 足够。snippet 下拉框和 tooltip popover 不需要额外 size。宽度可通过 `className` 覆盖。

### 5.3 新增变体汇总

| 组件 | 新增 size | 优先级 | 使用包 |
|------|-----------|--------|--------|
| **Input** | `sm` (h-8) | P1 | word-editor-renderers, spreadsheet-renderers |
| **SelectTrigger** | `xs` (h-7) | P2 | word-editor-renderers |
| **NativeSelect** | `xs` (h-6) | P2 | word-editor-renderers |
| **Dialog** | `size` prop (`sm`/`default`/`lg`) | P1 | word-editor-renderers |

**实现顺序**：先在 `@nop-chaos/ui` 中新增这 4 个 size 变体，再执行各包的迁移。

---

## 6. 风险与注意事项

1. **Dialog 迁移需注意焦点管理**：手写 modal 的焦点陷阱可能与 Dialog 组件的焦点管理冲突，需逐一测试。
2. **CSS 清理**：迁移后原 marker class 的 CSS 定义可能残留，需同步清理 `apps/playground/src/styles.css` 中的废弃样式。
3. **NativeSelect vs Select**：简单下拉用 `NativeSelect`（原生 `<select>` 包装），需要搜索/虚拟滚动时用 `Select`（base-ui 弹出层）。
4. **Input `sm` 向后兼容**：新增 size prop 不影响现有用法，`default` 行为不变。
