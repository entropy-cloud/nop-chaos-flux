# dom-structure: infinite-scroll

> Package: flux-renderers-mobile | Source: src/infinite-scroll.tsx:216-568 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-534-dom-structure-mobile-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-infinite-scroll" data-renderer="infinite-scroll" data-testid data-cid data-status>`（infinite-scroll-body/-sentinel[aria-hidden 1px]/-status[role=status] slot；IO root 走最近可滚动祖先）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | sentinel aria-hidden、status role=status |

## Proof

- 登记卡；行为由既有 infinite-scroll 测试覆盖（专属 helper infinite-scroll-test-support.tsx）
