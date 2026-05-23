# 维度 06：异步模式与取消安全

- 初审发现：2
- 维度复核：完成
- 子项复核：2

## 保留

1. [子项复核通过] `executeFormSubmit()` 仍有若干 pre-`try/finally` 的 abort / reject 路径会绕过统一清理，导致 `submitting` 可能卡住。
   文件：`packages/flux-runtime/src/form-runtime-submit-flow.ts:106-120,148-189,218-250,252-293`
   关键补充：child contract `triggerValidation()` 的 reject 也会在清理前逃逸。
   严重程度：P1

2. [子项复核通过] `validateForm()` 使用 `Promise.allSettled(...)` 后直接跳过 rejected field-validation promise，可能让 validator crash 被静默吞掉并继续 submit。
   文件：`packages/flux-runtime/src/form-runtime-owner.ts:251-285,391-395`、`packages/flux-runtime/src/form-runtime-validation.ts:444-451`、`packages/flux-runtime/src/form-runtime-submit-flow.ts:148-180,243-254`
   相关测试：`packages/flux-runtime/src/__tests__/form-validation-resilience.test.ts:77-106`
   严重程度：P1

## 复核摘要

- 本轮未发现 `eval/new Function` 级别的安全红线，但 submit/validation 的异常治理仍存在两个真实高优先级问题。
