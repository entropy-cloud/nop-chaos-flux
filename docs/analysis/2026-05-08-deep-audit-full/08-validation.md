# 08 Validation

- 深挖轮次: 1
- 深挖发现数: 2

## 第 1 轮初审

### [维度08-01] surface-root 非 form 验证 owner 使用独立初始快照，字段变更后验证读取旧值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\surface-runtime.ts:121-129`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-handlers.tsx:100-106`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-validation.ts:242-250`
- **行号范围**: `surface-runtime.ts:121-129`, `field-handlers.tsx:100-106`, `form-runtime-validation.ts:242-250`
- **证据片段**:

  ```ts
  const ownerValidationPlan = options?.validationPlan ?? options?.ownerTemplateNode?.validationPlan;
  const validationOwner = input.createValidationOwner?.({
    id: `${resolvedSurfaceId}-validation`,
    parentScope: scope,
    scopePath: scope.path,
    initialValues: scope.readOwn(),
    validation: ownerValidationPlan,
    initialLifecycleState: ownerValidationPlan ? 'active' : 'bootstrapping',
  });
  ```

  ```ts
  if (currentValidationScope) {
    void (async () => {
      await setValue(nextValue);

      if (shouldValidateOnOwner(name, currentValidationScope, 'change')) {
        await currentValidationScope.validateAt(name, 'change');
      }
  ```

  ```ts
  const value = syncedRuntimeValue ?? sharedState.scope.get(path);
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 注册 → 触发 → 执行 → 结果展示 / 跨 scope
- **现状**: `surfaceRuntime.open()` 为 dialog/drawer surface-root 创建 `ValidationScopeRuntime` 时只把 `scope.readOwn()` 作为 `initialValues` 传入，没有把 surface render scope 的 store 作为 `existingStore` 共享给 validation owner；非 form 字段变更路径却更新 `useRenderScope()` 返回的 surface scope，然后调用 `currentValidationScope.validateAt(...)`。执行验证时 `validateCompiledField()` 从 validation owner 自己的 `sharedState.scope.get(path)` 取值，因此会读取创建 owner 时的旧快照，而不是用户刚编辑的 surface scope 值。
- **风险**: action-opened 或 declarative dialog/drawer 中没有内层 `<form>` 的绑定字段会出现验证结果与 UI 值不一致：用户修正值后仍按旧值报错，或用户清空/改坏字段后验证仍按初始值通过。该问题直接破坏文档已声明的 “surface-root non-form validation owner” live baseline。
- **建议**: surface-root validation owner 应与 surface render scope 使用同一 value store / scope binding，或在非 form 字段写入时通过 owner-local `applyChangesAndRevalidate(...)` / validation owner scope 同步写入，确保验证执行读取的是当前 owner 值。修复时应覆盖 dialog/drawer 非 form 字段 change/blur/submit-like gating 场景。
- **为什么值得现在做**: 当前文档已经把 managed dialog/drawer surface-root validation owner 列为 live baseline；这不是未来收敛项，而是已发布 owner family 的值轴与 owner 轴脱节，后续继续扩展非 form owner 会放大该缺陷。
- **误报排除**: 这不是今天 224 closure 中的 dependent revalidation cycle、hiddenFieldPolicy override、external errors remap/overlay、submit snapshots 或 projected prefix 问题；这里的 residual 是 surface validation owner 的 value source 与 render scope 不一致。page-root owner 已通过 shared validation store 接到 page scope，该 finding 特指 surface-root owner。
- **历史模式对应**: 状态所有权/验证 owner 双事实源：UI 写入一个 scope，验证 owner 读取另一个 scope。
- **参考文档**: `docs/architecture/form-validation.md:297-305`, `docs/architecture/form-validation.md:1087-1096`, `docs/references/form-validation-execution-details.md:44-72`
- **复核状态**: 未复核

### [维度08-02] validateAll/validateSubtree 绕过 transitional lifecycle，可把 bootstrapping/null model 当作 clean success

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-validation.ts:433-443`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-owner.ts:312-321`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-owner.ts:467-477`
- **行号范围**: `form-runtime-validation.ts:433-443`, `form-runtime-owner.ts:312-321`, `form-runtime-owner.ts:467-477`
- **证据片段**:

  ```ts
  if (sharedState.lifecycleState === 'disposed') {
    return createValidationResult([]);
  }

  if (isLifecycleTransitional(sharedState)) {
    const activated = await waitForActiveLifecycle(sharedState);

    if (!activated) {
      return createValidationResult([]);
    }
  }
  ```

  ```ts
  async function validateForm(reason?: ValidationReason) {
    const currentValidation = input.getCurrentValidation();

    if (!currentValidation && input.sharedState.runtimeFieldRegistrations.size === 0) {
      return {
        ok: true,
        errors: [],
        fieldErrors: {},
      } as FormValidationResult;
    }
  ```

  ```ts
  async function validateSubtree(path: string, reason?: ValidationReason) {
    const currentValidation = input.getCurrentValidation();

    if (!currentValidation) {
      const targetPaths = collectSubtreeValidationTargets(input.sharedState, path);
      if (targetPaths.length === 0) {
        return {
          ok: true,
          errors: [],
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 触发 → 执行
- **现状**: `validateField()/validateAt()` 已在 `bootstrapping` / `refreshing` 时等待 owner active；但 `validateForm()/validateAll()` 与 `validateSubtree()` 没有同等 lifecycle guard，并且在 `currentValidation` 为空、没有 runtime registrations 或 subtree targets 时直接返回 `{ ok: true }`。
- **风险**: page-root 或 surface-root validation owner 尚处于 `bootstrapping`、compiled model 尚未 attached 时，调用 owner-wide/subtree validation 会得到与“已验证且无错误”不可区分的 clean success。这违反 `compiledModel === null` 不代表 registration-only validation mode 的契约，也可能让外部 action/gating 逻辑在 owner 未 ready 时误判可继续。
- **建议**: 将 lifecycle arbitration 抽到 owner-wide/subtree validation 入口共用：`bootstrapping`/`refreshing` 的 ordinary validation 要等待 active 或返回明确非 clean-success 的 lifecycle failure；`disposed` 也应保持与 owner contract 一致的可诊断结果。仅 `submit()` 保持当前明确失败、不等待的特殊语义。
- **为什么值得现在做**: 生命周期语义是 ValidationScopeRuntime 的 owner contract；当前 `validateAt` 和 `validateAll/validateSubtree` 行为不一致，会误导后续非 form owner、surface owner 和 action gating 的实现。
- **误报排除**: 这不是今天 224 closure 的 submit snapshot 问题；submit path 已在 `executeFormSubmit()` 中单独处理 transitional lifecycle。这里特指 ordinary `validateAll()` / `validateSubtree()` 入口仍可在 null model 下返回 clean success。
- **历史模式对应**: transitional owner lifecycle 被局部修复后，旁路 API 未复用同一 guard，造成同一 owner contract 下多入口语义漂移。
- **参考文档**: `docs/architecture/form-validation.md:176-193`, `docs/references/form-validation-execution-details.md:485-509`, `docs/references/form-validation-runtime-types.md:207-210`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度08-03] projected non-form validation proxy 暴露未 rebased store，子字段错误展示读取相对路径导致漏显

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\projected-validation-runtime.ts:132-145`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks\use-form-hooks.ts:71-74`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-presentation.tsx:31-42`
- **行号范围**: `projected-validation-runtime.ts:132-145`, `use-form-hooks.ts:71-74`, `field-presentation.tsx:31-42`
- **证据片段**:
  ```ts
  get store() {
    return parentOwner.store;
  },
  get scope() {
    return parentOwner.scope;
  },
  get validation() {
    return getProjectedValidation();
  },
  validateAt(path, reason) {
    return parentOwner.validateAt(options.prefixPath(path), reason);
  },
  ```
  ```ts
  function useCurrentFormLikeStore(): FormStoreApi | undefined {
    const form = useCurrentForm();
    const validationStore = useCurrentValidationStore();
    return (form?.store ?? validationStore) as FormStoreApi | undefined;
  }
  ```
  ```ts
  const fieldState = useFormFieldState(name);
  const currentForm = useCurrentForm();
  const behavior = getValidationBehaviorForOwner(name, currentValidationScope);
  const currentPresentation = useCurrentFormState(
    (state) =>
      selectCurrentFormFieldPresentation(state, {
        path: name,
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 结果展示 / 跨 scope
- **现状**: `createProjectedValidationRuntime()` 对 `validateAt()`、`getFieldState()` 等方法做了 `prefixPath()` 映射，但 `store` 直接返回 parent owner 的未投影 store；而字段展示 hook 在无 `FormRuntime` 时会直接订阅 `currentValidationScope.store`，并用子作用域相对 `name` 读取 `fieldStates` / `values`。
- **风险**: 非 form owner 下的 projected object/array item 子字段会把验证执行结果写入父路径（如 `profile.email`），但 FieldFrame / field presentation 在子作用域按相对路径（如 `email`）订阅和读取，导致错误、validating、touched/dirty 以及动态 required 展示与真实验证状态脱节。用户可能已经触发并失败了验证，但子字段 chrome 不显示错误。
- **建议**: projected validation runtime 应暴露 rebased `ValidationStoreApi`：`getState().values/fieldStates`、`subscribeToPath(s)`、`getPathState()`、`getFieldState()` 都应按 projected relative path 映射；或调整 hooks 通过 `ValidationScopeRuntime.getFieldState()` / projected value API 读取，避免直接使用未投影 parent store。
- **为什么值得现在做**: 文档已把 shared field chrome、`tag-list`、`code-editor` 在 page-root/surface-root 非 form owner 中的参与列为 live baseline；projected child scope 是该路径下 object/array 子字段展示正确性的基础。
- **误报排除**: 这不是“inherit-owner 不应创建新 owner”的旧争论；代码已经主动创建 projected runtime 并返回 projected `validation/rootPath`，问题是同一个 projected runtime 的执行路径已 rebased，但展示订阅的 store 没有 rebased。
- **历史模式对应**: owner/value 轴部分 rebasing，执行与展示读取不同路径，形成跨 scope 单事实源漂移。
- **参考文档**: `docs/architecture/form-validation.md:383-388`, `docs/architecture/form-validation.md:470-486`, `docs/references/form-validation-execution-details.md:21-85`
- **复核状态**: 未复核

### [维度08-04] projected validation runtime 的 validateAll/getScopeState 仍返回父 owner-wide 结果，子树 API 可被兄弟字段错误污染

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\projected-validation-runtime.ts:116-149`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\projected-form-runtime.ts:312-318`
- **行号范围**: `projected-validation-runtime.ts:116-149`, `projected-form-runtime.ts:312-318`
- **证据片段**:
  ```ts
  get rootPath() {
    return getProjectedValidation()?.rootPath ?? parentOwner.rootPath;
  },
  ...
  validateSubtree(path, reason) {
    return parentOwner.validateSubtree(options.prefixPath(path), reason);
  },
  validateAll(reason) {
    return parentOwner.validateAll(reason);
  },
  ```
  ```ts
  validateSubtree(path, reason) {
    return parentForm.validateSubtree(options.prefixPath(path), reason);
  },
  validateAll(reason) {
    return options.ownerRootPath
      ? parentForm.validateSubtree(options.ownerRootPath, reason)
      : parentForm.validateForm(reason);
  },
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 触发 → 执行 / 跨 scope
- **现状**: `createProjectedValidationRuntime()` 对外声明 projected `rootPath`，`validateSubtree()` 也会 prefix 到子树，但 `validateAll()` 直接调用 `parentOwner.validateAll()`，`getScopeState()` 也直接返回父 owner summary。相邻的 `projected-form-runtime` 已把 `validateAll()` 收窄为 `ownerRootPath` subtree，说明 form projection 与 validation projection 语义不一致。
- **风险**: projected 子作用域中的调用方如果按当前 `ValidationScopeRuntime` 契约调用 `validateAll()` 或读取 `getScopeState()`，会得到父 owner-wide 结果：兄弟字段错误、兄弟异步 validating、父级 ready=false 都可能污染当前子树判断；反过来，子树级确认/联动逻辑也可能因为父级无关状态被误挡。
- **建议**: 对 projected validation runtime 的 owner-wide API 做一致 rebasing：有 `ownerRootPath` 时 `validateAll(reason)` 应委托到 `parentOwner.validateSubtree(ownerRootPath, reason)`；`getScopeState()` 若作为 projected scope 暴露，应计算 projected subtree summary，或明确不把该 proxy 暴露为可 owner-wide 判断的 `ValidationScopeRuntime`。
- **为什么值得现在做**: 这是 validateAll lifecycle residual 之外的 owner-wide/subtree 边界残留；后续非 form owner 与 composite projected child scopes 扩展时，该 API 语义漂移会直接误导 action gating。
- **误报排除**: 不是报告“父 owner 不能拥有 inherit-owner 子树”；问题是 projected proxy 已经以子树 rootPath 对外呈现，却保留父级 owner-wide API 结果，和同包 projected form proxy 的收窄策略不一致。
- **历史模式对应**: projected prefix 只覆盖单字段/子树入口，owner-wide summary 入口遗漏，造成同一 runtime contract 多入口语义漂移。
- **参考文档**: `docs/architecture/form-validation.md:808-840`, `docs/architecture/form-validation.md:753-756`, `docs/references/form-validation-execution-details.md:421-441`
- **复核状态**: 未复核

