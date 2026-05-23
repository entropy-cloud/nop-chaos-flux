# 维度12：表单字段与 Slot 建模

- 审核日期：2026-04-17
- 初审发现：1
- 维度复核结论：保留 1，补充 2

## 已通过独立复核

### [维度12-01] `table.loadingSlot` 被按 slot 使用，但 metadata 未声明

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-renderers-data/src/index.tsx`, `table-renderer.tsx`, `packages/flux-runtime/src/schema-compiler.ts`, `schema-compiler/fields.ts`

### [维度12-02] `table.header/footer` 依赖全局默认字段规则，而不是 renderer 自声明 metadata

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-renderers-data/src/table-renderer.tsx`, `index.tsx`, `packages/flux-runtime/src/schema-compiler/fields.ts`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12-03] `TableSchema` 漏掉了实际支持的 `header/footer`

- 严重程度：P3
- 复核判定：保留
- 文件：`packages/flux-renderers-data/src/schemas.ts`, `table-renderer.tsx`, `__tests__/data-table.test.tsx`
