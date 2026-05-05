# 维度 15：安全与性能红线

## 初审

- 安全部分零发现。
- 性能部分提出 source-registry / reaction observability、report field panel 虚拟化等问题。

## 维度复核

- 安全零发现成立。
- 降级：source-registry 自身 console-only observability 缺口。
- 保留：reaction-runtime 仅全局级联超限路径仍是 console-only。
- 降级：report field panel 未虚拟化。

## 最终结论

### [维度15] 安全部分零发现成立

- **文件**: `packages/**/src`, `apps/**/src`
- **证据片段**:
  ```txt
  active source scan: no eval( / new Function( / with(...)
  ```
- **严重程度**: P3
- **现状**: 活跃一方源码未发现动态代码执行红线实现。
- **风险**: 无当前问题。
- **建议**: 维持现有红线与自动化扫描。
- **参考文档**: `docs/architecture/security-design-requirements.md`
- **复核状态**: `维度复核通过`

### [维度15] reaction-runtime 仅全局级联超限路径仍是 console-only

- **文件**: `packages/flux-runtime/src/async-data/reaction-runtime.ts:129-140`
- **证据片段**:
  ```ts
  console.error('[flux-runtime] Global reaction cascade depth limit exceeded');
  dispose();
  ```
- **严重程度**: P2
- **现状**: 全局 reaction cascade 超限时没有接入统一 monitor/host issue reporting。
- **风险**: reaction 被熔断停用后，对宿主与诊断系统不可观测。
- **建议**: 在 dispose 前通过 `reportRuntimeHostIssue(...)` 或 `monitor.onError(...)` 上报结构化错误。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `子项复核通过`

### [维度15] source-registry 的 console-only observability 仍有局部缺口

- **文件**: `packages/flux-runtime/src/async-data/source-registry.ts:197-206`
- **证据片段**:
  ```ts
  console.error('[flux-runtime] Source cascade depth limit exceeded');
  controller.refresh().catch((error) => {
    console.warn('[source-registry] refresh failed', error);
  });
  ```
- **严重程度**: P3
- **现状**: `source-registry` 自己的兜底捕获路径仍是 console-only，但 API source controller 主失败链已接入统一监控。
- **风险**: 局部退化仍缺可观测性，不过范围小于初审表述。
- **建议**: 补 monitor/reporting，作为 observability 完整性收尾项。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `已降级`

### [维度15] report field panel 未虚拟化

- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.tsx:52-61`
- **证据片段**:
  ```tsx
  {fieldSources.map((source) => (
    ...
    {group.fields.map((field) => (
  ```
- **严重程度**: P3
- **现状**: 字段面板按 `map -> map -> map` 全量展开，未见虚拟化或阈值化 lazy path。
- **风险**: 字段源极大时可能线性放大 DOM 成本，但尚缺 profiling 证据。
- **建议**: 结合真实模板规模决定是否引入虚拟化。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `已降级`
