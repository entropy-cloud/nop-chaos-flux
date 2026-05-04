# 维度 14：测试覆盖与质量

## 复核状态：2×Low 保留

### 统计

- 所有 24 个包至少有 1 个测试文件
- 核心模块覆盖充分（runtime 68, compiler 20, formula 10, react 34）
- 测试模式一致（全 Vitest，命名统一）

### 发现

### [维度14] flux-action-core 测试密度偏低

- **文件**: `packages/flux-action-core/src/__tests__/`（6 个测试文件）
- **严重程度**: Low
- **建议**: 评估 action precompile lowering 和 dispatch ordering 边界用例
- **复核状态**: 保留

### [维度14] flux-i18n 仅 1 个测试文件

- **文件**: `packages/flux-i18n/src/`（6 个源文件，1 个测试）
- **严重程度**: Low
- **建议**: 补充语言切换、缺失 key fallback 测试
- **复核状态**: 保留
