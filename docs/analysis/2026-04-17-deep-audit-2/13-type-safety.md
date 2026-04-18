# [维度13] 类型安全与动态边界 — 初审报告

## 统计
- 生产代码 ~50 处显式 as any，22 包大型低代码引擎中属低密度
- 零 @ts-ignore/@ts-expect-error
- 无三级以上断言链

## 可疑/危险项

### [维度13-1] ConditionBuilderSchema fields/operators 使用 any[]/any 但同文件已定义精确类型 (P2)
- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts:136,148`
- ConditionField 和 ConditionOperatorOverrides 已定义但未使用
- **建议**: 替换为 ConditionField[] 和 ConditionOperatorOverrides

### [维度13-2] ChartSchema series 使用 any 但同文件已定义 ChartSeriesSchema (P2)
- **文件**: `packages/flux-renderers-data/src/chart-schemas.ts:17`
- **建议**: 替换为 ChartSeriesSchema | ChartSeriesSchema[]

### [维度13-3] value-adaptation-helper 'custom' as any 绕过 ValidationRule 类型 (P2)
- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts:168`
- ValidationRule.kind 不包含 'custom'
- **建议**: 扩展 ValidationRule 联合类型

### [维度13-4] action-runtime-handlers as any 死代码 (P3)
- **文件**: `packages/flux-runtime/src/action-runtime-handlers.ts:102`
- 两侧类型一致，as any 无意义
- **建议**: 直接移除

### [维度13-5] TemplateNode eventPlans/lifecycleActions unknown 导致级联 as any (P3)
- **文件**: flux-core/src/types/node-identity.ts:86-90
- 下游 5+ 处被迫 as any
- **建议**: 收紧为 ActionSchema 类型

## 总评
- 85%+ 的 any 在 schema/scope/form 边界，属合理设计
- 整体风险低
