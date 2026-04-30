# 维度 05：响应式订阅精度

## 初审概览

- 初审候选：3
- 维度复核：1 条保留，1 条降级，1 条驳回

## 条目复核

### [驳回] `useBoundFieldValue()` 在 form 模式仍保留 scope 订阅

- **关键文件**: `packages/flux-renderers-form/src/field-utils.tsx:75,81`, `packages/flux-react/src/hooks.ts:129-153`
- **说明**: `enabled: !currentForm` 会在 form 模式下关闭该订阅。

### [降级] 复合字段在 form 模式同时订阅 form 和 scope

- **关键文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:93`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:75`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:40`
- **说明**: 冗余订阅真实存在，但更接近额外唤醒成本，而非严重正确性问题。

### [保留] `DialogHost` 为 surface shell 订阅整份 visible scope

- **关键文件**: `packages/flux-react/src/dialog-host-surface.tsx:47-55`, `packages/flux-react/src/dialog-host.tsx:56-57,105-106`
- **说明**: shell 订阅整份 `readVisible()`，会放大本该由子树局部承担的重渲染。
