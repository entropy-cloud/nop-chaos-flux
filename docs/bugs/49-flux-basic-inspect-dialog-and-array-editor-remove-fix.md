# 49 Flux Basic Inspect Dialog And ArrayEditor Remove Fix

## Problem

- `apps/playground` 的 `#/flux-basic` 页面里，表格行内 `Inspect` 按钮点击后没有弹出 `User Details` 对话框。
- 同页 `Submit only / Array child items` 场景里，`array-editor` 的删除按钮点击后 reviewer 条目没有被移除。
- 两个现象都发生在 playground，但根因分别落在 schema 行作用域绑定和 advanced form renderer 的删除同步路径。

## Diagnostic Method

- 先从 `apps/playground/src/pages/flux-basic-page.*` 读取页面和现有 debugger 测试，确认这两个问题都能在同一个页面上做 focused 回归覆盖。
- 对照 `packages/flux-renderers-data/src/__tests__/data-table.test.tsx` 和 `crud-selection-and-features.test.tsx`，确认表格行按钮打开对话框时的稳定行作用域契约是 `$slot.record.*`，而 playground schema 仍写成了 `record.*`。
- 再检查 `packages/flux-renderers-form-advanced/src/array-editor.tsx` 与既有日志，发现删除分支调用 `currentForm.removeValue()` 前没有先更新 renderer 自己的 `itemsRef`，而同类 `key-value` 问题已经在 2026-05-10 修过。
- 复查 `form-array-validation.test.tsx` 后发现其中一条旧断言把“删除后仍保留 3 项”的错误行为当成通过条件，说明这类回归被错误测试掩盖了。

## Root Cause

- `apps/playground/src/pages/fluxBasicPageSchema.json` 的表格行对话框 body 使用了错误的行数据路径，导致 `openDialog` 打开后无法按表格行 slot 约定解析用户详情内容。
- `packages/flux-renderers-form-advanced/src/array-editor.tsx` 的删除路径仍保留旧数组在 `itemsRef` 中，`removeValue()` 期间的字段注册/校验读取会拿到 stale items，从而把被删除条目重新写回表单状态。
- `packages/flux-renderers-form-advanced/src/__tests__/form-array-validation.test.tsx` 存在错误预期，没能把删除失效识别成失败。

## Fix

- playground 表格行详情对话框统一改成 `$slot.record.username` / `$slot.record.email`，与当前 table/CRUD 行操作契约保持一致。
- `array-editor` 删除前先把 `itemsRef.current` 更新为删除后的数组，让删除期间的运行时读取看到 canonical next state，而不是旧值。
- 增加 playground 页面级回归测试，并把 `array-editor` 既有测试改成正确断言，确保删除后 UI 和提交值都只保留剩余项。

## Tests

- `apps/playground/src/pages/flux-basic-page.debugger.test.tsx` - 验证表格 `Inspect` 能打开用户详情对话框，并验证 `Submit only / Array child items` 删除按钮会移除 reviewer 行。
- `packages/flux-renderers-form-advanced/src/__tests__/form-array-validation.test.tsx` - 验证删除中间 reviewer 后，表单状态和提交值只保留剩余两项。
- `packages/flux-renderers-form-advanced/src/__tests__/composite-item-id.test.tsx` - 验证删除后再新增 item 时，剩余项与新 id 序列都正确。

## Affected Files

- `apps/playground/src/pages/fluxBasicPageSchema.json`
- `apps/playground/src/pages/flux-basic-page.debugger.test.tsx`
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-form-advanced/src/__tests__/form-array-validation.test.tsx`
- `packages/flux-renderers-form-advanced/src/__tests__/composite-item-id.test.tsx`

## Notes For Future Refactors

- table/crud 行级 schema 读取当前行数据时，应优先复用已验证的 `$slot.record.*` 契约，不要在 playground 例子里再引入 `record.*` 这种模糊变体。
- `array-editor` / `key-value` 这类保留本地 ref 以支持受控输入的控件，增删路径必须先更新 renderer 本地 canonical ref，再调用 form runtime 的数组操作。
- 回归测试不能把旧错误行为当作预期；涉及 add/remove 的测试要同时断言 UI 状态和最终提交值。
