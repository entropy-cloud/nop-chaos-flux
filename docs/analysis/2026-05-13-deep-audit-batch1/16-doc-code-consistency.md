# 维度 16：文档-代码一致性

## 第 1 轮（初审）

### [维度16-01] `renderer-runtime.md` 漏记了当前公开 hook 面

- **文档路径**: `docs/architecture/renderer-runtime.md:517-586`
- **代码路径**: `packages/flux-react/src/index.tsx:16-48`; `packages/flux-react/src/hooks.ts:221-227`; `packages/flux-react/src/hooks/use-form-hooks.ts:217-223`
- **严重程度**: P2
- **漂移类型**: 行为不一致
- **文档描述**: `Current Hooks` 与 form/runtime hook 段落未包含 `useCurrentValidationValues`、`useFormLayout`、`useStrictMode`
- **代码现状**: 三者都已从 `@nop-chaos/flux-react` root export 公开导出
- **建议**: 更新 `renderer-runtime.md` 的 hooks 列表与说明，补全这 3 个公开 hook

### [维度16-02] `flux-runtime-module-boundaries.md` 指向了不存在的测试路径

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md:353-361`
- **代码路径**: `packages/flux-runtime/src/__tests__/runtime-validation.test.ts`; `packages/flux-runtime/src/validation/validators.test.ts`; `packages/flux-runtime/src/validation/registry.test.ts`
- **严重程度**: P2
- **漂移类型**: 路径失效
- **文档描述**: 文档指向 `packages/flux-runtime/src/index.test.ts`
- **代码现状**: 该文件不存在，当前集成覆盖位于 `src/__tests__/...`
- **建议**: 把 dead path 更新为当前 `src/__tests__/...` 集成测试位置

### [维度16-03] `canvas-adapters.md` 使用了不存在的大小写路径

- **文档路径**: `docs/architecture/flow-designer/canvas-adapters.md:155-160`
- **代码路径**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`
- **严重程度**: P3
- **漂移类型**: 路径失效
- **文档描述**: 文档锚点写成 `DesignerXyflowCanvas.tsx`
- **代码现状**: live 文件为小写 `designer-xyflow-canvas.tsx`
- **建议**: 更新为当前 lowercase live path

### [维度16-04] `schema-file-validator.md` 仍用已移除的 `CompiledSchemaNode` 描述当前基线

- **文档路径**: `docs/architecture/schema-file-validator.md:37-45`
- **代码路径**: `packages/flux-core/src/types/node-identity.ts:122-191`
- **严重程度**: P3
- **漂移类型**: 术语过时
- **文档描述**: present-tense baseline note 仍描述当前的 `CompiledSchemaNode` 字段
- **代码现状**: live core 类型已收敛为 `TemplateNode` / `CompiledTemplate`
- **建议**: 改为 `TemplateNode` 或中性表述“compiled template-node field”

### [维度16-05] 多个 live 计划文件使用了超出 plan guide 的状态字面量

- **文档路径**: `docs/plans/132-runtime-schema-dependency-elimination-plan.md`; `docs/plans/159-code-refactor-discovery-remediation-plan.md`; `docs/plans/108-form-field-consumer-performance-plan.md`; `docs/plans/00-plan-authoring-and-execution-guide.md`
- **代码路径**: 无直接代码对应
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: 多个计划写成 `completed (core scope)`、`completed (rejected by evidence)`、`completed (P2.3 descoped)` 等非 guide 枚举值
- **代码现状**: plan guide 只允许固定 plan-level 与 slice-level 状态枚举
- **建议**: 将状态规范化为 guide 允许值，把 qualifier 移到 notes/reasons/closure 文本

## 深挖第 2 轮追加

### [维度16-06] `120-runtime-async-governance-convergence-plan.md` 仍保留超出 guide 枚举的 slice 状态，且与 closure note 自相矛盾

- **文档路径**: `docs/plans/120-runtime-async-governance-convergence-plan.md:223`; `docs/plans/120-runtime-async-governance-convergence-plan.md:262-267`; `docs/plans/00-plan-authoring-and-execution-guide.md:99-107`; `docs/plans/00-plan-authoring-and-execution-guide.md:323-329`
- **代码路径**: 无直接代码对应
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: Phase 7 写成 `completed with external workspace blockers noted`
- **代码现状**: plan guide 只允许固定 slice 状态；且同文 `Closure` 又说先前 external-blocker note 已不再需要
- **建议**: 将 Phase 7 状态规范化为 `completed`，把 qualifier 移到 closure/说明段落

### [维度16-07] `182-deep-audit-full-3-mechanical-fixes-plan.md` 使用了 guide 未定义的 `skipped (false positive)` slice 状态

- **文档路径**: `docs/plans/182-deep-audit-full-3-mechanical-fixes-plan.md:103-111`; `docs/plans/00-plan-authoring-and-execution-guide.md:99-107`
- **代码路径**: 无直接代码对应
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: Phase 3 写成 `skipped (false positive)`
- **代码现状**: plan guide 没有 `skipped` 这个 slice 状态
- **建议**: 将状态改为 guide 允许字面量，并把 false-positive 裁定保留在 phase 说明中

## 维度复核结论

- [维度16-01]: 保留 (P2)。`renderer-runtime.md` 仍漏记当前公开 hook 面。
- [维度16-02]: 保留 (P2)。`flux-runtime-module-boundaries.md` 仍指向不存在的测试路径。
- [维度16-03]: 降级为 P3。`canvas-adapters.md` 的 code anchor 大小写/命名形式不精确，但影响较低。
- [维度16-04]: 保留 (P3)。`schema-file-validator.md` 仍用已移除的 `CompiledSchemaNode` 描述当前基线。
- [维度16-05]: 保留 (P2)。多个 live 计划文件仍使用超出 plan guide 的状态字面量。
- [维度16-06]: 保留 (P2)。`120-runtime-async-governance-convergence-plan.md` 的 slice 状态仍超出 guide 枚举且与 closure note 自相矛盾。
- [维度16-07]: 保留 (P2)。`182-deep-audit-full-3-mechanical-fixes-plan.md` 仍使用 guide 未定义的 `skipped (false positive)` 状态。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                | 一句话摘要                                           |
| ----- | -------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| 16-01 | P2       | `docs/architecture/renderer-runtime.md:517-586`                     | owner doc 仍漏记已公开的 flux-react hooks            |
| 16-02 | P2       | `docs/architecture/flux-runtime-module-boundaries.md:353-361`       | 架构文档仍指向不存在的测试路径                       |
| 16-03 | P3       | `docs/architecture/flow-designer/canvas-adapters.md:155-160`        | code anchor 仍使用不存在的大小写路径                 |
| 16-04 | P3       | `docs/architecture/schema-file-validator.md:37-45`                  | 当前基线仍引用已移除的 `CompiledSchemaNode` 术语     |
| 16-05 | P2       | `docs/plans/132-runtime-schema-dependency-elimination-plan.md`      | 多个 live plan 仍使用超出 guide 的状态字面量         |
| 16-06 | P2       | `docs/plans/120-runtime-async-governance-convergence-plan.md:223`   | Phase 7 状态超出枚举且与 closure note 矛盾           |
| 16-07 | P2       | `docs/plans/182-deep-audit-full-3-mechanical-fixes-plan.md:103-111` | 仍使用未定义的 `skipped (false positive)` slice 状态 |
