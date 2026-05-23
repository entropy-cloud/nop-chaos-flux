# 维度 08：验证系统一致性

- 初审发现：2
- 维度复核：完成
- 子项复核：2

## 保留

1. [子项复核通过] hidden participation 的默认跳过语义未覆盖 runtime-registration child validation path。
   文件：`packages/flux-runtime/src/form-runtime-validation.ts:419-433`、`packages/flux-runtime/src/form-runtime-owner.ts:287-324`、`packages/flux-renderers-form-advanced/src/key-value.tsx:276-328,387-416`
   严重程度：P2

2. [子项复核通过] non-form validation owner 下，dynamic required 展示仍走 `useCurrentFormState()` 的 form-only 订阅，无法跟随 owner truth 更新。
   文件：`packages/flux-react/src/field-frame.tsx:92-124`、`packages/flux-react/src/hooks.ts:275-298`
   对照：`docs/architecture/form-validation.md:295-302,736-747`
   严重程度：P2

## 复核摘要

- 这两条都已经越过“未来态/中间态”门槛，因为 page-root / surface-root non-form owner 与 hidden participation 都是当前 live baseline。
