# 维度14：测试覆盖与质量

- 审核日期：2026-04-17
- 初审发现：4
- 维度复核结论：保留 3，降级 1，补充 1

## 已通过独立复核

### [维度14-01] `flux-i18n` 完全无测试

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-i18n/src/i18n.ts`, `hooks.ts`, `package.json`

### [维度14-02] `report-designer-renderers/src/renderers.integration.test.tsx` 跨域过多

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/report-designer-renderers/src/renderers.integration.test.tsx`

### [维度14-03] `flow-designer-renderers/src/index.test.tsx` 是 omnibus test file

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flow-designer-renderers/src/index.test.tsx`

### [维度14-04] `form-runtime-status.ts` 导出 helper 缺少直接测试

- 严重程度：P3
- 复核判定：保留
- 文件：`packages/flux-runtime/src/form-runtime-status.ts`

## 降级项

### [维度14-D1] projected-scope-store / status-owner 等 helper 缺直接单测

- 复核判定：降级保留
- 文件：`packages/flux-runtime/src/projected-scope-store.ts`, `status-owner.ts`
- 原因：直接单测缺失成立，但已有明显间接覆盖。
