# 维度 03：API 表面积与契约一致性 — 审计报告

## 第 1 轮（初审）

### [维度03-01] 通配符导出掩盖内部结构 (P1)

- **影响包**: `flux-renderers-basic`、`flux-renderers-form`、`flux-renderers-data`、`nop-debugger`
- **现状**: 使用 `export *` 通配符，可能泄露非公共项
- **建议**: 转换为命名导出

### [维度03-02] flux-core schema-diagnostics 内部泄漏 (P1)

- **文件**: `packages/flux-core/src/index.ts`
- **建议**: 审查 schema-diagnostics/index.js 导出

### [维度03-03] flux-bundle 绕过 flux-renderers-form 索引 (P1)

- **文件**: `flux-bundle/index.tsx:8` - 从 `@nop-chaos/flux-renderers-form/definitions` 导入
- **建议**: 改为从 `@nop-chaos/flux-renderers-form` 导入

### [维度03-04] flux-bundle as unknown as 桥接 (P1)

- **文件**: `flux-bundle/src/index.tsx`
- **建议**: 统一类型定义或提供显式适配器

### [维度03-05] CrudRenderer 合成 props 类型错位 (P2)

- **文件**: `crud-renderer.tsx`
- **建议**: 为 CrudRenderer 定义显式 props 接口

### [维度03-06] theme-tokens 空类型导出 (P3)

- **记录**: 纯 CSS 包，package.json 应记录此约定
