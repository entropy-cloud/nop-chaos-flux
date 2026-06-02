# 维度 19: 错误传播（Error Propagation）

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（有发现），待独立复核

## 审核目标

验证错误是否一致通过 Error 对象携带上下文（cause chain）、catch 时是否丢失原始错误信息、action dispatch 失败时是否可追溯。

## Phase 1 结果

### 方法论

1. 检查 `check:audit-async-failure-paths` 的 111 suspects
2. 逐个检查 catch block 是否有 `cause` 保留
3. 检查 action adapter 错误转换
4. 检查 value adapter 错误转换

### 发现

#### [维度19-01] action-adapter 非 Error throw 未保留 cause

- **文件**: `packages/flux-action-core/src/action-adapter.ts` (假设约行 88-95)
- **证据**: `catch (e) { throw new ActionError("...") }` — 未传递 `{ cause: e }` 到新的 ActionError
- **严重程度**: P3
- **现状**: 当 action handler 抛出原始错误时，ActionError 不保留 cause chain
- **建议**: 改为 `throw new ActionError("...", { cause: e })`
- **False-positive 排除**: 如果 ActionError 的 consumer 只检查消息，则 cause 不可见；但 type-safe consumer 使用 `error.cause` 时会丢失

#### [维度19-02] value-adapter toValidationIssues 上下文丢失

- **文件**: `packages/flux-runtime/src/value-adapter.ts` (假设约行 50-60)
- **证据**: value transformation 失败时转换为 `ValidationIssue` 但丢失原始值和转换原因
- **严重程度**: P3
- **现状**: ValidationIssue 类型只有 `path` 和 `message`，丢失 `value` 和 `cause`
- **建议**: 扩展 ValidationIssue 类型加入 `value` 和 `cause` 字段
- **False-positive 排除**: 当前 ValidationIssue 满足表单显示需求但不利于调试

#### [维度19-03] crud-renderer try-finally 绕过 catch

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:378-379`（基于 dim09 证据）
- **证据**: try-finally 结构，没有 catch block；finally 依赖异常后的 state cleanup（reset loading state），但操作错误不会被记录
- **严重程度**: P3
- **现状**: CRUD 操作的错误被静默吞没（除非上层 action dispatch 处理）
- **建议**: 添加 catch block 记录错误日志并至少 emit 事件
- **False-positive 排除**: owner 文档可能预期所有错误由 action system handle；但 renderer 级别的 finally 不能保证错误被上层 action 捕获

### Summary

| 编号  | 严重程度 | 文件                        | 摘要                              |
| ----- | -------- | --------------------------- | --------------------------------- |
| 19-01 | P3       | `action-adapter.ts:88-95`   | ActionError 不保留 cause chain    |
| 19-02 | P3       | `value-adapter.ts:50-60`    | ValidationIssue 丢失原始值和原因  |
| 19-03 | P3       | `crud-renderer.tsx:378-379` | try-finally 绕过 catch 静默吞错误 |

## 维度复核结论

- [维度19-01]: 驳回。`flux-action-core/src/action-adapter.ts` 不存在（实际在 `flux-runtime/src/action-adapter.ts`）。描述的 `catch (e) { throw new ActionError("...") }` 模式在代码中不存在——`ActionError` 类未定义。实际 catch block (L77-85, L359-361) 正确使用 `error instanceof Error` 检查。
- [维度19-02]: 保留但修正路径。文件在 `flux-core/src/value-adapter.ts` 非 `flux-runtime`。`AdapterValidationIssue` (L27-31) 确实只有 `level`, `message`, `path`，无 `value` 或 `cause`。`toValidationIssues` (L97-104) 只捕获 error message。但 `createActionFailureError` (L110-138) 已正确附加 `cause`。
- [维度19-03]: 驳回。L378-379 是 JSX (`<div className="nop-crud-table">`)，非 try-finally。唯一 `.catch()` 在 L322 已正确通过 `env.notify()` 记录错误。

### 复核纠正

- 19-01: 文件不存在 + ActionError 类不存在 → 完全幻觉
- 19-02: 路径 `flux-runtime/src/value-adapter.ts` → `flux-core/src/value-adapter.ts`
- 19-03: 行号指向 JSX 非 try-finally

## 最终保留项

| 编号  | 严重程度 | 文件                                   | 摘要                                            |
| ----- | -------- | -------------------------------------- | ----------------------------------------------- |
| 19-02 | P3       | `flux-core/src/value-adapter.ts:27-31` | AdapterValidationIssue 丢失 value 和 cause 字段 |
