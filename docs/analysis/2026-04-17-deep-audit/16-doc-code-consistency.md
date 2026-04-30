# 16 文档-代码一致性

- Task ID: `ses_268b24f47ffeFeJB5eU3XtrqFQ`
- Source prompt: `docs/skills/deep-audit-prompts.md`

## Verification Audit: 2026-04-17

All issues were re-verified against the live repo. Results and remediation status below.

### [维度16] AGENTS 包清单未同步 `flux-renderers-form-advanced` — ✅ CONFIRMED, FIXED

- **文档路径**: `AGENTS.md:9-30`, `AGENTS.md:32-49`
- **代码路径**: `packages/flux-renderers-form-advanced/package.json:1-35`, `apps/playground/package.json:15-21`
- **严重程度**: P2
- **漂移类型**: owner漂移
- **文档描述**: AGENTS 的 workspace package 列表与依赖流仍只描述 `flux-renderers-form`，未包含新增的 `@nop-chaos/flux-renderers-form-advanced`。
- **代码现状**: 仓库已存在独立包 `packages/flux-renderers-form-advanced/`，且 playground 已直接依赖它。
- **验证结果**: 问题确实存在。AGENTS.md 包列表和依赖流均缺少该包。
- **修复**: 已在 AGENTS.md 包列表中添加 `@nop-chaos/flux-renderers-form-advanced`，依赖流中更新为 `flux-renderers-* (includes flux-renderers-form-advanced)`。

