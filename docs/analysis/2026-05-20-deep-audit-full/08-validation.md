# 维度 08: 验证系统一致性

## 第 1 轮（初审）

### [维度08-01] KeyValueRenderer 在默认 blur 策略下仍在每次同步时无条件触发父字段验证

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx`
- **行号范围**: `285-300`
- **证据片段**:

  ```tsx
  const syncField = React.useCallback(
    (nextPairs: KeyValuePair[]) => {
      pairsRef.current = nextPairs;

      if (!currentForm || !name) {
        scope.update(name, nextPairs);
        return;
      }

      if (!currentForm.isTouched(name)) {
        currentForm.touchField(name);
      }

      currentForm.setValue(name, nextPairs);
      void currentForm.validateField(name);
    },
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 触发 / 执行
- **现状**: `syncField()` 在每次 key/value 行输入同步后都调用 `currentForm.validateField(name)`，没有检查 `validateOn` / compiled behavior，也没有传入 `change`、`blur`、`system` 等 reason。
- **风险**: 默认 `validateOn: ['blur']` 的字段会在每个输入变更时执行父字段 aggregate validation；异步规则会以默认/manual reason 进入运行时，破坏文档中“验证触发时机”和 debounce / submit 优先级语义，尤其对 `uniqueKeys`、`minItems` 等数组聚合规则会放大 keystroke 成本。
- **建议**: 与 `field-utils.createFieldHandlers()` / `ArrayEditorRenderer.syncItems()` 对齐：先通过 `shouldValidateOn(name, currentForm, 'change')` 判定，再调用 `currentForm.validateField(name, 'change')`；结构性 add/remove 如需 owner-managed reconciliation，应使用明确的 `system` 或 `commit` reason，而不是省略 reason。
- **为什么值得现在做**: 当前审计基线为 v1 且不接受过渡主路径；该 renderer 已在主路径注册为表单字段，错误触发时机会让后续验证系统调优、debounce、async stale suppression 难以判断真实入口语义。
- **误报排除**: 这不是“React 组件调用 runtime API”本身的问题；问题在于代码完全绕过 compiled `behavior.triggers`，且省略 reason，和同仓 `field-utils` 已有的 `shouldValidateOn(..., 'change')` 模式不一致。
- **历史模式对应**: 对应 `deep-audit-calibration-patterns.md` 的“跨包一致性想法需有实际契约破坏”门槛；本条不是风格差异，而是实际违反 `form-validation.md` 中 showErrorOn 与 validation trigger 分离、debounce reason 语义的 live 行为。
- **参考文档**: `docs/architecture/form-validation.md:225-267`, `docs/architecture/form-validation.md:268-278`, `docs/references/form-validation-execution-details.md:118-183`, `docs/skills/deep-audit-prompts.md:962-984`
- **复核状态**: 未复核

### [维度08-02] KeyValue 子字段按 change/blur 判定后以无 reason 的 manual 验证执行

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx`
- **行号范围**: `112-127,166-181`
- **证据片段**:

  ```tsx
  if (currentForm) {
    currentForm.touchField(keyPath);
    currentForm.setValue(keyPath, event.target.value);

    if (shouldValidateOn(name, currentForm, 'change')) {
      void currentForm.validateField(keyPath);
    }
  }
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 触发 / 执行
- **现状**: 代码用 `shouldValidateOn(..., 'change')` 和 `shouldValidateOn(..., 'blur')` 判断触发策略，但实际执行 `validateField(keyPath)` / `validateField(valuePath)` 时没有传入对应 reason。
- **风险**: async validation 的治理记录、debounce、stale suppression 和 submit/commit supersession 都依赖 reason；省略 reason 会把 change/blur 入口折叠成默认/manual 执行，导致调试快照和优先级仲裁失真。
- **建议**: 在 key 字段 change 路径传 `validateField(keyPath, 'change')`，blur 路径传 `validateField(keyPath, 'blur')`；value 字段同理。
- **为什么值得现在做**: 该问题已处在复合字段的高频输入路径；修复成本低，能让 runtime owner 的 async arbitration 与 UI 触发入口保持一致。
- **误报排除**: 不是要求 renderer 不得触发验证；renderer 可以通过 `FormRuntime` 触发。问题是当前代码已经知道触发类型，却丢弃该类型，直接削弱 `form-validation.md` 对 reason / debounce 的契约。
- **历史模式对应**: 对应“验证 owner 与触发时机漂移”类问题；不属于 `audit-tooling.md` 已有硬门禁覆盖项，需人工按 owner 文档判定。
- **参考文档**: `docs/architecture/form-validation.md:202-213`, `docs/architecture/form-validation.md:268-278`, `docs/architecture/form-validation.md:971-993`, `docs/references/form-validation-execution-details.md:421-442`
- **复核状态**: 未复核

### [维度08-03] ArrayEditor 子字段 change/blur 验证丢失 reason

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- **行号范围**: `106-121`
- **证据片段**:

  ```tsx
  if (currentForm) {
    currentForm.touchField(itemPath);
    currentForm.setValue(itemPath, event.target.value);

    if (shouldValidateOn(name, currentForm, 'change')) {
      void currentForm.validateField(itemPath);
    }
  }
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 触发 / 执行
- **现状**: `ArrayEditorRow` 在 change / blur 分支中分别检查 `shouldValidateOn(..., 'change')` 和 `shouldValidateOn(..., 'blur')`，但调用 `validateField(itemPath)` 时没有传入对应 reason。
- **风险**: 对配置了 async rule / debounce 的数组子项，change 和 blur 入口会在 runtime 中表现为默认/manual 验证；后续 submit/commit supersede、async governance 调试、pending debounce 统计都会缺少准确 cause。
- **建议**: change 分支改为 `currentForm.validateField(itemPath, 'change')`，blur 分支改为 `currentForm.validateField(itemPath, 'blur')`；父数组 aggregate 验证也应按结构操作语义显式传入 `change` 或 `system`。
- **为什么值得现在做**: 数组编辑是高频复合字段路径；不修复会让后续大表/数组 aggregate validation 的性能策略被 manual 入口噪音污染。
- **误报排除**: `ArrayEditor` 的本地 `itemsRef` 是交互缓存，不是本条发现；本条只针对已确认应验证时丢失 reason 的 runtime API 调用。
- **历史模式对应**: 对应 `form-validation.md` 中“validation entry arbitration is owner-local”的历史收敛点；该入口绕过了 owner 需要的 reason 信息。
- **参考文档**: `docs/architecture/form-validation.md:202-213`, `docs/architecture/form-validation.md:268-278`, `docs/references/form-validation-execution-details.md:421-442`
- **复核状态**: 未复核

### [维度08-04] TagList form 分支按 change 触发却以无 reason 验证执行

- **文件**: `packages/flux-renderers-form-advanced/src/tag-list.tsx`
- **行号范围**: `37-49,116-121`
- **证据片段**:

  ```tsx
  const syncErrorVisibility = React.useCallback(() => {
    if (!name) {
      return;
    }

    if (currentForm && shouldValidateOn(name, currentForm, 'change')) {
      void currentForm.validateField(name);
      return;
    }

    if (
      currentValidationScope?.touchField &&
      shouldValidateOnOwner(name, currentValidationScope, 'change')
    ) {
      void currentValidationScope.validateAt(name, 'change');
    }
  }, [currentForm, currentValidationScope, name]);
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 触发 / 执行
- **现状**: non-form owner 分支正确传入 `validateAt(name, 'change')`，但 form 分支在同一个 change 判定后调用 `validateField(name)`，丢失 change reason。
- **风险**: 同一组件在 form owner 与 non-form `ValidationScopeRuntime` 下产生不同 validation cause；异步验证、debounce、调试快照和 stale suppression 会因为 owner 类型不同而表现不一致。
- **建议**: 将 form 分支改为 `currentForm.validateField(name, 'change')`，并给 fire-and-forget promise 接入与 `field-utils.attachValidationRejectionHandler` 等价的结构化失败报告。
- **为什么值得现在做**: `form-validation.md` 明确 FormRuntime 是 ValidationScopeRuntime 的 specialization，不应出现同一 change 入口在 form/non-form owner 下 reason 不一致。
- **误报排除**: 这不是要求 tag-list 必须复用 `useFormFieldController` 的全部事件链；证据显示同一函数内 non-form 分支已经正确传 reason，因此 form 分支省略 reason 是具体实现偏差。
- **历史模式对应**: 对应“FormRuntime 不应成为与 ValidationScopeRuntime 语义分叉的特殊路径”；不属于 reopened adjudications 中已裁定可接受的 FieldFrame 或 surface 双状态问题。
- **参考文档**: `docs/architecture/form-validation.md:124-125`, `docs/architecture/form-validation.md:268-278`, `docs/architecture/form-validation.md:988-993`, `docs/references/form-validation-runtime-types.md:319-331`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度08-05] ArrayEditor 父数组 change 判定后以无 reason 的 manual 验证执行

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- **行号范围**: `251-268,382-387`
- **证据片段**:

  ```tsx
  currentForm.setValue(name, nextItems);

  if (shouldValidateOn(name, currentForm, 'change')) {
    void currentForm.validateField(name);
  }
  ```

  ```tsx
  currentForm.appendValue(name, nextItem);

  if (shouldValidateOn(name, currentForm, 'change')) {
    void currentForm.validateField(name);
  }
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 触发 / 执行
- **现状**: `ArrayEditor` 父数组 aggregate 路径已经按 `change` 判断 `shouldValidateOn(...)`，但执行时调用 `validateField(name)` 未传入 `'change'`。
- **风险**: 数组级 async / debounce / stale suppression 会把明确的 change 入口记录成默认 manual 入口；与 `field-utils.createFieldHandlers()` 的 `validateField(name, 'change')` 主路径不一致。
- **建议**: 将父数组同步与 add 分支改为 `currentForm.validateField(name, 'change')`，并接入结构化 rejection handler。
- **为什么值得现在做**: 当前第 1 轮已确认多个 advanced form renderer 在 reason 传递上漂移；父数组 aggregate validation 是数组规则和 async 治理的入口，修复能一次性收敛复合字段主路径的 cause fidelity。
- **误报排除**: 这不是重复 08-03 的子字段问题；08-03 覆盖 `itemPath` 子项，本条覆盖父数组 `name` 的 aggregate validation 入口。
- **历史模式对应**: 对应 `deep-audit-calibration-patterns.md` 的“跨包一致性想法需有实际契约破坏”门槛；本条不是单纯风格差异，而是已知 `change` 触发语义在执行时被丢弃。
- **参考文档**: `docs/architecture/form-validation.md:202-213`, `docs/architecture/form-validation.md:268-278`, `docs/references/form-validation-execution-details.md:118-183`
- **复核状态**: 未复核

### [维度08-06] ArrayEditor 删除分支无条件 validateSubtree 且丢失结构变更 reason

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- **行号范围**: `273-284`
- **证据片段**:

  ```tsx
  if (currentForm && name) {
    currentForm.removeValue(name, index);
    void currentForm.validateSubtree(name);
    return;
  }

  syncItems(nextItems);
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 触发 / 执行
- **现状**: 删除数组项后直接 `validateSubtree(name)`，没有检查 `validateOn`，也没有传入 `change` / `system` 等 reason。
- **风险**: 默认 blur 策略下删除也会立即执行 subtree validation；结构性变更进入 runtime 时表现为 manual，破坏 `system` 用于 array structural follow-up 的诊断与 debounce 语义。
- **建议**: 明确删除属于用户 `change` 还是 owner-managed `system`，并传入对应 reason；如仍需受字段触发策略控制，应先通过 `shouldValidateOn(name, currentForm, 'change')` 判定。
- **为什么值得现在做**: 第 1 轮已暴露 `validateField` reason 丢失会污染 async arbitration；`validateSubtree` 是更大范围入口，若保持 manual/无门控，会继续掩盖结构变更与用户输入触发之间的差异。
- **误报排除**: `removeValue()` 本身会处理数组值与索引 remap；本条只针对 renderer 额外触发的 subtree validation 时机与 reason 漂移。
- **历史模式对应**: 对应“验证 owner 与触发时机漂移”类问题；不是机械要求所有结构操作都延迟验证，而是当前代码显式触发 subtree validation 却没有携带 owner 需要的 reason。
- **参考文档**: `docs/architecture/form-validation.md:202-213`, `docs/architecture/form-validation.md:268-278`, `docs/references/form-validation-execution-details.md:137-150`
- **复核状态**: 未复核

