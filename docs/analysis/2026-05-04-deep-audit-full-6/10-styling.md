# 维度 10：样式系统合规性

## 复核状态：1×Low（复核后从零发现降级）

### 发现

### [维度10] container.tsx schema-conditional 布局类

- **文件**: `packages/flux-renderers-basic/src/container.tsx:42-49`
- **严重程度**: Low
- **违规类别**: marker-only 原则的边界情况
- **现状**: 在 schema props（direction/align/wrap/gap）激活时输出 flex/items-center 等类
- **说明**: 属于 schema-driven conditional 样式而非隐式默认，风险较低
- **复核状态**: 维度复核后从零发现升级为 1×Low

### 合规确认

- ✅ 无 BEM 残留（`__` 分隔符零匹配）
- ✅ 无 React ThemeProvider
- ✅ 无渲染器硬编码颜色
- ✅ @source 指令覆盖完整
- ✅ Widget renderer 内部样式合规
