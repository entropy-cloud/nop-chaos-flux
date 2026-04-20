# 维度10：样式系统合规性

## 审核日期: 2026-04-20

## P2 发现（6 项）

### [P2] 15 个 widget 渲染器缺少 root marker class

同类问题扫描从 5 个扩展到 **15 个**：

| 渲染器 | 文件 | 当前根元素 |
|--------|------|-----------|
| tag-list | `flux-renderers-form-advanced/src/tag-list.tsx:64` | `<div className="flex flex-wrap gap-2.5">` |
| key-value | `flux-renderers-form-advanced/src/key-value.tsx:334` | `<div className="grid gap-3">` |
| array-editor | `flux-renderers-form-advanced/src/array-editor.tsx:240` | `<div className="grid gap-3">` |
| input-tree | `flux-renderers-form-advanced/src/tree-controls.tsx:137` | `<div data-slot="input-tree-control">` |
| tree-select | `flux-renderers-form-advanced/src/tree-controls.tsx:181` | `<div data-slot="tree-select-control">` |
| button | `flux-renderers-basic/src/button-renderer.tsx` | 无 marker class |
| badge | `flux-renderers-basic/src/badge-renderer.tsx` | 无 marker class |
| input-text/email/password | `flux-renderers-form/src/renderers/input.tsx` | 无 marker class |
| textarea | `flux-renderers-form/src/renderers/input.tsx` | 无 marker class |
| object-field | `flux-renderers-form-advanced/src/object-field.tsx` | 无 marker class |
| array-field | `flux-renderers-form-advanced/src/array-field.tsx` | 无 marker class |
| variant-field | `flux-renderers-form-advanced/src/variant-field/variant-field.tsx` | 无 marker class |
| detail-field | `flux-renderers-form-advanced/src/detail-view/detail-field.tsx` | 无 marker class |

- **现状**: Widget renderer 按 styling-system.md 应有 root marker class（如 `nop-tag-list`），用于 CSS 定位和宿主集成。当前缺少。
- **建议**: 在根元素 className 中添加对应的 `nop-*` marker。

### [P2] flow-designer-nodes.css 使用 BEM + 硬编码颜色

- **文件**: `apps/playground/src/flow-designer-nodes.css:1-215`
- **现状**: 大量 `nop-dt-node__header`、`nop-af-node__subtitle` 等 BEM 命名 + `#576a95`、`#ff943e` 等 hex 硬编码颜色。位于 playground 层而非 renderer 包。
- **建议**: 逐步迁移到 data-slot + CSS 变量。

### [P2] designer-node-appearance.ts 硬编码 hex 颜色值

- **文件**: `packages/flow-designer-renderers/src/designer-node-appearance.ts`
- **严重程度**: P2（同类问题扫描新增）
- **现状**: 包含约 15 个硬编码 hex 颜色值的节点类型→颜色映射表（如任务节点、网关节点等各类型颜色）。与 flow-designer-nodes.css 的 BEM + 硬编码颜色问题同属一个设计缺陷区域。
- **建议**: 提取为 CSS 变量（如 `--fd-node-task-color`、`--fd-node-gateway-color`），使宿主应用可主题化。

## P3 发现（5 项）

### [P2→P3] node-error-boundary inline 硬编码颜色回退

- **文件**: `packages/flux-react/src/node-error-boundary.tsx:51-52`
- **现状**: `var(--destructive, #b53b2c)` CSS variable fallback。Error boundary 的 inline style 有防御性合理性。

### [P2→P3] designer-canvas inline 硬编码颜色回退

- **文件**: `packages/flow-designer-renderers/src/designer-canvas.tsx:52`
- **现状**: `resolveNodeTypeAccent() ?? 'var(--fd-primary, #3296fa)'`。flow-designer 允许 narrow fallback defaults。

### [P3] ding-flow-canvas-overlay 同上模式

- **文件**: `packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx:38`

### [P3] nop-designer marker 带 background

- **文件**: `packages/flow-designer-renderers/src/designer-theme.css:18-20`

### [P3] styles.css 废弃 BEM modifier class

- **文件**: `apps/playground/src/styles.css:426,439`

## 正面评估

- Layout 渲染器（container/flex/page/form/tabs）零隐式间距 — 完全合规
- classAliases 管线完整正确（递归展开+循环防护+scope继承）
- cn() 统一使用，零 classnames 导入
- 无 React ThemeProvider 依赖
- Spreadsheet canvas hybrid 策略合规
- stack-*/hstack-* 别名完备
- Tailwind @source 覆盖完整
