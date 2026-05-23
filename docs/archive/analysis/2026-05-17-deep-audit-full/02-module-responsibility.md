# 维度 02：模块职责与文件边界 — 审计报告

## 第 1 轮（初审）

### [维度02-01] shape-validation.ts 职责混合：深层字段分析应提取 (P1)

- **文件**: `packages/flux-compiler/src/schema-compiler/shape-validation.ts` (766 行)
- **现状**: 混合了常量、独立字段验证器、宿主合约上下文解析、深层字段分析（150行混杂table/tabs/variant-field遍历）、schema节点字段检验、schema图递归遍历
- **建议**: 将 `analyzeDeepSchemaField`（行254-403）提取到 `schema-compiler/deep-field-analysis.ts`

### [维度02-02] variant-field.tsx 副作用与渲染混合 (P1)

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` (754 行)
- **现状**: 调度逻辑（切换+检测）、UI渲染（select/tabs）、上下文提供者堆叠、验证合约注册、生命周期清理混合在一个文件中
- **建议**: 将调度/副作用逻辑提取到自定义 hooks（`useVariantDetection`、`useVariantSwitch`、`useVariantChildContract`）

### [维度02-03] form-store.ts 三个无关 store 合并在一个文件中 (P2)

- **文件**: `packages/flux-runtime/src/form-store.ts` (605 行)
- **现状**: `createFormStore`、`createPageStore`、`createSurfaceStore` 三个独立 store 工厂在同一文件中
- **建议**: 将 `createSurfaceStore` 提取到 `surface-store.ts`，将 `createPageStore` 提取到 `page-store.ts`

### [维度02-04] import-stack.ts push/installPrepared 代码重复 (P2)

- **文件**: `packages/flux-runtime/src/import-stack.ts` (580 行)
- **建议**: 将共享的帧安装器/回滚器逻辑提取到 `import-stack-helpers.ts`

### [维度02-05] reaction-runtime.ts 二次膨胀 (P2)

- **文件**: `packages/flux-runtime/src/async-data/reaction-runtime.ts` (593 行)
- **建议**: 将全局级联守卫提取到 `reaction-cascade-guard.ts`

### [维度02-06] flux-react src/ 根目录文件过多 (P2)

- **文件**: `packages/flux-react/src/` (38 个非测试文件)
- **建议**: 将 hooks 按领域分组到 `hooks/` 子目录，将渲染原语移入 `components/`

### [维度02-07] renderers/shared/ 过度拆分 (P3)

- **目录**: `packages/flux-renderers-form/src/renderers/shared/`
- **建议**: 合并 9-13 行的小文件

### [维度02-08] 边界文档缺少 form-store 等文件映射 (P3)

- **文件**: `docs/architecture/flux-runtime-module-boundaries.md`
- **建议**: 添加 form-store.ts、form-store-owned.ts、action-execution.ts 的文件所有权
