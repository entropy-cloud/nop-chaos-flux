# dom-structure: statistics

> Package: flux-renderers-data | Source: src/statistics-renderer.tsx:10-15 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-statistics" data-slot="statistics-root" data-total data-renderer="statistics" data-testid data-cid>` — 单元素组件，根即内容壳（"共 N 条"文本在根内）；W2 盘点的"单层包装弱辩护"复核裁定：根承担 slot+data-total+身份锚职责，非冗余

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | 单元素直出 |
| D3 包装付租 | pass | 根即壳，无中间层 |
| D4 区域 slot | pass | statistics-root |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（statistics root anchors）
