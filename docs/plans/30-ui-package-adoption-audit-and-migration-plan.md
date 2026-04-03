# UI 包统一化审计与迁移计划

> Plan Status: planned
> Last Reviewed: 2026-04-03
> Source: 全仓库通用组件审计——检查所有包是否正确使用 `@nop-chaos/ui` 的通用组件，仅领域特殊组件才自行实现。

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

#### Toolbar 基元评估

word editor 有三个自建 toolbar 基元：

- **`ToolbarButton`**（`toolbar/shared.tsx:12`）：带 icon、active/disabled 状态的按钮，用 inline Tailwind 样式。
- **`ToolbarSeparator`**（`toolbar/shared.tsx:40`）：`w-px h-6 bg-gray-200` 竖线分隔符。
- **`ToolbarGroup`**（`toolbar/shared.tsx:44`）：`flex items-center gap-0.5` 容器。

**这些是否应该提升为通用 toolbar 抽象？**

**结论：不建立单独的 ribbon/toolbar 抽象。** 理由：

1. 三个编辑器包的 toolbar 架构差异很大：
   - **word editor**：硬编码 JSX，每个控制区域有丰富的下拉框/颜色选择器/文件上传
   - **flow designer**：schema 驱动渲染，用表达式求值绑定状态，从 JSON 配置动态生成 toolbar
   - **spreadsheet**：纯 props 驱动，40+ 回调 props
2. 基元数量太少（3 个），抽象化收益不足以覆盖 API 设计和维护成本。
3. `ToolbarButton` 用 `Button variant="ghost" size="icon"` + 自定义 active className 即可替代。
4. `ToolbarSeparator` 用 `Separator orientation="vertical"` 替代。
5. `ToolbarGroup` 就是 `<div className="flex items-center gap-0.5">`，不值得抽象。

**方案：在各自包内直接使用 `@nop-chaos/ui` 的 Button/Separator，不新增共享 toolbar 抽象。**

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

**现状**：零 `@nop-chaos/ui` 导入，无 `@nop-chaos/ui` 依赖。

#### 迁移清单

| 优先级 | 当前 | 替换为 |
|--------|------|--------|
| P1 | 原生 `<button className="nop-report-designer__tab">` | `Tabs` / `TabsList` / `TabsTrigger` |
| P1 | 原生 `<button>` Save/Submit | `Button` |

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

## 3. 不新增 ribbon/toolbar 共享抽象的理由

经审查三个编辑器包（word editor、flow designer、spreadsheet）的 toolbar 实现，确认不建立统一的 ribbon toolbar 抽象：

1. **架构差异过大**：
   | 维度 | word editor | flow designer | spreadsheet |
   |------|------------|---------------|-------------|
   | 渲染模式 | 硬编码 JSX | schema 驱动 | 硬编码 JSX |
   | 状态绑定 | bridge + store hook | context + 表达式求值 | 纯 props |
   | 动作分发 | `bridge.executeXxx()` | `dispatch(command)` | 回调 props |

2. **基元太少不值得抽象**：`ToolbarButton` → Button variant、`ToolbarSeparator` → Separator、`ToolbarGroup` → flex div。三个都是对已有组件的简单包装，引入新的抽象层反而增加理解成本。

3. **领域特定控件占比高**：字体下拉、颜色选择器、文件上传、表达式插入、格式刷、纸张设置等都是 word editor 独有的，无法泛化。

4. **flow designer 已有更灵活的方案**：它的 schema-driven toolbar 渲染引擎是架构亮点，强行统一会降低其灵活性。

**各包直接使用 `@nop-chaos/ui` 的 Button/Separator/Tabs 等组件即可。**

---

## 4. 执行顺序

0. **@nop-chaos/ui 新增 size 变体**（前置步骤）：Input `sm`、Dialog `size` prop、SelectTrigger `xs`、NativeSelect `xs`
1. **flux-code-editor**（最简单，无主题冲突，收益最高——消除最多样板代码）
2. **word-editor-renderers**（影响面大但模式清晰——toolbar 基元 + dialog 统一）
3. **report-designer-renderers**（改动量最小）
4. **spreadsheet-renderers**（补全剩余原生 HTML）
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
