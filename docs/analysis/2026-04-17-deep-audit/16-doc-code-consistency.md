# 16 文档-代码一致性

- Task ID: `ses_268b24f47ffeFeJB5eU3XtrqFQ`
- Source prompt: `docs/skills/deep-audit-prompts.md`

### [维度16] AGENTS 包清单未同步 `flux-renderers-form-advanced`
- **文档路径**: `AGENTS.md:9-30`, `AGENTS.md:32-49`
- **代码路径**: `packages/flux-renderers-form-advanced/package.json:1-35`, `apps/playground/package.json:15-21`
- **严重程度**: P2
- **漂移类型**: owner漂移
- **文档描述**: AGENTS 的 workspace package 列表与依赖流仍只描述 `flux-renderers-form`，未包含新增的 `@nop-chaos/flux-renderers-form-advanced`。
- **代码现状**: 仓库已存在独立包 `packages/flux-renderers-form-advanced/`，且 playground 已直接依赖它。
- **建议**: 更新 AGENTS 的包列表、依赖流和相关路由说明，明确 advanced form renderers 已拆包。

### [维度16] `flux-runtime-module-boundaries` 漏记 `form-store.ts` 的 surface store 归属
- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md:171-188`
- **代码路径**: `packages/flux-runtime/src/form-store.ts:206-273`
- **严重程度**: P2
- **漂移类型**: owner漂移
- **文档描述**: 文档将 `form-store.ts` 归类为 “form store state updates / page store state updates”。
- **代码现状**: 同一文件还实现了 `createSurfaceStore()`，实际同时承载 `SurfaceStoreApi` 的创建与更新逻辑。
- **建议**: 在模块归属表里补上 `SurfaceStore`/`surface store state updates`，避免 surface owner 的文件所有权继续漂移。

### [维度16] `renderer-runtime` 的 React 合同描述落后于实际导出
- **文档路径**: `docs/architecture/renderer-runtime.md:389-414`, `docs/architecture/renderer-runtime.md:686-701`
- **代码路径**: `packages/flux-react/src/index.tsx:14-41`, `packages/flux-core/src/types/renderer-hooks.ts:120-144`
- **严重程度**: P2
- **漂移类型**: 行为不一致
- **文档描述**: 文档中的 “Current Hooks” 和 `SchemaRendererProps` 仍是较旧版本；同时将 `useCurrentNodeMeta().cid` 写成必填 `number`。
- **代码现状**: 当前导出面已包含 `useRenderInstancePath`、`useCurrentSurfaceRuntime`、`useCurrentFormState`、`useCurrentFormError`、`useValidationNodeState`、`useOwnedFieldState`、`useChildFieldState`、`useCurrentFormModelGeneration` 等；`RenderNodeMeta.cid` 为可选；`SchemaRendererProps` 还包含 `surfaceRuntime?: SurfaceRuntime`。
- **建议**: 以 `renderer-hooks.ts` / `flux-react/src/index.tsx` 为准重写该节，至少同步 active exports、`RenderNodeMeta` 实际签名和根组件 props。

### [维度16] `terminology` 中对 `ResolvedNodeMeta` 的定义已过时
- **文档路径**: `docs/references/terminology.md:79-90`
- **代码路径**: `packages/flux-core/src/types/renderer-compiler.ts:21-30`
- **严重程度**: P2
- **漂移类型**: 术语过时
- **文档描述**: 术语表称 `ResolvedNodeMeta` “typically includes” `label`、`title` 等显示文本。
- **代码现状**: 当前类型仅含 `id`、`className`、`visible`、`hidden`、`disabled`、`testid`、`changed`、`cid`，不含 `label`/`title`。
- **建议**: 删除过时示例，改为强调 `ResolvedNodeMeta` 只承载运行时控制/外层元信息；显示文本应回到 `props` / slot 语义。

### [维度16] `form-validation` 仍在使用不存在的类型名 `CompiledValidationModel`
- **文档路径**: `docs/architecture/form-validation.md:125-130`
- **代码路径**: `packages/flux-core/src/types/validation.ts:102-111`
- **严重程度**: P2
- **漂移类型**: 术语过时
- **文档描述**: 文档把核心抽象之一写为 `CompiledValidationModel`。
- **代码现状**: 当前公开类型为 `CompiledFormValidationModel`，仓库内无 `CompiledValidationModel` 导出。
- **建议**: 统一改为 `CompiledFormValidationModel`，并检查全文是否仍混用旧名。

### [维度16] `field-binding-and-renderer-contract` 的代码锚点已失效
- **文档路径**: `docs/architecture/field-binding-and-renderer-contract.md:22-34`
- **代码路径**: `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:1-40`
- **严重程度**: P2
- **漂移类型**: 路径失效
- **文档描述**: Current Code Anchors 仍指向 `packages/flux-renderers-form/src/renderers/composite-schemas.ts`。
- **代码现状**: 该文件已不在原包中，实际位置已迁到 `flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`。
- **建议**: 更新锚点到新包，并顺带同步 “form / form-advanced” 的职责边界。

### [维度16] `flow-designer/design` 仍引用不存在的旧示例路径
- **文档路径**: `docs/architecture/flow-designer/design.md:12-18`
- **代码路径**: 无（文档所述 `apps/main/src/pages/flow-editor` 在当前仓库不存在）
- **严重程度**: P3
- **漂移类型**: 路径失效
- **文档描述**: 非目标中写明“不替换现有 `apps/main/src/pages/flow-editor` 示例”。
- **代码现状**: 当前仓库没有 `apps/main/`，相关运行入口已是 playground 体系。
- **建议**: 去掉失效的历史路径，改成当前可核对的 playground 或 flow-designer renderer 入口。

### [维度16] Plan 112 已标记 completed，但 closure 证据和校验清单未收口
- **文档路径**: `docs/plans/112-capability-projection-manifest-implementation-plan.md:144-175`
- **代码路径**: `packages/flux-core/src/schema-diagnostics/manifest.ts:146`, `packages/flux-runtime/src/schema-compiler/host-action-validation.ts:129-296`, `packages/flow-designer-renderers/src/designer-manifest.ts:393-423`
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: Plan Status 已是 `completed`，但 Validation Checklist 仍未勾选独立 closure audit / `pnpm typecheck` / `pnpm build`，Closure Audit Evidence 的 reviewer 还是“待补充”。
- **代码现状**: 代码确实已有 manifest / host validation / pilot host family 落地，但计划文档自身未满足 `00-plan-authoring-and-execution-guide.md` 的 completed 要求。
- **建议**: 要么补齐 closure-audit 证据并解释未完成校验项的处置；要么把状态回退到 `partially completed`。

### [维度16] Plan 113 已标记 completed，但执行清单与 live repo 明显不一致
- **文档路径**: `docs/plans/113-renderer-package-migration-plan.md:191-212`, `docs/plans/113-renderer-package-migration-plan.md:214-377`, `docs/plans/113-renderer-package-migration-plan.md:379-413`
- **代码路径**: `packages/flux-renderers-form-advanced/src/index.tsx:24-27`, `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:1-40`
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: 计划已标记 `completed`，Closure 里宣称 5 个 phase 全部成功；但 phase/checklist 基本全部仍是未勾选状态，且计划写明应创建 `src/schemas.ts`。
- **代码现状**: live repo 中 advanced 包确已存在，但仍直接导出 `./composite-field/composite-schemas`，且不存在 `src/schemas.ts`；说明计划文本与实际落地形态未同步。
- **建议**: 重审该计划：要么按 live repo 回填每个 phase/checklist 与最终文件布局，要么明确哪些原步骤已被替代并标注 superseded/outdated note。
