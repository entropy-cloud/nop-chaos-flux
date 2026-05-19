# 维度 08: 验证系统一致性

## 第 1 轮（初审）

### [维度08-01] 编译器 `scopePolicy: 'form'` 分支遮蔽显式 `validation.ownerResolution`

- **文件**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts:474-487`
- **证据片段**:
  ```ts
  const validationOwnerPlan =
    renderer.scopePolicy === 'form'
      ? {
          boundary: 'create-owner' as const,
          childContractMode:
            renderer.validation?.childContractMode ??
            (schema.type === 'form' ? 'ignore' : 'summary-gate'),
        }
      : renderer.validation?.ownerResolution;
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 编译
- **现状**: `scopePolicy === 'form'` 时强制 create-owner，仅读取 `childContractMode`，忽略显式 `validation.ownerResolution`。
- **风险**: RendererDefinition 的 ownerResolution 声明可能被静默覆盖，后续 form-scope renderer 调整 owner 边界时文档/声明与编译结果分叉。
- **建议**: 收敛单一 owner 声明路径；对冲突声明发 diagnostic，或禁止 form scope renderer 再声明 ownerResolution。
- **为什么值得现在做**: 验证 owner 分区是编译入口，小范围修正能避免后续 renderer definition 误导。
- **误报排除**: 当前内置 renderer 多数恰好声明 create-owner，但公共契约仍被遮蔽。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 维度复核通过

### [维度08-02] `array-editor` 动态 `childPaths` 绕过 `updateFieldRegistration`

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:220-224`
- **证据片段**:
  ```ts
  React.useEffect(() => {
    if (registrationRef.current) {
      registrationRef.current.childPaths = childPaths;
    }
  }, [childPaths]);
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 注册
- **现状**: 子项增删后只改 registration ref 对象，未通过 `currentForm.updateFieldRegistration(...)` 更新 runtime `childPathToRegistrationId`。
- **风险**: 新 child path 可能无法立即参与 validation owner 索引，旧 child path 也可能残留到同步 validateSubtree 路径。
- **建议**: 保存 registration id，childPaths 变化时调用 `updateFieldRegistration(registrationId, { childPaths })`。
- **为什么值得现在做**: 数组字段新增/删除校验是用户可见路径，且同类问题可集中修复。
- **误报排除**: 不是 mutable descriptor 优化；runtime owner map 需要通过注册 API 更新。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 子项复核通过

### [维度08-03] `key-value` 动态 `childPaths` 同样绕过 `updateFieldRegistration`

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:277-281`
- **证据片段**:
  ```ts
  React.useEffect(() => {
    if (registrationRef.current) {
      registrationRef.current.childPaths = childPaths;
    }
  }, [childPaths]);
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 注册
- **现状**: key/value entry 增删后直接改 ref，不通知 FormRuntime 重建 child path index。
- **风险**: key/value 子字段 validators 与 owner 索引漂移，删除 entry 后可能继续验证旧 path。
- **建议**: 与 array-editor 一并改为 registration handle + `updateFieldRegistration` 模式。
- **为什么值得现在做**: 两个集合控件共享同一缺陷，集中修复 ROI 高。
- **误报排除**: `key-value` 是 live renderer，不是测试路径。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 子项复核通过

### [维度08-04] `applyChangesAndRevalidate` 在 refreshing/bootstrapping 下仍先写值

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:229-255`
- **证据片段**:

  ```ts
  async function applyChangesAndRevalidate(
    inputValue: ApplyScopeChangesInput,
  ): Promise<FormValidationResult> {
    if (input.sharedState.lifecycleState === 'disposed') {
      return createLifecycleBlockedValidationResult();
    }

    const { writes, changedPaths, reason } = inputValue;
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 执行
- **现状**: 入口只阻断 disposed；bootstrapping/refreshing 时仍会先写 values，再等待/触发验证路径。
- **风险**: transitional lifecycle 中 writes 与旧/新 model generation 可能交错，污染 fieldStates 或外部错误清理时序。
- **建议**: 明确该 API 在 bootstrapping/refreshing 下的 contract；若保持写入，应在文档和测试中锁定等待 active 后验证的语义。
- **为什么值得现在做**: 这是结构变化、draft commit、hidden clear 等 owner-managed 变更的原子入口。
- **误报排除**: 子项复核确认文档目前对该 API 明确要求 disposed blocked，P1 “必须 lifecycle-block”证据不足，因此降为 P2。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 已降级

### [维度08-05] stale async validation settle 被记录为 succeeded

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:400-408`
- **证据片段**:
  ```ts
  if (
    sharedState.validationRuns.get(path) !== runId ||
    sharedState.modelGeneration !== capturedGeneration
  ) {
    finalErrors = [];
    if (validationRun) {
      sharedState.validationAsyncGovernance.settleRun(validationRun, { outcome: 'succeeded' });
    }
    return createValidationResult([]);
  }
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 执行
- **现状**: stale/model generation mismatch 时 suppress result 是正确的，但 governance 记录为 `succeeded`。
- **风险**: async validation debug snapshot 会把 stale dropped run 显示为成功，误导排查。
- **建议**: 使用 `cancelled`、`stale-dropped` 或等价 outcome，并补 debug snapshot 测试。
- **为什么值得现在做**: 修复集中且提升异步校验诊断保真度。
- **误报排除**: 不是要求 ValidationResult 暴露取消；问题在 governance debug outcome。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

维度 08：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度08-01]: 保留 (P2)。编译器静默遮蔽显式 ownerResolution。
- [维度08-02]: 保留 (P1)。array-editor childPaths 更新绕过 registration API。
- [维度08-03]: 保留 (P1)。key-value 同类问题。
- [维度08-04]: 保留但降级为 P2。生命周期写入语义需明确，但 P1 证据不足。
- [维度08-05]: 保留 (P2)。stale async validation 被标成 succeeded。

## 子项复核结论

- [维度08-02]: 成立 (P1)。runtime child path index 需要通过 registration API 更新。
- [维度08-03]: 成立 (P1)。同类 registration index 漂移。
- [维度08-04]: 降级为 P2。验证入口后续会等待 active，文档只明确 disposed blocked。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                                         |
| ----- | -------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 08-01 | P2       | `packages/flux-compiler/src/schema-compiler/node-compiler.ts:474-487` | `scopePolicy: form` 遮蔽显式 validation ownerResolution            |
| 08-02 | P1       | `packages/flux-renderers-form-advanced/src/array-editor.tsx:220-224`  | array-editor childPaths 更新绕过 FormRuntime registration API      |
| 08-03 | P1       | `packages/flux-renderers-form-advanced/src/key-value.tsx:277-281`     | key-value childPaths 更新绕过 FormRuntime registration API         |
| 08-04 | P2       | `packages/flux-runtime/src/form-runtime-owner.ts:229-255`             | applyChangesAndRevalidate transitional lifecycle 写入/验证语义不清 |
| 08-05 | P2       | `packages/flux-runtime/src/form-runtime-validation.ts:400-408`        | stale async validation run 被记录为 succeeded                      |
