# 维度17：命名与术语一致性

- 审核日期：2026-04-17
- 初审发现：3
- 维度复核结论：保留 3，降级 1，补充 1

## 已通过独立复核

### [维度17-01] CRUD 文档/示例仍指导作者使用 `actionType`

- 严重程度：P1
- 复核判定：保留
- 文件：`docs/components/crud/design.md`, `docs/components/crud/example.json`, `packages/flux-renderers-data/src/crud-schema.ts`, `packages/flux-renderers-basic/src/schemas.ts`, `index.tsx`, `docs/references/flux-json-conventions.md`

### [维度17-02] 活跃架构文档仍用 `CompiledSchemaNode`

- 严重程度：P2
- 复核判定：保留
- 文件：`docs/architecture/schema-file-validator.md`, `docs/architecture/frontend-baseline.md`, `docs/references/terminology.md`, `docs/architecture/renderer-runtime.md`

### [维度17-03] 全局 Button `variant` 术语仍写 `primary/danger`

- 严重程度：P2
- 复核判定：保留
- 文件：`docs/references/flux-json-conventions.md`, `packages/flux-renderers-basic/src/schemas.ts`, `docs/components/crud/example.json`

## 降级项

### [维度17-D1] drawer 命名同时出现 `dialogId` 与 `drawerId`

- 复核判定：降级保留
- 文件：`packages/flux-core/src/types/actions.ts`, `packages/flux-runtime/src/action-runtime-handlers.ts`, `runtime-factory.ts`, `packages/flux-react/src/helpers.tsx`, `hooks.ts`
- 原因：更准确地说，这是内部 surface id 命名未收敛，而非高风险公开契约冲突。
