# 维度 09：渲染器契约合规性

## 初审概览

- 初审候选：3
- 维度复核：2 条保留，1 条降级

## 条目复核

### [保留] `flux-renderers-form` 的 `nop-*` wrapper 承载默认布局/视觉

- **关键文件**: `packages/flux-renderers-form/src/renderers/input.tsx:107,164,190,217,258`, `packages/flux-renderers-form/src/form-renderers.css:1`
- **说明**: 这些 marker 已携带 `display/gap/color` 等视觉和布局，不再是纯语义标记。

### [降级] `FormRenderer` 直接访问 `ownedForm.store`

- **关键文件**: `packages/flux-renderers-form/src/renderers/form.tsx:264,315`
- **说明**: 这是 owner renderer 的实现性越界，更像应收敛改进项而非最典型字段 renderer 违约。

### [保留] `TagListRenderer` 直接读取 `currentForm.store.getState().submitting`

- **关键文件**: `packages/flux-renderers-form-advanced/src/tag-list.tsx:23-31`
- **说明**: 普通 renderer 直接摸 store，违反了标准 hook 边界。
