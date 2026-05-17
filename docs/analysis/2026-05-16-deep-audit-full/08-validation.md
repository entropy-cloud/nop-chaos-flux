# 维度 08：验证系统一致性

## 第 1 轮（初审）

### [维度08-01] `detail-view` 的 parent-form subtree commit 路径丢失 `commit` reason

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:331-338`
- **证据片段**:
  ```ts
  ? scopePath
    ? await parentForm.validateSubtree(scopePath)
    : await parentForm.validateAll('commit')
  : hasUsableParentValidationOwner()
    ? scopePath
      ? await parentValidationOwner!.validateSubtree(scopePath, 'commit')
  ```
- **严重程度**: P1
- **现状**: form owner 与 non-form owner 的 subtree commit 路径在 reason 传递上不一致。
- **风险**: commit-priority 行为、debounce bypass 等 commit 语义可能在 parentForm 路径缺失。
- **建议**: 统一改为 `parentForm.validateSubtree(scopePath, 'commit')`。
- **为什么值得现在做**: 这是 detail confirm 主路径的真实契约差异。
- **误报排除**: 并非风格问题；相邻分支已明确传 `'commit'`，说明这里确实漏传。
- **历史模式对应**: validation trigger reason drift。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 未复核

### [维度08-02] form-owned field handler 在 `validateField` 路径丢失 blur/change trigger reason

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:93-95,133-137`
- **证据片段**:
  ```ts
  if (shouldValidateOn(name, currentForm, 'change')) {
    await currentForm.validateField(name);
  }
  if (shouldValidateOn(name, currentForm, 'blur')) {
    attachValidationRejectionHandler(currentForm.validateField(name));
  }
  ```
- **严重程度**: P2
- **现状**: gate 使用了 `'change'/'blur'`，但真正执行时未把 reason 传给 `validateField`。
- **风险**: form-owned 路径与 non-form owner 路径的触发分类不一致，导致调试和行为收敛变难。
- **建议**: 改为 `validateField(name, 'change')` / `validateField(name, 'blur')`。
- **为什么值得现在做**: 这是低成本的 trigger fidelity 修正。
- **误报排除**: 复核已把它缩窄为 `currentForm` 分支特有问题，不再泛化整个 field-handlers。
- **历史模式对应**: trigger classification drift。
- **参考文档**: `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-03] non-form `ValidationScopeRuntime` 缺少 dependent revalidation failure 的 diagnostics wiring

- **文件**: `packages/flux-runtime/src/runtime-owned-factories.ts:237-267,296-305`
- **证据片段**:
  ```ts
  function createValidationScopeRuntime(inputValue: { ... }): ValidationScopeRuntime {
    const formRuntime = createManagedFormRuntime({
      id: inputValue.id,
      validateRule: (compiledRule, value, field, validationScope) =>
        validateRule(compiledRule, value, field, validationScope, input.validationRegistry),
    });
  }
  ```
- **严重程度**: P1
- **现状**: form runtime 明确注入 `reportDependentRevalidationFailure`，非 form validation owner 没有对应 wiring。
- **风险**: dependent revalidation failure 在非 form owner 路径退化为 console-only，可观察性与文档描述不一致。
- **建议**: 为 `createValidationScopeRuntime` 也注入 `createDependentRevalidationFailureHandler(...)`。
- **为什么值得现在做**: page/root/surface validation owner 都会走这条路径。
- **误报排除**: 不是 diagnostics 增强建议；这是 form 与 non-form owner 间真实能力漂移。
- **历史模式对应**: diagnostics seam missing on sibling owner path。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度08-04] `detail-view` commit 后只按 subtree prefix 校验，漏掉 owner-local dependent closure 的子树外依赖

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:333,337`；`packages/flux-runtime/src/form-runtime-subtree.ts:17-41,92-103`
- **证据片段**:
  ```ts
  ? scopePath
    ? await parentForm.validateSubtree(scopePath)
    : await parentForm.validateAll('commit')
  : hasUsableParentValidationOwner()
    ? scopePath
      ? await parentValidationOwner!.validateSubtree(scopePath, 'commit')
  ```
- **严重程度**: P1
- **现状**: 当前 detail commit 回写后只做 prefix/subtree 型 revalidation，未扩展到同 owner 中依赖该 subtree 的外部聚合/派生路径。
- **风险**: `profile.summary` 这类子树外依赖可能直到后续全量提交才暴露失效。
- **建议**: 回写后改用基于 leaf writes 的 owner-local closure revalidation，而不是单纯 `validateSubtree(prefix)`。
- **为什么值得现在做**: 这会造成“detail confirm 通过、真正 submit 才失败”的时序错觉。
- **误报排除**: 不是重复报告 [维度08-01] 的 reason 丢失；即便补齐 `'commit'`，仍会存在 closure coverage 不完整的问题。
- **历史模式对应**: subtree-only validation misses owner-local dependents。
- **参考文档**: `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度08-01]：保留 (P1)。form subtree commit 路径确实漏传 `'commit'`。
- [维度08-02]：降级为 P2。问题真实，但范围只在 `currentForm` 分支。
- [维度08-03]：保留 (P1)。non-form owner 缺少 diagnostics wiring。
- [维度08-04]：保留 (P1)。detail-view subtree validation 漏掉 owner-local dependent closure。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                            | 一句话摘要                                                               |
| ----- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 08-01 | P1       | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:331-338` | detail-view 的 parent-form subtree commit 路径丢失 `commit` reason       |
| 08-03 | P1       | `packages/flux-runtime/src/runtime-owned-factories.ts:237-267`                  | non-form validation owner 缺少 dependent revalidation diagnostics wiring |
| 08-04 | P1       | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:333,337` | detail commit 只做 subtree 校验，漏掉子树外 owner-local dependents       |
| 08-02 | P2       | `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:93-95`         | form-owned field handler 丢失 blur/change trigger reason                 |
