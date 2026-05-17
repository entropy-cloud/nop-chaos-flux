# 维度 14：测试覆盖与质量 — 审计报告

## 第 1 轮（初审）

### [维度14-01] submitCalls 模块级可变数组跨文件泄漏 (P0)

- **文件**: `packages/flux-renderers-form-advanced/src/test-support.tsx`
- **类别**: 隔离性
- **建议**: 改为 beforeEach 自动重置或每个 describe 独立实例

### [维度14-02] 全局 DOM patch 无 restore 机制 (P1)

- **文件**: `packages/flux-renderers-form/src/test-dom-polyfills.ts`、`flux-renderers-form-advanced/src/test-support.tsx`
- **类别**: 隔离性
- **建议**: 移至 beforeEach/afterEach 或 vitest setup stub

### [维度14-03] i18n 初始化在模块顶层执行 (P2)

- **文件**: `flux-renderers-form-advanced/src/test-support.tsx`
- **建议**: 移至 beforeAll

### [维度14-04] afterEach 清理模式不一致 (P2)

- **类别**: 一致性
- **建议**: 统一通过 vitest setupFiles 配置全局 afterEach

### [维度14-05] schema-renderer.test.tsx 多领域混在单文件 (P2)

- **文件**: `packages/flux-react/src/__tests__/schema-renderer.test.tsx` (740 行)
- **建议**: 按功能域拆分

### [维度14-06] flux-bundle 测试严重不足 (P2)

- **文件**: `packages/flux-bundle/src/index.test.ts` (81 行, 5 测试)
- **建议**: 增加跨包集成测试

### [维度14-07] flux-i18n 缺少异步加载测试 (P2)

- **建议**: 增加动态回退链测试

### [维度14-08] E2E 缺少表单高级功能和电子表格覆盖 (P2)

- **建议**: 增加 composite-form/variant-field/spreadsheet 的 E2E

### [维度14-09 至 14-16] 其他 P2/P3 发现

- 14-09: queueMicrotask 手动 patch/restore (P2)
- 14-10: window.confirm 手动保存/恢复 (P2)
- 14-11: 50+ 测试文件 >400 行 (P2)
- 14-12: basic-page-layout-structure 单一 describe 651 行 (P2)
- 14-13 至 14-16: 其他 P3 细节

**总体评分**: B（核心风险需修复）
