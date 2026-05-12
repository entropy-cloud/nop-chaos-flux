# 维度 08：验证系统一致性

## 第 1 轮（初审）

初审发现 4 项，独立复核后均保留，其中 3 项 P1。

## 维度复核结论

- [08-01]: 保留为 P1。form 内 validation owner 可能读祖先 context。
- [08-02]: 保留为 P1。disposed/unactivated validation 返回 clean success。
- [08-03]: 降级为 P3。summary-gate 行为契约歧义。
- [08-04]: 保留为 P1。sync errors 被 async/debounce 阶段延后。

## 最终保留项

| 编号  | 严重程度 | 文件                                                    | 一句话摘要                                        |
| ----- | -------- | ------------------------------------------------------- | ------------------------------------------------- |
| 08-01 | P1       | `packages/flux-react/src/hooks/use-form-hooks.ts`       | 表单字段 presentation 可能用祖先 validation owner |
| 08-02 | P1       | `packages/flux-runtime/src/form-runtime-validation.ts`  | disposed/未激活 owner 返回 clean success          |
| 08-03 | P3       | `packages/flux-runtime/src/form-runtime-submit-flow.ts` | summary-gate 与 recurse-submit 边界模糊           |
| 08-04 | P1       | `packages/flux-runtime/src/form-runtime-validation.ts`  | sync 错误被 async/debounce 延后发布               |
