# dom-structure: swipe-cell

> Package: flux-renderers-mobile | Source: src/swipe-cell.tsx:275-293 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-534-dom-structure-mobile-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-swipe-cell" data-renderer="swipe-cell" data-testid data-cid data-state>`（swipe-cell-left/right[absolute+inert]/-content[translateX] slot；无左右 region 时精简分支 :275-290）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 动作层/内容层带 slot |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | 动作层 inert |

## Proof

- 登记卡；行为由既有 swipe-cell 测试覆盖
