# dom-structure: notice-bar

> Package: flux-renderers-mobile | Source: src/notice-bar.tsx:241-297 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-534-dom-structure-mobile-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-notice-bar" data-renderer="notice-bar" data-testid data-cid data-slot=notice-bar-* role=status>`（可点时 role=button 在 action 层）；链：action flex(:254) → relative 裁剪层(=notice-bar-content :265，marquee 定位+溢出裁剪职责) → marquee span(notice-bar-text :270)；notice-bar-action/-icon/-content/-text/-close 全套 slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass（exempt 登记） | 3 内层为动画/裁剪服务层且全部带 slot（W2 盘点嫌疑复核：已带 slot 可归因，无需整改） |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | role=status |

## Proof

- `src/dom-structure-contract.test.tsx`（notice-bar content/text slots）
