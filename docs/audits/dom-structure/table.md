# dom-structure: table

> Package: flux-renderers-data | Source: src/table-renderer.tsx:512-693 + table-renderer/table-body-row-rendering.tsx:298-569 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-table" data-renderer="table" data-testid data-cid>` — 职责: 多区域分组
  - table-header-region :524 → `data-slot="table-container"` :565（滚动区；ui Table 内层另有同名 table-container :8——嵌套同名 slot 为已知事实，外层供滚动/列设置，内层供 ui 样式，选择器需注意层级；既有测试按外层语义冻结，不回改）
  - `<td data-field={column.name}>`（W4 落地，6 个数据列分支：index/operation/cellRegion/editable/quickEdit/默认；leading cells/empty/expanded/group/summary 不打标）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 容器/区域均有 slot 或归因 |
| D4 区域 slot | pass（fix landed） | `<td data-field>` owner-doc drift 已按"补实现"裁定落地（ui TableCell 透传，DataRowView 六分支） |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] td[data-field={column.name ?? undefined}] 六分支（owner-doc drift → 补实现）

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（table root + td[data-field] 每行列恰一 + 文本断言）
