# 11 UI 组件使用合规性

- Task ID: `ses_268b251b3ffe1enEyagM0LSTYx`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Calibration note: this file was revised on `2026-04-17` to distinguish actionable `@nop-chaos/ui` adoption gaps from valid native-control and high-performance host-surface exceptions.

# 维度11审计结论：所有主要整改项已修复（2026-04-17）

说明：

- 以下结果以当前代码为准。
- 已排除 `packages/ui/src/**` 内部实现。
- 已排除 `*.test.*` 与 `__tests__/`。
- "原生 HTML 使用清单"主要来自自动化搜索；"建议整改"与"合理例外"来自代码上下文的人工判断。
- 额外检查结果：
  - `@nop-chaos/ui` 统一入口导入：已修复（chart 导出已加入根入口，调用方已收敛）。
  - 非 `ui` 包直接依赖 `@radix-ui/*` / `@base-ui*`：未发现需要报告的问题。

## 已修复整改项（2026-04-17）

### [已修复] Flow Designer Inspector — Button/Input/Textarea/Label/Select 约束

- **文件**: `apps/playground/src/flow-designer/FlowDesignerInspector.tsx`
- **修复**: `<label>` → `<Label>`, `<input>` → `<Input>`, `<textarea>` → `<Textarea>`, `<select>`/`<option>` → `<NativeSelect>`/`<NativeSelectOption>`, `<button>` → `<Button variant="destructive">`
- **原严重程度**: P1

### [已修复] FlowListPage — Input/Select/Button/Table 组件规范

- **文件**: `apps/playground/src/flow-designer/FlowListPage.tsx`
- **修复**: `<input>` → `<Input>`, `<select>`/`<option>` → `<NativeSelect>`/`<NativeSelectOption>`, `<button>` → `<Button>`, `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` → `<Table>`/`<TableHeader>`/`<TableBody>`/`<TableRow>`/`<TableHead>`/`<TableCell>`
- **原严重程度**: P1

### [已修复] `@nop-chaos/ui` 导入未统一走根入口

- **文件**: `packages/word-editor-renderers/src/dialogs/ChartDialog.tsx`
- **修复**: `@nop-chaos/ui` 根 `index.ts` 新增 `export * from './components/ui/chart'`；`ChartDialog.tsx` 已合并为单一根入口导入
- **原严重程度**: P2

### [已修复] Playground 页面返回按钮与 HomePage 卡片入口

- **文件**: `CodeEditorPage.tsx`, `ConditionBuilderPage.tsx`, `FluxBasicPage.tsx`, `HomePage.tsx`, `ReportDesignerPage.tsx`, `DebuggerLabPage.tsx`, `ComponentLabPage.tsx`
- **修复**: 所有 `<button>` → `<Button>`, `<input>` → `<Input>`

### [已修复] Flow Designer Toolbar / Canvas / HoverToolbar / Palette / Example

- **文件**: `FlowDesignerToolbar.tsx`, `FlowDesignerCanvas.tsx`, `FlowDesignerHoverToolbar.tsx`, `FlowDesignerPalette.tsx`, `FlowDesignerExample.tsx`
- **修复**: `<button>` → `<Button>`, `<input>` → `<Input>`, `<label>` → `<Label>`

### [已修复] 测试支撑文件

- **文件**: `flux-react/src/test-support-core.tsx`, `flux-react/src/test-support-runtime.tsx`, `flux-renderers-data/src/test-support.tsx`, `flux-renderers-form-advanced/src/test-support.tsx`
- **修复**: `<button>` → `<Button>`, `<input>` → `<Input>`, `<label>` → `<Label>`

## 剩余原生 HTML 使用（合理例外）

### SpreadsheetGrid 使用原生 `<table>` / `<td>` / 编辑 `<input>`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid.tsx:188-240`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid.tsx:253-304`
- **原因**: 这是 spreadsheet 的高性能专用宿主表面，包含虚拟化、合并单元格、命中测试、编辑层与滚动窗口计算；原生表格和编辑输入是合理实现，不应机械替换为通用 `@nop-chaos/ui` 表格组件。

### Word Editor 插图控件的隐藏文件输入

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\toolbar\InsertControls.tsx:74-80`
- **原因**: `input[type=file]` 是浏览器原生能力控件，当前用于触发图片选择；这类平台能力不应仅因是原生元素就判违规。

### Word Editor 字体工具条的颜色输入

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\toolbar\FontControls.tsx:86-99`
- **原因**: `input[type=color]` 是浏览器原生颜色选择能力；当前没有证据表明替换为 `@nop-chaos/ui` 抽象能带来更好的行为或维护收益。

## 直接依赖检查

未发现需要报告的问题：除 `@nop-chaos/ui` 包自身外，未扫描到其他包直接导入或声明依赖 `@radix-ui/*` / `@base-ui*`。
