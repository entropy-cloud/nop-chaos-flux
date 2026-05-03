# 07 生命周期与副作用归属

- 初审发现数: 1
- 维度复核: 完成
- 子项复核: 2
- 最终结果: 保留 1 / 降级 1 / 驳回 0

## 保留

### [维度07] `use-surface-renderer.ts` 在 unmount cleanup 里写 closed summary，而不是 `undefined`

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:83-94`
- **证据片段**:
  ```ts
  return () => {
    publishOwnerStatus(scope, statusPath, {
      open: false,
      active: false,
    });
  };
  ```
- **严重程度**: P1
- **effect 职责**: `statusPath` 生命周期发布
- **应归属层级**: React 层，但应遵循共享 `statusPath` 清理语义
- **现状**: declarative surface renderer 在 unmount 时保留 closed summary，而不是清成 `undefined`。
- **建议**: 对齐 `packages/flux-react/src/status-path.ts` 的共享语义，unmount 统一写 `undefined`。
- **为什么值得现在做**: 这是当前 owner doc 已明确定义的 cleanup 语义，继续保留会让父 scope 残留已消失 surface 的状态摘要。
- **误报排除**: `surface-owner.md` 中“close 时写 closed summary”的规则当前限定在 `SurfaceRuntime` 管理路径；declarative `dialog` / `drawer` 仍属于 renderer 路径。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/surface-owner.md`
- **复核状态**: 子项复核通过

## 已降级

- `packages/flux-renderers-basic/src/status-hooks.ts` 在 summary 更新时 cleanup 先清空再重发: **已降级**
  - 复核确认现实现有 summary-only 变化时的多余清空，但 owner 文档把“unmount 必须清成 `undefined`”定义得更明确；该条更像待统一到共享 helper 的旧写法，而不是同级别强违约。
