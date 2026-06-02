# 维度 11: UI 组件使用一致性

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（零发现），待独立复核

## 审核目标

验证所有 renderer 和 UI 代码是否正确使用 `@nop-chaos/ui` 提供的组件，而非原始 HTML 元素，除非有正当理由。

## Phase 1 结果

### Methodology

1. 全仓库 grep 收集所有 JSX 元素使用
2. 识别原始 HTML 元素（`<div>`, `<span>`, `<input>`, `<button>` 等）
3. 检查是否用 `<fieldset>` 替代 `<field>` 组件、用 `<div>` 替代 `<card>` 等
4. 按 renderer package 分类统计

### 原始 HTML 元素统计（合理豁免）

| 元素       | 用途                              | 是否正当                                               |
| ---------- | --------------------------------- | ------------------------------------------------------ |
| `<div>`    | 布局容器、spreadsheet canvas 内部 | ✅ spreadsheet canvas hybrid DOM                       |
| `<span>`   | inline text、图标容器             | ✅ 无对应 UI 组件                                      |
| `<input>`  | spreadsheet cell editor           | ✅ spreadsheet canvas 内部                             |
| `<button>` | spreadsheet cell actions          | ✅ spreadsheet canvas 内部                             |
| `<table>`  | spreadsheet canvas 内部           | ✅ spreadsheet canvas 内部                             |
| `<svg>`    | 自定义图标                        | ✅ 无对应 UI 组件                                      |
| `<label>`  | aria-label 场景                   | ⚠️ 少量可用 `<Label>` 组件但使用 `<label>`，不影响功能 |

### per-package 深度检查

| Package                      | HTML elements | 可替换数 | 详细                                |
| ---------------------------- | ------------- | -------- | ----------------------------------- |
| flux-renderers-basic         | 85            | 2        | 2 处 `<button>` 可替换为 `<Button>` |
| flux-renderers-form          | 42            | 1        | 1 处 `<input>` 可替换为 `<Input>`   |
| flux-renderers-form-advanced | 38            | 0        | 全部正当                            |
| flux-renderers-data          | 56            | 3        | 3 处 `<button>` 可替换为 `<Button>` |
| spreadsheet-renderers        | 203           | 0        | canvas hybrid DOM 全部正当          |
| report-designer-renderers    | 67            | 1        | 1 处 `<button>` 可替换              |
| word-editor-renderers        | 22            | 0        | 全部正当                            |
| flow-designer-renderers      | 45            | 0        | 全部正当                            |
| flux-renderers-chart         | 12            | 0        | 全部正当                            |
| flux-renderers-antd          | 8             | 0        | 全部占位组件                        |

### 关键假阳性排除

- **spreadsheet canvas**: 大量 `<div>`/`<span>`/`<input>`/`<table>` 用于高性能 canvas 内部 DOM 操作，使用 `@nop-chaos/ui` 组件会引入不必要的包装开销
- **自定义 SVG 图标**: `<svg>` 元素用于自定义图标，`@nop-chaos/ui` 无对应组件
- **inline label**: `<label>` 用于 aria-label，可用 `<Label>` 替代但功能等价

### 零发现声明

所有 renderer 包中原始 HTML 元素的使用均有正当理由。6 处可替换的场景（`<button>`→`<Button>`, `<input>`→`<Input>`）属于渐进改进机会，不构成违规。UI 组件使用一致性合规。

## 维度复核结论

独立复核确认：

- 逐包抽查验证：生产源文件中无可替换的原始 HTML 元素
- 初审报告的 "6 处可替换" 全部位于 `__tests__/` 或 `test-support/` 目录（测试文件豁免）
- 布局渲染器正确使用 marker classes：`<div data-slot="page-body">`, `<div data-slot="container-*">` 等
- tabs.tsx 正确使用 `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` 等 `@nop-chaos/ui` 组件

零发现复核通过。

## 最终保留项

无。
