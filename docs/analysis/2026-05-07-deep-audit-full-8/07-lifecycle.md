# 维度 07: 生命周期与副作用归属

## 深挖轮次

- 第 1 轮: value-adapter async conversion in React effect。
- 第 2 轮: FormRuntime dispose, data-source/reaction registration lifecycle。
- 第 3 轮: component registry dispose, node source props async ownership。
- 第 4 轮: 无新增。

## 维度复核结论

| 条目                                                      | 结论 | 严重程度 | 说明                                                                                                                  |
| --------------------------------------------------------- | ---- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| ValueAdapter async conversion in React effect             | 降级 | P3       | 展示值 conversion 属 React field hook 局部状态；底层 adapter 不接 signal 是健壮性问题                                 |
| FormRenderer creates FormRuntime but no unmount dispose   | 保留 | P1       | `form.tsx` 创建 `ownedForm`; cleanup 不调用 `ownedForm.dispose()`，runtime 顶层 dispose 只覆盖整个 renderer 销毁      |
| DataSourceRenderer registration lifecycle in React effect | 驳回 | -        | React owns node mount; runtime registry/controller cleanup 已由 registration dispose 管理                             |
| ReactionRenderer registration in React layout effect      | 降级 | P3       | cleanup 存在；`useLayoutEffect` 可能偏强，但非泄漏                                                                    |
| node/root component registries not disposed               | 保留 | P1       | `use-node-scopes.ts` 和 `schema-renderer.tsx` 创建 registries；runtime 不追踪统一 dispose，React cleanup 也未 dispose |
| node source props async in React hook/controller          | 驳回 | -        | node source props 是局部 React async props resolution，有 AbortController 与 dispose                                  |

## 最终保留项

1. 局部卸载时释放 FormRuntime。
2. node/root component handle registries 建立 owner/dispose 责任。
