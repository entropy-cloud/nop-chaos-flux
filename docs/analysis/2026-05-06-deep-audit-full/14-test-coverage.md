# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

## 测试覆盖统计

- **总计**: 639 源文件, 388 测试文件, ~53,616 测试 LOC, 30 E2E spec
- **测试文件数为 0 的包**: 无（所有 24 个包均有测试）
- **测试比最低**: ui (0.23), flow-designer-renderers (0.30), flow-designer-core (0.33)

## P1 发现（6 个）

### [维度14] flux-formula: 8 个编译/AST 模块无直接单元测试

- **文件**: `packages/flux-formula/src/` (formula-compiler, symbol-diagnostics, static-eval, compile-node, pipe-syntax, ast, bind-ast, expression-compiler)
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 表达式编译器核心管道模块无直接单元测试

### [维度14] flux-action-core: action-execution (437行) 和 built-in-actions (249行) 无直接测试

- **严重程度**: P1
- **类别**: 覆盖缺口

### [维度14] flux-runtime: form-runtime-validation (522行) 无直接测试

- **严重程度**: P1
- **类别**: 覆盖缺口

### [维度14] flux-react: node-renderer (494行) 无直接测试

- **严重程度**: P1
- **类别**: 覆盖缺口

### [维度14] spreadsheet 无任何 E2E 测试

- **严重程度**: P1
- **类别**: 覆盖缺口

### [维度14] flow-designer-renderers: 43 源文件仅 13 测试

- **严重程度**: P1
- **类别**: 覆盖缺口

## P2 发现（6 个）

1. basic-page-layout.test.tsx 手动 cleanup 而非 afterEach
2. spreadsheet-renderers/report-designer-renderers vitest.config 环境不匹配
3. ui 包 70 源文件仅 16 测试，无覆盖阈值
4. test-support env mock 在 3 个包中重复定义
5. flux-runtime 仅 7/69 测试文件使用 afterEach 清理
6. 9 个包缺少覆盖阈值配置

## P3 发现（3 个）

1. debug-collapsible E2E 测试文件使用数字后缀命名
2. plan-68-69-remaining-behaviors.test.ts 以计划编号命名
3. 高级表单组件缺少完整交互 E2E
