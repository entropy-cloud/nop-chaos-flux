# 13 类型安全与动态边界

## 复核统计

- 初审条目: 1
- 维度复核: 完成
- 子项复核: 1 条
- 保留: 0
- 降级: 1
- 驳回: 0

## 已降级

### [维度13] `ConditionBuilderSchema` 对已知 owned type 仍保留 avoidable `any`

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts:104-156`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:52-53`
- **证据片段**:
  ```ts
  104: export type ConditionField =
  135: export interface ConditionOperatorOverrides {
  141: export interface ConditionBuilderSchema extends BaseSchema {
  144:   fields?: any[];
  156:   operators?: any;
  ```
  ```ts
  52:   const operatorsOverride = schemaProps.operators;
  53:   const fields = (schemaProps.fields ?? []) as ConditionField[];
  ```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: 包内已经拥有 `ConditionField` 和 `ConditionOperatorOverrides`，但 schema 类型仍把 `fields/operators` 写成 `any`。
- **真实风险**: emitted declaration 和实现侧都失去可用的静态约束，被迫再次断言。
- **建议**: 将 `fields` / `operators` 收窄到已有 owned type，必要时再保留兼容 union。
- **误报排除**: 这不是低代码动态边界、host 注入或第三方透传场景。
- **为什么值得现在做**: 属于小范围、低风险、可直接落地的类型精度修复。
- **历史模式对应**: internal exact type exists but public schema keeps any
- **参考文档**: `docs/components/condition-builder/design.md`, `docs/skills/react19-best-practices-review.md`
- **复核状态**: `已降级`

## 零发现

- `packages/*/src` 下未发现 `@ts-expect-error` / `@ts-ignore`。
- 大多数 `any` 仍属于低代码动态边界的合理用法（host injection、formula IO、registry existential、third-party passthrough）。
