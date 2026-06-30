# 维度 08：验证系统一致性

## 第 1 轮（初审）

### [维度08-01] 数组结构变更运行时 API 跳过聚合根自身规则重验证

- **文件**: `packages/flux-runtime/src/form-runtime-array.ts:245-264` + `packages/flux-runtime/src/form-runtime-owner.ts:143-146`
- **证据片段**:
  ```ts
  // form-runtime-array.ts executeArrayMutation 尾部仅：
  ctx.revalidateDependents(ctx.arrayPath, 'change')
  // form-runtime-owner.ts:144-146
  for (const dependentPath of dependentPaths) {
    if (dependentPath === path) { continue; }   // 跳过 arrayPath 自身
  ```
- **严重程度**: P2
- **现状**: 所有数组变更操作仅调用 `revalidateDependents(arrayPath,'change')`，该函数显式跳过 `path===arrayPath`。数组根聚合规则（uniqueBy 等）不自验证。当前 renderer（combo-renderer:373、array-editor:339）补偿性调用 validateField/validateSubtree。
- **风险**: 绕过 renderer 直接调运行时 API（action/host）且不后续 validateField 的场景，聚合规则不被重验证；陈旧错误持续显示或新违规不出现。
- **建议**: executeArrayMutation 后对 arrayPath 本身触发 validateField(arrayPath,'system')；或文档明确"数组变更 API 不自验证聚合根"约定并确保调用者遵守。
- **误报排除**: 非 pattern #9（FieldFrame 收敛压力）；非 pattern #5（中间态误判）。
- **复核状态**: 维度复核通过（保留 P2，borderline P2/P3 → AUDIT-07）。

### [维度08-02] validateForm / validateSubtree transitional 生命周期 gate 不一致

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:378-400`（validateForm）+ `608-625`（validateSubtree）
- **证据片段**:
  ```ts
  let currentValidation = input.getCurrentValidation();
  if (!currentValidation) {              // 仅当 model falsy 时才等待
    const lifecycleActive = await waitForActiveLifecycle(input.sharedState);
    ...
  }
  ```
- **严重程度**: P3
- **现状**: 仅在 `!currentValidation` 时调 `waitForActiveLifecycle`；对比 validatePath 用 `isLifecycleTransitional` 无论 model 是否存在都检查。内部 validatePath 兜底正确行为。
- **风险**: 低；未来重构若 validateForm 不再逐路径调 validatePath 可能暴露缺口。
- **建议**: supersession 后、model 检查前加 isLifecycleTransitional 检查。
- **复核状态**: 维度复核通过（保留 P3 → AUDIT-14）。

### [维度08-03] revalidateDependents 重验证前清除 dependent validating 标志（闪烁）

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:158-190`
- **证据片段**:
  ```ts
  delete nextFieldState.validating;             // 清除
  if (isDirty) { nextFieldState.dirty = true; }
  input.sharedState.store.batchUpdate({ fieldStates: nextFieldStates });  // 通知订阅者
  ...
  await input.getThisForm().validateField(dependentPath, reason);         // 随后才重设 validating
  ```
- **严重程度**: P3
- **现状**: batchUpdate 通知与 validateCompiledField 重设 validating 间存在微任务窗口，async dependent 可能 validating true→false→true 闪烁。
- **风险**: 低；高频 change 联动下 scopeState.validating 缓存可能瞬时翻转。
- **建议**: validating 生命周期统一由 validateField 内部管理，不在 revalidateDependents 预清。
- **复核状态**: 维度复核通过（保留 P3 → AUDIT-15）。

### [维度08-04] validateCompiledField 外部 signal abort 时仍提交部分同步规则结果

- **严重程度**: 驳回
- **复核理由**: 代码 `form-runtime-validation.ts:426-428` 早期同步 commit 由 `!hasAsyncRules` gate 且在 run-mismatch early-return（410-422）之后——那是已完整求值的同步规则，非"部分"。hasAsyncRules 字段 commit 仅在 finally（480）且条件 `validationRuns===runId && modelGeneration===capturedGeneration`；supersede/abort 触发 early-return 且 finalErrors=[]。无 partial-publish 路径。

## 维度复核结论

- [08-01]: 保留 P2 → AUDIT-07。
- [08-02]: 保留 P3 → AUDIT-14。
- [08-03]: 保留 P3 → AUDIT-15。
- [08-04]: 驳回（partial-publish 主张与 `!hasAsyncRules` gate + run-mismatch early-return 矛盾）。

## 最终保留项

| 编号  | 严重程度 | 文件                                                             | 摘要                                        |
| ----- | -------- | ---------------------------------------------------------------- | ------------------------------------------- |
| 08-01 | P2       | `form-runtime-array.ts:245-264`, `form-runtime-owner.ts:143-146` | 数组变更跳过聚合根自验证                    |
| 08-02 | P3       | `form-runtime-owner.ts:378-400,608-625`                          | validateForm/Subtree 生命周期 gate 不一致   |
| 08-03 | P3       | `form-runtime-owner.ts:158-190`                                  | revalidateDependents 预清 validating 致闪烁 |
