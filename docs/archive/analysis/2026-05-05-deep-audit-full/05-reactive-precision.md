# 维度 05：响应式订阅精度

## 初审

- 初审保留 2 条。

## 维度复核

- 两条均保留。
- 修正了 `dialog-host` 条目的表述：问题是 host 壳过宽订阅，不是“任意表单输入必然重渲染 host”。

## 最终结论

### [维度05] source-prop 控制器会因 `propsValue` 身份变化重复执行 source

- **文件**: `packages/flux-react/src/use-node-source-props.ts:34-48`, `packages/flux-react/src/node-source-prop-controller.ts:94-154`
- **证据片段**:
  ```ts
  const sourceInputs = useMemo(
    () => sourcePropKeys.map((key) => propsValue[key]),
    [propsValue, sourcePropKeys],
  );
  useEffect(() => {
    controller.run(propsValueRef.current, scopeRef.current);
  }, [controller, hasSourceProps, sourceInputs]);
  ```
- **严重程度**: P1
- **现状**: 只要 `propsValue` 换引用，就可能重新执行 source，即使 source 输入未变。
- **风险**: 重复请求、loading 闪烁、无意义 abort/restart。
- **建议**: 基于 `sameInputs(...)` 做早退，或把 effect 依赖收窄到稳定 source 输入 key。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `维度复核通过`

### [维度05] `dialog-host` 订阅整份 visible surface scope，但 host 壳本身不直接消费字段

- **文件**: `packages/flux-react/src/dialog-host.tsx:71,146`, `packages/flux-react/src/dialog-host-surface.tsx:50-72`
- **证据片段**:
  ```ts
  useSurfaceScopeSnapshot(props.surface.scope);
  if (!paths || paths.length === 0) {
    return state;
  }
  ```
- **严重程度**: P2
- **现状**: `DialogView` / `DrawerView` 对整份 visible scope 建立 host 级订阅，但真实数据消费在子树内部完成。
- **风险**: 扩大外层 host 壳唤醒范围，放大 managed surface 重渲染成本。
- **建议**: 删除这层无字段消费的整 scope 订阅，或收窄到真实需要的路径。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: `子项复核通过`
