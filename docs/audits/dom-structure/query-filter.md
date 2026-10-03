# dom-structure: query-filter

> Package: flux-renderers-data | Source: src/query-filter.tsx:27-69 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-query-filter" data-slot="query-filter" data-renderer="query-filter" data-testid data-cid>`（query-filter-collapse/-summary slot；内容层 id=query-filter-content——id 锚为折叠保持挂载语义，登记不回改）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 内容层 id 锚承担折叠保持职责 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 query-filter 测试覆盖
