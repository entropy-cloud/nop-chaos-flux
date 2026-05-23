# 维度 15：安全与性能红线

## 复核状态：1×P3 保留

### 安全部分

- ✅ 零 eval() / new Function()（表达式通过 flux-formula AST 求值）
- ✅ 无 fail-open 模式

### 性能部分

- ✅ 无 O(n²) 模式
- ✅ 所有 .sort()/.splice() 在拷贝上操作
- ✅ 无 JSON.stringify 用于热路径变更检测
- ✅ 表格虚拟化已实现（@tanstack/react-virtual）

### 发现

### [维度15] 缺少 performance.mark/measure 观察性

- **文件**: `packages/flux-runtime/src/`（全局）
- **严重程度**: P3
- **规则编号**: P6
- **现状**: 整个运行时无 performance.mark/measure
- **建议**: 在关键路径加入条件性标记（有 benchmark test 作为替代覆盖）
- **复核状态**: 子项复核通过
