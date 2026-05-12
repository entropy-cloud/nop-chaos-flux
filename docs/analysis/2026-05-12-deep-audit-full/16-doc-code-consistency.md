# 维度 16：文档-代码一致性

## 第 1 轮（初审）

初审发现 3 项，独立复核后均保留。

## 维度复核结论

- [16-01]: 保留为 P2。report designer `selection`/`target` alias docs 与 live code/tests 冲突。
- [16-02]: 保留为 P2。`inspectorPanels` docs 与 manifest/host-data/tests 冲突。
- [16-03]: 保留为 P1。`setValues` docs 与 runtime behavior 冲突。

## 最终保留项

| 编号  | 严重程度 | 文件                                          | 一句话摘要                                      |
| ----- | -------- | --------------------------------------------- | ----------------------------------------------- |
| 16-01 | P2       | `docs/architecture/report-designer/design.md` | `selection`/`target` alias 文档过时             |
| 16-02 | P2       | `docs/architecture/report-designer/design.md` | `inspectorPanels` support 状态冲突              |
| 16-03 | P1       | `packages/flux-runtime/src/action-adapter.ts` | `setValues` current-scope/no-targeting 契约漂移 |
