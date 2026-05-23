# 维度08：验证系统一致性

- 审核日期：2026-04-17
- 初审发现：2
- 维度复核结论：保留 2，补充 2

## 已通过独立复核

### [维度08-01] 文档把默认 `showErrorOn` 写成 `blur`，但 live code/类型系统都不是这样

- 严重程度：P2
- 复核判定：保留
- 文件：`docs/architecture/form-validation.md`, `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `validation-collection.ts`, `packages/flux-react/src/field-frame.tsx`, `form-state.ts`

### [维度08-02] hidden 字段切换未即时清理错误/validating，也未使旧 async/debounce 失效

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-runtime/src/form-runtime-field-ops.ts`, `form-runtime-validation.ts`, `packages/flux-react/src/node-renderer.tsx`, `docs/architecture/form-validation.md`

### [维度08-03] 依赖字段重校验当前直接 `clearErrors`

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-runtime/src/form-runtime-owner.ts`, `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`

### [维度08-04] `FormRuntime.ready/canSubmit` 未体现文档所述 touch policy

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-runtime/src/form-runtime-owner.ts`, `form-runtime.ts`, `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
