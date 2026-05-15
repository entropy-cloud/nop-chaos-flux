# 维度 09：渲染器契约合规性

## 第 1 轮（初审）

### [维度09-01] `variant-field` 在默认包裹路径下丢失 renderer 根 `className` 契约

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx`
- **证据片段**:

  ```tsx
  if (frameWrapMode === 'none') {
    return <div className={cn('nop-variant-field', props.meta.className)} ... />;
  }

  return (
    <FieldFrame ... frameClassName={props.meta.frameClassName}>
      <div className={cn('nop-variant-field')} data-slot="variant-field-body">
  ```

- **严重程度**: P1
- **现状**: `frameWrapMode === 'none'` 时根节点会接 `props.meta.className/testid/cid`，但常规包裹路径里，`FieldFrame` 只吃了 `props.meta.frameClassName`，内部真实控件根 `[data-slot="variant-field-body"]` 没接 `props.meta.className`。
- **风险**: schema `className` 在默认 wrapped 模式下被静默吞掉，导致样式挂载点和 renderer 根契约在两条渲染路径上表现不一致。
- **建议**: 让默认 wrapped 路径的 canonical control root 同样接入 `props.meta.className`，并保证 wrapped/unwrapped 两条路径的根契约一致。
- **为什么值得现在做**: 这是组件默认主路径上的契约丢失，不修会持续误导 schema 使用者和测试定位。
- **误报排除**: 这不是 calibration pattern #9 的“强推 FieldFrame”；问题不在是否包裹，而在 widget 自己的 canonical control root 丢了 `meta.className`。
- **历史模式对应**: 对应 field-like widget 在 wrapped/unwrapped 分支上 meta 传递不一致的契约残留。
- **参考文档**: `docs/architecture/renderer-runtime.md`、`docs/architecture/styling-system.md`
- **复核状态**: 未复核

### [维度09-02] `detail-field` 丢失 renderer 根的 `className`、`data-testid`、`data-cid`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx`
- **证据片段**:
  ```tsx
  return (
    <div className={cn('nop-detail-field')} data-slot="field-control">
      ...
    </div>
  );
  ```
- **严重程度**: P1
- **现状**: 根节点只写了固定 marker 和 `data-slot`，没有传 `props.meta.className`，也没有传 `props.meta.testid` 或 `props.meta.cid`。
- **风险**: `wrap: true` 下外层 `FieldFrame` 仍会有 frame 级属性，但 renderer 自己的控件根失去样式、测试、DOM bridge 契约，导致外层与控件根的约定失配。
- **建议**: 给 canonical control root 补齐 `props.meta.className`、`data-testid`、`data-cid`，与其他 field renderer 的 root contract 对齐。
- **为什么值得现在做**: 这是直接的 meta 传递缺失，影响样式、测试和宿主定位能力。
- **误报排除**: 这不是合理 widget 私有样式选择，而是明确的 meta/testid/cid 传递缺失。
- **历史模式对应**: 对应 field renderer root contract 传递遗漏的真实 defect。
- **参考文档**: `docs/architecture/renderer-runtime.md`、`docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

## 检查范围

- 入口和注册：`packages/flux-renderers-basic/src/index.tsx`、`basic-renderer-definitions.ts`、`packages/flux-renderers-form/src/index.tsx`、`definitions.ts`、`packages/flux-renderers-form-advanced/src/index.tsx`、`packages/flux-renderers-data/src/index.tsx`、`data-renderer-definitions.ts`
- 重点 renderer：basic `button/container/flex/page/tabs/loop/recurse`；form `form/input/fieldset`；form-advanced `condition-builder/object-field/array-field/variant-field/detail-view/detail-field/tree-controls`；data `crud/table/tree/chart`

### 初审排除项

- 本轮未确认需要报告的 direct store access 或 ad-hoc context 缺陷。
- 本轮已读热点 renderer 中，未见需要报告的 BEM 残留。
- `basic`、`form`、`data` 重点热点里，`regions.render()`、marker、`cn()`、事件 `void` 模式整体基本合规。

## 维度复核结论

- [维度09-01]：保留 (P1)。wrapped 路径的 canonical control root 仍丢失 `meta.className`。
- [维度09-02]：降级为 P2。inner root 未接 `meta.className` 成立，但 `data-testid` / `data-cid` 已由外层 `FieldFrame` 输出，原结论过重。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                        | 一句话摘要                                                  |
| ----- | -------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 09-01 | P1       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` | wrapped 路径的 canonical control root 丢失 `meta.className` |
