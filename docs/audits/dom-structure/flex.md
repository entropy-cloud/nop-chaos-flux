# dom-structure: flex

> Package: flux-renderers-basic | Source: src/flex.tsx:98-126 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容/交互元素）

- root `<div class="nop-flex" data-renderer data-testid data-cid>` — 职责: 组件自身契约要求的布局作用域；body/items 内容直接作 children

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | 无包装层 |
| D3 包装付租 | pass | 0 层 |
| D4 区域 slot | exempt | 单内容容器（body ?? items 互斥，flex.tsx:105），无内部区域可标 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（flex root anchor triple）
