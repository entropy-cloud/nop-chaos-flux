# 维度 18：跨包模式一致性

## 第 1 轮（初审）

### [维度18-01] Flow Designer page input 类型缺少同族 host-page 已统一暴露的通用 props

- **文件**: `packages/flow-designer-renderers/src/schemas.ts:4-13`
- **证据片段**:
  ```ts
  export interface DesignerPageSchemaInput {
    type: 'designer-page';
    config: DesignerConfig;
    document?: GraphDocument;
    treeDocument?: TreeDocument;
    statusPath?: string;
    toolbar?: SchemaInput;
  }
  ```
- **严重程度**: P1
- **现状**: `designer-page` 没有 peers 常见的 `id/name/label/title/className/visible/hidden/disabled` 等 page-level props。
- **风险**: host-page 家族在类型层不能共享相同 authoring/migration 基线。
- **建议**: 为 Flow Designer 补齐这些 common props，或在 docs 中明确列出例外理由。
- **为什么值得现在做**: 这是 host-page 家族最直接的跨包 authoring friction。
- **误报排除**: 不涉及 domain-specific 字段差异，只针对 peers 已统一的公共 page props。
- **历史模式对应**: host-page family public shape divergence。
- **参考文档**: `docs/architecture/flux-design-principles.md`
- **复核状态**: 未复核

### [维度18-02] Flow Designer 额外暴露 `$designer` scope export，但更准确应视为降级项

- **文件**: `packages/flow-designer-renderers/src/renderer-definitions.ts:192-223`
- **证据片段**:
  ```ts
  scopeExportContracts: {
    $designer: {
      kind: 'object',
      fields: { kind, dirty, busy, canUndo, canRedo, selectionKind, selectionCount }
    },
  },
  ```
- **严重程度**: P2
- **现状**: Flow Designer 比其他 host-page 多一个 `$designer` additive export contract。
- **风险**: host-family baseline 不够统一，但当前仍同时保留 host projection path。
- **建议**: 在 docs 中解释 additive shorthand，或未来收敛到单一 projection model。
- **为什么值得现在做**: 复核已确认它不是彻底违背 host projection，而是 additive asymmetry。
- **误报排除**: 不夸大为“host projection 被放弃”；live code 仍存在 projection path。
- **历史模式对应**: additive cross-package asymmetry。
- **参考文档**: `docs/architecture/flow-designer/runtime-snapshot.md`
- **复核状态**: 未复核

### [维度18-03] Flow Designer 缺少与 peer host-page 对齐的 `define*PageSchema` helper

- **文件**: `packages/flow-designer-renderers/src/index.tsx:11-16`
- **证据片段**:
  ```ts
  export {
    flowDesignerRendererDefinitions,
    registerFlowDesignerRenderers,
    extendFlowDesignerRegistry,
    createFlowDesignerRegistry,
  } from './renderer-definitions.js';
  ```
- **严重程度**: P1
- **现状**: word/report/spreadsheet 都提供 `define*PageSchema`，Flow Designer 没有对应 helper。
- **风险**: 通用 scaffolding 与迁移脚本需要对 Flow 额外分支。
- **建议**: 增加 `defineDesignerPageSchema`，或在 host-page 文档明确说明例外。
- **为什么值得现在做**: 这是易修复且直接影响跨包一致性的入口面问题。
- **误报排除**: 不是说每个 renderer package 都需要 builder；这里只比较同一 host-page 家族。
- **历史模式对应**: host-page entry helper inconsistency。
- **参考文档**: `docs/architecture/flux-design-principles.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度18-01]：保留 (P1)。common host-page props 缺失成立。
- [维度18-02]：降级为 P2。`$designer` 属 additive asymmetry，不是根本性模式违约。
- [维度18-03]：保留 (P1)。Flow 缺少 peer-style `define*PageSchema` helper。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                   | 一句话摘要                                               |
| ----- | -------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| 18-01 | P1       | `packages/flow-designer-renderers/src/schemas.ts:4-13`                 | Flow Designer page input 缺少同族 host-page 的通用 props |
| 18-03 | P1       | `packages/flow-designer-renderers/src/index.tsx:11-16`                 | Flow Designer 缺少 peer-style `define*PageSchema` helper |
| 18-02 | P2       | `packages/flow-designer-renderers/src/renderer-definitions.ts:192-223` | Flow Designer 额外暴露 `$designer` additive export       |
