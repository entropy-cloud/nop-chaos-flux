# dom-structure: cards

> Package: flux-renderers-content | Source: src/cards-renderer.tsx:137-252 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-cards" data-slot="cards-root" data-renderer="cards" data-testid data-cid>`（空态 role=list+data-empty + cards-empty slot）；每项 Card[data-slot=cards-item, role=listitem] > CardContent[data-slot=card-content]（多包一层带 slot——卡片视觉壳职责，归因 pass）> region 渲染产物

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | CardContent 层带 slot（卡片壳职责） |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 cards 测试覆盖
