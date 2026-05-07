# 维度 03: API 表面积与契约一致性

## 深挖轮次

- 第 1 轮: 发现 test-support/dev surface 与跨包 private test imports。
- 第 2 轮: 发现 unstable subpath、CSS artifact、condition-builder docs/API、flow API docs drift。
- 第 3 轮: 发现 host page schema helper、DataSourceSchema re-export、ReportInspectorShell export 等候选。
- 第 4 轮: 发现 `@nop-chaos/ui/lib/utils` public subpath alias 缺失。
- 第 5 轮: 发现 `@nop-chaos/ui` chart 子路径隔离回归。

## 维度复核结论

| 条目                                                                        | 结论 | 严重程度 | 说明                                                                                |
| --------------------------------------------------------------------------- | ---- | -------- | ----------------------------------------------------------------------------------- |
| `flux-react/unstable`, `flow-designer-renderers/unstable` 缺 tsconfig paths | 保留 | P2       | package exports + Vite alias 存在，但 `tsconfig.base.json` 缺 paths                 |
| CSS artifact missing dist                                                   | 保留 | P1       | 与维度 01 构建发布项合并跟进                                                        |
| condition-builder types not exported                                        | 保留 | P2       | `condition-builder/types.ts` 定义 public schema/value types，但 package root 未导出 |
| condition-builder docs mismatch                                             | 保留 | P2       | docs sourcePackage 与 schema 字段和 live type 漂移                                  |
| flow designer API docs signature mismatch                                   | 保留 | P2       | docs 写 `createFlowDesignerRegistry()`，live requires `baseRegistry`                |
| `ReportInspectorShellSchema` not exported                                   | 保留 | P2       | renderer registered, type defined, root not exported                                |
| `@nop-chaos/ui/lib/utils` alias/path missing                                | 保留 | P3       | package exports 有 public subpath，workspace dev aliases 缺失                       |
| UI chart subpath isolation drift                                            | 保留 | P2       | root `@nop-chaos/ui` 仍 exports chart；word-editor 从 root import chart API         |
| `flux-renderers-form/test-support` dev surface                              | 降级 | P3       | workspace alias exists but package exports 不承认，test/dev hygiene                 |
| flow missing `defineDesignerPageSchema`                                     | 驳回 | -        | 未见 owner doc 承诺                                                                 |
| data package not re-exporting `DataSourceSchema`                            | 驳回 | -        | `DataSourceSchema` owner 是 `flux-core`                                             |

## 最终保留项

1. 同步 public subpath 的 `package.json` exports、Vite alias、tsconfig paths。
2. 收敛 condition-builder 和 report inspector shell schema typing surface。
3. 修复 flow designer API docs 签名。
4. 恢复 `@nop-chaos/ui/chart` 子路径隔离，移除 root chart exposure 或迁移消费者。
