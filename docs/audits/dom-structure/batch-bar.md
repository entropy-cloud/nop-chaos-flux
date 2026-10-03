# dom-structure: batch-bar

> Package: flux-renderers-data | Source: src/batch-bar.tsx:175-204 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-batch-bar" data-slot="batch-bar" role="status" aria-live data-count data-renderer="batch-bar" data-testid data-cid>`（batch-bar-count/-actions/-clear slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | role=status 语义成立 |

## Proof

- 登记卡；行为由既有 batch-bar 测试覆盖
