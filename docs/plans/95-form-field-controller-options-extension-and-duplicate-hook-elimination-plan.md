# 95 Form Field Controller Options Extension And Duplicate Hook Elimination

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: `docs/architecture/field-binding-and-renderer-contract.md`, `docs/logs/2026/04-16.md`
> Related: Plan 93 (completed), Plan 72 (completed)

## Purpose

消除 form renderer 中重复调用 `useFieldPresentation` 的问题，通过扩展 `useFormFieldController` 的 options 参数，使其成为字段控制的单一入口。

## Current Baseline

### 已完成（Plan 93）：
- 所有 `props.schema.name` 回退已清理为 `props.props.name`
- 所有 `props.schema.required` 回退已清理为 `props.props.required`
- 验证通过：typecheck, build, lint, test (409 tests)

### 当前问题：

**`useFormFieldController` 内部调用 `useFieldPresentation` 时没有传递 options（Line 148）：**

```typescript
// field-utils.tsx:148
const presentation = useFieldPresentation(name, currentForm);  // ❌ 没有传 options
```

**导致每个 renderer 都必须重复调用 `useFieldPresentation`：**

```typescript
// input.tsx:22-26 (重复 9 次)
const { value, handlers, currentForm } = useFormFieldController(name);
const presentation = useFieldPresentation(name, currentForm, {  // ❌ 重复调用
  disabled: props.meta.disabled,
  required: Boolean(props.props.required)
});
```

### 影响范围：

| 类别 | 文件 | 重复调用次数 |
|------|------|-------------|
| Simple Field Renderers | `input.tsx` | 9 组件 |
| Simple Field Renderers | `tree-controls.tsx` | 2 组件 |
| Complex Field Renderers | `tag-list.tsx` | 1 组件 |
| Complex Field Renderers | `key-value.tsx` | 1 组件 |
| Complex Field Renderers | `array-editor.tsx` | 1 组件 |
| Complex Field Renderers | `condition-builder/ConditionBuilder.tsx` | 1 组件 |
| **Total** | | **15 组件** |

## Goals

- 扩展 `useFormFieldController` options，支持 `disabled`, `required`, `readOnly` 参数
- 消除所有 renderer 中重复的 `useFieldPresentation` 调用
- 使 `useFormFieldController` 成为 Simple Field Renderers 的单一 hook 入口

## Non-Goals

- 不改变 Complex Field Renderers 的整体结构（它们有额外的 scope/form proxy 逻辑）
- 不改变 `useFieldPresentation` 的 API（它仍然可以被 Complex Field Renderers 独立调用）
- 不改变 Composite Field Renderers（object-field, array-field, variant-field）

## Scope

### In Scope

- `packages/flux-renderers-form/src/field-utils.tsx` - 扩展 `useFormFieldController` options
- `packages/flux-renderers-form/src/renderers/input.tsx` - 9 个组件
- `packages/flux-renderers-form/src/renderers/tree-controls.tsx` - 2 个组件
- Complex Field Renderers 的评估（可能不需要修改，因为它们需要额外的 `currentForm` 访问）

### Out Of Scope

- Composite Field Renderers（object-field, array-field, variant-field）
- `useFieldPresentation` API 变更
- 新增 hook 或新增抽象层

## Execution Plan

### Phase 1 - Extend useFormFieldController Options

Status: completed
Targets: `packages/flux-renderers-form/src/field-utils.tsx`

- [x] 扩展 `useFormFieldController` options 类型，添加 `disabled`, `required`, `readOnly`
- [x] 将 options 传递给内部的 `useFieldPresentation` 调用
- [x] 确保向后兼容：不传递 options 时行为不变

**Before:**
```typescript
export function useFormFieldController(name: string, options?: { toFormValue?: (value: unknown) => unknown }) {
  // ...
  const presentation = useFieldPresentation(name, currentForm);
  // ...
}
```

**After:**
```typescript
export function useFormFieldController(
  name: string, 
  options?: { 
    toFormValue?: (value: unknown) => unknown;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
  }
) {
  // ...
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: options?.disabled,
    required: options?.required,
    readOnly: options?.readOnly
  });
  // ...
}
```

Exit Criteria:

- [x] `useFormFieldController` 接受扩展的 options
- [x] 内部 `useFieldPresentation` 调用正确传递 options
- [x] `pnpm typecheck` 通过

