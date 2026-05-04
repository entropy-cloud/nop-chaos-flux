# 维度 14：测试覆盖与质量（初审）

## 测试统计

- 349 个测试文件，79,628 行测试代码
- 所有 24 个包均有至少 1 个测试文件
- 框架统一：全部 Vitest + 共享配置工厂

## P0 发现（3个）

### Q01-Q03: vitest.config.ts 环境不匹配

- flow-designer-renderers, report-designer-renderers, spreadsheet-renderers 的 vitest.config.ts 设为 node 环境
- 但 .tsx 测试使用 @testing-library/react（需 DOM）
- **建议**: 改为 jsdom 环境

## P1 发现（8个）

- Q04: schema-renderer-runtime-core.test.tsx 模块顶层共享 expressionCompiler
- Q05: form-double-edit-regression.test.tsx 共享可变状态无清理
- Q06: nop-debugger/automation.test.ts window 全局污染
- Q09: schema-compiler-registry.test.ts (745行) 跨领域单体
- Q10: form-tree-checkbox-fields.test.tsx (680行) 跨领域
- Q11: data-crud-state-interactions.test.tsx (643行) 跨领域
- Q15: 907 处 as any 降低测试类型安全
- Q17: flux-react test-support 采用率仅 38%

## P2 发现（7个）

- Q07: 9 处使用真实定时器 sleep 而非 vi.useFakeTimers()
- Q08: describe.skip 累积（1处，基准测试）
- Q12-Q14: 多个跨领域大文件（400-700+行）
- Q16: test-fixtures.ts 使用 any 参数
- Q18: ui 包极低覆盖 (0.08x)
- Q19: flux-i18n 极低覆盖（1文件16行）

## P3 发现（4个）

- Q20: 仅 8 个包配置覆盖率阈值，16 个包无门禁
- Q21: 所有包 passWithNoTests 掩盖意外删除
- Q22-Q24: 框架统一 ✓、配置一致 ✓、无 .only 泄漏 ✓

## 覆盖缺口

核心 runtime 模块（form-runtime.ts, form-runtime-validation.ts, scope.ts, runtime-factory.ts 等）缺少直接单元测试，主要通过 63 个集成测试间接覆盖。

## 复核状态: 未复核
