# 11 UI 组件使用合规性

- Task ID: `ses_268b251b3ffe1enEyagM0LSTYx`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Calibration note: this file was revised on `2026-04-17` to distinguish actionable `@nop-chaos/ui` adoption gaps from valid native-control and high-performance host-surface exceptions.

# 维度11审计结论：存在一批可整改的原生 HTML 使用，但不能机械判违规

说明：

- 以下结果以当前代码为准。
- 已排除 `packages/ui/src/**` 内部实现。
- 已排除 `*.test.*` 与 `__tests__/`。
- “原生 HTML 使用清单”主要来自自动化搜索；“建议整改”与“合理例外”来自代码上下文的人工判断。
- 额外检查结果：
  - `@nop-chaos/ui` 统一入口导入：发现 1 处子路径导入。
  - 非 `ui` 包直接依赖 `@radix-ui/*` / `@base-ui*`：未发现需要报告的问题。

## 原生 HTML 使用清单（排除 ui 包内部实现）

- `apps/playground/src/pages/CodeEditorPage.tsx`：`<button>`
- `apps/playground/src/pages/ConditionBuilderPage.tsx`：`<button>`
- `apps/playground/src/pages/FluxBasicPage.tsx`：`<button>`
- `apps/playground/src/pages/HomePage.tsx`：`<button>`
- `apps/playground/src/component-lab/ComponentLabPage.tsx`：`<button>`
- `apps/playground/src/pages/DebuggerLabPage.tsx`：`<button>`, `<input>`
- `apps/playground/src/pages/ReportDesignerPage.tsx`：`<button>`
- `apps/playground/src/FlowDesignerExample.tsx`：`<button>`, `<label>`
- `apps/playground/src/flow-designer/FlowDesignerToolbar.tsx`：`<button>`
- `apps/playground/src/flow-designer/FlowDesignerCanvas.tsx`：`<button>`
- `apps/playground/src/flow-designer/FlowDesignerHoverToolbar.tsx`：`<button>`
- `apps/playground/src/flow-designer/FlowDesignerInspector.tsx`：`<label>`, `<input>`, `<textarea>`, `<select>`, `<option>`, `<button>`
- `apps/playground/src/flow-designer/FlowDesignerPalette.tsx`：`<input>`, `<button>`
- `apps/playground/src/flow-designer/FlowListPage.tsx`：`<input>`, `<select>`, `<option>`, `<button>`, `<table>`, `<tr>`, `<td>`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`：`<input>`, `<table>`, `<tr>`, `<td>`
- `packages/word-editor-renderers/src/toolbar/InsertControls.tsx`：`<input>`
- `packages/word-editor-renderers/src/toolbar/FontControls.tsx`：`<input>`
- `packages/flux-react/src/test-support-core.tsx`：`<label>`, `<input>`, `<button>`
- `packages/flux-react/src/test-support-runtime.tsx`：`<input>`, `<button>`
- `packages/flux-renderers-data/src/test-support.tsx`：`<button>`
- `packages/flux-renderers-form-advanced/src/condition-builder/config-test-support.tsx`：`<button>`, `<input>`

## 主要整改项

### [维度11] Flow Designer Inspector 同时违背 Button/Input/Textarea/Label/Select 约束
- **文件**: `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer\FlowDesignerInspector.tsx:41-48`, `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer\FlowDesignerInspector.tsx:55-100`, `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer\FlowDesignerInspector.tsx:141-158`, `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer\FlowDesignerInspector.tsx:166-173`, `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer\FlowDesignerInspector.tsx:180-218`
- **严重程度**: P1
- **原生元素**: `<label>`, `<input>`, `<textarea>`, `<select>`, `<option>`, `<button>`
- **应替换为**: `<Label>`, `<Input>`, `<Textarea>`, `<NativeSelect>`/`<NativeSelectOption>`（或 `<Select>`）, `<Button>`
- **所在层**: 其他
- **替换可行性**: 高
- **参考文档**: `AGENTS.md`（MANDATORY: UI Component Usage）, `docs/architecture/styling-system.md`

### [维度11] FlowListPage 同时违背 Input/Select/Button/Table 组件规范
- **文件**: `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer\FlowListPage.tsx:54-76`, `C:\can\nop\nop-chaos-flux\apps\playground\src\flow-designer\FlowListPage.tsx:81-157`
- **严重程度**: P1
- **原生元素**: `<input>`, `<select>`, `<option>`, `<button>`, `<table>`, `<tr>`, `<td>`
- **应替换为**: `<Input>`, `<NativeSelect>`/`<NativeSelectOption>`（或 `<Select>`）, `<Button>`, `<Table>`/`<TableHeader>`/`<TableBody>`/`<TableRow>`/`<TableHead>`/`<TableCell>`
- **所在层**: 其他
- **替换可行性**: 高
- **参考文档**: `AGENTS.md`（MANDATORY: UI Component Usage）, `docs/architecture/styling-system.md`

### [维度11] `@nop-chaos/ui` 导入未统一走根入口
- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\dialogs\ChartDialog.tsx:16-22`
- **严重程度**: P2
- **原生元素**: 无（导入模式违规）
- **应替换为**: 统一从 `@nop-chaos/ui` 导入；若根入口缺少 chart 导出，应先在 `packages/ui/src/index.ts` 补齐再收敛调用方
- **所在层**: 渲染器
- **替换可行性**: 中
- **参考文档**: `AGENTS.md`（MANDATORY: UI Component Usage）, `packages/ui/src/index.ts`

## 合理例外（不建议作为整改项）

### SpreadsheetGrid 使用原生 `<table>` / `<td>` / 编辑 `<input>`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid.tsx:188-240`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid.tsx:253-304`
- **原因**: 这是 spreadsheet 的高性能专用宿主表面，包含虚拟化、合并单元格、命中测试、编辑层与滚动窗口计算；原生表格和编辑输入是合理实现，不应机械替换为通用 `@nop-chaos/ui` 表格组件。

### Word Editor 插图控件的隐藏文件输入

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\toolbar\InsertControls.tsx:74-80`
- **原因**: `input[type=file]` 是浏览器原生能力控件，当前用于触发图片选择；这类平台能力不应仅因是原生元素就判违规。

### Word Editor 字体工具条的颜色输入

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\toolbar\FontControls.tsx:86-99`
- **原因**: `input[type=color]` 是浏览器原生颜色选择能力；当前没有证据表明替换为 `@nop-chaos/ui` 抽象能带来更好的行为或维护收益。

## 其它高可行性替换点

- Playground 页面返回按钮与 HomePage 卡片入口：统一换成 `<Button>`
- Component Lab / Debugger Lab / Flow Designer Toolbar / Canvas / HoverToolbar / Palette：统一换成 `<Button>` / `<Input>`
- `flux-react` 与 renderer 包测试支撑文件：统一换成 `<Label>` / `<Input>` / `<Button>`

## 直接依赖检查

未发现需要报告的问题：除 `@nop-chaos/ui` 包自身外，未扫描到其他包直接导入或声明依赖 `@radix-ui/*` / `@base-ui*`。
