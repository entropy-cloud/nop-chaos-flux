# 维度 17：命名与术语一致性

## 复核状态：1×Low 保留

### 合规确认

- ✅ CompiledSchemaNode 已完全移除
- ✅ dataPath 未污染 ActionShapeFields
- ✅ create*/register*/use\* 前缀一致
- ✅ TemplateNode 为唯一编译输出名

### 发现

### [维度17] helpers.ts vs utils.ts 不一致

- **文件**: `packages/report-designer-renderers/src/helpers.ts`
- **严重程度**: Low
- **冲突名称**: `helpers.ts` vs 项目惯例 `utils.ts`
- **冲突位置**: 项目中 `utils.ts` 出现 3 处，`helpers.ts` 仅此 1 处
- **统一建议**: 重命名为 `utils.ts`
- **复核状态**: 子项复核通过（确认文件存在）

### 渲染器文件后缀差异（Downgrade）

- flux-renderers-basic 使用短名（page.tsx, container.tsx）
- flux-renderers-data 使用 -renderer 后缀（table-renderer.tsx）
- 判定：包内局部惯例差异，非合同漂移，不构成需修复问题
