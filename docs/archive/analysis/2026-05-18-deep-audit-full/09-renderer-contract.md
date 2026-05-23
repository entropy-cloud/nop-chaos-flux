# 维度 09：渲染器契约合规性

## 第 1 轮（初审）

### [维度09-01] `detail-view` 通过 `FormRuntime.store` 直读父表单值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:229-245`
- **证据片段**:

  ```ts
  function readCurrentValueAtPath(path: string): unknown {
    if (parentForm?.store) {
      return getIn(parentForm.store.getState().values, path);
    }

    if (scopePath) {
      if (path === scopePath) {
        return currentValue;
      }
  ```

- **严重程度**: P2
- **契约条款**: `AGENTS.md` 要求 renderer 中禁止直接访问 store，`docs/architecture/renderer-runtime.md` 规定 ambient runtime 或 state 应通过标准 hooks 或公开 runtime surface 获取。
- **现状**: 导出的 live renderer `DetailViewRenderer` 在提交与回滚路径里直接读取 `parentForm.store.getState().values`。
- **建议**: 改为走公开 surface，优先用 `parentForm.scope.get(path)`；如果这里必须拿最新值，可用由 `useCurrentFormState` 或 `useScopeSelector` 驱动的 ref，而不是直接摸 `store`。
- **为什么值得现在做**: 这是明确的 renderer contract 漂移，会把组件绑定到表单 store 内部实现，后续表单状态层重构时最容易漏掉这类私接点。
- **误报排除**: 不是测试代码，不是 helper-only 纯工具模块，而是导出的实际 renderer；也不属于已通过工具覆盖的 marker 或 FieldFrame 区域。
- **历史模式对应**: 不属于校准文档中可降级的本地 UI 状态或样式噪声，而是 live renderer 越过公开边界直接碰 store 的 owner 漂移。
- **参考文档**: `AGENTS.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度09-02] `detail-field` 通过 `FormRuntime.store` 直读父表单值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:144-153`
- **证据片段**:

  ```ts
  function readCurrentParentValue(): unknown {
    if (parentForm?.store) {
      return (parentForm.store.getState().values as Record<string, unknown>)[name];
    }

    if (typeof parentScope?.get === 'function') {
      return parentScope.get(name);
  ```

- **严重程度**: P2
- **契约条款**: `AGENTS.md` 要求 renderer 不应直接访问 store，`docs/architecture/renderer-runtime.md` 规定 runtime/state 读取应走标准 hooks 或公开 runtime boundary。
- **现状**: `DetailFieldRenderer` 在写回前保存旧值时，直接从 `parentForm.store.getState()` 读取。
- **建议**: 用 `parentForm.scope.get(name)` 替代，或把当前值通过 hook 订阅后缓存到 ref，再在异步确认或回滚路径里读取 ref。
- **为什么值得现在做**: 这是同一契约漂移在另一条 detail 编辑链路上的重复出现，说明该模式已有扩散迹象。
- **误报排除**: 不是为测试暴露的调试读法，而是实际提交与回滚逻辑的一部分；当前基线也不接受把这种私接 store 视为过渡实现。
- **历史模式对应**: 不属于已记录的可接受双态折中或 host 特例，而是 renderer 越过 owner boundary 触碰底层存储的重复模式。
- **参考文档**: `AGENTS.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度09-03] `detail-field` 控件根节点丢失 `meta.className`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:307-333`
- **证据片段**:
  ```tsx
  return (
    <>
      <div className={cn('nop-detail-field')} data-slot="field-control">
        <div data-slot="detail-field-viewer">
          {viewerContent ?? (
            <span>
              {fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '—'}
            </span>
  ```
