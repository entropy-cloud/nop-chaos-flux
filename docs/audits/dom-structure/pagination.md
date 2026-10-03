# dom-structure: pagination

> Package: flux-renderers-data | Source: src/pagination-renderer.tsx:200-304 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-pagination" data-slot="pagination-root" data-renderer="pagination" data-testid data-cid>`（按钮固定 testid pagination-prev/next/page-size；aria-current/aria-disabled 齐全）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 无中间层 |
| D4 区域 slot | pass（exempt 备注） | 子控件以冻结 testid 锚（等价稳定锚），无自定义 slot 不回改 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 pagination 测试覆盖
