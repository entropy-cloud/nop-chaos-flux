# 维度 03: API 表面积与契约一致性（component-audit mission 多维审计）

> Mission: component-audit | 初审轮次: R1（sub-agent `ses_02c815954ffersDTjv3XL3W1e3`）

## 第 1 轮（初审）

### [维度03-01] API 表面积过度暴露：3 个零外部消费者 root 导出

- **文件**: `packages/flux-renderers-data/src/index.tsx:14`；`packages/flux-react/src/index.tsx:105`；`packages/flux-renderers-content/src/index.ts:38`
- **严重程度**: P2
- **证据片段**:
  ```ts
  export { createCrudNormalizedSourceContext } from './crud-renderer-state.js';
  export { resolveGap, GAP_TOKENS } from './resolve-gap.js';
  export { ProgressRenderer, normalizeProgressValue, type NormalizedProgress } from './progress.js';
  ```
- **现状**: 3 个符号 root 公开但零外部消费者（全仓扫描）。
- **风险**: 公开即承诺；冻结为稳定面后收缩需 deprecation 流程。
- **建议**: 摘除或补 JSDoc + docs/references 条目；可归 CR 批量裁决。
- **误报排除**: 非未接线死代码——已公开，问题是公开而无消费者。

## 维度 03 其余核查结论（R1）

- RendererComponentProps 在 9 族 renderer 包 + graph 包用法一致（RendererComponentProps<GraphSchema>）。
- RendererDefinition 注册协议统一（registerXxxRenderers + xxxRendererDefinitions）；timeline-v2 为既有 timeline type 契约扩展，不新增注册类型。
- 未接线候选文件（status-hooks/interaction-owner/use-surface-renderer/structural-loop/test-support）均存在包内活消费者（calibration 6 放行）。
- root barrel 无 internal/helper 前缀泄露；exports map 与 index.ts 对齐。

## 维度复核结论

R2 复核完成（2026-08-06，plan `2026-08-06-0556-1` Phase 1），裁决见 `docs/audits/multi-audit-r2-verdicts.md`：03-01 与 01-03 同根，R2 属实——3 个 root 导出符号零外部消费者（rg 实证）；路由 fix-in-this-plan（方案 a：补 JSDoc + docs 条目，保持导出），已落地（JSDoc 于 `crud-renderer-state.ts:264`、`resolve-gap.ts:1`、`progress.tsx:21`）。
