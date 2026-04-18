# 维度 12：表单字段与 Slot 建模

## 初审概览
- 初审候选：1
- 维度复核：1 条保留

## 条目复核
### [保留] table 的 `loadingSlot` 未在 field metadata 中声明
- **关键文件**: `packages/flux-renderers-data/src/table-renderer.tsx:35,121`, `packages/flux-renderers-data/src/schemas.ts:27`, `packages/flux-renderers-data/src/index.tsx:117-125`
- **说明**: renderer 已按 slot/value-or-region 使用该字段，但 metadata 未登记，编译期不会正确分流到 region。
