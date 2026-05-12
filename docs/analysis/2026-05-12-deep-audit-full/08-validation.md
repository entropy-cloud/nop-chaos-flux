# 维度 08：验证系统一致性

## 范围与状态

- 审核维度：验证系统一致性。
- 来源范围：仅汇总 `stage-1-full-findings-06-10.md`、`raw-findings-07-20.md`、`final-review-results-06-10.md` 与 `summary.md` 中本维度记录。
- 覆盖对象：validation owner precedence、lifecycle validation result、child submit contract、sync/async rule publication、advanced form renderer validateOn 行为。
- 最终状态：6 项全部保留；P1 4 项，P2 1 项，P3 1 项。

## 深挖轮次与收敛说明

第 1 轮初审记录 4 项。第 2-5 轮追加 raw findings 补充 2 项。本次审核在第 5 轮达到执行上限时仍有新增，因此按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核确认本维度高风险集中在 P1：表单内 validation owner 可能误取祖先、disposed/unactivated validation 返回 clean success、mixed sync+async rule 延迟同步错误发布，以及 TagList 绕过 `validateOn`。ArrayEditor eager validation 作为 P2 保留，`summary-gate` 语义歧义作为 P3 保留。

## 最终保留项

### [08-01] Form field presentation 可能使用 ancestor validation owner

- 文件：`packages/flux-react/src/hooks/use-form-hooks.ts:40-50`
- 证据片段：

```ts
export function useCurrentValidationScope(): ValidationScopeRuntime | undefined {
  const validationScope = useContext(ValidationContext);
  const currentForm = useCurrentForm();
  const currentPage = useContext(PageContext) as PageRuntime | undefined;

  if (validationScope === NO_VALIDATION_OWNER) {
    return currentForm;
  }

  return validationScope ?? currentForm ?? currentPage?.validationOwner;
```

- 严重程度：P1
- 当前行为：`ValidationContext` 优先于 `currentForm`，除非显式设为 `NO_VALIDATION_OWNER`。
- 风险：嵌套在其他 validation context 内的 form 可能读取/发布到错误 owner。
- 建议：在 form context 内优先 current form owner，或明确区分 inherited validation owner 与 form-owned validation。
- 误报排除：fallback order 在代码中明确存在，不是推测。
- 最终复核结论：保留 P1。
- 修订标题/理由：无标题修订；最终理由强调 `useCurrentValidationScope()` 可优先返回 ancestor `ValidationContext` 而不是 current form。

### [08-02] disposed/unactivated validation 返回 clean success

- 文件：`packages/flux-runtime/src/form-runtime-validation.ts:433-442`
- 证据片段：

```ts
if (sharedState.lifecycleState === 'disposed') {
  return createValidationResult([]);
}

if (isLifecycleTransitional(sharedState)) {
  const activated = await waitForActiveLifecycle(sharedState);

  if (!activated) {
    return createValidationResult([]);
  }
```

- 严重程度：P1
- 当前行为：disposed 或未激活的 validation path resolve 为 `{ ok: true, errors: [] }`。
- 风险：submit/validation caller 会把生命周期取消解释为验证成功。
- 建议：返回 explicit cancelled/blocked result 或抛 lifecycle cancellation sentinel。
- 误报排除：代码直接构造 empty success result，不是 distinct cancelled result。
- 最终复核结论：保留 P1。
- 修订标题/理由：无标题修订；最终理由强调 disposed/unactivated validation resolve 为 successful empty result。

### [08-03] `summary-gate` submit 语义与 recurse-submit 边界模糊

- 文件：`packages/flux-runtime/src/form-runtime-submit-flow.ts:185-200`, `packages/flux-runtime/src/form-runtime-submit-flow.ts:204-229`
- 证据片段：

```ts
for (const contract of childContractsSnapshot) {
  if (contract.mode === 'recurse-submit') {
    childValidationPromises.push(contract.triggerValidation());
  } else if (contract.mode === 'summary-gate') {
    const childState = contract.getState();
    if (!childState.ready || childState.validating || !childState.valid) {
      summaryGateBlockers.push(contract.childOwnerId);
      continue;
    }
```

- 严重程度：P3
- 当前行为：`summary-gate` 先基于 child summary state gate，但 ready/valid 后仍可能触发 validation。
- 风险：contract 名称像 summary-only gating，但行为与 recursive validation 有重叠。
- 建议：澄清 docs/types，或拆分 contract mode。
- 误报排除：行为可能 intentional；保留问题是契约语义歧义。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 `summary-gate` 名称掩盖其仍会 trigger validation 的行为。

