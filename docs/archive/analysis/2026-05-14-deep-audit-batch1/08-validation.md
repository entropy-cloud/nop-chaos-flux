# 维度 08：验证系统一致性

## 第 1 轮（初审）

### [维度08-01] `validateSubtree/validateAll` 的 commit 高优先级路径没有在入口级抢占整组目标

- **文件**: `docs/architecture/form-validation.md:205-210`, `packages/flux-runtime/src/form-runtime-owner.ts:497-557`, `packages/flux-runtime/src/form-runtime-submit-flow.ts:220-225`
- **证据片段**:
  ```md
  for `validateSubtree(path, 'submit' | 'commit')`, the supersession set is the validated subtree ...
  ```
  ```ts
  const targetPaths = collectSubtreeValidationTargets(input.sharedState, path);
  for (const targetPath of targetPaths) {
    const result = await validatePath(input.sharedState, targetPath, reason);
  }
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 执行 / 异步仲裁 / 提交前校验
- **现状**: 只有 submit 包装流显式 `supersedeLowerPriorityWork()`，直接调用 `validateSubtree(..., 'commit')` / `validateAll('commit')` 时没有入口级整组 supersession
- **风险**: 旧的低优先级 async validation 结果仍可能先发布，污染 commit 时刻的 valid/ready/canSubmit 视图
- **建议**: 在 `validateSubtree/validateAll('submit'|'commit')` 入口先计算目标集并统一 supersede/abort 低优先级运行
- **误报排除**: 该规则已在当前 owner doc 中明确，不是未来设计草案
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度08-02] hidden -> visible 转换后未触发 owner-managed `system` 重校验

- **文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:384-394`, `packages/flux-react/src/node-renderer-resolved.tsx:317-327`
- **证据片段**:
  ```ts
  if (hidden) {
    ...
  } else {
    sharedState.hiddenFields.delete(path);
  }
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 参与 / 激活 / 结果展示
- **现状**: 从 hidden 重新 visible 时，只移除 hidden 标记，没有后续 `system` 级重校验
- **风险**: 重新激活的 required/aggregate 子树会暂时沿用隐藏时的“干净”状态，owner valid/ready/canSubmit 可能短时失真
- **建议**: 在 hidden->visible 时补齐 owner-managed `system` revalidate
- **误报排除**: 这不是 UI 细节，直接影响 owner 级 validation summary
- **复核状态**: 未复核

### [维度08-03] 无 root validation plan 的 page/surface owner 仍被直接发布为 `active/ready`

- **文件**: `docs/architecture/form-validation.md:182-199,301-302`, `packages/flux-runtime/src/runtime-owned-factories.ts:117-123`, `packages/flux-runtime/src/surface-runtime.ts:122-131`
- **证据片段**:
  ```ts
  initialLifecycleState: 'active';
  ```
- **严重程度**: P1
- **验证生命周期阶段**: owner lifecycle / bootstrapping
- **现状**: page/surface validation owner 在没有 compiled root validation plan 时仍以 `active` 创建
- **风险**: 外部会把“无 compiledModel 的 owner”误判为已激活已就绪，与文档基线冲突
- **建议**: 无 root plan 时应先以 `bootstrapping` 发布，待 attach compiled model 后再切 `active`
- **误报排除**: 文档已明确 `compiledModel === null` 不能等价为 clean/ready 模式
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度08-04] 数组索引变更期间的异步校验会把 validating 永久卡住

- **文件**: `packages/flux-runtime/src/form-runtime-array.ts:19-72`, `packages/flux-runtime/src/form-path-state.ts:95-128`, `packages/flux-runtime/src/form-runtime-validation.ts:440-450`
- **证据片段**:
  ```ts
  remapValidationRuns(...)
  remapPendingValidationDebounces(...)
  // no validationAbortControllers remap
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 异步验证 / 结构重映射 / owner summary
- **现状**: 数组 remove/move/swap/replace 时会重映射 fieldStates 和 run bookkeeping，但未同步处理 validation abort controllers
- **风险**: 旧路径上的异步校验完成后无法清掉新路径上的 `validating`，owner 可长期停在 `validating=true` / `ready=false`
- **建议**: 数组路径重映射时同步迁移或失效化 validation abort controller / validating cleanup 逻辑
- **误报排除**: 这是 owner summary 级缺陷，不只是单字段展示错乱
- **复核状态**: 未复核

## 维度复核结论

- [维度08-01]: 降级为 P2。问题主要剩在 detail/object 等直接调用 `validateSubtree/validateAll('commit')` 的路径。
- [维度08-02]: 保留为 P1。hidden->visible 不触发 system revalidation 与当前文档基线直接冲突。
- [维度08-03]: 保留为 P1。无 compiled model 的 owner 仍被发布为 `active/ready`，违背 owner lifecycle 基线。
- [维度08-04]: 保留为 P1。数组结构变化时 validating 可永久卡住，是明确 owner summary 一致性缺陷。

## 子项复核结论

- [维度08-01]: 降级 (P2)。

## 最终保留项

| 编号  | 严重程度 | 文件                                                           | 一句话摘要                                                      |
| ----- | -------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| 08-01 | P2       | `packages/flux-runtime/src/form-runtime-owner.ts:497-557`      | direct commit validateSubtree/validateAll 缺入口级 supersession |
| 08-02 | P1       | `packages/flux-runtime/src/form-runtime-field-ops.ts:384-394`  | hidden->visible 转换后未触发 owner-managed system revalidation  |
| 08-03 | P1       | `packages/flux-runtime/src/runtime-owned-factories.ts:117-123` | 无 root validation plan 的 owner 仍直接发布为 active/ready      |
| 08-04 | P1       | `packages/flux-runtime/src/form-runtime-array.ts:19-72`        | 数组索引变更期间 validating 可能永久卡住                        |
