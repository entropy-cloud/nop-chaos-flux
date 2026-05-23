# 08 Validation

- 深挖轮次: 3
- 深挖发现数: 6
- 维度复核: 5 保留 / 1 降级 / 0 驳回
- 子项复核: 已完成 2 项高风险条目复核

## 第 1 轮初审

- 隐藏父路径不会失效子路径中的 in-flight async validation

## 深挖第 2 轮追加

- 数组结构变更不重映射 `hiddenFields`
- `validateSubtree()` 在无 compiled model 时直接成功，漏掉 runtime-only subtree validation

## 深挖第 3 轮追加

- `applyChangesAndRevalidate('change')` 不处理 changed path 自身校验状态
- `validateSubtree(path)` 会把祖先 runtime registration 纳入目标
- 数组结构变更不重映射 `validationAbortControllers`

## 维度复核结论

保留:

- 隐藏父路径对已在飞行中的子路径 async run 失效不完整
- 数组结构变更不重映射 `hiddenFields`
- `validateSubtree()` 无 compiled model 时直接成功
- `applyChangesAndRevalidate('change')` 不处理 changed path 自身
- `validateSubtree(path)` 误纳入祖先 runtime registration

降级:

- 数组结构变更不重映射 `validationAbortControllers`

## 子项复核结论

降级:

- “隐藏父路径不会失效子路径 async validation” 从广义 P1 降为“只剩 in-flight async run 残留”

成立:

- 数组结构变更不重映射 `hiddenFields`

## 最终保留项

### [维度08] 数组结构变更仍不重映射 `hiddenFields`，导致隐藏参与状态漂移

- **文件**: `packages/flux-runtime/src/form-runtime-array.ts`, `packages/flux-runtime/src/form-runtime-field-ops.ts`
- **严重程度**: P1
- **现状**: remove/move/swap/replace 会 remap 多种校验状态，但不 remap `hiddenFields`
- **风险**: 隐藏参与状态会挂到错误索引，导致新旧行校验参与语义错位
- **建议**: 对数组结构写入复用同一 `indexTransform` 重映射 `hiddenFields`
- **复核状态**: 子项复核通过

### [维度08] `validateSubtree` / change revalidate / runtime registration 三条校验路径仍不完全一致

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-subtree.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`
- **严重程度**: P2
- **现状**: subtree 无 compiled model 早退、祖先 registration 误纳入目标、change 路径不处理 changed path 自身
- **风险**: subtree validation 与普通 field/form validation 的 live 语义不一致
- **建议**: 统一 subtree target 计算与 changed-path revalidation 规则
- **复核状态**: 维度复核通过
