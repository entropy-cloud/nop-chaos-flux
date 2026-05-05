# 维度 07：生命周期与副作用归属

## 初审

- 初审保留 1 条：declarative surface 相关副作用仍在 React renderer 层。

## 维度复核

- 该条被降级为已知收敛债，不作为当前主 remediation driver。

## 最终结论

### [维度07] declarative surface 生命周期双轨仍未完全收口

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:35-87`, `packages/flux-runtime/src/surface-runtime.ts:32-62`
- **证据片段**:
  ```ts
  React.useEffect(() => { registerDeclarativeSurface(props.id); ... }, [effectiveOpen, props.id]);
  React.useEffect(() => { publishOwnerStatus(ownerScope, statusPath, summary); }, [ownerScope, statusPath, summary]);
  ```
- **严重程度**: P3
- **现状**: declarative dialog/drawer 的 open/status/stack 副作用仍主要在 renderer hook 里处理。
- **风险**: 与 managed surface 的 owner 语义继续双轨。
- **建议**: 继续按 `SurfaceRuntime` 收敛，但当前更像已知实现债。
- **参考文档**: `docs/architecture/surface-owner.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: `已降级`
