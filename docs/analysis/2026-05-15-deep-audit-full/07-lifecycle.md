# 维度 07：生命周期与副作用归属

## 第 1 轮（初审）

### [维度07-01] `useNodeSourceProps` 在 scope 切换时不会重跑 source observer，source 生命周期继续绑定旧 scope

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\use-node-source-props.ts:48-77`
- **证据片段**:

  ```ts
  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  useEffect(() => {
    if (!hasSourceProps) return;
    controller.run(propsValueRef.current, scopeRef.current);
  }, [controller, hasSourceProps, sourceInputsKey]);
  ```

- **严重程度**: P1
- **现状**: `scope` 只被写入 ref，真正触发 `controller.run(...)` 的 effect 不依赖 `scope`，导致 scope 替换时不会重绑 source observer。
- **风险**: row、fragment、surface、owner scope 替换但 source 配置未变时，旧请求不会因 scope 切换而 abort，新的 scope 也不会立刻发起对应执行，source 仍可能读取或请求旧 scope。
- **建议**: 把 `scope` 纳入 source observer 的生命周期依赖，或让 runtime 级 owner 在 scope 切换时显式重绑和 dispose。
- **为什么值得现在做**: 这是 source-enabled props 主路径的生命周期归属错误，不修会造成真实 stale execution。
- **误报排除**: 这不是单纯优化建议；与 `use-source-value.ts` 已将 `scope` 放进 effect 依赖形成对照，证明这里是残留不一致。
- **历史模式对应**: 对应 data-source lifecycle 与当前 lexical scope 解绑的真实 residual。
- **参考文档**: `docs/architecture/renderer-runtime.md`、`docs/architecture/api-data-source.md`
- **复核状态**: 未复核

### [维度07-02] `useSurfaceRenderer` 把 `defaultOpen` 当成持续同步输入回写 `SurfaceStore`，重初始化 uncontrolled surface 生命周期

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\use-surface-renderer.ts:91-101`
- **证据片段**:
  ```ts
  useEffect(() => {
    if (!surfaceRuntime) return;
    surfaceRuntime.store.setUncontrolledOpen(id, defaultOpen);
  }, [controlledOpen, defaultOpen, id, surfaceRuntime]);
  ```
- **严重程度**: P1
- **现状**: `defaultOpen` 应是初始化默认值，但 effect 会在依赖变化时持续把它回写进 store。
- **风险**: 父级表达式或依赖让 `defaultOpen` 重新求值变化时，会再次把 uncontrolled open state 写回 store，把已进入 runtime-owner 的 surface open 轴重新交给 React effect 播种。
- **建议**: 仅在 mount 或 surface 首次注册时消费 `defaultOpen`，后续 uncontrolled open 只由 `SurfaceRuntime/SurfaceStore` 拥有。
- **为什么值得现在做**: 这是 surface open 生命周期错误，直接影响 dialog/drawer/sheet 的可预期行为。
- **误报排除**: 这不是已裁定的旧 `localOpen` 双状态问题；当前 live code 已改成 store owner，这里是新的 effect 重初始化残余。
- **历史模式对应**: 对应 surface lifecycle 残余缺陷，但区别于已修复的 pseudo-controlled 双状态。
- **参考文档**: `docs/architecture/surface-owner.md`、`docs/components/index.md`
- **复核状态**: 未复核

## 检查范围

- `packages/flux-react/src/*`
- `packages/flux-renderers-data/src/*`
- `packages/flux-renderers-basic/src/*`
- `packages/flow-designer-renderers/src/*`
- `packages/report-designer-renderers/src/*`
- `packages/spreadsheet-renderers/src/*`
- `packages/word-editor-renderers/src/*`
- `packages/flux-runtime/src/async-data/*`

### 初审排除项

- `packages/flux-renderers-data/src/data-source-renderer.tsx`
- `packages/flux-renderers-basic/src/reaction.tsx`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/render-nodes.tsx`
- `packages/flow-designer-renderers/src/designer-page-inner.tsx`
- `packages/flow-designer-renderers/src/designer-page-body.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`
- 本轮未见比上面两条更高价值的 owner 归属错误、cleanup 泄漏或依赖生命周期错误。

## 维度复核结论

- [维度07-01]：保留 (P1)。scope 切换只写 ref、不重绑 source observer。
- [维度07-02]：保留后经子项复核降级为 P2。仅 `defaultOpen` mount 后再次变化时会再次播种 uncontrolled 状态。

## 子项复核结论

- [维度07-01]：成立。source owner 生命周期与当前 lexical scope 切换未对齐。
- [维度07-02]：降级。问题存在但范围收窄，不是持续重初始化。

## 最终保留项

| 编号  | 严重程度 | 文件                                               | 一句话摘要                         |
| ----- | -------- | -------------------------------------------------- | ---------------------------------- |
| 07-01 | P1       | `packages/flux-react/src/use-node-source-props.ts` | scope 切换不会重绑 source observer |
