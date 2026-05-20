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
