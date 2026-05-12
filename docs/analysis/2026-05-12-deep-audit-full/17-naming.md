# 维度 17：命名与术语一致性

## 第 1 轮（初审）

初审发现 7 项，独立复核后均保留，其中 3 项降级。

## 维度复核结论

- [17-01]: 降级为 P3。`dataPath` legacy read 存在但非主 authoring contract。
- [17-02]: 保留为 P2。Button variant docs 与 live schema 冲突。
- [17-03]: 降级保留为 P2。toolbar variant 部分成立。
- [17-04]: 保留为 P3。Button example 使用 `size: "md"`。
- [17-05]: 保留为 P3。Flow Designer icon example PascalCase。
- [17-06]: 降级为 P3。`createFlowDesignerRegistry` 已在 docs 标为 residual。
- [17-07]: 保留为 P2。condition-builder operator ids snake_case。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                       | 一句话摘要                                 |
| ----- | -------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| 17-01 | P3       | `packages/flux-code-editor/src/types.ts`                                   | source ref 仍兼容 `dataPath`               |
| 17-02 | P2       | `docs/references/flux-json-conventions.md`                                 | Button variant 文档与 live schema 冲突     |
| 17-03 | P2       | `packages/flow-designer-core/src/types.ts`                                 | toolbar variant 值域分裂                   |
| 17-04 | P3       | `docs/components/button/example.json`                                      | Button 示例 size 不合法                    |
| 17-05 | P3       | `docs/architecture/flow-designer/config-schema.md`                         | icon 示例不符合 kebab-case                 |
| 17-06 | P3       | `packages/flow-designer-renderers/src/index.tsx`                           | `createFlowDesignerRegistry` 命名 residual |
| 17-07 | P2       | `packages/flux-renderers-form-advanced/src/condition-builder/operators.ts` | operator ids snake_case                    |
