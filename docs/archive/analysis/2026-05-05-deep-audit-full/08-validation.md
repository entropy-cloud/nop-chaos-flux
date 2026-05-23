# 维度 08：验证系统一致性

## 初审

- 初审提出 3 条主线，维度复核后扩展为 4 条保留项。

## 维度复核

- 保留：surface-root validation owner attach 缺口。
- 保留：non-form owner 的 required/validation 展示链仍偏 form-only。
- 保留：inherit-owner 复合字段在 non-form owner 下缺少 validation path rebasing。
- 保留：`code-editor` / `tag-list` 等 renderer 对 non-form owner 的 validation 兼容性缺失。

## 最终结论

### [维度08] surface-root validation owner 创建后未 attach compiled model

- **文件**: `packages/flux-runtime/src/surface-runtime.ts:76-81`, `packages/flux-react/src/schema-renderer.tsx:266-271`, `packages/flux-runtime/src/form-runtime.ts:153-156`
- **证据片段**:
  ```ts
  const validationOwner = input.createValidationOwner?.({
    id: `${surfaceId}-validation`,
    parentScope: scope,
  });
  ```
  ```ts
  page.validationOwner?.refreshCompiledModel(validationPlan);
  ```
- **严重程度**: P1
- **现状**: page-root 有 `refreshCompiledModel(...)` attach 路径，surface-root 没有对等 attach。
- **风险**: surface owner 进入 active 后 `compiledModel` 仍为空，违背验证 owner 生命周期基线。
- **建议**: 为 surface-root owner 增加 bootstrapping/attach/active 的完整生命周期。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: `子项复核通过`

### [维度08] non-form owner 下的 required/validation 展示链仍偏 form-only

- **文件**: `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/hooks.ts`
- **证据片段**:
  ```ts
  // field-frame / hooks 仍主要依赖 form-oriented field state presentation
  ```
- **严重程度**: P2
- **现状**: non-form owner 的动态 required / 错误展示能力仍没有完全闭合。
- **风险**: page-root / surface-root 的 field 级验证呈现不一致。
- **建议**: 将 field presentation 读取路径扩展到通用 `ValidationScopeRuntime`。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: `维度复核通过`

### [维度08] inherit-owner 复合字段在 non-form owner 下缺少 validation path rebasing

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:83-89`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:316-321`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:324-329`
- **证据片段**:
  ```ts
  if (shouldValidateOnOwner(name, currentValidationScope, 'change')) {
    await currentValidationScope.validateAt(name, 'change');
  }
  ```
- **严重程度**: P1
- **现状**: projected child editor 只做了 value rebasing，没有对 validation path 做等价投影。
- **风险**: nested field 在 non-form owner 下按错误 owner-local 路径触发验证。
- **建议**: 为 inherit-owner projected editor 提供对应的 projected `ValidationScopeRuntime`。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: `维度复核通过`

### [维度08] `code-editor` / `tag-list` 仍是 FormRuntime-only 验证参与链

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:30-49`, `packages/flux-renderers-form-advanced/src/tag-list.tsx:40-69`
- **证据片段**:
  ```ts
  if (currentForm && name) {
    currentForm.setValue(name, newValue);
  }
  ```
- **严重程度**: P2
- **现状**: 这类 renderer 在缺少 `currentForm` 时不会回退到 `ValidationScopeRuntime`。
- **风险**: page-root / surface-root owner 下的 blur/change/required 行为断链。
- **建议**: 统一接入 `useCurrentValidationScope()` 并补非 form owner 的 register/validate/touch 路径。
- **参考文档**: `docs/references/form-validation-execution-details.md`
- **复核状态**: `维度复核通过`
