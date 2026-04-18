# 维度13：类型安全与动态边界

- 审核日期：2026-04-17
- 初审发现：4
- 维度复核结论：保留 4，降级 1，补充 1

## 已通过独立复核

### [维度13-01] `RendererDefinition.component` 把泛型擦成 `RendererComponentProps<any>`

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-core/src/types/renderer-core.ts`, `packages/flux-react/src/node-renderer.tsx`

### [维度13-02] Condition Builder 已有精确类型却仍暴露 `any`，且存在真实空值崩溃路径

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-renderers-form-advanced/src/condition-builder/types.ts`, `ConditionBuilder.tsx`, `ConditionGroup.tsx`, `ConditionItem.tsx`

### [维度13-03] Chart `series/source` 用 `any`，空值元素可直接崩溃

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-renderers-data/src/chart-schemas.ts`, `chart-renderer.tsx`

### [维度13-04] Table source 同样存在数组元素边界崩溃

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-renderers-data/src/table-renderer.tsx`, `table-renderer/table-data.ts`

## 降级项

### [维度13-D1] 编译后 action 在 React 执行链上被降成 `unknown/any`

- 复核判定：降级保留
- 文件：`packages/flux-core/src/types/node-identity.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-react/src/node-renderer.tsx`, `helpers.tsx`
- 原因：这更像类型卫生/静态约束退化，前置 shape validation 已挡住大部分运行时风险。
