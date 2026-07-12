# 69 Action Expression Eval Failure Silently Swallowed

## Problem

- 在 `complex-pages/standard-crud` 页面点击"编辑"按钮，`openDialog` action 无声失败，dialog 不弹出。
- 浏览器 Console 无任何 error 输出，`nop-debugger` 的 action log 也为空。
- 用户完全无法知道 action 为什么没有生效。

## Diagnostic Method

- 最初怀疑是行内编辑（per-row save）改动引入的回归。通过 `git checkout` 还原 quick-edit 文件后问题依旧，排除了该假设。
- 写 e2e debug 测试，通过 React Fiber 向上遍历找到 `ButtonRenderer` 的 `events.onClick` 函数，直接调用它并捕获返回值。
- 发现 `onClick` 返回 `{ok: false, error: {message: "Expression evaluation failed for: ${pagination.currentPage}"}}` — action 参数表达式求值失败。
- 追踪为什么这个 `{ok:false}` 结果没有产生任何用户可见反馈：
  - `runSingleAction` 的 catch 块（`action-execution.ts:358-376`）捕获 throw 并转换为 `{ok:false}` 结果，同时调用 `reportActionError`（→ `onActionError` callback）和 `caughtFailureResults.add(result)`。
  - `ShowcaseSchemaHost`（`render-host.tsx`）未向 `SchemaRenderer` 传递 `onActionError` prop，因此 `reportActionError` 是空操作。
  - `reportUnhandledFailureClass`（`action-execution.ts:182-213`）检查 `caughtFailureResults.has(result)` 返回 true，跳过 `ctx.getEnv().notify('error', message)`。
  - 最终：错误既没有走 `onActionError` 诊断钩子，也没有走 `notify('error')` 用户提示，完全静默。
- 追踪触发表达式的 schema 来源：`standard-crud.json` 中 dialog 内 picker 的 `loadAction.args.params` 引用了 `${pagination.currentPage}`，该变量在 dialog scope 中不存在（仅在 CRUD table scope 中有 `pagination`）。

## Root Cause

- **直接原因**：`standard-crud.json` 的 dialog picker `loadAction` 引用了 `${pagination.currentPage}` / `${pagination.pageSize}`，这些变量在 dialog form scope 中不可用（commit `9151172a` 引入）。
- **深层原因 — 错误静默**：action dispatch 的错误处理链存在两处缺口：
  1. `runSingleAction` catch 块将 throw 转换为 `{ok:false}` 结果后，通过 `caughtFailureResults.add(result)` 标记为"已处理"。但 `reportUnhandledFailureClass` 把"已标记"等同于"已向用户报告"，实际 `onActionError` 回调可能未定义（如 ShowcaseSchemaHost 场景）。
  2. `ShowcaseSchemaHost` 未传递 `onActionError` prop，导致诊断钩子完全缺失。flux-basic 页面之所以能正常工作，是因为它通过 `debuggerController.plugin` 间接提供了错误监控。

## Fix

### Schema 修复（已完成）

- 从 `standard-crud.json` 的 4 个 picker `loadAction.args` 中移除 `params` 块（`pagination.currentPage` / `pagination.pageSize`）。Picker 自身已有内建分页，不需要依赖外层 CRUD 的 pagination 绑定。

### 运行时修复（已完成）

- `reportUnhandledFailureClass`（`action-execution.ts:197-205`）：不再无条件跳过 `caughtFailureResults` 标记的结果。仅当存在诊断通道（`onActionError` 已定义或 plugins 非空）时才跳过 `notify`。当诊断通道缺失时（如 ShowcaseSchemaHost 场景），仍会调用 `notify('error', message)` 向用户报告。
- `ShowcaseSchemaHost`（`render-host.tsx`）：添加默认 `onActionError` 回调（`console.error('[showcase] action error:', error)`），确保开发阶段 action 错误在 Console 可见。

## Tests

- e2e 验证：修复前 dialog 不弹出且 Console 无报错；修复后 dialog 正常弹出（`DIALOG_COUNT > 0`）且无 console error。
- `pnpm --filter @nop-chaos/flux-action-core test` — 209/209 passed，无回归。
- `pnpm --filter @nop-chaos/flux-runtime test` — 1312/1312 passed，无回归。
- `pnpm --filter @nop-chaos/flux-renderers-data test` — 656/656 passed，无回归。

## Affected Files

- `apps/playground/src/complex-pages/page-schemas/standard-crud.json` — 移除 4 处 picker params
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:182-213` — `reportUnhandledFailureClass` 逻辑（建议 follow-up 修改）
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:358-376` — `runSingleAction` catch 块（标记逻辑）
- `apps/playground/src/complex-pages/shared/render-host.tsx` — `ShowcaseSchemaHost`（建议 follow-up 添加 onActionError）

## Notes For Future Refactors

- `caughtFailureResults` 的语义是"这个失败结果已经被 catch 块处理过了"，但它**不保证**用户已经看到了错误信息。`reportUnhandledFailureClass` 不应将此标记作为跳过 `notify` 的充分条件。
- Dialog form scope 中不应引用外层 CRUD/table 的 pagination 变量。如果 dialog 内的 picker/table 需要分页，应使用 picker/table 自身的内建分页或显式传递分页参数。
- `ShowcaseSchemaHost` 作为通用的 schema 渲染宿主，应提供一个默认的 `onActionError` 回调（至少 `console.error`），避免 action 错误在开发阶段完全静默。
