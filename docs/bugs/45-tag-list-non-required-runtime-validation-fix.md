# 45 Tag List Non-Required Runtime Validation Fix

## Problem

- `playground` 的 `performance-table` 页面在编辑 `Tags` 列时会出现 `requires at least one tag` 报错。
- 最小可见症状是：点击表格中的 tag 后，即使该列没有声明 `required: true`，界面仍然报“至少选择一个 tag”。
- 现象看起来像 table 行级错误被广播到多行，但实际根因不在 table row owner。

## Diagnostic Method

- 先按用户现象检查了 table row scope 和 `$slot.record.tags` 的路径映射，怀疑是 row-level validation key 被错误共享。
- 给 table 测试补了 probe 后发现继续沿“row path rebasing”修会破坏现有 table cell 表达式和表单控件绑定，说明症状和初始猜测不一致。
- 回到 `packages/flux-renderers-form-advanced/src/tag-list.tsx` 逐行检查 runtime registration，发现 `validate()` 在任何情况下都会把空数组当成 required 失败。
- 决定性证据是：`performance-table` 的 tag-list schema 没有 `required: true`，但 `tag-list.tsx` 仍注册 `requires at least one tag`；修成仅 `required` 时校验后，targeted e2e 通过且报错消失。

## Root Cause

- `packages/flux-renderers-form-advanced/src/tag-list.tsx` 把“至少选择一个 tag”硬编码成了无条件 runtime validation，而不是受 schema `required` 控制。
- 这让所有非必填 `tag-list` 都表现得像必填字段，`performance-table` 只是更容易暴露这个问题的页面。

## Fix

- `tag-list` 现在只在 `props.props.required === true` 时注册“至少选择一个 tag”的 runtime validation。
- 保持现有值切换、touch/visit、form submit 阻断逻辑不变，只修正 required 语义，避免再误伤非必填表格单元格。

## Tests

- `packages/flux-renderers-form-advanced/src/tag-list.test.tsx` - 验证非必填 table cell tag-list 切换后不会显示 required 错误。
- `packages/flux-renderers-form-advanced/src/__tests__/form-runtime-fields.test.tsx` - 明确 `required: true` 的 tag-list 仍会阻断提交并显示错误。
- `tests/e2e/performance-table.spec.ts` - 验证 playground `performance-table` 中点击 tag 后不再出现 `requires at least one tag` 报错。

## Affected Files

- `packages/flux-renderers-form-advanced/src/tag-list.tsx`
- `packages/flux-renderers-form-advanced/src/tag-list.test.tsx`
- `packages/flux-renderers-form-advanced/src/__tests__/form-runtime-fields.test.tsx`
- `tests/e2e/performance-table.spec.ts`

## Notes For Future Refactors

- `tag-list` 的 runtime registration 只应补充 renderer-specific 行为，不应绕过 schema `required` 语义擅自把控件升级为必填。
- 当 UI 症状出现在 table 行里时，先区分是 row scope/path 问题，还是 renderer 自己注册了错误的 validation 规则；两者表面现象可能相似。
