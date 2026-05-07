# 维度 15: 安全与性能红线

## 深挖轮次

- 第 1 轮: table column settings O(n²).
- 第 2 轮: spreadsheet selection includes, condition-builder multiselect O(n²), debugger scans, value-adapter fail-open.
- 第 3 轮: ChartStyle CSS injection, spreadsheet batch setCell clone, flow layout complexity.
- 第 4 轮: data-source mergeToScope overwrite, stableStringify DoS.
- 第 5 轮: debugger regex ReDoS, spreadsheet find regex/empty query, validation pattern ReDoS/fail-open.

## 维度复核结论

### 保留 P1

| 条目                                        | 证据                                                                      | 建议                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| value-adapter transform failure fail-open   | `packages/flux-core/src/value-adapter.ts:247-255,276-284`                 | 默认 fail-closed 或将错误暴露给 form/调用方                   |
| ChartStyle CSS injection                    | `packages/ui/src/components/ui/chart.tsx:89-99`                           | validate CSS identifiers/color values, avoid raw style string |
| spreadsheet batch setCell clone O(k\*cells) | `spreadsheet-core/src/core/document-access.ts`, `core/cell-operations.ts` | batch collect + `setCells`                                    |
| flow tree layout complexity                 | `flow-designer-core/src/tree-layout.ts:310-348,411-412`                   | cursor queue + adjacency maps + topo depth                    |
| api-cache stableStringify deep/cycle DoS    | `flux-runtime/src/async-data/api-cache.ts:26-37`                          | WeakSet/depth/size guard                                      |
| spreadsheet find regex/empty query          | `spreadsheet-core/src/core/search-operations.ts`                          | ban empty query; safe regex guard                             |
| validation pattern ReDoS/fail-open          | `validation-lowering.ts`, `validators.ts`                                 | safe regex or diagnostic fail-closed                          |

### 降级

- table column settings, spreadsheet selection includes, condition-builder multiselect: valid O(n²) but lower-impact P2.
- debugger scans/regex ReDoS: debugger-only, P2/P3.
- data-source `mergeToScope`: explicit compatibility mode; add diagnostics for collisions, P2.

## 子项复核

Security/performance P1 batch confirmed all seven P1 items above.
