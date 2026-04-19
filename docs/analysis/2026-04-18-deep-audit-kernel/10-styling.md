# 维度10：样式系统合规性 — 初审报告

**审核日期**: 2026-04-18

## P1 发现

### form-renderers.css 中 nop-* 标记类携带隐式布局样式
- **文件**: packages/flux-renderers-form/src/form-renderers.css:1-71
- **违规类别**: marker/间距
- 5个nop-*标记类绑定了display:grid/flex、gap等布局属性

### sonner.tsx 依赖 next-themes ThemeProvider
- **文件**: packages/ui/src/components/ui/sonner.tsx:1,6
- **违规类别**: 主题
- 直接违反"no required ThemeProvider"规则

### flow-designer-renderers 包内硬编码十六进制颜色（20+处）
- **文件**: designer-inspector.tsx:8-23, DingFlowEdge.tsx:61-62等
- **违规类别**: 主题
- 约16个硬编码十六进制颜色值

### word-editor-renderers 硬编码 Tailwind 颜色类
- **文件**: FieldList.tsx:40-45, DatasetPanel.tsx:44-49等
- **违规类别**: 主题
- bg-gray-50/text-gray-500/bg-blue-50等无法被宿主主题覆盖

## P2 发现

### flow-designer-nodes.css 大量 BEM 模式违规
- **文件**: apps/playground/src/flow-designer-nodes.css:2-215
- **违规类别**: BEM
- nop-dt-node__header等__区域类 + --修饰符类

### styles.css 中 nop-code-editor BEM修饰符
- **文件**: apps/playground/src/styles.css:426-442
- **违规类别**: BEM
- .nop-code-editor--fullscreen/--has-toolbar

### designer-toolbar/report-toolbar 标记类混合布局
- **文件**: designer-toolbar.tsx:138, report-designer-toolbar.tsx:29
- **违规类别**: marker/间距

### designer-theme.css 标记类携带视觉样式
- **文件**: flow-designer-renderers/src/designer-theme.css:18-26
- **违规类别**: marker

### nop-debugger 部分颜色未走CSS变量（12处）
- **文件**: nop-debugger/src/panel/styles-css.ts:234,281等
- **违规类别**: 主题

### DesignerXyflowNode 硬编码白色背景
- **文件**: DesignerXyflowNode.tsx:131
- **违规类别**: 主题

### designer-palette/inspector 标记类混合布局
- **文件**: designer-palette.tsx:43, designer-inspector.tsx:213
- **违规类别**: marker/间距

### nop-word-editor-page 标记类混合布局
- **文件**: WordEditorPage.tsx:326
- **违规类别**: marker/主题

## 合规确认

- classAliases: ✅ 递归展开正确
- Tailwind @source: ✅ 覆盖全部22个packages
- 间距约定: stack-*/hstack-* 仅在playground schema使用

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: form-renderers.css 标记类携带布局 | **保留** | **成立**（4个 nop-* 绑 display:grid/flex + gap） | P1 |
| F2: sonner.tsx 依赖 next-themes | **保留** | **成立**（import useTheme 无条件调用，违反主题独立性） | P1 |
| F3: flow-designer hex 颜色 | **保留** | **成立**（~30处/9文件/16-18色值，完全绕过设计令牌） | P1 |
| F4: word-editor Tailwind 颜色类 | **保留** | **成立**（专用面板，降级合理） | P2 |
| F5: flow-designer-nodes.css BEM 违规 | **保留** | **成立**（~25+ BEM __/-- 模式） | P2 |
| F6: styles.css nop-code-editor BEM 修饰符 | **保留** | **成立**（--fullscreen/--has-toolbar + 硬编码颜色） | P2 |
| F7: designer-toolbar 标记类混合布局 | **保留** | **成立**（flex/gap 在 JSX 中与标记类混用） | P2 |
| F8: designer-theme.css 标记类携带视觉样式 | **降级** | — | P3 |
| F9: nop-debugger 颜色未走 CSS 变量 | **保留** | **成立**（~14处原始 hex） | P2 |
| F10: DesignerXyflowNode 硬编码白色背景 | **保留** | **成立**（bg-white/96 + bg-white，破坏暗色模式） | P2 |
| F11: designer-palette/inspector 标记类混合布局 | **保留** | **成立**（flex flex-col h-full 混用） | P2 |
| F12: nop-word-editor-page 标记类混合布局 | **保留** | **成立**（h-screen overflow-hidden 混用） | P2 |
