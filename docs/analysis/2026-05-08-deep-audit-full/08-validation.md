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

## 深挖第 3 轮追加

### [维度08-06] variant-field 在非 form owner 下没有投影 ValidationContext，子字段验证路径与隐藏分支参与状态都会漂移

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:119-140`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:348-384`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:473-477`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:576-587`
- **行号范围**: `variant-field.tsx:119-140`, `348-384`, `473-477`, `576-587`
- **证据片段**:
  ```ts
  const parentForm = useCurrentForm();
  const parentScope = useRenderScope();
  ...
  const currentValue = parentForm ? rawValue : scopeValue;
  ```
  ```ts
  const variantForm = React.useMemo(
    () => (parentForm ? createVariantFormProxy(parentForm, name) : undefined),
    [parentForm, name],
  );
  ...
  if (!parentForm || !name) {
    return;
  }
  for (const hiddenPath of hiddenVariantChildPaths) {
    parentForm.notifyFieldHidden(`${name}.${hiddenPath}`, true);
  }
  ```
  ```tsx
  <FormContext.Provider value={variantForm}>
    <ScopeContext.Provider value={variantScope}>
      {asReactNode(activeContentRegion?.render())}
    </ScopeContext.Provider>
  </FormContext.Provider>
  ```
  ```ts
  getChildFieldPathPrefix(schema: BaseSchema) {
    return typeof schema.name === 'string' ? schema.name : undefined;
  },
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 注册 → 触发 → 执行 / 隐藏字段参与
- **现状**: `variant-field` 只在存在 `parentForm` 时创建 `variantForm` 投影与发布 inactive variant 子路径隐藏状态；非 form page/surface validation owner 下只投影 `ScopeContext`，没有投影 `ValidationContext`，也不会调用 `currentValidationScope.notifyFieldHidden(...)`。但编译期 validation contributor 会把子字段路径前缀为 `name.child`。
- **风险**: 非 form owner 中的 variant 子字段会用相对字段名触发/读取验证，而 compiled model 中真实路径是 `variantName.child`，导致 active 分支子字段校验漏跑；同时 inactive 分支 required/aggregate 规则没有隐藏参与信号，可能继续阻塞 owner validity/ready。该问题会直接破坏文档中 “variant editors stay in the parent owner” 与非 form validation owner live baseline。
- **建议**: 在 `variant-field` 非 form 路径下使用 `useCurrentValidationScope()` 创建与 `createVariantFormProxy` 等价的 projected `ValidationScopeRuntime`，通过 `ValidationContext.Provider` 暴露给子区域；隐藏 inactive variant 子路径时应向 `parentForm ?? parentValidationOwner` 发布，并保持路径 prefix 一致。
- **为什么值得现在做**: `variant-field` 是复杂 composite value owner，且非 form owner 已作为 live baseline 写入验证架构；路径投影与隐藏参与状态一旦漂移，会直接影响 submit gating 与错误展示。
- **误报排除**: 这不是已有的 projected validation runtime “store 未 rebased” 问题；本处是 `variant-field` 非 form 路径根本没有提供 projected validation owner，也没有向非 form owner 发布隐藏分支参与状态。
- **历史模式对应**: composite field 的 form owner 投影能力没有同步扩展到 generic ValidationScopeRuntime，形成 form/non-form 双实现漂移。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-07] array-field scalar item 的运行时子项验证只接入 FormRuntime，非 form owner 下 item required 规则会完全漏检

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:414-449`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:451-507`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:560-568`
- **行号范围**: `array-field.tsx:414-449`, `451-507`, `560-568`
- **证据片段**:
  ```ts
  React.useLayoutEffect(() => {
    if (!parentForm || !name || itemKind !== 'scalar' || scalarChildPaths.length === 0) {
      return;
    }
    ...
    return parentForm.registerField({
      path,
      getValue() {
        return items[index];
      },
  ```
  ```ts
  React.useEffect(() => {
    if (!parentForm || !name || itemKind !== 'scalar') {
      return;
    }
    ...
    parentForm.registerChildContract({
      childOwnerId,
      mode: 'recurse-submit',
  ```
  ```ts
  validation: {
    kind: 'field',
    valueKind: 'array',
    ...
    getChildFieldPathPrefix() {
      return false;
    },
  },
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 编译 → 注册 → 执行
- **现状**: scalar `array-field` 明确用 `getChildFieldPathPrefix() { return false; }` 阻止编译期收集 item region 子字段规则，然后依靠运行时 `parentForm.registerField(...)` 和 child contract 补充 scalar item required 校验。但这两段补充逻辑都以 `parentForm` 为前置条件；非 form `ValidationScopeRuntime` 下不会注册 runtime child paths，也不会提供 child contract。
- **风险**: page-root 或 surface-root 非 form owner 中使用 scalar `array-field` 且 item schema 标记 required 时，compiled model 没有 item 子节点，runtime registration 也不存在，`validateAt/validateAll` 都无法发现空 item。用户提交/触发 action gating 时 owner 可能误判 ready/valid。
- **建议**: scalar array item 的 runtime participation 应注册到 `parentForm ?? parentValidationOwner`，并为非 form owner 提供等价的 `registerField` / `validateAt` 路径；或者让 compiler 为 scalar item 模板生成可实例化 validation template，而不是仅依赖 FormRuntime-only runtime registration。
- **为什么值得现在做**: array scalar item validation 是当前运行时唯一保护路径；如果不补齐非 form owner，新的 generic validation owner 能力会在复合字段上出现可见漏检。
- **误报排除**: 这不是“runtime participation 可以作为补充”的合理过渡；当前代码已经选择用 runtime registration 作为 scalar item required 的唯一实现路径，但该路径只接入 `FormRuntime`，与文档声明的非 form validation owner支持不一致。
- **历史模式对应**: form runtime 专属补丁没有泛化到 shared ValidationScopeRuntime，造成 compiler/runtime/form owner 三方契约不一致。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/architecture/composite-value-owner-clean-slate.md`, `docs/references/form-validation-runtime-types.md`
- **复核状态**: 未复核

