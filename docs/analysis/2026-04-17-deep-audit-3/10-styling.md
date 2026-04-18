# 维度 10：样式系统合规性

## 审核总结

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| P0 | 0 | 无 |
| P1 | 0 | 无 |
| P2 | 5 | 主要是 flow-designer 和 dingflow 组件硬编码颜色值 |
| P3 | 3 | 代码风格一致性问题 |
| 无问题 | 4 | BEM、cn()、@source、基础渲染器均符合规范 |

---

## P2 级发现

### [维度10-1] Flow Designer 组件硬编码颜色值
- **文件**: packages/flow-designer-renderers/src/designer-inspector.tsx:8-23
- **现状**: `NODE_TYPE_INFO` 对象中硬编码了多个十六进制颜色值
- **建议**: 迁移到 CSS 变量或 Tailwind 语义类

### [维度10-2] DingFlow 组件硬编码颜色值
- **文件**: packages/flow-designer-renderers/src/dingflow/DingFlowAddConditionOverlay.tsx:11
- **现状**: 使用 `border-[#b3e19d] text-[#67c23a] bg-white`
- **建议**: 使用语义化 CSS 变量

### [维度10-3] DingFlow PlusButton/MergeOverlay 硬编码颜色
- **文件**: packages/flow-designer-renderers/src/dingflow/DingFlowPlusButton.tsx:12
- **现状**: `bg-[#3296fa]` 硬编码蓝色背景
- **建议**: 使用 `bg-primary`

### [维度10-4] DingFlow Edge 内联样式硬编码颜色
- **文件**: packages/flow-designer-renderers/src/dingflow/DingFlowEdge.tsx:61-62
- **现状**: `background: '#fff'` 和 `border: '1px solid #e0e0e0'`
- **建议**: 使用 CSS 变量

### [维度10-5] DingFlow AddNodeMenu 硬编码颜色
- **文件**: packages/flow-designer-renderers/src/dingflow/DingFlowAddNodeMenu.tsx:37,41
- **现状**: `text-[#666]` 硬编码文本颜色
- **建议**: 使用 `text-muted-foreground`

---

## P3 级发现

### [维度10-6] report-designer-renderers 使用 joinClassNames
- **文件**: packages/report-designer-renderers/src/inspector-shell-renderer.tsx:12,132
- **现状**: 使用自定义 `joinClassNames` 函数而非 `cn()`
- **建议**: 迁移到使用 `cn()` from `@nop-chaos/ui`

### [维度10-7] 渲染器带有隐式布局样式
- **文件**: packages/flow-designer-renderers/src/designer-*.tsx
- **现状**: marker class 与布局类混合
- **说明**: 如果是专用应用级组件可接受

### [维度10-8] WordEditor 渲染器内含布局样式
- **文件**: packages/word-editor-renderers/src/WordEditorPage.tsx:326
- **说明**: 作为顶层 page 组件可接受

---

## 符合规范的检查项

### Tailwind @source 指令
- **文件**: apps/playground/src/styles.css:5
- `@source "../../../packages";` 正确覆盖所有 workspace 包

### BEM 风格命名
- 未发现项目自定义的 BEM 风格 CSS 类名

### cn() 使用
- 核心渲染器均正确使用 `cn()` from `@nop-chaos/ui`

### 基础渲染器 marker class
- ContainerRenderer、FlexRenderer、PageRenderer、FieldFrame 正确实现

---

## 整体评估

核心渲染器层（flux-renderers-basic, flux-renderers-form, flux-react）严格遵循 styling-system.md 定义的契约。问题主要集中在 flow-designer-renderers 包的 dingflow 子模块。