### [08-04] 同一路径含 async rule 时 sync errors 被 debounce/async 阶段延后发布

- 文件：`packages/flux-runtime/src/form-runtime-validation.ts:291-331`, `packages/flux-runtime/src/form-runtime-validation.ts:413-423`
- 证据片段：

```ts
hasAsyncRules &&
  sharedState.validationRuns.get(path) === runId &&
  sharedState.modelGeneration === capturedGeneration
) {
  commitPathValidationState({
    sharedState,
    path,
    errors: finalErrors,
    validating: false,
  });
}
```

- 严重程度：P1
- 当前行为：field 有 async rules 时，final errors 在 async-rule finalization path 一次性 commit；先收集到的 sync errors 不立即发布。
- 风险：明显同步错误会被 debounce/async validation 延迟展示。
- 建议：await debounced/async rules 前先发布 sync errors，再合并 async results。
- 误报排除：非 async field 会立即发布；问题限定于 sync+async mixed rule path。
- 最终复核结论：保留 P1。
- 修订标题/理由：无标题修订；最终理由强调 mixed sync+async field rules 延迟 sync error publication。

### [08-05] TagListRenderer 绕过 validateOn 策略，点击变更总是触发校验

- 文件：`packages/flux-renderers-form-advanced/src/tag-list.tsx:37-50`, `packages/flux-renderers-form-advanced/src/tag-list.tsx:116-126`
- 证据片段：

```tsx
const syncErrorVisibility = React.useCallback(() => {
  if (!name) {
    return;
  }

  if (currentForm && (currentForm.isTouched(name) || fieldState.submitting)) {
    void currentForm.validateField(name);
    return;
  }

  if (currentValidationScope?.touchField && fieldState.touched) {
    void currentValidationScope.validateAt(name, 'change');
```

```tsx
if (currentForm) {
  if (!currentForm.isTouched(name)) {
    currentForm.touchField(name);
  }
  currentForm.setValue(name, nextValue);
  syncErrorVisibility();
} else {
  currentValidationScope?.touchField?.(name);
  scope.update(name, nextValue);
  void currentValidationScope?.validateAt(name, 'change');
}
```

- 严重程度：P1
- 当前行为：tag-list 虽调用 `useFormFieldController`，但点击路径直接 `setValue/scope.update` 并调用 `validateField/validateAt('change')`，没有使用 field controller handlers 或 `shouldValidateOn` gate。
- 风险：字段配置 `validateOn: 'submit'` 或 `'blur'` 时，tag toggle 仍会在 change 时暴露错误，破坏验证策略一致性。
- 建议：变更路径复用 `useFormFieldController` 返回的 handlers，或用 shared validation behavior helper gate 直接校验调用。
- 误报排除：不重复“sync 错误被 async 延后”；本条是校验过早触发并绕过 validateOn。
- 最终复核结论：保留 P1。
- 修订标题/理由：无标题修订；最终理由强调 TagList 直接 validateField/validateAt('change')，绕过 validateOn。

### [08-06] ArrayEditor add/sync/remove 忽略 field validateOn 策略

- 文件：`packages/flux-renderers-form-advanced/src/array-editor.tsx:249-264`, `packages/flux-renderers-form-advanced/src/array-editor.tsx:376-379`
- 证据片段：

```tsx
const syncItems = React.useCallback(
  (nextItems: ArrayEditorItem[]) => {
    itemsRef.current = nextItems;

    if (!currentForm || !name) {
      scope.update(name, nextItems);
      return;
    }

    if (!currentForm.isTouched(name)) {
      currentForm.touchField(name);
    }

    currentForm.setValue(name, nextItems);
    void currentForm.validateField(name);
  },
```

```tsx
if (currentForm && name) {
  currentForm.appendValue(name, nextItem);
  void currentForm.validateField(name);
  return;
}
```

- 严重程度：P2
- 当前行为：array editor 在同步 items 和 append 时无条件触发 `validateField(name)`。
- 风险：`validateOn: 'submit'/'blur'` 的数组字段会在编辑阶段立即显示 minItems/child errors，和基础 field handler 行为不一致。
- 建议：对 change 类操作使用 `shouldValidateOn(name, currentForm, 'change')`；若结构变更需要内部 child state 同步，应和用户可见 validation publication 分离。
- 误报排除：这是高级 array editor 的 eager validation，不是 owner context 解析问题。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 ArrayEditor parent array structural validation 无条件执行，忽略 validateOn。

## 驳回项

本维度最终复核没有驳回项。
