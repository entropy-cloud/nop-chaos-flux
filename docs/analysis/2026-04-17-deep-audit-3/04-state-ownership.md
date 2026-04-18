# 维度 04：状态所有权与单一事实来源

## 审核结论

经过系统性审查，**未发现 P0 或 P1 级别的状态所有权违规**。

代码库中的 useState 使用主要分为以下几类：

1. **纯 UI 瞬时状态**（折叠、悬浮、搜索查询等）— 完全合理
2. **异步加载状态**（loading/error/data）— 标准模式
3. **第三方库集成**（react-flow 的 localNodes/localEdges）— 有明确的同步机制
4. **同步回调访问的 useRef 缓存**（RuntimeFieldRegistration 模式）— 符合架构设计
5. **草稿编辑隔离**（DetailField 的 draftForm）— 符合文档规定的 Phase 2 模式
6. **对话框编辑**（DatasetDialog 等）— 标准的临时编辑模式

---

## 误报排除清单

### VariantField 使用 useState 维护变体状态
- **文件**: packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:87-88
- **结论**: **不构成违规**
- **原因**: `userSelectedKey`/`detectedKey` 是辅助推断 activeKey 的临时信号，不是表单值的镜像

### DesignerXyflowCanvas 的 localNodes/localEdges
- **文件**: packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx:129-130
- **结论**: **不构成违规**
- **原因**: react-flow 需要控制拖拽过程中的即时位置更新，有明确的同步机制

### SpreadsheetGrid 的滚动位置 useState
- **文件**: packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:108-111
- **结论**: **不构成违规**
- **原因**: 纯 UI 渲染状态（虚拟滚动计算），不影响业务数据

### DetailField 的 draftForm
- **文件**: packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:50-53
- **结论**: **不构成违规**
- **原因**: 符合 docs/architecture/form-validation.md 中的 Phase 2 草稿隔离模式

### KeyValueRenderer/ArrayEditorRenderer 的 pairsRef/itemsRef
- **文件**: packages/flux-renderers-form-advanced/src/key-value.tsx:208
- **结论**: **不构成违规**
- **原因**: 为满足同步回调访问需求的标准模式

---

## 观察点（P2 级别）

### WordEditorPage 的 charts/codes 状态
- **文件**: packages/word-editor-renderers/src/WordEditorPage.tsx:32-45
- **现状**: 大量 useState 用于管理编辑器状态
- **风险**: 如果项目规模扩大，可能需要考虑将 charts/codes 也纳入 store 管理
- **建议**: 持续关注但非紧急

### DatasetDialog 从 initialData 初始化
- **文件**: packages/word-editor-renderers/src/dialogs/DatasetDialog.tsx:28-34
- **现状**: 对话框编辑的标准模式
- **风险**: 如果 initialData 在对话框打开期间变化，本地状态不会自动更新
- **建议**: 如需响应外部数据变化，添加 initialData 变化的重置逻辑
