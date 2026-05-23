# 维度 03：API 表面积与契约一致性

## 初审

- 初审发现 2 条：1 条保留，1 条降级。

## 维度复核

- 保留：report designer host projection 在 manifest/runtime/doc 三处漂移。
- 降级：`createHostData` 根出口暴露过宽。

## 最终结论

### [维度03] report designer host projection 三处漂移

- **文件**: `packages/report-designer-renderers/src/report-designer-manifest.ts:133-148`, `packages/report-designer-renderers/src/host-data.ts:153-190`, `docs/components/report-designer-page/design.md:85-103`
- **证据片段**:
  ```ts
  fieldSources: { schema: fieldSourcesShape },
  preview: { schema: previewShape },
  ```
  ```ts
  return {
    inspectorBody: snapshot.inspector.resolvedSchema,
    fieldCount,
    inspector: snapshot.inspector,
  };
  ```
- **严重程度**: P1
- **现状**: manifest、runtime host scope、组件文档对顶层字段和 alias 的描述不一致。
- **风险**: 自定义 field panel / inspector / tooling 会按错误 vocabulary 接线。
- **建议**: 统一 manifest、runtime 和 owner doc 的 host projection vocabulary，并补合同测试。
- **参考文档**: `docs/components/report-designer-page/design.md`, `docs/architecture/report-designer/design.md`
- **复核状态**: `维度复核通过`

### [维度03] `createHostData` root export 过宽

- **文件**: `packages/report-designer-renderers/src/index.ts:39-44`
- **证据片段**:
  ```ts
  export { createHostData, buildReportDesignerScopeData } from './host-data.js';
  ```
- **严重程度**: P3
- **现状**: `createHostData` 被稳定 root barrel 导出，但未见 live owner doc 或活跃源码消费。
- **风险**: 扩大 public surface，增加后续 host-data 收口成本。
- **建议**: 若无真实外部依赖，移出 root barrel。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: `已降级`