### [维度08-05] code-editor 与 tag-list 绕过 compiled triggers，固定在 change/blur/click 上验证

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer\use-code-editor-binding.ts:43-50`, `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer\use-code-editor-binding.ts:63-70`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tag-list.tsx:116-126`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-validation.ts:45-50`
- **行号范围**: `use-code-editor-binding.ts:43-50`, `use-code-editor-binding.ts:63-70`, `tag-list.tsx:116-126`, `field-validation.ts:45-50`
- **证据片段**:
  ```ts
  if (currentForm && hasName) {
    currentForm.setValue(name, newValue);
    void currentForm.validateField(name, 'change');
  } else if (hasName) {
    currentValidationScope?.touchField?.(name);
    scope.update(name, newValue);
    void currentValidationScope?.validateAt(name, 'change');
  }
  ```
  ```ts
  if (currentForm && hasName) {
    currentForm.touchField(name);
    void currentForm.validateField(name, 'blur');
  } else if (hasName) {
    currentValidationScope?.touchField?.(name);
    void currentValidationScope?.validateAt(name, 'blur');
  }
  ```
  ```ts
  export function shouldValidateOnOwner(
    name: string,
    owner: ValidationScopeRuntime | undefined,
    trigger: 'change' | 'blur' | 'submit',
  ) {
    return getValidationBehaviorForOwner(name, owner).triggers.includes(trigger);
  }
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 触发 / display policy
- **现状**: 通用 field handlers 已通过 `shouldValidateOnOwner()`/compiled behavior 判断是否应在 `change`/`blur` 触发验证；但 `code-editor` 固定在 change 和 blur 都调用验证，`tag-list` 在非 form owner 下点击后固定 `validateAt(..., 'change')`，form 路径也通过 `syncErrorVisibility()` 绕过 field behavior 的 trigger 判断。
- **风险**: schema 将字段配置为 `triggers: ['blur']` 或 `['submit']` 时，这些 renderer 仍会在输入/点击阶段执行验证，提前改变 owner validity、ready、validating 与外部 gating；对于 async 规则还会制造不必要的请求与取消竞态。`showErrorOn` 只能控制展示，不能抵消 owner 状态已被过早更新的问题。
- **建议**: `code-editor` 与 `tag-list` 应复用 `getValidationBehaviorForOwner()` / `shouldValidateOnOwner()`，在 form 与 non-form owner 路径都按 compiled triggers 决定是否执行 change/blur 验证；需要强制即时校验的 renderer-specific 策略应显式进入 schema/behavior，而不是硬编码。
- **为什么值得现在做**: 文档明确把 `code-editor` 与 `tag-list` 纳入 generic `ValidationScopeRuntime` 支持路径；这不是未来扩展包的过渡问题，而是 live renderer 与验证触发契约不一致。
- **误报排除**: 不是把 `showErrorOn` 误当验证触发；本条报告的是 `behavior.triggers` 被绕过。即使错误信息暂时不显示，owner summary 与 async work 仍会被提前改变。
- **历史模式对应**: renderer 局部事件处理绕过 runtime/compiled validation policy，形成触发时机双实现。
- **参考文档**: `docs/architecture/form-validation.md:224-249`, `docs/architecture/form-validation.md:786-840`, `docs/references/form-validation-execution-details.md:118-183`
- **复核状态**: 未复核
