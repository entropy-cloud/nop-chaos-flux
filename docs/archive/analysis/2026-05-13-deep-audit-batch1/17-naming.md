# 维度 17：命名与术语一致性

## 第 1 轮（初审）

### [维度17-01] 通用 `button.variant` 示例仍使用不受支持的 `primary`

- **文件**: `docs/components/form/example.json:46-49`; `packages/flux-renderers-basic/src/schemas.ts:143-147`; `docs/references/flux-json-conventions.md:197-202`
- **严重程度**: P2
- **冲突名称**: 通用 `button.variant` 的 `primary` vs 规范 `default/destructive/outline/secondary/ghost/link`
- **冲突位置**: form 示例 JSON 与通用 ButtonSchema/JSON conventions
- **统一建议**: 将示例改为受支持的通用值，或明确把 `primary` 收敛为正式 alias

### [维度17-02] `variant` 在活跃按钮样式面上仍存在两套 live authoring 词汇

- **文件**: `packages/flux-renderers-basic/src/schemas.ts`; `packages/flow-designer-core/src/types.ts`; `packages/report-designer-renderers/src/schemas.ts`; `docs/references/flux-json-conventions.md`; `docs/architecture/flow-designer/config-schema.md`
- **严重程度**: P3
- **冲突名称**: 通用 `variant` vs domain toolbar `variant`
- **冲突位置**: generic ButtonSchema 使用 `default/destructive/...`；designer/report toolbar 使用 `default/primary/danger`
- **统一建议**: 要么统一到通用 Button 枚举，要么把 domain-toolbar exception 在共享 conventions 与 owner docs 中显式固化

### [维度17-03] `createFlowDesignerRegistry` 的命名仍与真实行为冲突

- **文件**: `packages/flow-designer-renderers/src/index.tsx:148-154`; `docs/architecture/flow-designer/design.md:95-97`
- **严重程度**: P3
- **冲突名称**: `createFlowDesignerRegistry` vs 实际 register/extend 语义
- **冲突位置**: live stable export 与 owner doc 的 deferred naming residual 记录
- **统一建议**: 仅保留为 deprecated compatibility alias，并把 `registerFlowDesignerRenderers()` 提升为 canonical API

## 维度复核结论

- [维度17-01]: 保留 (P2)。通用 `button.variant` 示例仍使用不受支持的 `primary`。
- [维度17-02]: 降级为 P3。designer/report toolbar 的 `variant` 双词汇已在 owner doc 中被明确解释，更像共享文档清晰度问题。
- [维度17-03]: 降级为 P3。`createFlowDesignerRegistry` 的命名残留真实存在，但更像低优先级 public naming debt。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                     | 一句话摘要                                                           |
| ----- | -------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| 17-01 | P2       | `docs/components/form/example.json:46-49`                | 通用 button 示例仍使用不受支持的 `primary`                           |
| 17-02 | P3       | `packages/flow-designer-core/src/types.ts`               | `variant` 在通用按钮与 domain toolbar 间仍有两套 live authoring 词汇 |
| 17-03 | P3       | `packages/flow-designer-renderers/src/index.tsx:148-154` | `createFlowDesignerRegistry` 命名仍与真实 register 语义冲突          |
