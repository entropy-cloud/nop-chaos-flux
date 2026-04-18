# 维度16：文档-代码一致性

- 审核日期：2026-04-17
- 初审发现：4
- 维度复核结论：保留 4，补充 2

## 已通过独立复核

### [维度16-01] `SchemaRendererProps.surfaceRuntime` 已进入文档与类型，但实现未接线

- 严重程度：P1
- 复核判定：保留
- 文件：`docs/architecture/renderer-runtime.md`, `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/schema-renderer.tsx`

### [维度16-02] `form-validation.md` 把默认 `showErrorOn` 写成 `blur`

- 严重程度：P1
- 复核判定：保留
- 文件：`docs/architecture/form-validation.md`, `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `validation-collection.ts`, `packages/flux-react/src/field-frame.tsx`, `form-state.ts`

### [维度16-03] `flux-runtime-module-boundaries.md` 仍把 `src/index.ts` 写成装配 owner

- 严重程度：P2
- 复核判定：保留
- 文件：`docs/architecture/flux-runtime-module-boundaries.md`, `packages/flux-runtime/src/index.ts`, `runtime-factory.ts`

### [维度16-04] `AGENTS.md` 的 `RendererComponentProps` 导入示例已失效

- 严重程度：P2
- 复核判定：保留
- 文件：`AGENTS.md`, `packages/flux-react/src/index.tsx`, `packages/flux-renderers-basic/src/container.tsx`

### [维度16-05] `renderer-interfaces.md` 的 Root Entry Contract 已落后于 live contract

- 严重程度：P3
- 复核判定：保留
- 文件：`docs/references/renderer-interfaces.md`, `packages/flux-core/src/types/renderer-hooks.ts`, `docs/architecture/renderer-runtime.md`

### [维度16-06] `form-validation-runtime-types.md` 中的 runtime 接口已明显过时

- 严重程度：P2
- 复核判定：保留
- 文件：`docs/references/form-validation-runtime-types.md`, `packages/flux-core/src/types/runtime.ts`
