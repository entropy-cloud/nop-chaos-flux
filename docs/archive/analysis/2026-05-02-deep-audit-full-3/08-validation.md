# 维度08：验证系统一致性（初审，待复核）

## 发现清单

### P2 级 (1项)

1. **revalidateDependents 仅处理直接依赖，未实现依赖闭包展开** — form-runtime-owner.ts:76-127

### P3 级 (6项)

2. **validatePath 仅守卫 disposed，未守卫 bootstrapping/refreshing** — form-runtime-validation.ts:379
3. **revalidateDependents 清除 validating 标志可能造成闪烁** — form-runtime-owner.ts:98
4. **非 form 的 ValidationScopeRuntime showErrorOn 含 submit 但无法触发** — field-error-visibility.ts:3
5. **canSubmit 和 ready 不检查 lifecycleState** — form-runtime-owner.ts:46-73
6. **applyFieldValuePatch 值变更时立即清除错误可能闪烁** — form-runtime-field-ops.ts:82-84
7. **applyChangesAndRevalidate 对 change 跳过完整验证** — form-runtime-owner.ts:213-228

## 确认合规项

- 编译阶段 create-owner 边界停止：通过
- fieldStates single flat map：通过
- per-path 订阅：通过
- generation-aware stale suppression：通过
- dialog/surface 内表单独立验证：通过
