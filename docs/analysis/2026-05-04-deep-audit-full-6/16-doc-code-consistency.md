# 维度 16：文档-代码一致性

## 复核状态：1×Low + 1×Info 保留

### 发现

### [维度16] flux-runtime-module-boundaries.md 遗漏文件

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md`
- **代码路径**: `packages/flux-runtime/src/projected-scope-store.ts`, `packages/flux-runtime/src/form-component-handle.ts`
- **严重程度**: Low
- **漂移类型**: 文档遗漏
- **建议**: 添加这两个文件的所有权描述
- **复核状态**: 子项复核通过（确认两文件存在）

### [维度16] AGENTS.md flux-playground 位置暗示

- **严重程度**: Informational
- **现状**: 列在 Workspace Packages 但实际在 apps/ 目录
- **建议**: 标注 (apps/playground)

### 合规确认

- ✅ Dependency Flow 与 package.json 一致
- ✅ renderer-runtime.md hooks 与 flux-react 导出一致
- ✅ terminology.md 术语与代码命名一致
