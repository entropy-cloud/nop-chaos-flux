# 维度 17：命名与术语一致性

## 初审概览
- 初审候选：3
- 维度复核：整体降级为“局部活跃文档残留旧术语”

## 条目复核
### [保留] `frontend-baseline.md` 仍将 `CompiledSchemaNode` 作为推荐命名
- **关键文件**: `docs/architecture/frontend-baseline.md:131`, `docs/architecture/flux-core.md:151,313-321`, `docs/architecture/renderer-runtime.md:64-67`
- **说明**: 活跃文档中仍存在旧术语示例。

### [保留] `schema-file-validator.md` 仍把 `CompiledSchemaNode` 当现行编译结果名
- **关键文件**: `docs/architecture/schema-file-validator.md:29,42,403,431,542`, `packages/flux-core/src/types/renderer-compiler.ts:49-50`
- **说明**: 旧术语仍被当作当前契约命名使用。

### [保留] `flux-dsl-vm-extensibility.md` 的 `RendererComponentProps` 示例仍使用 `CompiledSchemaNode`
- **关键文件**: `docs/architecture/flux-dsl-vm-extensibility.md:475`, `packages/flux-core/src/types/renderer-core.ts:84`
- **说明**: 示例代码仍展示已过时的类型名。
