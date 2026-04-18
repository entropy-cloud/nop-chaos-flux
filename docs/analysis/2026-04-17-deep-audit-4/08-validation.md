# 维度 08：验证系统一致性

## 初审概览
- 初审候选：4
- 维度复核：3 条保留，1 条降级

## 条目复核
### [保留] `showErrorOn` 类型和默认值仍是 touched/submit 基线
- **关键文件**: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-react/src/field-frame.tsx`, `docs/architecture/form-validation.md`
- **说明**: 文档基线已切到 `blur/change/manual`，代码和默认值仍停留在旧模型。

### [保留] 隐藏字段切换不即时清理 stale errors 或刷新 summary
- **关键文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:167`, `packages/flux-runtime/src/form-runtime-validation.ts:274`, `packages/flux-runtime/src/form-runtime-owner.ts:34`
- **说明**: hidden transition 只记集合，不即时收敛错误和 owner 摘要。

### [保留] runtime-only 异步验证分支缺少 stale suppression
- **关键文件**: `packages/flux-runtime/src/form-runtime-validation.ts:102-133,153-258,282-287`
- **说明**: compiled 分支已有 `runId/modelGeneration` 防护，但 runtime-only 分支没有。

### [降级] `FieldFrame/useFieldPresentation` 仍有 whole-store 订阅入口
- **关键文件**: `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-react/src/hooks.ts`
- **说明**: 更准确地说是订阅精度残留问题，核心一致性风险较低。
