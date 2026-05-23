# 08 验证系统一致性

- 初审发现数: 2
- 维度复核: 完成
- 子项复核: 2
- 最终结果: 保留 2 / 降级 0 / 驳回 0

## 保留

### [维度08] hidden participation 未覆盖 runtime-registration 路径

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:411-438`, `packages/flux-runtime/src/form-runtime-field-ops.ts:239-287`
- **证据片段**:

  ```ts
  if (field && !field.hiddenFieldPolicy.validateWhenHidden) {
    const isHidden = sharedState.hiddenFields.has(path);
    if (isHidden) {
      return createValidationResult([]);
    }
  }

  if (!field && runtimeTarget.childPath && runtimeRegistration?.validateChild) {
    return validateRuntimeRegistrationChild(...);
  }
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 执行
- **现状**: hidden skip 只对 compiled field 分支生效，runtime-registration root/child 验证仍会继续执行。
- **风险**: 隐藏的 runtime-registered 字段仍可能重新产错或维持 validating，违背 hidden participation 契约。
- **建议**: 在 runtime-registration 分支同样接入 hidden participation 判定与清理。
- **为什么值得现在做**: 这是 owner-level 契约缺口，不只影响单一 renderer。
- **误报排除**: 子项复核确认 `notifyFieldHidden(...)` 已记录 hidden path，但后续 runtime-registration 校验并不会读取该状态。
- **历史模式对应**: owner 规则只在 compiled-field 主路径落地，旁路分支遗漏。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 子项复核通过

### [维度08] non-form validation owner 下 dynamic required 展示只读 form store

- **文件**: `packages/flux-react/src/field-frame.tsx:102-124`, `packages/flux-react/src/hooks.ts:275-289`
- **证据片段**:
  ```tsx
  const validationModel = currentForm?.validation ?? currentValidationScope?.validation;
  const dynamicRequired = useCurrentFormState(...);
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 结果展示
- **现状**: `FieldFrame` 已允许 `currentValidationScope?.validation`，但 dynamic required 的值订阅仍只走 `useCurrentFormState()`。
- **风险**: 在 page-root / surface-root 这类 non-form owner 下，真实 requiredness 已由 validation owner 计算，但 UI 星标不会跟随更新。
- **建议**: dynamic required 改为使用 validation-owner store fallback，而不是仅依赖 form store。
- **为什么值得现在做**: 这是 live baseline 已支持的 non-form validation owner 与 UI 展示层之间的真实失配。
- **误报排除**: 子项复核确认 field-state/error hooks 已有 validation-store fallback，因此这里的缺口不是架构尚未支持，而是展示路径漏接。
- **历史模式对应**: owner truth 已共享，UI 壳层仍停留在 form-only 读取模型。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 子项复核通过
