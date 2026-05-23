# 维度 08：验证系统一致性

- 初审发现：6
- 维度复核：完成
- 子项复核：1 组（external errors）

## 保留

1. [维度复核通过] `ScopeValidationStateSnapshot.ready` / `FormRuntime.canSubmit` 未叠加文档要求的 touch policy。

2. [维度复核通过] `registerField` 仍是单路径单注册；`registrationId` 尚未成为实例级参与主键。

3. [已修复] `applyExternalErrors()` 现在会过滤非当前 owner 拥有的路径，只把 owned errors 注入 field state。

4. [已修复] `clearExternalErrorsForPath()` 现在会同时清当前路径、后代和当前 owner 内祖先链上的 external errors。

5. [已修复] `showErrorOn: 'submit'` 现在基于 `submitAttempted` 持续生效，提交结束后错误不会立即消失。

6. [维度复核通过] `applyChangesAndRevalidate()` 先发布 `values` 再更新 validation state，存在非原子观察窗口。

## 复核摘要

- 保留：6
- 降级：0
- 驳回：0
