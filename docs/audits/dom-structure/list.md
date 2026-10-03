# dom-structure: list

> Package: flux-renderers-data | Source: src/list-renderer.tsx:401-568 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-list" data-slot="list-root" role="list" data-renderer="list" data-testid data-cid>`（list-empty/-window-spacer-top/-bottom/-infinite/-infinite-status/-retry/-sentinel slot；item list-item+role=listitem）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 list 测试覆盖