### [维度08-08] validateSchemaInput 不报告 invalid/unsupported pattern，只有 runtime 执行时才把配置错误变成字段错误

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\validation-lowering.ts:195-234`, `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler\validation-compiler.ts:59-88`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\validation\validators.ts:174-180`
- **行号范围**: `validation-lowering.ts:195-234`, `validation-compiler.ts:59-88`, `validators.ts:174-180`
- **证据片段**:
  ```ts
  export function compileValidationRules(
    path: string,
    rules: ValidationRule[],
  ): CompiledValidationRule[] {
    return rules.map((rule, index) => ({
      id: `${path}#${index}:${rule.kind}`,
      rule,
      dependencyPaths: collectValidationDependencyPaths(rule),
      precompiled:
        rule.kind === 'pattern'
          ? compilePatternPrecompiled(rule.value as string, path, index)
          : undefined,
    }));
  }
  ```
  ```ts
  try {
    return { regex: new RegExp(patternValue), safe: true };
  } catch (err) {
    console.warn(
      `[flux-compiler] Invalid regex pattern at ${path}: /${patternValue}/ — ${err instanceof Error ? err.message : err}`,
    );
    return { error: err instanceof Error ? err.message : String(err), safe: false };
  }
  ```
  ```ts
  const precompiled = input.compiledRule.precompiled;
  if (precompiled?.error) {
    return createPatternConfigurationError(
      input,
      `Invalid validation pattern: ${precompiled.error}`,
    );
  }
  const regex = precompiled?.regex ?? new RegExp(input.rule.value);
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 编译 / schema validator → 执行
- **现状**: `compilePatternPrecompiled()` 能识别 invalid regex 与 unsupported backtracking-prone pattern，但只返回 `precompiled.error/safe:false` 或 `console.warn`，没有向 schema diagnostics emit error。`validateSchemaInput()` 只收集 compiler/analyzer diagnostics 并返回，无法把这类 pattern 配置错误作为 schema validation error 暴露；真正的失败要等 runtime validator 执行字段规则时才变成字段级 `ValidationError`。
- **风险**: schema validator 与 runtime validation 对同一配置的判断分裂：离线/预发布 schema 校验可能通过，线上首次触发字段验证才出现“配置错误”字段错误。对 pattern 这类应 fail-closed 的配置错误，错误反馈时机过晚，也会把作者配置问题伪装成用户输入错误。
- **建议**: 将 pattern precompile 诊断接入 schema compiler diagnostics：invalid regex / unsupported unsafe pattern 应在 `validateSchemaInput()` 或 compile diagnostics 中 emit 明确 schema error；runtime 仍可保留 fail-closed field error 作为防线，但不应是唯一可见路径。
- **为什么值得现在做**: pattern 配置错误属于 schema 作者错误，不应延迟到用户输入时才暴露；补齐 diagnostics 能改善导入校验和编辑器反馈。
- **误报排除**: 这不是要求 runtime 静默跳过 pattern；runtime 当前确实 fail-closed。问题是 schema validator 层没有同步报告同一配置错误，形成 schema validator 与 runtime validation 的时机/语义分歧。
- **历史模式对应**: compiler diagnostics 与 runtime validator 对同一规则的错误时机分裂，属于 schema validation 与 runtime validation 双轨漂移。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/architecture/schema-file-validator.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度08-09] detail-view 非 form 父 owner 提交 draft 后只写 parentScope，不触发父验证 owner 重校验

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:108-114`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:162-217`
- **行号范围**: `detail-view.tsx:108-114`, `162-217`
- **证据片段**:

  ```ts
  useDetailChildValidationContract({
    parentValidationOwner,
    draftForm,
    childOwnerId,
    mode: props.templateNode.validationOwnerPlan?.childContractMode,
    active: open,
  });
  ```

  ```ts
  async function settleParentValidation(): Promise<boolean> {
    if (!parentForm) {
      return true;
    }

    const result = scopePath
      ? await parentForm.validateSubtree(scopePath)
      : await parentForm.validateAll('commit');
  ```

  ```ts
  if (parentForm) {
    parentForm.setValue(scopePath, commitValue);
  } else {
    parentScope.update(scopePath, commitValue);
  }

  if (parentForm) {
    return await settleParentValidation();
  }
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 跨 scope / commit → 执行
- **现状**: `detail-view` 已通过 `parentValidationOwner` 注册 child validation contract，说明它支持 generic `ValidationScopeRuntime` 父 owner；但 draft confirm 写回父数据后，父级重校验只在 `parentForm` 存在时执行。非 form page-root / surface-root owner 下只调用 `parentScope.update(...)`，随后直接返回成功，不调用 `parentValidationOwner.applyChangesAndRevalidate(...)`、`validateSubtree(...)` 或等价 owner-local commit 校验。
- **风险**: 非 form 父 owner 中的 detail draft commit 会把新值写回父 scope，但父 owner 的 errors / valid / ready / dependent closure 不会刷新。依赖该 detail 子树的 requiredWhen、object/array aggregate、外部 action gating 可能继续使用提交前的验证状态，导致已变坏的数据仍显示 ready，或已修复的数据仍被旧错误阻塞。
- **建议**: 在无 `parentForm` 但存在 `parentValidationOwner` 时，commit 应走 owner-local 写入与重校验路径：优先使用 `applyChangesAndRevalidate({ writes, changedPaths, reason: 'commit' })`；若写入仍由 `parentScope.update` 完成，也至少在写入后调用 `parentValidationOwner.validateSubtree(scopePath, 'commit')` / `validateAll('commit')` 并处理失败结果。
- **为什么值得现在做**: 当前架构已把 `detail-field` / `detail-view` 标为 live `create-owner` child-owner boundary，且父 owner 不限于 `FormRuntime`。这里不是未来 filter/search panel 扩展，而是已接入 `parentValidationOwner` 的 detail owner commit 路径在非 form 父 owner 下遗漏重校验。
- **误报排除**: 这不是既有的 surface-root value snapshot 旧值问题，也不是 projected validation proxy 的 rebasing 问题；本条特指 detail draft child owner 成功 commit 后，父级 generic validation owner 没有收到 commit/revalidation 生命周期事件。
- **历史模式对应**: form parent 路径完整，但 generic validation owner 旁路缺少等价 commit/revalidate，形成 owner family 双实现漂移。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-10] array-editor / key-value 直接改 registration.childPaths，childPath 索引未同步导致新增子项 change 校验漏跑

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:218-233`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:277-317`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:266-281`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-field-ops.ts:166-170`
- **行号范围**: `array-editor.tsx:218-233`, `277-317`; `key-value.tsx:266-281`; `form-runtime-field-ops.ts:166-170`
- **证据片段**:

  ```ts
  const childPaths = React.useMemo(
    () => items.map((_, index) => `${name}.${index}.value`),
    [items, name],
  );

  React.useEffect(() => {
    if (registrationRef.current) {
      registrationRef.current.childPaths = childPaths;
    }
  }, [childPaths]);
  ```

  ```ts
  const registration: RuntimeFieldRegistration = {
    path: name,
    childPaths,
    getValue() {
      return itemsRef.current;
    },
    syncValue() {
      return itemsRef.current;
    },
    validateChild(path) {
  ```

  ```ts
  if (registration.childPaths) {
    for (const childPath of registration.childPaths) {
      childPathToRegistrationId.set(childPath, registrationId);
    }
  }
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 注册 → 触发 → 执行
- **现状**: `array-editor` 和 `key-value` 初次 `registerField(...)` 时会把 `childPaths` 写入 runtime 的 `childPathToRegistrationId` 索引；之后 items/pairs 增删时只直接修改 `registrationRef.current.childPaths`。由于没有调用 `owner.updateFieldRegistration(...)`，runtime 内部 `childPathToRegistrationId` 不会补登记新增 child path，也不会移除旧 child path。
- **风险**: 新增行的子字段在 `onChange/onBlur` 中调用 `validateField(itemPath/keyPath/valuePath)` 时，`findRuntimeRegistration(...)` 找不到新增 child path 对应 registration，运行时 `validateChild(...)` 不执行；用户编辑新增空项时 change/blur 反馈会漏掉，直到 owner-wide `validateAll()` 直接遍历 registration.childPaths 才可能发现。删除或重排后旧索引残留还可能把 path 解析到错误 item。
- **建议**: 不要直接突变 registration 对象的 `childPaths`。保存 `registerField()` 返回的 `registrationId`，在 childPaths 变化时调用 `currentForm.updateFieldRegistration(registrationId, { childPaths })`；非 form owner 泛化时也应复用同一 API，确保 path 索引、registration 内容和 generation 校验同步更新。
- **为什么值得现在做**: 这是 runtime participation 作为补充来源时的索引一致性问题，影响现有 form owner 下的 composite child validation，不依赖未来非 form owner 扩展。
- **误报排除**: 这不是既有的 `array-field` scalar item 只接入 FormRuntime 问题；本条发生在 `array-editor` / `key-value` 已经注册到 FormRuntime 的路径中，问题是注册后的 child path 更新绕过 runtime API，导致触发单个子路径验证时索引过期。
- **历史模式对应**: runtime registration object 被局部突变，但 owner 内部索引未同步，造成注册表/触发路径双事实源。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度08-11] generic validation owner 的 runtime registrations 在模型刷新后被清空，但非 form renderer 不订阅 modelGeneration 重新注册

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks.ts:211-216`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-owner-lifecycle.ts:43-71`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tag-list.tsx:33-83`
- **行号范围**: `hooks.ts:211-216`, `form-runtime-owner-lifecycle.ts:43-71`, `tag-list.tsx:33-83`
- **证据片段**:

  ```ts
  export function useCurrentFormModelGeneration(): number {
    const form = useCurrentForm();
    const subscribe = useMemo(() => createFormModelGenerationSubscribe(form), [form]);
    const getSnapshot = useMemo(() => () => form?.modelGeneration ?? 0, [form]);

    return useSyncExternalStoreWithSelector(
      subscribe,
      getSnapshot,
      getSnapshot,
      (n) => n,
      Object.is,
    );
  }
  ```

  ```ts
  args.sharedState.lifecycleState = 'refreshing';
  args.sharedState.modelGeneration += 1;
  notifyModelGenerationListeners(args.sharedState);
  ...
  const staleRegistrations = Array.from(args.sharedState.runtimeFieldRegistrations.entries());
  for (const [regId, entry] of staleRegistrations) {
    args.sharedState.runtimeFieldRegistrations.delete(regId);
  ```

  ```ts
  const modelGeneration = useCurrentFormModelGeneration();
  const currentValidationScope = useCurrentValidationScope();
  ...
  return owner.registerField({
    path: name,
    getValue() {
      return (owner.scope ?? scope).get(name);
    },
  }).unregister;
  }, [currentForm, currentValidationScope, labelText, modelGeneration, name, required, scope]);
  ```

- **严重程度**: P1
- **验证生命周期阶段**: lifecycle refresh → 注册 → 执行
- **现状**: `refreshCompiledModelState()` 会递增 generic validation owner 的 `modelGeneration` 并清空 runtime registrations；但 `useCurrentFormModelGeneration()` 只订阅 `useCurrentForm()`，非 form owner 下始终返回 `0`。`tag-list` 已支持 `currentForm ?? currentValidationScope` 注册 runtime validator，但其 effect 的 generation 依赖在非 form owner 刷新后不会变化，旧 registration 被 runtime 清空后不会重新注册。
- **风险**: page-root / surface-root 非 form owner 动态 schema refresh 后，`tag-list` 的 runtime required/opaque validation 参与会消失；后续 `validateAt()` / `validateAll()` 只能看到 compiled graph，无法执行该 renderer 的 runtime validator，导致空 tag-list 误判 valid/ready。该风险发生在 live generic `ValidationScopeRuntime` registration lifecycle，不是仅 FormRuntime 路径。
- **建议**: 将 generation hook 泛化为订阅 `useCurrentValidationScope()?.subscribeToModelGeneration`，或新增 `useCurrentValidationModelGeneration()` 并让 runtime-registration renderers 使用 `currentForm ?? currentValidationScope` 的 generation；确保模型刷新清空 registration 后 mounted fields 会重新注册。
- **为什么值得现在做**: generic validation owner 已是 live baseline，runtime registrations 被 refresh 清空后不重建会直接丢失 renderer-owned validation。
- **误报排除**: 这不是既有 `[维度08-05]` 的 trigger 绕过问题；本条不涉及 change/blur 触发策略，而是 owner lifecycle refresh 后 runtime participation 丢失。也不是 `[维度08-10]` 的 childPaths 索引更新问题；这里 registration 整体被 refresh 清空后不重建。
- **历史模式对应**: form-only lifecycle hook 被复用于 generic validation owner 场景，导致非 form owner refresh 后注册生命周期断裂。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`, `docs/references/form-validation-runtime-types.md`
- **复核状态**: 未复核

