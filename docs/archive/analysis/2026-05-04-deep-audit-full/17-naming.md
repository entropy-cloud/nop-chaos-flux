# 维度 17：命名与术语一致性

- 初审发现：3
- 维度复核：完成
- 子项复核：1

## 保留

1. [子项复核通过] active docs 仍把 bare `validate` 当作 built-in/platform action，但 live built-in action 列表与 dispatcher 并未实现它。
   文件：`docs/architecture/action-scope-and-imports.md:768,803,878,889,894`、`packages/flux-core/src/constants.ts:3-18`、`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:51-245`
   正确 live 路径：`component:validate` / form component handle
   严重程度：P1

## 降级

1. [已降级] `refreshSource` 的内部 adapter DTO 使用 `sourceId`，但 author-visible 契约仍稳定为 `targetId`。
2. [已降级] `closeSurface` 与 `closeDialog` 的 docs 表述尚未完全统一，但 live code 仍兼容两者。

## 复核摘要

- 本维度最终只保留一个会直接误导 authoring 的真实命名/契约漂移。
