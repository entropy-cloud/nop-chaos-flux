# 维度 15：安全与性能红线

- 初审发现：3
- 维度复核：完成
- 子项复核：2 组（`cloneDocument()`、`useCurrentFormState`）

## 降级

1. [已降级] `packages/report-designer-core/src/runtime/metadata.ts` 的 `cloneDocument()` 使用 `JSON.parse(JSON.stringify(...))`，并出现在编辑/历史交互主路径中；当前尚未证明是帧级热路径，但已是明确性能债务。

2. [已降级] `useCurrentFormState` 的广播订阅问题更准确地说是广义性能债务；其中 `useFieldPresentation()` 这条链路因读取字段状态面，最接近/触到当前 P7 约束边界。

3. [已降级] `structural-loop` 仍是全量 `map` 渲染，大集合下会慢，但当前更像组件边界/使用约束问题，而非已证实的红线违规。

## 复核摘要

- 保留：0
- 降级：3
- 驳回：0

## 备注

- 第一方源码中未发现 active `eval(` / `new Function(` 使用。
