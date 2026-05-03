# 维度 08：验证系统一致性

## 初审摘要

- 初审在注册、触发、执行三个阶段发现 3 条高风险验证契约问题。
- 编译与结果展示阶段初审为零发现。

## 维度复核结论

- 3 条问题均被独立复核保留或降级保留，并已分别完成子项复核。
- 编译和结果展示零发现成立。

## 通过复核的结论

### [维度08] runtime field registration 缺少 path containment 校验

- **文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:115-136`; 参照 `packages/flux-runtime/src/form-runtime.ts:237-240`
- **证据片段**:

```ts
115:   const existingId = pathToRegistrationId.get(registration.path);
124:   const registrationId = nextRegistrationId();
127:   runtimeFieldRegistrations.set(registrationId, {
132:   pathToRegistrationId.set(registration.path, registrationId);
134:   if (registration.childPaths) {
135:     for (const childPath of registration.childPaths) {
136:       childPathToRegistrationId.set(childPath, registrationId);
```

- **严重程度**: P2
- **现状**: registration 与 childPaths 被接纳前未校验是否落在当前 owner subtree 内。
- **风险**: foreign path 会污染当前 owner 的参与集与校验目标集合。
- **建议**: 在 `registerField` / `updateFieldRegistration` 中统一做 `isPathOwned(...)` containment 校验。
- **复核状态**: 子项复核通过

### [维度08] 普通验证与 submit 入口缺少 bootstrapping 生命周期门控

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:379-389`; `packages/flux-runtime/src/form-runtime-submit-flow.ts:80-90`, `:131-134`
- **证据片段**:

```ts
379:   if (sharedState.lifecycleState === 'disposed') {
380:     return createValidationResult([]);
381:   }
```

```ts
80:   if (sharedState.lifecycleState === 'disposed') {
88:   const { store, runtimeFieldRegistrations } = sharedState;
89:   setIsSubmitting(true);
```

- **严重程度**: P2
- **现状**: 普通 validation 与 submit 仅拦截 `disposed`，未按 baseline 对 `bootstrapping` 做等待/延迟门控。
- **风险**: owner 未 active 时可能提前写 touched/validation state 或过早进入 submit 流程。
- **建议**: 为 `validateAt/validateAll/submit` 增加 bootstrapping 等待或显式 reject 语义。
- **复核状态**: 子项复核通过

### [维度08] debounce 已调度但未启动时未计入 owner validating/ready 语义

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:105-120`, `:225-242`; `packages/flux-runtime/src/form-runtime-owner.ts:63-73`
- **证据片段**:

```ts
105: export function waitForValidationDebounce(
118:   return scheduleDebounce(sharedState.pendingValidationDebounces, path, debounce, () => {
119:     return sharedState.validationRuns.get(path) === runId;
120:   });
```

```ts
63:     let hasErrors = false;
64:     let isValidating = false;
66:     for (const fs of Object.values(fieldStates)) {
68:       if (fs.validating) isValidating = true;
72:     const valid = !hasErrors;
73:     const ready = lifecycleState === 'active' && valid && !isValidating;
```

- **严重程度**: P2
- **现状**: debounce 已排队时不会立即影响 `validating`，而 `ready` 直接依赖 `!validating`。
- **风险**: 外部会过早看到 `ready:true` / `validating:false`，与文档定义不一致。
- **建议**: 将已调度 debounce 计入 owner pending validation 语义。
- **复核状态**: 子项复核通过
