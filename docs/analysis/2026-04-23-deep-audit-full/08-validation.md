# 维度 08：验证系统一致性

- 初审发现：6
- 维度复核：完成
- 子项复核：1 组（external errors）

## 保留

1. [维度复核通过] `ScopeValidationStateSnapshot.ready` / `FormRuntime.canSubmit` 未叠加文档要求的 touch policy。

2. [维度复核通过] `registerField` 仍是单路径单注册；`registrationId` 尚未成为实例级参与主键。

3. [子项复核通过] `applyExternalErrors()` 未校验当前 owner 的路径归属。

4. [子项复核通过] `clearExternalErrorsForPath()` 只清当前路径及后代，不清祖先链外部错误。

5. [维度复核通过] `showErrorOn: 'submit'` 当前仅绑定 `submitting`，提交结束后错误会消失。

6. [维度复核通过] `applyChangesAndRevalidate()` 先发布 `values` 再更新 validation state，存在非原子观察窗口。

## 复核摘要

- 保留：6
- 降级：0
- 驳回：0
