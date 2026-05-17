# 维度 19：错误传播保真度 — 审计报告

## 第 1 轮（初审）

### [维度19-01] form-runtime-owner 吞没验证错误原因 (P1)

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:399-411`
- **现状**: catch 后 `console.error` 但不保留 cause
- **建议**: 添加 `cause: error` 到 validationError

### [维度19-02] form-runtime-validation 吞没 VALIDATION_CANCELLED (P2)

- **文件**: `form-runtime-validation.ts:533`
- **建议**: 返回 `cancelled: true` 标志

### [维度19-03] form-runtime-validation 无 cause 的 catch (P1)

- **文件**: `form-runtime-validation.ts:433`
- **现状**: `new Error(String(error))` 不保留 cause
- **建议**: 使用 `{ cause: error }`

### [维度19-04] runtime-action-helpers 原因丢失 (P1)

- **文件**: `runtime-action-helpers.ts:48-53`
- **建议**: 添加 `{ cause: result.error }`

### [维度19-05] flux-value-shape-validation 诊断静默 (P2)

- **建议**: 添加文档说明原因

### [维度19-06] api-data-source-controller-state 部分吞没 (P2)

- **建议**: 通过 monitor API 添加日志

### 已正确处理的好模式

- import-stack.ts: catch + createImportError + 完整诊断链 ✅
- runtime-factory.ts: catch + new Error(msg, { cause }) + 保留栈 ✅
- action-execution.ts: catch + reportActionError + { ok: false, error } ✅
- operation-control.ts: catch + withRetryMetadata ✅