### [维度08-12] detail-field 已注册非 form 父验证 owner 子契约，但 confirm 生命周期被 `parentForm` 硬拦截

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:90-96`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:139-193`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:288-300`
- **行号范围**: `detail-field.tsx:90-96`, `139-193`, `288-300`
- **证据片段**:

  ```ts
  useDetailChildValidationContract({
    parentValidationOwner,
    draftForm,
    childOwnerId,
    mode: props.templateNode.validationOwnerPlan?.childContractMode,
    active: open,
  });
  ```

  ```ts
  async function handleConfirm() {
    if (readOnly || !draftForm || !parentForm) return;

    const confirmToken = beginConfirm();
    ...
    const submitValidationResult = await draftForm.validateAll('submit');
  ```

  ```ts
  parentForm.setValue(name, writeback);
  parentForm.touchField(name);
  const fieldValidationResult = await parentForm.validateField(name);
  ```

  ```ts
  validation: {
    kind: 'field',
    ownerResolution: 'create-owner',
    childContractMode: 'summary-gate',
    valueKind: 'object',
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 跨 scope / child owner contract → submit/confirm → commit
- **现状**: `detail-field` 的 validation contributor 声明 `create-owner` + `summary-gate`，运行时也使用 `parentValidationOwner` 注册 child validation contract；但 confirm 入口直接要求 `parentForm` 存在。非 form page-root / surface-root owner 下，draft child owner 可以打开并注册契约，却无法通过 confirm 执行 child submit validation、写回父 owner、发布外部错误或触发父级 revalidation。
- **风险**: generic validation owner 下的 detail-field child owner lifecycle 与 contract 表面存在但不可完成：父 owner 可能持有 active child contract，而用户确认操作 no-op，草稿验证/commit 永远不进入 owner-local 流程。后续 action gating 或 scope summary 可能被一个无法提交的 child owner 卡住，或作者误以为 detail-field 已支持非 form owner create-owner 边界。
- **建议**: 将 confirm 路径改为 `parentForm ?? parentValidationOwner` 双 owner 支持：child draft 先 `validateAll('submit')`，成功后对非 form 父 owner 通过 `applyChangesAndRevalidate({ reason: 'commit' })` 或等价 owner-local write + `validateAt/validateSubtree('commit')` 完成提交；外部错误发布也应走 `ValidationScopeRuntime.applyExternalErrors()`。
- **为什么值得现在做**: detail-field 的 validation metadata 已声明 create-owner；运行时只支持 form parent 会让非 form owner 的已暴露能力变成不可完成流程。
- **误报排除**: 这不是既有 `[维度08-09]` 的 `detail-view` 非 form commit 后不重校验；本条是另一个 renderer `detail-field`，且缺陷更早发生在 confirm 入口被 `!parentForm` 直接拦截，导致 child owner contract 有生命周期入口但没有非 form commit 实现。
- **历史模式对应**: child-owner contract 注册面已泛化到 generic validation owner，但提交生命周期仍硬编码 FormRuntime。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-13] object-field 非 form transformOutAction 写回异步化后，验证先按旧值运行，完成写回后不触发 owner revalidation

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:198-213`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:231-279`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-handlers.tsx:100-106`
- **行号范围**: `object-field.tsx:198-213`, `231-279`, `field-handlers.tsx:100-106`
- **证据片段**:

  ```ts
  const childValidationOwner = React.useMemo(() => {
    if (parentForm || !parentValidationOwner || !name) {
      return parentValidationOwner;
    }

    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: name,
      prefixPath(path) {
        return `${name}.${path}`;
      },
    });
  }, [name, parentForm, parentValidationOwner]);
  ```

  ```ts
  const committedValue = valueAdapter.out(nextWorkingValue, {
    name,
    readOnly: readOnly || Boolean(props.meta.disabled),
    originalValue: rawValue,
    scope: parentScope,
    form: parentForm ?? null,
  });

  if (isPromiseLike(committedValue)) {
    const sequence = nextTransformOutSequence(transformOutOwner);
    ...
    void committedValue
      .then((resolvedCommittedValue: unknown) => {
        ...
        parentScope.update(name, resolvedCommittedValue);
      })
  ```

  ```ts
  if (currentValidationScope) {
    void (async () => {
      await setValue(nextValue);

      if (shouldValidateOnOwner(name, currentValidationScope, 'change')) {
        await currentValidationScope.validateAt(name, 'change');
      }
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 触发 → 执行 → 异步写回 / owner value lifecycle
- **现状**: `object-field` 已为非 form parent owner 创建 projected `ValidationScopeRuntime`，但 `transformOutAction` 为 Promise 时，`writeProjectedValue()` 启动异步写回后立即返回；通用 field handler 随即 `await setValue(nextValue)` 并触发 `validateAt(name, 'change')`。此时父 scope 尚未收到 transformed committed value。Promise 之后只执行 `parentScope.update(name, resolvedCommittedValue)`，没有通过 `parentValidationOwner.applyChangesAndRevalidate(...)` 或再次 `validateSubtree/validateAt` 进入 owner-local revalidation。
- **风险**: 非 form owner 下 object-field 子字段编辑会按旧 parent value 或中间 working value 运行验证，异步 transformOut 真正写回后 owner errors / valid / ready / dependent closure 不刷新。依赖 transformed value 的 requiredWhen、cross-field、aggregate 或 action gating 可能长期停留在提交前状态，形成 schema-runtime 值轴与验证执行时机分裂。
- **建议**: 非 form owner 的 async transformOut 完成后应走 validation owner 写入/重校验路径：优先把写入纳入 `applyChangesAndRevalidate({ writes, changedPaths, reason: 'change' | 'commit' })`；如果仍由 `parentScope.update` 写值，也必须在 resolved writeback 后对 owner-local impacted subtree 触发 system/change revalidation，并在 pending transformOut 期间通过 child contract 或 scope state 暴露 `validating/ready=false`。
- **为什么值得现在做**: object-field 是 composite value owner 的核心路径；异步 transformOut 与 generic validation owner 的顺序错误会造成用户可见的验证状态滞后和 gating 错判。
- **误报排除**: 这不是既有 `[维度08-01]` surface-root owner value snapshot 问题；即使 page-root owner 与 scope store 共享，异步 transformOut 仍会先触发验证、后写回最终值且无后续 revalidation。也不是 `[维度08-09]` detail commit 漏重校验；本条发生在 inline `object-field` projected non-form owner 的 transformOut lifecycle。
- **历史模式对应**: async value adaptation 写回与 validation trigger 分离，完成写回后缺少 owner-local revalidation。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核