### [维度08-07] ArrayField add/remove 结构操作验证生命周期不对称

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- **行号范围**: `423-445`
- **证据片段**:

  ```tsx
  function handleAdd() {
    if (parentForm) {
      const newItem = itemKind === 'scalar' ? '' : {};
      ...
      parentForm.appendValue(name, newItem);
    }
  }
  ...
  parentForm.removeValue(name, index);
  void parentForm.validateSubtree(name);
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 触发 / 执行
- **现状**: 同一 `array-field` 的 add 只 append value，不直接验证当前数组 subtree；remove 则无条件 `validateSubtree(name)` 且无 reason。
- **风险**: 同一结构字段的新增和删除会产生不同 validation lifecycle：新增依赖后续 blur/submit 或 dependent revalidation，删除立即 manual subtree validation；这会让数组级规则、scalar child required、async 诊断在结构操作间表现不一致。
- **建议**: 统一 add/remove 的结构变更策略；若结构变更需要 owner follow-up，显式使用 `validateSubtree(name, 'system')`，若视作用户输入则按 `change` 触发策略并传入 `'change'`。
- **为什么值得现在做**: `array-field` 是复合字段主路径，且已包含 projected owner、child contract 和 scalar child registration；结构操作验证语义不统一会让后续 owner 边界和 submit/commit 收敛继续受到噪音干扰。
- **误报排除**: 这不是要求 `array-field` 强制每次 add 都显示错误；问题在于同一 renderer 内结构操作的 validation 触发和 reason 不一致，且 remove 已实际执行了无 reason subtree validation。
- **历史模式对应**: 对应 reopened adjudications 中“旧问题 vs 新 residual”的判断要求；本条不是重开历史 child-contract 边界问题，而是当前 live add/remove validation lifecycle 的新 residual。
- **参考文档**: `docs/architecture/form-validation.md:202-213`, `docs/architecture/form-validation.md:268-278`, `docs/references/form-validation-execution-details.md:137-150`, `docs/architecture/form-validation.md:1000-1081`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度08-08] projected FormRuntime 继承父 applyExternalErrors，导致子树外部错误未按 ownerRootPath 重映射

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\projected-form-runtime.ts:200-249`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\value-adaptation-helper.ts:92-117`
- **行号范围**: `projected-form-runtime.ts:200-249`, `value-adaptation-helper.ts:92-117`
- **证据片段**:

  ```ts
  const proxy: FormRuntime = {
    ...parentForm,
    ...
    validateField(path, reason) {
      return parentForm.validateField(options.prefixPath(path), reason);
    },
    applyChangesAndRevalidate(input) {
      return parentForm.applyChangesAndRevalidate({
  ```

  ```ts
  form.applyExternalErrors({
    sourceId: `value-adaptation:${fieldPath}`,
    errors: issues.map((issue) => ({
      path: issue.path ?? fieldPath,
      message: issue.message,
      rule: 'async',
      sourceKind: 'runtime-overlay' as const,
    })),
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 结果展示 / owner 错误归属
- **现状**: `createProjectedFormRuntime()` 对 `validateAt`、`validateField`、`applyChangesAndRevalidate` 等路径敏感 API 做了 `prefixPath(...)` 重映射，但没有覆盖 `applyExternalErrors(...)`；由于 proxy 先 `...parentForm`，子树中的 `FormRuntime.applyExternalErrors` 会直接调用父 form 方法并接收相对路径。
- **风险**: 嵌套在 `object-field` / `variant-field` projected form 下的 detail/value-adaptation 或其他子控件把外部错误写到 `name` 这类相对路径时，父 owner 会把错误挂到错误的父级路径，或在非根 owner 下被 containment 规则拒绝；这破坏 `applyExternalErrors(...)` 必须 owner-local 且路径归属明确的契约，导致服务端/动作校验错误不显示、显示到 sibling 字段，或错误清理跟随错误路径执行。
- **建议**: 在 `createProjectedFormRuntime()` 中显式覆盖 `applyExternalErrors(input)`，按 `createProjectedValidationRuntime()` 的做法重映射 `error.path` 与 `error.ownerPath`；补充回归测试：在 `object-field` / `variant-field` 内嵌带 `validateValueAction` 或外部错误注入的 child renderer，确认错误落到父 owner 的绝对路径。
- **误报排除**: 这不是要求 projected form 成为独立 owner；当前代码已经明确对 validate、register、writes 做投影，说明该 proxy 的契约就是“子树相对路径读写，父 owner 绝对路径存储”。`createProjectedValidationRuntime()` 已正确映射 `applyExternalErrors`，问题仅存在于 `FormRuntime` 投影分支。
- **参考文档**: `docs/architecture/form-validation.md:531-548`, `docs/architecture/form-validation.md:387-392`, `docs/references/form-validation-execution-details.md:744-756`
- **复核状态**: 未复核

### [维度08-09] projected FormRuntime 未覆盖 updateFieldRegistration，动态 childPaths 更新会绕过路径重映射

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\projected-form-runtime.ts:192-198,306-310`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:279-282`
- **行号范围**: `projected-form-runtime.ts:192-198,306-310`, `key-value.tsx:279-282`
- **证据片段**:

  ```ts
  function mapRegistration(registration: RuntimeFieldRegistration): RuntimeFieldRegistration {
    return {
      ...registration,
      path: options.prefixPath(registration.path),
      childPaths: registration.childPaths?.map((path) => mapChildPath(path)),
    };
  }
  ```

  ```ts
  registerField(registration): FieldRegistrationHandle {
    return parentForm.registerField(mapRegistration(registration));
  },
  notifyFieldHidden(path, hidden) {
    parentForm.notifyFieldHidden(options.prefixPath(path), hidden);
  },
  ```

  ```tsx
  if (registrationRef.current) {
    currentForm?.updateFieldRegistration(registrationRef.current.registrationId, { childPaths });
  }
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 注册 / 执行
- **现状**: 初始 `registerField(...)` 会把 projected form 的相对 `path` / `childPaths` 转成父 owner 绝对路径，但 proxy 没有覆盖 `updateFieldRegistration(...)`；动态复合字段（如 `key-value`）在 childPaths 随行数变化后调用当前 form 的 `updateFieldRegistration`，实际会落到父 form 原方法并传入未 prefix 的相对 childPaths。
- **风险**: 在 `object-field` / `variant-field` 等 projected form 内嵌 `key-value`、`array-editor` 一类动态 childPaths 控件时，父 owner 的 `childPathToRegistrationId` 会记录相对路径，或因 containment 检查拒绝更新；随后 `validateField(profile.meta.0.key)` 无法找到 runtime `validateChild`，子字段 required/opaque runtime validation 静默失效，且 unregister/隐藏清理也会按错误 child path 清理。
- **建议**: 在 `createProjectedFormRuntime()` 中覆盖 `updateFieldRegistration(registrationId, patch)`，对 `patch.childPaths` 使用 `mapChildPath(...)` 重映射，并保持 `patch.path` 不允许改写的约束；补充 nested projected form 回归测试，覆盖 `key-value` 添加/删除后子字段 validation 仍按父 owner 绝对路径执行。
- **误报排除**: 这不是重复报告 `key-value` 的 reason 丢失问题；本条针对 projected form 的注册路径一致性。`createProjectedValidationRuntime()` 已有 `updateFieldRegistration` 映射实现，说明该 API 在 projected owner 上确实需要重映射，当前 `FormRuntime` proxy 是缺口。
- **参考文档**: `docs/architecture/form-validation.md:279-285`, `docs/architecture/form-validation.md:387-392`, `docs/references/form-validation-execution-details.md:510-520`
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度08-01]: 保留 (P1)。`packages/flux-renderers-form-advanced/src/key-value.tsx:285-300` 的 `syncField()` 仍在每次同步时无条件 `validateField(name)`，没有按 `validateOn`/reason 收口。
- [维度08-02]: 保留 (P2)。`key-value.tsx:112-127,166-181` 仍先用 `shouldValidateOn(..., 'change'/'blur')` 判定，再以无 reason 的 `validateField(keyPath/valuePath)` 执行。
- [维度08-03]: 保留 (P2)。`packages/flux-renderers-form-advanced/src/array-editor.tsx:106-121` 的子项 change/blur 验证仍未传 `reason`。
- [维度08-04]: 保留 (P2)。`packages/flux-renderers-form-advanced/src/tag-list.tsx:37-49` 中 non-form owner 分支传了 `'change'`，form 分支仍是无 reason `validateField(name)`，owner 语义分叉依旧存在。
- [维度08-05]: 保留 (P2)。`array-editor.tsx:251-268,382-387` 的父数组 aggregate validation 仍在 `shouldValidateOn(..., 'change')` 后调用无 reason `validateField(name)`。
- [维度08-06]: 保留 (P2)。`array-editor.tsx:273-284` 删除分支仍无条件 `validateSubtree(name)`，既无 trigger gate，也无结构变更 reason。
- [维度08-07]: 保留 (P2)。`packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:423-446` 仍是 add 只 append、remove 立即 `validateSubtree(name)`，结构操作验证生命周期不对称。
- [维度08-08]: 保留 (P1)。`packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts:200-320` 仍未覆盖 `applyExternalErrors(...)` 的路径重映射，而 `value-adaptation-helper.ts:92-118` 会从 projected form 直接写相对路径错误。
- [维度08-09]: 保留 (P1)。同一 projected form proxy 仍未覆盖 `updateFieldRegistration(...)`；而 `key-value.tsx:279-282` 会在动态 `childPaths` 变更时调用该 API，导致 projected path mapping 缺口继续存在。

## 子项复核结论

- [维度08-01] 至 [维度08-09]: 均成立。复核后仍可归为两组主问题：动态字段/数组类控件的 validation reason 与 trigger gate 未收口；projected form runtime 的 path remapping contract 仍不完整。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                      | 一句话摘要                                                       |
| ----- | -------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 08-01 | P1       | `packages/flux-renderers-form-advanced/src/key-value.tsx:285-300`                         | key-value syncField 仍无条件触发 `validateField(name)`           |
| 08-02 | P2       | `packages/flux-renderers-form-advanced/src/key-value.tsx:112-127,166-181`                 | key-value change/blur 验证仍不传 reason                          |
| 08-03 | P2       | `packages/flux-renderers-form-advanced/src/array-editor.tsx:106-121`                      | array-editor 子项 change/blur 验证仍不传 reason                  |
| 08-04 | P2       | `packages/flux-renderers-form-advanced/src/tag-list.tsx:37-49`                            | tag-list form/non-form owner validation reason 语义分叉          |
| 08-05 | P2       | `packages/flux-renderers-form-advanced/src/array-editor.tsx:251-268,382-387`              | array aggregate validation 仍在 trigger gate 后无 reason 调用    |
| 08-06 | P2       | `packages/flux-renderers-form-advanced/src/array-editor.tsx:273-284`                      | 删除分支仍无条件 `validateSubtree(name)`                         |
| 08-07 | P2       | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:423-446`       | array-field add/remove 结构操作验证生命周期不对称                |
| 08-08 | P1       | `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts:200-320` | projected form runtime 仍未 remap `applyExternalErrors(...)`     |
| 08-09 | P1       | `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts:200-320` | projected form runtime 仍未 remap `updateFieldRegistration(...)` |
