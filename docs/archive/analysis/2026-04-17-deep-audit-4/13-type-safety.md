# 维度 13：类型安全与动态边界

## 初审概览

- 初审候选：2
- 维度复核：1 条保留，1 条降级

## 条目复核

### [降级] `ConditionBuilderSchema` 公开字段仍暴露 `any`

- **关键文件**: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts:96-105,127-148`, `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx:46-49`
- **说明**: 公开类型确实失真，但它受 `BaseSchema` 索引签名约束，更像过渡型类型逃逸。

### [保留] `designer-toolbar.tsx` 复刻 `ToolbarItemLike` 并用断言链绕过 core 契约

- **关键文件**: `packages/flow-designer-renderers/src/designer-toolbar.tsx:8,127`, `packages/flow-designer-core/src/types.ts:201`
- **说明**: 这是跨包 DSL 契约真实分叉，而不是低代码动态边界的正常擦除。
