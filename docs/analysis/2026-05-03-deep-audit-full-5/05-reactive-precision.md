# 05 响应式订阅精度

- 初审发现数: 1
- 维度复核: 完成
- 子项复核: 0
- 最终结果: 保留 0 / 降级 1 / 驳回 0

## 已降级

- `packages/flux-react/src/dialog-host.tsx` / `dialog-host-surface.tsx` 对 `surface.scope` 做无路径过滤的 host 级订阅: **已降级**
  - 复核确认这里确实存在过宽订阅：`useSurfaceScopeSnapshot(props.surface.scope)` 未传 `paths`，会读取整份 `scope.readVisible()`。
  - 但初审关于“表单 dialog 内每次输入都会导致整个 host 重渲染”的表述证据不足，因为 `form` 渲染器会切到 `ownedForm.scope`，不等价于任意表单输入都命中 `surface.scope`。
  - 结论更准确地应是：**Dialog/Drawer host 存在可疑的广播级 scope 订阅，值得收窄或直接移除，但影响面需要实测确认。**