### [维度16] `flux-runtime-module-boundaries` 漏记 `form-store.ts` 的 surface store 归属 — ✅ CONFIRMED, FIXED

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md:171-188`
- **代码路径**: `packages/flux-runtime/src/form-store.ts:206-273`
- **严重程度**: P2
- **漂移类型**: owner漂移
- **文档描述**: 文档将 `form-store.ts` 归类为 "form store state updates / page store state updates"。
- **代码现状**: 同一文件还实现了 `createSurfaceStore()`，实际同时承载 `SurfaceStoreApi` 的创建与更新逻辑。
- **验证结果**: 问题确实存在。`form-store.ts:233-273` 包含 `createSurfaceStore()`，但文档未提及。
- **修复**: 已在文档的模块归属表中添加 "surface store state updates"。

### [维度16] `renderer-runtime` 的 React 合同描述落后于实际导出 — ✅ CONFIRMED, FIXED

- **文档路径**: `docs/architecture/renderer-runtime.md:389-414`, `docs/architecture/renderer-runtime.md:686-701`
- **代码路径**: `packages/flux-react/src/index.tsx:14-41`, `packages/flux-core/src/types/renderer-hooks.ts:120-144`
- **严重程度**: P2
- **漂移类型**: 行为不一致
- **文档描述**: 文档中的 "Current Hooks" 和 `SchemaRendererProps` 仍是较旧版本；同时将 `useCurrentNodeMeta().cid` 写成必填 `number`。
- **代码现状**: 当前导出面已包含 `useRenderInstancePath`、`useCurrentSurfaceRuntime`、`useCurrentFormState`、`useCurrentFormError`、`useValidationNodeState`、`useOwnedFieldState`、`useChildFieldState`、`useCurrentFormModelGeneration` 等；`RenderNodeMeta.cid` 为可选；`SchemaRendererProps` 还包含 `surfaceRuntime?: SurfaceRuntime`。
- **验证结果**: 问题确实存在。文档 hooks 列表缺少约 12 个 hook，`cid` 类型错误，`SchemaRendererProps` 缺少 `surfaceRuntime`。
- **修复**: 已以 `renderer-hooks.ts` / `flux-react/src/index.tsx` 为准重写 hooks 列表，修正 `cid` 为 `cid?: number`，补充 `surfaceRuntime?: SurfaceRuntime` 到 `SchemaRendererProps`。

### [维度16] `terminology` 中对 `ResolvedNodeMeta` 的定义已过时 — ✅ CONFIRMED, FIXED

- **文档路径**: `docs/references/terminology.md:79-90`
- **代码路径**: `packages/flux-core/src/types/renderer-compiler.ts:21-30`
- **严重程度**: P2
- **漂移类型**: 术语过时
- **文档描述**: 术语表称 `ResolvedNodeMeta` "typically includes" `label`、`title` 等显示文本。
- **代码现状**: 当前类型仅含 `id`、`className`、`visible`、`hidden`、`disabled`、`testid`、`changed`、`cid`，不含 `label`/`title`。
- **验证结果**: 问题确实存在。实际类型 `ResolvedNodeMeta` 无 `label`/`title` 字段。
- **修复**: 已重写术语描述，列出所有实际字段，明确说明显示文本不属于此类型。

### [维度16] `form-validation` 仍在使用不存在的类型名 `CompiledValidationModel` — ✅ CONFIRMED, FIXED

- **文档路径**: `docs/architecture/form-validation.md:125-130`
- **代码路径**: `packages/flux-core/src/types/validation.ts:102-111`
- **严重程度**: P2
- **漂移类型**: 术语过时
- **文档描述**: 文档把核心抽象之一写为 `CompiledValidationModel`。
- **代码现状**: 当前公开类型为 `CompiledFormValidationModel`，仓库内无 `CompiledValidationModel` 导出。
- **验证结果**: 问题确实存在。`validation.ts` 中实际类型名为 `CompiledFormValidationModel`。
- **修复**: 已将 `form-validation.md`、`form-validation-runtime-types.md`、`docs/index.md` 中的 `CompiledValidationModel` 统一改为 `CompiledFormValidationModel`。注意 `docs/analysis/` 和 `docs/logs/` 中的历史记录保持不变。

### [维度16] `field-binding-and-renderer-contract` 的代码锚点已失效 — ✅ CONFIRMED, FIXED

- **文档路径**: `docs/architecture/field-binding-and-renderer-contract.md:22-34`
- **代码路径**: `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:1-40`
- **严重程度**: P2
- **漂移类型**: 路径失效
- **文档描述**: Current Code Anchors 仍指向 `packages/flux-renderers-form/src/renderers/composite-schemas.ts`。
- **代码现状**: 该文件已不在原包中，实际位置已迁到 `flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`。
- **验证结果**: 问题确实存在。`packages/flux-renderers-form/src/renderers/composite-schemas.ts` 不存在，实际文件在 `flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`。
- **修复**: 已更新锚点到 `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`。

### [维度16] `flow-designer/design` 仍引用不存在的旧示例路径 — ✅ CONFIRMED, FIXED

- **文档路径**: `docs/architecture/flow-designer/design.md:12-18`
- **代码路径**: 无（文档所述 `apps/main/src/pages/flow-editor` 在当前仓库不存在）
- **严重程度**: P3
- **漂移类型**: 路径失效
- **文档描述**: 非目标中写明"不替换现有 `apps/main/src/pages/flow-editor` 示例"。
- **代码现状**: 当前仓库没有 `apps/main/`，相关运行入口已是 playground 体系。
- **验证结果**: 问题确实存在。`apps/main/` 目录不存在。
- **修复**: 已将失效路径改为 "当前位于 playground 体系"。

### [维度16] Plan 112 已标记 completed，但 closure 证据和校验清单未收口 — ✅ CONFIRMED, NOT FIXED (plan maintenance)

- **文档路径**: `docs/plans/112-capability-projection-manifest-implementation-plan.md:144-175`
- **代码路径**: `packages/flux-core/src/schema-diagnostics/manifest.ts:146`, `packages/flux-runtime/src/schema-compiler/host-action-validation.ts:129-296`, `packages/flow-designer-renderers/src/designer-manifest.ts:393-423`
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **验证结果**: 问题确实存在。Validation Checklist 3 项未勾选，reviewer 为"待补充"。但代码实现确实完整落地。
- **处置**: 此为计划文档维护项，非代码缺陷，需要人工审阅后决策。不在本轮自动修复范围内。

### [维度16] Plan 113 已标记 completed，但执行清单与 live repo 明显不一致 — ✅ CONFIRMED, NOT FIXED (plan maintenance)

- **文档路径**: `docs/plans/113-renderer-package-migration-plan.md:191-212`, `docs/plans/113-renderer-package-migration-plan.md:214-377`, `docs/plans/113-renderer-package-migration-plan.md:379-413`
- **代码路径**: `packages/flux-renderers-form-advanced/src/index.tsx:24-27`, `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:1-40`
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **验证结果**: 问题确实存在。Phase checklist 未勾选，计划与实际文件布局不一致。
- **处置**: 此为计划文档维护项，非代码缺陷，需要人工审阅后决策。不在本轮自动修复范围内。
