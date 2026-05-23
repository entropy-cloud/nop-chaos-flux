# 12 表单字段与 Slot 建模

## 复核结论

- 保留: 6
- 降级: 1
- 驳回: 0

## 保留

### object-field semantic action slot 被标成 `ignored`

- 文件: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
- 结论: 保留，P1
- 依据: metadata 把 `transformInAction` / `transformOutAction` 标成 `ignored`，renderer 却直接从 raw schema 执行。

### detail-field semantic action slot 被标成 `ignored`

- 文件: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- 结论: 保留，P1

### detail-view semantic action slot 被标成 `ignored`

- 文件: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- 结论: 保留，P1

### variant-field semantic action / nested content 仍绕过 metadata

- 文件: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- 结论: 保留，P1
- 依据: `detectVariantAction` 被标成 `ignored`，`variants` 整体也未走 deep region normalization。

### report inspector `body` 被建模为 prop 而不是 region

- 文件: `packages/report-designer-renderers/src/renderers.tsx`, `packages/report-designer-renderers/src/report-designer-inspector.tsx`
- 结论: 保留，P1

### table `quickEdit.body` 缺失 deep-region extraction

- 文件: `packages/flux-compiler/src/schema-compiler/tables.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`
- 结论: 保留，P2

## 已降级

### wrap-based field chrome 仅部分走 metadata

- 文件: `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-renderers-form/src/field-utils.tsx`
- 结论: 已降级
- 依据: `label` / `required` 已集中归一化，剩余漂移主要落在 `hint` / `description` / `remark` / label layout 等次级 chrome 字段。
