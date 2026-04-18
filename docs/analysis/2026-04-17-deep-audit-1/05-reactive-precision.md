# 维度05：响应式订阅精度

- 审核日期：2026-04-17
- 初审发现：5
- 维度复核结论：保留 5，补充 2

## 已通过独立复核

### [维度05-01] `useFormFieldController` 用 whole-form broadcast 读取单字段值/展示态

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-react/src/hooks.ts`

### [维度05-02] form 模式下仍保留无用 `useScopeSelector` 订阅

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `key-value.tsx`, `condition-builder/ConditionBuilder.tsx`

### [维度05-03] `FieldFrame` 聚合错误读取仍走 whole-form 订阅

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/hooks.ts`

### [维度05-04] dialog/drawer surface host 订阅整个 surface scope

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-react/src/dialog-host-surface.tsx`, `packages/flux-react/src/dialog-host.tsx`

### [维度05-05] `useCurrentFormModelGeneration()` 订阅范围过宽

- 严重程度：P3
- 复核判定：保留
- 文件：`packages/flux-react/src/hooks.ts`, `packages/flux-runtime/src/form-runtime.ts`, `form-runtime-owner.ts`

### [维度05-06] controller 之外仍有 form+scope 双通道唤醒

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `detail-view/detail-field.tsx`, `composite-field/object-field.tsx`

### [维度05-07] 多个高级字段仍用 whole-store 广播读取单路径 form value

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-renderers-form-advanced/src/array-editor.tsx`, `key-value.tsx`, `composite-field/array-field.tsx`, `condition-builder/ConditionBuilder.tsx`, `variant-field.tsx`, `detail-field.tsx`, `object-field.tsx`
