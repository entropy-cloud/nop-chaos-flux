# [维度14] 测试覆盖与质量 — 初审报告

## 测试覆盖统计

### 零测试包

| 包名            | 实现行数 | 风险 |
| --------------- | -------- | ---- |
| flux-i18n       | 724      | 中   |
| tailwind-preset | 90       | 低   |
| theme-tokens    | 1        | 无   |

### 低覆盖包（测试/代码比 < 0.3）

| 包名                  | 测试/代码比 |
| --------------------- | ----------- |
| ui                    | 0.03        |
| flux-renderers-basic  | 0.25        |
| spreadsheet-renderers | 0.25        |
| flux-renderers-data   | 0.30        |

### 高覆盖包（测试/代码比 > 1.0）

| 包名                         | 测试/代码比 |
| ---------------------------- | ----------- |
| word-editor-core             | 1.77        |
| flux-renderers-form-advanced | 1.40        |
| flux-renderers-form          | 1.17        |
| flux-runtime                 | 1.02        |

## 发现清单

### [维度14] flux-i18n 完全无测试 (P1)

- 724 行实现，0 个测试
- **建议**: 添加 locale key 对称性测试

### [维度14] flux-core 测试/代码比仅 0.14 (P1)

- 基础层覆盖薄弱，schema-diagnostics 和 workbench 无测试
- **建议**: 优先补充核心工具函数测试

### [维度14] E2E 调试文件 (P2)

- 5 个 debug/diag 文件含 console.log，无回归保护价值
- **建议**: 删除或规范化

### [维度14] E2E 重复 helper (P2)

- 5 个文件重复定义 openFlowDesigner
- **建议**: 提取到共享模块

### P3 级发现

- jsdom 测试 setup 不统一
- 聚合式 index.test.tsx 无实际作用

## 全局统计

- 总测试文件: 216（208 包内 + 8 playground）
- 总测试行数: ~46,321
- 总实现行数: 68,595
- 全局测试/代码比: ~0.61