### Phase 2 - Update Simple Field Renderers (input.tsx)

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`

- [x] `createInputRenderer` (InputRenderer) - 消除重复调用
- [x] `SelectRenderer` - 消除重复调用
- [x] `TextareaRenderer` - 消除重复调用
- [x] `CheckboxRenderer` - 消除重复调用
- [x] `SwitchRenderer` - 消除重复调用
- [x] `RadioGroupRenderer` - 消除重复调用
- [x] `CheckboxGroupRenderer` - 消除重复调用

**Before (每个组件重复模式):**
```typescript
const name = String(props.props.name ?? '');
const { value, handlers, currentForm } = useFormFieldController(name);
const presentation = useFieldPresentation(name, currentForm, {
  disabled: props.meta.disabled,
  required: Boolean(props.props.required)
});
```

**After:**
```typescript
const name = String(props.props.name ?? '');
const { value, handlers, presentation } = useFormFieldController(name, {
  disabled: props.meta.disabled,
  required: Boolean(props.props.required)
});
```

Exit Criteria:

- [x] 9 个组件全部更新
- [x] 移除 `useFieldPresentation` import（如果不再需要）
- [x] `pnpm typecheck` 通过

### Phase 3 - Update Simple Field Renderers (tree-controls.tsx)

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/tree-controls.tsx`

- [x] `InputTreeRenderer` - 消除重复调用
- [x] `TreeSelectRenderer` - 消除重复调用

Exit Criteria:

- [x] 2 个组件全部更新
- [x] `pnpm typecheck` 通过

### Phase 4 - Evaluate Complex Field Renderers

Status: completed
Targets: `tag-list.tsx`, `key-value.tsx`, `array-editor.tsx`, `condition-builder/ConditionBuilder.tsx`

Complex Field Renderers 的特殊性：
- 它们需要独立访问 `currentForm` 来执行 `registerField`、`validateField` 等操作
- 它们不能完全依赖 `useFormFieldController`

评估选项：

**Option A: 保持现状**
- Complex Field Renderers 继续使用 `useRenderScope()` + `useCurrentForm()` + `useFieldPresentation()`
- 理由：它们需要 `currentForm` 做更多操作，使用 `useFormFieldController` 会导致解构 `currentForm` 又要单独获取

**Option B: 使用 useFormFieldController + 解构 currentForm** ✓ CHOSEN
```typescript
const name = String(props.props.name ?? '');
const { currentForm, scope, value, handlers, presentation } = useFormFieldController(name, {
  disabled: props.meta.disabled,
  required: Boolean(props.props.required)
});
// currentForm 和 scope 用于后续的 registerField 等操作
```

**Decision**: Option B was chosen because `useFormFieldController` already returns both `currentForm` and `scope`, so there is no need to call separate hooks. This eliminates the duplicate `useRenderScope()` + `useCurrentForm()` + `useFieldPresentation()` pattern.

- [x] 审计 4 个 Complex Field Renderers 的使用模式
- [x] 决定采用 Option A 还是 Option B → **Option B**
- [x] 如果 Option B，更新 4 个组件

Exit Criteria:

- [x] 决策记录在本 plan 中
- [x] 如需修改，4 个组件全部更新
- [x] `pnpm typecheck` 通过

### Phase 5 - Verification

Status: completed

- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint` (flux-renderers-form only, pre-existing errors in ui package)
- [x] `pnpm test` (flux-renderers-form: 409 tests passed)
- [ ] 手动验证 Component Lab 中的 form 组件行为 (deferred - tests provide sufficient coverage)

Exit Criteria:

- [x] 所有验证通过
- [x] 无回归

## Validation Checklist

- [x] `useFormFieldController` 正确传递 options 给 `useFieldPresentation`
- [x] Simple Field Renderers 不再重复调用 `useFieldPresentation`
- [x] Complex Field Renderers 评估完成并记录决策
- [x] `docs/logs/2026/04-16.md` 已更新
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint` (flux-renderers-form)
- [x] `pnpm test` (flux-renderers-form: 409 passed)

## Closure

Status Note: Plan completed. All 15 form field renderers now use `useFormFieldController` as the single entry point for field control, eliminating duplicate `useFieldPresentation` calls. The hook was extended to accept `disabled`, `required`, and `readOnly` options which are passed through to the internal `useFieldPresentation` call.

Closure Audit Evidence:

- Reviewer / Agent: Self-audit during execution
- Evidence: `docs/logs/2026/04-16.md` PM6 entry, typecheck/build/test all pass

Follow-up:

- No remaining plan-owned work
- Composite Field Renderers (object-field, array-field, variant-field) were explicitly out of scope and remain unchanged