- **严重程度**: P2
- **契约条款**: `docs/architecture/renderer-runtime.md` 要求 field-like widget renderer 的 `props.meta.className` 落到可被消费方实际定位的 canonical control root；`docs/architecture/styling-system.md` 与 `docs/architecture/renderer-markers-and-selectors.md` 要求 renderer root 保留稳定语义 marker 并暴露可定位的根节点覆写面。
- **现状**: `DetailFieldRenderer` 的实际控件根是 `.nop-detail-field`，但没有承接 `props.meta.className`；同包同类 renderer 如 `detail-view`、`object-field`、`array-field` 则在根节点转发这类样式入口。`testid` 与 `cid` 当前由外层 `FieldFrame` 提供节点级 anchor 与 inspect bridge，不构成独立缺陷。
- **建议**: 至少改为 `className={cn('nop-detail-field', props.meta.className)}`，保证样式覆写落在同一个 canonical control root 上。
- **为什么值得现在做**: 当前会直接削弱宿主样式覆写与稳定根节点样式契约；这不是抽象层面的风格建议，而是 live root contract 漏接。
- **误报排除**: 外层 `FieldFrame` 不能替代这里的 `className` 责任；文档要求的是 widget 自身的 canonical control root 不能吞掉 `meta.className`。但 `testid/cid` 作为节点级 observability 与 inspect bridge 留在 `FieldFrame` 是符合当前基线的，因此本条已按该口径收窄。
- **历史模式对应**: 不属于合法本地样式或状态噪声，而是 canonical renderer root 漏接 `meta.className` 的契约缺口。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/styling-system.md`; `docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: 未复核

## 合规摘要

- 本轮确认 3 条真实 renderer contract drift，集中在 `detail-view` 与 `detail-field` 这一组 detail 编辑 renderer。
- `pnpm check:audit-missing-renderer-markers` 与 `pnpm check:audit-fieldframe-bypasses` 均通过，未被机械重复报送。

## 更正说明

- 重新核对 `docs/architecture/renderer-runtime.md`、`docs/architecture/template-instantiation-and-node-identity.md`、`docs/architecture/debugger-runtime.md` 与 `packages/flux-react/src/field-frame.tsx` 后，确认 `testid` 与 `cid` 的默认 owner 语义是节点级 root observability 与 inspect bridge。
- 对 `wrap: true` 字段，这个 mounted node root 通常就是 `FieldFrame`；因此它们只出现在 `FieldFrame` 上本身不是缺陷。
- 本维度后续复核应继续关注 canonical control root 的 `className` 契约、renderer 越过 store 边界、以及真正丢失节点级 identity 的场景，而不是机械要求把 `testid/cid` 复制到原始控件根。

## 维度复核结论

- [维度09-01]: 降级。`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` 仍直接读 `parentForm.store.getState().values`，但发生在 confirm 或 rollback 的命令式旧值快照路径，不是 render-phase reactive read；同时 `FormRuntime.store` 也是公开 surface，更像低优先级 renderer contract 清理。
- [维度09-02]: 降级。`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` 同样存在 direct store read，但仅用于写回前捕获旧值，属命令式边界漂移，当前证据不足以按原强度保留。
- [维度09-03]: 保留 (P2)。`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` 的 `.nop-detail-field` 未承接 `props.meta.className`；按当前基线，`wrap: true` 时 `testid/cid` 留在 `FieldFrame` 正常，但 `className` 仍应落到 canonical control root。

## 子项复核结论

- [维度09-01]: 降级。`FormRuntime.store` 虽是公开 surface，但当前基线仍要求 renderer 不直接摸 store；该处发生在 confirm 或 rollback 的命令式快照路径，低于 render-phase reactive read 的严重度，但仍属可报告的 contract drift。
- [维度09-02]: 降级。结论同上；`detail-field` 在非 render 写回或回滚路径里直读 `parentForm.store.getState()` 不是当前推荐或允许的 renderer 读法，仍应视为低优先级契约漂移。
- rule clarification: 公开 `FormRuntime.store` 不等于 renderer 可直接读取它，renderer 即使在非 render 的命令式 confirm 或 rollback 路径也应优先走 hooks、`scope` 或其他 owner/runtime 公开高层 API。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                                                      |
| ----- | -------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 09-01 | P3       | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:229-245`  | `detail-view` 在命令式确认或回滚路径里直读 `FormRuntime.store`  |
| 09-02 | P3       | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:144-153` | `detail-field` 在命令式写回或回滚路径里直读 `FormRuntime.store` |
| 09-03 | P2       | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:307-333` | `detail-field` canonical control root 未承接 `meta.className`   |
